const assert=require('node:assert/strict'),{productionFixture}=require('./test-business.cjs');
function communicationFixture(){
  const f=productionFixture(),fetch=f.ctx.UrlFetchApp.fetch;let next=800;
  f.ctx.UrlFetchApp.fetch=(url,opt)=>{
    if(url.endsWith('/v2/ContactPersons')&&opt.method==='post'){
      const body=JSON.parse(opt.payload),id=++next,result={...body,id};f.calls.push({method:'post',path:'/v2/ContactPersons',body});f.remote.ContactPersons[id]=result;
      return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(result)};
    }return fetch(url,opt);
  };
  return f;
}
const capture=(requestId,extra={})=>({companyRef:'101',requestId,contactRef:'202',content:'Synthetic communication',contactOn:'2026-10-22T09:15:00.000Z',notReached:false,...extra});
const contact=(requestId,extra={})=>({companyRef:'101',requestId,firstName:'Synthetic',lastName:'Additional',...extra});
let count=0;function test(name,fn){fn();console.log('PASS '+name);count++;}
if(require.main===module){
test('new public RPCs authenticate without customer or HQ access',()=>{
 const f=communicationFixture();f.setEmail('outsider@example.invalid');let reads=0;f.ctx.salesRead_=()=>{reads++;};
 for(const name of ['saveSalesCommunication','createSalesCustomerContact','bindSalesCustomerContact'])assert.throws(()=>f.ctx[name]({}),/Zugriff/);
 assert.equal(reads,0);
});
test('capture uses three scoped reads and two writes, with zero lists or HQ calls; retry adds no write',()=>{
 const f=communicationFixture(),read=f.ctx.salesRead_,write=f.ctx.salesWrite_,calls=f.calls.length;let reads=[],writes=[];
 f.ctx.salesRead_=p=>{reads.push(p);return read(p);};f.ctx.salesWrite_=(p,v)=>{writes.push(p);return write(p,v);};f.ctx.salesList_=()=>{throw Error('No lists allowed');};
 const r=f.ctx.saveSalesCommunication(capture('one'));assert.equal(reads.length,3);assert.equal(writes.length,2);assert.equal(f.calls.length,calls);assert.equal(r.communication.actor,'pp@markatus.de');
 writes=[];f.ctx.saveSalesCommunication(capture('one'));assert.equal(writes.length,0);assert.equal(f.db['sales_communication/101'].histories.length,1);
 assert.throws(()=>f.ctx.saveSalesCommunication(capture('one',{content:'Changed'})),/anderen Eingabe/);
});
test('not reached permits an empty note; ordinary notes and missing or foreign contacts are rejected',()=>{
 const f=communicationFixture(),r=f.ctx.saveSalesCommunication(capture('notreached',{content:'',notReached:true}));
 assert.equal(r.communication.content,'Nicht erreicht');assert.equal(r.communication.contactHistoryStatus,'NotReached');
 for(const input of [capture('empty',{content:''}),capture('foreign',{contactRef:'999'}),capture('date',{contactOn:'2026-99-99'}),capture('company',{companyRef:'999'})])assert.throws(()=>f.ctx.saveSalesCommunication(input));
 assert.equal(Object.keys(f.db).filter(p=>p.startsWith('sales_jobs/')).length,1);
});
test('additional contact is immediately selectable, replay-safe, and survives replacement of the imported customer',()=>{
 const f=communicationFixture(),n=f.calls.length,r=f.ctx.createSalesCustomerContact(contact('new'));
 assert.equal(f.calls.length,n);f.ctx.createSalesCustomerContact(contact('new'));
 assert.equal(f.db['sales_communication/101'].contacts.length,1);assert.throws(()=>f.ctx.createSalesCustomerContact(contact('duplicate')),/bereits vorhanden/);
 f.ctx.saveSalesCommunication(capture('with-new',{contactRef:r.contact.id}));
 f.db['sales_companies/101']={...f.db['sales_companies/101'],contacts:[],histories:[]};
 const view=f.ctx.getSalesLeanCompany(101);assert.equal(view.contacts.length,1);assert.equal(view.histories.length,1);assert.equal(view.histories[0].contactPersonId,r.contact.id);
});
test('an interrupted atomic capture publishes neither job nor overlay; retry saves exactly once',()=>{
 for(const kind of ['contact','note']){
  const f=communicationFixture(),write=f.ctx.salesWrite_;let fail=true;
  f.ctx.salesWrite_=(p,v)=>{if(p==='sales_communication/101'&&fail){fail=false;throw Error('Synthetic interrupted overlay');}return write(p,v);};
  const fn=kind==='contact'?'createSalesCustomerContact':'saveSalesCommunication',input=kind==='contact'?contact('repair'):capture('repair');
  assert.throws(()=>f.ctx[fn](input),/interrupted/);assert.equal(Object.keys(f.db).filter(p=>p.startsWith('sales_jobs/')).length,0);assert.equal(f.db['sales_communication/101'],undefined);f.ctx[fn](input);
  assert.equal(Object.keys(f.db).filter(p=>p.startsWith('sales_jobs/')).length,1);
  assert.equal(f.db['sales_communication/101'][kind==='contact'?'contacts':'histories'].length,1);
 }
});
test('local company and its first contact can capture before HQ IDs exist, then transfer after the parent is confirmed',()=>{
 const f=communicationFixture(),created=f.ctx.saveSalesCompany({...f.input,name:'Synthetic local company'}),ref='draft_'+created.id;
 const r=f.ctx.saveSalesCommunication(capture('local',{companyRef:ref,contactRef:ref+'_contact'}));
 assert.equal(f.ctx.getSalesLeanCompany(ref).histories.length,1);assert.equal(f.ctx.runSalesJob(r.id).state,'pending');
 f.ctx.runSalesJob(created.id,'company');f.ctx.runSalesJob(created.id,'contact');
 assert.equal(f.ctx.getSalesLeanCompany(ref).histories[0].contactPersonId,801);
 assert.equal(f.ctx.runSalesJob(r.id).state,'synced');assert.equal(f.db['sales_jobs/'+r.id].history.contactPersonId,801);
 assert.equal(f.ctx.getSalesLeanCompany(ref).histories.length,1);
});
test('dependent jobs are ordered with contacts first, then notes; both transfer once to the verified company',()=>{
 const f=communicationFixture(),c=f.ctx.createSalesCustomerContact(contact('order-contact',{eMail:'synthetic@example.invalid'})),h=f.ctx.saveSalesCommunication(capture('order-history',{contactRef:c.contact.id}));
 const ordered=f.ctx.salesCommunicationOrder_([f.db['sales_jobs/'+h.id],f.db['sales_jobs/'+c.id]]);assert.equal(ordered[0].kind,'createContact');
 f.ctx.salesSyncWrite_({id:c.id});f.ctx.salesSyncWrite_({id:h.id});
 assert.equal(f.db['sales_jobs/'+h.id].state,'synced');assert.equal(f.db['sales_jobs/'+h.id].history.contactPersonId,801);
 const writes=f.calls.filter(c=>c.method==='post').length;f.ctx.salesSyncWrite_({id:c.id});f.ctx.salesSyncWrite_({id:h.id});assert.equal(f.calls.filter(c=>c.method==='post').length,writes);
 const view=f.ctx.getSalesLeanCompany(101);assert.equal(view.contacts.filter(c=>c.localContactId).length,1);assert.equal(view.histories.length,1);
});
test('lost contact POST without ID stays blocked and cannot adopt a name match; only a manually verified ID resolves it',()=>{
 const f=communicationFixture(),r=f.ctx.createSalesCustomerContact(contact('lost')),fetch=f.ctx.UrlFetchApp.fetch;
 f.ctx.UrlFetchApp.fetch=(url,opt)=>{const res=fetch(url,opt);if(opt.method==='post')throw Error('Synthetic lost response');return res;};
 assert.equal(f.ctx.runSalesJob(r.id).state,'uncertain');assert.throws(()=>f.ctx.runSalesJob(r.id),/gesperrt/);assert.throws(()=>f.ctx.reconcileSalesJob(r.id),/Kontakt-ID/);
 assert.throws(()=>f.ctx.bindSalesCustomerContact(r.id,202),/passt/);f.remote.ContactPersons[801].companyId=999;assert.throws(()=>f.ctx.bindSalesCustomerContact(r.id,801),/passt/);
 f.remote.ContactPersons[801].companyId=101;f.ctx.bindSalesCustomerContact(r.id,801);assert.equal(f.db['sales_jobs/'+r.id].state,'synced');assert.equal(f.calls.filter(c=>c.path==='/v2/ContactPersons'&&c.method==='post'&&c.body.lastName==='Additional').length,1);
});
test('contact POST ID survives a failed readback, and reconciliation never repeats the POST',()=>{
 const f=communicationFixture(),r=f.ctx.createSalesCustomerContact(contact('readback')),read=f.ctx.salesContactWithAddress_;let fail=true;
 f.ctx.salesContactWithAddress_=id=>{if(fail){fail=false;throw Error('Synthetic unavailable read');}return read(id);};
 assert.equal(f.ctx.runSalesJob(r.id).state,'uncertain');assert.equal(f.db['sales_jobs/'+r.id].contactId,801);assert.equal(f.ctx.reconcileSalesJob(r.id).state,'synced');
 assert.equal(f.calls.filter(c=>c.path==='/v2/ContactPersons'&&c.method==='post'&&c.body.lastName==='Additional').length,1);
});
test('a committed HQ job repairs an interrupted overlay without another POST',()=>{
 const f=communicationFixture(),r=f.ctx.createSalesCustomerContact(contact('mirror')),write=f.ctx.salesWrite_;let fail=true;
 f.ctx.salesWrite_=(p,v)=>{if(p==='sales_communication/101'&&v.contacts[0].syncState==='synced'&&fail){fail=false;throw Error('Synthetic mirror lost');}return write(p,v);};
 assert.throws(()=>f.ctx.runSalesJob(r.id),/mirror lost/);assert.equal(f.db['sales_jobs/'+r.id].state,'synced');
 f.ctx.salesSyncWrite_({id:r.id});assert.equal(f.db['sales_communication/101'].contacts[0].syncState,'synced');assert.equal(f.calls.filter(c=>c.path==='/v2/ContactPersons'&&c.body?.lastName==='Additional').length,1);
});
test('moved HQ contact blocks a note before POST, while a lost history response is read-checked without replay',()=>{
 const f=communicationFixture(),r=f.ctx.saveSalesCommunication(capture('moved'));f.remote.ContactPersons[202].companyId=999;assert.equal(f.ctx.runSalesJob(r.id).state,'pending');assert.equal(f.calls.filter(c=>c.path==='/v2/ContactHistories'&&c.method==='post').length,0);
 f.remote.ContactPersons[202].companyId=101;const fetch=f.ctx.UrlFetchApp.fetch;f.ctx.UrlFetchApp.fetch=(url,opt)=>{const res=fetch(url,opt);if(url.endsWith('/ContactHistories')&&opt.method==='post')throw Error('Synthetic lost response');return res;};
 assert.equal(f.ctx.runSalesJob(r.id).state,'uncertain');assert.equal(f.ctx.reconcileSalesJob(r.id).state,'synced');assert.equal(f.calls.filter(c=>c.path==='/v2/ContactHistories'&&c.method==='post').length,1);assert.equal(f.ctx.getSalesLeanCompany(101).histories.length,1);
});
console.log(count+' customer communication checks passed.');
}
module.exports={communicationFixture,capture,contact};
