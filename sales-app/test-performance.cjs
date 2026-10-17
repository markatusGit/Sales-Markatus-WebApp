const assert=require('node:assert/strict'),vm=require('node:vm');
const {baseline,instrument}=require('../scripts/audit-firestore.cjs');
const {bulkFixture}=require('./test-sales-bulk.cjs');
let count=0;function test(name,fn){fn();console.log('PASS '+name);count++;}
test('magazine projection bootstraps once, then reads only two compact roots',()=>{
 const {f,audit}=baseline();f.ctx.getSalesLeanView('magazine');
 const m=audit.measure('warm magazine',()=>f.ctx.getSalesLeanView('magazine'));
 assert.equal(m.readDocumentsModel,2);assert.equal(m.writtenDocuments,0);assert.equal(m.result.companies.length,3189);
 assert.ok(m.result.companies.every(c=>!c.contacts&&!c.histories&&!c.description&&!c.defaultAddress?.street));
 assert.ok(m.result.editions.every(e=>e.companyRevenue&&!e.documents&&!e.companies));
 assert.equal(m.hqRequests,0);console.log('MEASURE magazine: '+m.readDocumentsModel+' reads, '+m.writtenDocuments+' writes, '+Buffer.byteLength(JSON.stringify(m.result))+' response bytes');
});
test('compact filter fields and signed per-company revenue track actual writes',()=>{
 const f=bulkFixture(),id=f.config(70);f.doc(70,11);f.remote.Documents[12]={...f.remote.Documents[11],id:12,documentType:'CreditNote',netValue:25};f.finishBulk();
 f.ctx.getSalesLeanView('magazine');let e=f.ctx.salesRead_('sales_editions/'+id);assert.equal(f.ctx.getSalesLeanView('magazine').editions.find(e=>e.id===id).companyRevenue['102'],7500);
 const c=f.ctx.salesRead_('sales_companies/102');c.company.industrialSector='Synthetic sector';c.company.defaultAddress={city:'Synthetic city',street:'must not be transferred'};c.company.responsibleUsers=[{userId:4,firstName:'Synthetic',lastName:'Owner'}];
 f.ctx.salesBulkPut_([{path:'sales_companies/102',value:c},{path:'sales_directory/102',value:{company:c.company}}]);
 let row=f.ctx.getSalesLeanView('magazine').companies.find(c=>c.id==='102');assert.equal(row.defaultAddress.city,'Synthetic city');assert.equal(row.responsibleUsers[0].userId,4);assert.ok(!row.defaultAddress.street);
 f.ctx.setSalesDocumentExcluded({editionId:id,documentId:11,excluded:true});e=f.ctx.getSalesLeanView('magazine').editions.find(e=>e.id===id);assert.equal(e.companyRevenue['102'],-2500);assert.equal(e.complete,false);
});
test('status snapshot is one read even for a multipart durable run; opening import avoids job scans',()=>{
 const {f,audit}=baseline();f.ctx.startSalesSync();const run=f.ctx.salesRead_('sales_meta/sync');run.padding='x'.repeat(710000);f.ctx.salesWrite_('sales_meta/sync',run);
 const m=audit.measure('manual status',()=>f.ctx.getSalesSyncStatus());assert.equal(m.readDocumentsModel,1);assert.equal(m.writtenDocuments,0);assert.ok(!m.result.padding);
 const v=audit.measure('import view',()=>f.ctx.getSalesLeanView('import'));assert.equal(v.readDocumentsModel,2);assert.ok(!v.result.jobs&&!v.result.drafts);assert.ok(!v.readsByCollection.sales_jobs);
});
test('status is published on start, pause, resume, progress interval and completion without per-step writes',()=>{
 const f=bulkFixture();f.ctx.startSalesSync();let run=f.ctx.salesRead_('sales_meta/sync');assert.equal(f.ctx.getSalesSyncStatus().state,'running');
 const seen=f.ctx.getSalesSyncStatus().revision;run.revision+=5;run.updatedAt=new Date().toISOString();f.ctx.salesWrite_('sales_meta/sync',run);assert.equal(f.ctx.getSalesSyncStatus().revision,seen);
 run.statusPublishedAt='2000-01-01';f.ctx.salesWrite_('sales_meta/sync',run);assert.equal(f.ctx.getSalesSyncStatus().revision,run.revision);
 f.ctx.pauseSalesSync(run.id);assert.ok(f.ctx.getSalesSyncStatus().paused);f.ctx.startSalesSync();assert.equal(f.ctx.getSalesSyncStatus().paused,false);
 f.worker();assert.equal(f.ctx.getSalesSyncStatus().state,'completed');
});
test('saving access returns confirmed properties with zero Firestore work',()=>{
 const {f,audit}=baseline();const m=audit.measure('access save',()=>f.ctx.saveSalesAccess('pp@markatus.de synthetic@example.invalid'));
 assert.equal(m.readDocumentsModel,0);assert.equal(m.writtenDocuments,0);assert.equal(m.result.emails.length,2);
});
test('targeted history reload reuses the stored company and preserves old state on HQ failure',()=>{
 const {f,audit}=baseline();f.ctx.getSalesLeanCompany('10001');
 f.remote.ContactHistories[91]={id:91,companyId:10001,reason:'Synthetic edited old entry',content:'synthetic',contactOn:'2020-01-01',contactHistoryChannel:'Note'};
 const m=audit.measure('targeted history',()=>f.ctx.syncSalesLeanHistory('10001'));assert.equal(m.result.detail.histories[0].reason,'Synthetic edited old entry');assert.ok(m.readDocumentsModel<10);assert.equal(m.readsByCollection.sales_companies,1);assert.ok(!m.readsByCollection.sales_editions);assert.equal(m.hqRequests,2);
 const before=JSON.stringify(f.ctx.salesRead_('sales_companies/10001')),get=f.ctx.salesHqGet_;f.ctx.salesHqGet_=path=>{if(path.includes('/Documents?'))throw Error('Synthetic HTTP 503');return get(path);};
 assert.throws(()=>f.ctx.syncSalesLeanHistory('10001'),/503/);assert.equal(JSON.stringify(f.ctx.salesRead_('sales_companies/10001')),before);
});
test('wrong-company HQ rows are rejected and unapproved callers cannot run new endpoints',()=>{
 const f=bulkFixture();f.finishBulk();const get=f.ctx.salesCollect_;f.ctx.salesCollect_=(e,...args)=>e==='ContactHistories'?[{id:9,companyId:999}]:get(e,...args);
 const before=JSON.stringify(f.db['sales_companies/102']);assert.throws(()=>f.ctx.syncSalesLeanHistory('102'),/Firmenfilter/);assert.equal(JSON.stringify(f.db['sales_companies/102']),before);
 f.setEmail('outside@example.invalid');for(const fn of [()=>f.ctx.syncSalesLeanHistory('102'),()=>f.ctx.getSalesSyncStatus(),()=>f.ctx.getSalesStorageInventoryPage({})])assert.throws(fn,/Zugriff/);
});
test('empty delta pages need no journals and unchanged 60-probe sync beats published r20 budget',()=>{
 const f=bulkFixture();f.config(70);f.doc(70,1001);
 for(const [i,entity] of ['Companies','ContactPersons','Projects','Documents','PlannedRevenues','ContactHistories'].entries())for(let j=0;Object.keys(f.remote[entity]).length<10;j++){
  const id=20000+i*1000+j;f.remote[entity][id]={id,companyId:102,projectId:570,name:'Synthetic',number:'S'+id,updatedOn:'2026-01-01',date:'2026-01-01',currency:'EUR',documentType:'Invoice',documentStatusEntity:{documentStatusType:'Sent'},netValue:1,reason:'Synthetic',content:'Synthetic',contactOn:'2026-01-01',contactHistoryChannel:'Note',estimations:[]};
 }
 f.finishBulk();const a=instrument(f),m=a.measure('unchanged sync',()=>{f.ctx.startSalesSync();f.worker();return f.ctx.salesRead_('sales_meta/sync');});
 assert.equal(m.result.state,'completed');assert.equal(Object.values(m.result.entities).reduce((n,e)=>n+(e.checked||0),0),60);
 assert.ok(m.readDocumentsModel-1<142);assert.ok(m.writtenDocuments<154);assert.equal(m.writesByCollection.sales_imports||0,0);
 console.log('MEASURE unchanged 60-probe sync: '+(m.readDocumentsModel-1)+' reads, '+m.writtenDocuments+' writes; published r20 model: 142 reads / 154 writes');
});
test('per-step document cache deduplicates reads and observes committed changes',()=>{
 const f=bulkFixture();f.finishBulk();vm.runInContext('salesBulkStepCache_={documents:new Map(),rows:new Map()}',f.ctx);
 const before=f.transport.length;const first=f.ctx.salesBulkGet_(['sales_rawcompanies/102','sales_rawcompanies/102']);f.ctx.salesBulkGet_(['sales_rawcompanies/102']);assert.equal(f.transport.length-before,1);
 const updated={...first['sales_rawcompanies/102'],row:{...first['sales_rawcompanies/102'].row,name:'Synthetic newer'}};
 f.ctx.salesBulkPut_([{path:'sales_rawcompanies/102',value:updated}]);assert.equal(f.ctx.salesBulkGet_(['sales_rawcompanies/102'])['sales_rawcompanies/102'].row.name,'Synthetic newer');vm.runInContext('salesBulkStepCache_=null',f.ctx);
});
test('a failed status publication after durable completion repairs the summary without replaying business work',()=>{
 const f=bulkFixture();f.finishBulk();instrument(f);const write=f.ctx.pilotWriteDocument_;let failed=false;
 f.ctx.pilotWriteDocument_=(project,path,value,token)=>{if(path==='sales_meta/lean_sync'&&JSON.parse(value.payload).state==='completed'&&!failed){failed=true;throw Error('Synthetic status response lost');}return write(project,path,value,token);};
 f.ctx.startSalesSync();f.worker();assert.equal(failed,true);assert.equal(f.ctx.salesRead_('sales_meta/sync').state,'completed');assert.equal(f.ctx.getSalesSyncStatus().state,'completed');assert.equal(f.ctx.getSalesSyncStatus().paused,false);assert.equal(f.triggers.length,0);
});
test('inventory is read-only, bounded, strips customer contents and reports partial reference metadata',()=>{
 const f=bulkFixture(),calls=[];f.ctx.pilotCall_=(url,opts)=>{calls.push({url,opts});return {documents:[{name:'projects/synthetic-project/databases/(default)/documents/sales_meta/synthetic',updateTime:'2026-01-01',fields:{payload:{stringValue:JSON.stringify({storageFormat:'sales-parts-v1',generation:'synthetic-generation',parts:8,length:710000})}}}],nextPageToken:'synthetic-next'};};
 const m=f.ctx.getSalesStorageInventoryPage({});assert.equal(m.documents,1);assert.equal(m.splitRoots,1);assert.equal(m.references[0],'synthetic-generation');assert.equal(m.next.pageToken,'synthetic-next');assert.equal(calls[0].opts.method,'get');assert.match(calls[0].url,/pageSize=50/);assert.ok(!JSON.stringify(m).includes('stringValue'));
 assert.throws(()=>f.ctx.getSalesStorageInventoryPage({collection:'users'}),/Inventurseite/);assert.equal(calls.length,1);
});
console.log(count+' performance and inventory tests passed.');
