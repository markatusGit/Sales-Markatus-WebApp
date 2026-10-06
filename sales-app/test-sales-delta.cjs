const assert=require('node:assert/strict'),{bulkFixture}=require('./test-sales-bulk.cjs');
const cases=[];function test(name,fn){cases.push({name,fn});}
function finish(f){let run=f.db['sales_meta/sync'];for(let i=0;i<1000&&run.state==='running';i++)run=f.step();assert.notEqual(run.state,'running');return run;}
test('completed r18 count mismatch recovers baseline without reading any whole entity again',()=>{
 const f=bulkFixture();f.finishBulk();const old=f.db['sales_meta/sync'];delete old.policy;old.state='completedWithErrors';old.errors=[{label:'Vollständigkeitsprüfung',message:'Old mismatch'}];f.db['sales_meta/bulk']={needsFull:true};
 const start=f.calls.length;const run=f.finishBulk();assert.equal(run.full,false);assert.ok(Object.values(run.entities).every(e=>e.seen===0));assert.equal(f.db['sales_meta/bulk'].needsFull,false);assert.ok(f.calls.slice(start).filter(c=>/\?/.test(c.path)&&!c.path.includes('$top=1&')).every(c=>decodeURIComponent(c.path).includes('updatedOn ge')||/\/\d+\?expand/.test(c.path)));
});
test('old baseline and count mismatch never trigger weekly or automatic full reload',()=>{
 const f=bulkFixture();f.finishBulk();f.db['sales_meta/bulk'].fullAt='2020-01-01';f.db['sales_meta/bulk'].needsFull=true;
 const run=f.finishBulk();assert.equal(run.full,false);assert.ok(Object.values(run.entities).every(m=>m.full===false));
});
test('unchanged baseline performs zero raw/company/project writes and no orphan scans',()=>{
 const f=bulkFixture();f.finishBulk();const start=f.transport.length,run=f.finishBulk();const ops=f.transport.slice(start);
 assert.equal(run.state,'completed');assert.equal(ops.filter(o=>o.op==='runQuery').length,0);assert.equal(ops.filter(o=>o.op==='commit').flatMap(o=>o.body.writes).length,0);assert.ok(Object.values(run.entities).every(m=>m.changed===0));
});
test('new company and contact unrelated to any magazine are imported and usable',()=>{
 const f=bulkFixture();f.finishBulk();const now=new Date().toISOString();f.remote.Companies[1234]={id:1234,name:'Synthetic independent customer',updatedOn:now};f.remote.ContactPersons[9876]={id:9876,companyId:1234,firstName:'Synthetic',updatedOn:now};
 f.finishBulk();assert.equal(f.db['sales_companies/1234'].contacts[0].id,9876);assert.equal(f.db['sales_directory/1234'].company.name,'Synthetic independent customer');
});
test('nested company address update and silent contact address update are preserved',()=>{
 const f=bulkFixture();f.remote.ContactPersons[300]={id:300,companyId:102,firstName:'Synthetic',defaultAddress:{email:'one@example.invalid'},updatedOn:'2026-01-01'};f.finishBulk();f.remote.Companies[102].defaultAddress={id:400,website:'https://synthetic.invalid',updatedOn:new Date().toISOString()};f.remote.ContactPersons[300].defaultAddress.email='two@example.invalid';
 const run=f.finishBulk();assert.equal(run.entities.Companies.seen,1);assert.equal(f.db['sales_companies/102'].contacts.find(c=>String(c.id)==='300').eMail,'two@example.invalid');assert.equal(f.db['sales_rawcompanies/102'].row.defaultAddress.website,'https://synthetic.invalid');
});
test('failed nested filter never retries with an unfiltered query or advances metadata',()=>{
 const f=bulkFixture();f.finishBulk();const metadata=JSON.stringify(f.db['sales_meta/bulk']),get=f.ctx.salesHqGet_;f.ctx.salesHqGet_=p=>{if(decodeURIComponent(p).includes('addresses/any'))throw Error('HQ-Lesetest: HTTP 400');return get(p);};f.ctx.startSalesSync();f.worker();assert.ok(f.db['sales_meta/sync'].paused);assert.match(f.db['sales_meta/sync'].blockedMessage,/Kein Gesamtimport/);assert.equal(JSON.stringify(f.db['sales_meta/bulk']),metadata);
});
test('edition-only run uses cached invoices and neither executes jobs nor changes cursors',()=>{
 const f=bulkFixture();f.remote.Projects[570]={id:570,companyId:102,number:'P70',name:'Synthetic magazine #70',updatedOn:'2026-01-01'};f.doc(70,1);f.remote.Documents[1].updatedOn='2026-01-01';f.finishBulk();
 const e=f.ctx.saveSalesEditionConfig({magazine:'Synthetic magazine',issue:70,projectId:570}).id;
 const metadata=JSON.stringify(f.db['sales_meta/bulk']),customer=JSON.stringify(f.db['sales_companies/102']),calls=f.calls.length;
 f.ctx.startSalesEditionRefresh();finish(f);assert.equal(f.calls.length,calls);assert.equal(f.db['sales_editions/'+e].documents.length,1);assert.equal(JSON.stringify(f.db['sales_meta/bulk']),metadata);assert.equal(JSON.stringify(f.db['sales_companies/102']),customer);
 assert.throws(()=>f.ctx.startSalesEditionRefresh(),/Keine neuen/);
});
test('edition grouping reads 6000 cached documents once for 60 editions sharing one bucket',()=>{
 const f=bulkFixture();f.finishBulk();const cache=f.db['sales_meta/bulk'],entries=[];
 for(let i=1;i<=60;i++){const id=1000+i*64;f.remote.Projects[id]={id,companyId:102,number:'P'+i,name:'Synthetic magazine #'+i};f.ctx.saveSalesEditionConfig({magazine:'Synthetic magazine',issue:i,projectId:id});entries.push({path:'sales_rawprojects/'+id,value:{generation:cache.entities.Projects.generation,row:f.remote.Projects[id]},index:{projectBucket:'40',companyBucket:'38'}});
   for(let j=1;j<=100;j++){const docId=i*100+j;entries.push({path:'sales_rawdocuments/'+docId,value:{generation:cache.entities.Documents.generation,row:{id:docId,projectId:id,companyId:102,number:'Synthetic-'+docId,date:'2026-01-01',netValue:100,currency:'EUR',documentType:'Invoice',documentStatusEntity:{documentStatusType:'Sent'}}},index:{projectBucket:'40',companyBucket:'38'}});}
 }
 f.ctx.salesBulkPut_(entries);let reads=0;const transport=f.ctx.pilotCall_;f.ctx.pilotCall_=(...args)=>{const reply=transport(...args);if(Array.isArray(reply))reads+=reply.filter(r=>r.document||r.found||r.missing).length;return reply;};
 const calls=f.calls.length;f.ctx.startSalesEditionRefresh();const run=finish(f);assert.equal(run.stats.editions,60);assert.equal(f.calls.length,calls);assert.equal(reads,6060);console.log('MEASURE edition join: 6000 documents / 60 editions / '+reads+' Firestore document reads (synthetic transport, excludes metadata/UI).');
});
test('edition pause and lost commit recover the same run, no HQ calls',()=>{
 const f=bulkFixture();const e=f.config(70);f.doc(70,1);f.finishBulk();f.db['sales_editions/'+e].cacheLinkPending=true;f.ctx.startSalesEditionRefresh();const id=f.db['sales_meta/sync'].id;f.ctx.pauseSalesSync(id);assert.ok(f.db['sales_meta/sync'].paused);f.ctx.startSalesSync();assert.equal(f.db['sales_meta/sync'].id,id);const n=f.calls.length;f.worker();assert.equal(f.calls.length,n);assert.equal(f.db['sales_editions/'+e].cacheLinkPending,false);
});
test('unauthorized users cannot start cached edition processing',()=>{
 const f=bulkFixture();f.setEmail('outside@example.invalid');assert.throws(()=>f.ctx.startSalesEditionRefresh(),/Zugriff/);
});
test('orphan summaries survive unchanged runs and later changes to only one stream',()=>{
 const f=bulkFixture();f.remote.ContactHistories[1]={id:1,companyId:null,content:'Synthetic orphan',updatedOn:'2026-01-01'};f.finishBulk();f.finishBulk();
 f.remote.ContactPersons[399]={id:399,companyId:null,firstName:'Synthetic orphan',updatedOn:new Date().toISOString()};f.finishBulk();assert.equal(f.db['sales_meta/unassignedsummary'].histories,1);assert.equal(f.db['sales_meta/unassignedsummary'].contacts,1);
});
test('silent plan amount changes are detected by bounded probes',()=>{
 const f=bulkFixture();f.remote.Projects[1]={id:1,companyId:102,name:'Synthetic project',updatedOn:'2026-01-01'};f.remote.PlannedRevenues[2]={id:2,projectId:1,companyId:102,netTotal:100,status:'Planned',updatedOn:'2026-01-01'};f.finishBulk();f.remote.PlannedRevenues[2].netTotal=150;const run=f.finishBulk();assert.equal(run.entities.PlannedRevenues.seen,0);assert.equal(run.entities.PlannedRevenues.changed,1);assert.equal(f.db['sales_rawplans/2'].row.netTotal,150);
});
test('edition refresh cannot supersede a paused sync and missing metadata never restarts full',()=>{
 const f=bulkFixture();f.finishBulk();const run=f.ctx.startSalesSync();f.ctx.pauseSalesSync(run.id);assert.throws(()=>f.ctx.startSalesEditionRefresh(),/abschließen/);assert.equal(f.db['sales_meta/sync'].id,run.id);f.ctx.startSalesSync();finish(f);delete f.db['sales_meta/bulk'];assert.throws(()=>f.ctx.startSalesSync(),/Kein erneuter Gesamtimport/);
});
test('changed probe cache write can resume after a lost response without advancing the watermark early',()=>{
 const f=bulkFixture();f.finishBulk();const meta=JSON.stringify(f.db['sales_meta/bulk']);f.remote.Companies[101].name='Synthetic changed silently';f.ctx.startSalesSync();let run=f.db['sales_meta/sync'];while(run.tasks[run.cursor].kind!=='deltaProbe')run=f.step();f.failCommit='after';f.worker();assert.ok(f.db['sales_meta/sync'].paused);assert.equal(JSON.stringify(f.db['sales_meta/bulk']),meta);const id=f.db['sales_meta/sync'].id;f.ctx.startSalesSync();run=finish(f);assert.equal(run.id,id);assert.equal(f.db['sales_companies/101'].company.name,'Synthetic changed silently');assert.equal(run.entities.Companies.count,2);
});
for(const c of cases){c.fn();console.log('PASS',c.name);}console.log(cases.length+' delta checks passed.');
