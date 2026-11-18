  let businessEditor=null;
  function businessApplyPatch(value,p){
    const data={...value,company:{...value.company}};
    if(p.localCompany){data.company={...data.company,...p.localCompany};if(p.entity==='contact')data.contacts=(data.contacts||[]).map(c=>String(c.id)===String(p.contact.id)?{...c,...p.contact}:c);return data;}
    if(p.entity==='company'){Object.assign(data.company,p.change);if(p.change.homepage!==undefined){data.company.homepageDisplay=p.change.homepage||'';data.company.homepageSource='App';}}
    if(p.entity==='types')data.company.companyTypes=p.change.companyTypes.map(t=>({...t,name:p.typeNames[t.companyTypeId]}));
    if(p.entity==='contact')data.contacts=(data.contacts||[]).map(c=>Number(c.id)===Number(p.targetId)?{...c,...p.change}:c);
    if(p.entity==='address'){
      const update=a=>a&&Number(a.id)===Number(p.targetId)?{...a,...p.change}:a;
      data.company.defaultAddress=update(data.company.defaultAddress);data.company.addresses=(data.company.addresses||[]).map(update);
    }return data;
  }
  function businessAcceptPatch(p,patch){
    const matches=c=>String(c?.hqId||c?.id)===String(p.companyId)||String(c?.id)===String(p.companyId);
    for(const [key,value] of companyCache)if(matches(value?.company))companyCache.set(key,businessApplyPatch(value,p));
    if(matches(detail?.company))detail=businessApplyPatch(detail,p);
    if(matches(detail?.company))companyCache.set(String(detail.company.id),detail);
    const company=detail?.company;if(!company)return;
    const update=c=>matches(c)?{...c,...company,id:c.id,...(c.localDraftId?{localDraftId:c.localDraftId,hqId:c.hqId}:{} )}:c;
    for(const container of [state,...viewCache.values()]){
      for(const [field,item] of [['drafts',patch?.draft],['jobs',patch?.job]])if(item&&container[field])container[field]=container[field].map(x=>x.id===item.id?item:x);
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
    return '<div class="m-company-addresses"><h3>Firmenadressen</h3>'+Array.from(rows.values()).map(a=>{const target=a.id||c.localDraftId&&!['synced','canceled'].includes(c.syncState)&&c.id+'_address';return '<div class="m-row"><h4>'+esc(a.description||'Adresse')+'</h4><p>'+esc([a.street,a.houseNumber,a.zipCode,a.city,a.country].filter(Boolean).join(' '))+'</p>'+(target?button('Adresse bearbeiten','edit-business','address:'+target):'')+'</div>';}).join('')+'</div>';
  }
  function businessCustomFields(value){
    const rows=[...(value||[])];for(const f of businessEditor.customFieldDefinitions||[])if(!rows.some(x=>x.name===f.name)&&['Text','TextMultiline','Date','Dropdown','DropdownCheckbox','Boolean','Link','Float','Integer','NumericText'].includes(f.type))rows.push({name:f.name,type:f.type,value:null});return rows;
  }
  function businessCustomText(f){
    if(f.type==='Date')return String(f.value||'').slice(0,10);
    if(f.type==='DropdownCheckbox'&&Array.isArray(f.value)&&f.value.every(v=>typeof v==='string'))return f.value.join('\n');
    return f.value&&typeof f.value==='object'?JSON.stringify(f.value):String(f.value??'');
  }
  function businessCustomInput(f,name){
    const value=businessCustomText(f);
    if(f.type==='DropdownCheckbox')return '<label class="m-field">'+esc(f.name)+'<textarea name="'+esc(name)+'" aria-label="'+esc(f.name)+'" maxlength="2000">'+esc(value)+'</textarea><small>Mehrere Werte: ein Wert pro Zeile.</small></label>';
    if(f.type==='Boolean')return select(f.name,name,[{id:'',name:'Nicht hinterlegt'},{id:'true',name:'Ja'},{id:'false',name:'Nein'}],value);
    return field(f.name,name,value,f.type==='Date'?'date':'text');
  }
  function businessNewCompanyFields(catalog){return ['erstelldatum','Kundenherkunft'].map(name=>{const f=(catalog.fields||[]).find(x=>x.name.trim().toLowerCase()===name.toLowerCase());return f?businessCustomInput({...f,value:null},name):'<p class="m-muted">HQ-Feld „'+esc(name)+'“ ist noch nicht als Firmenfeld bestätigt.</p>';}).join('');}
  function businessCompanyCustomDetails(c){return ['erstelldatum','Kundenklassifizierung','Kundenherkunft','Adressherkunft'].map(name=>{const f=(c.customFields||[]).find(x=>x.name.trim().toLowerCase()===name.toLowerCase()),v=f?.type==='Date'?dateLabel(f.value):Array.isArray(f?.value)?f.value.join(', '):f?.value;return '<dt>'+esc(f?.name||name)+'</dt><dd>'+esc(v===undefined||v===null||v===''?'Nicht hinterlegt':v)+'</dd>';}).join('');}
  function businessCustomValue(f,text){
    if(text==='')return null;
    if(f.type==='Date')return text+'T00:00:00Z';
    if(f.type==='DropdownCheckbox'){if(text.trim().startsWith('[')){try{const rows=JSON.parse(text);if(!Array.isArray(rows)||rows.some(v=>typeof v!=='string'))throw Error();return rows;}catch(_){throw Error('Bitte einen Wert pro Zeile bei „'+f.name+'“ eingeben.');}}return [...new Set(text.split(/\r?\n/).map(v=>v.trim()).filter(Boolean))];}
    if(typeof f.value==='boolean'||f.type==='Boolean'){if(!['true','false'].includes(text))throw Error('Bitte Ja oder Nein bei „'+f.name+'“ auswählen.');return text==='true';}
    if(typeof f.value==='number'||['Float','Integer'].includes(f.type)){const n=Number(text);if(!Number.isFinite(n)||f.type==='Integer'&&!Number.isInteger(n))throw Error('Bitte eine gültige Zahl bei „'+f.name+'“ eingeben.');return n;}
    if(f.value&&typeof f.value==='object'||f.type==='DropdownCheckbox'){try{const v=JSON.parse(text);if(f.type==='DropdownCheckbox'&&!Array.isArray(v))throw Error();return v;}catch(_){throw Error('Bitte eine gültige Liste bei „'+f.name+'“ eingeben, z. B. ["Wert"].');}}
    return text;
  }
  const businessLabels={name:'Firmenname',industrialSector:'Branche',description:'Beschreibung',iban:'IBAN',bic:'BIC',homepage:'Homepage',vatId:'Umsatzsteuer-ID',financesChargeRateId:'Steuersatz-ID',standardDeliveryConditionId:'Standard-Lieferbedingung-ID',standardPaymentConditionId:'Standard-Zahlungsbedingung-ID',debitorNumber:'Debitorennummer',creditorNumber:'Kreditorennummer',documentDefaultMailEntityId:'Standard-E-Mail-ID für Dokumente',routingId:'Leitweg-ID',eInvoiceType:'E-Rechnung',customFields:'Eigene HQ-Felder',alternativeCompanyName:'Abweichender Firmenname',additionalInformation:'Zusätzliche Informationen',street:'Straße',houseNumber:'Hausnummer',zipCode:'Postleitzahl',city:'Ort',country:'Land',phone:'Telefon',email:'E-Mail',fax:'Fax',website:'Website',addressLine2:'Adresszeile 2',standardForDocumentType:'Standard für Dokumentart',firstName:'Vorname',lastName:'Nachname',position:'Position',phoneLandline:'Festnetztelefon',phoneMobile:'Mobiltelefon',eMail:'E-Mail',salutation:'Anrede',salutationForm:'Ansprache',language:'Sprache',birthdate:'Geburtsdatum',note:'Notiz',defaultAddress:'Kontaktadresse'};
  function businessFields(schema,value,path=''){
    return Object.entries(schema.properties).map(([key,s])=>{
      const name=path?path+'.'+key:key,v=value?.[key],label=businessLabels[key]||key;
      if(s.type==='object')return '<fieldset class="m-full"><legend>'+esc(label)+'</legend>'+businessFields(s,v||{},name)+'</fieldset>';
      if(s.type==='array'){
        if(key==='companyTypes')return '<fieldset class="m-full"><legend>Firmenarten und Kundennummern</legend>'+(businessEditor.types||[]).map(t=>{const old=(v||[]).find(x=>Number(x.companyTypeId)===Number(t.id));return '<label class="m-field"><span><input type="checkbox" name="type.'+esc(t.id)+'" '+(old?'checked':'')+'> '+esc(t.name)+'</span></label>'+field('Nummer · '+t.name,'number.'+t.id,old?.number||'');}).join('')+'</fieldset>';
        if(key==='customFields')return '<fieldset class="m-full"><legend>'+esc(label)+'</legend>'+businessCustomFields(v).map((f,i)=>businessCustomInput(f,'custom.'+i)).join('')+'</fieldset>';
        return '';
      }
      if(s.enum)return select(label,name,[...(s.nullable||v===undefined||v===null?[{id:'',name:'Nicht hinterlegt'}]:[]),...s.enum.map(x=>({id:x,name:({Formal:'Formell',Informal:'Informell',Neutral:'Neutral',None:'Keine',XRechnung:'XRechnung'})[x]||x}))],v??'');
      if(s.type==='boolean')return select(label,name,[{id:'',name:'Nicht hinterlegt'},{id:'true',name:'Ja'},{id:'false',name:'Nein'}],v===undefined||v===null?'':String(v));
      if(['description','note','additionalInformation'].includes(key))return '<label class="m-field m-full">'+esc(label)+'<textarea name="'+esc(name)+'" maxlength="20000">'+esc(v??'')+'</textarea></label>';
      return field(label,name,v??'',s.type==='integer'||s.type==='number'?'number':'text',!path&&schema.required?.includes(key)&&!s.nullable);
    }).join('');
  }
  function businessPage(){return head('Stammdaten bearbeiten',businessEditor.companyName,button('Zur Firma','company',selected))+'<section class="m-panel"><div class="m-panel-body"><p>'+(businessEditor.deferred?'Die ursprüngliche HQ-Anlage ist noch offen. Änderungen werden separat in Firebase vorgemerkt und erst nach deren Abschluss übertragen. ':'')+'Nur geänderte Felder werden vorgemerkt. Übertragung beim gemeinsamen HQ-Sync. Nummern und Zuordnungen bitte nur mit den passenden HQ-Werten ändern.</p><form data-form="business" class="m-form">'+businessFields(businessEditor.schema,businessEditor.base)+'<div class="m-full"><button class="m-button m-primary">Änderungen in Firebase speichern</button></div></form></div></section>';}
  function businessChanges(schema,base,input,path=''){
    const out={};for(const [key,s] of Object.entries(schema.properties)){
      const name=path?path+'.'+key:key,old=base?.[key];
      if(s.type==='array'){
        if(key==='companyTypes'){const values=(businessEditor.types||[]).filter(t=>input['type.'+t.id]).map(t=>({companyTypeId:Number(t.id),number:input['number.'+t.id]||null}));if(JSON.stringify(values)!==JSON.stringify(old))out[key]=values;continue;}
        if(key==='customFields'){const values=businessCustomFields(old).flatMap((f,i)=>{const text=input['custom.'+i],exists=(old||[]).some(x=>x.name===f.name);if(text===undefined||text===businessCustomText(f))return exists?[f]:[];return [{...f,value:businessCustomValue(f,text)}];});if(JSON.stringify(values)!==JSON.stringify(old||[]))out[key]=values;}
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
    let [entity,targetId]=b.dataset.id.split(':');act(async()=>{const companyEntity=['company','types'].includes(entity),current=!companyEntity||[detail?.company?.id,detail?.company?.hqId].map(String).includes(String(targetId)),local=current&&detail?.company?.localDraftId&&detail.company.syncState!=='synced';const companyId=local?detail.company.id:companyEntity?targetId:detail.company.hqId||detail.company.id;if(local)targetId=companyEntity?companyId:companyId+'_'+entity;if(String(local?detail?.company?.id:detail?.company?.hqId||detail?.company?.id)!==String(companyId)){detail=await loadCompany(companyId);selected=detail.company.id;}businessEditor=await rpc('getSalesEditor',{companyId,entity,targetId});view='business';});
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
      const signature=JSON.stringify(change);if(businessEditor.pending?.signature!==signature)businessEditor.pending={signature,requestId:communicationId()};
      const r=await rpc('saveSalesEntityChange',{companyId:businessEditor.companyId,entity:businessEditor.entity,targetId:businessEditor.targetId,base:businessEditor.base,revision:businessEditor.revision,requestId:businessEditor.pending.requestId,change});
      businessAcceptPatch(r.entityPatch,r.patch);view='company';return r;
    },{preserve:true});
  });
