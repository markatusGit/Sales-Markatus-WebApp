  let businessEditor=null;
  function businessApplyPatch(value,p){
    const data={...value,company:{...value.company}};
    if(p.entity==='company'){Object.assign(data.company,p.change);if(p.change.homepage!==undefined){data.company.homepageDisplay=p.change.homepage||'';data.company.homepageSource='App';}}
    if(p.entity==='types')data.company.companyTypes=p.change.companyTypes.map(t=>({...t,name:p.typeNames[t.companyTypeId]}));
    if(p.entity==='contact')data.contacts=(data.contacts||[]).map(c=>Number(c.id)===Number(p.targetId)?{...c,...p.change}:c);
    if(p.entity==='address'){
      const update=a=>a&&Number(a.id)===Number(p.targetId)?{...a,...p.change}:a;
      data.company.defaultAddress=update(data.company.defaultAddress);data.company.addresses=(data.company.addresses||[]).map(update);
    }return data;
  }
  function businessAcceptPatch(p){
    const matches=c=>String(c?.hqId||c?.id)===String(p.companyId);
    for(const [key,value] of companyCache)if(matches(value?.company))companyCache.set(key,businessApplyPatch(value,p));
    if(matches(detail?.company))detail=businessApplyPatch(detail,p);
    const company=detail?.company;if(!company)return;
    const update=c=>matches(c)?{...c,...company,id:c.id,...(c.localDraftId?{localDraftId:c.localDraftId,hqId:c.hqId}:{} )}:c;
    for(const container of [state,...viewCache.values()]){
      if(container.companies)container.companies=container.companies.map(update);
      if(container.localCompanies)container.localCompanies=container.localCompanies.map(update);
      if(container.directory)container.directory=container.directory.map(e=>matches(e.company)?businessApplyPatch(e,p):e);
    }
  }
  function businessBindPanel(p){
    if(state.user.admin&&p.job.kind==='createContact'&&p.job.state==='uncertain'&&!p.job.contactId)return '<form data-form="bind-customer-contact" class="m-form"><p class="m-full">HQ-Anlageantwort fehlt. Den Ansprechpartner zuerst in HQ manuell prüfen. Nur die eindeutig geprüfte ID zuordnen; keinen zweiten Kontakt anlegen.</p>'+field('Manuell geprüfte HQ-Kontakt-ID','hqId','','number',true)+'<button class="m-button">Vorhandenen HQ-Kontakt prüfen und zuordnen</button></form>';
    if(!state.user.admin||p.job.kind!=='createCompany'||p.job.markerMode!=='none'||p.job.hqId||p.job.state!=='uncertain')return '';
    return '<form data-form="bind-company" class="m-form"><p class="m-full">Die Antwort auf die Firmenanlage fehlt. Zuerst in HQ prüfen, ob genau diese Firma angelegt wurde. Nur deren vorhandene HQ-ID zuordnen; keine neue Firma anlegen.</p>'+field('Manuell geprüfte HQ-Firmen-ID','hqId','','number',true)+'<button class="m-button">Vorhandene HQ-Firma prüfen und zuordnen</button></form>';
  }
  function businessAddresses(c){
    const rows=new Map([c.defaultAddress,...c.addresses||[]].filter(Boolean).map((a,i)=>[a.id?String(a.id):'local_'+i,a]));
    return '<div class="m-company-addresses"><h3>Firmenadressen</h3>'+Array.from(rows.values()).map(a=>'<div class="m-row"><h4>'+esc(a.description||'Adresse')+'</h4><p>'+esc([a.street,a.houseNumber,a.zipCode,a.city,a.country].filter(Boolean).join(' '))+'</p>'+(a.id?button('Adresse bearbeiten','edit-business','address:'+a.id):'')+'</div>').join('')+'</div>';
  }
  const businessLabels={name:'Firmenname',industrialSector:'Branche',description:'Beschreibung',iban:'IBAN',bic:'BIC',homepage:'Homepage',vatId:'Umsatzsteuer-ID',financesChargeRateId:'Steuersatz-ID',standardDeliveryConditionId:'Standard-Lieferbedingung-ID',standardPaymentConditionId:'Standard-Zahlungsbedingung-ID',debitorNumber:'Debitorennummer',creditorNumber:'Kreditorennummer',documentDefaultMailEntityId:'Standard-E-Mail-ID für Dokumente',routingId:'Leitweg-ID',eInvoiceType:'E-Rechnung',customFields:'Eigene HQ-Felder',alternativeCompanyName:'Abweichender Firmenname',additionalInformation:'Zusätzliche Informationen',street:'Straße',houseNumber:'Hausnummer',zipCode:'Postleitzahl',city:'Ort',country:'Land',phone:'Telefon',email:'E-Mail',fax:'Fax',website:'Website',addressLine2:'Adresszeile 2',standardForDocumentType:'Standard für Dokumentart',firstName:'Vorname',lastName:'Nachname',position:'Position',phoneLandline:'Festnetztelefon',phoneMobile:'Mobiltelefon',eMail:'E-Mail',salutation:'Anrede',salutationForm:'Ansprache',language:'Sprache',birthdate:'Geburtsdatum',note:'Notiz',defaultAddress:'Kontaktadresse'};
  function businessFields(schema,value,path=''){
    return Object.entries(schema.properties).map(([key,s])=>{
      const name=path?path+'.'+key:key,v=value?.[key],label=businessLabels[key]||key;
      if(s.type==='object')return '<fieldset class="m-full"><legend>'+esc(label)+'</legend>'+businessFields(s,v||{},name)+'</fieldset>';
      if(s.type==='array'){
        if(key==='companyTypes')return '<fieldset class="m-full"><legend>Firmenarten und Kundennummern</legend>'+(businessEditor.types||[]).map(t=>{const old=(v||[]).find(x=>Number(x.companyTypeId)===Number(t.id));return '<label class="m-field"><span><input type="checkbox" name="type.'+esc(t.id)+'" '+(old?'checked':'')+'> '+esc(t.name)+'</span></label>'+field('Nummer · '+t.name,'number.'+t.id,old?.number||'');}).join('')+'</fieldset>';
        if(key==='customFields')return '<fieldset class="m-full"><legend>'+esc(label)+'</legend>'+(v||[]).map((f,i)=>field(f.name,'custom.'+i,typeof f.value==='object'?JSON.stringify(f.value):String(f.value??''),'text')).join('')+'<p class="m-muted">Vorhandene HQ-Felder behalten ihren Feldtyp. Mehrfachauswahlen bleiben als Liste erhalten.</p></fieldset>';
        return '';
      }
      if(s.enum)return select(label,name,[...(s.nullable||v===undefined||v===null?[{id:'',name:'Nicht hinterlegt'}]:[]),...s.enum.map(x=>({id:x,name:({Formal:'Formell',Informal:'Informell',Neutral:'Neutral',None:'Keine',XRechnung:'XRechnung'})[x]||x}))],v??'');
      if(s.type==='boolean')return select(label,name,[{id:'',name:'Nicht hinterlegt'},{id:'true',name:'Ja'},{id:'false',name:'Nein'}],v===undefined||v===null?'':String(v));
      if(['description','note','additionalInformation'].includes(key))return '<label class="m-field m-full">'+esc(label)+'<textarea name="'+esc(name)+'" maxlength="20000">'+esc(v??'')+'</textarea></label>';
      return field(label,name,v??'',s.type==='integer'||s.type==='number'?'number':'text',!path&&schema.required?.includes(key)&&!s.nullable);
    }).join('');
  }
  function businessPage(){return head('Stammdaten bearbeiten',businessEditor.companyName,button('Zur Firma','company',selected))+'<section class="m-panel"><div class="m-panel-body"><p>Nur geänderte Felder werden vorgemerkt. Übertragung beim gemeinsamen HQ-Sync. Nummern und Zuordnungen bitte nur mit den passenden HQ-Werten ändern.</p><form data-form="business" class="m-form">'+businessFields(businessEditor.schema,businessEditor.base)+'<div class="m-full"><button class="m-button m-primary">Änderungen in Firebase speichern</button></div></form></div></section>';}
  function businessChanges(schema,base,input,path=''){
    const out={};for(const [key,s] of Object.entries(schema.properties)){
      const name=path?path+'.'+key:key,old=base?.[key];
      if(s.type==='array'){
        if(key==='companyTypes'){const values=(businessEditor.types||[]).filter(t=>input['type.'+t.id]).map(t=>({companyTypeId:Number(t.id),number:input['number.'+t.id]||null}));if(JSON.stringify(values)!==JSON.stringify(old))out[key]=values;continue;}
        if(key==='customFields'&&old?.length){const values=old.map((f,i)=>{const text=input['custom.'+i];let value=text;if(typeof f.value==='number')value=Number(text);else if(typeof f.value==='boolean'){if(!['true','false'].includes(text))throw Error('Bitte true oder false bei „'+f.name+'“ eingeben.');value=text==='true';}else if(f.value&&typeof f.value==='object'){try{value=JSON.parse(text);}catch(_){throw Error('Die Mehrfachauswahl bei „'+f.name+'“ ist ungültig.');}}return {...f,value};});if(JSON.stringify(values)!==JSON.stringify(old))out[key]=values;}
        continue;
      }
      if(s.type==='object'){const nested=businessChanges(s,old||{},input,name);if(Object.keys(nested).length)out[key]={...(old||{}),...nested};continue;}
      let raw=input[name];if(raw===undefined)continue;
      // An unchanged empty field must not turn absent/null into a new value.
      if(raw===String(old??''))continue;
      let value=raw===''&&s.nullable?null:s.type==='integer'||s.type==='number'?Number(raw):s.type==='boolean'?raw==='true':raw;
      out[key]=value;
    }return out;
  }
  root.addEventListener('click',e=>{
    const b=e.target.closest('[data-action="edit-business"]');if(!b||busy)return;e.stopImmediatePropagation();
    const [entity,targetId]=b.dataset.id.split(':');act(async()=>{const companyId=['company','types'].includes(entity)?targetId:detail.company.hqId||detail.company.id;if(String(detail?.company?.hqId||detail?.company?.id)!==String(companyId)){detail=await loadCompany(companyId);selected=detail.company.id;}businessEditor=await rpc('getSalesEditor',{companyId,entity,targetId});view='business';});
  });
  root.addEventListener('submit',e=>{
    if(e.target.dataset.form==='bind-customer-contact'){
      e.preventDefault();e.stopImmediatePropagation();if(busy||!e.target.reportValidity())return;
      const hqId=e.target.elements.hqId.value;act(async()=>{const r=await rpc('bindSalesCustomerContact',preview.job.id,hqId);preview=await rpc('getSalesJobPreview',preview.job.id);return r;});return;
    }
    if(e.target.dataset.form==='bind-company'){
      e.preventDefault();e.stopImmediatePropagation();if(busy||!e.target.reportValidity())return;
      const hqId=e.target.elements.hqId.value;act(async()=>{const r=await rpc('bindSalesCompanyResult',preview.job.id,hqId);preview=await rpc('getSalesJobPreview',preview.job.id);return r;});return;
    }
    if(e.target.dataset.form!=='business')return;e.preventDefault();e.stopImmediatePropagation();if(busy||!e.target.reportValidity())return;
    const input=Object.fromEntries(new FormData(e.target));act(async()=>{
      const change=businessChanges(businessEditor.schema,businessEditor.base,input);if(!Object.keys(change).length)return {message:'Keine Änderungen eingegeben.'};
      const r=await rpc('saveSalesEntityChange',{companyId:businessEditor.companyId,entity:businessEditor.entity,targetId:businessEditor.targetId,base:businessEditor.base,change});
      businessAcceptPatch(r.entityPatch);view='company';return r;
    });
  });
