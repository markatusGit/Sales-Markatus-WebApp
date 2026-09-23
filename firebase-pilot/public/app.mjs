import {firebaseConfig} from './config.js';
import {summarize} from './revenue.mjs';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signOut} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,doc,getDocFromServer} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const $=id=>document.getElementById(id);
const money=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'});
const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
let rows=[], meta=null, page=0, firstLoad=true, lastReadMs=null;
const trace=[];

function status(message,bad=false) { $('status').textContent=message; $('status').classList.toggle('error',bad); }
function errorText(error) {
  if (error.code==='permission-denied') return 'Kein Zugriff: Deine Nutzer-ID muss in Firestore unter pilot_access freigeschaltet werden.';
  return error.message || String(error);
}
function showTiming(total,read) {
  $('timing').textContent=`Bis zur Liste: ${(total/1000).toFixed(2)} s · Firebase-Abruf: ${(read/1000).toFixed(2)} s · ${meta.chunkCount} Datenblöcke`;
}
async function load() {
  if (!auth.currentUser) return;
  $('reload').disabled=true;
  status('Lade frischen Datenstand aus Firebase …');
  const viewStarted=firstLoad?0:performance.now();
  firstLoad=false;
  const readStarted=performance.now();
  try {
    const pointer=await getDocFromServer(doc(db,'pilot','current'));
    if (!pointer.exists()) throw new Error('Noch kein HQ-Abgleich vorhanden. Zuerst syncFirebasePilot ausführen.');
    const info=pointer.data();
    info.counts=JSON.parse(info.counts);
    if (info.schema!==1 || !/^[a-f0-9-]{36}$/i.test(info.snapshotId) || !Number.isInteger(info.chunkCount) || info.chunkCount<1 || info.chunkCount>1000) throw new Error('Unbekanntes oder unvollständiges Datenformat.');
    const snapshots=await Promise.all(Array.from({length:info.chunkCount},(_,i)=>getDocFromServer(doc(db,'pilot_snapshots',info.snapshotId,'chunks',String(i).padStart(4,'0')))));
    if (snapshots.some(snapshot=>!snapshot.exists())) throw new Error('Ein Datenblock fehlt. Bitte den HQ-Abgleich erneut ausführen.');
    const nextRows=snapshots.flatMap(snapshot=>JSON.parse(snapshot.data().payload));
    if (nextRows.length!==info.counts.customers) throw new Error('Kundenzahl stimmt nicht mit dem Datenstand überein.');
    rows=nextRows;meta=info;page=0;
    lastReadMs=performance.now()-readStarted;
    const rendered=render();
    const total=performance.now()-viewStarted;
    showTiming(total,lastReadMs);
    $('meta').textContent=`HQ-Abgleich: ${new Date(info.createdAt).toLocaleString('de-DE')} · ${rows.length} Kunden · ${info.counts.countedDocuments} zählende Belege${info.incomplete?' · Umsatz wegen ausgelassener HQ-Belege vorläufig':''}`;
    status('Liste geladen. Zeitraum und Filter reagieren lokal.');
    trace.push({at:new Date().toISOString(),kind:'load',totalMs:Math.round(total),readMs:Math.round(lastReadMs),renderMs:Math.round(rendered),chunks:info.chunkCount,customers:rows.length,snapshotId:info.snapshotId});
  } catch (error) { status(errorText(error),true); }
  finally {$('reload').disabled=false;}
}

function render() {
  if (!meta) return 0;
  const began=performance.now();
  try {
    const found=summarize(rows,{from:$('from').value,to:$('to').value,search:$('search').value,min:$('min').value,max:$('max').value,sort:$('sort').value});
    const pageSize=100, pages=Math.max(1,Math.ceil(found.length/pageSize));
    page=Math.min(page,pages-1);
    const visible=found.slice(page*pageSize,(page+1)*pageSize);
    $('body').replaceChildren(...visible.map((row,i)=>{
      const tr=document.createElement('tr');
      const cells=[String(page*pageSize+i+1),row.name,money.format(row.revenueCents/100)];
      cells.forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td);});
      return tr;
    }));
    $('count').textContent=`${found.length} Treffer · zusammen ${money.format(found.reduce((sum,row)=>sum+row.revenueCents,0)/100)}`;
    $('page').textContent=`Seite ${page+1} von ${pages}`;
    $('prev').disabled=page===0;
    $('next').disabled=page+1>=pages;
    const elapsed=performance.now()-began;
    $('filtertime').textContent=`Filter und Tabelle: ${elapsed.toFixed(1)} ms`;
    trace.push({at:new Date().toISOString(),kind:'filter',ms:Math.round(elapsed*10)/10,results:found.length});
    if (trace.length>100) trace.splice(0,trace.length-100);
    return elapsed;
  } catch (error) {status(errorText(error),true);return 0;}
}

$('login').onclick=()=>signInWithPopup(auth,new GoogleAuthProvider()).catch(error=>status(errorText(error),true));
$('logout').onclick=()=>signOut(auth);
$('reload').onclick=load;
for (const id of ['from','to','search','min','max','sort']) $(id).addEventListener('input',()=>{page=0;render();});
$('prev').onclick=()=>{page--;render();};
$('next').onclick=()=>{page++;render();};
$('download').onclick=()=>{
  const safe={createdAt:new Date().toISOString(),meta:meta&&{snapshotId:meta.snapshotId,createdAt:meta.createdAt,chunkCount:meta.chunkCount,customerCount:meta.counts.customers,incomplete:meta.incomplete},events:trace};
  const blob=new Blob([JSON.stringify(safe,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='firebase-vertriebstest-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
const now=new Date();$('to').value=now.toISOString().slice(0,10);$('from').value='2025-01-01';
onAuthStateChanged(auth,user=>{
  $('login').hidden=Boolean(user);$('logout').hidden=!user;$('reload').hidden=!user;
  $('identity').textContent=user?`Angemeldet: ${user.email} · Nutzer-ID für Freischaltung: ${user.uid}`:'';
  if (user) load(); else {firstLoad=false;rows=[];meta=null;$('body').replaceChildren();$('timing').textContent='';status('Mit Google anmelden, um den Firebase-Test zu starten.');}
});
