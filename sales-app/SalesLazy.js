  const companyCache=new Map(),loadedViews=new Set(),editionCache=new Map(),viewCache=new Map();
  const leanMutations=new Set(['bindSalesCompanyResult','saveSalesCompany','saveSalesTestCompany','saveSalesHistory','saveSalesCompanyChange','queueSalesContactEmail','queueSalesMarkerCleanup','runSalesJob','reconcileSalesJob','resolveSalesConflict','checkSalesHistoryBinding']);
  function mergeLean(patch){
    if(!patch)return;
    if(patch.lean){state.preferences=patch.preferences;state.editions=patch.editions.map(e=>editionCache.get(e.id)||e);state.edition=patch.edition;selectedEditionId=state.edition?.id||'';return;}
    if(patch.syncRun!==undefined)acceptSyncStatus(patch.syncRun);
    for(const key of ['companies','directory','drafts','jobs','catalog','localCompanies','unassignedSummary','access'])if(patch[key]!==undefined)state[key]=patch[key];
    if(patch.editions){const id=selectedEditionId;state.editions=patch.editions;state.edition=patch.editions.find(e=>e.id===id)||patch.editions[0]||null;selectedEditionId=state.edition?.id||'';patch.editions.forEach(e=>{if(!e.summaryOnly)editionCache.set(e.id,e);});}
  }
  async function ensureView(name,force=false){
    if(name==='import')force=true;
    if(!force&&loadedViews.has(name)){mergeLean(viewCache.get(name));return;}
    if(['home','customers','magazine','contacts','invoices','admin','new','change','test','import'].includes(name)){const patch=await rpc('getSalesLeanView',name,selectedEditionId);viewCache.set(name,patch);mergeLean(patch);}
    loadedViews.add(name);
  }
  async function openView(name,force=false){
    await ensureView(name,force);view=name;
  }
  function acceptSyncStatus(run){
    const before=state.syncRun;state.syncRun=run;
    if(run&&run.state!=='running'&&(before?.state==='running'||before?.id!==run.id||before?.revision!==run.revision)){
      loadedViews.clear();viewCache.clear();companyCache.clear();editionCache.clear();
    }
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
    if(view==='magazine'){state.edition=state.editions.find(e=>e.id===id)||null;return;}
    if(view==='home'){
      state.edition=state.editions.find(e=>e.id===id)||null;
    }else{
      if(!editionCache.has(id))editionCache.set(id,await rpc('getSalesLeanEdition',id));state.edition=editionCache.get(id);
    }
  }
  let storageInventory=null;
  async function readStorageInventory(restart=false){
    if(restart||!storageInventory)storageInventory={next:{},rows:{},references:new Set(),chunks:new Map(),startedAt:new Date().toISOString()};
    if(!storageInventory.next)return {message:'Bestandsaufnahme abgeschlossen. Es wurde nichts gelöscht.'};
    const page=await rpc('getSalesStorageInventoryPage',storageInventory.next),row=storageInventory.rows[page.collection]||{documents:0,payloadBytes:0,splitRoots:0,unreadable:0};
    for(const key of ['documents','payloadBytes','splitRoots','unreadable'])row[key]+=page[key];
    if(page.oldest&&(!row.oldest||page.oldest<row.oldest))row.oldest=page.oldest;if(page.newest&&(!row.newest||page.newest>row.newest))row.newest=page.newest;storageInventory.rows[page.collection]=row;
    page.references.forEach(g=>storageInventory.references.add(g));page.chunkGroups.forEach(g=>storageInventory.chunks.set(g.generation,(storageInventory.chunks.get(g.generation)||0)+g.count));
    storageInventory.next=page.next;
    return {message:page.next?'Inventurseite gelesen. Weitere Seiten nur durch deinen Klick.':'Bestandsaufnahme abgeschlossen. Es wurde nichts gelöscht.'};
  }
  function storageInventoryPanel(){
    const inv=storageInventory;let candidates=0;if(inv&&!inv.next)for(const [g,n] of inv.chunks)if(!inv.references.has(g))candidates+=n;
    return '<section class="m-panel m-section"><div class="m-panel-head"><h2>Technischer Speicherbestand</h2></div><div class="m-panel-body"><p>Lesende Bestandsaufnahme, höchstens 50 Dokumente pro Klick. Jede Seite verbraucht Lesezugriffe. Keine automatische Abfrage und keine Löschung.</p>'+button('Bestandsaufnahme starten','inventory-start')+(inv?.next?button('Nächste Inventurseite lesen','inventory-next'):'')+
      (inv?'<p>'+(inv.next?'Teilstand · weitere Seiten fehlen':'Durchlauf vollständig')+' · Beginn '+esc(new Date(inv.startedAt).toLocaleString('de-DE'))+'</p><table class="m-data-table"><thead><tr><th>Sammlung</th><th>Dokumente</th><th>Nutzdaten in Bytes</th><th>Aufgeteilte Wurzeldokumente</th><th>Letzte Speicherung (Spanne)</th></tr></thead><tbody>'+Object.entries(inv.rows).map(([name,r])=>'<tr><td>'+esc(name)+'</td><td>'+r.documents+'</td><td>'+r.payloadBytes+'</td><td>'+r.splitRoots+'</td><td>'+esc(r.oldest||'unbekannt')+' / '+esc(r.newest||'unbekannt')+'</td></tr>').join('')+'</tbody></table>'+
      (!inv.next?'<p>'+candidates+' Speicherteile ohne im Durchlauf gelesenen Wurzelverweis. Dies ist keine Freigabe zur Löschung: laufende und pausierte Abgleiche, technische Journale und gleichzeitige Änderungen müssen vor einer Bereinigung gesondert geprüft werden.</p>':''):'')+'</div></section>';
  }
