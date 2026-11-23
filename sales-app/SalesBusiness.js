  let businessEditor=null;
  const customerFormDrafts=new Map(),customerNewIndustries=new Set();let customerBranchDialog=null;
  const customerToday=()=>localContactTime().slice(0,10);
  function customerFormValues(key,base,catalog){if(!customerFormDrafts.has(key)){const markatus=(catalog.subsystems||[]).filter(x=>x.name.trim().toLowerCase()==='markatus');customerFormDrafts.set(key,{...base,subsystemId:base.subsystemId||(markatus.length===1?String(markatus[0].id):''),country:base.country||'DE',erstelldatum:base.erstelldatum||customerToday()});}return customerFormDrafts.get(key);}
  function customerBeforeRender(){const f=root.querySelector('[data-customer-form]');if(f)customerFormDrafts.set(f.dataset.customerForm,Object.fromEntries(new FormData(f)));}
  function customerOptions(rows,value,fallback){return [{id:'',name:'Bitte auswählen'},...rows,...(value&&!rows.some(x=>String(x.id)===String(value))?[{id:value,name:fallback}]:[])];}
  function customerFields(catalog,v,key){
    return '<div class="m-full m-form" data-customer-fields>'+field('Unternehmensname','name',v.name||'','text',true)+select('Firmenart','companyTypeId',customerOptions(catalog.types,v.companyTypeId,'Bisherige Firmenart'),v.companyTypeId||'')+
      select('Branche','industrialSector',[{id:'',name:'Bitte auswählen'},...[...new Set([...(catalog.industries||[]),...customerNewIndustries,...(v.industrialSector?[v.industrialSector]:[])])].map(name=>({id:name,name})),{id:'__new__',name:'+ Neue Branche anlegen'}],v.industrialSector||'')+'<input type="hidden" name="newIndustry" value="'+(customerNewIndustries.has(v.industrialSector)?'true':'false')+'">'+
      select('HQ-Unternehmensbereich','subsystemId',customerOptions(catalog.subsystems,v.subsystemId,'Bisheriger Unternehmensbereich'),v.subsystemId||'')+select('Verantwortlicher Benutzer','responsibleUserId',customerOptions(catalog.users,v.responsibleUserId,'Bisheriger Benutzer'),v.responsibleUserId||'')+
      field('Homepage','homepage',v.homepage||'','text')+'<label class="m-field m-full">Beschreibung<textarea name="description" maxlength="20000">'+esc(v.description||'')+'</textarea></label>'+
      '<fieldset class="m-full m-form"><legend>Adresse</legend>'+field('Straße','street',v.street||'','text',true)+field('Hausnummer','houseNumber',v.houseNumber||'')+field('Postleitzahl','zipCode',v.zipCode||'','text',true)+field('Ort','city',v.city||'','text',true)+field('Land (Code)','country',v.country||'DE','text',true)+'</fieldset>'+
      field('Erstelldatum','erstelldatum',v.erstelldatum||customerToday(),'date')+customerReasonField(catalog,v.addressCreationReason||'')+'</div>';
  }
  function customerReasonField(catalog,value){
    const f=(catalog.fields||[]).find(x=>x.name.trim().toLowerCase()==='grund der adressanlage');
    if(!f)return '<label class="m-field">Grund der Adressanlage<input name="addressCreationReason" value="'+esc(value)+'" readonly><small>HQ-Feld noch nicht geladen. Wird beim nächsten zentralen Datenabgleich geprüft.</small></label>';
    const selected=value?value.split('\n'):[],options=[...new Set([...(f.options||[]),...selected])];
    if(f.type==='Dropdown')return select('Grund der Adressanlage','addressCreationReason',[{id:'',name:'Nicht hinterlegt'},...options.map(name=>({id:name,name}))],value);
    if(f.type==='DropdownCheckbox')return '<div class="m-field"><span>Grund der Adressanlage</span><input type="hidden" name="addressCreationReason" value="'+esc(value)+'"><details class="m-origin-select"><summary aria-label="Grund der Adressanlage auswählen">'+esc(selected.join(', ')||'Bitte auswählen')+'</summary><div role="group" aria-label="Grund der Adressanlage">'+options.map(option=>'<label><input type="checkbox" data-customer-reason value="'+esc(option)+'" '+(selected.includes(option)?'checked':'')+'> '+esc(option)+'</label>').join('')+'</div></details></div>';
    return businessCustomInput({...f,value},'addressCreationReason');
  }
  function customerCatalogTools(){return '<p class="m-muted">Auswahllisten aus Firebase · Aktualisierung beim zentralen Datenabgleich.</p>';}
  function customerBranchHtml(){return customerBranchDialog?'<dialog class="m-contact-dialog m-branch-dialog"><form data-form="customer-branch"><h2>Neue Branche</h2>'+field('Bezeichnung','branch',customerBranchDialog.value||'','text',true)+'<p class="m-muted">Wird mit dem Kunden gespeichert und beim HQ-Abgleich übertragen.</p><div class="m-test-actions"><button class="m-button m-primary">Anlegen</button>'+button('Abbrechen','customer-branch-cancel')+'</div></form></dialog>':'';}
  function customerAfterRender(){for(const f of root.querySelectorAll('[data-customer-form]'))for(const name of ['companyTypeId','subsystemId','responsibleUserId'])f.elements[name].required=true;const dialog=root.querySelector('.m-branch-dialog');if(dialog){dialog.showModal();dialog.addEventListener('cancel',e=>{e.preventDefault();customerBranchDialog=null;render();});dialog.querySelector('input').maxLength=150;dialog.querySelector('input').pattern='.*\\S.*';dialog.querySelector('input').focus();}}
  root.addEventListener('change',e=>{const f=e.target.closest('[data-customer-form]');if(!f)return;
    if(e.target.matches('[data-customer-reason]')){const values=[...f.querySelectorAll('[data-customer-reason]:checked')].map(x=>x.value);f.elements.addressCreationReason.value=values.join('\n');f.querySelector('.m-origin-select summary').textContent=values.join(', ')||'Bitte auswählen';}
    if(e.target.name==='industrialSector'){if(e.target.value==='__new__'){e.target.value=customerFormDrafts.get(f.dataset.customerForm)?.industrialSector||'';customerBeforeRender();customerBranchDialog={key:f.dataset.customerForm,value:''};render();return;}f.elements.newIndustry.value=String(customerNewIndustries.has(e.target.value));const draft=customerFormDrafts.get(f.dataset.customerForm);draft.industrialSector=e.target.value;draft.newIndustry=f.elements.newIndustry.value;}
  });
  root.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b||busy)return;
    if(b.dataset.action==='customer-branch-cancel'){e.stopImmediatePropagation();customerBranchDialog=null;render();}
    if(b.dataset.action==='customer-catalog'){e.stopImmediatePropagation();act(async()=>{const r=await rpc('getSalesEditor',{entity:'catalog',force:true});state.catalog=r.catalog;if(businessEditor?.entity==='customer')businessEditor.catalog=r.catalog;const cached=viewCache.get('new');if(cached)cached.catalog=r.catalog;return {message:'Gespeicherte Auswahllisten geladen.'};});}
  });
  root.addEventListener('submit',e=>{if(e.target.dataset.form!=='customer-branch')return;e.preventDefault();e.stopImmediatePropagation();if(busy||!e.target.reportValidity())return;
    const name=e.target.elements.branch.value.trim().replace(/\s+/g,' ');if(!name||name.length>150)return;const catalog=businessEditor?.entity==='customer'&&view==='business'?businessEditor.catalog:state.catalog,known=(catalog.industries||[]).find(x=>x.toLocaleLowerCase('de')===name.toLocaleLowerCase('de')),value=known||name;
    if(!known){catalog.industries=[...(catalog.industries||[]),value].sort((a,b)=>a.localeCompare(b,'de'));customerNewIndustries.add(value);}const draft=customerFormDrafts.get(customerBranchDialog.key);draft.industrialSector=value;draft.newIndustry=String(!known||customerNewIndustries.has(value));const form=root.querySelector('[data-customer-form]');if(form){if(![...form.elements.industrialSector.options].some(o=>o.value===value))form.elements.industrialSector.add(new Option(value,value));form.elements.industrialSector.value=value;form.elements.newIndustry.value=draft.newIndustry;}customerBranchDialog=null;render();
  });
  function businessApplyPatch(value,p){
    const data={...value,company:{...value.company}};
    if(p.localCompany){data.company={...data.company,...p.localCompany};if(p.entity==='contact')data.contacts=(data.contacts||[]).map(c=>String(c.id)===String(p.contact.id)?{...c,...p.contact}:c);return data;}
    if(p.entity==='company'){Object.assign(data.company,p.change);if(p.change.homepage!==undefined){data.company.homepageDisplay=p.change.homepage||'';data.company.homepageSource='App';}}
    if(p.entity==='types')data.company.companyTypes=p.change.companyTypes.map(t=>({...t,name:p.typeNames[t.companyTypeId]}));
    if(p.entity==='assignments'){
      if(p.change.responsibleUserIds)data.company.responsibleUsers=p.change.responsibleUserIds.map(id=>({userId:id,firstName:(p.userNames||[]).find(u=>Number(u.id)===id)?.name||'',lastName:''}));
      if(p.change.subsystemIds)data.company.subsystems=p.change.subsystemIds.map(id=>({id,name:(p.subsystemNames||[]).find(s=>Number(s.id)===id)?.name||''}));
    }
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
    return '<div class="m-company-addresses"><h3>Firmenadressen</h3>'+Array.from(rows.values()).map(a=>{const target=a.id||c.localDraftId&&!['synced','canceled'].includes(c.syncState)&&c.id+'_address';return '<div class="m-row"><h4>'+esc(a.description||'Adresse')+'</h4><p>'+esc([a.street,a.houseNumber,a.zipCode,a.city,a.country].filter(Boolean).join(' '))+'</p>'+(a===c.defaultAddress?button('Adresse bearbeiten','edit-business','company:'+(c.localDraftId&&c.syncState!=='synced'?c.id:c.hqId||c.id)):'')+'</div>';}).join('')+'</div>';
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
  function businessCompanyCustomDetails(c){return ['Erstelldatum','Kundenklassifizierung','Grund der Adressanlage'].map(name=>{const f=(c.customFields||[]).find(x=>x.name.trim().toLowerCase()===name.toLowerCase()),v=f?.type==='Date'?dateLabel(f.value):Array.isArray(f?.value)?f.value.join(', '):f?.value;return '<dt>'+esc(name)+'</dt><dd>'+esc(v===undefined||v===null||v===''?'Nicht hinterlegt':v)+'</dd>';}).join('');}
  function businessPreviewValue(value){
    if(Array.isArray(value))return value.map(businessPreviewValue);
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,businessPreviewValue(key==='customFields'&&Array.isArray(v)?v.filter(f=>f.name.trim().toLowerCase()!=='kundenherkunft'):v)]));
    return value;
  }
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
        if(key==='customFields')return '<fieldset class="m-full"><legend>'+esc(label)+'</legend>'+businessCustomFields(v).map((f,i)=>['kundenherkunft','adressherkunft'].includes(f.name.trim().toLowerCase())?'':businessCustomInput(f,'custom.'+i)).join('')+'</fieldset>';
        return '';
      }
      if(s.enum)return select(label,name,[...(s.nullable||v===undefined||v===null?[{id:'',name:'Nicht hinterlegt'}]:[]),...s.enum.map(x=>({id:x,name:({Formal:'Formell',Informal:'Informell',Neutral:'Neutral',None:'Keine',XRechnung:'XRechnung'})[x]||x}))],v??'');
      if(s.type==='boolean')return select(label,name,[{id:'',name:'Nicht hinterlegt'},{id:'true',name:'Ja'},{id:'false',name:'Nein'}],v===undefined||v===null?'':String(v));
      if(['description','note','additionalInformation'].includes(key))return '<label class="m-field m-full">'+esc(label)+'<textarea name="'+esc(name)+'" maxlength="20000">'+esc(v??'')+'</textarea></label>';
      return field(label,name,v??'',s.type==='integer'||s.type==='number'?'number':'text',!path&&schema.required?.includes(key)&&!s.nullable);
    }).join('');
  }
  function businessPage(){const customer=businessEditor.entity==='customer',key='edit_'+businessEditor.companyId;return head('Stammdaten bearbeiten',businessEditor.companyName,button('Zur Firma','company',selected))+'<section class="m-panel"><div class="m-panel-body"><p>'+(businessEditor.deferred?'Die ursprüngliche HQ-Anlage ist noch offen. Änderungen werden separat in Firebase vorgemerkt und erst nach deren Abschluss übertragen. ':'')+'Speicherung in der App; Übertragung beim gemeinsamen HQ-Abgleich.</p>'+(customer?customerCatalogTools(businessEditor.catalog):'')+'<form data-form="business" '+(customer?'data-customer-form="'+esc(key)+'"':'')+' class="m-form">'+(customer?customerFields(businessEditor.catalog,customerFormValues(key,businessEditor.base,businessEditor.catalog),key):businessFields(businessEditor.schema,businessEditor.base))+'<div class="m-full"><button class="m-button m-primary">Änderungen in Firebase speichern</button></div></form></div></section>'+customerBranchHtml();}
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
    let [entity,targetId]=b.dataset.id.split(':');act(async()=>{const companyEntity=['company','types'].includes(entity),current=!companyEntity||[detail?.company?.id,detail?.company?.hqId].map(String).includes(String(targetId)),local=current&&detail?.company?.localDraftId&&detail.company.syncState!=='synced';const companyId=local?detail.company.id:companyEntity?targetId:detail.company.hqId||detail.company.id;if(local)targetId=companyEntity?companyId:companyId+'_'+entity;if(String(local?detail?.company?.id:detail?.company?.hqId||detail?.company?.id)!==String(companyId)){detail=await loadCompany(companyId);selected=detail.company.id;}businessEditor=await rpc('getSalesEditor',{companyId,entity:entity==='company'?'customer':entity,targetId});customerFormDrafts.delete('edit_'+companyId);view='business';});
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
      const change=businessEditor.entity==='customer'?input:businessChanges(businessEditor.schema,businessEditor.base,input);if(!Object.keys(change).length)return {message:'Keine Änderungen eingegeben.'};
      const signature=JSON.stringify(change);if(businessEditor.pending?.signature!==signature)businessEditor.pending={signature,requestId:communicationId()};
      const r=await rpc('saveSalesEntityChange',{companyId:businessEditor.companyId,entity:businessEditor.entity,targetId:businessEditor.targetId,base:businessEditor.base,revision:businessEditor.revision,requestId:businessEditor.pending.requestId,change});
      for(const p of r.entityPatches||[r.entityPatch])if(p)businessAcceptPatch(p,r.patch);if(r.catalog){state.catalog=r.catalog;const cache=viewCache.get('new');if(cache)cache.catalog=r.catalog;}view='company';return r;
    },{preserve:true});
  });
