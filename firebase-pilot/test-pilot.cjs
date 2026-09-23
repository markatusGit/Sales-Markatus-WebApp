const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

(async()=>{
  const {summarize}=await import('./public/revenue.mjs');
  const rows=[['1','Alpha',[['2025-01-10',10000],['2025-02-10',-2000]]],['2','Beta',[['2025-01-20',5000]]]];
  assert.deepEqual(summarize(rows,{from:'2025-01-01',to:'2025-01-31'}).map(x=>x.revenueCents),[10000,5000]);
  assert.deepEqual(summarize(rows,{from:'2025-01-01',to:'2025-12-31',min:'60',search:'alp'}).map(x=>x.revenueCents),[8000]);
  assert.throws(()=>summarize(rows,{from:'2025-12-31',to:'2025-01-01'}));
  console.log('PASS Zeiträume, Gutschriften und Umsatzfilter');

  const writes=[];
  let failDocuments=false,publicRead=false;
  const context=vm.createContext({
    console,Date,JSON,Object,String,Number,Math,Boolean,Array,RegExp,encodeURIComponent,
    PropertiesService:{getScriptProperties:()=>({getProperty:key=>({FIREBASE_PROJECT_ID:'pilot-project-1',FIREBASE_SERVICE_ACCOUNT_JSON:JSON.stringify({type:'service_account',project_id:'pilot-project-1',client_email:'service@example.org',private_key:'private'})})[key]})},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
    Utilities:{getUuid:()=> '12345678-1234-1234-1234-123456789abc',newBlob:text=>({getBytes:()=>Buffer.from(text,'utf8')})},
    UrlFetchApp:{fetch:()=>({getResponseCode:()=>publicRead?404:403})},
    requireBenchUser_:()=> 'owner@example.org'
  });
  const root=path.resolve(__dirname,'../hq-benchmark');
  vm.runInContext(fs.readFileSync(path.join(root,'Revenue.gs'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(root,'FirebaseSync.gs'),'utf8'),context);
  context.revenueToken_=()=> 'hq-token';
  context.pilotGoogleToken_=()=> 'firebase-token';
  context.pilotReadDocument_=()=>null;
  context.pilotWriteDocument_=(_project,key,value)=>{writes.push({key,value});};
  const setup=context.getFirebasePilotSetup();
  assert.equal(setup.projectId,'pilot-project-1');
  assert.equal(setup.accountPresent,true);
  assert.equal(JSON.stringify(setup).includes('private'),false);
  console.log('PASS Testoberfläche erhält nur Konfigurationsstatus, keinen Dienstkontoschlüssel');
  context.revenueFetch_=(url)=>{
    if (url.includes('Companies')) return {records:[{id:1,name:'Alpha',companyTypes:[{name:'Kunde'}]},{id:2,name:'Lieferant',companyTypes:[{name:'Lieferant'}]}],total:2};
    if (failDocuments) throw new Error('HQ-Fehler');
    return {records:[
      {id:10,companyId:1,date:'2025-01-10',documentType:'Invoice',documentStatusEntity:{documentStatusType:'Paid'},currency:'EUR',netValue:100},
      {id:11,companyId:1,date:'2025-02-10',documentType:'CreditNote',documentStatusEntity:{documentStatusType:'Paid'},currency:'EUR',netValue:20},
      {id:12,companyId:1,date:'2025-03-10',documentType:'Invoice',documentStatusEntity:{documentStatusType:'Draft'},currency:'EUR',netValue:999}
    ],total:3};
  };
  const result=context.pilotSync_();
  assert.equal(result.counts.countedDocuments,2);
  assert.equal(writes.at(-1).key,'pilot/current');
  const data=JSON.parse(writes[0].value.payload);
  assert.equal(data[0][1],'Alpha');
  assert.deepEqual(JSON.parse(JSON.stringify(data[0][2])),[['2025-01-10',10000],['2025-02-10',-2000]]);
  assert.equal(writes.at(-1).value.incomplete,false);
  console.log('PASS HQ-Abgleich publiziert vollständigen Snapshot mit korrekten Tageswerten');
  const bulk=Array.from({length:3025},(_,i)=>[String(i),'Testkunde '+i,[['2025-01-01',i],['2025-02-01',-i]]]);
  const blocks=context.pilotChunks_(bulk);
  assert.equal(blocks.flat().length,3025);
  assert(blocks.length>1 && blocks.length<100);
  assert(blocks.every(block=>Buffer.byteLength(JSON.stringify(block),'utf8')<=180000));
  console.log('PASS 3025 Kunden werden in begrenzte Firestore-Datenblöcke aufgeteilt');
  writes.length=0;failDocuments=true;
  assert.throws(()=>context.pilotSync_(),/HQ-Fehler/);
  assert.equal(writes.length,0);
  console.log('PASS HQ-Fehler publiziert keinen Datenstand');
  failDocuments=false;publicRead=true;
  assert.throws(()=>context.pilotSync_(),/Sicherheitsprüfung fehlgeschlagen/);
  assert.equal(writes.length,0);
  console.log('PASS öffentlich lesbare Firestore-Pfade sperren den HQ-Abgleich');
})().catch(error=>{console.error(error);process.exitCode=1;});
