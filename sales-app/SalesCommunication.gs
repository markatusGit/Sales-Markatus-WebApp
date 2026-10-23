/** Customer-scoped overlays. Capture never calls HQ; stable request IDs make retries safe. */
function salesCommunicationCompany_(ref){
  ref=salesKey_(String(ref));
  if(ref.startsWith('draft_')){
    const draft=salesRead_('sales_drafts/'+ref.slice(6));
    if(!draft?.company)throw new Error('Kunde nicht im App-Bestand.');
    const stored=draft.hqId?salesRead_('sales_companies/'+draft.hqId):null;
    return {ref,draft,hqId:draft.hqId||null,company:stored?.company||draft.company,contacts:stored?.contacts||[],name:draft.company.name};
  }
  const id=salesId_(ref),data=salesRead_('sales_companies/'+id)||salesRead_('sales_directory/'+id);
  if(!data?.company||Number(data.company.id)!==id)throw new Error('Kunde nicht im bestätigten App-Bestand.');
  return {ref,hqId:id,company:data.company,contacts:data.contacts||[],name:data.company.name};
}
function salesCommunicationData_(ref){return salesRead_('sales_communication/'+ref)||{contacts:[],histories:[]};}
function salesCommunicationView_(data,base){
  const contacts=(base.contacts||[]).slice(),aliases=new Map();
  if(base.company?.localDraftId){const first=contacts.find(c=>c.localDraftId===base.company.localDraftId||base.patch?.job?.contactId&&String(c.id)===String(base.patch.job.contactId));if(first)aliases.set('draft_'+base.company.localDraftId+'_contact',first.id);}
  for(const c of data.contacts){
    const i=c.hqId?contacts.findIndex(x=>Number(x.id)===Number(c.hqId)):-1;
    const value={...(i<0?c:contacts[i]),id:c.hqId||c.id,localContactId:c.id,jobId:c.jobId,syncState:c.syncState};
    if(i<0)contacts.push(value);else contacts[i]=value;
    aliases.set(c.id,value.id);
  }
  const histories=(base.histories||[]).slice();
  for(const h of data.histories){
    const i=histories.findIndex(x=>x.syncId===h.syncId||h.historyId&&String(x.id)===String(h.historyId));
    const value={...h,contactPersonId:aliases.get(h.contactRef)||h.contactPersonId||h.contactRef,source:'app'};
    if(i<0)histories.push(value);else histories[i]={...histories[i],jobId:h.jobId,syncState:h.syncState,actor:h.actor};
  }
  return {...base,contacts,histories};
}
function salesCommunicationMerge_(value){
  if(!value?.company)return value;
  const ref=value.company.localDraftId?'draft_'+value.company.localDraftId:String(value.company.id);
  return {...salesCommunicationView_(salesCommunicationData_(ref),value),communicationRef:ref};
}
function salesCommunicationInput_(input,kind){
  if(!input||typeof input!=='object')throw new Error('Ungültige Eingabe.');
  const out={companyRef:salesKey_(String(input.companyRef)),requestId:salesKey_(String(input.requestId))};
  if(kind==='createContact'){
    for(const k of ['firstName','lastName','position','eMail','phoneMobile','phoneLandline'])out[k]=salesText_(input[k],200,['firstName','lastName'].includes(k));
    if(out.eMail&&!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(out.eMail))throw new Error('Bitte eine gültige E-Mail-Adresse eingeben.');
  }else{
    if(typeof input.notReached!=='boolean')throw new Error('Ungültiges Kontaktergebnis.');
    out.notReached=input.notReached;out.content=salesText_(input.content,10000,!input.notReached);
    out.contactRef=salesKey_(String(input.contactRef));out.contactOn=salesHistoryDate_(input.contactOn);
  }
  return out;
}
function salesCommunicationContact_(ctx,data,ref){
  const local=data.contacts.find(c=>c.id===ref||c.hqId&&String(c.hqId)===ref);
  if(local)return {ref:local.id,hqId:local.syncState==='synced'?local.hqId||null:null};
  const contact=ctx.contacts.find(c=>String(c.id)===ref&&Number(c.companyId)===Number(ctx.hqId));
  if(contact)return {ref,hqId:salesId_(contact.id)};
  if(ctx.draft?.contact){
    const creation=salesRead_('sales_jobs/'+ctx.draft.id);
    if(ref==='draft_'+ctx.draft.id+'_contact'||creation?.contactId&&String(creation.contactId)===ref)return {ref:'draft_'+ctx.draft.id+'_contact',hqId:creation?.steps?.contact?creation.contactId:null};
  }
  throw new Error('Bitte einen Ansprechpartner dieses Kunden auswählen.');
}
function salesCommunicationApplyJob_(job,data){
  if(job.kind==='createContact'){
    const c={...job.contact,id:'local_'+job.id,jobId:job.id,...(job.contactId?{hqId:job.contactId}:{}),syncState:job.state};
    const i=data.contacts.findIndex(x=>x.jobId===job.id);if(i<0)data.contacts.push(c);else data.contacts[i]=c;
  }else{
    const h={id:'local_'+job.id,jobId:job.id,syncId:'sales-'+job.id,contactRef:job.capture.contactRef,contactOn:job.capture.contactOn,content:job.capture.content||'Nicht erreicht',reason:job.capture.notReached?'Nicht erreicht':'Gespräch / Notiz',contactHistoryChannel:job.capture.notReached?'Call':'Note',...(job.capture.notReached?{contactHistoryStatus:'NotReached'}:{}),actor:job.actor,syncState:job.state,...(job.historyId?{historyId:job.historyId}:{})};
    const i=data.histories.findIndex(x=>x.jobId===job.id);if(i<0)data.histories.push(h);else data.histories[i]=h;
  }
  return data;
}
function salesCommunicationResult_(job,data){
  const result={id:job.id,message:job.state==='synced'?'Bereits gespeichert und in HQ bestätigt.':job.kind==='createContact'?'Ansprechpartner gespeichert; HQ-Abgleich offen.':'Kommunikation gespeichert; HQ-Abgleich offen.',patch:{job:salesJobSummary_(job)}};
  if(job.kind==='createContact')result.contact=data.contacts.find(c=>c.jobId===job.id);
  else result.communication=data.histories.find(h=>h.jobId===job.id);
  return result;
}
function salesCommunicationCommit_(job,data){
  const entries=[{path:'sales_jobs/'+job.id,value:job},{path:'sales_communication/'+job.companyRef,value:data}];
  // Existing chunk writer prepares any large payload first; publish both root documents atomically.
  const writes=entries.map(e=>({update:{name:salesBulkName_(e.path),fields:{payload:{stringValue:salesBulkPayload_(e.path,e.value)}}}}));
  salesBulkRest_('commit',{writes});
}
function salesCommunicationSave_(input,kind){
  const user=salesUser_(),capture=salesCommunicationInput_(input,kind);
  return salesLock_(()=>{
    salesAssertPrivate_();const id=salesKey_('comm_'+capture.requestId),path='sales_jobs/'+id,old=salesRead_(path);
    if(old){
      if(old.actor!==user.email||old.kind!==kind||JSON.stringify(old.capture)!==JSON.stringify(capture))throw new Error('Speicherkennung gehört zu einer anderen Eingabe.');
      const data=salesCommunicationData_(old.companyRef),before=JSON.stringify(data);salesCommunicationApplyJob_(old,data);if(JSON.stringify(data)!==before)salesWrite_('sales_communication/'+old.companyRef,data);return salesCommunicationResult_(old,data);
    }
    const ctx=salesCommunicationCompany_(capture.companyRef),data=salesCommunicationData_(ctx.ref);
    if(kind!=='createContact')salesCommunicationContact_(ctx,data,capture.contactRef);
    if(kind==='createContact'&&[...ctx.contacts,...data.contacts].some(c=>String(c.firstName).trim().toLocaleLowerCase('de')===capture.firstName.toLocaleLowerCase('de')&&String(c.lastName).trim().toLocaleLowerCase('de')===capture.lastName.toLocaleLowerCase('de')))throw new Error('Ein Ansprechpartner mit diesem Namen ist bereits vorhanden. Bitte den vorhandenen Kontakt auswählen.');
    const job={id,kind,business:1,companyRef:ctx.ref,hqId:ctx.hqId,name:ctx.name,capture,actor:user.email,...(user.uid?{actorUid:user.uid}:{}),state:'pending',createdAt:salesNow_(),updatedAt:salesNow_(),message:'In Firebase gespeichert; kontrollierter HQ-Abgleich offen.'};
    if(kind==='createContact')job.contact=salesPick_(capture,['firstName','lastName','position','eMail','phoneMobile','phoneLandline']);
    salesCommunicationApplyJob_(job,data);salesCommunicationCommit_(job,data);
    return salesCommunicationResult_(job,data);
  });
}
function saveSalesCommunication(input){return salesCommunicationSave_(input,'communication');}
function createSalesCustomerContact(input){return salesCommunicationSave_(input,'createContact');}
function salesCommunicationAfterJob_(job){
  if(!['communication','createContact'].includes(job.kind))return;
  const data=salesCommunicationData_(job.companyRef),before=JSON.stringify(data);salesCommunicationApplyJob_(job,data);if(JSON.stringify(data)!==before)salesWrite_('sales_communication/'+job.companyRef,data);
}
function salesCommunicationRun_(job,verifyOnly){
  const ctx=salesCommunicationCompany_(job.companyRef);
  if(!ctx.hqId)throw new Error('Firmenanlage noch offen; Kontakt und Kommunikation bleiben in Firebase.');
  if(ctx.draft){const parent=salesRead_('sales_jobs/'+ctx.draft.id);if(!parent?.steps?.contact||!parent.steps.company)throw new Error('Firmenanlage zuerst vollständig bestätigen.');}
  job.hqId=salesId_(ctx.hqId);
  if(job.kind==='createContact'){
    const company=salesOne_('Companies',job.hqId);if(Number(company.id)!==job.hqId)throw new Error('HQ-Firmenziel nicht bestätigt.');
    if(!job.contactId){
      if(verifyOnly||job.writeAttempted)throw new Error('HQ-Anlage ohne bestätigte Kontakt-ID. Auftrag bleibt gesperrt; HQ manuell prüfen und die geprüfte ID zuordnen.');
      const payload={companyId:job.hqId,salutationForm:'Formal'};
      for(const [k,v] of Object.entries(job.contact))if(v)payload[k]=v;
      if(job.contact.eMail)payload.defaultAddress={...salesContactAddressFields_(company.defaultAddress||{}),email:job.contact.eMail};
      const result=salesWriteHq_(job,'/v2/ContactPersons','post',payload);job.contactId=salesId_(result?.id);salesWrite_('sales_jobs/'+job.id,job);
    }
    const actual=salesContactWithAddress_(job.contactId);
    if(Number(actual.companyId)!==job.hqId||salesContactDifferences_(actual,job.contact).length)throw new Error('HQ-Kontakt stimmt nicht vollständig mit dem Anlageauftrag überein.');
    return;
  }
  const contact=salesCommunicationContact_(ctx,salesCommunicationData_(ctx.ref),job.capture.contactRef);
  if(!contact.hqId)throw new Error('Ansprechpartner noch nicht in HQ bestätigt; Kommunikation bleibt in Firebase.');
  job.history={companyId:job.hqId,contactPersonId:salesId_(contact.hqId),reason:job.capture.notReached?'Nicht erreicht':'Gespräch / Notiz',content:job.capture.content||'Nicht erreicht',contactOn:job.capture.contactOn,contactHistoryChannel:job.capture.notReached?'Call':'Note',...(job.capture.notReached?{contactHistoryStatus:'NotReached'}:{}),syncId:'sales-'+job.id};
  salesWrite_('sales_jobs/'+job.id,job);
  if(verifyOnly){salesHistoryTarget_(job,null);salesConfirmHistory_(job);}else salesRunHistory_(job,null);
}
function bindSalesCustomerContact(id,hqId){
  salesUser_(true);return salesLock_(()=>{
    const job=salesRead_('sales_jobs/'+salesKey_(id));
    if(job?.kind!=='createContact'||!['uncertain','running'].includes(job.state)||job.contactId||!job.writeAttempted)throw new Error('Keine unklare Kontaktanlage ohne ID.');
    const ctx=salesCommunicationCompany_(job.companyRef),actual=salesContactWithAddress_(salesId_(hqId));
    if(Number(actual.companyId)!==Number(ctx.hqId)||salesContactDifferences_(actual,job.contact).length)throw new Error('Die geprüfte Kontakt-ID passt nicht vollständig zu Firma und Anlageauftrag.');
    const data=salesCommunicationData_(job.companyRef);if(data.contacts.some(c=>c.jobId!==job.id&&Number(c.hqId)===Number(hqId)))throw new Error('Kontakt-ID ist bereits einem anderen Anlageauftrag zugeordnet.');
    job.hqId=ctx.hqId;job.contactId=salesId_(hqId);job.state='synced';job.updatedAt=salesNow_();job.message='Manuell geprüfte HQ-Kontakt-ID zugeordnet; kein weiterer Anlageversuch.';
    salesWrite_('sales_jobs/'+job.id,job);salesCommunicationAfterJob_(job);return {id:job.id,message:job.message,patch:{job:salesJobSummary_(job)}};
  });
}
function salesCommunicationOrder_(jobs){return jobs.slice().sort((a,b)=>(a.kind==='createContact'?0:1)-(b.kind==='createContact'?0:1));}
