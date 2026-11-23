/** Production customer edits. Only documented HQ fields; no project/document writes. */
function salesCustomerIds_(raw,catalog){
  const responsibleUserIds=raw.responsibleUserIds||(raw.responsibleUsers||[]).map(u=>salesId_(u.userId||u.id));
  const subsystemIds=raw.subsystemIds||(raw.subsystems||[]).map(s=>{if(s.id)return salesId_(s.id);const rows=(catalog.subsystems||[]).filter(x=>x.name===s.name);if(rows.length!==1)throw Error('HQ-Unternehmensbereich ist nicht eindeutig zugeordnet. Bitte Auswahllisten aktualisieren.');return salesId_(rows[0].id);});
  return {responsibleUserIds,subsystemIds};
}
function salesCustomerValues_(raw,catalog){
  const ids=salesCustomerIds_(raw,catalog),address=raw.defaultAddress||{},fields=raw.customFields||[],date=fields.find(f=>salesCompanyCustomKey_(f.name)==='erstelldatum'),origin=fields.find(f=>salesCompanyCustomKey_(f.name)==='kundenherkunft'),reason=fields.find(f=>salesCompanyCustomKey_(f.name)==='grund der adressanlage');
  const origins=Array.isArray(origin?.value)?origin.value:origin?.value?[String(origin.value)]:[];
  return {name:raw.name||'',companyTypeId:String(raw.companyTypes?.length?salesCompanyTypeId_(raw.companyTypes[0]):''),industrialSector:raw.industrialSector||'',subsystemId:String(ids.subsystemIds[0]||''),responsibleUserId:String(ids.responsibleUserIds[0]||''),homepage:raw.homepage||address.website||'',description:raw.description||'',...Object.fromEntries(['street','houseNumber','zipCode','city','country'].map(k=>[k,address[k]||''])),erstelldatum:String(date?.value||'').slice(0,10),Kundenherkunft:JSON.stringify(origins),addressCreationReason:Array.isArray(reason?.value)?reason.value.join('\n'):String(reason?.value||'')};
}
function salesCustomerSource_(companyId){
  if(String(companyId).startsWith('draft_')){const d=salesBusinessDraft_({companyId,entity:'company',targetId:companyId});if((d.draft.pendingChanges||[]).length)throw Error('Für diesen Kunden sind Änderungen vorgemerkt. Bitte zuerst den offenen HQ-Abgleich klären.');return {...d,raw:d.draft.company};}
  const id=salesId_(companyId),data=salesBusinessKnown_(id);if((data.pendingChanges||[]).some(p=>['company','types','address','assignments'].includes(p.entity)))throw Error('Für diesen Kunden sind Stammdatenänderungen offen. Bitte zuerst den HQ-Abgleich abschließen.');
  return {ref:String(id),data,raw:data.company,hqId:id};
}
function salesCustomerEditor_(input){
  const catalog=salesCustomerCatalog_(false),source=salesCustomerSource_(input.companyId);
  return {entity:'customer',companyId:source.ref,targetId:source.ref,companyName:source.raw.name,local:!!source.draft,deferred:source.deferred===true,revision:source.draft?.revision||0,base:salesCustomerValues_(source.raw,catalog),catalog};
}
function salesCustomerValidate_(value,base,catalog){
  const allowed=SALES_CUSTOMER_FORM_KEYS;
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k)))throw Error('Unbekannte Kundenfelder.');
  const limits={name:150,industrialSector:150,description:20000,street:150,houseNumber:30,zipCode:20,city:100,country:2,erstelldatum:10},out={};for(const k of Object.keys(limits))out[k]=salesText_(value[k],limits[k],['name','street','zipCode','city','country'].includes(k));
  out.homepage=salesWebsiteInput_(value.homepage);out.country=out.country.toUpperCase();if(!/^[A-Z]{2}$/.test(out.country))throw Error('Land bitte als zweistelliges ISO-Kürzel eingeben.');
  for(const [key,list] of [['companyTypeId','types'],['subsystemId','subsystems'],['responsibleUserId','users']]){out[key]=String(salesId_(value[key]));if(!(catalog[list]||[]).some(x=>String(x.id)===out[key])&&out[key]!==String(base[key]||''))throw Error('Bitte eine gültige HQ-Auswahl treffen: '+key);}
  const industry=(catalog.industries||[]).find(x=>x.toLocaleLowerCase('de')===out.industrialSector.toLocaleLowerCase('de'));
  if(out.industrialSector&&!industry&&out.industrialSector!==base.industrialSector&&value.newIndustry!==true&&value.newIndustry!=='true')throw Error('Neue Branche bitte über „Neue Branche anlegen“ hinzufügen.');out.industrialSector=industry||out.industrialSector;
  // Hidden creation default must never overwrite an existing customer's origin.
  out.Kundenherkunft=base.Kundenherkunft||'[]';
  out.addressCreationReason=salesCompanyReason_(value.addressCreationReason===undefined?base.addressCreationReason:value.addressCreationReason,base.addressCreationReason,catalog);
  if(out.erstelldatum)salesCompanyCustomInput_(out.erstelldatum,{name:'Erstelldatum',type:'Date'});return out;
}
function salesCustomerParts_(raw,values,base,catalog){
  const current=salesCustomerValues_(raw,catalog),parts=[],company={},address={};
  for(const k of Object.keys(values))if(String(values[k])!==String(base[k]??'')&&String(current[k])!==String(base[k]??'')&&String(current[k])!==String(values[k]))throw Error('Das Kundenfeld wurde inzwischen geändert: '+k+'. Bitte neu laden und vergleichen.');
  for(const k of ['name','industrialSector','homepage','description'])if(values[k]!==String(base[k]??''))company[k]=values[k]||null;
  if(values.erstelldatum!==String(base.erstelldatum||'')||values.addressCreationReason!==String(base.addressCreationReason||'')){
    const fields=JSON.parse(JSON.stringify(raw.customFields||[]));for(const [key,name] of [['erstelldatum','Erstelldatum'],['addressCreationReason','Grund der Adressanlage']]){
      if(String(values[key])===String(base[key]||''))continue;
      const def=(catalog.fields||[]).find(f=>salesCompanyCustomKey_(f.name)===salesCompanyCustomKey_(name));if(!def)throw Error('HQ-Felddefinition fehlt: '+name);
      const next={name:def.name,type:def.type,value:values[key]?salesCompanyCustomInput_(values[key],def):null};
      const index=fields.findIndex(f=>f.name===def.name);if(index<0)fields.push(next);else fields[index]=next;
    }company.customFields=fields;
  }
  if(Object.keys(company).length)parts.push({entity:'company',change:company,base:salesPick_(raw,Object.keys(company))});
  for(const k of ['street','houseNumber','zipCode','city','country'])if(values[k]!==String(base[k]||''))address[k]=values[k]||null;
  if(Object.keys(address).length)parts.push({entity:'address',change:address,base:salesPick_(raw.defaultAddress||{},Object.keys(address))});
  if(values.companyTypeId!==String(base.companyTypeId||'')){const types=salesCompanyTypes_(raw.companyTypes),id=Number(values.companyTypeId),next=[types.find(t=>t.companyTypeId===id)||{companyTypeId:id},...types.slice(1).filter(t=>t.companyTypeId!==id)];parts.push({entity:'types',change:{companyTypes:next},base:{companyTypes:types}});}
  const ids=salesCustomerIds_(raw,catalog),assignments={};for(const [field,key] of [['responsibleUserId','responsibleUserIds'],['subsystemId','subsystemIds']])if(values[field]!==String(base[field]||''))assignments[key]=[Number(values[field])];
  if(Object.keys(assignments).length)parts.push({entity:'assignments',change:assignments,base:salesPick_(ids,Object.keys(assignments))});return parts;
}
function salesCustomerSave_(input,user){
  const request=salesKey_(input.requestId),ref=String(input.companyId),signature=JSON.stringify(salesBusinessCanonical_({ref,base:input.base,values:input.change,revision:input.revision})),headId=salesKey_('form_'+request),prior=salesRead_('sales_jobs/'+headId);
  if(prior){if(prior.formSignature!==signature||prior.actor!==user.email||prior.formCompanyRef!==ref)throw Error('Speicherkennung gehört zu einer anderen Eingabe.');const jobs=prior.formJobIds.map(id=>salesRead_('sales_jobs/'+id));if(prior.draftDependency){const draft=salesRead_('sales_drafts/'+prior.draftDependency),job=salesRead_('sales_jobs/'+prior.draftDependency),r=salesBusinessDraftResult_({draft,job,ref,deferred:true},'customer');return {...r,id:prior.id,patch:{...r.patch,jobs:jobs.map(salesJobSummary_)}};}return {id:prior.id,message:'Kundenänderung bereits gespeichert.',entityPatches:prior.formPatches,patch:{jobs:jobs.map(salesJobSummary_)}};}
  const source=salesCustomerSource_(ref),catalog=salesRead_('sales_meta/catalog');if(!catalog)throw Error('HQ-Auswahllisten fehlen.');
  if(source.draft?.lastCustomerForm?.request===request){if(source.draft.lastCustomerForm.signature!==signature||source.draft.lastCustomerForm.actor!==user.email)throw Error('Speicherkennung gehört zu einer anderen Eingabe.');return salesBusinessDraftResult_(source,'customer');}
  if(source.draft&&input.revision!==(source.draft.revision||0))throw Error('Kundendaten wurden inzwischen geändert. Bitte neu laden.');
  const values=salesCustomerValidate_(input.change,salesCustomerValues_(source.raw,catalog),catalog),parts=salesCustomerParts_(source.raw,values,input.base||{},catalog);if(!parts.length)return {message:'Keine Änderungen eingegeben.'};
  const entries=[],industry=values.industrialSector;if(industry&&!(catalog.industries||[]).includes(industry)){catalog.industries=[...(catalog.industries||[]),industry].sort((a,b)=>a.localeCompare(b,'de'));entries.push({path:'sales_meta/catalog',value:catalog});}
  const typeNames=Object.fromEntries(catalog.types.map(x=>[x.id,x.name])),jobs=[],patches=[];
  if(source.draft&&!source.deferred){
    for(const p of parts){if(p.entity==='address')Object.assign(source.draft.company.defaultAddress,p.change);else Object.assign(source.draft.company,p.change);source.job.editedFields=source.job.editedFields||{};source.job.editedFields[p.entity]=Array.from(new Set([...(source.job.editedFields[p.entity]||[]),...Object.keys(p.change)]));}
    source.draft.kind=typeNames[source.draft.company.companyTypes[0].companyTypeId];source.draft.revision=(source.draft.revision||0)+1;source.draft.lastCustomerForm={request,signature,actor:user.email};source.job.name=source.draft.company.name;source.job.updatedAt=salesNow_();
    if(user.uid){const authors=source.job.editAuthors||[],author=authors.find(a=>a.uid===user.uid)||{uid:user.uid,email:user.email,permissions:[],financial:false};if(!author.permissions.includes('company.edit'))author.permissions.push('company.edit');if(!authors.includes(author))authors.push(author);if(authors.length>25)throw Error('Zu viele Bearbeiter vor dem ersten HQ-Abgleich.');source.job.editAuthors=authors;}
    entries.push({path:'sales_drafts/'+source.draft.id,value:source.draft},{path:'sales_jobs/'+source.job.id,value:source.job});
  }else{
    for(const [index,p] of parts.entries()){
      const id=index?headId+'_'+p.entity:headId,targetId=source.draft?ref+(p.entity==='company'||p.entity==='types'||p.entity==='assignments'?'':'_address'):p.entity==='address'?source.raw.defaultAddress?.id:source.hqId;
      if(!source.draft&&!targetId)throw Error('Keine bestätigte HQ-Standardadresse für diese Änderung vorhanden.');
      const job={id,kind:'entityChange',business:1,formGroup:headId,formOrder:index,...(index?{formPrevious:jobs[index-1].id}:{}),...(source.draft?{draftDependency:source.draft.id,companyRef:ref,targetRef:targetId}:{hqId:source.hqId,targetId}),entity:p.entity,change:p.change,base:p.base,name:values.name,state:'pending',actor:user.email,...(user.uid?{actorUid:user.uid}:{}),createdAt:salesNow_(),updatedAt:salesNow_(),message:source.deferred?'Änderung wartet auf Abschluss der ursprünglichen HQ-Anlage.':'Kundenänderung gespeichert; HQ-Abgleich offen.'};
      jobs.push(job);const labels=p.entity==='assignments'?{userNames:catalog.users.filter(u=>p.change.responsibleUserIds?.includes(Number(u.id))),subsystemNames:catalog.subsystems.filter(s=>p.change.subsystemIds?.includes(Number(s.id)))}:{},pending={jobId:id,entity:p.entity,targetId,change:p.change,typeNames,...labels};
      if(source.draft)source.draft.pendingChanges=[...(source.draft.pendingChanges||[]),pending];else source.data.pendingChanges=[...(source.data.pendingChanges||[]),pending];
      patches.push({companyId:source.hqId||ref,entity:p.entity,targetId,change:p.change,typeNames,...labels});
    }
    jobs[0].formSignature=signature;jobs[0].formCompanyRef=ref;jobs[0].formJobIds=jobs.map(j=>j.id);jobs[0].formPatches=patches;jobs.forEach(job=>entries.push({path:'sales_jobs/'+job.id,value:job}));
    if(source.draft){source.draft.revision=(source.draft.revision||0)+1;entries.push({path:'sales_drafts/'+source.draft.id,value:source.draft});}
    else {entries.push({path:'sales_companies/'+source.hqId,value:source.data});const directory=salesRead_('sales_directory/'+source.hqId);if(directory){const visible=salesBusinessView_(source.data);entries.push({path:'sales_directory/'+source.hqId,value:{...directory,company:salesCompany_(visible.company),contacts:visible.contacts}});}}
  }
  const names=salesRead_('sales_meta/lean_names');if(names&&values.name!==input.base?.name)entries.push({path:'sales_meta/lean_names',value:{...names,rows:names.rows.map(c=>String(c.id)===ref||String(c.hqId||c.id)===String(source.hqId)?{...c,name:values.name}:c)}});
  salesBulkRest_('commit',{writes:entries.map(e=>({update:{name:salesBulkName_(e.path),fields:{payload:{stringValue:salesBulkPayload_(e.path,e.value)}}}}))});
  if(source.draft){const r=salesBusinessDraftResult_(source,'customer');return {...r,catalog,patch:{...r.patch,...(jobs.length?{jobs:jobs.map(salesJobSummary_)}:{})}};}
  return {id:jobs[0].id,message:'Kundendaten gespeichert; Übertragung beim HQ-Abgleich.',catalog,entityPatches:patches,patch:{jobs:jobs.map(salesJobSummary_)}};
}
function salesBusinessCanonical_(value){
  if(Array.isArray(value)){
    const rows=value.map(salesBusinessCanonical_);
    if(rows.length&&rows.every(v=>typeof v==='number'))rows.sort((a,b)=>a-b);
    if(rows.length&&rows.every(v=>v&&typeof v==='object'&&!Array.isArray(v)&&v.companyTypeId!==undefined))rows.sort((a,b)=>Number(a.companyTypeId)-Number(b.companyTypeId));
    else if(rows.length&&rows.every(v=>v&&typeof v==='object'&&!Array.isArray(v)&&v.name!==undefined))rows.sort((a,b)=>String(a.name).localeCompare(String(b.name)));
    return rows;
  }
  if(value&&typeof value==='object'){const out=Object.create(null);Object.keys(value).sort().forEach(k=>{out[k]=salesBusinessCanonical_(value[k]);});if(value.type==='Date'&&typeof value.value==='string')out.value=value.value.slice(0,10);if(value.type==='DropdownCheckbox'&&Array.isArray(value.value)&&value.value.every(v=>typeof v==='string'))out.value=[...value.value].sort();return out;}return value;
}
function salesBusinessEqual_(actual,expected){
  return Object.keys(expected).every(k=>expected[k]&&typeof expected[k]==='object'?JSON.stringify(salesBusinessCanonical_(actual[k]))===JSON.stringify(salesBusinessCanonical_(expected[k])):String(actual[k]??'')===String(expected[k]??''));
}
function salesBusinessCustomMatches_(actual,expected){return (expected||[]).every(f=>(actual||[]).some(a=>a.name===f.name&&a.type===f.type&&JSON.stringify(salesBusinessCanonical_({type:a.type,value:a.value??null}))===JSON.stringify(salesBusinessCanonical_({type:f.type,value:f.value??null}))));}
function saveSalesCompany(input){return saveSalesTestCompany(input);}
function bindSalesCompanyResult(id,hqId){
  salesUser_(true);return salesLock_(()=>{
    salesAssertPrivate_();const job=salesJobRecoverInterrupted_(salesRead_('sales_jobs/'+salesKey_(id)));
    if(job?.kind!=='createCompany'||job.markerMode!=='none'||job.state!=='uncertain'||job.hqId||!job.writeAttempted)throw new Error('Keine offene Firmenzuordnung.');
    const draft=salesRead_('sales_drafts/'+job.draftId),actual=salesOne_('Companies',salesId_(hqId));
    if(!draft?.company||!salesBusinessEqual_(actual,salesPick_(draft.company,['name','description','industrialSector']))||!salesHomepageConfirmed_(actual,draft.company.homepage)||!salesBusinessEqual_(actual.defaultAddress||{},salesPick_(draft.company.defaultAddress,['street','houseNumber','zipCode','city','country','website'])))throw new Error('Die ausgewählte HQ-Firma stimmt nicht vollständig mit der gespeicherten Anlage überein. Auftrag bleibt gesperrt.');
    if(!(actual.companyTypes||[]).some(t=>salesCompanyTypeId_(t)===Number(draft.company.companyTypes?.[0]?.companyTypeId))||!(actual.responsibleUsers||[]).some(u=>Number(u.userId||u.id)===Number(draft.company.responsibleUserIds?.[0]))||!salesSubsystemConfirmed_(actual,draft.company.subsystemIds?.[0])||!salesBusinessCustomMatches_(actual.customFields,draft.company.customFields))throw new Error('Firmenart, Verantwortlicher, Unternehmensbereich oder eigene HQ-Felder stimmen nicht überein.');
    if(salesCollect_('ContactPersons','companyId eq '+actual.id,Date.now()).length)throw new Error('Die ausgewählte Firma besitzt bereits Ansprechpartner. Bitte die vorhandene HQ-Anlage gesondert prüfen; keine neue Kontaktanlage freigegeben.');
    job.hqId=salesId_(actual.id);draft.hqId=job.hqId;job.state='ready';job.updatedAt=salesNow_();job.message='Manuell ausgewählte HQ-Firma nur lesend zugeordnet. Fortsetzung prüft die vorhandene Anlage; kein erneuter Firmen-POST.';
    salesWrite_('sales_drafts/'+draft.id,draft);salesWrite_('sales_jobs/'+job.id,job);return {id:job.id,message:job.message};
  });
}
function salesBusinessSchema_(entity){
  if(entity==='assignments')return {type:'object',properties:{responsibleUserIds:{type:'array',items:{type:'integer'}},subsystemIds:{type:'array',items:{type:'integer'}}}};
  if(entity==='types')return {type:'object',required:['companyTypes'],properties:{companyTypes:{type:'array',items:SALES_HQ_FIELDS.CompanyTypeToCompaniesPutWithoutNumberSchema}}};
  const names={company:'CompanyPut',address:'CompanyAddressBase',contact:'ContactPersonPut'};
  if(!names[entity])throw new Error('Unbekannte Stammdatenart.');
  return SALES_HQ_FIELDS[names[entity]];
}
function salesBusinessValidate_(value,schema,path){
  if(value===null){if(!schema.nullable)throw new Error('Feld darf nicht leer sein: '+path);return;}
  if(schema.enum&&!schema.enum.includes(value))throw new Error('Ungültige Auswahl: '+path);
  if(schema.type==='object'){
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Ungültige Felder: '+path);
    for(const k of Object.keys(value)){if(!Object.prototype.hasOwnProperty.call(schema.properties,k))throw new Error('Nicht schreibbares Feld: '+path+'.'+k);salesBusinessValidate_(value[k],schema.properties[k],path+'.'+k);}
    for(const k of schema.required||[])if(value[k]===undefined||!schema.properties[k].nullable&&(value[k]===null||value[k]===''))throw new Error('Pflichtfeld fehlt: '+path+'.'+k);
  }else if(schema.type==='array'){
    if(!Array.isArray(value)||value.length>500)throw new Error('Ungültige Liste: '+path);
    value.forEach(v=>salesBusinessValidate_(v,schema.items,path));
  }else if(schema.type==='string'){
    if(typeof value!=='string'||value.length>20000||value.length<(schema.minLength||0))throw new Error('Ungültiger Text: '+path);
  }else if(schema.type==='integer'&&(!Number.isInteger(value)||value<-2147483648||value>2147483647))throw new Error('Ungültige Ganzzahl: '+path);
  else if(schema.type==='number'&&(typeof value!=='number'||!Number.isFinite(value)))throw new Error('Ungültige Zahl: '+path);
  else if(schema.type==='boolean'&&typeof value!=='boolean')throw new Error('Ungültige Auswahl: '+path);
}
function salesBusinessPick_(raw,schema){
  const out={};for(const k of Object.keys(schema.properties||{}))if(raw[k]!==undefined){const s=schema.properties[k];out[k]=s.type==='object'&&raw[k]!==null?salesBusinessPick_(raw[k],s):s.type==='array'&&s.items.type==='object'&&Array.isArray(raw[k])?raw[k].map(v=>salesBusinessPick_(v,s.items)):raw[k];}return out;
}
function salesBusinessKnown_(id){
  id=String(salesId_(id));const data=salesRead_('sales_companies/'+id);
  if(!data?.company||String(data.company.id)!==id)throw new Error('Kundendetails zuerst über den HQ-Sync importieren.');return data;
}
function salesBusinessCachedTarget_(data,entity,targetId){
  if(['company','types'].includes(entity)){if(Number(data.company.id)!==targetId)throw Error('Abweichendes Firmenziel.');return entity==='types'?{...data.company,companyTypes:salesCompanyTypes_(data.company.companyTypes)}:data.company;}
  const rows=entity==='contact'?data.contacts||[]:entity==='address'?[data.company.defaultAddress,...data.company.addresses||[]]:[];
  const row=rows.find(x=>Number(x?.id)===targetId);if(!row)throw Error('Stammdatenziel gehört nicht zum geladenen Kunden.');return row;
}
function salesBusinessTarget_(hqId,entity,targetId){
  hqId=salesId_(hqId);targetId=salesId_(targetId);
  if(entity==='assignments'){
    if(targetId!==hqId)throw Error('Abweichendes Firmenziel.');const response=salesHqGet_('/v1/Companies('+hqId+')?$expand=ResponsibleUsers,Subsystems,DefaultAddress,Addresses,CompanyTypes,CustomFields,Files').data,raw=response?.data||response?.d||response;
    if(Number(raw?.Id)!==hqId||!Array.isArray(raw.ResponsibleUsers)||!Array.isArray(raw.Subsystems)||['Name','IndustrialSector','Description','IBAN','BIC','DebitorNumber','CreditorNumber','TaxId','DefaultDeliveryConditionId','DefaultPaymentConditionId','DefaultAddress','Addresses','CompanyTypes','CustomFields','Files'].some(k=>!Object.prototype.hasOwnProperty.call(raw,k)))throw Error('HQ-Zuordnungen und zu erhaltende Firmenwerte wurden nicht vollständig gelesen.');
    return {responsibleUserIds:raw.ResponsibleUsers.map(x=>salesId_(x.Id)),subsystemIds:raw.Subsystems.map(x=>salesId_(x.Id)),legacy:raw};
  }
  if(entity==='company'||entity==='types'){if(targetId!==hqId)throw new Error('Abweichendes Firmenziel.');const raw=salesOne_('Companies',hqId);return entity==='types'?{...raw,companyTypes:salesCompanyTypes_(raw.companyTypes)}:raw;}
  if(entity==='contact'){const c=salesHqGet_('/v2/ContactPersons/'+targetId+'?expand=DefaultAddress,CustomFields').data;if(Number(c?.id)!==targetId||Number(c.companyId)!==hqId)throw new Error('Ansprechpartner gehört nicht zur Firma.');return {...c,eMail:salesContactEmail_(c)};}
  if(entity==='address'){
    const result=salesHqGet_('/v2/Companies/'+hqId+'/Addresses').data,rows=Array.isArray(result)?result:result?.data||result?.value;
    if(!Array.isArray(rows))throw new Error('Firmenadressen unvollständig.');const matches=rows.filter(a=>Number(a.id)===targetId);
    if(matches.length!==1)throw new Error('Adresse gehört nicht eindeutig zur Firma.');return matches[0];
  }throw new Error('Unbekannte Stammdatenart.');
}
function getSalesEditor(input){
  salesUser_();salesAssertPrivate_();
  if(input.entity==='catalog')return {catalog:salesCustomerCatalog_(input.force===true)};
  if(input.entity==='customer')return salesCustomerEditor_(input);
  if(String(input.companyId).startsWith('draft_'))return salesBusinessDraftEditor_(input);
  const id=salesId_(input.companyId),schema=salesBusinessSchema_(input.entity),data=salesBusinessKnown_(id);
  const pending=(data.pendingChanges||[]).filter(p=>p.entity===input.entity&&Number(p.targetId)===Number(input.targetId));
  if(pending.length)throw new Error('Für diese Stammdaten ist bereits eine Änderung offen. Bitte zuerst den HQ-Sync abschließen oder den Konflikt in der Auftragsübersicht klären.');
  const raw=salesBusinessCachedTarget_(data,input.entity,salesId_(input.targetId));
  const catalog=['types','company'].includes(input.entity)?salesRead_('sales_meta/catalog'):null;
  return {companyId:id,companyName:data.company.name,entity:input.entity,targetId:salesId_(input.targetId),schema,base:salesBusinessPick_(raw,schema),types:catalog?.types||[],customFieldDefinitions:input.entity==='company'?catalog?.fields||[]:[]};
}
/** Unsent intent changes in place; after an HQ attempt, edits are separate dependent jobs. */
function salesBusinessDraft_(input){
  const ref=String(input.companyId),id=salesKey_(ref.slice(6)),draft=salesRead_('sales_drafts/'+id),job=salesRead_('sales_jobs/'+id);
  if(ref!=='draft_'+id||!draft?.company||draft.id!==id||job?.kind!=='createCompany'||job.draftId!==id)throw Error('Kundenentwurf fehlt.');
  if(['synced','canceled'].includes(job.state))throw Error('Der Anlagezustand hat sich geändert. Bitte den Kunden neu laden.');
  const deferred=!!(draft.hqId||job.hqId||!['pending','ready'].includes(job.state)||job.writeAttempted||job.contactAttempted||job.phaseWriteAttempted);
  const entity=input.entity,schema=salesBusinessSchema_(entity),target=['company','types'].includes(entity)?ref:ref+'_'+entity;
  if(String(input.targetId)!==target)throw Error('Stammdatenziel gehört nicht zum Kundenentwurf.');
  const raw=entity==='address'?draft.company.defaultAddress:entity==='contact'?{...draft.contact,defaultAddress:draft.contact.defaultAddress||{...salesContactAddressFields_(draft.company.defaultAddress),email:draft.contact.eMail||null}}:entity==='types'?{companyTypes:draft.company.companyTypes}:draft.company;
  return {ref,draft,job,schema,raw,deferred};
}
function salesBusinessDraftEditor_(input){
  const d=salesBusinessDraft_(input),catalog=salesRead_('sales_meta/catalog');
  if((d.draft.pendingChanges||[]).some(p=>p.entity===input.entity))throw Error('Für diese Stammdaten ist bereits eine Änderung vorgemerkt. Bitte zuerst den offenen HQ-Abgleich klären.');
  return {companyId:d.ref,companyName:d.draft.company.name,entity:input.entity,targetId:input.targetId,local:true,deferred:d.deferred,revision:d.draft.revision||0,schema:d.schema,base:salesBusinessPick_(d.raw,d.schema),types:catalog?.types||[],customFieldDefinitions:input.entity==='company'?catalog?.fields||[]:[]};
}
function salesBusinessVisibleDraft_(draft){
  const out=JSON.parse(JSON.stringify(draft));
  for(const p of draft.pendingChanges||[]){if(['company','types','assignments'].includes(p.entity))Object.assign(out.company,p.change);else if(p.entity==='address')Object.assign(out.company.defaultAddress,p.change);else if(p.entity==='contact')Object.assign(out.contact,p.change);}
  return out;
}
function salesBusinessTypes_(change,catalog){
  const names=Object.fromEntries((catalog?.types||[]).map(t=>[t.id,t.name]));
  if(!change.companyTypes?.length||new Set(change.companyTypes.map(t=>t.companyTypeId)).size!==change.companyTypes.length||change.companyTypes.some(t=>!Object.prototype.hasOwnProperty.call(names,t.companyTypeId)))throw Error('Bitte mindestens eine bekannte HQ-Firmenart auswählen.');
  return names;
}
function salesBusinessCustom_(change,base,definitions){
  if(!change.customFields)return;
  const names=new Set();
  for(const f of change.customFields){
    if(names.has(f.name))throw Error('HQ-Feld doppelt: '+f.name);names.add(f.name);
    const old=(base.customFields||[]).find(x=>x.name===f.name),def=(definitions||[]).find(x=>x.name===f.name);
    if(!old&&(!def||def.type!==f.type)||old&&old.type!==f.type)throw Error('HQ-Feld oder Feldtyp ist nicht bestätigt: '+f.name);
    if(old&&salesBusinessEqual_(f,old))continue;
    const v=f.value;
    if(v===null||v===undefined)continue;
    if(f.type==='Date'&&(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)!==v.slice(0,10)))throw Error('Bitte ein gültiges Datum für „'+f.name+'“ eingeben.');
    if(f.type==='DropdownCheckbox'&&(!Array.isArray(v)||v.some(x=>typeof x!=='string'||!x.trim())))throw Error('Bitte einen Wert pro Zeile für „'+f.name+'“ eingeben.');
    if(f.type==='Boolean'?typeof v!=='boolean':f.type==='Integer'?!Number.isInteger(v):f.type==='Float'?typeof v!=='number'||!Number.isFinite(v):['Text','TextMultiline','Date','Dropdown','Link','NumericText'].includes(f.type)?typeof v!=='string':false)throw Error('Ungültiger Wert für HQ-Feld: '+f.name);
  }
}
function salesBusinessOriginPreserved_(change,base){
  if(!change.customFields)return;
  const origin=rows=>(rows||[]).filter(f=>salesCompanyCustomKey_(f.name)==='kundenherkunft');
  if(JSON.stringify(salesBusinessCanonical_(origin(change.customFields)))!==JSON.stringify(salesBusinessCanonical_(origin(base.customFields))))throw Error('Kundenherkunft bleibt beim Bearbeiten unverändert.');
}
function salesBusinessDraftResult_(d,entity){
  const catalog=salesRead_('sales_meta/catalog'),company=salesLocalCompany_(d.draft,catalog,d.job),visible=salesBusinessVisibleDraft_(d.draft);
  return {id:d.job.id,message:d.deferred?'Änderung in Firebase vorgemerkt. Übertragung erst nach Klärung und Abschluss der ursprünglichen HQ-Anlage.':'Kundendaten in Firebase gespeichert; werden bei der ersten HQ-Übertragung verwendet.',entityPatch:{companyId:d.ref,entity,localCompany:company,contact:{...visible.contact,id:d.job.contactId||d.ref+'_contact'}},patch:{draft:d.draft,...(!d.deferred?{job:salesJobSummary_(d.job)}:{}),localCompany:company}};
}
function salesBusinessSaveDraft_(input,user){
  const d=salesBusinessDraft_(input),{draft,job,schema}=d,change=input.change?JSON.parse(JSON.stringify(input.change)):null;
  const requestId=salesText_(input.requestId,80,true);
  if(!/^[a-zA-Z0-9_-]{8,80}$/.test(requestId))throw Error('Ungültige Speicherkennung.');
  const signature=JSON.stringify(salesBusinessCanonical_({entity:input.entity,targetId:input.targetId,revision:input.revision,change}));
  const deferredId=salesKey_('edit_'+requestId),prior=d.deferred?salesRead_('sales_jobs/'+deferredId):null;
  if(prior){if(prior.draftDependency!==draft.id||prior.actor!==user.email||prior.requestSignature!==signature)throw Error('Speicherkennung gehört zu einer anderen Eingabe.');const result=salesBusinessDraftResult_(d,input.entity);return {...result,id:prior.id,patch:{...result.patch,job:salesJobSummary_(prior)}};}
  if(job.lastEdit?.requestId===requestId){if(job.lastEdit.actor!==user.email||job.lastEdit.signature!==signature)throw Error('Speicherkennung gehört zu einer anderen Eingabe.');return salesBusinessDraftResult_(d,input.entity);}
  if(input.revision!==(draft.revision||0))throw Error('Kundendaten wurden inzwischen geändert. Bitte zur Firma zurückkehren und neu laden.');
  if((draft.pendingChanges||[]).some(p=>p.entity===input.entity))throw Error('Für diese Stammdaten ist bereits eine Änderung vorgemerkt. Bitte zuerst den offenen HQ-Abgleich klären.');
  if(!change||typeof change!=='object'||Array.isArray(change)||!Object.keys(change).length)throw Error('Keine Änderungen eingegeben.');
  if(input.entity==='contact'&&change.defaultAddress?.email!==undefined){if(change.eMail!==undefined&&change.eMail!==change.defaultAddress.email)throw Error('Die beiden Kontakt-E-Mail-Felder müssen übereinstimmen.');change.eMail=change.defaultAddress.email;}
  for(const k of Object.keys(change)){if(!Object.prototype.hasOwnProperty.call(schema.properties,k))throw Error('Nicht schreibbares Feld: '+k);salesBusinessValidate_(change[k],schema.properties[k],k);}
  const merged={...d.raw,...change},catalog=salesRead_('sales_meta/catalog');
  if(input.entity==='contact'&&!draft.contact.defaultAddress&&change.defaultAddress===undefined)delete merged.defaultAddress;
  if(input.entity==='contact'&&change.eMail!==undefined&&merged.defaultAddress)merged.defaultAddress={...merged.defaultAddress,email:change.eMail};
  salesBusinessValidate_(salesBusinessPick_(merged,schema),schema,input.entity);
  if(input.entity==='company'&&!String(merged.name||'').trim()||input.entity==='contact'&&(!String(merged.firstName||'').trim()||!String(merged.lastName||'').trim()))throw Error('Name bleibt ein Pflichtfeld.');
  if(input.entity==='address'&&!/^[A-Z]{2}$/.test(merged.country||''))throw Error('Land bitte als zweistelliges ISO-Kürzel eingeben.');
  if(input.entity==='company')salesBusinessOriginPreserved_(change,d.raw);
  salesBusinessCustom_(change,d.raw,input.entity==='company'?catalog?.fields:[]);
  if(d.deferred){
    const typeNames=input.entity==='types'?salesBusinessTypes_(merged,catalog):{},base=Object.fromEntries(Object.keys(change).map(k=>[k,d.raw[k]??null]));
    const edit={id:deferredId,kind:'entityChange',business:1,draftDependency:draft.id,companyRef:d.ref,targetRef:input.targetId,entity:input.entity,change,base,requestSignature:signature,name:draft.company.name,state:'pending',actor:user.email,...(user.uid?{actorUid:user.uid}:{}),createdAt:salesNow_(),updatedAt:salesNow_(),message:'Änderung wartet in Firebase auf Abschluss der ursprünglichen HQ-Anlage.'};
    draft.pendingChanges=[...(draft.pendingChanges||[]),{jobId:edit.id,entity:input.entity,targetId:input.targetId,change,typeNames}];draft.revision=(draft.revision||0)+1;draft.updatedAt=salesNow_();
    const entries=[{path:'sales_drafts/'+draft.id,value:draft},{path:'sales_jobs/'+edit.id,value:edit}];
    if(change.name!==undefined){const names=salesRead_('sales_meta/lean_names');if(names)entries.push({path:'sales_meta/lean_names',value:{...names,rows:names.rows.map(c=>c.id===d.ref?{...c,name:change.name}:c)}});}
    salesBulkRest_('commit',{writes:entries.map(e=>({update:{name:salesBulkName_(e.path),fields:{payload:{stringValue:salesBulkPayload_(e.path,e.value)}}}}))});
    const result=salesBusinessDraftResult_(d,input.entity);return {...result,id:edit.id,patch:{...result.patch,job:salesJobSummary_(edit)}};
  }
  if(input.entity==='types'){const names=salesBusinessTypes_(merged,catalog);draft.company.companyTypes=merged.companyTypes;draft.kind=names[merged.companyTypes[0].companyTypeId];}
  else if(input.entity==='company')draft.company=merged;
  else if(input.entity==='address')draft.company.defaultAddress=merged;
  else draft.contact=merged;
  draft.revision=(draft.revision||0)+1;draft.updatedAt=salesNow_();job.name=draft.company.name;job.updatedAt=draft.updatedAt;
  job.editedFields=job.editedFields||{};job.editedFields[input.entity]=Array.from(new Set([...(job.editedFields[input.entity]||[]),...Object.keys(change)]));
  job.lastEdit={requestId,actor:user.email,signature};
  if(user.uid){
    const authors=job.editAuthors||[],author=authors.find(a=>a.uid===user.uid)||{uid:user.uid,email:user.email,permissions:[],financial:false};
    const permission=input.entity==='contact'?'contact.edit':'company.edit';if(!author.permissions.includes(permission))author.permissions.push(permission);
    const financial=v=>v&&typeof v==='object'&&Object.entries(v).some(([k,x])=>salesAuthFinancialKey_(k)||financial(x));
    author.financial=author.financial||!!financial(change);if(!authors.includes(author))authors.push(author);
    if(authors.length>25)throw Error('Zu viele Bearbeiter vor der ersten HQ-Übertragung. Bitte den Anlageauftrag prüfen.');job.editAuthors=authors;
  }
  const entries=[{path:'sales_drafts/'+draft.id,value:draft},{path:'sales_jobs/'+job.id,value:job}];
  if(change.name!==undefined){const names=salesRead_('sales_meta/lean_names');if(names)entries.push({path:'sales_meta/lean_names',value:{...names,rows:names.rows.map(c=>c.id===d.ref?{...c,name:draft.company.name}:c)}});}
  salesBulkRest_('commit',{writes:entries.map(e=>({update:{name:salesBulkName_(e.path),fields:{payload:{stringValue:salesBulkPayload_(e.path,e.value)}}}}))});
  return salesBusinessDraftResult_(d,input.entity);
}
function salesBusinessVerifyDraft_(job,draft,company,contact){
  for(const [entity,keys] of Object.entries(job.editedFields||{})){
    const expected=entity==='address'?draft.company.defaultAddress:entity==='contact'?draft.contact:draft.company,actual=entity==='address'?company.defaultAddress:entity==='contact'?contact:company;
    for(const key of keys){
      const value=expected[key];let matches;
      if(key==='homepage')matches=salesHomepageConfirmed_(company,value);
      else if(key==='customFields')matches=salesBusinessCustomMatches_(actual?.customFields,value);
      else if(key==='companyTypes')matches=(value||[]).every(t=>(actual?.companyTypes||[]).some(a=>salesCompanyTypeId_(a)===Number(t.companyTypeId)&&salesBusinessEqual_(a,{number:t.number})));
      else if(key==='responsibleUserIds')matches=(value||[]).every(id=>(actual?.responsibleUsers||[]).some(u=>Number(u.userId||u.id)===Number(id)));
      else if(key==='subsystemIds')matches=(value||[]).every(id=>salesSubsystemConfirmed_(company,id));
      else if(key==='defaultAddress')matches=salesBusinessEqual_(actual?.defaultAddress||{},value||{});
      else matches=salesBusinessEqual_(actual||{},{[key]:value});
      if(!matches)throw Error('Geändertes Kundenfeld in HQ noch nicht bestätigt: '+entity+'.'+key+'. Kein erneuter Anlageversuch.');
    }
  }
}
function salesBusinessView_(value){
  const data=JSON.parse(JSON.stringify(value));
  for(const p of data.pendingChanges||[]){
    if(p.entity==='company'){Object.assign(data.company,p.change);if(p.change.homepage!==undefined){data.company.homepageDisplay=p.change.homepage||'';data.company.homepageSource='App';}}
    if(p.entity==='types')data.company.companyTypes=p.change.companyTypes.map(t=>({...t,name:p.typeNames?.[t.companyTypeId]||'HQ-Firmenart '+t.companyTypeId}));
    if(p.entity==='assignments'){
      if(p.change.responsibleUserIds)data.company.responsibleUsers=p.change.responsibleUserIds.map(id=>({userId:id,firstName:(p.userNames||[]).find(u=>Number(u.id)===Number(id))?.name||'',lastName:''}));
      if(p.change.subsystemIds)data.company.subsystems=p.change.subsystemIds.map(id=>({id,name:(p.subsystemNames||[]).find(u=>Number(u.id)===Number(id))?.name||''}));
    }
    if(p.entity==='contact'){const contact=(data.contacts||[]).find(c=>Number(c.id)===Number(p.targetId));if(contact)Object.assign(contact,p.change);}
    if(p.entity==='address')for(const a of [data.company.defaultAddress,...data.company.addresses||[]])if(a&&Number(a.id)===Number(p.targetId))Object.assign(a,p.change);
  }return data;
}
function salesBusinessStore_(id,data){
  salesWrite_('sales_companies/'+id,data);const visible=salesBusinessView_(data),directory=salesRead_('sales_directory/'+id);
  if(directory)salesWrite_('sales_directory/'+id,{...directory,company:salesCompany_(visible.company),contacts:visible.contacts});
}
function saveSalesEntityChange(input){
  const user=salesUser_();return salesLock_(()=>{
    if(input.entity==='customer'){salesAssertPrivate_();return salesCustomerSave_(input,user);}
    salesAssertPrivate_();if(String(input.companyId).startsWith('draft_'))return salesBusinessSaveDraft_(input,user);
    const hqId=salesId_(input.companyId),targetId=salesId_(input.targetId),entity=input.entity,schema=salesBusinessSchema_(entity),data=salesBusinessKnown_(hqId);
    if(['company','types'].includes(entity)&&targetId!==hqId||entity==='contact'&&!(data.contacts||[]).some(c=>Number(c.id)===targetId&&Number(c.companyId)===hqId)||entity==='address'&&![data.company.defaultAddress,...data.company.addresses||[]].some(a=>Number(a?.id)===targetId))throw new Error('Stammdatenziel gehört nicht zum geladenen Kunden.');
    if((data.pendingChanges||[]).some(p=>p.entity===entity&&Number(p.targetId)===targetId))throw new Error('Für diese Stammdaten ist bereits eine Änderung offen. Zuerst synchronisieren.');
    const change=input.change;if(!change||typeof change!=='object'||Array.isArray(change)||!Object.keys(change).length)throw new Error('Keine Änderungen eingegeben.');
    if(entity==='contact'&&change.defaultAddress?.email!==undefined){if(change.eMail!==undefined&&change.eMail!==change.defaultAddress.email)throw new Error('Die beiden Kontakt-E-Mail-Felder müssen übereinstimmen.');change.eMail=change.defaultAddress.email;}
    const base={};for(const k of Object.keys(change)){
      if(!Object.prototype.hasOwnProperty.call(schema.properties,k))throw new Error('Nicht schreibbares Feld: '+k);
      salesBusinessValidate_(change[k],schema.properties[k],k);base[k]=input.base?.[k]??null;
      if(entity==='contact'&&['firstName','lastName'].includes(k)&&!String(change[k]||'').trim())throw new Error('Vor- und Nachname des Ansprechpartners bleiben Pflichtfelder.');
      if(schema.required?.includes(k)&&(change[k]===null||change[k]===''))throw new Error('Pflichtfeld fehlt: '+k);
    }
    const typeNames={};if(entity==='types'){
      Object.assign(typeNames,salesBusinessTypes_(change,salesRead_('sales_meta/catalog')));
    }
    if(entity==='company'&&change.customFields){salesBusinessOriginPreserved_(change,data.company);salesBusinessCustom_(change,input.base||{},salesRead_('sales_meta/catalog')?.fields);}
    // Base values are expected values, never a destination or a complete PUT body.
    const id=Utilities.getUuid(),job={id,kind:'entityChange',business:1,hqId,targetId,entity,name:data.company.name,change,base,state:'pending',actor:user.email,...(user.uid?{actorUid:user.uid}:{}),createdAt:salesNow_(),updatedAt:salesNow_(),message:'Stammdatenänderung in Firebase gespeichert; HQ-Abgleich offen.'};
    data.pendingChanges=[...(data.pendingChanges||[]),{jobId:id,entity,targetId,change,...(entity==='types'?{typeNames}:{})}];
    salesWrite_('sales_jobs/'+id,job);salesBusinessStore_(hqId,data);
    return {id,message:job.message,entityPatch:{companyId:hqId,entity,targetId,change,...(entity==='types'?{typeNames}:{})},patch:{job:salesJobSummary_(job)}};
  });
}
function salesBusinessFinish_(job,actual){
  const data=salesBusinessKnown_(job.hqId);data.pendingChanges=(data.pendingChanges||[]).filter(p=>p.jobId!==job.id);
  if(job.entity==='company')data.company={...data.company,...salesCompany_(actual)};
  if(job.entity==='types')data.company.companyTypes=salesCompany_(actual).companyTypes;
  if(job.entity==='assignments'){const catalog=salesRead_('sales_meta/catalog');if(job.change.responsibleUserIds)data.company.responsibleUsers=actual.responsibleUserIds.map(id=>({userId:id,firstName:catalog.users.find(u=>Number(u.id)===id)?.name||'',lastName:''}));if(job.change.subsystemIds)data.company.subsystems=actual.subsystemIds.map(id=>({id,name:catalog.subsystems.find(s=>Number(s.id)===id)?.name||''}));}
  if(job.entity==='contact')data.contacts=(data.contacts||[]).map(c=>Number(c.id)===Number(job.targetId)?{...c,...salesContactView_(actual)}:c);
  if(job.entity==='address')for(const a of [data.company.defaultAddress,...data.company.addresses||[]])if(a&&Number(a.id)===Number(job.targetId))Object.assign(a,salesBusinessPick_(actual,salesBusinessSchema_('address')));
  salesBusinessStore_(job.hqId,data);
  if(job.draftDependency){const draft=salesRead_('sales_drafts/'+salesKey_(job.draftDependency));if(!draft)throw Error('Kundenentwurf für Änderungsabschluss fehlt.');draft.pendingChanges=(draft.pendingChanges||[]).filter(p=>p.jobId!==job.id);draft.revision=(draft.revision||0)+1;salesWrite_('sales_drafts/'+draft.id,draft);}
}
function salesAssignmentGuard_(raw){
  function clean(value){if(Array.isArray(value))return value.map(clean).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).filter(k=>!['CreatedOn','UpdatedOn','CreatedBy','UpdatedBy'].includes(k)&&!k.startsWith('@')).sort().map(k=>[k,clean(value[k])]));return value;}
  return clean(salesPick_(raw,['Id','Name','IndustrialSector','Description','IBAN','BIC','DebitorNumber','CreditorNumber','TaxId','DefaultDeliveryConditionId','DefaultPaymentConditionId','DefaultAddress','Addresses','CompanyTypes','CustomFields','Files']));
}
function salesBusinessDeferredTarget_(job){
  if(!job.draftDependency)return true;
  const parent=salesRead_('sales_jobs/'+salesKey_(job.draftDependency)),draft=salesRead_('sales_drafts/'+salesKey_(job.draftDependency));
  if(parent?.kind!=='createCompany'||parent.draftId!==draft?.id||job.companyRef!=='draft_'+draft.id)throw Error('Ursprüngliche Firmenanlage gehört nicht zur Änderung.');
  if(parent.state!=='synced'){job.state='pending';job.message='Änderung bleibt in Firebase vorgemerkt; zuerst die ursprüngliche HQ-Anlage klären und abschließen.';return false;}
  if(!draft.hqId||Number(draft.hqId)!==Number(parent.hqId))throw Error('HQ-Firmenzuordnung noch nicht eindeutig bestätigt.');
  const data=salesBusinessKnown_(draft.hqId),target=job.entity==='contact'?parent.contactId:job.entity==='address'?data.company.defaultAddress?.id:draft.hqId;
  job.hqId=salesId_(draft.hqId);job.targetId=salesId_(target);return true;
}
function salesBusinessRun_(job,verifyOnly){
  if(job.kind==='deleteCompany'){salesDeleteRun_(job,verifyOnly);return;}
  if(['communication','createContact'].includes(job.kind)){salesCommunicationRun_(job,verifyOnly);return;}
  if(job.kind==='history'){
    if(verifyOnly){salesHistoryTarget_(job,null);salesConfirmHistory_(job);return;}
    salesRunHistory_(job,null);return;
  }
  if(job.kind!=='entityChange'||job.business!==1)throw new Error('Unbekannter Stammdatenauftrag.');
  if(job.formPrevious&&!['synced','canceled'].includes(salesRead_('sales_jobs/'+salesKey_(job.formPrevious))?.state)){if(verifyOnly)throw Error('Vorheriger Teil der Kundenänderung ist noch offen.');job.state='pending';job.message='Änderung wartet auf Abschluss des vorherigen Teils dieses Formulars.';return;}
  if(!salesBusinessDeferredTarget_(job)){if(verifyOnly)throw Error('Keine HQ-Bestätigung der Änderung: ursprüngliche Anlage noch offen.');return;}
  salesBusinessKnown_(job.hqId);const actual=salesBusinessTarget_(job.hqId,job.entity,job.targetId),schema=salesBusinessSchema_(job.entity),current=salesBusinessPick_(actual,schema);
  if(job.formGroup&&job.change.customFields){const names=new Set(job.change.customFields.map(f=>f.name));current.customFields=(current.customFields||[]).filter(f=>names.has(f.name));}
  const conflicts=Object.keys(job.change).filter(k=>!salesBusinessEqual_(current,{[k]:job.change[k]})&&!salesBusinessEqual_(current,{[k]:job.base[k]}));
  if(conflicts.length){job.state='conflict';job.conflict={before:job.base,app:job.change,hq:salesPick_(current,Object.keys(job.change))};job.message='HQ und App unterscheiden sich. Bitte die Stammdatenwerte in der Auftragsübersicht vergleichen.';return;}
  let wrote=false;
  if(!salesBusinessEqual_(current,job.change)){
    if(verifyOnly){job.state='conflict';job.conflict={before:job.base,app:job.change,hq:salesPick_(current,Object.keys(job.change))};job.message='HQ-Ergebnis stimmt noch nicht mit der Änderung überein. HQ-Werte behalten verwirft den Auftrag; App-Werte verwenden bereitet eine erneut geprüfte Übertragung vor.';return;}
    if(job.entity==='contact'&&(job.change.defaultAddress!==undefined||job.change.eMail!==undefined)){
      if(!actual.defaultAddressId)throw new Error('Kontaktadresse ist nicht eindeutig zugeordnet. Bitte zuerst in HQ prüfen.');
      salesAssertOwnContactAddress_({hqId:job.hqId},job.targetId,salesId_(actual.defaultAddressId));
    }
    const payload={...current,...job.change};
    if(job.formGroup&&job.change.customFields)payload.customFields=[...(actual.customFields||[]).filter(f=>!job.change.customFields.some(c=>c.name===f.name)),...job.change.customFields];
    // Embedded address updates are optional. Do not resubmit an unrelated address
    // (older HQ contacts can have an incomplete address which cannot be PUT).
    if(job.entity==='contact'&&job.change.eMail!==undefined)payload.defaultAddress={...(payload.defaultAddress||{}),email:job.change.eMail};
    else if(job.entity==='contact'&&job.change.defaultAddress===undefined)delete payload.defaultAddress;
    salesBusinessValidate_(payload,schema,job.entity);
    const path=job.entity==='assignments'?'/v1/Companies('+job.hqId+')':job.entity==='types'?'/v2/Companies/'+job.hqId+'/UpdateCompanyTypes':job.entity==='company'?'/v2/Companies/'+job.hqId:job.entity==='contact'?'/v2/ContactPersons/'+job.targetId:'/v2/Companies/'+job.hqId+'/Addresses/'+job.targetId;
    const body=job.entity==='assignments'?{...salesPick_(actual.legacy,['Id','Name','IndustrialSector','Description','IBAN','BIC','DebitorNumber','CreditorNumber','TaxId','DefaultDeliveryConditionId','DefaultPaymentConditionId','DefaultAddress','Addresses','CompanyTypes','CustomFields','Files']),ResponsibleUsers:payload.responsibleUserIds.map(Id=>({Id})),Subsystems:payload.subsystemIds.map(Id=>({Id}))}:job.entity==='types'?payload.companyTypes:payload;
    if(job.entity==='assignments'&&!job.assignmentGuard)job.assignmentGuard=salesAssignmentGuard_(actual.legacy);
    salesBusinessTransport_(job,path,job.entity==='types'?'post':'put',body);
    wrote=true;
  }
  const after=wrote?salesBusinessTarget_(job.hqId,job.entity,job.targetId):actual;
  if(job.entity==='assignments'&&JSON.stringify(salesAssignmentGuard_(after.legacy))!==JSON.stringify(job.assignmentGuard||salesAssignmentGuard_(actual.legacy)))throw Error('HQ hat neben der Zuordnung weitere Firmenwerte verändert. Rückprüfung offen; kein erneuter Schreibversuch.');
  if(job.entity==='contact'&&job.change.defaultAddress===undefined){const expected=salesBusinessPick_(actual.defaultAddress||{},salesBusinessSchema_('address'));if(job.change.eMail!==undefined)expected.email=job.change.eMail;if(String(after.defaultAddressId??'')!==String(actual.defaultAddressId??'')||!salesBusinessEqual_(after.defaultAddress||{},expected))throw new Error('Kontaktadresse wurde unerwartet verändert. Rückprüfung offen.');}
  const confirmed=salesBusinessPick_(after,schema);if(job.formGroup&&job.change.customFields)confirmed.customFields=(confirmed.customFields||[]).filter(f=>job.change.customFields.some(c=>c.name===f.name));
  if(!salesBusinessEqual_(confirmed,job.change))throw new Error('Stammdaten-Rückprüfung noch offen.');
  salesBusinessFinish_(job,after);
}
function salesBusinessTransport_(job,path,method,body){
  const expected=['history','communication'].includes(job.kind)?'/v2/ContactHistories':job.kind==='createContact'?'/v2/ContactPersons':job.entity==='assignments'?'/v1/Companies('+salesId_(job.hqId)+')':job.entity==='types'?'/v2/Companies/'+salesId_(job.hqId)+'/UpdateCompanyTypes':job.entity==='company'?'/v2/Companies/'+salesId_(job.hqId):job.entity==='contact'?'/v2/ContactPersons/'+salesId_(job.targetId):job.entity==='address'?'/v2/Companies/'+salesId_(job.hqId)+'/Addresses/'+salesId_(job.targetId):null;
  if(job.entity==='assignments'&&(Number(body.Id)!==Number(job.hqId)||!Array.isArray(body.ResponsibleUsers)||!Array.isArray(body.Subsystems)))throw Error('Abweichendes Zuordnungsziel.');
  if(job.business!==1||job.state!=='running'||path!==expected||method!==(['history','communication','createContact'].includes(job.kind)||job.entity==='types'?'post':'put'))throw new Error('HQ-Schreibziel nicht freigegeben.');
  if(['communication','createContact'].includes(job.kind)&&Number(body.companyId)!==Number(job.hqId))throw new Error('Abweichendes Firmenziel.');
  const priorMarker={writeAttempted:job.writeAttempted,phaseWriteAttempted:job.phaseWriteAttempted,lastWrite:job.lastWrite};
  job.writeAttempted=true;job.phaseWriteAttempted=true;job.lastWrite={method:method.toUpperCase(),resource:path.replace(/\/\d+/g,'/{id}'),at:salesNow_(),status:null,fields:[]};
  try{salesWrite_('sales_jobs/'+job.id,job);}catch(e){Object.assign(job,priorMarker);throw e;}
  const result=UrlFetchApp.fetch('https://api.hellohq.io'+path,{method,contentType:'application/json',headers:{Authorization:'Bearer '+revenueToken_()},payload:JSON.stringify(body),muteHttpExceptions:true,followRedirects:false});
  job.lastWrite.status=result.getResponseCode();salesWrite_('sales_jobs/'+job.id,job);
  if(job.lastWrite.status<200||job.lastWrite.status>=300)throw new Error('HQ-Schreiben: HTTP '+job.lastWrite.status+'. Ausgang vor Wiederholung prüfen.');
  return result.getContentText()?JSON.parse(result.getContentText()):null;
}

/** Inspection never reconciles, binds, unlocks or writes a job. Only stored HQ IDs are read. */
function getSalesJobInspection(id){
  salesUser_(true);const job=salesRead_('sales_jobs/'+salesKey_(id));if(!job)throw new Error('Auftrag fehlt.');
  const draft=job.draftId?salesRead_('sales_drafts/'+salesKey_(job.draftId)):null,checks=[];
  const note='Nur gelesen. Auftrag und Sperre bleiben unverändert; keine erneute Anlage freigegeben.';
  const result=()=>({id:job.id,state:job.state,checks,note});
  function read(entity,key,label){
    if(!key){checks.push(label+': Keine gespeicherte HQ-ID. Ausgang bleibt ungeklärt.');return null;}
    try{return salesOne_(entity,salesId_(key));}catch(e){const http=/HTTP (\d{3})/.exec(e.message||'');checks.push(label+': '+(http?'HTTP '+http[1]+'; gespeicherte Zuordnung nicht bestätigt.':'Lesetest nicht bestätigt.')+' Keine Neuanlage.');return null;}
  }
  const hqId=job.hqId||draft?.hqId;
  if(job.hqId&&draft?.hqId&&Number(job.hqId)!==Number(draft.hqId)){checks.push('Firma: Gespeicherte HQ-Zuordnungen widersprechen sich.');return result();}
  const company=read('Companies',hqId,'Firma');if(!company)return result();
  if(job.kind==='createCompany'){
    if(!draft?.company){checks.push('Firma: Gespeicherter Entwurf fehlt.');return result();}
    const expected=draft.company,diff=[];
    for(const key of ['name','industrialSector'])if(!salesBusinessEqual_(company,{[key]:expected[key]}))diff.push(key);
    if(![expected.description,[expected.description,'[Sales-Test '+job.id+']'].filter(Boolean).join('\n')].includes(String(company.description||'').replace(/\r\n/g,'\n')))diff.push('description');
    if(!salesHomepageConfirmed_(company,expected.homepage))diff.push('homepage');
    if(!salesBusinessEqual_(company.defaultAddress||{},salesPick_(expected.defaultAddress,['street','houseNumber','zipCode','city','country','website'])))diff.push('defaultAddress');
    try{if(!(company.companyTypes||[]).some(t=>salesCompanyTypeId_(t)===Number(expected.companyTypes?.[0]?.companyTypeId)))diff.push('companyTypes');}catch{diff.push('companyTypes');}
    if(!(company.responsibleUsers||[]).some(u=>Number(u.userId||u.id)===Number(expected.responsibleUserIds?.[0])))diff.push('responsibleUsers');
    if(!salesSubsystemConfirmed_(company,expected.subsystemIds?.[0]))diff.push('subsystems');
    if((expected.customFields||[]).some(f=>!(company.customFields||[]).some(a=>a.name===f.name&&String(a.value)===String(f.value))))diff.push('customFields');
    checks.push('Firma: '+(diff.length?'Abweichende Felder: '+diff.join(', ')+'.':'Gespeicherte Anlagefelder stimmen überein.'));
    if(company.name!==expected.name)return result();
    if(draft.contact){const contact=read('ContactPersons',job.contactId,'Ansprechpartner');if(contact){if(Number(contact.companyId)!==Number(hqId))checks.push('Ansprechpartner: Gehört zu einer anderen Firma.');else {const fields=salesContactDifferences_(contact,draft.contact);checks.push('Ansprechpartner: '+(fields.length?'Abweichende Felder: '+fields.join(', ')+'.':'Gespeicherte Kontaktfelder stimmen überein.'));}}}
  }else if(job.kind==='entityChange'){
    try{const raw=job.entity==='company'?company:job.entity==='types'?{...company,companyTypes:salesCompanyTypes_(company.companyTypes)}:salesBusinessTarget_(hqId,job.entity,job.targetId);const current=salesBusinessPick_(raw,salesBusinessSchema_(job.entity));checks.push('Änderung: '+(salesBusinessEqual_(current,job.change)?'Gespeicherte Zielfelder stimmen überein.':'Gespeicherte Zielfelder noch nicht bestätigt.'));}catch{checks.push('Änderung: Ziel oder Felder nicht bestätigt.');}
  }else if(job.kind==='contactEmail'){
    try{if(!draft||!job.targetContact)throw Error('Zielzustand fehlt');const actual=salesContactEmailState_(draft,job.contactId);checks.push('Kontakt-E-Mail: '+(salesContactEmailEqual_(actual,job.targetContact)?'Gespeicherter Zielzustand stimmt überein.':'Gespeicherter Zielzustand noch nicht bestätigt.'));}catch{checks.push('Kontakt-E-Mail: Zuordnung oder gespeicherter Zielzustand nicht bestätigt.');}
  }else if(['history','communication'].includes(job.kind)){
    const row=read('ContactHistories',job.historyId,'Kommunikation');if(row){const diff=job.history?salesHistoryDifferences_(row,job.history):['Gespeicherter Zielzustand fehlt'];if(Number(row.companyId)!==Number(hqId))diff.push('companyId');if(row.syncId!=='sales-'+job.id)diff.push('syncId');checks.push('Kommunikation: '+(diff.length?'Nicht bestätigte Felder: '+Array.from(new Set(diff)).join(', ')+'.':'Gespeicherter Eintrag stimmt überein.'));}
  }else {checks.push('Firma: Gespeicherte HQ-ID ist lesbar. Weitere Zielfelder dieses Auftragstyps sind damit noch nicht bestätigt.');}
  return result();
}
