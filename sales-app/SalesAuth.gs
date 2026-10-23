/** Spark: Google's REST endpoint validates tokens. Decoding alone NEVER authenticates. */
let salesAuthRequest_=null;
// Public releases must never fall back to the historical Google email list.
const SALES_AUTH_REQUIRE_FIREBASE=true;
const SALES_AUTH_APP_URL='https://script.google.com/a/macros/markatus.de/s/AKfycbxlNLBoZvy6SgSHHEFviByTN9bL07nb7kLzlUWaAcCs0Jmrc96lIrAyGNxUrwtevDWrFw/exec';
function salesAuthEnabled_(){const mode=PropertiesService.getScriptProperties().getProperty('SALES_AUTH_MODE');if(mode&&mode!=='firebase')throw Error('AUTH_REQUIRED: Ungültige Anmeldekonfiguration.');return mode==='firebase'||SALES_AUTH_REQUIRE_FIREBASE;}
function salesAuthConfig_(){
  const p=PropertiesService.getScriptProperties(),project=p.getProperty('FIREBASE_PROJECT_ID'),apiKey=p.getProperty('SALES_FIREBASE_WEB_API_KEY'),origin=p.getProperty('SALES_AUTH_ORIGIN');
  if(project!=='sales-markatus'||!/^AIza[\w-]{30,60}$/.test(apiKey||'')||origin!=='https://sales-markatus.firebaseapp.com')throw Error('AUTH_REQUIRED: Benutzeranmeldung noch nicht eingerichtet.');
  return {project,apiKey,origin,ownerUid:p.getProperty('SALES_AUTH_OWNER_UID'),ownerEmail:String(p.getProperty('SALES_ADMIN_EMAIL')||SALES.admin).toLowerCase()};
}
function salesAuthHash_(value){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value)).map(b=>('0'+(b&255).toString(16)).slice(-2)).join('');}
function salesAuthRandom_(){return salesAuthHash_(Utilities.getUuid()+Utilities.getUuid()+Utilities.getUuid());}
function salesAuthKey_(value){if(typeof value!=='string'||!/^[-\w]{32,128}$/.test(value))throw Error('AUTH_REQUIRED: Ungültige Anmeldung.');return value;}
function salesAuthEmail_(value){value=String(value||'').trim().toLowerCase();if(value.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(value))throw Error('Bitte eine gültige E-Mail-Adresse eingeben.');return value;}
function salesAuthDocument_(kind,id){if(!['users','sessions','attempts','invites','emails','audit'].includes(kind)||!/^[-\w]{1,128}$/.test(id))throw Error('Ungültiger Auth-Datenpfad.');return 'sales_auth'+kind+'/'+id;}
function salesAuthRead_(kind,id){
  const c=salesContext_(),path=salesAuthDocument_(kind,id),r=UrlFetchApp.fetch(pilotUrl_(c.project,path),{method:'get',headers:{Authorization:'Bearer '+c.token},muteHttpExceptions:true});
  if(r.getResponseCode()===404)return null;if(r.getResponseCode()!==200)throw Error('AUTH_REQUIRED: Freigabe momentan nicht prüfbar.');
  const doc=JSON.parse(r.getContentText());return {...JSON.parse(doc.fields.payload.stringValue),_path:path,_updateTime:doc.updateTime};
}
function salesAuthCommit_(entries,checks=[]){
  const c=salesContext_(),base='projects/'+c.project+'/databases/(default)/documents/';
  const writes=checks.map(d=>({verify:base+d._path,currentDocument:{updateTime:d._updateTime}}));
  for(const {kind,id,value,prior,create} of entries){const clean=Object.fromEntries(Object.entries(value).filter(([k])=>!k.startsWith('_')));writes.push({update:{name:base+salesAuthDocument_(kind,id),fields:{payload:{stringValue:JSON.stringify(clean)}}},...(prior?{currentDocument:{updateTime:prior._updateTime}}:create?{currentDocument:{exists:false}}:{})});}
  return pilotCall_(pilotUrl_(c.project,'').replace(/\/$/,'')+':commit',{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+c.token},payload:JSON.stringify({writes})});
}
function salesAuthIdentity_(idToken){
  const cfg=salesAuthConfig_();if(typeof idToken!=='string'||idToken.length>10000)throw Error('AUTH_REQUIRED: Ungültige Anmeldung.');
  // Never log the response: Firebase may include confidential account fields.
  const r=UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+cfg.apiKey,{method:'post',contentType:'application/json',payload:JSON.stringify({idToken}),muteHttpExceptions:true});
  if(r.getResponseCode()!==200)throw Error('AUTH_REQUIRED: Anmeldung ungültig oder abgelaufen.');
  const users=JSON.parse(r.getContentText()).users;if(!Array.isArray(users)||users.length!==1)throw Error('AUTH_REQUIRED: Konto nicht eindeutig.');
  const u=users[0];let claims;try{claims=JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(idToken.split('.')[1])).getDataAsString());}catch{throw Error('AUTH_REQUIRED: Anmeldung ungültig.');}
  if(u.disabled||u.emailVerified!==true||claims.email_verified!==true||claims.sub!==u.localId||claims.aud!==cfg.project||claims.iss!=='https://securetoken.google.com/'+cfg.project||!Number.isFinite(claims.exp)||claims.exp<=Date.now()/1000||!Number.isFinite(claims.auth_time)||claims.auth_time<Number(u.validSince||0))throw Error('AUTH_REQUIRED: Konto unbestätigt, gesperrt oder Anmeldung widerrufen.');
  if(claims.firebase?.sign_in_provider!=='google.com')throw Error('AUTH_REQUIRED: Bitte mit Google anmelden.');
  return {uid:u.localId,email:salesAuthEmail_(u.email),authTime:claims.auth_time,tokenExpiresAt:claims.exp*1000};
}
function salesAuthPrincipal_(identity){
  const cfg=salesAuthConfig_(),record=salesAuthRead_('users',identity.uid);
  if(!record||record.status!=='active'||record.email!==identity.email)throw Error('AUTH_DENIED: Zugriff nicht freigegeben.');
  const admin=identity.uid===cfg.ownerUid&&identity.email===cfg.ownerEmail;
  return {uid:identity.uid,email:identity.email,admin,permissions:salesPermissions_(record.permissions,admin),revision:record.revision,record};
}
function salesAuthVerify_(session){
  const id=salesAuthHash_(salesAuthKey_(session));let entry=salesAuthRead_('sessions',id);
  if(!entry||entry.expiresAt<=Date.now()||entry.disabled)throw Error('AUTH_REQUIRED: Sitzung beendet. Bitte erneut anmelden.');
  if(entry.tokenExpiresAt<Date.now()+60000)entry=salesLock_(()=>{
    const current=salesAuthRead_('sessions',id);if(!current||current.expiresAt<=Date.now()||current.disabled)throw Error('AUTH_REQUIRED: Sitzung beendet.');if(current.tokenExpiresAt>=Date.now()+60000)return current;
    const r=UrlFetchApp.fetch('https://securetoken.googleapis.com/v1/token?key='+salesAuthConfig_().apiKey,{method:'post',contentType:'application/x-www-form-urlencoded',payload:'grant_type=refresh_token&refresh_token='+encodeURIComponent(current.refreshToken),muteHttpExceptions:true});
    if(r.getResponseCode()!==200)throw Error('AUTH_REQUIRED: Bitte erneut anmelden.');const refreshed=JSON.parse(r.getContentText());
    if(refreshed.user_id!==current.uid||![salesAuthConfig_().project,'539269099884'].includes(refreshed.project_id))throw Error('AUTH_REQUIRED: Anmeldung passt nicht zum Projekt.');
    const updated={...current,idToken:refreshed.id_token,refreshToken:refreshed.refresh_token,tokenExpiresAt:Date.now()+Number(refreshed.expires_in)*1000};salesAuthCommit_([{kind:'sessions',id,value:updated,prior:current}]);return updated;
  });
  const identity=salesAuthIdentity_(entry.idToken);if(identity.uid!==entry.uid||identity.email!==entry.email)throw Error('AUTH_REQUIRED: Konto wurde geändert.');
  const user=salesAuthPrincipal_(identity);if(user.record.sessionEpoch!==entry.sessionEpoch)throw Error('AUTH_REQUIRED: Sitzung wurde gesperrt.');return user;
}
function getSalesLoginConfig(){return {enabled:salesAuthEnabled_(),release:SALES_RELEASE,...(salesAuthEnabled_()?{origin:salesAuthConfig_().origin}:{})};}
function beginSalesLogin(input){
  if(!salesAuthEnabled_())salesUser_(true);
  const allowed=JSON.parse(PropertiesService.getScriptProperties().getProperty('SALES_AUTH_ALLOWED_ORIGINS')||'[]');
  if(!input||!allowed.includes(input.origin)||!/^[-\w]{43}$/.test(input.challenge||'')||!/^[-\w]{32,128}$/.test(input.state||''))throw Error('AUTH_REQUIRED: Anmeldeursprung nicht freigegeben.');
  // Bound anonymous writes and token-validation traffic; this is a quota guard, not an identity check.
  salesAuthThrottle_('begin',30);
  const attempt=salesAuthRandom_();salesAuthCommit_([{kind:'attempts',id:salesAuthHash_(attempt),create:true,value:{origin:input.origin,challenge:input.challenge,state:input.state,expiresAt:Date.now()+5*60000}}]);return {attempt,origin:salesAuthConfig_().origin};
}
function salesAuthThrottle_(key,limit){
  salesLock_(()=>{const cache=CacheService.getScriptCache(),slot='sales-auth-'+key+'-'+Math.floor(Date.now()/60000),count=Number(cache.get(slot)||0);if(count>=limit)throw Error('AUTH_REQUIRED: Zu viele Anmeldeversuche. Bitte in einer Minute erneut versuchen.');cache.put(slot,String(count+1),120);});
}
function finishSalesLogin(input){
  salesAuthThrottle_('finish',30);
  const identity=salesAuthIdentity_(input?.idToken),hash=salesAuthHash_(salesAuthKey_(input?.attempt));
  return salesLock_(()=>{
    const attempt=salesAuthRead_('attempts',hash),verifier=salesAuthKey_(input?.verifier),challenge=Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,verifier)).replace(/=+$/,'');
    if(!attempt||attempt.used||attempt.expiresAt<=Date.now()||attempt.state!==input.state||attempt.challenge!==challenge||typeof input.refreshToken!=='string'||input.refreshToken.length<20||input.refreshToken.length>10000||Date.now()/1000-identity.authTime>300||identity.authTime>Date.now()/1000+60)throw Error('AUTH_REQUIRED: Anmeldeanfrage ungültig oder abgelaufen.');
    if(!salesAuthEnabled_()){
      const legacy=salesUser_(true);if(identity.email!==legacy.email)throw Error('AUTH_DENIED: Bitte mit dem bisherigen Administratorkonto anmelden.');
      if(salesAuthConfig_().ownerUid&&salesAuthConfig_().ownerUid!==identity.uid)throw Error('AUTH_DENIED: Administrator bereits gebunden.');
      if(!salesAuthRead_('users',identity.uid))salesAuthCommit_([{kind:'users',id:identity.uid,create:true,value:{uid:identity.uid,email:identity.email,status:'active',permissions:salesPermissions_({},true),revision:1,sessionEpoch:0,createdAt:salesNow_()}}]);
      PropertiesService.getScriptProperties().setProperty('SALES_AUTH_OWNER_UID',identity.uid);
    }
    if(input.invitation)salesAuthActivate_(input.invitation,identity);
    const user=salesAuthPrincipal_(identity),session=salesAuthRandom_();
    salesAuthCommit_([{kind:'attempts',id:hash,prior:attempt,value:{used:true,expiresAt:attempt.expiresAt}},{kind:'sessions',id:salesAuthHash_(session),create:true,value:{uid:identity.uid,email:identity.email,idToken:input.idToken,refreshToken:input.refreshToken,tokenExpiresAt:identity.tokenExpiresAt,expiresAt:Date.now()+8*3600000,sessionEpoch:user.record.sessionEpoch}}],[user.record]);return {session,user:salesAuthPublicUser_(user)};
  });
}
function salesAuthPublicUser_(user){return {uid:user.uid,email:user.email,admin:user.admin,permissions:user.permissions,revision:user.revision};}
function salesAuthActivate_(token,identity){
  const id=salesAuthHash_(salesAuthKey_(token)),invite=salesAuthRead_('invites',id),reservation=salesAuthRead_('emails',salesAuthHash_(identity.email));
  if(!invite||invite.used||invite.expiresAt<=Date.now()||invite.email!==identity.email||reservation?.latestInvite!==id||reservation.uid||salesAuthRead_('users',identity.uid))throw Error('AUTH_DENIED: Einladung passt nicht zu diesem bestätigten Konto.');
  salesAuthCommit_([{kind:'users',id:identity.uid,create:true,value:{uid:identity.uid,email:identity.email,status:'active',permissions:salesPermissions_(invite.permissions),revision:1,sessionEpoch:0,createdAt:salesNow_()}},{kind:'invites',id,prior:invite,value:{...invite,used:true}},{kind:'emails',id:salesAuthHash_(identity.email),prior:reservation,value:{email:identity.email,uid:identity.uid}}]);
}
function salesAuthenticatedRpc(session,method,args){
  if(!salesAuthEnabled_()||salesAuthRequest_)throw Error('AUTH_REQUIRED: Anmeldung erforderlich.');
  const user=salesAuthVerify_(session);salesAuthRequest_={user,session,method,args};
  try{return {result:salesAuthFilter_(salesAuthDispatch_(method,args),user,method),identity:salesAuthPublicUser_(user)};}finally{salesAuthRequest_=null;}
}
function salesAuthRequire_(key){const user=salesAuthRequest_?.user;if(!user||!user.admin&&!user.permissions[key])throw Error('AUTH_DENIED: Diese Aktion ist nicht freigegeben.');return user;}
function salesAuthOwner_(){const user=salesAuthRequest_?.user;if(!user?.admin)throw Error('AUTH_DENIED: Benutzerverwaltung nur für den Administrator.');return user;}
