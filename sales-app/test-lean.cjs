const assert=require('node:assert/strict');
const {baseline}=require('../scripts/audit-firestore.cjs');
const {setup}=require('./test-sales-v1.cjs');
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
test('cold and warm home loads never scan customer data, drafts, jobs or raw collections',()=>{
 const {f,audit}=baseline();
 const first=audit.measure('cold home',()=>f.ctx.getSalesLeanState());
 assert.equal(first.readDocumentsModel,26);assert.equal(first.writtenDocuments,1);assert.equal(first.result.companies.length,0);assert.equal(first.result.directory.length,0);assert.equal(first.hqRequests,0);
 const warm=audit.measure('warm home',()=>f.ctx.getSalesLeanState());assert.equal(warm.readDocumentsModel,2);assert.equal(warm.writtenDocuments,0);
 assert.ok(Object.keys(warm.readsByCollection).every(c=>c==='sales_meta'));
});
test('names index bootstraps once and later costs one read without contacts or details',()=>{
 const {f,audit}=baseline();const first=audit.measure('first names',()=>f.ctx.getSalesLeanView('customers'));
 assert.equal(first.readDocumentsModel,3193);assert.equal(first.writtenDocuments,1);
 const second=audit.measure('warm names',()=>f.ctx.getSalesLeanView('customers'));assert.equal(second.readDocumentsModel,1);assert.equal(second.result.companies.length,3189);
 assert.deepEqual(Object.keys(second.result.companies[0]).sort(),['id','name']);assert.equal(second.writtenDocuments,0);
});
test('company membership is direct and only matching pending histories are overlaid',()=>{
 const {f,audit}=baseline();f.ctx.getSalesLeanCompany('10001');
 const row=audit.measure('warm detail',()=>f.ctx.getSalesLeanCompany('10001'));assert.equal(row.readDocumentsModel,4);assert.equal(row.writtenDocuments,0);assert.equal(row.hqRequests,0);
 assert.equal(row.readsByCollection.sales_directory,1);assert.equal(row.readsByCollection.sales_companies,1);
 const history={id:'own-history',kind:'history',hqId:10001,state:'pending',history:{reason:'Synthetic pending',content:'synthetic',syncId:'synthetic-sync'}};
 f.ctx.salesWrite_('sales_jobs/own-history',history);
 const next=audit.measure('detail with own history',()=>f.ctx.getSalesLeanCompany('10001'));assert.equal(next.readDocumentsModel,5);assert.equal(next.result.histories.length,1);
 f.ctx.salesWrite_('sales_jobs/other-history',{...history,id:'other-history',hqId:10002});
 const again=audit.measure('no foreign jobs',()=>f.ctx.getSalesLeanCompany('10001'));assert.equal(again.readDocumentsModel,5);assert.equal(again.result.histories.length,1);
});
test('all new endpoints reject missing identity before reads/writes and reject unknown mutations',()=>{
 const {f,audit}=baseline();f.setEmail('');
 for(const fn of [()=>f.ctx.getSalesLeanState(),()=>f.ctx.getSalesLeanView('customers'),()=>f.ctx.getSalesLeanCompany('10001'),()=>f.ctx.getSalesLeanEdition('project-501'),()=>f.ctx.mutateSalesLean('runSalesJob',['x'])]){
  const before=Object.keys(f.db).length;assert.throws(fn,/Zugriff/);assert.equal(Object.keys(f.db).length,before);
 }
 f.setEmail('pp@markatus.de');assert.throws(()=>f.ctx.mutateSalesLean('salesWrite_',['sales_meta/escape',{}]),/nicht freigegeben/);assert.throws(()=>f.ctx.getSalesLeanCompany('999999'),/Bestand/);
});
test('name and edition summaries track point updates and bulk projection updates',()=>{
 const {f,audit}=baseline();f.ctx.getSalesLeanState();f.ctx.getSalesLeanView('customers');
 const original=f.ctx.salesRead_('sales_directory/10001');original.company.name='Synthetic renamed';f.ctx.salesWrite_('sales_directory/10001',original);
 assert.equal(f.ctx.getSalesLeanView('customers').companies.find(c=>c.id==='10001').name,'Synthetic renamed');
 f.ctx.salesBulkPut_([{path:'sales_directory/10001',value:{...original,company:{...original.company,name:'Synthetic bulk rename'}}}]);
 assert.equal(f.ctx.getSalesLeanView('customers').companies.find(c=>c.id==='10001').name,'Synthetic bulk rename');
 const save=audit.measure('settings only',()=>f.ctx.saveSalesLeanEditionSettings({editionId:'project-501',revision:0,target:123}));assert.ok(save.readDocumentsModel<5);assert.ok(save.writtenDocuments<4);assert.ok(!save.result.edition.documents);
 assert.equal(f.ctx.getSalesLeanState().editions.find(e=>e.id==='project-501').settings.targetCents,12300);
 assert.throws(()=>f.ctx.saveSalesLeanEditionSettings({editionId:'project-501',revision:0,target:9}),/inzwischen/);
});
test('mutation patches contain only the touched draft/job and no global state',()=>{
 const f=setup();const result=f.ctx.mutateSalesLean('saveSalesTestCompany',[f.input]);
 assert.ok(result.patch.draft.id===result.id);assert.equal(result.patch.job.id,result.id);assert.equal(result.detail.company.id,'draft_'+result.id);assert.ok(!result.companies);assert.ok(!result.editions);
 assert.equal(f.calls.filter(c=>c.method==='post').length,2); // Only the fixture's existing setup, no HQ call from capture.
 const own=f.ctx.getSalesLeanCompany('101');assert.equal(own.company.localDraftId,'test-1');
 f.ctx.salesWrite_('sales_directory/101',{company:{id:'101',name:'Synthetic existing test'}});assert.equal(f.ctx.getSalesLeanCompany('101').company.localDraftId,'test-1');
});
test('names index retains pending drafts across a new session and deduplicates confirmed HQ IDs',()=>{
 const f=setup();const first=f.ctx.getSalesLeanView('customers');assert.ok(first.companies.some(c=>c.id==='draft_test-1'));
 const added=f.ctx.mutateSalesLean('saveSalesTestCompany',[{...f.input,name:'TEST synthetic pending'}]);assert.ok(f.ctx.getSalesLeanView('customers').companies.some(c=>c.id==='draft_'+added.id));
 const draft=f.ctx.salesRead_('sales_drafts/'+added.id);draft.hqId=999;f.ctx.salesWrite_('sales_drafts/'+added.id,draft);f.ctx.salesWrite_('sales_directory/999',{company:{id:'999',name:'TEST synthetic pending'}});
 const rows=f.ctx.getSalesLeanView('customers').companies;assert.equal(rows.filter(c=>String(c.hqId||c.id)==='999').length,1);
});
test('targeted HQ refresh keeps own TEST-company scope without widening write permissions',()=>{
 const f=setup(),before=f.calls.length,result=f.ctx.syncSalesLeanCompany('101');assert.equal(result.detail.company.id,'101');assert.ok(f.calls.slice(before).every(c=>c.method==='get'));
 f.setEmail('ordinary@example.invalid');assert.throws(()=>f.ctx.syncSalesLeanCompany('101'),/Zugriff/);
});
console.log(count+' click-driven data tests passed.');
