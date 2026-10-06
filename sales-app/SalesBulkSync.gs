/** Global HQ pages, independent change cursors, Firebase-only joins. No HQ writes here. */
const SALES_BULK_ENTITIES=['Companies','ContactPersons','Projects','Documents','PlannedRevenues','ContactHistories'];
const SALES_BULK_LABELS={Companies:'Unternehmen',ContactPersons:'Ansprechpartner',Projects:'Projekte',Documents:'Belege',PlannedRevenues:'Planumsätze',ContactHistories:'Kontakthistorie'};
const SALES_BULK_EXPAND={Companies:'Addresses,DefaultAddress,CompanyTypes,ResponsibleUsers,CustomFields',ContactPersons:'DefaultAddress',Projects:'ProjectStatus',Documents:'DocumentStatusEntity',PlannedRevenues:'Estimations'};
function salesBulkSelect_(entity,raw){
  const keys={Companies:['name','industrialSector','description','homepage','debitorNumber','companyTypes','responsibleUsers','defaultAddress','addresses','customFields'],ContactPersons:['companyId','firstName','lastName','position','phoneLandline','phoneMobile','eMail','salutation','salutationForm','defaultAddress','defaultAddressId'],Projects:['companyId','number','name','status','projectStatus','actualFinishDate','plannedFinishDate'],Documents:['companyId','projectId','number','date','currency','documentType','documentStatusEntity','netValue','createdFromId'],PlannedRevenues:['companyId','projectId','description','interval','startDate','endDate','dueMonth','dueDay','invoiceDate','currency','status','netTotal','estimations'],ContactHistories:['companyId','projectId','contactPersonId','userId','reason','content','contactOn','nextContactDate','contactHistoryChannel','contactHistoryStatus','syncId','responsibleUserIds','isReminder','recipientEmailAddress']};
  const row=salesPick_(raw,['id','updatedOn',...keys[entity]]);
  if(entity==='Companies'){
    const address=a=>a?salesPick_(a,['id','updatedOn','street','houseNumber','zipCode','city','country','description','standardForDocumentType','website']):null;
    row.defaultAddress=address(raw.defaultAddress);row.addresses=(raw.addresses||[]).map(address);row.customFields=(raw.customFields||[]).filter(f=>['Kundenklassifizierung','Kundenherkunft','Adressherkunft'].includes(f.name));
  }
  if(entity==='ContactPersons'&&raw.defaultAddress)row.defaultAddress=salesPick_(raw.defaultAddress,['id','email']);return row;
}
function salesBulkSummary_(run){
  const task=run.tasks[run.cursor],e=run.entities.Companies;
  return {id:run.id,engine:2,kind:run.kind||'sync',revision:run.revision,state:run.state,paused:!!run.paused,background:!run.paused&&run.state==='running',pauseRequested:salesWorkerProps_().getProperty('SALES_SYNC_PAUSE')===run.id,mode:run.kind==='editions'?'Ausgaben aus Firebase verknüpfen':run.full?'Einmaliger Erstimport':'Änderungsabgleich',done:run.done,total:run.tasks.length,current:task?.label||'',stage:task?.stage||'',updatedAt:run.updatedAt,heartbeat:run.heartbeat||null,stats:run.stats,errors:run.errors.concat(run.blockedMessage?[{label:'Lauf angehalten · Abschnitt wird beim Fortsetzen erneut gelesen',message:run.blockedMessage}]:[]),coverage:run.coverage||[],note:run.note||'',discovery:{count:run.companyIds.length,total:run.stats.hqCompanies??null,pages:e?.pages||0,complete:!!e?.complete},reads:SALES_BULK_ENTITIES.map(entity=>({label:SALES_BULK_LABELS[entity],count:run.entities[entity]?.seen||0,changed:run.entities[entity]?.changed||0,complete:!!run.entities[entity]?.complete,mode:run.kind==='editions'?'Vorhandener Firebase-Bestand':run.entities[entity]?.full?'Einmaliger Erstimport':'Änderungen seit letztem Abgleich'}))};
}
function salesBulkPrepare_(old){
  return salesDeltaPrepare_(old);
}
function salesBulkDirty_(run,entity,row){
  if(!row)return;const company=entity==='Companies'?row.id:row.companyId,project=entity==='Projects'?row.id:row.projectId;
  if(company&&run.changedCompanyIds&&!run.changedCompanyIds.includes(String(company)))run.changedCompanyIds.push(String(company));
  if(project&&run.changedProjectIds&&!run.changedProjectIds.includes(String(project)))run.changedProjectIds.push(String(project));
  if(company&&!run.dirtyCompanies.includes(salesBulkBucket_(company)))run.dirtyCompanies.push(salesBulkBucket_(company));
  if(['Projects','Documents','PlannedRevenues'].includes(entity)&&project&&!run.dirtyProjects.includes(salesBulkBucket_(project)))run.dirtyProjects.push(salesBulkBucket_(project));
}
function salesBulkPage_(entity,filter){
  const r=salesHqGet_('/v2/'+entity+'?$top=200&$skip=0&orderby=id'+(filter?'&$filter='+encodeURIComponent(filter):'')+(SALES_BULK_EXPAND[entity]?'&expand='+encodeURIComponent(SALES_BULK_EXPAND[entity]):''));
  const rows=Array.isArray(r.data)?r.data:r.data?.data||r.data?.value;if(!Array.isArray(rows)||rows.length>200)throw new Error('HQ-Sammelseite hat ein unbekanntes Format oder überschreitet die angeforderte Größe.');
  const key=Object.keys(r.headers).find(k=>k.toLowerCase()==='hellohq-count'),total=key?Number(r.headers[key]):null;
  if(total!==null&&(!Number.isSafeInteger(total)||total<rows.length))throw new Error('HQ-Seitenzähler widersprüchlich.');
  // Some endpoints may report a global rather than filtered count. Keep advancing IDs until exhausted.
  return {rows,done:rows.length===0||total===rows.length};
}
function salesBulkRead_(run,task){
  const entity=task.id,m=run.entities[entity],collection=salesBulkCollection_(entity);
  if(m.complete)return true;
  if(task.pendingPage)return salesBulkCommitPage_(run,task);
  const clauses=[];if(m.lastId)clauses.push('id gt '+m.lastId);if(m.since)clauses.push(salesDeltaFilter_(entity,m.since));
  let page;try{page=salesBulkPage_(entity,clauses.join(' and '));}
  catch(e){if(m.since&&/HTTP 400/.test(e.message))throw new Error(SALES_BULK_LABELS[entity]+': HQ hat den Änderungsfilter abgelehnt. Kein Gesamtimport als Ersatz. Gespeicherter Änderungsstand bleibt erhalten; technischen Filter prüfen.');throw e;}
  let last=m.lastId;for(const row of page.rows){const id=salesId_(row.id);if(id<=last)throw new Error('HQ-ID-Reihenfolge oder Fortsetzungsfilter verletzt.');last=id;if(m.since&&!salesDeltaRecent_(entity,row,m.since))throw new Error('HQ-Änderungsfilter wurde nicht eingehalten. Kein Gesamtimport gestartet.');}
  page.rows=page.rows.map(row=>salesBulkSelect_(entity,row));
  const paths=page.rows.map(r=>collection+'/'+r.id),old=salesBulkGet_(paths),entries=[];
  for(const row of page.rows){
    if(run.policy===3){salesDeltaRecord_(run,entity,row,old[collection+'/'+row.id],entries);if(m.full)m.ids.push(String(row.id));continue;}
    const path=collection+'/'+row.id,prior=old[path],changed=!prior||prior.generation!==m.previousGeneration||JSON.stringify(prior.row)!==JSON.stringify(row);
    if(changed){salesBulkDirty_(run,entity,prior?.row);salesBulkDirty_(run,entity,row);m.changed++;}
    if(entity==='Projects'&&m.full)salesBulkDirty_(run,entity,row);
    if(m.full||!prior||prior.generation!==m.generation)m.count++;if(m.full)m.ids.push(String(row.id));
    if(changed||prior.generation!==m.generation)entries.push({path,value:{row,generation:m.generation},index:{companyBucket:salesBulkBucket_(entity==='Companies'?row.id:row.companyId),projectBucket:salesBulkBucket_(entity==='Projects'?row.id:row.projectId)}});
  }
  m.lastId=last;m.pages++;m.seen+=page.rows.length;task.stage=m.seen+' Datensätze gelesen';
  // Journal the immutable page and next cursor before any raw-cache write. Lost responses replay exactly this page.
  task.pendingPage='sales_imports/'+run.id+'-bulk-'+entity+'-'+m.pages;
  salesWrite_(task.pendingPage,{entries,done:page.done});salesWrite_('sales_meta/sync',run);
  return salesBulkCommitPage_(run,task);
}
function salesBulkCommitPage_(run,task){
  const entity=task.id,m=run.entities[entity],collection=salesBulkCollection_(entity),pending=salesRead_(task.pendingPage);
  if(!pending)throw new Error('Vorbereitete Sammelseite fehlt.');salesBulkPut_(pending.entries);
  if(!pending.done){delete task.pendingPage;return false;}
  if(m.full){
    const ids=new Set(m.ids),removed=(m.previousIds||[]).filter(id=>!ids.has(id));
    const missing=salesBulkGet_(removed.map(id=>collection+'/'+id));Object.values(missing).forEach(v=>salesBulkDirty_(run,entity,v?.row));
    if(entity==='Companies'){run.companyIds=m.ids.slice();run.discoveryComplete=true;run.stats.hqCompanies=m.count;if(removed.length)run.errors.push({label:'Nicht mehr von HQ gelieferte Firmen',message:removed.length+' bisherige Firmen wurden nicht mehr geliefert. Ihre alten Kundenakten bleiben erhalten; Löschung oder Archivierung muss fachlich geprüft werden.'});}
  }
  m.complete=true;delete m.previousIds;delete task.pendingPage;return true;
}
function salesBulkProject_(run,task){
  const bucket=task.id,projects=salesBulkRows_(run,'Projects','projectBucket',bucket),docs=salesBulkRows_(run,'Documents','projectBucket',bucket),plans=salesBulkRows_(run,'PlannedRevenues','projectBucket',bucket),entries=[];
  for(const p of projects){
    if(!run.full&&run.changedProjectIds&&!run.changedProjectIds.includes(String(p.id)))continue;
    const actualFinishDate=salesDate_(p.actualFinishDate),status=p.status||p.projectStatus?.name||'',completed=!!actualFinishDate||/^(abgeschlossen|completed|finished)$/i.test(status.trim()),b=salesBelegs_(docs.filter(d=>Number(d.projectId)===Number(p.id)));
    const row={id:String(p.id),number:p.number||'',name:p.name||'',status,actualFinishDate,plannedFinishDate:salesDate_(p.plannedFinishDate),completed,plannedRevenues:completed?[]:plans.filter(r=>Number(r.projectId)===Number(p.id)).map(salesPlannedRevenue_),revenueCents:b.accepted.reduce((n,d)=>n+d.cents,0),complete:b.complete};
    entries.push({path:'sales_projectviews/'+p.id,value:{row,companyId:p.companyId,generation:run.entities.Projects.generation},index:{companyBucket:salesBulkBucket_(p.companyId),projectBucket:bucket}});salesBulkDirty_(run,'Projects',p);
  }
  // Project changes also affect invoice recipients and dispatch history outside the project-owning company.
  docs.filter(d=>run.full||!run.changedProjectIds||run.changedProjectIds.includes(String(d.projectId))).forEach(d=>salesBulkDirty_(run,'ContactHistories',d));salesWrite_('sales_meta/sync',run);salesBulkPut_(entries);return true;
}
function salesBulkCompany_(run,task){
  const bucket=task.id,companies=salesBulkRows_(run,'Companies','companyBucket',bucket),contacts=salesBulkRows_(run,'ContactPersons','companyBucket',bucket),histories=salesBulkRows_(run,'ContactHistories','companyBucket',bucket),docs=salesBulkRows_(run,'Documents','companyBucket',bucket),projects=salesBulkRows_(run,'Projects','companyBucket',bucket);
  const ids=Array.from(new Set([...docs,...histories].map(r=>r.projectId).filter(Boolean).concat(projects.map(p=>p.id)))).map(String);
  const rawProjects=salesBulkGet_(ids.map(id=>salesBulkCollection_('Projects')+'/'+id)),views=salesBulkGet_(projects.map(p=>'sales_projectviews/'+p.id)),byId={};
  Object.values(rawProjects).filter(v=>v&&v.generation===run.entities.Projects.generation).forEach(v=>{byId[v.row.id]=v.row;});
  const entries=[];for(const raw of companies){
    if(!run.full&&run.changedCompanyIds&&!run.changedCompanyIds.includes(String(raw.id)))continue;
    const id=String(raw.id),company=salesCompany_(raw),cs=contacts.filter(c=>String(c.companyId)===id).map(salesContactView_),ds=docs.filter(d=>String(d.companyId)===id),hs=histories.filter(h=>String(h.companyId)===id).map(h=>salesHistory_(h,ds,byId));
    const ps=projects.filter(p=>String(p.companyId)===id).map(p=>{const v=views['sales_projectviews/'+p.id];if(!v||v.generation!==run.entities.Projects.generation)throw new Error('Projektübersicht fehlt; Kundenakte bleibt erhalten.');return v.row;});
    const value={company,contacts:cs,histories:hs,projects:ps,detailVersion:3,loadedAt:salesNow_(),historyLoadedAt:salesNow_(),syncRunId:run.id};
    entries.push({path:'sales_companies/'+id,value},{path:'sales_directory/'+id,value:{company,contacts:cs,loadedAt:value.loadedAt,explicit:false}});
  }
  salesBulkPut_(entries);run.stats.companies+=companies.length;run.stats.contacts+=contacts.filter(c=>companies.some(p=>Number(p.id)===Number(c.companyId))).length;run.stats.histories+=histories.filter(h=>companies.some(p=>Number(p.id)===Number(h.companyId))).length;return true;
}
function salesBulkEdition_(run,task,cached){
  const e=cached?.edition||salesRead_('sales_editions/'+salesKey_(task.id)),p=cached?cached.project:salesBulkGet_([salesBulkCollection_('Projects')+'/'+e.projectId])[salesBulkCollection_('Projects')+'/'+e.projectId];
  if(!p||p.generation!==run.entities.Projects.generation||p.row.name!==e.projectName||String(p.row.number)!==String(e.projectNumber))throw new Error('HQ-Projektzuordnung der Ausgabe wurde geändert oder nicht geliefert. In der Verwaltung prüfen.');
  const docs=(cached?cached.docs:salesBulkRows_(run,'Documents','projectBucket',salesBulkBucket_(e.projectId))).filter(d=>String(d.projectId)===String(e.projectId)),excluded=new Set(e.excludedDocumentIds||[]),b=salesBelegs_(docs.filter(d=>!excluded.has(String(d.id))));
  const excludedDocuments=docs.filter(d=>excluded.has(String(d.id))).map(d=>({id:String(d.id),number:d.number||''}));excludedDocuments.forEach(d=>b.issues.push({id:d.id,reason:'Mehrere Ausgaben / Zuordnung ungeklärt: aus Summe ausgeschlossen'}));
  const companyIds=Array.from(new Set(docs.filter(d=>['Invoice','CreditNote'].includes(d.documentType)&&d.companyId).map(d=>String(d.companyId))));
  salesWrite_('sales_editions/'+e.id,{...e,cacheLinkPending:false,documents:b.accepted,excludedDocuments,ignored:b.ignored,issues:b.issues,complete:b.issues.length===0,companyIds,loadedAt:salesNow_()});run.stats.editions++;return true;
}
function salesBulkUnassigned_(run,task){
  const entity=task.id==='contacts'?'ContactPersons':'ContactHistories',known=new Set(run.companyIds),rows=[];
  // Scan each cache partition once, not HQ again. Includes references to absent companies.
  task.bucket=task.bucket||0;const bucket=task.bucket===64?'none':String(task.bucket),raw=salesBulkRows_(run,entity,'companyBucket',bucket);
  raw.filter(r=>!known.has(String(r.companyId))).forEach(r=>rows.push(entity==='ContactPersons'?salesContactView_(r):salesHistory_(r,[],{})));
  task.parts=task.parts||[];if(rows.length){const path='sales_imports/'+run.id+'-orphan-'+task.id+'-'+task.bucket;salesWrite_(path,{rows});if(!task.parts.includes(path))task.parts.push(path);}task.bucket++;if(task.bucket<=64)return false;
  const all=[];for(const path of task.parts)all.push(...salesRead_(path).rows);
  salesWrite_('sales_meta/unassigned'+task.id,{rows:all,loadedAt:salesNow_()});run.stats[task.id==='contacts'?'unassignedContacts':'unassignedHistories']=all.length;return true;
}
function salesBulkAudit_(run){
  return salesDeltaAudit_(run);

}
function salesBulkStep_(run){
  const task=run.tasks[run.cursor];let done=false,writeBoundary=false;
  if(task.kind==='write'){const job=salesRead_('sales_jobs/'+salesKey_(task.id));writeBoundary=!!job&&['pending','ready','companyCreated','companyConfirmed','contactCreated'].includes(job.state)&&!(task.step==='company'&&job.companyConfirmedAt&&job.steps?.company);try{salesSyncWrite_(task);run.stats.writes++;}catch(e){run.errors.push({kind:'write',id:task.id,label:task.label,message:e.message});}done=true;}
  else if(task.kind==='deltaProbe')done=salesDeltaProbe_(run,task);
  else if(task.kind==='deltaEditions')done=salesDeltaEditions_(run,task);
  else if(task.kind==='deltaEditionAudit'){salesDeltaCoverage_(run);done=true;}
  else if(task.kind==='bulkRead')done=salesBulkRead_(run,task);
  else if(task.kind==='bulkPlan'){run.tasks.push(...run.dirtyProjects.map(id=>({kind:'bulkProject',id,label:'Projektübersichten aus Firebase bilden · Gruppe '+id})),{kind:'bulkCompanyPlan',label:'Kundenübersichten vorbereiten'});done=true;}
  else if(task.kind==='bulkProject')done=salesBulkProject_(run,task);
  else if(task.kind==='bulkCompanyPlan'){
    run.tasks.push(...run.dirtyCompanies.map(id=>({kind:'bulkCompany',id,label:'Kundenakten aus Firebase bilden · Gruppe '+id})),...salesDeltaEditionTasks_(run,false));
    if(run.full)run.tasks.push({kind:'catalog',id:'lists',label:'Auswahllisten aktualisieren'},{kind:'bulkUnassigned',id:'contacts',label:'Kontakte ohne bekannte Firma sichern'},{kind:'bulkUnassigned',id:'histories',label:'Historie ohne bekannte Firma sichern'});
    else run.tasks.push({kind:'deltaUnassigned',label:'Geänderte Daten ohne Firmenzuordnung prüfen'});
    run.tasks.push({kind:'bulkAudit',label:'Gesamtzahlen und Ausgaben prüfen'});done=true;
  }
  else if(task.kind==='bulkCompany')done=salesBulkCompany_(run,task);
  else if(task.kind==='bulkEdition')done=salesBulkEdition_(run,task);
  else if(task.kind==='deltaUnassigned')done=salesDeltaUnassigned_(run);
  else if(task.kind==='bulkUnassigned')done=salesBulkUnassigned_(run,task);
  else if(task.kind==='catalog')done=salesSyncCatalog_(run,task);
  else if(task.kind==='bulkAudit')done=salesBulkAudit_(run);
  else throw new Error('Unbekannter Sammelabschnitt.');
  if(done){task.finished=true;run.done++;run.cursor++;}run.revision++;run.updatedAt=salesNow_();
  if(run.cursor>=run.tasks.length)run.state=run.errors.length?'completedWithErrors':'completed';run.inFlight=null;salesWrite_('sales_meta/sync',run);return writeBoundary;
}
