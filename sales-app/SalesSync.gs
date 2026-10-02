/** One explicit sync: saved app jobs first, full HQ reads second. Never runs on a timer. */
function salesSyncSummary_(run){
  if(!run)return null;
  if(run.engine===2)return salesBulkSummary_(run);
  const discovery=run.tasks.find(t=>t.kind==='discover')?.collections?.companies;
  return {id:run.id,revision:run.revision,state:run.state,paused:run.paused===true,done:run.done,total:run.tasks.length,current:run.tasks[run.cursor]?.label||'',stage:run.tasks[run.cursor]?.stage||'',updatedAt:run.updatedAt,stats:run.stats,errors:run.errors,coverage:run.coverage||[],discovery:{count:run.companyIds.length,total:discovery?.total??run.stats.hqCompanies??null,pages:discovery?.pages||0,complete:run.discoveryComplete===true}};
}
function startSalesSync(){
  if(typeof salesBulkStart_==='function')return salesBulkStart_();
  salesUser_(true);return salesLock_(()=>{
    salesAssertPrivate_();const old=salesRead_('sales_meta/sync');if(old?.state==='running'){
      if(old.paused){old.paused=false;old.revision++;salesWrite_('sales_meta/sync',old);}
      return salesSyncSummary_(old);
    }
    const jobs=salesList_('sales_jobs').filter(j=>!['synced','canceled'].includes(j.state)),tasks=[];
    // Separate executions for company and contact, with all companies scheduled first.
    for(const step of ['company','contact'])jobs.filter(j=>j.kind==='createCompany').forEach(j=>tasks.push({kind:'write',id:j.id,step,label:step==='company'?'App → HQ: Firma anlegen/bestätigen':'App → HQ: Ansprechpartner anlegen/bestätigen'}));
    jobs.filter(j=>j.kind!=='createCompany').forEach(j=>tasks.push({kind:'write',id:j.id,label:'App → HQ: gespeicherte Änderung'}));
    tasks.push({kind:'discover',id:'all',label:'HQ → Firebase: alle Unternehmen erfassen'});
    tasks.push({kind:'catalog',id:'lists',label:'HQ → Firebase: Auswahllisten'});
    salesV1Editions_().filter(e=>e.syncEnabled!==false).forEach(e=>tasks.push({kind:'edition',id:e.id,label:e.magazine+' #'+e.issue,skip:0,pages:0}));
    const run={id:Utilities.getUuid(),revision:0,state:'running',cursor:0,done:0,tasks,errors:[],companyIds:[],loadedCompanyIds:[],startedAt:salesNow_(),updatedAt:salesNow_(),stats:{companies:0,contacts:0,histories:0,editions:0,writes:0}};
    const legacy=salesRead_('sales_meta/import');if(legacy?.state==='running'){legacy.state='superseded';legacy.message='Vom vollständigen HQ-Sync abgelöst.';salesWrite_('sales_meta/import',legacy);}
    salesWrite_('sales_meta/sync',run);return salesSyncSummary_(run);
  });
}
function pauseSalesSync(id){
  salesUser_(true);
  if(typeof salesWorkerPause_==='function'&&salesRead_('sales_meta/sync')?.engine===2)return salesWorkerPause_(id);
  salesUser_(true);return salesLock_(()=>{
    const run=salesRead_('sales_meta/sync');if(!run||run.id!==id)throw new Error('HQ-Sync nicht gefunden.');
    if(run.state==='running'&&!run.paused){run.paused=true;run.revision++;run.pausedAt=salesNow_();salesWrite_('sales_meta/sync',run);}
    return salesSyncSummary_(run);
  });
}
function salesSyncWrite_(task){
  const job=salesRead_('sales_jobs/'+salesKey_(task.id));if(!job)throw new Error('Gespeicherter Auftrag fehlt.');
  if(job.state==='synced'||job.state==='canceled')return;
  const draft=salesRead_('sales_drafts/'+salesKey_(job.draftId));
  if(!draft?.testOnly||!/^TEST[ -]/i.test(draft.company?.name||'')||draft.id!==job.draftId)throw new Error('Kein freigegebenes eigenes Testziel. Auftrag nicht übertragen.');
  if(!['createCompany','history','companyChange','contactEmail','cleanupMarker'].includes(job.kind)||job.history?.contactHistoryChannel==='Task')throw new Error('Auftragsart nicht für den HQ-Sync freigegeben.');
  if(!['pending','ready','companyCreated','companyConfirmed','contactCreated'].includes(job.state))throw new Error('Auftrag '+job.state+': Ausgang oder Konflikt zuerst in der Auftragsübersicht klären. Kein erneuter Schreibversuch.');
  if(task.step==='company'&&job.companyConfirmedAt&&job.steps?.company)return;
  if(task.step==='contact'&&(!job.companyConfirmedAt||!job.steps?.company))throw new Error('Firma noch nicht bestätigt; Ansprechpartner bleibt in Firebase.');
  salesRunJobLocked_(job.id,task.step);
  const after=salesRead_('sales_jobs/'+job.id);
  if(task.step==='company'?(!after.companyConfirmedAt||!after.steps?.company):after.state!=='synced')throw new Error(after.message||'HQ-Rückprüfung noch offen.');
}
function salesSyncPage_(run,task,key,entity,filter,expand){
  task.collections=task.collections||{};const meta=task.collections[key]||(task.collections[key]={pages:0,skip:0});
  const page=salesV1Page_(entity,filter,meta.skip,50,expand);
  if(meta.total!==undefined&&meta.total!==page.total)throw new Error('HQ-Anzahl während des Abschnitts geändert. Beim nächsten Sync erneut prüfen.');
  if(new Set(page.rows.map(r=>String(salesId_(r.id)))).size!==page.rows.length)throw new Error('Doppelte IDs in HQ-Seite.');
  if(task.kind==='discover'){
    const known=new Set(run.companyIds);if(page.rows.some(r=>known.has(String(r.id))))throw new Error('Doppelte Firmen-ID über mehrere HQ-Seiten.');
  }
  if(filter){const m=/^(companyId|projectId) eq (\d+)$/.exec(filter);if(m&&page.rows.some(r=>Number(r[m[1]])!==Number(m[2])))throw new Error('HQ-Zuordnung stimmt nicht mit dem abgefragten Ziel überein.');}
  salesWrite_('sales_imports/'+run.id+'-'+task.kind+'-'+task.id+'-'+key+'-'+meta.pages,{rows:page.rows});
  meta.pages++;meta.skip+=page.rows.length;meta.total=page.total;
  if(page.done){if(task.kind!=='discover'){const rows=salesSyncRows_(run,task,key);if(new Set(rows.map(r=>String(r.id))).size!==rows.length)throw new Error('Doppelte IDs über mehrere HQ-Seiten.');}meta.complete=true;}
  return page;
}
function salesSyncRows_(run,task,key){
  const meta=task.collections?.[key];if(!meta)return [];
  const rows=[];for(let i=0;i<meta.pages;i++){const p=salesRead_('sales_imports/'+run.id+'-'+task.kind+'-'+task.id+'-'+key+'-'+i);if(!p?.rows)throw new Error('Gespeicherte Importseite fehlt.');rows.push(...p.rows);}return rows;
}
function salesSyncDiscover_(run,task){
  const skip=task.collections?.companies?.skip||0;
  const page=salesSyncPage_(run,task,'companies','Companies','');
  // One summary write per page. Existing individual records keep contacts and loadedAt.
  salesWrite_('sales_directory/discovery-'+skip,{companies:page.rows.map(salesCompany_)});
  run.companyIds=Array.from(new Set([...run.companyIds,...page.rows.map(r=>String(r.id))]));run.stats.hqCompanies=page.total;
  if(!page.done)return false;
  run.discoveryComplete=true;
  const queued=new Set(run.tasks.filter(t=>t.kind==='company').map(t=>t.id));
  run.companyIds.forEach(id=>{if(!queued.has(id)){queued.add(id);run.tasks.push({kind:'company',id,label:'HQ-Unternehmen · Kennung '+id});}});
  return true;
}
function salesSyncCompany_(run,task){
  const id=String(salesId_(task.id));task.stage=task.stage||'Stammdaten';
  if(task.stage==='Stammdaten'){
    salesWrite_('sales_imports/'+run.id+'-base-'+id,{company:salesCompany_(salesOne_('Companies',id))});task.stage='Ansprechpartner';return false;
  }
  const sections={Ansprechpartner:['contacts','ContactPersons','DefaultAddress'],Belege:['documents','Documents'],Projekte:['projects','Projects'],Kontakthistorie:['histories','ContactHistories']},order=Object.keys(sections);
  if(sections[task.stage]){
    const [key,entity,expand]=sections[task.stage],page=salesSyncPage_(run,task,key,entity,'companyId eq '+id,expand);
    if(page.done)task.stage=order[order.indexOf(task.stage)+1]||'Projektdetails';return false;
  }
  if(task.stage==='Projektdetails'){
    const projects=salesSyncRows_(run,task,'projects');task.projectIndex=task.projectIndex||0;
    if(task.projectIndex>=projects.length){task.stage='Historientexte';return false;}
    const p=projects[task.projectIndex],key='p'+salesId_(p.id),actualFinishDate=salesDate_(p.actualFinishDate),status=p.status||p.projectStatus?.name||'',completed=!!actualFinishDate||/^(abgeschlossen|completed|finished)$/i.test(status.trim());
    if(!task.collections[key+'docs']?.complete){salesSyncPage_(run,task,key+'docs','Documents','projectId eq '+p.id);return false;}
    if(!completed&&!task.collections[key+'plans']?.complete){salesSyncPage_(run,task,key+'plans','PlannedRevenues','projectId eq '+p.id,'Estimations');return false;}
    const b=salesBelegs_(salesSyncRows_(run,task,key+'docs'));
    salesWrite_('sales_imports/'+run.id+'-project-'+id+'-'+task.projectIndex,{row:{id:String(p.id),number:p.number||'',name:p.name||'',status,actualFinishDate,plannedFinishDate:salesDate_(p.plannedFinishDate),completed,plannedRevenues:completed?[]:salesSyncRows_(run,task,key+'plans').map(salesPlannedRevenue_),revenueCents:b.accepted.reduce((n,d)=>n+d.cents,0),complete:b.complete}});
    task.projectIndex++;return false;
  }
  if(task.stage==='Historientexte'){
    task.historyPage=task.historyPage||0;const pages=task.collections.histories.pages;
    if(task.historyPage>=pages){task.stage='Veröffentlichen';return false;}
    const raw=salesRead_('sales_imports/'+run.id+'-company-'+id+'-histories-'+task.historyPage).rows;
    const rows=salesHistoryRows_(raw,salesSyncRows_(run,task,'documents'),salesSyncRows_(run,task,'projects'),Date.now());
    salesWrite_('sales_imports/'+run.id+'-historyview-'+id+'-'+task.historyPage,{rows});task.historyPage++;return false;
  }
  const company=salesRead_('sales_imports/'+run.id+'-base-'+id).company,contacts=salesSyncRows_(run,task,'contacts').map(salesContactView_),histories=[],projects=[];
  for(let i=0;i<task.historyPage;i++)histories.push(...salesRead_('sales_imports/'+run.id+'-historyview-'+id+'-'+i).rows);
  for(let i=0;i<task.projectIndex;i++)projects.push(salesRead_('sales_imports/'+run.id+'-project-'+id+'-'+i).row);
  const value={company,contacts,histories,projects,detailVersion:3,loadedAt:salesNow_(),historyLoadedAt:salesNow_(),syncRunId:run.id};
  salesWrite_('sales_companies/'+id,value);salesV1IndexCompany_(value,false);
  if(!run.loadedCompanyIds.includes(id)){run.loadedCompanyIds.push(id);run.stats.companies++;run.stats.contacts+=contacts.length;run.stats.histories+=histories.length;}
  return true;
}
function salesSyncAudit_(run){
  for(const [entity,key] of [['ContactPersons','hqContacts'],['ContactHistories','hqHistories']])run.stats[key]=salesV1Page_(entity,'',0,1).total;
  const loaded=new Set(run.loadedCompanyIds);run.coverage=salesV1Editions_().filter(e=>e.syncEnabled!==false).map(e=>({id:e.id,label:e.magazine+' #'+e.issue,companies:(e.companyIds||[]).length,missingCompanyIds:(e.companyIds||[]).filter(id=>!loaded.has(id)),editionLoaded:run.tasks.some(t=>t.kind==='edition'&&t.id===e.id&&t.finished),belegsComplete:e.complete===true}));
  if(!run.discoveryComplete||run.stats.hqCompanies===null||run.stats.companies!==run.stats.hqCompanies||run.stats.hqContacts===null||run.stats.contacts+(run.stats.unassignedContacts||0)!==run.stats.hqContacts||run.stats.hqHistories===null||run.stats.histories+(run.stats.unassignedHistories||0)!==run.stats.hqHistories)run.errors.push({label:'Vollständigkeitsprüfung',message:'HQ-Gesamtzahlen und vollständig geladene Firmen/Kontakte/Historie stimmen noch nicht bestätigt überein. Fehlende Abschnitte oder Änderungen während des Laufs prüfen.'});
  if(run.coverage.some(e=>!e.editionLoaded||e.missingCompanyIds.length||!e.belegsComplete))run.errors.push({label:'Ausgabenprüfung',message:'Mindestens eine ausgewählte Ausgabe oder ihre Firmen sind noch nicht vollständig bestätigt. Siehe Ausgabenübersicht.'});
  const index=salesV1Index_(),catalog=salesRead_('sales_meta/catalog');if(catalog){catalog.industries=Array.from(new Set(index.entries.map(e=>e.company.industrialSector).filter(Boolean))).sort();catalog.salutations=Array.from(new Set(index.entries.flatMap(e=>(e.contacts||[]).map(c=>c.salutation)).filter(Boolean))).sort();salesWrite_('sales_meta/catalog',catalog);}
}
function salesSyncCatalog_(run,task){
  const names=['Users','CompanyTypes','Subsystems'];task.position=task.position||0;
  if(task.position<names.length){const entity=names[task.position];if(salesSyncPage_(run,task,entity,entity,'').done)task.position++;return false;}
  const old=salesRead_('sales_meta/catalog')||{},defs=salesHqGet_('/v2/Companies/CustomFieldDefinitions').data;
  salesWrite_('sales_meta/catalog',{...old,users:salesSyncRows_(run,task,'Users').filter(u=>!u.isDeactivated).map(u=>({id:u.id,name:[u.firstName,u.lastName].filter(Boolean).join(' ')})),types:salesSyncRows_(run,task,'CompanyTypes').map(t=>({id:t.id,name:t.name})),subsystems:salesSyncRows_(run,task,'Subsystems').map(t=>({id:t.id,name:t.name})),fields:(Array.isArray(defs)?defs:defs.data||[]).filter(f=>['Kundenklassifizierung','Kundenherkunft','Adressherkunft'].includes(f.name)),updatedAt:salesNow_()});return true;
}
function salesSyncUnassigned_(run,task){
  const contacts=task.id==='contacts',entity=contacts?'ContactPersons':'ContactHistories',page=salesSyncPage_(run,task,'all',entity,'',contacts?'DefaultAddress':undefined);
  const known=new Set(run.companyIds),rows=page.rows.filter(r=>!known.has(String(r.companyId))).map(r=>contacts?salesContactView_(r):salesHistory_(r,[],{}));
  salesWrite_('sales_imports/'+run.id+'-unassigned-'+task.id+'-'+(task.collections.all.pages-1),{rows});
  if(!page.done)return false;
  const all=[];for(let i=0;i<task.collections.all.pages;i++)all.push(...salesRead_('sales_imports/'+run.id+'-unassigned-'+task.id+'-'+i).rows);
  salesWrite_('sales_meta/unassigned'+task.id,{rows:all,loadedAt:salesNow_()});
  const summary=salesRead_('sales_meta/unassignedsummary')||{};summary[task.id]=all.length;summary.updatedAt=salesNow_();salesWrite_('sales_meta/unassignedsummary',summary);
  run.stats[contacts?'unassignedContacts':'unassignedHistories']=all.length;return true;
}
function getSalesUnassigned(){salesUser_();return {contacts:salesRead_('sales_meta/unassignedcontacts')?.rows||[],histories:salesRead_('sales_meta/unassignedhistories')?.rows||[]};}
function runSalesSyncStep(id,revision){
  if(typeof salesBulkStart_==='function'){salesUser_(true);return salesSyncSummary_(salesRead_('sales_meta/sync'));}
  salesUser_(true);return salesLock_(()=>{
    const run=salesRead_('sales_meta/sync');if(!run||run.id!==id)throw new Error('HQ-Sync nicht gefunden.');
    if(run.state!=='running'||run.paused||run.revision!==Number(revision))return salesSyncSummary_(run);
    salesAssertPrivate_();const task=run.tasks[run.cursor];
    try{
      let done=false;
      if(task.kind==='write'){salesSyncWrite_(task);run.stats.writes++;done=true;}
      else if(task.kind==='discover')done=salesSyncDiscover_(run,task);
      else if(task.kind==='edition'){done=salesV1EditionStep_(run,task);if(done)run.stats.editions++;}
      else if(task.kind==='company')done=salesSyncCompany_(run,task);
      else if(task.kind==='catalog')done=salesSyncCatalog_(run,task);
      else if(task.kind==='unassigned')done=salesSyncUnassigned_(run,task);
      else if(task.kind==='audit'){salesSyncAudit_(run);done=true;}
      else throw new Error('Unbekannter Sync-Abschnitt.');
      if(done){task.finished=true;run.done++;run.cursor++;}
    }catch(e){run.errors.push({kind:task.kind,id:task.id,label:task.label,stage:task.stage||'',message:e.message||'Abschnitt fehlgeschlagen'});run.cursor++;}
    if(run.cursor>=run.tasks.length&&!run.auditScheduled){run.auditScheduled=true;run.tasks.push({kind:'unassigned',id:'contacts',label:'Kontakte ohne Firmenzuordnung prüfen'},{kind:'unassigned',id:'histories',label:'Historie ohne Firmenzuordnung prüfen'},{kind:'audit',id:'coverage',label:'Vollständigkeit mit HQ vergleichen'});}
    if(run.cursor>=run.tasks.length)run.state=run.errors.length?'completedWithErrors':'completed';
    run.revision++;run.updatedAt=salesNow_();salesWrite_('sales_meta/sync',run);return salesSyncSummary_(run);
  });
}
function setSalesEditionEnabled(id,enabled){
  salesUser_(true);return salesLock_(()=>{salesAssertPrivate_();const e=salesRead_('sales_editions/'+salesKey_(id));if(!e)throw new Error('Ausgabe fehlt.');if(salesRead_('sales_meta/sync')?.state==='running')throw new Error('Auswahl erst nach Abschluss des laufenden HQ-Sync ändern.');e.syncEnabled=enabled===true;salesWrite_('sales_editions/'+id,e);return {message:'Ausgaben-Auswahl in Firebase gespeichert. Wird beim nächsten HQ-Sync berücksichtigt.'};});
}
