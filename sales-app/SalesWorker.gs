/** Temporary Apps Script continuation trigger. Never starts a new/nightly business sync. */
function salesWorkerProps_(){return PropertiesService.getScriptProperties();}
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
    run.paused=false;run.blockedMessage='';run.inFlight=null;run.revision++;run.updatedAt=salesNow_();salesWorkerProps_().setProperty('SALES_SYNC_PAUSE','');
    const legacy=salesRead_('sales_meta/import');if(legacy?.state==='running'){legacy.state='superseded';salesWrite_('sales_meta/import',legacy);}
    salesWrite_('sales_meta/sync',run);return salesBulkSummary_(run);
  });
}
function getSalesSyncStatus(){salesUser_();const run=salesRead_('sales_meta/sync');return salesSyncSummary_(run);}
function salesWorkerPause_(id){
  const run=salesRead_('sales_meta/sync');if(!run||run.id!==id)throw new Error('HQ-Sync nicht gefunden.');
  salesWorkerProps_().setProperty('SALES_SYNC_PAUSE',id);const lock=LockService.getScriptLock();
  if(lock.tryLock(1000)){try{const current=salesRead_('sales_meta/sync');if(current?.id===id&&current.state==='running'){current.paused=true;current.revision++;current.updatedAt=salesNow_();salesWrite_('sales_meta/sync',current);salesWorkerStop_();return salesBulkSummary_(current);}}finally{lock.releaseLock();}}
  return salesBulkSummary_(run);
}
function salesSyncWorker_(event){
  const p=salesWorkerProps_(),owner=p.getProperty('SALES_SYNC_EXECUTOR'),admin=String(p.getProperty('SALES_ADMIN_EMAIL')||SALES.admin).trim().toLowerCase(),allowed=String(p.getProperty('SALES_ALLOWED_EMAILS')||admin).split(',').map(x=>x.trim().toLowerCase());
  if(!event?.triggerUid||String(event.triggerUid)!==p.getProperty('SALES_SYNC_TRIGGER')||String(Session.getEffectiveUser().getEmail()||'').toLowerCase()!==owner||p.getProperty('SALES_SYNC_ADMIN')!==admin||!allowed.includes(admin))throw new Error('Hintergrundauftrag nicht autorisiert.');
  const until=Date.now()+180000;let checked=false;
  while(Date.now()<until){
    const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
    try{
      let run=salesRead_('sales_meta/sync');if(!run||run.engine!==2||run.state!=='running'||run.paused){salesWorkerStop_();return;}
      if(p.getProperty('SALES_SYNC_PAUSE')===run.id){run.paused=true;run.revision++;run.updatedAt=salesNow_();salesWrite_('sales_meta/sync',run);salesWorkerStop_();return;}
      let writeBoundary=false;try{
        const task=run.tasks[run.cursor],key=[run.cursor,task.stage||'',task.bucket||0,run.entities[task.id]?.lastId||0,task.pendingPage||''].join(':');
        const attempts=run.inFlight?.key===key?run.inFlight.attempts+1:1;
        if(attempts>3)throw new Error('Derselbe Abschnitt wurde dreimal ohne Abschluss beendet, möglicherweise durch Googles Laufzeitgrenze. Lauf angehalten; bitte den Fehler unter Apps Script → Ausführungen prüfen. Keine Schreibaufträge neu anlegen.');
        run.inFlight={key,attempts};run.heartbeat=salesNow_();salesWrite_('sales_meta/sync',run);
        if(!checked){salesAssertPrivate_();salesWorkerPrivate_();checked=true;}
        writeBoundary=salesBulkStep_(run);
      }catch(e){
        // Reload the durable checkpoint: an interrupted page may already have an immutable replay journal.
        run=salesRead_('sales_meta/sync');run.paused=true;run.blockedMessage=e.message||'Hintergrundabschnitt fehlgeschlagen.';run.updatedAt=salesNow_();run.revision++;salesWrite_('sales_meta/sync',run);salesWorkerStop_();return;
      }
      if(run.state!=='running'){salesWorkerStop_();return;}
      // Each company/contact write is followed by a separate trigger execution, not just another function call.
      if(writeBoundary)return;
    }finally{lock.releaseLock();}
  }
}
function salesWorkerPrivate_(){
  const c=salesContext_();for(const col of [...SALES_BULK_ENTITIES.map(salesBulkCollection_),'sales_projectviews']){const r=UrlFetchApp.fetch(pilotUrl_(c.project,col+'/security-probe'),{method:'get',muteHttpExceptions:true,followRedirects:false});if(![401,403].includes(r.getResponseCode()))throw new Error('Firestore-Schutz für den Sammelimport fehlt.');}
}
