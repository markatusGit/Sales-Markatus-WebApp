/** Click-driven read endpoints. Legacy state/sync endpoints stay available for deferred D09/D11/D14. */
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
    for(const d of salesList_('sales_drafts'))if(d.testOnly)map.set(String(d.hqId||'draft_'+d.id),{id:'draft_'+d.id,name:d.company.name,...(d.hqId?{hqId:String(d.hqId)}:{})});
    const rows=Array.from(map.values());salesWrite_(path,{rows});return rows;
  });
}
function salesLeanNamesUpdate_(entries){
  const changes=entries.filter(e=>/^sales_(directory|companies)\/\d+$/.test(e.path)&&e.value.company).map(e=>({id:String(e.value.company.id),name:e.value.company.name}));
  for(const e of entries)if(/^sales_drafts\//.test(e.path)&&e.value.testOnly)changes.push({id:'draft_'+e.value.id,name:e.value.company.name,...(e.value.hqId?{hqId:String(e.value.hqId)}:{})});
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
function salesLeanAfterWrite_(path,value){
  if(/^sales_(directory|companies)\/\d+$/.test(path)||/^sales_drafts\//.test(path))salesLeanNamesUpdate_([{path,value}]);
  if(/^sales_jobs\//.test(path)&&value.kind==='history'){
    const key='sales_meta/lean_historyjobs',old=salesRead_(key);if(!old)return;
    const rows=old.rows.filter(j=>j.id!==value.id);if(value.state!=='canceled')rows.push({id:value.id,companyId:String(value.hqId)});rows.sort((a,b)=>a.id.localeCompare(b.id));
    if(JSON.stringify(rows)!==JSON.stringify(old.rows))salesWrite_(key,{rows});
  }
  if(/^sales_editions\//.test(path)){
    const key='sales_meta/lean_editions',old=salesRead_(key);if(!old)return;
    const e=salesLeanEdition_(value),rows=old.rows.filter(x=>x.id!==e.id);rows.push(e);rows.sort((a,b)=>a.id.localeCompare(b.id));salesWrite_(key,{rows});
  }
  if(/^sales_drafts\//.test(path)&&value.hqId){const key='sales_meta/lean_testowners',old=salesRead_(key);if(old){old.rows[String(value.hqId)]=value.id;salesWrite_(key,old);}}
}
function salesLeanOwnDraft_(id){
  const path='sales_meta/lean_testowners',old=salesRead_(path);if(old)return old.rows[String(id)]||null;
  return salesLock_(()=>{const again=salesRead_(path);if(again)return again.rows[String(id)]||null;const rows={};for(const d of salesList_('sales_drafts'))if(d.testOnly&&d.hqId)rows[String(d.hqId)]=d.id;salesWrite_(path,{rows});return rows[String(id)]||null;});
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
    const draft=salesRead_('sales_drafts/'+salesKey_(String(id).slice(6)));if(!draft?.testOnly)throw new Error('Firebase-Firma fehlt.');
    const job=salesRead_('sales_jobs/'+draft.id),catalog=salesRead_('sales_meta/catalog'),local=salesLocalCompany_(draft,catalog,job),stored=draft.hqId?salesRead_('sales_companies/'+draft.hqId):null;
    const contacts=draft.contact?[{...draft.contact,id:job?.contactId||'draft_'+draft.id+'_contact',localDraftId:draft.id,syncState:job?.steps?.contact?'confirmed':'pending'}]:[];
    return {...(stored||{}),company:job?.state==='synced'&&stored?{...stored.company,id:local.id,localDraftId:draft.id,hqId:String(draft.hqId),syncState:job.state}:local,contacts:stored?.contacts?.length?stored.contacts:contacts,histories:draft.hqId?salesLeanHistories_(draft.hqId,stored?.histories):[],projects:stored?.projects||[],detailVersion:3,source:'firebase',patch:{draft,job:job?salesJobSummary_(job):null,localCompany:local}};
  }
  id=String(salesId_(id));const own=salesLeanOwnDraft_(id);if(own)return getSalesLeanCompany('draft_'+own);if(!salesLeanKnown_(id))throw new Error('Firma gehört nicht zum bestätigten App-Bestand.');
  const stored=salesRead_('sales_companies/'+id);return stored?{...stored,histories:salesLeanHistories_(id,stored.histories)}:null;
}
function getSalesLeanView(name,selectedId){
  const user=salesUser_();
  if(name==='customers')return {companies:salesLeanNames_()};
  if(name==='magazine')return {companies:salesV1Index_().entries.map(e=>e.company),editions:salesV1Editions_()};
  if(name==='contacts')return {directory:salesV1Index_().entries,drafts:salesList_('sales_drafts'),jobs:salesList_('sales_jobs').map(salesJobSummary_)};
  if(name==='invoices')return {editions:salesV1Editions_(),companies:salesLeanNames_()};
  if(name==='admin')return {editions:salesLeanRoster_(),access:user.admin?salesAccess_():null};
  if(name==='new'||name==='change')return {catalog:salesRead_('sales_meta/catalog')};
  if(name==='test'||name==='import'){
    const drafts=salesList_('sales_drafts'),jobs=salesList_('sales_jobs'),catalog=salesRead_('sales_meta/catalog');
    return {drafts,jobs:jobs.map(salesJobSummary_),catalog,localCompanies:drafts.map(d=>salesLocalCompany_(d,catalog,jobs.find(j=>j.id===d.id))),...(name==='import'?{syncRun:salesSyncSummary_(salesRead_('sales_meta/sync')),unassignedSummary:salesRead_('sales_meta/unassignedsummary')}: {})};
  }
  if(name==='home')return getSalesLeanState(selectedId);
  throw new Error('Unbekannte Ansicht.');
}
function getSalesLeanEdition(id){salesUser_();const e=salesRead_('sales_editions/'+salesKey_(id));if(!e)throw new Error('Ausgabe fehlt.');return e;}
function saveSalesLeanEditionSettings(input){const result=saveSalesV1EditionSettings(input);return {...result,edition:salesLeanEdition_(result.edition)};}
function syncSalesLeanCompany(id){
  salesUser_(true);id=String(salesId_(id));const own=salesLeanOwnDraft_(id);const result=salesLock_(()=>{
    salesAssertPrivate_();const draft=own?salesRead_('sales_drafts/'+salesKey_(own)):null;if(!salesLeanKnown_(id)&&!(draft?.testOnly&&String(draft.hqId)===id))throw new Error('Firma gehört nicht zum bestätigten App-Bestand.');
    // Existing complete HQ detail loader, with its membership check already satisfied by a direct lookup.
    return salesV1LoadCompany_(id,true);
  });result.detail.histories=salesLeanHistories_(id,result.detail.histories);return result;
}
function mutateSalesLean(name,args){
  salesUser_();if(!Array.isArray(args))throw new Error('Ungültige Parameter.');
  const allowed={saveSalesTestCompany,saveSalesHistory,saveSalesCompanyChange,queueSalesContactEmail,queueSalesMarkerCleanup,runSalesJob,reconcileSalesJob,resolveSalesConflict,checkSalesHistoryBinding};
  if(!Object.prototype.hasOwnProperty.call(allowed,name))throw new Error('Aktion nicht freigegeben.');
  const result=allowed[name](...args),id=result.id||(['runSalesJob','reconcileSalesJob','resolveSalesConflict','checkSalesHistoryBinding'].includes(name)?args[0]:null);
  if(!id)return result;
  const job=salesRead_('sales_jobs/'+salesKey_(id)),draft=job?salesRead_('sales_drafts/'+salesKey_(job.draftId)):null;
  const localCompany=draft?salesLocalCompany_(draft,salesRead_('sales_meta/catalog'),job):null;
  return {...result,patch:{job:job?{...salesJobSummary_(job),...(job.kind==='history'?{history:job.history}:{})}:null,draft,localCompany},...(name==='saveSalesTestCompany'?{detail:{company:localCompany,contacts:[{...draft.contact,id:'draft_'+draft.id+'_contact',localDraftId:draft.id,syncState:'pending'}],histories:[],projects:[],detailVersion:3}}:{})};
}
