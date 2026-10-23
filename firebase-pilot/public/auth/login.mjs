import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth,setPersistence,inMemoryPersistence,GoogleAuthProvider,signInWithRedirect,getRedirectResult,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendEmailVerification,sendPasswordResetEmail,signOut} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.hash.slice(1));
history.replaceState(null,'',location.pathname); // Remove the handshake capability from history/referrers immediately.
const contextKey='sales-login-request';let context;
try{context=params.has('attempt')?{origin:params.get('origin'),state:params.get('state'),attempt:params.get('attempt'),invitation:params.get('invitation')||'',createdAt:Date.now()}:JSON.parse(sessionStorage.getItem(contextKey)||'null');}catch{context=null;}
function clearContext(){try{sessionStorage.removeItem(contextKey);}catch{}}
let auth,busy=false,transferred=false;
function status(text){$('status').textContent=text;}
function loading(active){$('loading').hidden=!active;$('controls').hidden=active;$('purpose').hidden=active;document.querySelector('main').setAttribute('aria-busy',String(active));}
function errors(error){const code=error?.code;return ({'auth/invalid-credential':'Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.','auth/email-already-in-use':'Bitte mit dem bereits bestehenden Konto anmelden oder das Passwort zurücksetzen.','auth/weak-password':'Bitte ein stärkeres Passwort mit mindestens zwölf Zeichen wählen.','auth/popup-blocked':'Bitte das Anmeldefenster für diese Seite erlauben.','auth/popup-closed-by-user':'Anmeldung abgebrochen.','auth/too-many-requests':'Zu viele Versuche. Bitte später erneut versuchen.'})[code]||'Anmeldung momentan nicht möglich. Bitte erneut versuchen.';}
async function act(fn){if(busy||transferred)return;busy=true;loading(true);status('Anmeldung wird geprüft …');try{await fn();}catch(e){transferred=false;clearContext();status(errors(e));}finally{busy=false;if(!transferred)loading(false);}}
async function transfer(){
  const user=auth.currentUser;if(!user)return;
  await user.reload();if(!user.emailVerified){$('verification').hidden=false;status('Bitte die E-Mail-Adresse bestätigen. Erst danach ist der Datenzugriff möglich.');return;}
  const idToken=await user.getIdToken(true);
  if(!window.opener||window.opener.closed){status('Das App-Fenster wurde geschlossen. Bitte die Anmeldung dort neu starten.');await signOut(auth);return;}
  // Only this exact, preconfigured origin receives credentials; never use a wildcard target.
  window.opener.postMessage({type:'sales-firebase-login',state:context.state,attempt:context.attempt,idToken,refreshToken:user.refreshToken,invitation:context.invitation},context.origin);
  transferred=true;
  status('Anmeldung wird in der App geprüft …');
}
try{
  const [config,origins]=await Promise.all([fetch('/__/firebase/init.json').then(r=>r.json()),fetch('origins.json',{cache:'no-store'}).then(r=>r.json())]);
  if(!window.opener||!context||Date.now()-context.createdAt>5*60000||!origins.includes(context.origin)||!/^[-\w]{32,128}$/.test(context.state||'')||!/^[-\w]{32,128}$/.test(context.attempt||'')||context.invitation&&!/^[-\w]{32,128}$/.test(context.invitation))throw Error('invalid');
  if(location.hostname!=='sales-markatus.firebaseapp.com'||config.authDomain!=='sales-markatus.firebaseapp.com')throw Error('origin');
  auth=getAuth(initializeApp(config));await setPersistence(auth,inMemoryPersistence);
  if(context.invitation){$('purpose').textContent='Einladung aktivieren: Mit Google anmelden oder ein eigenes Passwort anlegen.';$('submit').textContent='Konto anlegen / Einladung aktivieren';$('password').minLength=12;$('password').autocomplete='new-password';}
  $('google').onclick=()=>act(async()=>{sessionStorage.setItem(contextKey,JSON.stringify(context));transferred=true;await signInWithRedirect(auth,new GoogleAuthProvider());});
  $('login').onsubmit=e=>{e.preventDefault();act(async()=>{
    const address=$('email').value.trim(),password=$('password').value;
    try{await signInWithEmailAndPassword(auth,address,password);}catch(error){if(!context.invitation||!['auth/invalid-credential','auth/user-not-found'].includes(error.code))throw error;await createUserWithEmailAndPassword(auth,address,password);}
    $('password').value='';await transfer();
  });};
  $('send-verification').onclick=()=>act(async()=>{if(auth.currentUser)await sendEmailVerification(auth.currentUser);status('Falls eine Bestätigung nötig ist, wurde die E-Mail versendet. Bitte auch den Spamordner prüfen.');});
  $('verified').onclick=()=>act(transfer);
  $('forgot').onclick=()=>act(async()=>{if(!$('email').reportValidity())return;await sendPasswordResetEmail(auth,$('email').value.trim());status('Wenn ein passendes Konto besteht, wurde eine E-Mail zum Zurücksetzen versendet.');});
  window.addEventListener('message',async e=>{if(e.origin!==context.origin||e.source!==window.opener||e.data?.type!=='sales-login-complete'||e.data.state!==context.state)return;clearContext();await signOut(auth);window.close();});
  try{const redirected=await getRedirectResult(auth);if(redirected)await transfer();else status('');}catch(error){status(errors(error));}finally{clearContext();if(!transferred)loading(false);}
}catch{
  clearContext();
  $('loading').hidden=true;document.querySelector('main').setAttribute('aria-busy','false');
  status('Bitte die Anmeldung über die Sales-App starten. Der App-Ursprung muss ausdrücklich freigegeben sein.');document.querySelectorAll('button,input').forEach(el=>el.disabled=true);
}
