/** Click-driven read endpoints and shared compact projections. */
function salesLeanFilterRow_(c){
  const address=c.defaultAddress||(c.addresses||[]).find(a=>a.standardForDocumentType==='Invoice');
  return {id:String(c.id),name:c.name,industrialSector:c.industrialSector||'',defaultAddress:address?{city:address.city||''}:null,
    companyTypes:(c.companyTypes||[]).map(t=>salesPick_(t,['name','number'])),responsibleUsers:(c.responsibleUsers||[]).map(u=>salesPick_(u,['id','userId','firstName','lastName']))};
}
function salesLeanBookingRow_(e){
  const companyRevenue={};for(const d of e.documents||[])companyRevenue[String(d.companyId)]=(companyRevenue[String(d.companyId)]||0)+d.cents;
  return {...salesLeanEdition_(e),companyRevenue};
}
function salesLeanProjection_(path,build){
  const old=salesRead_(path);if(old)return old.rows;
  return salesLock_(()=>{const again=salesRead_(path);if(again)return again.rows;const rows=build();salesWrite_(path,{rows});return rows;});
}
function salesLeanFilters_(){return salesLeanProjection_('sales_meta/lean_filters',()=>salesV1Index_().entries.map(e=>salesLeanFilterRow_(e.company)));}
function salesLeanBookings_(){return salesLeanProjection_('sales_meta/lean_bookings',()=>salesV1Editions_().map(salesLeanBookingRow_));}
function salesLeanSyncStatus_(){
  const cached=salesRead_('sales_meta/lean_sync');if(cached)return {...cached,pauseRequested:PropertiesService.getScriptProperties().getProperty('SALES_SYNC_PAUSE')===cached.id};
  return salesLock_(()=>{const again=salesRead_('sales_meta/lean_sync');if(again)return again;const run=salesRead_('sales_meta/sync'),summary=salesSyncSummary_(run);if(run)salesWrite_('sales_meta/lean_sync',summary);return summary;});
}
function salesLeanFiltersUpdate_(entries){
  const changes=entries.filter(e=>/^sales_(directory|companies)\/\d+$/.test(e.path)&&e.value.company).map(e=>salesLeanFilterRow_(e.value.company));
  if(!changes.length)return;const path='sales_meta/lean_filters',old=salesRead_(path);if(!old)return;
  const map=new Map(old.rows.map(c=>[c.id,c]));let changed=false;
  for(const c of changes)if(JSON.stringify(map.get(c.id))!==JSON.stringify(c)){map.set(c.id,c);changed=true;}
  if(changed)salesWrite_(path,{rows:Array.from(map.values())});
}
function salesLeanEdition_(e){
  return {id:e.id,magazine:e.magazine,issue:e.issue,projectId:e.projectId,projectNumber:e.projectNumber,projectName:e.projectName,syncEnabled:e.syncEnabled,loadedAt:e.loadedAt,complete:e.complete,cacheLinkPending:e.cacheLinkPending,settings:e.settings,changes:(e.changes||[]).slice(0,1),revenueCents:(e.documents||[]).reduce((n,d)=>n+d.cents,0),summaryOnly:true};
}
function salesLeanRoster_(){
  const key='sales_meta/lean_editions',old=salesRead_(key);if(old)return old.rows;
  return salesLock_(()=>{const again=salesRead_(key);if(again)return again.rows;const rows=salesV1Editions_().map(salesLeanEdition_).sort((a,b)=>a.id.localeCompare(b.id));salesWrite_(key,{rows});return rows;});
}
function getSalesLeanState(selectedId){
  const user=salesUser_(),preferences=salesRead_('sales_meta/preferences')||{},editions=salesLeanRoster_();
  const edition=editions.find(e=>e.id===selectedId)||editions.find(e=>e.id===preferences.currentEditionId)||editions.find(e=>e.id===SALES.edition)||editions[0]||null;
  return {release:SALES_RELEASE,lean:true,user,capabilities:{editionRefreshViaSync:typeof startSalesEditionRefresh==='function'},preferences,editions,edition,companies:[],directory:[],drafts:[],jobs:[],localCompanies:[],catalog:null,access:null,syncRun:null,importRun:null,unassignedSummary:null};
}
function salesLeanNames_(){
  const path='sales_meta/lean_names',cached=salesRead_(path);if(cached)return cached.rows;
  return salesLock_(()=>{
    const again=salesRead_(path);if(again)return again.rows;
    // Once, on the first explicit Customers click: migrate the existing directory to names only.
    const map=new Map(salesV1Index_().entries.map(e=>[String(e.company.id),{id:String(e.company.id),name:e.company.name}]));
    for(const d of salesList_('sales_drafts'))if(d.company)map.set(String(d.hqId||'draft_'+d.id),{id:'draft_'+d.id,name:map.get(String(d.hqId))?.name||d.company.name,...(d.hqId?{hqId:String(d.hqId)}:{})});
    const rows=Array.from(map.values());salesWrite_(path,{rows});return rows;
  });
}
function salesLeanNamesUpdate_(entries){
  const changes=entries.filter(e=>/^sales_(directory|companies)\/\d+$/.test(e.path)&&e.value.company).map(e=>({id:String(e.value.company.id),name:e.value.company.name}));
  for(const e of entries)if(/^sales_drafts\//.test(e.path)&&e.value.company)changes.push({id:'draft_'+e.value.id,name:e.value.company.name,...(e.value.hqId?{hqId:String(e.value.hqId)}:{})});
  if(!changes.length)return;const path='sales_meta/lean_names',old=salesRead_(path);if(!old)return;
  const map=new Map(old.rows.map(c=>[c.hqId||c.id,c]));let changed=false;
  for(let c of changes){const key=c.hqId||c.id;if(c.hqId&&map.delete(c.id))changed=true;const prior=map.get(key);if(!c.id.startsWith('draft_')&&prior?.id.startsWith('draft_'))c={...prior,name:c.name};if(JSON.stringify(prior)!==JSON.stringify(c)){map.set(key,c);changed=true;}}
  if(changed)salesWrite_(path,{rows:Array.from(map.values())});
}
function salesLeanHistoryIndex_(){
  const path='sales_meta/lean_historyjobs',cached=salesRead_(path);if(cached)return cached.rows;
  return salesLock_(()=>{
    const again=salesRead_(path);if(again)return again.rows;
    const rows=salesList_('sales_jobs').filter(j=>j.kind==='history'&&j.state!=='canceled').map(j=>({id:j.id,companyId:String(j.hqId)}));
    salesWrite_(path,{rows});return rows;
  });
}
function salesLeanPrepareWrite_(path,value){
  if(path!=='sales_meta/sync'||!(value.paused||value.state!=='running'||!value.inFlight&&!value.tasks?.[value.cursor]?.pendingPage))return null;
  if(!value.paused&&value.state==='running'&&value.statusPublishedAt&&Date.now()-Date.parse(value.statusPublishedAt)<15000)return null;
  value.statusPublishedAt=salesNow_();return salesSyncSummary_(value);
}
function salesLeanAfterWrite_(path,value){
  if(/^sales_(directory|companies)\/\d+$/.test(path)||/^sales_drafts\//.test(path)){salesLeanNamesUpdate_([{path,value}]);salesLeanFiltersUpdate_([{path,value}]);}
  if(/^sales_jobs\//.test(path)&&value.kind==='history'){
    const key='sales_meta/lean_historyjobs',old=salesRead_(key);if(!old)return;
    const rows=old.rows.filter(j=>j.id!==value.id);if(value.state!=='canceled')rows.push({id:value.id,companyId:String(value.hqId)});rows.sort((a,b)=>a.id.localeCompare(b.id));
    if(JSON.stringify(rows)!==JSON.stringify(old.rows))salesWrite_(key,{rows});
  }
  if(/^sales_editions\//.test(path)){
    for(const [key,project] of [['sales_meta/lean_editions',salesLeanEdition_],['sales_meta/lean_bookings',salesLeanBookingRow_]]){
      const old=salesRead_(key);if(!old)continue;const e=project(value),rows=old.rows.filter(x=>x.id!==e.id);rows.push(e);rows.sort((a,b)=>a.id.localeCompare(b.id));
      if(JSON.stringify(rows)!==JSON.stringify(old.rows))salesWrite_(key,{rows});
    }
  }
  if(/^sales_drafts\//.test(path)&&value.hqId){const key='sales_meta/lean_testowners',old=salesRead_(key);if(old){old.rows[String(value.hqId)]=value.id;salesWrite_(key,old);}}
}
function salesLeanOwnDraft_(id){
  const path='sales_meta/lean_testowners',old=salesRead_(path);if(old)return old.rows[String(id)]||null;
  return salesLock_(()=>{const again=salesRead_(path);if(again)return again.rows[String(id)]||null;const rows={};for(const d of salesList_('sales_drafts'))if(d.hqId)rows[String(d.hqId)]=d.id;salesWrite_(path,{rows});return rows[String(id)]||null;});
}
function salesLeanHistories_(id,rows){
  const out=(rows||[]).map(h=>({...h,source:'hq'}));
  for(const entry of salesLeanHistoryIndex_().filter(j=>j.companyId===String(id))){
    const j=salesRead_('sales_jobs/'+salesKey_(entry.id));if(!j||j.kind!=='history'||j.state==='canceled'||String(j.hqId)!==String(id))continue;
    const matches=out.filter(h=>j.historyId&&String(h.id)===String(j.historyId)||h.syncId&&h.syncId===j.history.syncId);
    if(matches.length)matches.forEach(h=>Object.assign(h,{jobId:j.id,syncState:j.state}));
    else out.push({...j.history,id:'local_'+j.id,jobId:j.id,source:'app',syncState:j.state==='synced'?'missing':j.state});
  }return out;
}
function salesLeanKnown_(id){
  id=String(salesId_(id));const entry=salesRead_('sales_directory/'+id);
  if(entry?.company&&String(entry.company.id)===id)return true;
  if((salesRead_('sales_meta/directory')?.entries||[]).some(e=>String(e.company.id)===id))return true;
  return salesV1Editions_().some(e=>(e.companyIds||[]).map(String).includes(id)||(e.companies||[]).some(c=>String(c.id)===id));
}
function getSalesLeanCompany(id){
  salesUser_();
  if(String(id).startsWith('draft_')){
    const draft=salesRead_('sales_drafts/'+salesKey_(String(id).slice(6)));if(!draft?.company)throw new Error('Firebase-Firma fehlt.');
    const job=salesRead_('sales_jobs/'+draft.id),catalog=salesRead_('sales_meta/catalog'),local=salesLocalCompany_(draft,catalog,job),stored=draft.hqId?salesRead_('sales_companies/'+draft.hqId):null;
    const contacts=draft.contact?[{...draft.contact,id:job?.contactId||'draft_'+draft.id+'_contact',localDraftId:draft.id,syncState:job?.steps?.contact?'confirmed':'pending'}]:[];
    const visible=stored&&typeof salesBusinessView_==='function'?salesBusinessView_(stored):stored,displayed=job?.state==='synced'&&stored?{...visible.company,id:local.id,localDraftId:draft.id,hqId:String(draft.hqId),syncState:job.state}:local;
    return {...(visible||{}),company:displayed,contacts:visible?.contacts?.length?visible.contacts:contacts,histories:draft.hqId?salesLeanHistories_(draft.hqId,stored?.histories):[],projects:stored?.projects||[],detailVersion:3,source:'firebase',patch:{draft,job:job?salesJobSummary_(job):null,localCompany:displayed}};
  }
  id=String(salesId_(id));const own=salesLeanOwnDraft_(id);if(own)return getSalesLeanCompany('draft_'+own);if(!salesLeanKnown_(id))throw new Error('Firma gehört nicht zum bestätigten App-Bestand.');
  const stored=salesRead_('sales_companies/'+id);return stored?{...(typeof salesBusinessView_==='function'?salesBusinessView_(stored):stored),histories:salesLeanHistories_(id,stored.histories)}:null;
}
function getSalesLeanView(name,selectedId){
  const user=salesUser_();
  if(name==='customers')return {companies:salesLeanNames_()};
  if(name==='magazine')return {companies:salesLeanFilters_(),editions:salesLeanBookings_()};
  if(name==='contacts')return {directory:salesV1Index_().entries,drafts:salesList_('sales_drafts'),jobs:salesList_('sales_jobs').map(salesJobSummary_)};
  if(name==='invoices')return {editions:salesV1Editions_(),companies:salesLeanNames_()};
  if(name==='admin')return {editions:salesLeanRoster_(),access:user.admin?salesAccess_():null};
  if(name==='new'||name==='change')return {catalog:salesRead_('sales_meta/catalog')};
  if(name==='import')return {syncRun:salesLeanSyncStatus_(),unassignedSummary:salesRead_('sales_meta/unassignedsummary')};
  if(name==='test'){
    const drafts=salesList_('sales_drafts'),jobs=salesList_('sales_jobs'),catalog=salesRead_('sales_meta/catalog');
    return {drafts,jobs:jobs.map(salesJobSummary_),catalog,localCompanies:drafts.map(d=>salesLocalCompany_(d,catalog,jobs.find(j=>j.id===d.id))),...(name==='import'?{syncRun:salesSyncSummary_(salesRead_('sales_meta/sync')),unassignedSummary:salesRead_('sales_meta/unassignedsummary')}: {})};
  }
  if(name==='home')return getSalesLeanState(selectedId);
  throw new Error('Unbekannte Ansicht.');
}
function syncSalesLeanHistory(id){
  salesUser_(true);const result=salesLock_(()=>{
    const isDraft=String(id).startsWith('draft_');let draft=null,companyId;
    if(isDraft){draft=salesRead_('sales_drafts/'+salesKey_(String(id).slice(6)));if(!draft?.company||!draft.hqId)throw new Error('Zuerst eigene Firma in HQ bestätigen.');companyId=String(salesId_(draft.hqId));}
    else{companyId=String(salesId_(id));if(!salesLeanKnown_(companyId))throw new Error('Firma gehört nicht zum bestätigten App-Bestand.');}
    const stored=salesRead_('sales_companies/'+companyId);if(!stored)throw new Error('Zuerst Kundendetails importieren.');salesAssertPrivate_();const started=Date.now();
    const histories=salesCollect_('ContactHistories','companyId eq '+companyId,started),documents=salesCollect_('Documents','companyId eq '+companyId,started);
    if([...histories,...documents].some(h=>Number(h.companyId)!==Number(companyId)))throw new Error('HQ-Firmenfilter wurde nicht eingehalten.');
    stored.histories=salesHistoryRows_(histories,documents,[],started);stored.historyLoadedAt=salesNow_();salesWrite_('sales_companies/'+companyId,stored);
    return {stored,draft,companyId};
  });
  const detail={...result.stored,histories:salesLeanHistories_(result.companyId,result.stored.histories)};
  if(result.draft)detail.company={...detail.company,id:String(id),localDraftId:result.draft.id,hqId:result.companyId};
  return {message:result.stored.histories.length+' HQ-Historieneinträge vollständig nach Firebase übertragen.',detail};
}
function getSalesLeanEdition(id){salesUser_();const e=salesRead_('sales_editions/'+salesKey_(id));if(!e)throw new Error('Ausgabe fehlt.');return e;}
function saveSalesLeanEditionSettings(input){const result=saveSalesV1EditionSettings(input);return {...result,edition:salesLeanBookingRow_(result.edition)};}
function syncSalesLeanCompany(id){
  salesUser_(true);id=String(salesId_(id));const own=salesLeanOwnDraft_(id);const result=salesLock_(()=>{
    salesAssertPrivate_();const draft=own?salesRead_('sales_drafts/'+salesKey_(own)):null;if(!salesLeanKnown_(id)&&!(draft?.company&&String(draft.hqId)===id))throw new Error('Firma gehört nicht zum bestätigten App-Bestand.');
    // Existing complete HQ detail loader, with its membership check already satisfied by a direct lookup.
    return salesV1LoadCompany_(id,true);
  });result.detail.histories=salesLeanHistories_(id,result.detail.histories);return result;
}
function mutateSalesLean(name,args){
  salesUser_();if(!Array.isArray(args))throw new Error('Ungültige Parameter.');
  const allowed={bindSalesCompanyResult,saveSalesCompany,saveSalesTestCompany,saveSalesHistory,saveSalesCompanyChange,queueSalesContactEmail,queueSalesMarkerCleanup,runSalesJob,reconcileSalesJob,resolveSalesConflict,checkSalesHistoryBinding};
  if(!Object.prototype.hasOwnProperty.call(allowed,name))throw new Error('Aktion nicht freigegeben.');
  const result=allowed[name](...args),id=result.id||(['runSalesJob','reconcileSalesJob','resolveSalesConflict','checkSalesHistoryBinding'].includes(name)?args[0]:null);
  if(!id)return result;
  const job=salesRead_('sales_jobs/'+salesKey_(id)),draft=job?.draftId?salesRead_('sales_drafts/'+salesKey_(job.draftId)):null;
  const localCompany=draft?salesLocalCompany_(draft,salesRead_('sales_meta/catalog'),job):null;
  return {...result,patch:{job:job?{...salesJobSummary_(job),...(job.kind==='history'?{history:job.history}:{})}:null,draft,localCompany},...(['saveSalesCompany','saveSalesTestCompany'].includes(name)?{detail:{company:localCompany,contacts:[{...draft.contact,id:'draft_'+draft.id+'_contact',localDraftId:draft.id,syncState:'pending'}],histories:[],projects:[],detailVersion:3}}:{})};
}

/** Read-only, explicitly paged inventory. No customer contents, delete endpoint or automatic scanner. */
function getSalesStorageInventoryPage(input){
  salesUser_(true);input=input||{};
  const collections=['sales_meta','sales_editions','sales_directory','sales_companies','sales_jobs','sales_drafts','sales_rawcompanies','sales_rawcontacts','sales_rawhistories','sales_rawprojects','sales_rawdocuments','sales_rawplans','sales_projectviews','sales_imports','sales_chunks'];
  const collection=input.collection||collections[0],index=collections.indexOf(collection),token=input.pageToken||'';
  if(index<0||typeof token!=='string'||token.length>5000||/[\r\n]/.test(token))throw new Error('Ungültige Inventurseite.');
  const c=salesContext_(),page=pilotCall_(pilotUrl_(c.project,collection)+'?pageSize=50'+(token?'&pageToken='+encodeURIComponent(token):''),{method:'get',headers:{Authorization:'Bearer '+c.token}});
  const refs=new Set(),groups={},result={collection,documents:0,payloadBytes:0,splitRoots:0,unreadable:0,oldest:null,newest:null,references:[],chunkGroups:[],next:null};
  for(const doc of page.documents||[]){
    if(!doc.name?.split('/documents/')[1]?.startsWith(collection+'/'))throw new Error('Inventurantwort passt nicht zur Sammlung.');
    result.documents++;const text=doc.fields?.payload?.stringValue||'';result.payloadBytes+=Utilities.newBlob(text).getBytes().length;
    if(doc.updateTime){if(!result.oldest||doc.updateTime<result.oldest)result.oldest=doc.updateTime;if(!result.newest||doc.updateTime>result.newest)result.newest=doc.updateTime;}
    let value;try{value=JSON.parse(text);}catch(_){result.unreadable++;continue;}
    if(value?.storageFormat==='sales-parts-v1'&&value.generation){result.splitRoots++;refs.add(value.generation);}
    if(collection==='sales_chunks'){
      const key=doc.name.split('/').pop(),match=/^(.+)-\d+$/.exec(key);if(match)groups[match[1]]=(groups[match[1]]||0)+1;else result.unreadable++;
    }
  }
  result.references=Array.from(refs);result.chunkGroups=Object.entries(groups).map(([generation,count])=>({generation,count}));
  result.next=page.nextPageToken?{collection,pageToken:page.nextPageToken}:index+1<collections.length?{collection:collections[index+1]}:null;
  return result;
}
