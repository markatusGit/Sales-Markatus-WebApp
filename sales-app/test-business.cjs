const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function productionFixture(){
  const prior=fs.readFileSync(__dirname+'/test-sales.cjs','utf8'),scope={require,__dirname,console,Buffer,URL};
  vm.runInNewContext(prior.slice(0,prior.indexOf("test('all public RPCs"))+'globalThis.f=fixture();globalThis.finish=finishCreate;',scope);
  const f=scope.f,r=f.ctx.saveSalesCompany({...f.input,name:'Synthetic production customer'});scope.finish(f,r.id);
  // Simulate an imported ordinary customer, with no app creation provenance.
  for(const key of Object.keys(f.db))if(/^sales_(drafts|jobs)\//.test(key))delete f.db[key];
  f.db['sales_directory/101']={company:f.db['sales_companies/101'].company,contacts:f.db['sales_companies/101'].contacts};
  vm.runInContext(['SalesV1.gs','SalesSync.gs','SalesLean.gs'].map(p=>fs.readFileSync(__dirname+'/'+p,'utf8')).join('\n'),f.ctx);
  return f;
}
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name);}
function edit(f,entity,change,targetId=entity==='contact'?202:entity==='address'?501:101){
  const model=f.ctx.getSalesEditor({companyId:101,entity,targetId});return f.ctx.saveSalesEntityChange({companyId:101,entity,targetId,base:model.base,change});
}
if(require.main===module){
test('unsent app customer edits update one creation intent, survive reload and reach HQ once',()=>{
 const f=productionFixture(),r=f.ctx.saveSalesCompany({...f.input,name:'Synthetic editable draft'}),ref='draft_'+r.id,n=f.calls.length;
 f.ctx.getSalesLeanView('customers');
 const save=(entity,change)=>{const targetId=['company','types'].includes(entity)?ref:ref+'_'+entity,model=f.ctx.getSalesEditor({companyId:ref,entity,targetId});return f.ctx.saveSalesEntityChange({...model,change,requestId:'edit-request-'+entity});};
 save('company',{name:'Synthetic updated draft',homepage:'https://synthetic.invalid',vatId:'synthetic-vat'});
  save('address',{city:'Synthetic updated city',phone:'synthetic-phone'});save('contact',{phoneMobile:'synthetic-mobile',note:'Synthetic note'});save('types',{companyTypes:[{companyTypeId:3,number:'synthetic-number'},{companyTypeId:2}]});
 assert.equal(f.calls.length,n,'edit and reload use no HQ');assert.equal(Object.values(f.db).filter(j=>j.kind==='createCompany').length,1);assert.equal(Object.values(f.db).filter(j=>j.kind==='entityChange').length,0);
  assert.equal(f.ctx.getSalesLeanCompany(ref).company.name,'Synthetic updated draft');assert.equal(f.ctx.getSalesLeanCompany(ref).company.companyTypes[0].name,'Kunde');assert.equal(f.ctx.getSalesLeanView('customers').companies.find(c=>c.id===ref).name,'Synthetic updated draft');
 for(let i=0;i<4&&f.db['sales_jobs/'+r.id].state!=='synced';i++)f.ctx.runSalesJob(r.id,f.db['sales_jobs/'+r.id].companyConfirmedAt?'contact':'company');
  assert.equal(f.db['sales_jobs/'+r.id].state,'synced',f.db['sales_jobs/'+r.id].message);assert.equal(f.calls.slice(n).filter(c=>c.method==='post'&&c.path==='/v2/Companies').length,1);
  assert.equal(f.remote.Companies[101].vatId,'synthetic-vat');assert.equal(f.remote.Companies[101].defaultAddress.phone,'synthetic-phone');assert.equal(f.remote.ContactPersons[202].note,'Synthetic note');assert.equal(f.remote.Companies[101].companyTypes.length,2);assert.equal(f.remote.Companies[101].companyTypes[0].number,'synthetic-number');
});
test('draft revision, foreign target, first-write guard and atomic failure protect original intent',()=>{
 const f=productionFixture(),r=f.ctx.saveSalesCompany(f.input),ref='draft_'+r.id,model=f.ctx.getSalesEditor({companyId:ref,entity:'company',targetId:ref}),input={...model,requestId:'edit-request-atomic',change:{name:'Synthetic changed'}};
 const original=JSON.stringify(f.db['sales_drafts/'+r.id]),commit=f.ctx.salesBulkRest_;f.ctx.salesBulkRest_=()=>{throw Error('Synthetic commit failed');};assert.throws(()=>f.ctx.saveSalesEntityChange(input),/commit failed/);assert.equal(JSON.stringify(f.db['sales_drafts/'+r.id]),original);f.ctx.salesBulkRest_=commit;
 f.ctx.saveSalesEntityChange(input);f.ctx.saveSalesEntityChange(input);assert.equal(f.db['sales_drafts/'+r.id].revision,1);
 assert.throws(()=>f.ctx.saveSalesEntityChange({...input,requestId:'different-request',change:{name:'Stale'}}),/inzwischen/);
 assert.throws(()=>f.ctx.getSalesEditor({companyId:ref,entity:'contact',targetId:'draft_foreign_contact'}),/gehört/);
 for(const state of ['running','uncertain','companyCreated']){f.db['sales_jobs/'+r.id].state=state;assert.equal(f.ctx.getSalesEditor(model).deferred,true);}
 f.db['sales_jobs/'+r.id].state='synced';assert.throws(()=>f.ctx.getSalesEditor(model),/geändert/);
 f.db['sales_jobs/'+r.id].state='pending';f.db['sales_jobs/'+r.id].writeAttempted=true;const before=JSON.stringify(f.db['sales_jobs/'+r.id]);f.ctx.saveSalesEntityChange({...input,revision:1,requestId:'new-request'});assert.equal(JSON.stringify(f.db['sales_jobs/'+r.id]),before);assert.equal(f.db['sales_drafts/'+r.id].company.name,'Synthetic changed');
});
test('partially transferred customer accepts deferred edits without changing creation, then writes only after completion',()=>{
 const f=productionFixture(),r=f.ctx.saveSalesCompany(f.input),ref='draft_'+r.id;f.ctx.getSalesLeanView('customers');f.ctx.runSalesJob(r.id,'company');
 const parent=JSON.stringify(f.db['sales_jobs/'+r.id]),original=JSON.stringify(f.db['sales_drafts/'+r.id].company),m=f.ctx.getSalesEditor({companyId:ref,entity:'company',targetId:ref}),input={...m,requestId:'deferred-company-edit',change:{name:'Synthetic deferred name'}},n=f.calls.length;
 assert.equal(m.deferred,true);const saved=f.ctx.saveSalesEntityChange(input);f.ctx.saveSalesEntityChange(input);assert.equal(f.calls.length,n);assert.equal(JSON.stringify(f.db['sales_jobs/'+r.id]),parent);assert.equal(JSON.stringify(f.db['sales_drafts/'+r.id].company),original);assert.equal(f.ctx.getSalesLeanCompany(ref).company.name,'Synthetic deferred name');assert.equal(f.db['sales_drafts/'+r.id].pendingChanges.length,1);
 f.ctx.salesSyncWrite_({id:saved.id});assert.equal(f.calls.length,n);assert.equal(f.db['sales_jobs/'+saved.id].state,'pending');assert.throws(()=>f.ctx.getSalesEditor(m),/vorgemerkt/);
 f.ctx.runSalesJob(r.id,'contact');assert.equal(f.db['sales_jobs/'+r.id].state,'synced');const completedParent=JSON.stringify(f.db['sales_jobs/'+r.id]);assert.equal(f.remote.Companies[101].name,f.input.name);assert.equal(f.ctx.getSalesLeanCompany(ref).company.name,'Synthetic deferred name');
 const posts=f.calls.filter(c=>c.method==='post').length;f.ctx.salesSyncWrite_({id:saved.id});assert.equal(f.db['sales_jobs/'+saved.id].state,'synced');assert.equal(f.remote.Companies[101].name,'Synthetic deferred name');assert.equal(f.calls.filter(c=>c.method==='post').length,posts);assert.equal(f.db['sales_drafts/'+r.id].pendingChanges.length,0);assert.equal(JSON.stringify(f.db['sales_jobs/'+r.id]),completedParent);assert.equal(f.ctx.getSalesLeanView('customers').companies.find(c=>c.id===ref).name,'Synthetic deferred name');
});
test('deferred contact/address edits preserve target ownership and can keep HQ values on conflict',()=>{
 const f=productionFixture(),r=f.ctx.saveSalesCompany(f.input),ref='draft_'+r.id;f.ctx.runSalesJob(r.id,'company');
 const save=(entity,change)=>{const m=f.ctx.getSalesEditor({companyId:ref,entity,targetId:ref+'_'+entity});return f.ctx.saveSalesEntityChange({...m,change,requestId:'deferred-'+entity+'-request'});};
 const c=save('contact',{phoneMobile:'synthetic-deferred-mobile'}),a=save('address',{city:'Synthetic deferred city'});f.ctx.runSalesJob(r.id,'contact');assert.equal(f.db['sales_jobs/'+r.id].state,'synced');f.remote.Companies[101].defaultAddress.city='Concurrent HQ city';
 f.ctx.salesSyncWrite_({id:c.id});assert.equal(f.remote.ContactPersons[202].phoneMobile,'synthetic-deferred-mobile');assert.throws(()=>f.ctx.salesSyncWrite_({id:a.id}),/HQ und App/);assert.equal(f.db['sales_jobs/'+a.id].state,'conflict');f.ctx.resolveSalesConflict(a.id,'hq');assert.equal(f.db['sales_drafts/'+r.id].pendingChanges.length,0);assert.equal(f.ctx.getSalesLeanCompany(ref).company.defaultAddress.city,'Concurrent HQ city');
});
test('unclear creation stays byte-identical while deferred edits wait, including interrupted read-only reconciliation',()=>{
 const f=productionFixture(),r=f.ctx.saveSalesCompany(f.input),ref='draft_'+r.id;f.db['sales_jobs/'+r.id].state='uncertain';f.db['sales_jobs/'+r.id].writeAttempted=true;
 const parent=JSON.stringify(f.db['sales_jobs/'+r.id]),m=f.ctx.getSalesEditor({companyId:ref,entity:'company',targetId:ref}),saved=f.ctx.saveSalesEntityChange({...m,requestId:'uncertain-deferred-request',change:{description:'Synthetic pending description'}}),n=f.calls.length;
 f.ctx.salesSyncWrite_({id:saved.id});assert.equal(f.calls.length,n);assert.equal(JSON.stringify(f.db['sales_jobs/'+r.id]),parent);f.db['sales_jobs/'+saved.id].state='running';assert.throws(()=>f.ctx.reconcileSalesJob(saved.id),/ursprüngliche Anlage/);assert.notEqual(f.db['sales_jobs/'+saved.id].state,'synced');
});
test('own HQ fields load once on demand, preserve exact HQ names and date/list types in new customers',()=>{
 const f=productionFixture(),get=f.ctx.salesHqGet_;delete f.db['sales_meta/catalog'].companyFieldsVersion;let definitions=0;f.ctx.salesHqGet_=path=>path==='/v2/Companies/CustomFieldDefinitions'?(definitions++,{data:[{name:'Erstelldatum',type:'Date'},{name:'Kundenherkunft',type:'DropdownCheckbox'},{name:'Unrelated field',type:'Text'}]}):get(path);
 const catalog=f.ctx.getSalesLeanView('new').catalog;f.ctx.getSalesLeanView('new');assert.equal(definitions,1);assert.equal(catalog.fields.length,2);
 const r=f.ctx.saveSalesCompany({...f.input,erstelldatum:'2026-11-18',Kundenherkunft:'Synthetic origin\nSynthetic second origin\nSynthetic origin'}),fields=f.db['sales_drafts/'+r.id].company.customFields;
 assert.equal(fields[0].name,'Kundenherkunft');assert.equal(fields[0].value.length,2);assert.equal(fields[1].name,'Erstelldatum');assert.equal(fields[1].value,'2026-11-18T00:00:00Z');assert.throws(()=>f.ctx.saveSalesCompany({...f.input,erstelldatum:'2026-02-30'}),/gültiges Datum/);
 assert.equal(f.ctx.salesCompany_({id:101,name:'Synthetic',customFields:fields}).customFields.length,2);
});
test('new contact address and empty defined HQ fields retain their target and type',()=>{
 const f=productionFixture();f.db['sales_meta/catalog'].fields=[{name:'Kundenherkunft',type:'Text'}];
 const m=f.ctx.getSalesEditor({companyId:101,entity:'company',targetId:101});assert.equal(m.customFieldDefinitions[0].name,'Kundenherkunft');
 const change={customFields:[...(m.base.customFields||[]),{name:'Kundenherkunft',type:'Text',value:'Synthetic source'}]},r=f.ctx.saveSalesEntityChange({...m,change});f.ctx.salesSyncWrite_({id:r.id});assert.equal(f.remote.Companies[101].customFields.find(x=>x.name==='Kundenherkunft').value,'Synthetic source');
 assert.throws(()=>edit(f,'company',{customFields:[{name:'Invented field',type:'Text',value:'x'}]}),/nicht bestätigt/);
 const draft=f.ctx.saveSalesCompany(f.input),ref='draft_'+draft.id,contact=f.ctx.getSalesEditor({companyId:ref,entity:'contact',targetId:ref+'_contact'});
 f.ctx.saveSalesEntityChange({...contact,requestId:'contact-address-edit',change:{defaultAddress:{...contact.base.defaultAddress,city:'Separate city',email:'synthetic@example.invalid'}}});
 for(let i=0;i<4&&f.db['sales_jobs/'+draft.id].state!=='synced';i++)f.ctx.runSalesJob(draft.id,f.db['sales_jobs/'+draft.id].companyConfirmedAt?'contact':'company');
 assert.equal(f.db['sales_jobs/'+draft.id].state,'synced',f.db['sales_jobs/'+draft.id].message);assert.equal(f.remote.ContactPersons[202].defaultAddress.city,'Separate city');assert.equal(f.remote.ContactPersons[202].eMail,'synthetic@example.invalid');
});
test('ignored newly edited creation fields fail readback without a repeated company POST',()=>{
 const f=productionFixture(),r=f.ctx.saveSalesCompany(f.input),ref='draft_'+r.id,m=f.ctx.getSalesEditor({companyId:ref,entity:'company',targetId:ref}),n=f.calls.length;f.ctx.saveSalesEntityChange({...m,requestId:'ignored-field-edit',change:{vatId:'synthetic-vat'}});
  f.ctx.runSalesJob(r.id,'company');delete f.remote.Companies[101].vatId;f.ctx.runSalesJob(r.id,'contact');assert.notEqual(f.db['sales_jobs/'+r.id].state,'synced');assert.match(f.db['sales_jobs/'+r.id].message,/company.vatId/);assert.equal(f.calls.slice(n).filter(c=>c.method==='post'&&c.path==='/v2/Companies').length,1);
});
test('all production RPCs authenticate before accessing customer or HQ data',()=>{
 const f=productionFixture();f.setEmail('outsider@example.invalid');const n=f.calls.length;
 for(const name of ['saveSalesCompany','getSalesEditor','saveSalesEntityChange','bindSalesCompanyResult','getSalesJobInspection'])assert.throws(()=>f.ctx[name]({}),/Zugriff/);
 assert.equal(f.calls.length,n);
});
test('ordinary imported customer captures each communication type without creation jobs or immediate HQ writes',()=>{
 for(const channel of ['Note','Mail','Call','Meeting','Visit']){
  const f=productionFixture(),n=f.calls.length,r=f.ctx.mutateSalesLean('saveSalesHistory',[{companyId:101,channel,reason:'Synthetic activity',content:'Synthetic content',contactOn:'2026-10-18T10:00:00Z',status:'Reached',recipientEmailAddress:'synthetic@example.invalid',contactPersonId:202}]);
  assert.equal(f.calls.length,n);assert.equal(r.patch.job.history.companyId,101);assert.equal(f.ctx.getSalesLeanCompany(101).histories.length,1);
  f.ctx.salesSyncWrite_({id:r.id});assert.equal(f.db['sales_jobs/'+r.id].state,'synced');const post=f.calls.slice(n).filter(c=>c.method==='post');assert.equal(post.length,1);assert.equal(post[0].path,'/v2/ContactHistories');
  const after=f.calls.length;f.ctx.salesSyncWrite_({id:r.id});assert.equal(f.calls.length,after);
 }
});
test('company edits store only changed values, display pending input and preserve unrelated current HQ fields',()=>{
 const f=productionFixture();f.remote.Companies[101].iban='synthetic-iban';const r=edit(f,'company',{name:'Synthetic renamed',vatId:'synthetic-vat'});
 assert.deepEqual(Object.keys(f.db['sales_jobs/'+r.id].change).sort(),['name','vatId']);assert.ok(!('detail' in r));assert.equal(r.entityPatch.change.name,'Synthetic renamed');assert.equal(f.ctx.getSalesLeanCompany(101).company.name,'Synthetic renamed');
 f.remote.Companies[101].description='Concurrent unrelated description';f.ctx.salesSyncWrite_({id:r.id});
 const put=f.calls.filter(c=>c.method==='put').at(-1);assert.equal(put.body.description,'Concurrent unrelated description');assert.equal(put.body.iban,'synthetic-iban');assert.equal(put.body.vatId,'synthetic-vat');assert.ok(!('id' in put.body));assert.ok(!('companyTypes' in put.body));assert.equal(f.db['sales_companies/101'].pendingChanges.length,0);
});
test('contact and address fields use the documented paths and preserve target ownership',()=>{
 const f=productionFixture(),r=edit(f,'contact',{phoneMobile:'synthetic-mobile',language:'de',note:'Synthetic note'});f.ctx.salesSyncWrite_({id:r.id});
 const put=f.calls.filter(c=>c.method==='put').at(-1);assert.equal(put.path,'/v2/ContactPersons/202');assert.equal(put.body.language,'de');assert.ok(!('companyId' in put.body));
 const a=edit(f,'address',{city:'Synthetic city',phone:'synthetic-phone',additionalInformation:'Synthetic address detail'});f.ctx.salesSyncWrite_({id:a.id});
 assert.equal(f.calls.filter(c=>c.method==='put').at(-1).path,'/v2/Companies/101/Addresses/501');assert.equal(f.remote.Companies[101].defaultAddress.city,'Synthetic city');
});
test('readonly, malformed and foreign targets are rejected without a write',()=>{
 const f=productionFixture(),n=f.calls.filter(c=>c.method!=='get').length;
 for(const change of [{id:999},{responsibleUserIds:[1]},{debitorNumber:'bad'},{eInvoiceType:'bad'},{name:''},{customFields:[{name:'x',type:'Wrong',value:'x'}]}])assert.throws(()=>edit(f,'company',change));
 assert.throws(()=>edit(f,'contact',{firstName:''}),/Pflicht/);assert.throws(()=>edit(f,'contact',{companyId:999}));
 f.remote.ContactPersons[999]={id:999,companyId:999};assert.throws(()=>f.ctx.getSalesEditor({companyId:101,entity:'contact',targetId:999}),/gehört/);
 assert.throws(()=>f.ctx.getSalesEditor({companyId:101,entity:'address',targetId:999}),/gehört/);assert.throws(()=>f.ctx.getSalesEditor({companyId:101,entity:'project',targetId:101}));
 assert.equal(f.calls.filter(c=>c.method!=='get').length,n);
});
test('concurrent same-field change causes conflict; HQ or App decision keeps unrelated values',()=>{
 for(const choice of ['hq','app']){
  const f=productionFixture(),r=edit(f,'company',{description:'Synthetic app value'}),n=f.calls.filter(c=>c.method!=='get').length;f.remote.Companies[101].description='Synthetic HQ value';f.ctx.runSalesJob(r.id);
  assert.equal(f.db['sales_jobs/'+r.id].state,'conflict');assert.equal(f.calls.filter(c=>c.method!=='get').length,n);f.ctx.resolveSalesConflict(r.id,choice);
  if(choice==='app')f.ctx.salesSyncWrite_({id:r.id});assert.equal(f.remote.Companies[101].description,choice==='app'?'Synthetic app value':'Synthetic HQ value');assert.equal(f.db['sales_companies/101'].pendingChanges.length,0);
 }
});
test('lost PUT response remains blocked until read-only reconciliation and never repeats the write',()=>{
 const f=productionFixture(),r=edit(f,'company',{homepage:'https://synthetic.invalid'}),fetch=f.ctx.UrlFetchApp.fetch;
 f.ctx.UrlFetchApp.fetch=(url,opt)=>{const result=fetch(url,opt);if(opt.method==='put')throw Error('Synthetic lost response');return result;};
 assert.equal(f.ctx.runSalesJob(r.id).state,'uncertain');assert.throws(()=>f.ctx.runSalesJob(r.id),/gesperrt/);assert.equal(f.ctx.reconcileSalesJob(r.id).state,'synced');assert.equal(f.calls.filter(c=>c.method==='put').length,1);
});
test('rejected update can be read-checked and explicitly discarded without an automatic retry',()=>{
 const f=productionFixture(),r=edit(f,'company',{vatId:'synthetic-rejected'}),fetch=f.ctx.UrlFetchApp.fetch;
 f.ctx.UrlFetchApp.fetch=(url,opt)=>opt.method==='put'?{getResponseCode:()=>400,getContentText:()=>'{"error":"synthetic"}'}:fetch(url,opt);
 assert.equal(f.ctx.runSalesJob(r.id).state,'uncertain');assert.equal(f.ctx.reconcileSalesJob(r.id).state,'conflict');f.ctx.resolveSalesConflict(r.id,'hq');assert.equal(f.db['sales_jobs/'+r.id].state,'canceled');assert.equal(f.db['sales_companies/101'].pendingChanges.length,0);
});
test('shared contact address blocks address/email edits before PUT',()=>{
 const f=productionFixture(),r=edit(f,'contact',{eMail:'synthetic@example.invalid'});f.remote.ContactPersons[202].defaultAddressId=501;
 assert.notEqual(f.ctx.runSalesJob(r.id).state,'synced');assert.equal(f.calls.filter(c=>c.method==='put').length,0);
});
test('contact email uses its own complete address and survives address-only HQ readback',()=>{
 const f=productionFixture();f.remote.ContactPersons[202].defaultAddress={...f.remote.Companies[101].defaultAddress,id:707,email:null};
 const r=edit(f,'contact',{eMail:'synthetic@example.invalid'}),fetch=f.ctx.UrlFetchApp.fetch;
 f.ctx.UrlFetchApp.fetch=(url,opt)=>{const result=fetch(url,opt);if(opt.method==='put'&&url.endsWith('/ContactPersons/202'))f.remote.ContactPersons[202].eMail=null;return result;};
 f.ctx.salesSyncWrite_({id:r.id});assert.equal(f.db['sales_companies/101'].contacts[0].eMail,'synthetic@example.invalid');assert.equal(f.remote.Companies[101].defaultAddress.email,undefined);
});
test('documented company type endpoint receives only known IDs and numbers',()=>{
 const f=productionFixture(),fetch=f.ctx.UrlFetchApp.fetch;f.ctx.UrlFetchApp.fetch=(url,opt)=>{
  if(url.endsWith('/Companies/101/UpdateCompanyTypes')){const rows=JSON.parse(opt.payload);f.calls.push({method:opt.method,path:'/v2/Companies/101/UpdateCompanyTypes',body:rows});f.remote.Companies[101].companyTypes=rows;return {getResponseCode:()=>200,getContentText:()=>''};}return fetch(url,opt);
 };
 const r=edit(f,'types',{companyTypes:[{companyTypeId:3,number:'synthetic-number'}]},101);assert.equal(r.entityPatch.typeNames['3'],'Kunde');f.ctx.salesSyncWrite_({id:r.id});assert.equal(f.remote.Companies[101].companyTypes[0].number,'synthetic-number');assert.equal(f.calls.at(-1).method,'get');
 assert.throws(()=>edit(f,'types',{companyTypes:[{companyTypeId:999}]},101),/bekannte/);
});
test('new ordinary company sends no marker and a lost POST cannot auto-adopt a name match',()=>{
 const f=productionFixture(),r=f.ctx.saveSalesCompany({...f.input,name:'Synthetic new customer',description:'Synthetic ordinary description'});f.remote.ContactPersons={};f.loseResponse();assert.equal(f.ctx.runSalesJob(r.id).state,'uncertain');
 assert.equal(f.calls.filter(c=>c.path==='/v2/Companies'&&c.method==='post').at(-1).body.description,'Synthetic ordinary description');assert.equal(f.db['sales_drafts/'+r.id].testOnly,undefined);
 assert.throws(()=>f.ctx.reconcileSalesJob(r.id),/gesperrt/);f.remote.Companies[999]={...f.remote.Companies[101],id:999,name:'Synthetic different'};assert.throws(()=>f.ctx.bindSalesCompanyResult(r.id,999),/stimmt/);
 const before=f.calls.filter(c=>c.path==='/v2/Companies'&&c.method==='post').length;f.ctx.bindSalesCompanyResult(r.id,101);f.ctx.runSalesJob(r.id,'company');assert.equal(f.calls.filter(c=>c.path==='/v2/Companies'&&c.method==='post').length,before);
});
test('HQ id-shaped company types normalize at read boundary and ambiguous types stay blocked',()=>{
 const f=productionFixture();f.remote.Companies[101].companyTypes=[{id:2,name:'Interessent',number:'S-2'}];
 const model=f.ctx.getSalesEditor({companyId:101,entity:'types',targetId:101});assert.equal(model.base.companyTypes[0].companyTypeId,2);assert.equal(model.base.companyTypes[0].number,'S-2');assert.ok(!('id' in model.base.companyTypes[0]));assert.equal(f.ctx.salesCompany_(f.remote.Companies[101]).companyTypes[0].companyTypeId,2);
 const n=f.calls.filter(c=>c.method!=='get').length;
 for(const row of [{id:2,companyTypeId:3},{id:0},{id:'invalid'}]){f.remote.Companies[101].companyTypes=[row];assert.throws(()=>f.ctx.getSalesEditor({companyId:101,entity:'types',targetId:101}),/nicht eindeutig/);}
 assert.equal(f.calls.filter(c=>c.method!=='get').length,n);
});
test('new company verifies documented id-shaped HQ types without a second company POST',()=>{
 const f=productionFixture(),before=f.calls.filter(c=>c.method==='post'&&c.path==='/v2/Companies').length,r=f.ctx.saveSalesCompany({...f.input,name:'Synthetic id type company'}),one=f.ctx.salesOne_;
 f.ctx.salesOne_=(entity,id)=>{const row=one(entity,id);if(entity==='Companies')row.companyTypes=row.companyTypes.map(t=>({id:t.companyTypeId}));return row;};
 assert.equal(f.ctx.runSalesJob(r.id,'company').state,'companyConfirmed');assert.equal(f.ctx.runSalesJob(r.id,'contact').state,'synced');assert.equal(f.calls.filter(c=>c.method==='post'&&c.path==='/v2/Companies').length,before+1);
});
test('job inspection is GET-only and leaves matching, missing and unknown outcomes locked',()=>{
 const f=productionFixture(),r=f.ctx.saveSalesCompany({...f.input,name:'Synthetic inspect company'});f.ctx.runSalesJob(r.id,'company');f.ctx.runSalesJob(r.id,'contact');f.db['sales_jobs/'+r.id].state='uncertain';
 let before=JSON.stringify(f.db),n=f.calls.length;const result=f.ctx.getSalesJobInspection(r.id);assert.equal(result.state,'uncertain');assert.ok(result.checks.some(x=>x.includes('Anlagefelder stimmen')));assert.ok(result.checks.some(x=>x.includes('Kontaktfelder stimmen')));assert.equal(JSON.stringify(f.db),before);assert.ok(f.calls.slice(n).every(c=>c.method==='get'));assert.equal(f.calls.length-n,2);
 f.ctx.salesOne_=()=>{throw Error('HQ-Lesetest: HTTP 404.');};before=JSON.stringify(f.db);const missing=f.ctx.getSalesJobInspection(r.id);assert.match(missing.checks[0],/HTTP 404/);assert.equal(JSON.stringify(f.db),before);
 delete f.db['sales_jobs/'+r.id].hqId;delete f.db['sales_drafts/'+r.id].hqId;f.ctx.salesOne_=()=>{throw Error('Must not search HQ');};assert.match(f.ctx.getSalesJobInspection(r.id).checks[0],/Keine gespeicherte HQ-ID/);
 f.setEmail('test@example.invalid');assert.throws(()=>f.ctx.getSalesJobInspection(r.id),/Zugriff|Administrator/);
});
test('ID-less embedded subsystem requires a unique fresh bounded HQ mapping',()=>{
 const f=productionFixture();f.remote.Subsystems={10:{id:10,name:'Synthetic main',isMaster:true,currency:'EUR'}};const company={subsystems:[{name:'Synthetic main',isMaster:true,currency:'EUR'}]},n=f.calls.length;assert.equal(f.ctx.salesSubsystemConfirmed_(company,10),true);assert.equal(f.calls.length,n+1);assert.match(f.calls.at(-1).path,/\$top=200/);
 f.remote.Subsystems[11]={id:11,name:'Synthetic main',isMaster:true,currency:'EUR'};assert.equal(f.ctx.salesSubsystemConfirmed_(company,10),false);delete f.remote.Subsystems[11];assert.equal(f.ctx.salesSubsystemConfirmed_(company,11),false);assert.equal(f.ctx.salesSubsystemConfirmed_({subsystems:[{name:'Synthetic main',currency:'USD'}]},10),false);
 const before=f.calls.filter(c=>c.method!=='get').length;for(let id=20;id<220;id++)f.remote.Subsystems[id]={id,name:'Synthetic '+id};assert.throws(()=>f.ctx.salesSubsystemConfirmed_(company,10),/nicht vollständig/);assert.equal(f.calls.filter(c=>c.method!=='get').length,before);
});
test('documented ID-less subsystem shape completes the original company without duplicate POST',()=>{
 const f=productionFixture(),r=f.ctx.saveSalesCompany({...f.input,name:'Synthetic subsystem contract'}),one=f.ctx.salesOne_;f.remote.Subsystems={4:{id:4,name:'Synthetic main',isMaster:true,currency:'EUR'}};
 f.ctx.salesOne_=(entity,id)=>{const row=one(entity,id);if(entity==='Companies')row.subsystems=[{name:'Synthetic main',isMaster:true,currency:'EUR'}];return row;};const before=f.calls.filter(c=>c.method==='post'&&c.path==='/v2/Companies').length;assert.equal(f.ctx.runSalesJob(r.id,'company').state,'companyConfirmed');assert.equal(f.ctx.runSalesJob(r.id,'contact').state,'synced');assert.equal(f.calls.filter(c=>c.method==='post'&&c.path==='/v2/Companies').length,before+1);
});
test('legacy email and history inspections report exact field status without reconciliation writes',()=>{
 const f=productionFixture(),r=f.ctx.saveSalesCompany({...f.input,name:'Synthetic inspection fields'});f.ctx.runSalesJob(r.id,'company');f.ctx.runSalesJob(r.id,'contact');const draft=f.db['sales_drafts/'+r.id],target=f.ctx.salesContactEmailState_(draft,202);
 f.db['sales_jobs/inspect-email']={id:'inspect-email',kind:'contactEmail',draftId:r.id,hqId:101,contactId:202,state:'uncertain',targetContact:target};let before=JSON.stringify(f.db);assert.match(f.ctx.getSalesJobInspection('inspect-email').checks.join(' '),/Zielzustand stimmt/);assert.equal(JSON.stringify(f.db),before);f.remote.ContactPersons[202].eMail='different@example.invalid';assert.match(f.ctx.getSalesJobInspection('inspect-email').checks.join(' '),/noch nicht bestätigt/);
 const history={companyId:101,syncId:'sales-inspect-history',reason:'Synthetic history',content:'Synthetic note',contactOn:'2026-11-17T09:00:00Z',contactHistoryChannel:'Note'};f.remote.ContactHistories[999]={...history,id:999,reason:'Synthetic changed'};f.db['sales_jobs/inspect-history']={id:'inspect-history',kind:'history',draftId:r.id,hqId:101,historyId:999,state:'uncertain',history};before=JSON.stringify(f.db);const n=f.calls.length,result=f.ctx.getSalesJobInspection('inspect-history');assert.match(result.checks.join(' '),/Nicht bestätigte Felder: reason/);assert.equal(JSON.stringify(f.db),before);assert.ok(f.calls.slice(n).every(c=>c.method==='get'));
});
console.log(count+' production checks passed.');
}
module.exports={productionFixture};
