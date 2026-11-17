/** Temporary Apps Script continuation trigger. Never starts a new/nightly business sync. */
let salesWorkerBudgetActive_=false;
function salesWorkerDay_(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function salesWorkerHoldState_(){try{return JSON.parse(salesWorkerProps_().getProperty('SALES_SYNC_HOLD')||'null');}catch{throw Error('Gespeicherte Kontingentpause ungültig. Bitte administrativ prüfen.');}}
function salesWorkerBudget_(reads,writes){
  if(!salesWorkerBudgetActive_)return;
  const p=salesWorkerProps_(),day=salesWorkerDay_();let meter;try{meter=JSON.parse(p.getProperty('SALES_SYNC_BUDGET')||'null');}catch{throw Error('Gespeichertes Importbudget ungültig.');}
  if(!meter||meter.day!==day)meter={day,reads:0,writes:0};
  if(!Number.isSafeInteger(meter.reads)||meter.reads<0||!Number.isSafeInteger(meter.writes)||meter.writes<0||!Number.isSafeInteger(reads)||!Number.isSafeInteger(writes))throw Error('Gespeichertes Importbudget ungültig.');
  const next={day,reads:Math.max(0,meter.reads+reads),writes:Math.max(0,meter.writes+writes)};
  if(next.reads>20000||next.writes>12000){const e=Error('Tagesbudget des HQ-Imports erreicht. Gespeicherten Lauf am nächsten Tag manuell fortsetzen.');e.salesBudget=true;throw e;}
  p.setProperty('SALES_SYNC_BUDGET',JSON.stringify(next));
}
// Before an HQ write task: stop cleanly unless enough budget remains to finish the job and store its state.
function salesWorkerReserve_(reads,writes){
  if(!salesWorkerBudgetActive_)return;
  const day=salesWorkerDay_();let meter;try{meter=JSON.parse(salesWorkerProps_().getProperty('SALES_SYNC_BUDGET')||'null');}catch{throw Error('Gespeichertes Importbudget ungültig.');}
  if(!meter||meter.day!==day)return;
  if(meter.reads+reads>20000||meter.writes+writes>12000){const e=Error('Tagesbudget des HQ-Imports reicht nicht mehr sicher für einen Schreibauftrag. Gespeicherten Lauf am nächsten Tag manuell fortsetzen.');e.salesBudget=true;throw e;}
}
function salesWorkerRequestBudget_(url,options){
  if(!salesWorkerBudgetActive_||!/^https:\/\/firestore\.googleapis\.com\//.test(url))return null;
  const method=String(options?.method||'get').toLowerCase();let body;try{body=JSON.parse(options?.payload||'{}');}catch{throw Error('Importanfrage ohne prüfbares Budget.');}
  let reads=0,writes=0,query=false;
  if(url.endsWith(':batchGet'))reads=body.documents.length;
  else if(url.endsWith(':runQuery')){reads=body.structuredQuery.limit;query=true;}
  else if(url.endsWith(':commit')){reads=body.writes.filter(w=>w.verify).length;writes=body.writes.filter(w=>w.update||w.delete||w.transform).length;}
  else if(method==='get'){reads=Number(/[?&]pageSize=(\d+)/.exec(url)?.[1]||1);query=/[?&]pageSize=/.test(url);}
  else if(['patch','delete'].includes(method))writes=1;
  else throw Error('Importanfrage ohne prüfbares Budget.');
  if(!Number.isSafeInteger(reads)||reads<0)throw Error('Import-Lesemenge nicht begrenzt.');
  salesWorkerBudget_(reads,writes);return {reads,query};
}
function salesWorkerLimited_(e){return e.salesQuota||e.salesBudget||/Firestore[^\n]*HTTP 429/.test(e.message||'');}
function salesWorkerHold_(e){
  const message=e.salesBudget?'Tagesbudget des HQ-Imports erreicht. Gespeicherten Lauf am nächsten Tag manuell fortsetzen.':'Firebase-Kontingent ausgeschöpft. Hintergrundlauf gestoppt; nach Erneuerung des Kontingents manuell fortsetzen.';
  salesWorkerProps_().setProperty('SALES_SYNC_HOLD',JSON.stringify({day:salesWorkerDay_(),at:salesNow_(),reason:e.salesBudget?'budget':'quota',message}));salesWorkerStop_();
}
function salesWorkerStatus_(summary){const hold=salesWorkerHoldState_();return summary?.state==='running'&&hold?{...summary,paused:true,background:false,errors:summary.errors.concat({label:'HQ-Abgleich angehalten · Kontingentschutz',message:hold.message})}:summary;}
function salesWorkerProps_(){return PropertiesService.getScriptProperties();}
function setupSalesSyncWorker(){
  const user=salesUser_(true),email=String(Session.getEffectiveUser().getEmail()||'').trim().toLowerCase();
  if(!email)throw new Error('Google-Ausführungskonto nicht erkennbar. Im Apps-Script-Editor freigeben.');
  ScriptApp.getProjectTriggers(); // Requests script.scriptapp authorization before any run is changed.
  const p=salesWorkerProps_();p.setProperty('SALES_SYNC_EXECUTOR',email);p.setProperty('SALES_SYNC_ADMIN',user.email);
  return {message:'Hintergrundfortsetzung freigegeben. Der nächste manuelle HQ-Sync darf ohne offenen Browser weiterlaufen. Kein Nachtlauf eingerichtet.'};
}
function salesWorkerEnsure_(){
  const hold=salesWorkerHoldState_();if(hold?.day===salesWorkerDay_())throw Error(hold.message);
  const p=salesWorkerProps_(),email=String(Session.getEffectiveUser().getEmail()||'').trim().toLowerCase(),admin=String(p.getProperty('SALES_ADMIN_EMAIL')||SALES.admin).trim().toLowerCase();
  if(!email||p.getProperty('SALES_SYNC_EXECUTOR')!==email||p.getProperty('SALES_SYNC_ADMIN')!==admin)throw new Error('Hintergrundlauf noch nicht freigegeben. In Apps Script einmal setupSalesSyncWorker ausführen und Google-Berechtigung bestätigen.');
  if(hold)p.setProperty('SALES_SYNC_HOLD','');
  const existing=ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='salesSyncWorker_'),saved=p.getProperty('SALES_SYNC_TRIGGER');
  const keep=existing.find(t=>t.getUniqueId()===saved);existing.filter(t=>t!==keep).forEach(t=>ScriptApp.deleteTrigger(t));
  if(!keep){const trigger=ScriptApp.newTrigger('salesSyncWorker_').timeBased().everyMinutes(1).create();p.setProperty('SALES_SYNC_TRIGGER',trigger.getUniqueId());}
}
function salesWorkerStop_(){
  const p=salesWorkerProps_();p.setProperty('SALES_SYNC_TRIGGER','');ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='salesSyncWorker_').forEach(t=>ScriptApp.deleteTrigger(t));
}
function salesBulkStart_(){
  salesUser_(true);return salesLock_(()=>{
    salesAssertPrivate_();salesWorkerEnsure_();const old=salesRead_('sales_meta/sync');
    const run=old?.engine===2&&old.state==='running'?old:salesBulkPrepare_(old);
    run.paused=false;run.blockedMessage='';run.inFlight=null;run.statusPublishedAt=null;run.revision++;run.updatedAt=salesNow_();salesWorkerProps_().setProperty('SALES_SYNC_PAUSE','');
    const legacy=salesRead_('sales_meta/import');if(legacy?.state==='running'){legacy.state='superseded';salesWrite_('sales_meta/import',legacy);}
    salesWrite_('sales_meta/sync',run);return salesBulkSummary_(run);
  });
}
function getSalesSyncStatus(){
  const user=salesUser_();return salesDeltaDiagnosticStatus_(salesLeanSyncStatus_(),user.admin);
}
function salesWorkerPause_(id){
  const run=salesRead_('sales_meta/sync');if(!run||run.id!==id)throw new Error('HQ-Sync nicht gefunden.');
  salesWorkerProps_().setProperty('SALES_SYNC_PAUSE',id);const lock=LockService.getScriptLock();
  if(lock.tryLock(1000)){try{const current=salesRead_('sales_meta/sync');if(current?.id===id&&current.state==='running'){current.paused=true;current.revision++;current.updatedAt=salesNow_();salesWrite_('sales_meta/sync',current);salesWorkerStop_();return salesBulkSummary_(current);}}finally{lock.releaseLock();}}
  return salesBulkSummary_(run);
}
function salesSyncWorker_(event){
  const p=salesWorkerProps_(),owner=p.getProperty('SALES_SYNC_EXECUTOR'),admin=String(p.getProperty('SALES_ADMIN_EMAIL')||SALES.admin).trim().toLowerCase(),allowed=String(p.getProperty('SALES_ALLOWED_EMAILS')||admin).split(',').map(x=>x.trim().toLowerCase());
  if(!event?.triggerUid||String(event.triggerUid)!==p.getProperty('SALES_SYNC_TRIGGER')||String(Session.getEffectiveUser().getEmail()||'').toLowerCase()!==owner||p.getProperty('SALES_SYNC_ADMIN')!==admin||!allowed.includes(admin))throw new Error('Hintergrundauftrag nicht autorisiert.');
  try{
  if(salesWorkerHoldState_()){salesWorkerStop_();return;}
  // Only a validated installable trigger may establish this server-only context.
  if(typeof salesAuthEnabled_==='function'&&salesAuthEnabled_()){const cfg=salesAuthConfig_();salesAuthRequest_={user:salesAuthPrincipal_({uid:cfg.ownerUid,email:cfg.ownerEmail}),worker:true};}
  const until=Date.now()+180000;let checked=false;
  while(Date.now()<until){
    const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
    try{
      salesWorkerBudgetActive_=true;
      let run=salesRead_('sales_meta/sync');if(!run||run.engine!==2||run.state!=='running'||run.paused){if(run?.engine===2)salesWrite_('sales_meta/lean_sync',salesBulkSummary_(run));salesWorkerStop_();return;}
      if(p.getProperty('SALES_SYNC_PAUSE')===run.id){run.paused=true;run.revision++;run.updatedAt=salesNow_();salesWrite_('sales_meta/sync',run);salesWorkerStop_();return;}
      let writeBoundary=false;try{
        const task=run.tasks[run.cursor],key=[run.cursor,task.stage||'',task.bucket||0,run.entities[task.id]?.lastId||0,task.pendingPage||''].join(':');
        const attempts=run.inFlight?.key===key?run.inFlight.attempts+1:1;
        if(attempts>3)throw new Error('Derselbe Abschnitt wurde dreimal ohne Abschluss beendet, möglicherweise durch Googles Laufzeitgrenze. Lauf angehalten; bitte den Fehler unter Apps Script → Ausführungen prüfen. Keine Schreibaufträge neu anlegen.');
        run.inFlight={key,attempts};run.heartbeat=salesNow_();salesWrite_('sales_meta/sync',run);
        if(!checked){salesAssertPrivate_();salesWorkerPrivate_();checked=true;}
        writeBoundary=salesBulkStep_(run);
      }catch(e){
        if(salesWorkerLimited_(e)){salesWorkerHold_(e);return;}
        // Reload the durable checkpoint: an interrupted page may already have an immutable replay journal.
        run=salesRead_('sales_meta/sync');
        if(run&&run.state!=='running'){salesWrite_('sales_meta/lean_sync',salesBulkSummary_(run));salesWorkerStop_();return;}
        run.paused=true;run.blockedMessage=e.message||'Hintergrundabschnitt fehlgeschlagen.';run.updatedAt=salesNow_();run.revision++;salesWrite_('sales_meta/sync',run);salesWorkerStop_();return;
      }
      if(run.state!=='running'){salesWorkerStop_();return;}
      // Each company/contact write is followed by a separate trigger execution, not just another function call.
      if(writeBoundary)return;
    }finally{lock.releaseLock();}
    // Give waiting user saves a chance to take the lock before the next section; if one does, the next trigger continues.
    if(typeof Utilities!=='undefined'&&Utilities.sleep)Utilities.sleep(1500);
  }
  }catch(e){if(salesWorkerLimited_(e)){salesWorkerHold_(e);return;}throw e;}finally{salesWorkerBudgetActive_=false;if(typeof salesAuthRequest_!=='undefined')salesAuthRequest_=null;}
}
function salesWorkerPrivate_(){
  const c=salesContext_();for(const col of [...SALES_BULK_ENTITIES.map(salesBulkCollection_),'sales_projectviews']){const r=UrlFetchApp.fetch(pilotUrl_(c.project,col+'/security-probe'),{method:'get',muteHttpExceptions:true,followRedirects:false});if(![401,403].includes(r.getResponseCode()))throw new Error('Firestore-Schutz für den Sammelimport fehlt.');}
}
