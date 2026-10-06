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
  else {const jobs=salesList_('sales_jobs').filter(j=>!['synced','canceled'].includes(j.state));for(const step of ['company','contact'])jobs.filter(j=>j.kind==='createCompany').forEach(j=>tasks.push({kind:'write',id:j.id,step,label:'App → HQ: '+(step==='company'?'Firma bestätigen':'Ansprechpartner übertragen')}));jobs.filter(j=>j.kind!=='createCompany').forEach(j=>tasks.push({kind:'write',id:j.id,label:'App → HQ: gespeicherte Änderung'}));}
  const run={id:old?.state==='running'?old.id:Utilities.getUuid(),engine:2,policy:3,revision:(old?.revision||0)+1,state:'running',paused:false,cursor:0,done:0,tasks,
    errors:old?.state==='running'?(old.errors||[]).filter(e=>e.kind==='write'):[],entities:{},dirtyCompanies:[],dirtyProjects:[],changedCompanyIds:[],changedProjectIds:[],companyIds:(cache.companyIds||cache.entities?.Companies?.ids||[]).slice(),loadedCompanyIds:[],startedAt:now,updatedAt:now,full,
    stats:{companies:0,contacts:0,histories:0,editions:0,writes:0,unassignedContacts:cache.stats?.unassignedContacts||0,unassignedHistories:cache.stats?.unassignedHistories||0},previousStats:cache.stats||{}};
  for(const e of SALES_BULK_ENTITIES){const prev=cache.entities?.[e];
    run.entities[e]={full,generation:full?run.id:prev.generation,previousGeneration:prev?.generation||null,since:full?null:new Date(Date.parse(prev.watermark)-120000).toISOString(),lastId:0,pages:0,seen:0,changed:0,count:full?0:prev.count,ids:[],knownIds:(prev?.ids||[]).slice(),checkOffset:prev?.checkOffset||0,deltaSupported:true};
    tasks.push({kind:'bulkRead',id:e,label:'HQ → Firebase: '+SALES_BULK_LABELS[e]+(full?' erstmals lesen':' · Änderungen lesen')});
  }
  if(!full)for(const e of SALES_BULK_ENTITIES)tasks.push({kind:'deltaProbe',id:e,label:SALES_BULK_LABELS[e]+' · begrenzte Einzelprüfung (höchstens 10)'});
  if(full)run.dirtyCompanies=run.dirtyProjects=Array.from({length:64},(_,i)=>String(i));
  tasks.push({kind:'bulkPlan',label:'Geänderte Kundenakten zuordnen'});
  return run;
}
function salesDeltaFilter_(entity,since){
  const date="datetime'"+since+"'",parts=['updatedOn ge '+date,'createdOn ge '+date];
  // Company addresses expose their own timestamp. Contact-address DTOs and estimations do not.
  if(entity==='Companies')parts.push('defaultAddress/updatedOn ge '+date,'addresses/any(a: a/updatedOn ge '+date+')');
  return '('+parts.join(' or ')+')';
}
function salesDeltaRecent_(entity,row,since){
  const values=[row.updatedOn,row.createdOn];if(entity==='Companies')values.push(row.defaultAddress?.updatedOn,...(row.addresses||[]).map(a=>a.updatedOn));
  return values.some(x=>Number.isFinite(Date.parse(x))&&Date.parse(x)>=Date.parse(since));
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
  // A 404 is reported, never treated as permission to delete CRM data.
  const m=run.entities[task.id];if(task.pendingPage){salesBulkPut_(salesRead_(task.pendingPage).entries);delete task.pendingPage;task.index++;return task.index>=task.ids.length;}
  if(!task.ids){const ids=m.knownIds||[],n=Math.min(10,ids.length);task.ids=Array.from({length:n},(_,i)=>ids[(m.checkOffset+i)%ids.length]);m.checkOffset=ids.length?(m.checkOffset+n)%ids.length:0;task.index=0;}
  if(task.index>=task.ids.length)return true;
  const id=task.ids[task.index];let raw;
  try{raw=salesHqGet_('/v2/'+task.id+'/'+salesId_(id)+(SALES_BULK_EXPAND[task.id]?'?expand='+encodeURIComponent(SALES_BULK_EXPAND[task.id]):'')).data;}
  catch(e){if(!/HTTP 404/.test(e.message))throw e;run.errors.push({label:'HQ-Einzelprüfung · '+SALES_BULK_LABELS[task.id],message:'Kennung '+id+' wurde nicht mehr gefunden. Gespeicherter Datensatz bleibt zur Klärung erhalten; keine automatische Löschung.'});task.index++;return task.index>=task.ids.length;}
  if(String(raw.id)!==id)throw new Error('HQ-Einzelprüfung liefert eine andere Kennung.');
  const row=salesBulkSelect_(task.id,raw),path=salesBulkCollection_(task.id)+'/'+id,prior=salesBulkGet_([path])[path],entries=[];
  salesDeltaRecord_(run,task.id,row,prior,entries);m.checked=(m.checked||0)+1;
  if(!entries.length){task.index++;return task.index>=task.ids.length;}
  task.pendingPage='sales_imports/'+run.id+'-probe-'+task.id+'-'+task.index;salesWrite_(task.pendingPage,{entries});salesWrite_('sales_meta/sync',run);
  return salesDeltaProbe_(run,task);
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
