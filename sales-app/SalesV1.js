  let selectedEditionId='',customerHistoryFilter='all',industryFilter='',cityFilter='',ownerFilter='',projectResults=null,companyResults=null,importLoop=false,stopImport=false;
  function adoptSalesState(value){
    const editions=value.editions||[value.edition].filter(Boolean);value.editions=editions;
    value.edition=editions.find(e=>e.id===selectedEditionId)||editions.find(e=>e.id===value.preferences?.currentEditionId)||value.edition||editions[0]||null;
    selectedEditionId=value.edition?.id||'';return value;
  }
  const editionLabel=e=>e?e.magazine+' · Ausgabe #'+e.issue:'Noch keine Ausgabe zugeordnet';
  function editionSelectors(){
    const editions=state.editions||[state.edition].filter(Boolean);if(!editions.length)return '<p class="m-note">Zuerst unter Verwaltung ein Magazin und eine Ausgabe zuordnen.</p>';
    const magazines=Array.from(new Set(editions.map(e=>e.magazine))).sort((a,b)=>a.localeCompare(b,'de'));
    return '<div class="m-filterbar">'+select('Magazin','v1Magazine',magazines.map(name=>({id:name,name})),state.edition?.magazine)+select('Ausgabe','v1Edition',editions.filter(e=>e.magazine===state.edition?.magazine).sort((a,b)=>b.issue-a.issue).map(e=>({id:e.id,name:'#'+e.issue+' · '+(e.loadedAt?'Stand '+dateLabel(e.loadedAt):'noch nicht importiert')})),state.edition?.id)+'</div>';
  }
  function v1Companies(includeLocal=true){
    const map=new Map((state.companies||state.edition?.companies||[]).map(c=>[String(c.hqId||c.id),c]));
    if(includeLocal)(state.localCompanies||[]).forEach(c=>map.set(String(c.hqId||c.id),c));return Array.from(map.values());
  }
  function historySelection(editions,current,mode){
    if(mode==='all')return {ids:null,message:''};if(!current)return {ids:new Set(),unknown:true,message:'Zuerst eine Ausgabe auswählen.'};
    if(Number(current.issue)<=(mode==='last5'?5:1))return {ids:new Set(),unknown:true,message:'Für diese Ausgabe gibt es noch nicht genügend vorherige Ausgaben für diesen Filter.'};
    const same=editions.filter(e=>e.magazine.toLocaleLowerCase('de')===current.magazine.toLocaleLowerCase('de'));
    const required=mode==='last5'?[1,2,3,4,5].map(n=>Number(current.issue)-n):[Number(current.issue)-1];
    const missing=required.filter(n=>!same.some(e=>Number(e.issue)===n&&e.loadedAt&&e.complete));
    if(missing.length)return {ids:new Set(),unknown:true,message:'Noch nicht auswertbar: '+current.magazine+' #'+missing.join(', #')+' fehlt oder ist unvollständig. Keine fehlende Buchung wird daraus abgeleitet.'};
    const booked=e=>{const sums={};(e.documents||[]).forEach(d=>{sums[d.companyId]=(sums[d.companyId]||0)+d.cents;});return Object.keys(sums).filter(id=>sums[id]>0);};
    if(mode==='last5')return {ids:new Set(same.filter(e=>required.includes(Number(e.issue))).flatMap(booked)),message:'Mindestens einmal mit positivem Netto-Rechnungsbetrag in den fünf Ausgaben vor #'+current.issue+'.'};
    const last=new Set(booked(same.find(e=>Number(e.issue)===Number(current.issue)-1))),earlier=same.filter(e=>Number(e.issue)<Number(current.issue)-1&&e.loadedAt);
    if(!earlier.length)return {ids:new Set(),unknown:true,message:'Noch keine frühere Ausgabe vor der letzten Ausgabe importiert.'};
    return {ids:new Set(earlier.flatMap(booked).filter(id=>!last.has(id))),message:'Nicht in #'+(Number(current.issue)-1)+', aber früher fakturiert. Frühere Historie umfasst ausschließlich die importierten Ausgaben: '+earlier.map(e=>'#'+e.issue).join(', ')+'.'};
  }
  function v1FilterBar(){
    const all=v1Companies(),options=values=>[{id:'',name:'Alle'},...Array.from(new Set(values.filter(Boolean))).sort((a,b)=>a.localeCompare(b,'de')).map(v=>({id:v,name:v}))];
    const owners=new Map();all.forEach(c=>(c.responsibleUsers||[]).forEach(u=>owners.set(String(u.userId||u.id),[u.firstName,u.lastName].filter(Boolean).join(' ')||'HQ-Betreuer '+(u.userId||u.id))));
    return '<div class="m-filterbar">'+select('Historie','v1History',[{id:'all',name:'Alle Kunden / Interessenten'},{id:'lapsed',name:'Letzte Ausgabe nicht, früher schon'},{id:'last5',name:'Mindestens einmal in den letzten 5 Ausgaben'}],customerHistoryFilter)+select('Branche','v1Industry',options(all.map(c=>c.industrialSector)),industryFilter)+select('Ort','v1City',options(all.map(c=>addr(c)?.city)),cityFilter)+select('Betreuer','v1Owner',[{id:'',name:'Alle'},...Array.from(owners,([id,name])=>({id,name}))],ownerFilter)+'</div><label class="m-field">Kunden suchen<input id="search" value="'+esc(search)+'" placeholder="Unternehmen, Kundennummer, Ort oder Branche"></label>';
  }
  function v1CustomerRows(includeLocal=true){
    const selection=historySelection(state.editions||[],state.edition,customerHistoryFilter),q=search.toLocaleLowerCase('de');if(selection.unknown)return '<div class="m-note">'+esc(selection.message)+'</div>';
    const rows=v1Companies(includeLocal).filter(c=>(!selection.ids||selection.ids.has(String(c.hqId||c.id)))&&(!industryFilter||c.industrialSector===industryFilter)&&(!cityFilter||addr(c)?.city===cityFilter)&&(!ownerFilter||(c.responsibleUsers||[]).some(u=>String(u.userId||u.id)===ownerFilter))&&[c.name,addr(c)?.city,c.industrialSector,...(c.companyTypes||[]).map(t=>t.number)].some(x=>String(x||'').toLocaleLowerCase('de').includes(q)));
    return (selection.message?'<p class="m-note">'+esc(selection.message)+'</p>':'')+rows.map(c=>'<div class="m-listitem"><div><h3><button class="m-link" data-action="company" data-id="'+esc(c.id)+'">'+esc(c.name)+'</button></h3><p>'+esc([addr(c)?.city,c.industrialSector].filter(Boolean).join(' · '))+'</p><div class="m-tags">'+tag(c.localDraftId?localStatus(c):'HQ · nur lesen')+(c.companyTypes||[]).map(t=>tag(t.name)).join('')+'</div></div><div class="m-list-end"><strong>'+(state.edition?.loadedAt?money(revenue(String(c.hqId||c.id))):'Noch nicht importiert')+'</strong><small>'+esc(editionLabel(state.edition))+(state.edition?.complete?'':' · vorläufig')+'</small></div></div>').join('')+(rows.length?'':empty('Keine passenden Kunden im geladenen Datenbestand.'));
  }
  function v1Home(){
    const e=state.edition,run=state.importRun;return head('Mein Tag','Gemeinsamer Datenstand aus Firebase',button('Frisch aus Firebase laden','reload'))+editionSelectors()+
      '<div class="m-summaries"><div class="m-summary"><span>Unternehmen im Bestand</span><b>'+v1Companies().length+'</b><small>Ohne doppelte HQ-Firmen</small></div><div class="m-summary"><span>Fakturierter Netto-Umsatz</span><b>'+(e?.loadedAt?money(revenue()):'Noch nicht importiert')+'</b><small>'+esc(editionLabel(e))+(e?.complete?'':' · vorläufig')+'</small></div><div class="m-summary"><span>Offene Übertragungen</span><b>'+state.jobs.filter(j=>!['synced','canceled'].includes(j.state)).length+'</b><small>Eigene Testfirmen</small></div></div>'+
      (e?.changes?.length?'<p class="m-note">Ausgabe aktualisiert: Ziel '+money(e.changes[0].before.targetCents)+' → '+money(e.settings.targetCents)+' · '+esc(new Date(e.changes[0].at).toLocaleString('de-DE'))+'</p>':'')+
      '<section class="m-panel m-section"><div class="m-panel-head"><h2>'+esc(editionLabel(e))+'</h2></div><div class="m-panel-body"><dl class="m-dl"><dt>Zielumsatz</dt><dd>'+money(e?.settings?.targetCents)+'</dd><dt>Anzeigenschluss</dt><dd>'+esc(e?.settings?.adDeadline||'Noch offen')+'</dd><dt>Drucktermin</dt><dd>'+esc(e?.settings?.printDate||'Noch offen')+'</dd><dt>Veröffentlichung</dt><dd>'+esc(e?.settings?.releaseDate||'Noch offen')+'</dd></dl><p>Letzter Ausgabeimport: '+esc(e?.loadedAt?new Date(e.loadedAt).toLocaleString('de-DE'):'Noch keiner')+'</p>'+button('Datenabgleich öffnen','nav','import')+(run?.errors?.length?'<p class="m-note">Der letzte Import enthält '+run.errors.length+' fehlgeschlagene Abschnitte. Details im Datenabgleich.</p>':'')+'</div></section>';
  }
  function v1Customers(){return head('Kunden','Gemeinsamer Kunden- und Interessentenbestand',button('Testfirma mit Ansprechpartner anlegen','nav','new',true))+editionSelectors()+v1FilterBar()+'<section id="customer-rows" class="m-panel m-section">'+v1CustomerRows()+'</section>';}
  function v1Magazine(){return head('Magazinverkauf','Recherche aus HQ-Rechnungen; aktuelle Verkäufe werden hier noch nicht gebucht.')+editionSelectors()+v1FilterBar()+'<section id="customer-rows" class="m-panel m-section">'+v1CustomerRows(false)+'</section>';}
  function v1Contacts(){
    const contacts=new Map();(state.directory||[]).forEach(e=>(e.contacts||[]).forEach(c=>contacts.set(String(c.id),{...c,companyName:e.company.name,companyId:e.company.id})));
    state.drafts.forEach(d=>{if(!d.contact)return;const j=state.jobs.find(j=>j.id===d.id);contacts.set(String(j?.contactId||'draft_'+d.id),{...d.contact,companyName:d.company.name,companyId:'draft_'+d.id});});
    const q=search.toLocaleLowerCase('de');return head('Ansprechpartner','Alle importierten Kontakte und lokal angelegten Ansprechpartner')+'<label class="m-field">Ansprechpartner suchen<input id="contact-search" value="'+esc(search)+'" placeholder="Name, Firma oder E-Mail"></label><section class="m-panel m-section" id="contact-rows">'+Array.from(contacts.values()).filter(p=>[p.firstName,p.lastName,p.companyName,p.eMail].some(v=>String(v||'').toLocaleLowerCase('de').includes(q))).map(p=>'<div class="m-row"><h3>'+esc([p.salutation,p.firstName,p.lastName].filter(Boolean).join(' '))+'</h3><p>'+esc(p.position||'')+'</p><p>'+esc(p.eMail||'Keine E-Mail')+' · '+esc(p.phoneMobile||p.phoneLandline||'Kein Telefon')+'</p>'+button(p.companyName,'company',p.companyId)+'</div>').join('')+'</section><p class="m-muted">Kontakte erscheinen nach erfolgreichem Kundendetailimport. Noch fehlende Abschnitte stehen im Datenabgleich.</p>';
  }
  function v1Invoices(){
    const e=state.edition;return head('Buchungshistorie','HQ-Rechnungen, Netto-Beträge; keine Bearbeitung von HQ-Belegen')+editionSelectors()+'<p class="m-note">Rechnungen über mehrere Ausgaben bitte als ungeklärt markieren. Eine automatische Verteilung auf Ausgaben findet nicht statt.</p><section class="m-panel">'+(e?.documents||[]).map(d=>'<div class="m-row"><h3>'+esc(v1Companies().find(c=>String(c.hqId||c.id)===d.companyId)?.name||'HQ-Unternehmen '+d.companyId)+'</h3><p>'+esc(d.number)+' · '+esc(d.date)+' · '+esc(d.type)+' · '+money(d.cents)+'</p>'+(state.user.admin?button('Mehrere Ausgaben / Zuordnung ungeklärt','exclude-document',d.id):'')+'</div>').join('')+'</section>'+(e?.excludedDocuments||[]).map(d=>'<div class="m-note">'+esc(d.number||d.id)+' · Von der Summe ausgeschlossen '+(state.user.admin?button('Wieder dieser Ausgabe zuordnen','include-document',d.id):'')+'</div>').join('')+(e?.issues||[]).map(i=>'<p class="m-note">Beleg '+esc(i.id)+': '+esc(i.reason)+'</p>').join('');
  }
  function v1Import(){
    const run=state.importRun;return head('Datenabgleich','Manuell gestartet. Keine nächtlichen oder selbstständigen HQ-Aufrufe.')+'<section class="m-panel"><div class="m-panel-body">'+
      (state.user.admin?button(run?.state==='running'?'Import fortsetzen':'Daten aus HQ aktualisieren','v1-import','',true)+(importLoop?'<button class="m-button" data-action="pause-import">Nach diesem Abschnitt anhalten</button>':''):'')+
      (run?'<p>'+run.done+' von '+run.tasks.length+' bisher bekannten Abschnitten erfolgreich · '+run.errors.length+' Fehler</p><p>'+esc(({running:'Fortsetzbar',completed:'Abgeschlossen',completedWithErrors:'Mit Fehlern beendet'})[run.state]||run.state)+'</p><p>Aktueller Abschnitt: '+esc(run.tasks[run.cursor]?.label||'Keiner')+'</p><p>Letzte Aktualisierung: '+esc(new Date(run.updatedAt).toLocaleString('de-DE'))+'</p>':'<p>Noch kein gemeinsamer Importlauf.</p>')+
      (run?.errors||[]).map(e=>'<p class="m-error">'+esc(e.label)+': '+esc(e.message)+'</p>').join('')+(state.user.admin&&run?.errors?.length&&run.state!=='running'?button('Fehlgeschlagene Abschnitte erneut versuchen','retry-import'):'')+
      '<p class="m-muted">Beim Schließen der App endet die Fortsetzung nach dem bereits gestarteten Abschnitt. Beim nächsten Öffnen kann der gespeicherte Lauf fortgesetzt werden. Bisherige vollständige Daten bleiben bei Abruffehlern erhalten.</p></div></section>'+
      (state.user.admin?'<section class="m-panel m-section"><div class="m-panel-head"><h2>App → HQ</h2></div><div class="m-panel-body"><p>Schreibaufträge weiterhin einzeln ansehen und bewusst übertragen. Unklare Aufträge zuerst rückprüfen.</p>'+button('Offene Änderungen ansehen','nav','test')+'</div></section>':'');
  }
  function v1Admin(){
    let body=admin().replace('COBURGER #70 · Ziel und Termine',esc(editionLabel(state.edition))+' · Ziel und Termine');body=editionSelectors()+body;if(!state.user.admin)return body;
    return body+projectSearchPanel()+'<section class="m-panel m-section"><div class="m-panel-head"><h2>Kunden und Interessenten ohne Magazinrechnung aufnehmen</h2></div><div class="m-panel-body"><form data-form="company-search">'+field('Unternehmen in HQ suchen','term','','text',true)+'<button class="m-button">Unternehmen suchen</button></form>'+(companyResults?'<p>'+companyResults.rows.length+' Treffer'+(companyResults.limited?' · Suche weiter eingrenzen':'')+'</p>'+companyResults.rows.map(c=>'<p>'+esc(c.name)+' '+button('In App-Bestand aufnehmen','add-company',c.id)+'</p>').join(''):'')+'</div></section><div class="m-test-actions">'+button('Datenabgleich öffnen','nav','import')+button('Technische Testseite öffnen','nav','test')+'</div>';
  }
  async function continueV1Import(retry,editionIds){
    if(importLoop)return;importLoop=true;stopImport=false;
    try{
      await act(async()=>{state.importRun=await (retry?rpc('retrySalesImport'):editionIds?rpc('startSalesImport',editionIds):rpc('startSalesImport'));});if(error)return;
      while(!stopImport&&state.importRun?.state==='running'){await act(async()=>{state.importRun=await rpc('runSalesImportStep',state.importRun.id,state.importRun.revision);});if(error)break;}
      const failure=error;await act(async()=>{state=await rpc('getSalesState');return {message:failure?'Import unterbrochen: '+failure:stopImport?'Import angehalten; später fortsetzbar.':state.importRun?.state==='completed'?'Datenimport abgeschlossen.':'Importstand gespeichert. Hinweise im Datenabgleich prüfen.'};});
    }finally{importLoop=false;render();}
  }
  function v1Click(a,id){
    if(a==='pause-import'){stopImport=true;message='Der laufende Abschnitt wird noch abgeschlossen.';render();return true;}
    if(a==='v1-import'||a==='retry-import'){continueV1Import(a==='retry-import').catch(e=>{error=e.message;render();});return true;}
    if(a==='add-company'){act(()=>rpc('addSalesCompany',id),{reload:true});return true;}
    if(a==='exclude-document'||a==='include-document'){act(()=>rpc('setSalesDocumentExcluded',{editionId:state.edition.id,documentId:id,excluded:a==='exclude-document'}),{reload:true});return true;}return false;
  }
  function v1Change(e){
    if(changeProjectChoice(e))return true;
    const name=e.target.name,value=e.target.value;
    if(name==='v1Magazine'){state.edition=(state.editions||[]).filter(x=>x.magazine===value).sort((a,b)=>b.issue-a.issue)[0];selectedEditionId=state.edition.id;}
    else if(name==='v1Edition'){selectedEditionId=value;state.edition=state.editions.find(x=>x.id===value);}
    else if(name==='v1History')customerHistoryFilter=value;else if(name==='v1Industry')industryFilter=value;else if(name==='v1City')cityFilter=value;else if(name==='v1Owner')ownerFilter=value;else return false;
    render();return true;
  }
