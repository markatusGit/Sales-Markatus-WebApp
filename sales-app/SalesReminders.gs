/** Personal reminders share the Firebase workspace without entering the HQ queue. */
function salesReminderPath_(user){
  const key=user.uid?salesAuthHash_(user.uid):Array.from(user.email,c=>c.codePointAt(0).toString(16)).join('-');
  return 'sales_reminders/'+key;
}
function salesReminderBook_(user){return salesRead_(salesReminderPath_(user))||{rows:[]};}
function salesReminderDate_(date){
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Bitte ein gültiges Wiedervorlagedatum auswählen.');
  const parsed=new Date(date+'T00:00:00Z');
  if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)throw Error('Bitte ein gültiges Wiedervorlagedatum auswählen.');
  return date;
}
function salesReminderList_(user){
  const open=salesReminderBook_(user).rows.filter(r=>!r.closed);
  if(!open.length)return [];
  const deleted=new Set((salesRead_('sales_meta/deleted_companies')?.ids||[]).map(String)),drafts=new Map();
  return open.filter(row=>{
    if(!row.companyRef.startsWith('draft_'))return !deleted.has(row.companyRef);
    if(!drafts.has(row.companyRef))drafts.set(row.companyRef,salesRead_('sales_drafts/'+salesKey_(row.companyRef.slice(6))));
    const draft=drafts.get(row.companyRef);
    return draft?.company&&!draft.deletedAt&&draft.deletion?.state!=='approved'&&!deleted.has(String(draft.hqId));
  }).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.id.localeCompare(b.id));
}
function listSalesReminders(){return salesReminderList_(salesUser_());}
function salesReminderCompany_(ref){
  const ctx=salesCommunicationCompany_(ref);
  if(ctx.draft?.deletion?.state==='approved'||ctx.deletion?.state==='approved')throw Error('Für diesen Kunden ist eine Löschung freigegeben.');
  return ctx;
}
function salesReminderOpen_(book,id,companyRef,revision){
  const row=book.rows.find(r=>r.id===id);
  if(!row||row.closed||row.companyRef!==companyRef||row.revision!==revision)throw Error('Die Wiedervorlage wurde inzwischen geändert. Bitte die Ansicht aktualisieren.');
  return row;
}
function saveSalesReminder(input){
  const user=salesUser_(),companyRef=salesKey_(input?.companyRef),request=salesKey_(input?.requestId),dueDate=salesReminderDate_(input?.dueDate);
  const id=input.id?salesKey_(input.id):request,moveOnly=input.id&&input.contactRef===undefined&&input.content===undefined;
  const content=moveOnly?undefined:salesText_(input.content,10000,false),contactRef=moveOnly?undefined:input.contactRef?salesKey_(input.contactRef):'';
  return salesLock_(()=>{
    salesAssertPrivate_(['sales_reminders/security-probe']);
    const book=salesReminderBook_(user),prior=book.rows.find(r=>r.id===id);
    if(prior&&prior.companyRef===companyRef&&(!input.id||prior.lastRequest===request))return prior.closed?{closedReminderId:id,message:'Wiedervorlage bereits erledigt.'}:{reminder:prior,message:'Wiedervorlage bereits gespeichert.'};
    if(prior&&!input.id)throw Error('Speicherkennung gehört zu einer anderen Wiedervorlage.');
    if(input.id)salesReminderOpen_(book,id,companyRef,input.revision);
    const ctx=salesReminderCompany_(companyRef),person=contactRef?salesCommunicationContact_(ctx,salesCommunicationData_(ctx.ref),contactRef):null;
    const row={id,companyRef,companyName:ctx.company.name||ctx.name,dueDate,contactRef:moveOnly?prior.contactRef:person?.ref||'',content:moveOnly?prior.content:content,revision:(prior?.revision||0)+1,lastRequest:request};
    book.rows=book.rows.filter(r=>r.id!==id).concat(row);
    salesWrite_(salesReminderPath_(user),book);
    return {reminder:row,message:input.id?'Wiedervorlage verschoben.':'Wiedervorlage gespeichert.'};
  });
}
function salesReminderCompletion_(capture,user){
  if(!capture.reminderId)return [];
  const book=salesReminderBook_(user),row=salesReminderOpen_(book,capture.reminderId,capture.companyRef,capture.reminderRevision);
  book.rows=book.rows.map(r=>r.id===row.id?{id:row.id,companyRef:row.companyRef,closed:true}:r);
  return [{path:salesReminderPath_(user),value:book}];
}
