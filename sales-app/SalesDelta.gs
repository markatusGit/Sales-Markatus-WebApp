/** Persistent change cursors. No scheduled or mismatch-triggered full reread. */
function salesDeltaCache_(old){
  let cache=salesRead_('sales_meta/bulk')||{};
  // r18 discarded its metadata on a count warning although all read/projection steps finished.
  // Recover only from a durably completed run, never from a merely read/partially published run.
  if(old?.engine===2&&old.policy!==3&&['completed','completedWithErrors'].includes(old.state)&&old.kind!=='editions'&&
      old.cursor===old.tasks.length&&SALES_BULK_ENTITIES.every(e=>old.entities?.[e]?.complete)&&
      (!cache.completedAt||Date.parse(old.updatedAt)>Date.parse(cache.completedAt))){
    const entities={};
    for(const e of SALES_BULK_ENTITIES){const m=old.entities[e],prev=cache.entities?.[e];
      entities[e]={generation:m.generation,count:m.count,watermark:old.startedAt,ids:m.full?m.ids:(m.knownIds||prev?.ids||[]),checkOffset:prev?.checkOffset||0};
    }
    cache={...cache,entities,companyIds:old.companyIds,stats:old.stats,completedAt:old.updatedAt,policy:3,needsFull:false,
      warnings:(old.errors||[]).filter(e=>e.label==='Vollständigkeitsprüfung').map(()=>({label:'Bestandsprüfung',message:'Der übernommene Erstimport enthält eine Mengenabweichung. Vorhandene Daten bleiben erhalten; kein erneuter Gesamtimport. Der nächste Änderungsabgleich zeigt die betroffene Datenart.'}))};
    salesWrite_('sales_meta/bulk',cache);
  }
  if(cache.completedAt&&!SALES_BULK_ENTITIES.every(e=>cache.entities?.[e]?.generation&&Number.isFinite(Date.parse(cache.entities[e].watermark))))throw new Error('Gespeicherte Änderungsmarken unvollständig. Bestand bleibt erhalten; kein automatischer Gesamtimport. Einrichtung prüfen.');
  return cache;
}
function salesDeltaPrepare_(old){
  const cache=salesDeltaCache_(old),now=salesNow_(),full=!cache.completedAt;
  // A new database needs one initial baseline. A known database is never silently reset.
  if(full&&old?.engine===2&&old.state!=='running')throw new Error('Vorhandener Abgleich hat keine wiederherstellbare Ausgangsbasis. Kein erneuter Gesamtimport gestartet. Gespeicherten Lauf prüfen.');
  let tasks=[];
  if(old?.state==='running')tasks=old.tasks.slice(old.cursor).filter(t=>t.kind==='write');
  else {const jobs=salesList_('sales_jobs').filter(j=>!['synced','canceled'].includes(j.state));for(const step of ['company','contact'])jobs.filter(j=>j.kind==='createCompany').forEach(j=>tasks.push({kind:'write',id:j.id,step,label:'App → HQ: '+(step==='company'?'Firma bestätigen':'Ansprechpartner übertragen')}));salesCommunicationOrder_(jobs.filter(j=>j.kind!=='createCompany')).forEach(j=>tasks.push({kind:'write',id:j.id,label:'App → HQ: gespeicherte Änderung'}));}
  const run={id:old?.state==='running'?old.id:Utilities.getUuid(),engine:2,policy:3,revision:(old?.revision||0)+1,state:'running',paused:false,cursor:0,done:0,tasks,
    errors:old?.state==='running'?(old.errors||[]).filter(e=>e.kind==='write'):[],entities:{},dirtyCompanies:[],dirtyProjects:[],changedCompanyIds:[],changedProjectIds:[],companyIds:(cache.companyIds||cache.entities?.Companies?.ids||[]).slice(),loadedCompanyIds:[],startedAt:now,updatedAt:now,full,
    stats:{companies:0,contacts:0,histories:0,editions:0,writes:0,unassignedContacts:cache.stats?.unassignedContacts||0,unassignedHistories:cache.stats?.unassignedHistories||0},previousStats:cache.stats||{}};
  for(const e of SALES_BULK_ENTITIES){const prev=cache.entities?.[e];
    run.entities[e]={full,generation:full?run.id:prev.generation,previousGeneration:prev?.generation||null,since:full?null:new Date(Date.parse(prev.watermark)-120000).toISOString(),lastId:0,pages:0,seen:0,changed:0,count:full?0:prev.count,ids:[],knownIds:(prev?.ids||[]).slice(),checkOffset:prev?.checkOffset||0,deltaSupported:true};
    tasks.push({kind:'bulkRead',id:e,label:'HQ → Firebase: '+SALES_BULK_LABELS[e]+(full?' erstmals lesen':' · Änderungen lesen')});
  }
  if(!full)for(const e of SALES_BULK_ENTITIES)tasks.push({kind:'deltaProbe',id:e,label:SALES_BULK_LABELS[e]+' · begrenzte Einzelprüfung (höchstens 10)'});
  if(!full)for(const e of ['Companies','ContactPersons'])tasks.push({kind:'deltaMissing',id:e,label:SALES_BULK_LABELS[e]+' · HQ-Löschungen abgleichen'});
  if(full)run.dirtyCompanies=run.dirtyProjects=Array.from({length:64},(_,i)=>String(i));
  tasks.push({kind:'bulkPlan',label:'Geänderte Kundenakten zuordnen'});
  return run;
}
// HQ accepts whole UTC seconds. Floor the request boundary; keep durable watermarks unchanged.
function salesDeltaSince_(since){return new Date(since).toISOString().replace(/\.\d{3}Z$/,'Z');}
function salesDeltaFilter_(entity,since){
  const date="datetime'"+salesDeltaSince_(since)+"'",parts=['updatedOn ge '+date,'createdOn ge '+date];
  // Company addresses expose their own timestamp. Contact-address DTOs and estimations do not.
  if(entity==='Companies')parts.push('defaultAddress/updatedOn ge '+date,'addresses/any(a: a/updatedOn ge '+date+')');
  return '('+parts.join(' or ')+')';
}
function salesDeltaRecent_(entity,row,since){
  const values=[row.updatedOn,row.createdOn];if(entity==='Companies')values.push(row.defaultAddress?.updatedOn,...(row.addresses||[]).map(a=>a.updatedOn));
  return values.some(x=>Number.isFinite(Date.parse(x))&&Date.parse(x)>=Date.parse(salesDeltaSince_(since)));
}
/** Owner-only, bounded GET probes for an already paused filter failure. Never changes the run. */
function salesDeltaDiagnosticStatus_(summary,admin){
  if(!admin||!summary?.paused||!summary.errors?.some(e=>/Unternehmen: HQ hat den Änderungsfilter abgelehnt/.test(e.message||'')))return summary;
  const cache=CacheService.getScriptCache(),key='sales-filter-diagnostic-'+summary.id+'-'+summary.revision;
  let result;try{result=JSON.parse(cache.get(key)||'null');}catch{}
  if(!Array.isArray(result)){
    const run=salesRead_('sales_meta/sync'),task=run?.tasks?.[run.cursor],since=run?.entities?.Companies?.since;
    if(run?.id!==summary.id||!run.paused||task?.kind!=='bulkRead'||task.id!=='Companies'||!Number.isFinite(Date.parse(since)))return summary;
    result=salesDeltaFilterProbes_(since,run.entities.Companies.lastId||0);try{cache.put(key,JSON.stringify(result),1800);}catch{}
  }
  return {...summary,errors:summary.errors.concat({label:'HQ-Filterdiagnose · nur lesend',message:result.join(' · ')})};
}
function salesDeltaFilterProbes_(since,lastId){
  const date="datetime'"+new Date(since).toISOString()+"'",floor=new Date(since).toISOString().replace(/\.\d{3}Z$/,'Z');
  const probes=[['Gesamtfilter',salesDeltaFilter_('Companies',since)],['Nur Datumsfelder','(updatedOn ge '+date+' or createdOn ge '+date+')'],['Nur updatedOn','updatedOn ge '+date],['Nur createdOn','createdOn ge '+date],['Standardadresse','defaultAddress/updatedOn ge '+date],['Adressliste','addresses/any(a: a/updatedOn ge '+date+')'],['Ohne Millisekunden',salesDeltaFilter_('Companies',floor)]];
  const token=revenueToken_(),out=[],until=Date.now()+20000;
  for(const [label,filter] of probes){
    if(Date.now()>=until){out.push('Weitere Prüfungen wegen Zeitgrenze ausgelassen');break;}
    const query=(lastId?'id gt '+salesId_(lastId)+' and ':'')+filter;
    try{
      const response=UrlFetchApp.fetch('https://api.hellohq.io/v2/Companies?$top=1&$skip=0&orderby=id&$filter='+encodeURIComponent(query)+'&expand='+encodeURIComponent(SALES_BULK_EXPAND.Companies),{method:'get',headers:{Authorization:'Bearer '+token,Accept:'application/json'},muteHttpExceptions:true,followRedirects:false});
      const code=response.getResponseCode();let text='';
      if(code!==200){let body;try{body=JSON.parse(response.getContentText());}catch{}text=salesDeltaSafeDiagnostic_(body?.message||body?.Message||body?.error?.message||body?.title||'Kein auswertbarer HQ-Fehlerhinweis',token);}
      out.push(label+': HTTP '+code+(text?' – '+text:''));
      if(code!==200&&code!==400)break;
    }catch(e){out.push(label+': '+salesDeltaSafeDiagnostic_(e.message,token));break;}
  }
  return out;
}
function salesDeltaSafeDiagnostic_(value,token){
  return String(value).split(token).join('[Zugangsdaten entfernt]').replace(/https?:\/\/\S+/g,'[URL entfernt]').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[E-Mail entfernt]').replace(/[\x00-\x1F\x7F]/g,' ').slice(0,450);
}
function salesDeltaRecord_(run,entity,row,prior,entries){
  const m=run.entities[entity],path=salesBulkCollection_(entity)+'/'+row.id;
  const exists=prior&&prior.generation===m.generation,changed=!exists||JSON.stringify(prior.row)!==JSON.stringify(row);
  if(changed){salesBulkDirty_(run,entity,prior?.row);salesBulkDirty_(run,entity,row);m.changed++;m.touchedIds=m.touchedIds||[];if(!m.touchedIds.includes(String(row.id)))m.touchedIds.push(String(row.id));entries.push({path,value:{row,generation:m.generation},index:{companyBucket:salesBulkBucket_(entity==='Companies'?row.id:row.companyId),projectBucket:salesBulkBucket_(entity==='Projects'?row.id:row.projectId)}});}
  if(!exists)m.count++;
  const id=String(row.id);if(!m.knownIds.includes(id))m.knownIds.push(id);
  if(entity==='Companies'&&!run.companyIds.includes(id))run.companyIds.push(id);
}
function salesDeltaProbe_(run,task){
  // Bounded round-robin checks cover silent nested changes without scanning the whole database.
  // CRM deletions require a second exact empty list; other entity types remain read-only preserved copies.
  const m=run.entities[task.id];if(task.pendingPage){salesBulkPut_(salesRead_(task.pendingPage).entries);delete task.pendingPage;task.index++;return task.index>=task.ids.length;}
  if(!task.ids){const ids=m.knownIds||[],n=Math.min(10,ids.length);task.ids=Array.from({length:n},(_,i)=>ids[(m.checkOffset+i)%ids.length]);m.checkOffset=ids.length?(m.checkOffset+n)%ids.length:0;task.index=0;}
  if(task.index>=task.ids.length)return true;
  const id=task.ids[task.index];let raw;
  try{raw=salesHqGet_('/v2/'+task.id+'/'+salesId_(id)+(SALES_BULK_EXPAND[task.id]?'?expand='+encodeURIComponent(SALES_BULK_EXPAND[task.id]):'')).data;}
  catch(e){if(!/HTTP 404/.test(e.message))throw e;if(['Companies','ContactPersons'].includes(task.id)){salesDeltaMirrorMissing_(run,task,id);return task.index>=task.ids.length;}run.errors.push({label:'HQ-Einzelprüfung · '+SALES_BULK_LABELS[task.id],message:'Kennung '+id+' wurde nicht mehr gefunden. Gespeicherter Datensatz bleibt zur Klärung erhalten; keine automatische Löschung.'});task.index++;return task.index>=task.ids.length;}
  if(String(raw.id)!==id)throw new Error('HQ-Einzelprüfung liefert eine andere Kennung.');
  const row=salesBulkSelect_(task.id,raw),path=salesBulkCollection_(task.id)+'/'+id,prior=salesBulkGet_([path])[path],entries=[];
  salesDeltaRecord_(run,task.id,row,prior,entries);m.checked=(m.checked||0)+1;
  if(!entries.length){task.index++;return task.index>=task.ids.length;}
  task.pendingPage='sales_imports/'+run.id+'-probe-'+task.id+'-'+task.index;salesWrite_(task.pendingPage,{entries});salesWrite_('sales_meta/sync',run);
  return salesDeltaProbe_(run,task);
}
/** Compare identifiers only when the CRM cache has more rows than HQ. Never imports full entities as a fallback. */
function salesDeltaMissing_(run,task){
  if(!['Companies','ContactPersons'].includes(task.id))throw Error('HQ-Löschabgleich ist nur für Unternehmen und Ansprechpartner freigegeben.');
  const m=run.entities[task.id];
  if(task.expected===undefined){
    const total=salesV1Page_(task.id,'',0,1).total;
    if(total===null)throw Error('HQ-Gesamtzahl für den Löschabgleich nicht bestätigt.');
    if(total>=m.count)return true;
    task.expected=total;task.hqIds=[];task.lastId=0;
  }
  if(!task.ids){
    const invalid=message=>{for(const key of ['expected','hqIds','lastId','ids','index'])delete task[key];task.stage='Kennungsvergleich nach Prüffehler erneut beginnen';salesWrite_('sales_meta/sync',run);throw Error(message);};
    const rows=salesHqRows_(salesHqGet_('/v1/'+task.id+'?$select=Id&$orderby=Id&$top=200&$skip='+task.hqIds.length).data);
    if(rows.length>200)invalid('HQ-Kennungsseite überschreitet die angeforderte Größe.');
    for(const row of rows){
      if(Object.keys(row).some(k=>k!=='Id'&&!k.startsWith('@odata.')))invalid('HQ hat die reine Kennungsabfrage nicht eingehalten. Kein Gesamtabruf als Ersatz.');
      const id=salesId_(row.Id);if(id<=task.lastId)invalid('HQ-Kennungsseiten enthalten doppelte oder ungeordnete Kennungen.');
      task.lastId=id;task.hqIds.push(String(id));
    }
    if(task.hqIds.length>task.expected||task.hqIds.length>100000)invalid('HQ-Kennungsbestand hat sich während der Prüfung geändert. Bitte erneut abgleichen.');
    task.stage=task.hqIds.length+' von '+task.expected+' HQ-Kennungen geprüft';
    if(rows.length&&task.hqIds.length<task.expected)return false;
    if(task.hqIds.length!==task.expected||salesV1Page_(task.id,'',0,1).total!==task.expected)invalid('HQ-Kennungsliste ist unvollständig oder inzwischen geändert. Es wird nichts daraus gelöscht.');
    const present=new Set(task.hqIds);task.ids=(m.knownIds||[]).filter(id=>!present.has(String(id)));task.index=0;delete task.hqIds;
  }
  return salesDeltaProbe_(run,task);
}
/** A GET 404 plus an exact empty list confirms an upstream CRM deletion. One atomic checkpoint removes its app copies. */
function salesDeltaMirrorMissing_(run,task,id){
  const entity=task.id,key=String(salesId_(id));if(!['Companies','ContactPersons'].includes(entity))throw Error('HQ-Löschziel nicht freigegeben.');
  const page=salesV1Page_(entity,'id eq '+key,0,2);
  if(page.total!==0||page.rows.length||!page.done)throw Error('HQ bestätigt die Löschung nicht eindeutig. Firebase-Datensatz bleibt erhalten.');
  const rawPath=salesBulkCollection_(entity)+'/'+key,raw=salesRead_(rawPath),cache=salesRead_('sales_meta/bulk');
  if(!raw||raw.generation!==run.entities[entity].generation||raw.generation!==cache?.entities?.[entity]?.generation)throw Error('Gespeicherter HQ-Datensatz oder Generation nicht prüfbar. Keine Löschung.');
  const next=JSON.parse(JSON.stringify(run)),nextCache=JSON.parse(JSON.stringify(cache)),nextTask=next.tasks[next.cursor],now=salesNow_();
  if(nextTask.id!==entity||String(nextTask.ids?.[nextTask.index])!==key)throw Error('Löschprüfpunkt passt nicht zum laufenden Abgleich.');
  for(const target of [next,nextCache]){
    const meta=target.entities[entity];if(!Number.isSafeInteger(meta.count)||meta.count<1)throw Error('Gespeicherter Bestandszähler nicht prüfbar. Keine Löschung.');
    meta.count--;for(const list of ['ids','knownIds','touchedIds'])if(Array.isArray(meta[list]))meta[list]=meta[list].filter(x=>String(x)!==key);
    if(entity==='Companies')for(const list of ['companyIds','loadedCompanyIds'])if(Array.isArray(target[list]))target[list]=target[list].filter(x=>String(x)!==key);
  }
  const stat=entity==='Companies'?'companies':'contacts';if(Number.isSafeInteger(nextCache.stats?.[stat]))nextCache.stats[stat]=Math.max(0,nextCache.stats[stat]-1);
  // Keep removed IDs as touched so the orphan views also drop deleted contacts.
  const touched=next.entities[entity].touchedIds||(next.entities[entity].touchedIds=[]);if(!touched.includes(key))touched.push(key);
  salesBulkDirty_(next,entity,raw.row);next.entities[entity].removed=(next.entities[entity].removed||0)+1;nextTask.index++;nextTask.stage=nextTask.index+' fehlende Kennungen geprüft';next.revision++;next.updatedAt=now;
  const entries=new Map(),deleted=new Set([rawPath]),put=(path,value)=>entries.set(path,value),drop=path=>{entries.delete(path);deleted.add(path);};
  const drafts=salesList_('sales_drafts'),jobs=salesList_('sales_jobs'),companyId=entity==='Companies'?key:String(raw.row.companyId||''),related=new Set([companyId].filter(Boolean));
  if(entity==='ContactPersons')for(const job of jobs)if(String(job.contactId)===key){if(job.companyRef)related.add(String(job.companyRef));if(job.hqId)related.add(String(job.hqId));}
  const own=drafts.filter(d=>d.hqId&&related.has(String(d.hqId))||related.has('draft_'+d.id)),refs=new Set([...related,...own.map(d=>'draft_'+d.id)]),canceled=new Set();
  const aliases=new Set([key]);for(const job of jobs)if(entity==='ContactPersons'&&String(job.contactId)===key){aliases.add('local_'+job.id);aliases.add('draft_'+job.id+'_contact');}
  for(const job of jobs){
    const companyMatch=refs.has(String(job.hqId))||refs.has(String(job.companyRef))||own.some(d=>job.id===d.id||job.draftId===d.id||job.draftDependency===d.id);
    const contactMatch=String(job.contactId)===key||job.entity==='contact'&&(aliases.has(String(job.targetId))||aliases.has(String(job.targetRef)))||aliases.has(String(job.capture?.contactRef))||aliases.has(String(job.history?.contactPersonId));
    if((entity==='Companies'?!companyMatch:!contactMatch)||['synced','canceled'].includes(job.state))continue;
    put('sales_jobs/'+job.id,{...job,state:'canceled',updatedAt:now,message:'In HQ gelöscht; offener App-Auftrag wird nicht mehr übertragen.'});canceled.add(job.id);
  }
  for(const draft of own){
    const value={...draft,pendingChanges:(draft.pendingChanges||[]).filter(p=>!canceled.has(p.jobId))};
    if(entity==='Companies')value.deletedAt=now;
    else if(jobs.some(j=>j.id===draft.id&&String(j.contactId)===key))value.contactDeletedAt=now;
    if(JSON.stringify(value)!==JSON.stringify(draft))put('sales_drafts/'+draft.id,value);
  }
  if(entity==='Companies'){
    // A remaining HQ contact/history becomes unassigned; do not invent a cascading HQ deletion.
    for(const relatedEntity of ['ContactPersons','ContactHistories']){
      const ids=next.entities[relatedEntity].touchedIds||(next.entities[relatedEntity].touchedIds=[]);
      for(const row of salesBulkRows_(run,relatedEntity,'companyBucket',salesBulkBucket_(key)))if(String(row.companyId)===key&&!ids.includes(String(row.id)))ids.push(String(row.id));
    }
    for(const path of ['sales_companies/'+key,'sales_directory/'+key,...[...refs].map(ref=>'sales_communication/'+ref)])drop(path);
    for(const path of ['sales_meta/lean_names','sales_meta/lean_filters']){const old=salesRead_(path);if(old)put(path,{...old,rows:old.rows.filter(c=>!refs.has(String(c.id))&&String(c.hqId||'')!==key)});}
    const legacy=salesRead_('sales_meta/directory');if(legacy)put('sales_meta/directory',{...legacy,entries:legacy.entries.filter(e=>String(e.company?.id)!==key)});
    const owners=salesRead_('sales_meta/lean_testowners');if(owners?.rows?.[key]){delete owners.rows[key];put('sales_meta/lean_testowners',owners);}
    const tomb=salesRead_('sales_meta/deleted_companies')||{ids:[]};put('sales_meta/deleted_companies',{...tomb,ids:[...new Set([...tomb.ids,key])]});
    const request=salesRead_('sales_deletions/'+key);if(request&&request.state!=='done')put('sales_deletions/'+key,{...request,state:'done',completedAt:now,message:'Bereits in HQ gelöscht; lokale Kopie im HQ-Abgleich entfernt.',revision:(request.revision||0)+1});
  }else{
    for(const ref of refs)if(/^\d+$/.test(ref))for(const path of ['sales_companies/'+ref,'sales_directory/'+ref]){const old=salesRead_(path);if(old)put(path,{...old,contacts:(old.contacts||[]).filter(c=>String(c.id)!==key),pendingChanges:(old.pendingChanges||[]).filter(p=>!canceled.has(p.jobId))});}
    const legacy=salesRead_('sales_meta/directory');if(legacy)put('sales_meta/directory',{...legacy,entries:legacy.entries.map(e=>({...e,contacts:(e.contacts||[]).filter(c=>String(c.id)!==key)}))});
    for(const ref of refs){const old=salesRead_('sales_communication/'+ref);if(old)put('sales_communication/'+ref,{...old,contacts:(old.contacts||[]).filter(c=>!aliases.has(String(c.hqId||c.id))&&!canceled.has(c.jobId)),histories:(old.histories||[]).filter(h=>!canceled.has(h.jobId))});}
    const orphan=salesRead_('sales_meta/unassignedcontacts');if(orphan){const rows=orphan.rows.filter(c=>String(c.id)!==key);put('sales_meta/unassignedcontacts',{...orphan,rows});const summary=salesRead_('sales_meta/unassignedsummary');if(summary)put('sales_meta/unassignedsummary',{...summary,contacts:rows.length,updatedAt:now});}
  }
  next.errors=next.errors.filter(e=>!canceled.has(e.id));
  put('sales_meta/mirror_'+entity+'_'+key,{entity,id:key,runId:run.id,removedAt:now,verification:'single-404-and-filtered-empty-list',canceledJobIds:[...canceled]});
  put('sales_meta/bulk',nextCache);put('sales_meta/sync',next);put('sales_meta/lean_sync',salesSyncSummary_(next));
  if(entries.size+deleted.size>450)throw Error('Zu viele zugehörige App-Aufträge für einen atomaren Löschabgleich. Gezielte Klärung erforderlich.');
  const writes=[...[...deleted].map(path=>({delete:salesBulkName_(path)})),...[...entries].map(([path,value])=>({update:{name:salesBulkName_(path),fields:{payload:{stringValue:salesBulkPayload_(path,value)}}}}))];
  salesBulkRest_('commit',{writes});if(salesBulkStepCache_){salesBulkStepCache_.documents.clear();salesBulkStepCache_.rows.clear();}
  Object.assign(task,nextTask);next.tasks[next.cursor]=task;Object.assign(run,next);
}
/** Explicit administrative repair of one missing orphan plan. Runs only inside the resumed central sync. */
function salesDeltaResolvePlan_(run){
  if(typeof salesWorkerReserve_==='function')salesWorkerReserve_(20,10);
  const path='sales_meta/plan_cleanup_'+salesKey_(run.id),request=salesRead_(path);
  if(!request||request.approved!==true||request.runId!==run.id||request.state!=='approved')throw Error('Planumsatz-Klärung nicht freigegeben.');
  const id=String(salesId_(request.id)),rawPath=salesBulkCollection_('PlannedRevenues')+'/'+id,raw=salesRead_(rawPath),cache=salesRead_('sales_meta/bulk'),m=run.entities.PlannedRevenues,cm=cache?.entities?.PlannedRevenues;
  if(!raw||raw.generation!==request.generation||raw.generation!==m.generation||raw.generation!==cm?.generation||JSON.stringify(raw.row)!==JSON.stringify(request.before)||raw.row.projectId)throw Error('Planumsatz oder Zuordnung inzwischen geändert. Bestand bleibt erhalten.');
  let actual=null;try{actual=salesHqGet_('/v2/PlannedRevenues/'+id+'?expand=Estimations').data;}catch(e){if(!/HTTP 404/.test(e.message||''))throw e;}
  if(actual&&(String(actual.id)!==id||actual.projectId||Number(actual.companyId)!==Number(raw.row.companyId)))throw Error('HQ-Planumsatz hat eine abweichende Zuordnung. Bestand bleibt zur Prüfung erhalten.');
  if(!actual){const page=salesV1Page_('PlannedRevenues','id eq '+id,0,2,'Estimations');if(page.total!==0||page.rows.length||!page.done)throw Error('HQ-Liste bestätigt den fehlenden Planumsatz nicht eindeutig. Bestand bleibt erhalten.');}
  const nextRun=JSON.parse(JSON.stringify(run)),nextCache=JSON.parse(JSON.stringify(cache)),nextRequest={...request,state:actual?'refreshed':'removed',resolvedAt:salesNow_(),verification:actual?'single-get':'single-404-and-filtered-empty-list'};
  if(!actual){for(const meta of [nextRun.entities.PlannedRevenues,nextCache.entities.PlannedRevenues]){if(!Number.isSafeInteger(meta.count)||meta.count<1)throw Error('Planumsatz-Zähler nicht prüfbar. Bestand bleibt erhalten.');meta.count--;for(const key of ['ids','knownIds','touchedIds'])if(Array.isArray(meta[key]))meta[key]=meta[key].filter(x=>String(x)!==id);}}
  nextRun.planCleanupPending=false;nextRun.revision++;nextRun.updatedAt=salesNow_();nextRun.errors=(nextRun.errors||[]).filter(e=>!(e.label==='HQ-Einzelprüfung · Planumsätze'&&e.message==='Kennung '+id+' wurde nicht mehr gefunden. Gespeicherter Datensatz bleibt zur Klärung erhalten; keine automatische Löschung.'));
  const update=(p,value)=>({update:{name:salesBulkName_(p),fields:{payload:{stringValue:salesBulkPayload_(p,value)}}}});
  const rawWrite=actual?update(rawPath,{...raw,row:actual}):{delete:salesBulkName_(rawPath)};
  if(actual){rawWrite.update.fields.companyBucket={stringValue:salesBulkBucket_(actual.companyId)};rawWrite.update.fields.projectBucket={stringValue:'none'};}
  salesBulkRest_('commit',{writes:[rawWrite,update(path,nextRequest),update('sales_meta/bulk',nextCache),update('sales_meta/sync',nextRun),update('sales_meta/lean_sync',salesSyncSummary_(nextRun))]});
  Object.assign(run,nextRun);
}
function salesDeltaEditionTasks_(run,onlyPending){
  const byBucket={};for(const e of salesV1Editions_().filter(e=>e.syncEnabled!==false)){
    if(!onlyPending&&e.loadedAt&&!e.cacheLinkPending&&!run.full&&!(run.changedProjectIds||[]).includes(String(e.projectId)))continue;
    if(onlyPending&&e.loadedAt&&!e.cacheLinkPending)continue;
    const bucket=salesBulkBucket_(e.projectId);(byBucket[bucket]||(byBucket[bucket]=[])).push(e.id);
  }
  return Object.entries(byBucket).map(([id,editionIds])=>({kind:'deltaEditions',id,editionIds,label:'Magazinausgaben aus Firebase verknüpfen · Gruppe '+id}));
}
function salesDeltaEditions_(run,task){
  const editions=task.editionIds.map(id=>salesRead_('sales_editions/'+salesKey_(id)));
  if(editions.some(e=>!e))throw new Error('Ausgabenzuordnung fehlt.');
  const paths=editions.map(e=>salesBulkCollection_('Projects')+'/'+e.projectId),projects=salesBulkGet_(paths),docs=salesBulkRows_(run,'Documents','projectBucket',task.id);
  for(const e of editions){salesBulkEdition_(run,{id:e.id}, {edition:e,project:projects[salesBulkCollection_('Projects')+'/'+e.projectId],docs});}return true;
}
function startSalesEditionRefresh(){
  salesUser_(true);return salesLock_(()=>{
    salesAssertPrivate_();const old=salesRead_('sales_meta/sync');if(old?.state==='running')throw new Error('Zuerst den gespeicherten Abgleich fortsetzen oder abschließen.');
    const cache=salesDeltaCache_(old);if(!cache.completedAt)throw new Error('Es fehlt ein abgeschlossener Erstimport. Vorhandenen HQ-Abgleich zuerst abschließen.');
    const now=salesNow_(),run={id:Utilities.getUuid(),engine:2,policy:3,kind:'editions',revision:0,state:'running',cursor:0,done:0,tasks:[],errors:(cache.warnings||[]).slice(),entities:cache.entities,companyIds:cache.companyIds||cache.entities.Companies.ids||[],startedAt:now,updatedAt:now,full:false,stats:{...cache.stats,editions:0,writes:0},note:'Nur neue oder zur Aktualisierung markierte Ausgaben aus Firebase. Kein HQ-Abruf und keine HQ-Schreibaufträge. Der Stand entspricht dem letzten HQ-Abgleich; bestehende Bestandswarnungen bleiben offen.'};
    run.tasks=salesDeltaEditionTasks_(run,true);if(!run.tasks.length)throw new Error('Keine neuen oder geänderten Ausgabenzuordnungen vorhanden.');
    run.tasks.push({kind:'deltaEditionAudit',label:'Ausgabenzuordnungen prüfen'});salesWorkerEnsure_();salesWorkerProps_().setProperty('SALES_SYNC_PAUSE','');salesWrite_('sales_meta/sync',run);return salesBulkSummary_(run);
  });
}
function salesDeltaCoverage_(run){
  const known=new Set(run.companyIds);run.coverage=salesV1Editions_().filter(e=>e.syncEnabled!==false).map(e=>({id:e.id,label:e.magazine+' #'+e.issue,companies:(e.companyIds||[]).length,missingCompanyIds:(e.companyIds||[]).filter(id=>!known.has(id)),editionLoaded:!!e.loadedAt&&!e.cacheLinkPending,belegsComplete:e.complete===true}));
  if(run.coverage.some(e=>!e.editionLoaded||e.missingCompanyIds.length||!e.belegsComplete))run.errors.push({label:'Ausgabenprüfung',message:'Mindestens eine Ausgabe hat offene Beleg- oder Firmenzuordnungen. Siehe Ausgabenübersicht.'});
}
function salesDeltaUnassigned_(run){
  const known=new Set(run.companyIds);let changed=false;
  for(const [entity,key] of [['ContactPersons','contacts'],['ContactHistories','histories']]){
    const ids=run.entities[entity].touchedIds||[];if(!ids.length&&!(run.entities.Companies.touchedIds||[]).length)continue;
    const path='sales_meta/unassigned'+key,old=salesRead_(path)||{rows:[]},map=new Map(old.rows.map(r=>[String(r.id),r]));
    for(const [id,row] of map)if(known.has(String(row.companyId)))map.delete(id);
    const records=salesBulkGet_(ids.map(id=>salesBulkCollection_(entity)+'/'+id));
    for(const id of ids){map.delete(id);const row=records[salesBulkCollection_(entity)+'/'+id]?.row;if(row&&!known.has(String(row.companyId)))map.set(id,entity==='ContactPersons'?salesContactView_(row):salesHistory_(row,[],{}));}
    const rows=Array.from(map.values());if(JSON.stringify(rows)!==JSON.stringify(old.rows)){salesWrite_(path,{rows,loadedAt:salesNow_()});changed=true;}
    run.stats[key==='contacts'?'unassignedContacts':'unassignedHistories']=rows.length;
  }
  if(changed)salesWrite_('sales_meta/unassignedsummary',{contacts:run.stats.unassignedContacts??run.previousStats.unassignedContacts??0,histories:run.stats.unassignedHistories??run.previousStats.unassignedHistories??0,updatedAt:salesNow_()});return true;
}
function salesDeltaAudit_(run){
  const warnings=[];for(const e of SALES_BULK_ENTITIES){const total=salesV1Page_(e,'',0,1).total,m=run.entities[e],key={Companies:'hqCompanies',ContactPersons:'hqContacts',ContactHistories:'hqHistories'}[e];
    if(key)run.stats[key]=total;m.confirmedTotal=total;
    if(total===null||total!==m.count)warnings.push({label:'Bestandsprüfung · '+SALES_BULK_LABELS[e],message:'Firebase: '+m.count+' · HQ: '+(total===null?'nicht bestätigt':total)+'. Mengenabweichung bleibt zur Prüfung offen. Änderungsstand gespeichert; kein erneuter Gesamtimport.'});
  }
  salesDeltaCoverage_(run);run.errors.push(...warnings);
  const entities={};for(const e of SALES_BULK_ENTITIES){const m=run.entities[e];entities[e]={generation:m.generation,count:m.count,watermark:run.startedAt,ids:m.full?m.ids:(m.knownIds||[]),checkOffset:m.checkOffset||0};}
  // Each stream was fully read and all affected projections published. Counts are diagnostics, not reset switches.
  run.stats.companies=run.entities.Companies.count;run.stats.contacts=run.entities.ContactPersons.count;run.stats.histories=run.entities.ContactHistories.count;
  // Cache totals include unassigned rows; UI must not add them a second time.
  run.stats.totalsIncludeUnassigned=true;
  if(run.full)salesWrite_('sales_meta/unassignedsummary',{contacts:run.stats.unassignedContacts||0,histories:run.stats.unassignedHistories||0,updatedAt:salesNow_()});
  salesWrite_('sales_meta/bulk',{policy:3,entities,companyIds:run.companyIds,stats:run.stats,completedAt:salesNow_(),needsFull:false,warnings});return true;
}
