  const companyCache=new Map(),loadedViews=new Set(),editionCache=new Map(),viewCache=new Map();
  const leanMutations=new Set(['saveSalesTestCompany','saveSalesHistory','saveSalesCompanyChange','queueSalesContactEmail','queueSalesMarkerCleanup','runSalesJob','reconcileSalesJob','resolveSalesConflict','checkSalesHistoryBinding']);
  function mergeLean(patch){
    if(!patch)return;
    if(patch.lean){state.preferences=patch.preferences;state.editions=patch.editions.map(e=>editionCache.get(e.id)||e);state.edition=patch.edition;selectedEditionId=state.edition?.id||'';return;}
    for(const key of ['companies','directory','drafts','jobs','catalog','localCompanies','syncRun','unassignedSummary','access'])if(patch[key]!==undefined)state[key]=patch[key];
    if(patch.editions){const id=selectedEditionId;state.editions=patch.editions;state.edition=patch.editions.find(e=>e.id===id)||patch.editions[0]||null;selectedEditionId=state.edition?.id||'';patch.editions.forEach(e=>{if(!e.summaryOnly)editionCache.set(e.id,e);});}
  }
  async function ensureView(name,force=false){
    if(!force&&loadedViews.has(name)){mergeLean(viewCache.get(name));return;}
    if(['home','customers','magazine','contacts','invoices','admin','new','change','test','import'].includes(name)){const patch=await rpc('getSalesLeanView',name,selectedEditionId);viewCache.set(name,patch);mergeLean(patch);}
    loadedViews.add(name);
  }
  async function openView(name,force=false){
    await ensureView(name,force);view=name;
  }
  async function loadCompany(id,fresh=false){
    id=String(id);if(fresh)companyCache.delete(id);
    if(!companyCache.has(id))companyCache.set(id,await rpc('getSalesCompany',id));
    return companyCache.get(id);
  }
  function applyLeanResult(value){
    if(!state||!value)return;
    const p=value.patch;
    if(p){
      for(const [field,item] of [['jobs',p.job],['drafts',p.draft],['localCompanies',p.localCompany]])if(item){const i=state[field].findIndex(x=>x.id===item.id);if(i<0)state[field].push(item);else state[field][i]=item;}
      if(p.draft){const ids=['draft_'+p.draft.id,String(p.draft.hqId)];for(const id of ids){const previous=companyCache.get(id);companyCache.delete(id);if(previous&&p.job?.kind==='history'&&p.job.state==='pending')companyCache.set(id,{...previous,histories:[...(previous.histories||[]).filter(h=>h.jobId!==p.job.id),{...p.job.history,id:'local_'+p.job.id,jobId:p.job.id,source:'app',syncState:'pending'}]});}}
    }
    if(value.edition){let e=value.edition;const old=editionCache.get(e.id);if(e.summaryOnly&&old)e={...old,...e,summaryOnly:false};const i=state.editions.findIndex(x=>x.id===e.id);if(i<0)state.editions.push(e);else state.editions[i]=e;if(!e.summaryOnly)editionCache.set(e.id,e);for(const cache of viewCache.values())if(cache.editions){const n=cache.editions.findIndex(x=>x.id===e.id);if(n<0)cache.editions.push(e);else cache.editions[n]=e;}if(selectedEditionId===e.id)state.edition=e;}
    if(value.detail){detail=value.detail;companyCache.set(String(detail.company.id),detail);}
  }
  async function refreshCurrentView(){
    if(!state){state=await rpc('getSalesLeanState');loadedViews.add('home');return;}
    if(view==='company'){detail=await loadCompany(selected,true);return;}
    if(view==='unassigned'){unassignedData=await rpc('getSalesUnassigned');return;}
    await ensureView(view,true);
  }
  async function changeLeanEdition(id){
    selectedEditionId=id;
    if(view==='home'){
      state.edition=state.editions.find(e=>e.id===id)||null;
    }else{
      if(!editionCache.has(id))editionCache.set(id,await rpc('getSalesLeanEdition',id));state.edition=editionCache.get(id);
    }
  }
