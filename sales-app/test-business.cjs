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
test('all production RPCs authenticate before accessing customer or HQ data',()=>{
 const f=productionFixture();f.setEmail('outsider@example.invalid');const n=f.calls.length;
 for(const name of ['saveSalesCompany','getSalesEditor','saveSalesEntityChange','bindSalesCompanyResult'])assert.throws(()=>f.ctx[name]({}),/Zugriff/);
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
console.log(count+' production checks passed.');
}
module.exports={productionFixture};
