/** Explicitly authorized V1 read workflows. No HQ POST/PUT is called here. */
function salesV1Index_(){const entries=new Map((salesRead_('sales_meta/directory')?.entries||[]).map(e=>[String(e.company.id),e]));salesList_('sales_directory').forEach(e=>entries.set(String(e.company.id),e));return {entries:Array.from(entries.values())};}
function salesV1Editions_(){return salesList_('sales_editions');}
function salesV1Known_(id){
  id=String(salesId_(id));
  return salesV1Index_().entries.some(e=>e.company.id===id)||salesV1Editions_().some(e=>(e.companyIds||[]).includes(id)||(e.companies||[]).some(c=>c.id===id));
}
function getSalesV1State(){
  salesUser_();const state=getSalesState(),editions=salesV1Editions_(),index=salesV1Index_(),companies={};
  editions.forEach(e=>{(e.companies||[]).forEach(c=>{companies[c.id]=c;});(e.companyIds||[]).forEach(id=>{if(!companies[id])companies[id]={id,name:'HQ-Unternehmen '+id+' · Details fehlen',companyTypes:[],responsibleUsers:[],customFields:[],addresses:[]};});});index.entries.forEach(e=>{companies[e.company.id]=e.company;});
  return {...state,editions,companies:Object.values(companies),directory:index.entries,preferences:salesRead_('sales_meta/preferences')||{},importRun:salesRead_('sales_meta/import'),syncRun:salesSyncSummary_(salesRead_('sales_meta/sync')),unassignedSummary:salesRead_('sales_meta/unassignedsummary')};
}
function getSalesV1Company(id){
  salesUser_();if(String(id).startsWith('draft_')||salesList_('sales_drafts').some(d=>d.testOnly&&String(d.hqId)===String(id)))return getSalesCompany(id);
  id=String(salesId_(id));if(!salesV1Known_(id))throw new Error('Firma ist noch nicht ausdrücklich in den App-Bestand aufgenommen.');
  const stored=salesRead_('sales_companies/'+id);return stored?{...stored,histories:salesVisibleHistories_(id,stored.histories)}:null;
}
function salesV1IndexCompany_(value,explicit){
  const id=value.company.id,old=salesRead_('sales_directory/'+id)||(salesRead_('sales_meta/directory')?.entries||[]).find(e=>e.company.id===id);
  const entry={company:value.company,contacts:value.contacts||old?.contacts||[],loadedAt:value.loadedAt||old?.loadedAt||null,explicit:explicit||old?.explicit||false};
  salesWrite_('sales_directory/'+id,entry);
}
function salesV1Page_(entity,filter,skip,top,expand){
  const r=salesHqGet_('/v2/'+entity+'?$top='+top+'&$skip='+skip+'&orderby=id'+(filter?'&$filter='+encodeURIComponent(filter):'')+(expand?'&expand='+encodeURIComponent(expand):''));
  const rows=Array.isArray(r.data)?r.data:r.data?.data||r.data?.value;if(!Array.isArray(rows))throw new Error('HQ-Listenformat unbekannt.');
  const key=Object.keys(r.headers).find(k=>k.toLowerCase()==='hellohq-count'),total=key?Number(r.headers[key]):null;
  if(total!==null&&(!Number.isSafeInteger(total)||total<skip+rows.length))throw new Error('HQ-Seitenzähler widersprüchlich.');
  if(total!==null&&total>skip&&!rows.length)throw new Error('HQ-Seite fehlt.');
  return {rows,total,done:total!==null?skip+rows.length===total:rows.length<top};
}
function salesV1Search_(entity,input,skip){
  const term=salesText_(input,100,true);if(term.length<3)throw new Error('Bitte mindestens drei Zeichen eingeben.');
  skip=skip===undefined?0:Number(skip);if(!Number.isSafeInteger(skip)||skip<0||skip>10000)throw new Error('Ungültige Suchseite. Bitte Suche eingrenzen.');
  // HQ v2 documents substringof(value, field), not OData contains(field, value).
  const literal=term.replace(/'/g,"''"),filter="substringof('"+literal+"',name)"+(entity==='Projects'?" or number eq '"+literal+"'":'');
  const page=salesV1Page_(entity,filter,skip,200),query=term.toLocaleLowerCase('de');
  const rows=page.rows.filter(x=>String(x.name||'').toLocaleLowerCase('de').includes(query)||entity==='Projects'&&String(x.number)===term);
  return {rows:rows.map(x=>salesPick_(x,['id','name','number'])),limited:!page.done,nextSkip:page.done?null:skip+page.rows.length,total:page.total};
}
function searchSalesProjects(term,skip){salesUser_(true);return salesV1Search_('Projects',term,skip);}
function searchSalesCompanies(term){salesUser_(true);return salesV1Search_('Companies',term);}
function addSalesCompany(id){
  salesUser_(true);return salesLock_(()=>{salesAssertPrivate_();const company=salesCompany_(salesOne_('Companies',salesId_(id)));salesV1IndexCompany_({company},true);return {message:'Unternehmen für den nächsten Datenimport aufgenommen. In HQ wurde nichts verändert.'};});
}
function saveSalesEditionConfig(input){
  salesUser_(true);return salesLock_(()=>{
    if(salesRead_('sales_meta/sync')?.state==='running')throw new Error('Auswahl erst nach Abschluss des laufenden HQ-Sync ändern.');
    salesAssertPrivate_();const enteredMagazine=salesText_(input.magazine,80,true),issue=Number(input.issue),projectId=String(salesId_(input.projectId));
    if(!Number.isSafeInteger(issue)||issue<1||issue>100000)throw new Error('Bitte eine gültige Ausgabennummer eingeben.');
    const project=salesOne_('Projects',projectId),editions=salesV1Editions_(),key=enteredMagazine.toLocaleLowerCase('de');
    const magazine=editions.find(e=>e.magazine.toLocaleLowerCase('de')===key)?.magazine||enteredMagazine,old=editions.find(e=>String(e.projectId)===projectId);
    if(editions.some(e=>e.id!==old?.id&&e.magazine.toLocaleLowerCase('de')===key&&Number(e.issue)===issue))throw new Error('Diese Ausgabe ist bereits einem anderen Projekt zugeordnet.');
    if(old&&(old.magazine.toLocaleLowerCase('de')!==key||Number(old.issue)!==issue))throw new Error('Dieses HQ-Projekt ist bereits einer anderen Ausgabe zugeordnet.');
    const id=old?.id||'project-'+projectId;
    const value={...(old||{}),id,magazine,issue,projectId,projectNumber:String(project.number||''),projectName:project.name,companyIds:old?.companyIds||[],companies:old?.companies||[],documents:old?.documents||[],complete:old?.complete||false,settings:old?.settings||{targetCents:null,adDeadline:'',printDate:'',releaseDate:'',revision:0},changes:old?.changes||[],excludedDocumentIds:old?.excludedDocumentIds||[]};
    value.syncEnabled=true;salesWrite_('sales_editions/'+id,value);
    if(input.current===true||input.current==='on')salesWrite_('sales_meta/preferences',{currentEditionId:id});
    return {id,message:'Magazin und Ausgabe dem ausgewählten HQ-Projekt zugeordnet. Der Datenimport kann jetzt gestartet werden.'};
  });
}
function saveSalesV1EditionSettings(input){
  const user=salesUser_();return salesLock_(()=>{
    const id=salesKey_(input.editionId),e=salesRead_('sales_editions/'+id);if(!e)throw new Error('Ausgabe fehlt.');
    if(Number(input.revision)!==e.settings.revision)throw new Error('Ausgabe inzwischen geändert. Bitte neu laden.');
    const target=Number(input.target);if(!Number.isFinite(target)||target<0||target>100000000)throw new Error('Zielumsatz ungültig.');
    const settings={targetCents:Math.round(target*100),revision:e.settings.revision+1};
    for(const k of ['adDeadline','printDate','releaseDate']){settings[k]=salesText_(input[k],10,false);if(settings[k]&&salesDate_(settings[k])!==settings[k])throw new Error('Ungültiges Datum.');}
    if(settings.adDeadline&&settings.printDate&&settings.adDeadline>settings.printDate||settings.printDate&&settings.releaseDate&&settings.printDate>settings.releaseDate)throw new Error('Termine müssen in zeitlicher Reihenfolge liegen.');
    e.changes=[{at:salesNow_(),actor:user.email,before:e.settings,after:settings},...(e.changes||[])].slice(0,50);e.settings=settings;salesWrite_('sales_editions/'+id,e);return {message:'Ziel und Termine dieser Ausgabe für alle Nutzer gespeichert.'};
  });
}
function salesV1Scope_(id){
  id=String(salesId_(id));if(!salesV1Known_(id)&&!salesList_('sales_drafts').some(d=>d.testOnly&&String(d.hqId)===id))throw new Error('Firma gehört nicht zum bestätigten App-Bestand.');return id;
}
function salesV1LoadCompany_(id){
  id=salesV1Scope_(id);const started=Date.now(),company=salesCompany_(salesOne_('Companies',id));
  const contacts=salesCollect_('ContactPersons','companyId eq '+id,started,'DefaultAddress'),histories=salesCollect_('ContactHistories','companyId eq '+id,started),projects=salesCollect_('Projects','companyId eq '+id,started),documents=salesCollect_('Documents','companyId eq '+id,started);
  if([...contacts,...histories,...projects,...documents].some(x=>Number(x.companyId)!==Number(id)))throw new Error('HQ-Firmenfilter wurde nicht eingehalten.');
  const projectRows=projects.map(p=>{
    const ds=salesCollect_('Documents','projectId eq '+salesId_(p.id),started);if(ds.some(d=>Number(d.projectId)!==Number(p.id)))throw new Error('HQ-Projektfilter wurde nicht eingehalten.');
    const b=salesBelegs_(ds),actualFinishDate=salesDate_(p.actualFinishDate),status=p.status||p.projectStatus?.name||'',completed=!!actualFinishDate||/^(abgeschlossen|completed|finished)$/i.test(status.trim());
    const plans=completed?[]:salesCollect_('PlannedRevenues','projectId eq '+salesId_(p.id),started,'Estimations');if(plans.some(r=>Number(r.projectId)!==Number(p.id)))throw new Error('HQ-Planumsatz gehört zu anderem Projekt.');
    return {id:String(p.id),number:p.number||'',name:p.name||'',status,actualFinishDate,plannedFinishDate:salesDate_(p.plannedFinishDate),completed,plannedRevenues:plans.map(salesPlannedRevenue_),revenueCents:b.accepted.reduce((n,d)=>n+d.cents,0),complete:b.complete};
  });
  const value={company,contacts:contacts.map(salesContactView_),histories:salesHistoryRows_(histories,documents,projects,started),historyLoadedAt:salesNow_(),projects:projectRows,detailVersion:3,loadedAt:salesNow_()};
  salesWrite_('sales_companies/'+id,value);salesV1IndexCompany_(value,false);return {message:'Kundendetails einschließlich aller Kontakte, Historie und Projekte aktualisiert.'};
}
function syncSalesV1Company(id){salesUser_(true);return salesLock_(()=>{salesAssertPrivate_();return salesV1LoadCompany_(id);});}
function syncSalesV1History(id){
  salesUser_(true);return salesLock_(()=>{
    const visible=getSalesV1Company(id);if(!visible)throw new Error('Zuerst Kundendetails importieren.');
    const companyId=salesV1Scope_(visible.company.hqId||visible.company.id);salesAssertPrivate_();const started=Date.now();
    const histories=salesCollect_('ContactHistories','companyId eq '+companyId,started),documents=salesCollect_('Documents','companyId eq '+companyId,started);
    if([...histories,...documents].some(h=>Number(h.companyId)!==Number(companyId)))throw new Error('HQ-Firmenfilter wurde nicht eingehalten.');
    const stored=salesRead_('sales_companies/'+companyId)||{company:visible.company,contacts:visible.contacts,projects:[],detailVersion:3};
    stored.histories=salesHistoryRows_(histories,documents,[],started);stored.historyLoadedAt=salesNow_();salesWrite_('sales_companies/'+companyId,stored);
    return {message:stored.histories.length+' HQ-Historieneinträge vollständig nach Firebase übertragen.'};
  });
}
function startSalesImport(editionIds){
  salesUser_(true);return salesLock_(()=>{
    if(salesRead_('sales_meta/sync')?.state==='running')throw new Error('Der gemeinsame HQ-Sync läuft bereits. Bitte unter Datenabgleich fortsetzen.');
    salesAssertPrivate_();const scoped=editionIds!==undefined;
    if(scoped&&(!Array.isArray(editionIds)||!editionIds.length||editionIds.length>200||new Set(editionIds).size!==editionIds.length))throw new Error('Bitte 1 bis 200 unterschiedliche Ausgaben auswählen.');
    const all=salesV1Editions_();if(scoped&&editionIds.some(id=>!all.some(e=>e.id===id)))throw new Error('Auswahl enthält eine nicht zugeordnete Ausgabe.');
    const old=salesRead_('sales_meta/import');if(old?.state==='running'){if(scoped)throw new Error('Zuerst den laufenden Import unter Datenabgleich fortsetzen und abschließen. Die neue Auswahl ist noch nicht gestartet.');return old;}
    const editions=scoped?all.filter(e=>editionIds.includes(e.id)):all,companyIds=scoped?[]:salesV1Index_().entries.map(e=>e.company.id);
    if(!editions.length&&!companyIds.length)throw new Error('Zuerst eine Ausgabe zuordnen oder ein Unternehmen aufnehmen.');
    const run={id:Utilities.getUuid(),revision:0,state:'running',startedAt:salesNow_(),updatedAt:salesNow_(),cursor:0,tasks:[...editions.map(e=>({kind:'edition',id:e.id,label:e.magazine+' #'+e.issue,skip:0,pages:0})),...companyIds.map(id=>({kind:'company',id,label:'HQ-Unternehmen '+id}))],errors:[],done:0};
    salesWrite_('sales_meta/import',run);return run;
  });
}
function salesV1EditionStep_(run,task){
  const e=salesRead_('sales_editions/'+salesKey_(task.id));if(!e?.projectId)throw new Error('Ausgabe hat keine bestätigte HQ-Projektzuordnung.');
  const project=salesOne_('Projects',e.projectId);if(project.name!==e.projectName||String(project.number)!==String(e.projectNumber))throw new Error('HQ-Projekt wurde geändert. Zuordnung in der Verwaltung erneut bestätigen.');
  if(task.pages>=50)throw new Error('Ausgabe überschreitet 10.000 Belege; Importumfang prüfen.');
  const page=salesV1Page_('Documents','projectId eq '+salesId_(e.projectId),task.skip,200);
  if(page.rows.some(d=>Number(d.projectId)!==Number(e.projectId)))throw new Error('HQ-Projektfilter wurde nicht eingehalten.');
  if(task.total!==undefined&&task.total!==page.total)throw new Error('HQ-Beleganzahl während des Imports geändert. Ausgabe erneut importieren.');
  const key=run.id+'-'+task.id+'-'+task.pages;salesWrite_('sales_imports/'+key,{rows:page.rows});task.total=page.total;task.pages++;task.skip+=page.rows.length;
  if(!page.done)return false;
  const docs=[];for(let p=0;p<task.pages;p++)docs.push(...salesRead_('sales_imports/'+run.id+'-'+task.id+'-'+p).rows);
  if(new Set(docs.map(d=>String(d.id))).size!==docs.length)throw new Error('Doppelte Belege über mehrere HQ-Seiten.');
  const excluded=new Set(e.excludedDocumentIds||[]),result=salesBelegs_(docs.filter(d=>!excluded.has(String(d.id))));
  excluded.forEach(id=>{if(docs.some(d=>String(d.id)===id))result.issues.push({id,reason:'Mehrere Ausgaben / Zuordnung ungeklärt: aus Summe ausgeschlossen'});});
  const companyIds=Array.from(new Set(docs.filter(d=>['Invoice','CreditNote'].includes(d.documentType)&&d.companyId).map(d=>String(salesId_(d.companyId)))));
  salesWrite_('sales_editions/'+e.id,{...e,documents:result.accepted,excludedDocuments:docs.filter(d=>excluded.has(String(d.id))).map(d=>({id:String(d.id),number:d.number||''})),ignored:result.ignored,issues:result.issues,complete:result.issues.length===0,companyIds,loadedAt:salesNow_()});
  companyIds.forEach(id=>{if(!run.tasks.some(t=>t.kind==='company'&&t.id===id))run.tasks.push({kind:'company',id,label:'HQ-Unternehmen '+id});});return true;
}
function runSalesImportStep(id,revision){
  salesUser_(true);return salesLock_(()=>{
    if(salesRead_('sales_meta/sync')?.state==='running')throw new Error('Der gemeinsame HQ-Sync läuft bereits. Bitte unter Datenabgleich fortsetzen.');
    const run=salesRead_('sales_meta/import');if(!run||run.id!==id)throw new Error('Importlauf nicht gefunden.');
    if(run.state!=='running'||Number(revision)!==run.revision)return run;
    salesAssertPrivate_();const task=run.tasks[run.cursor];
    try{const done=task.kind==='edition'?salesV1EditionStep_(run,task):(salesV1LoadCompany_(task.id),true);if(done){run.done++;run.cursor++;}}
    catch(e){run.errors.push({kind:task.kind,id:task.id,label:task.label,message:e.message||'Import fehlgeschlagen'});run.cursor++;}
    run.revision++;run.updatedAt=salesNow_();
    if(run.cursor>=run.tasks.length){run.state=run.errors.length?'completedWithErrors':'completed';run.finishedAt=salesNow_();}
    salesWrite_('sales_meta/import',run);return run;
  });
}
function retrySalesImport(){
  salesUser_(true);return salesLock_(()=>{
    if(salesRead_('sales_meta/sync')?.state==='running')throw new Error('Der gemeinsame HQ-Sync läuft bereits. Bitte unter Datenabgleich fortsetzen.');
    const old=salesRead_('sales_meta/import');if(!old?.errors?.length||old.state==='running')throw new Error('Keine abgeschlossenen Fehlerabschnitte vorhanden.');
    const run={id:Utilities.getUuid(),revision:0,state:'running',startedAt:salesNow_(),updatedAt:salesNow_(),cursor:0,tasks:old.errors.map(e=>({kind:e.kind,id:e.id,label:e.label,skip:0,pages:0})),errors:[],done:0};salesWrite_('sales_meta/import',run);return run;
  });
}
function setSalesDocumentExcluded(input){
  salesUser_(true);return salesLock_(()=>{
    const id=salesKey_(input.editionId),e=salesRead_('sales_editions/'+id),documentId=String(salesId_(input.documentId));
    if(!e||![...(e.documents||[]),...(e.excludedDocuments||[])].some(d=>String(d.id)===documentId))throw new Error('Beleg gehört nicht zu dieser Ausgabe.');
    const ids=new Set(e.excludedDocumentIds||[]);if(input.excluded===true){ids.add(documentId);const doc=e.documents.find(d=>d.id===documentId);e.excludedDocuments=[...(e.excludedDocuments||[]).filter(d=>d.id!==documentId),{id:documentId,number:doc?.number||''}];e.documents=e.documents.filter(d=>d.id!==documentId);}else ids.delete(documentId);
    e.excludedDocumentIds=Array.from(ids);e.complete=false;e.issues=[...(e.issues||[]),{id:documentId,reason:'Belegzuordnung geändert: Ausgabe neu importieren.'}];salesWrite_('sales_editions/'+id,e);return {message:'Zuordnung in Firebase markiert. Für eine neue vollständige Bewertung den Import starten. HQ bleibt unverändert.'};
  });
}
