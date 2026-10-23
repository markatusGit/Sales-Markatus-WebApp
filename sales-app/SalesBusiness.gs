/** Production customer edits. Only documented HQ fields; no project/document writes. */
function salesBusinessCanonical_(value){
  if(Array.isArray(value)){
    const rows=value.map(salesBusinessCanonical_);
    if(rows.length&&rows.every(v=>v&&typeof v==='object'&&!Array.isArray(v)&&v.companyTypeId!==undefined))rows.sort((a,b)=>Number(a.companyTypeId)-Number(b.companyTypeId));
    else if(rows.length&&rows.every(v=>v&&typeof v==='object'&&!Array.isArray(v)&&v.name!==undefined))rows.sort((a,b)=>String(a.name).localeCompare(String(b.name)));
    return rows;
  }
  if(value&&typeof value==='object'){const out=Object.create(null);Object.keys(value).sort().forEach(k=>{out[k]=salesBusinessCanonical_(value[k]);});return out;}return value;
}
function salesBusinessEqual_(actual,expected){
  return Object.keys(expected).every(k=>expected[k]&&typeof expected[k]==='object'?JSON.stringify(salesBusinessCanonical_(actual[k]))===JSON.stringify(salesBusinessCanonical_(expected[k])):String(actual[k]??'')===String(expected[k]??''));
}
function saveSalesCompany(input){return saveSalesTestCompany(input);}
function bindSalesCompanyResult(id,hqId){
  salesUser_(true);return salesLock_(()=>{
    salesAssertPrivate_();const job=salesRead_('sales_jobs/'+salesKey_(id));
    if(job?.kind!=='createCompany'||job.markerMode!=='none'||job.state!=='uncertain'||job.hqId||!job.writeAttempted)throw new Error('Keine offene Firmenzuordnung.');
    const draft=salesRead_('sales_drafts/'+job.draftId),actual=salesOne_('Companies',salesId_(hqId));
    if(!draft?.company||!salesBusinessEqual_(actual,salesPick_(draft.company,['name','description','industrialSector']))||!salesHomepageConfirmed_(actual,draft.company.homepage)||!salesBusinessEqual_(actual.defaultAddress||{},salesPick_(draft.company.defaultAddress,['street','houseNumber','zipCode','city','country','website'])))throw new Error('Die ausgewählte HQ-Firma stimmt nicht vollständig mit der gespeicherten Anlage überein. Auftrag bleibt gesperrt.');
    if(!(actual.companyTypes||[]).some(t=>Number(t.companyTypeId)===Number(draft.company.companyTypes?.[0]?.companyTypeId))||!(actual.responsibleUsers||[]).some(u=>Number(u.userId||u.id)===Number(draft.company.responsibleUserIds?.[0]))||!(actual.subsystems||[]).some(s=>Number(s.id)===Number(draft.company.subsystemIds?.[0]))||(draft.company.customFields||[]).some(f=>!(actual.customFields||[]).some(a=>a.name===f.name&&String(a.value)===String(f.value))))throw new Error('Firmenart, Verantwortlicher, Unternehmensbereich oder eigene HQ-Felder stimmen nicht überein.');
    if(salesCollect_('ContactPersons','companyId eq '+actual.id,Date.now()).length)throw new Error('Die ausgewählte Firma besitzt bereits Ansprechpartner. Bitte die vorhandene HQ-Anlage gesondert prüfen; keine neue Kontaktanlage freigegeben.');
    job.hqId=salesId_(actual.id);draft.hqId=job.hqId;job.state='ready';job.updatedAt=salesNow_();job.message='Manuell ausgewählte HQ-Firma nur lesend zugeordnet. Fortsetzung prüft die vorhandene Anlage; kein erneuter Firmen-POST.';
    salesWrite_('sales_drafts/'+draft.id,draft);salesWrite_('sales_jobs/'+job.id,job);return {id:job.id,message:job.message};
  });
}
function salesBusinessSchema_(entity){
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
function salesBusinessTarget_(hqId,entity,targetId){
  hqId=salesId_(hqId);targetId=salesId_(targetId);
  if(entity==='company'||entity==='types'){if(targetId!==hqId)throw new Error('Abweichendes Firmenziel.');return salesOne_('Companies',hqId);}
  if(entity==='contact'){const c=salesHqGet_('/v2/ContactPersons/'+targetId+'?expand=DefaultAddress,CustomFields').data;if(Number(c?.id)!==targetId||Number(c.companyId)!==hqId)throw new Error('Ansprechpartner gehört nicht zur Firma.');return {...c,eMail:salesContactEmail_(c)};}
  if(entity==='address'){
    const result=salesHqGet_('/v2/Companies/'+hqId+'/Addresses').data,rows=Array.isArray(result)?result:result?.data||result?.value;
    if(!Array.isArray(rows))throw new Error('Firmenadressen unvollständig.');const matches=rows.filter(a=>Number(a.id)===targetId);
    if(matches.length!==1)throw new Error('Adresse gehört nicht eindeutig zur Firma.');return matches[0];
  }throw new Error('Unbekannte Stammdatenart.');
}
function getSalesEditor(input){
  salesUser_();salesAssertPrivate_();const id=salesId_(input.companyId),schema=salesBusinessSchema_(input.entity),data=salesBusinessKnown_(id);
  const pending=(data.pendingChanges||[]).filter(p=>p.entity===input.entity&&Number(p.targetId)===Number(input.targetId));
  if(pending.length)throw new Error('Für diese Stammdaten ist bereits eine Änderung offen. Bitte zuerst den HQ-Sync abschließen oder den Konflikt in der Auftragsübersicht klären.');
  const raw=salesBusinessTarget_(id,input.entity,input.targetId);
  return {companyId:id,companyName:data.company.name,entity:input.entity,targetId:salesId_(input.targetId),schema,base:salesBusinessPick_(raw,schema),...(input.entity==='types'?{types:salesRead_('sales_meta/catalog')?.types||[]}:{})};
}
function salesBusinessView_(value){
  const data=JSON.parse(JSON.stringify(value));
  for(const p of data.pendingChanges||[]){
    if(p.entity==='company'){Object.assign(data.company,p.change);if(p.change.homepage!==undefined){data.company.homepageDisplay=p.change.homepage||'';data.company.homepageSource='App';}}
    if(p.entity==='types')data.company.companyTypes=p.change.companyTypes.map(t=>({...t,name:p.typeNames?.[t.companyTypeId]||'HQ-Firmenart '+t.companyTypeId}));
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
    salesAssertPrivate_();const hqId=salesId_(input.companyId),targetId=salesId_(input.targetId),entity=input.entity,schema=salesBusinessSchema_(entity),data=salesBusinessKnown_(hqId);
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
      const types=salesRead_('sales_meta/catalog')?.types||[];types.forEach(t=>typeNames[t.id]=t.name);
      if(!change.companyTypes?.length||new Set(change.companyTypes.map(t=>t.companyTypeId)).size!==change.companyTypes.length||change.companyTypes.some(t=>!Object.prototype.hasOwnProperty.call(typeNames,t.companyTypeId)))throw new Error('Bitte mindestens eine bekannte HQ-Firmenart auswählen.');
    }
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
  if(job.entity==='contact')data.contacts=(data.contacts||[]).map(c=>Number(c.id)===Number(job.targetId)?{...c,...salesContactView_(actual)}:c);
  if(job.entity==='address')for(const a of [data.company.defaultAddress,...data.company.addresses||[]])if(a&&Number(a.id)===Number(job.targetId))Object.assign(a,salesBusinessPick_(actual,salesBusinessSchema_('address')));
  salesBusinessStore_(job.hqId,data);
}
function salesBusinessRun_(job,verifyOnly){
  if(['communication','createContact'].includes(job.kind)){salesCommunicationRun_(job,verifyOnly);return;}
  if(job.kind==='history'){
    if(verifyOnly){salesHistoryTarget_(job,null);salesConfirmHistory_(job);return;}
    salesRunHistory_(job,null);return;
  }
  if(job.kind!=='entityChange'||job.business!==1)throw new Error('Unbekannter Stammdatenauftrag.');
  salesBusinessKnown_(job.hqId);const actual=salesBusinessTarget_(job.hqId,job.entity,job.targetId),schema=salesBusinessSchema_(job.entity),current=salesBusinessPick_(actual,schema);
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
    // Embedded address updates are optional. Do not resubmit an unrelated address
    // (older HQ contacts can have an incomplete address which cannot be PUT).
    if(job.entity==='contact'&&job.change.eMail!==undefined)payload.defaultAddress={...(payload.defaultAddress||{}),email:job.change.eMail};
    else if(job.entity==='contact'&&job.change.defaultAddress===undefined)delete payload.defaultAddress;
    salesBusinessValidate_(payload,schema,job.entity);
    const path=job.entity==='types'?'/v2/Companies/'+job.hqId+'/UpdateCompanyTypes':job.entity==='company'?'/v2/Companies/'+job.hqId:job.entity==='contact'?'/v2/ContactPersons/'+job.targetId:'/v2/Companies/'+job.hqId+'/Addresses/'+job.targetId;
    salesBusinessTransport_(job,path,job.entity==='types'?'post':'put',job.entity==='types'?payload.companyTypes:payload);
    wrote=true;
  }
  const after=wrote?salesBusinessTarget_(job.hqId,job.entity,job.targetId):actual;
  if(job.entity==='contact'&&job.change.defaultAddress===undefined){const expected=salesBusinessPick_(actual.defaultAddress||{},salesBusinessSchema_('address'));if(job.change.eMail!==undefined)expected.email=job.change.eMail;if(String(after.defaultAddressId??'')!==String(actual.defaultAddressId??'')||!salesBusinessEqual_(after.defaultAddress||{},expected))throw new Error('Kontaktadresse wurde unerwartet verändert. Rückprüfung offen.');}
  if(!salesBusinessEqual_(salesBusinessPick_(after,schema),job.change))throw new Error('Stammdaten-Rückprüfung noch offen.');
  salesBusinessFinish_(job,after);
}
function salesBusinessTransport_(job,path,method,body){
  const expected=['history','communication'].includes(job.kind)?'/v2/ContactHistories':job.kind==='createContact'?'/v2/ContactPersons':job.entity==='types'?'/v2/Companies/'+salesId_(job.hqId)+'/UpdateCompanyTypes':job.entity==='company'?'/v2/Companies/'+salesId_(job.hqId):job.entity==='contact'?'/v2/ContactPersons/'+salesId_(job.targetId):job.entity==='address'?'/v2/Companies/'+salesId_(job.hqId)+'/Addresses/'+salesId_(job.targetId):null;
  if(job.business!==1||job.state!=='running'||path!==expected||method!==(['history','communication','createContact'].includes(job.kind)||job.entity==='types'?'post':'put'))throw new Error('HQ-Schreibziel nicht freigegeben.');
  if(['communication','createContact'].includes(job.kind)&&Number(body.companyId)!==Number(job.hqId))throw new Error('Abweichendes Firmenziel.');
  job.writeAttempted=true;job.phaseWriteAttempted=true;job.lastWrite={method:method.toUpperCase(),resource:path.replace(/\/\d+/g,'/{id}'),at:salesNow_(),status:null,fields:[]};salesWrite_('sales_jobs/'+job.id,job);
  const result=UrlFetchApp.fetch('https://api.hellohq.io'+path,{method,contentType:'application/json',headers:{Authorization:'Bearer '+revenueToken_()},payload:JSON.stringify(body),muteHttpExceptions:true,followRedirects:false});
  job.lastWrite.status=result.getResponseCode();salesWrite_('sales_jobs/'+job.id,job);
  if(job.lastWrite.status<200||job.lastWrite.status>=300)throw new Error('HQ-Schreiben: HTTP '+job.lastWrite.status+'. Ausgang vor Wiederholung prüfen.');
  return result.getContentText()?JSON.parse(result.getContentText()):null;
}
