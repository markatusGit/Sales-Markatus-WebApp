/** Temporary Apps Script continuation trigger. Never starts a new/nightly business sync.
 * A manually started run then behaves like an unattended run: temporary HQ/Firebase faults wait a few
 * minutes (minute timers only, no fixed clock times) and retry the same section; a section that keeps
 * failing is recorded and skipped where that is safe, so the rest of the sync still finishes. */
const SALES_SYNC_RETRY_MINUTES=[2,5,10,15,30,60];
// Optional checks give up sooner; their open work is simply repeated by the next sync.
const SALES_SYNC_OPTIONAL_TASKS=['deltaProbe','deltaMissing','catalog','verifyJobs','deltaEditions','bulkKeys'];
var salesWorkerRetriesLeftValue_=0;
function salesWorkerRetriesLeft_(){return salesWorkerRetriesLeftValue_;}
function salesWorkerProps_(){return PropertiesService.getScriptProperties();}
function salesWorkerLimited_(e){return !!e&&(e.salesQuota===true||/Firestore[^\n]*HTTP 429/.test(e.message||''));}
function salesWorkerTransient_(e){
  if(!e||e.salesFatal)return false;
  if(e.salesTransient||salesWorkerLimited_(e))return true;
  if([408,429,500,502,503,504].includes(e.hqHttpStatus))return true;
  if(e.salesJobOutcome)return false;
  return /(Firestore|Firebase)[^\n]*HTTP (408|429|5\d\d)|HQ-Lesetest: HTTP (408|429|500|502|503|504)\b|timed out|Timeout|Zeitüberschreitung|Address unavailable|DNS error|Service invoked too many times|Service unavailable|Dienst nicht verfügbar|Serverfehler|Bandwidth quota|Ein Speichervorgang läuft/i.test(String(e.message||''));
}
function salesWorkerSafeMessage_(e){
  return String(e?.message||'Unbekannter Fehler').replace(/https?:\/\/\S+/g,'[Adresse entfernt]').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[E-Mail entfernt]').replace(/[\x00-\x1F\x7F]/g,' ').slice(0,400);
}
function salesWorkerRetryState_(){
  const raw=salesWorkerProps_().getProperty('SALES_SYNC_RETRY');if(!raw)return null;
  try{const value=JSON.parse(raw);return value&&Number.isFinite(value.until)?value:null;}catch{return null;}
}
function salesWorkerRetryLimit_(task,e){
  if(e&&salesWorkerLimited_(e))return 30;
  return task&&SALES_SYNC_OPTIONAL_TASKS.includes(task.kind)?3:8;
}
/** Schedules the next attempt of the same section after a minute delay. False once the section's attempts are used up. */
function salesWorkerRetry_(key,runId,task,e){
  const old=salesWorkerRetryState_(),attempts=old?.key===key&&!old.wait?old.attempts+1:1,limit=salesWorkerRetryLimit_(task,e);
  if(attempts>limit){e.salesRetried=attempts-1;return false;}
  const minutes=SALES_SYNC_RETRY_MINUTES[Math.min(attempts,SALES_SYNC_RETRY_MINUTES.length)-1];
  salesWorkerProps_().setProperty('SALES_SYNC_RETRY',JSON.stringify({key,runId:runId||null,attempts,limit,minutes,until:Date.now()+minutes*60000,at:salesNow_(),label:task?.label||'HQ-Abgleich',message:salesWorkerSafeMessage_(e)}));
  return true;
}
function salesWorkerWait_(run,task,key){
  salesWorkerProps_().setProperty('SALES_SYNC_RETRY',JSON.stringify({key,runId:run.id,wait:true,attempts:0,until:Date.parse(task.waitUntil),at:salesNow_(),label:task.label||'HQ-Abgleich',message:task.waitMessage||'Wartet bis zur nächsten geplanten Prüfung.'}));
}
function salesWorkerRecovered_(run,previous,key){
  salesWorkerProps_().setProperty('SALES_SYNC_RETRY','');
  if(previous.wait||previous.key!==key)return;
  run.notices=(run.notices||[]).concat({label:previous.label||'HQ-Abgleich',message:'Nach '+previous.attempts+(previous.attempts===1?' automatischen Wiederholung':' automatischen Wiederholungen')+' erfolgreich fortgesetzt. Ursache war: '+previous.message}).slice(-50);
  run.revision++;run.updatedAt=salesNow_();salesWrite_('sales_meta/sync',run);
}
/** A section that cannot be finished is recorded and skipped where the rest of the run stays consistent.
 * Skipped change reads keep the previous change marker, so the next sync reads those changes again. */
function salesWorkerSkip_(run,e){
  // An approved plan cleanup runs before the current section; its failure must not skip that unrelated section.
  // A journaled page must be replayed, never dropped.
  const task=run.tasks[run.cursor];if(!task||run.planCleanupPending||e.salesStop||task.pendingPage)return false;
  const message=salesWorkerSafeMessage_(e)+(e.salesRetried?' (nach '+e.salesRetried+' automatischen Wiederholungen)':'');
  const record=note=>run.errors.push({kind:task.kind==='write'?'write':task.kind,id:task.id,label:task.label||'HQ-Abgleich',stage:task.stage||'',message:message+' · '+note});
  if(task.kind==='write')record('Auftrag bleibt gespeichert und wird beim nächsten HQ-Abgleich erneut geprüft. Der restliche Abgleich läuft weiter.');
  else if(SALES_SYNC_OPTIONAL_TASKS.includes(task.kind)){
    if(task.kind==='deltaMissing'){salesDeltaResetScan_(task);run.errors=run.errors.filter(x=>!(x.kind==='deltaMissing'&&x.id===task.id));}
    if(task.kind==='deltaEditions')for(const id of task.editionIds||[]){const edition=salesRead_('sales_editions/'+salesKey_(id));if(edition&&!edition.cacheLinkPending)salesWrite_('sales_editions/'+edition.id,{...edition,cacheLinkPending:true});}
    if(task.kind==='verifyJobs')run.verifyJobs=[];
    record('Prüfung übersprungen; sie wird beim nächsten HQ-Abgleich erneut versucht. Der restliche Abgleich läuft weiter.');
  }
  else if(!run.full&&['bulkRead','bulkProject','bulkCompany','deltaUnassigned'].includes(task.kind)){
    if(task.kind==='bulkRead')run.entities[task.id].retainWatermark=true;else run.retainWatermarks=true;
    record('Abschnitt übersprungen; diese Änderungen werden beim nächsten HQ-Abgleich erneut gelesen. Der restliche Abgleich läuft weiter.');
  }
  else return false;
  task.skipped=true;task.finished=true;run.done++;run.cursor++;run.inFlight=null;run.revision++;run.updatedAt=salesNow_();
  if(run.cursor>=run.tasks.length)run.state=run.errors.length?'completedWithErrors':'completed';
  return true;
}
function salesWorkerStatus_(summary){
  const retry=salesWorkerRetryState_();
  if(summary?.state!=='running'||!retry||retry.runId&&retry.runId!==summary.id)return summary;
  if(retry.exhausted)return {...summary,background:false,errors:summary.errors.concat({label:'Automatische Wiederholung beendet · '+retry.label,message:retry.message+' · Nach '+retry.attempts+' Versuchen angehalten. Über „HQ-Sync fortsetzen“ erneut starten.'})};
  if(retry.until<=Date.now())return summary;
  return {...summary,retry:{until:new Date(retry.until).toISOString(),attempt:retry.attempts,limit:retry.limit||null,wait:!!retry.wait,label:retry.label,message:retry.message}};
}
function setupSalesSyncWorker(){
  const user=salesUser_(true),email=String(Session.getEffectiveUser().getEmail()||'').trim().toLowerCase();
  if(!email)throw new Error('Google-Ausführungskonto nicht erkennbar. Im Apps-Script-Editor freigeben.');
  ScriptApp.getProjectTriggers(); // Requests script.scriptapp authorization before any run is changed.
  const p=salesWorkerProps_();p.setProperty('SALES_SYNC_EXECUTOR',email);p.setProperty('SALES_SYNC_ADMIN',user.email);
  return {message:'Hintergrundfortsetzung freigegeben. Der nächste manuelle HQ-Sync darf ohne offenen Browser weiterlaufen. Kein Nachtlauf eingerichtet.'};
}
function salesWorkerEnsure_(){
  const p=salesWorkerProps_(),email=String(Session.getEffectiveUser().getEmail()||'').trim().toLowerCase(),admin=String(p.getProperty('SALES_ADMIN_EMAIL')||SALES.admin).trim().toLowerCase();
  if(!email||p.getProperty('SALES_SYNC_EXECUTOR')!==email||p.getProperty('SALES_SYNC_ADMIN')!==admin)throw new Error('Hintergrundlauf noch nicht freigegeben. In Apps Script einmal setupSalesSyncWorker ausführen und Google-Berechtigung bestätigen.');
  // A manual start/continue means "try now": the minute timer ends at once (attempt count kept for the recovery note).
  // The removed daily-budget state of older versions is cleared.
  for(const key of ['SALES_SYNC_HOLD','SALES_SYNC_BUDGET'])if(p.getProperty(key))p.setProperty(key,'');
  const retry=salesWorkerRetryState_();if(retry)p.setProperty('SALES_SYNC_RETRY',retry.exhausted?'':JSON.stringify({...retry,until:0}));else if(p.getProperty('SALES_SYNC_RETRY'))p.setProperty('SALES_SYNC_RETRY','');
  const existing=ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='salesSyncWorker_'),saved=p.getProperty('SALES_SYNC_TRIGGER');
  const keep=existing.find(t=>t.getUniqueId()===saved);existing.filter(t=>t!==keep).forEach(t=>ScriptApp.deleteTrigger(t));
  if(!keep){const trigger=ScriptApp.newTrigger('salesSyncWorker_').timeBased().everyMinutes(1).create();p.setProperty('SALES_SYNC_TRIGGER',trigger.getUniqueId());}
}
function salesWorkerStop_(){
  const p=salesWorkerProps_();p.setProperty('SALES_SYNC_TRIGGER','');if(p.getProperty('SALES_SYNC_RETRY'))p.setProperty('SALES_SYNC_RETRY','');
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='salesSyncWorker_').forEach(t=>ScriptApp.deleteTrigger(t));
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
  // A waiting minute timer costs no Firebase or HQ request.
  const waiting=salesWorkerRetryState_();if(waiting&&!waiting.exhausted&&waiting.until>Date.now())return;
  // Only a validated installable trigger may establish this server-only context.
  if(typeof salesAuthEnabled_==='function'&&salesAuthEnabled_()){const cfg=salesAuthConfig_();salesAuthRequest_={user:salesAuthPrincipal_({uid:cfg.ownerUid,email:cfg.ownerEmail}),worker:true};}
  const until=Date.now()+180000;let checked=false;
  while(Date.now()<until){
    const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
    try{
      let run=salesRead_('sales_meta/sync');if(!run||run.engine!==2||run.state!=='running'||run.paused){if(run?.engine===2)salesWrite_('sales_meta/lean_sync',salesBulkSummary_(run));salesWorkerStop_();return;}
      if(p.getProperty('SALES_SYNC_PAUSE')===run.id){run.paused=true;run.revision++;run.updatedAt=salesNow_();salesWrite_('sales_meta/sync',run);salesWorkerStop_();return;}
      const task=run.tasks[run.cursor],key=[run.cursor,task.stage||'',task.bucket||0,run.entities[task.id]?.lastId||0,task.pendingPage||''].join(':'),retryKey=run.id+'|'+key;
      if(task.waitUntil&&Date.parse(task.waitUntil)>Date.now()){salesWorkerWait_(run,task,retryKey);return;}
      // A caught, scheduled retry is not an unfinished (killed) execution.
      const previous=salesWorkerRetryState_(),caught=previous?.key===retryKey||!previous?.wait&&(previous?.key==='worker'||previous?.runId===run.id),tried=previous?.key===retryKey&&!previous.wait?previous.attempts:0;
      let writeBoundary=false;try{
        const attempts=!caught&&run.inFlight?.key===key?run.inFlight.attempts+1:1;
        if(attempts>3){const e=new Error('Derselbe Abschnitt wurde dreimal ohne Abschluss beendet, möglicherweise durch Googles Laufzeitgrenze. Bitte den Fehler unter Apps Script → Ausführungen prüfen. Keine Schreibaufträge neu anlegen.');e.salesFatal=true;throw e;}
        run.inFlight={key,attempts};run.heartbeat=salesNow_();salesWrite_('sales_meta/sync',run);
        if(!checked){salesAssertPrivate_();salesWorkerPrivate_();checked=true;}
        salesWorkerRetriesLeftValue_=Math.max(0,salesWorkerRetryLimit_(task,null)-tried);
        writeBoundary=salesBulkStep_(run);salesWorkerRetriesLeftValue_=0;
        if(previous)salesWorkerRecovered_(run,previous,retryKey);
      }catch(e){
        salesWorkerRetriesLeftValue_=0;
        if(salesWorkerTransient_(e)&&salesWorkerRetry_(retryKey,run.id,task,e))return;
        // Reload the durable checkpoint: an interrupted page may already have an immutable replay journal.
        run=salesRead_('sales_meta/sync');p.setProperty('SALES_SYNC_RETRY','');
        if(run&&run.state!=='running'){salesWrite_('sales_meta/lean_sync',salesBulkSummary_(run));salesWorkerStop_();return;}
        if(salesWorkerSkip_(run,e)){salesWrite_('sales_meta/sync',run);if(run.state!=='running'){salesWorkerStop_();return;}continue;}
        run.paused=true;run.blockedMessage=salesWorkerSafeMessage_(e)+(e.salesRetried?' (nach '+e.salesRetried+' automatischen Wiederholungen)':'');run.updatedAt=salesNow_();run.revision++;salesWrite_('sales_meta/sync',run);salesWorkerStop_();return;
      }
      if(run.state!=='running'){salesWorkerStop_();return;}
      // Each company/contact write is followed by a separate trigger execution, not just another function call.
      if(writeBoundary)return;
    }finally{lock.releaseLock();}
    // Give waiting user saves a chance to take the lock before the next section; if one does, the next trigger continues.
    if(typeof Utilities!=='undefined'&&Utilities.sleep)Utilities.sleep(1500);
  }
  }catch(e){
    // Failures before the run could be read (e.g. Firebase quota) wait on a minute timer as well.
    if(salesWorkerTransient_(e)){
      if(!salesWorkerRetry_('worker',null,null,e)){salesWorkerStop_();p.setProperty('SALES_SYNC_RETRY',JSON.stringify({key:'worker',runId:null,exhausted:true,attempts:e.salesRetried||0,until:0,at:salesNow_(),label:'HQ-Abgleich',message:salesWorkerSafeMessage_(e)}));}
      return;
    }
    throw e;
  }finally{salesWorkerRetriesLeftValue_=0;if(typeof salesAuthRequest_!=='undefined')salesAuthRequest_=null;}
}
function salesWorkerPrivate_(){
  const c=salesContext_();for(const col of [...SALES_BULK_ENTITIES.map(salesBulkCollection_),'sales_projectviews']){const r=UrlFetchApp.fetch(pilotUrl_(c.project,col+'/security-probe'),{method:'get',muteHttpExceptions:true,followRedirects:false});const code=r.getResponseCode();
    // Quota or server faults say nothing about the protection: retry later instead of skipping a section (r42.3).
    if(code===429||code>=500)throw new Error('Firestore HTTP '+code+' bei Schutzprüfung.');
    if(![401,403].includes(code))throw new Error('Firestore-Schutz für den Sammelimport fehlt.');}
}
