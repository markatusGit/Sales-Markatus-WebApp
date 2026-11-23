const assert=require('node:assert/strict'),{bulkFixture}=require('./test-sales-bulk.cjs');
const cases=[];function test(name,fn){cases.push({name,fn});}
function finish(f){let run=f.db['sales_meta/sync'];for(let i=0;i<1000&&run.state==='running';i++)run=f.step();assert.notEqual(run.state,'running');return run;}
test('completed r18 count mismatch recovers baseline without reading any whole entity again',()=>{
 const f=bulkFixture();f.finishBulk();const old=f.db['sales_meta/sync'];delete old.policy;old.state='completedWithErrors';old.errors=[{label:'Vollständigkeitsprüfung',message:'Old mismatch'}];f.db['sales_meta/bulk']={needsFull:true};
 const start=f.calls.length;const run=f.finishBulk();assert.equal(run.full,false);assert.ok(Object.values(run.entities).every(e=>e.seen===0));assert.equal(f.db['sales_meta/bulk'].needsFull,false);assert.ok(f.calls.slice(start).filter(c=>/\?/.test(c.path)&&!c.path.includes('$top=1&')&&!/^\/v2\/(Users|CompanyTypes|Subsystems)\?/.test(c.path)&&!c.path.includes('/CustomFieldDefinitions?')).every(c=>decodeURIComponent(c.path).includes('updatedOn ge')||/\/\d+\?expand/.test(c.path)));
});
test('old baseline and count mismatch never trigger weekly or automatic full reload',()=>{
 const f=bulkFixture();f.finishBulk();f.db['sales_meta/bulk'].fullAt='2020-01-01';f.db['sales_meta/bulk'].needsFull=true;
 const run=f.finishBulk();assert.equal(run.full,false);assert.ok(Object.values(run.entities).every(m=>m.full===false));
});
test('unchanged baseline performs zero raw/company/project writes and no orphan scans',()=>{
 const f=bulkFixture();f.finishBulk();const start=f.transport.length,run=f.finishBulk();const ops=f.transport.slice(start);
 assert.equal(run.state,'completed');assert.equal(ops.filter(o=>o.op==='runQuery').length,0);assert.equal(ops.filter(o=>o.op==='commit').flatMap(o=>o.body.writes).length,0);assert.ok(Object.values(run.entities).every(m=>m.changed===0));
});
test('complete and incremental HQ sync only read invoices and planned revenues and refresh their Firebase copies',()=>{
 const f=bulkFixture(),edition=f.config(70);f.doc(70,1001);
 f.remote.Projects[700]={id:700,companyId:102,name:'Synthetic planned project',status:'InProgress'};
 f.remote.PlannedRevenues[701]={id:701,companyId:102,projectId:700,netTotal:500,currency:'EUR',startDate:'2026-12-01'};
 const initialCalls=f.calls.length,initial=f.finishBulk();
 assert.equal(initial.state,'completed');assert.equal(initial.full,true);
 assert.equal(f.db['sales_rawdocuments/1001'].row.netValue,100);
 assert.equal(f.db['sales_rawplans/701'].row.netTotal,500);

 const updatedOn=new Date().toISOString();
 Object.assign(f.remote.Documents[1001],{netValue:140,updatedOn});
 Object.assign(f.remote.PlannedRevenues[701],{netTotal:620,updatedOn});
 const deltaCalls=f.calls.length,delta=f.finishBulk();
 assert.equal(delta.state,'completed');assert.equal(delta.full,false);
 assert.equal(f.db['sales_rawdocuments/1001'].row.netValue,140);
 assert.equal(f.db['sales_rawplans/701'].row.netTotal,620);
 assert.equal(f.db['sales_editions/'+edition].documents[0].cents,14000);
 const project=f.db['sales_companies/102'].projects.find(p=>p.id==='700');
 assert.equal(project.plannedRevenues[0].netCents,62000);
 for(const [start,end] of [[initialCalls,deltaCalls],[deltaCalls,f.calls.length]]){
   const calls=f.calls.slice(start,end);
   for(const entity of ['Documents','PlannedRevenues'])assert.ok(calls.some(c=>c.path.startsWith('/v2/'+entity+'?')));
   assert.ok(calls.every(c=>c.method==='get'));
 }
});
test('new company and contact unrelated to any magazine are imported and usable',()=>{
 const f=bulkFixture();f.finishBulk();const now=new Date().toISOString();f.remote.Companies[1234]={id:1234,name:'Synthetic independent customer',updatedOn:now};f.remote.ContactPersons[9876]={id:9876,companyId:1234,firstName:'Synthetic',updatedOn:now};
 f.finishBulk();assert.equal(f.db['sales_companies/1234'].contacts[0].id,9876);assert.equal(f.db['sales_directory/1234'].company.name,'Synthetic independent customer');
});
test('nested company address update and silent contact address update are preserved',()=>{
 const f=bulkFixture();f.remote.ContactPersons[300]={id:300,companyId:102,firstName:'Synthetic',defaultAddress:{email:'one@example.invalid'},updatedOn:'2026-01-01'};f.finishBulk();f.remote.Companies[102].defaultAddress={id:400,website:'https://synthetic.invalid',updatedOn:new Date().toISOString()};f.remote.ContactPersons[300].defaultAddress.email='two@example.invalid';
 const run=f.finishBulk();assert.equal(run.entities.Companies.seen,1);assert.equal(f.db['sales_companies/102'].contacts.find(c=>String(c.id)==='300').eMail,'two@example.invalid');assert.equal(f.db['sales_rawcompanies/102'].row.defaultAddress.website,'https://synthetic.invalid');
});
test('whole-second HQ filters safely include fractional boundary rows and resume the same paused run',()=>{
 const f=bulkFixture();f.finishBulk();const watermark='2026-10-01T10:00:00.987Z';for(const m of Object.values(f.db['sales_meta/bulk'].entities))m.watermark=watermark;
 const filter=f.ctx.salesDeltaFilter_,get=f.ctx.salesHqGet_,meta=JSON.stringify(f.db['sales_meta/bulk']);
 f.ctx.salesDeltaFilter_=(entity,since)=>filter(entity,since).replaceAll(f.ctx.salesDeltaSince_(since),since);
 f.ctx.salesHqGet_=p=>{if(/datetime'[^']*\.\d+Z'/.test(decodeURIComponent(p)))throw Error('HQ-Lesetest: HTTP 400');return get(p);};
 f.ctx.startSalesSync();f.worker();const paused=f.db['sales_meta/sync'];assert.ok(paused.paused);assert.equal(JSON.stringify(f.db['sales_meta/bulk']),meta);
 f.remote.Companies[102].updatedOn='2026-10-01T09:58:00.100Z';f.remote.Companies[102].name='Synthetic second boundary';
 f.ctx.salesDeltaFilter_=filter;const calls=f.calls.length;f.ctx.startSalesSync();const run=finish(f);assert.equal(run.id,paused.id);assert.equal(run.full,false);assert.equal(run.entities.Companies.since,'2026-10-01T09:58:00.987Z');assert.equal(f.db['sales_companies/102'].company.name,'Synthetic second boundary');assert.ok(!f.calls.slice(calls).some(c=>c.method!=='get'));
 for(const entity of ['Companies','ContactPersons','Projects','Documents','PlannedRevenues','ContactHistories']){const query=f.ctx.salesDeltaFilter_(entity,'2026-10-01T09:58:00.987Z');assert.ok(query.includes("datetime'2026-10-01T09:58:00Z'"));assert.ok(!query.includes('.987'));}
 assert.equal(f.ctx.salesDeltaRecent_('Companies',{updatedOn:'2026-10-01T09:58:00.001Z'},'2026-10-01T09:58:00.987Z'),true);assert.equal(f.ctx.salesDeltaRecent_('Companies',{updatedOn:'2026-10-01T09:57:59.999Z'},'2026-10-01T09:58:00.987Z'),false);
});

test('failed nested filter never retries with an unfiltered query or advances metadata',()=>{
 const f=bulkFixture();f.finishBulk();const metadata=JSON.stringify(f.db['sales_meta/bulk']),get=f.ctx.salesHqGet_;f.ctx.salesHqGet_=p=>{if(decodeURIComponent(p).includes('addresses/any'))throw Error('HQ-Lesetest: HTTP 400');return get(p);};f.ctx.startSalesSync();f.worker();assert.ok(f.db['sales_meta/sync'].paused);assert.match(f.db['sales_meta/sync'].blockedMessage,/Kein Gesamtimport/);assert.equal(JSON.stringify(f.db['sales_meta/bulk']),metadata);
});
test('paused company filter diagnosis is bounded, read-only, cached and removes credentials',()=>{
 const f=bulkFixture();f.finishBulk();const get=f.ctx.salesHqGet_;f.ctx.salesHqGet_=p=>{if(decodeURIComponent(p).includes('addresses/any'))throw Error('HQ-Lesetest: HTTP 400');return get(p);};f.ctx.startSalesSync();f.worker();
 const before=JSON.stringify(f.db),cache=new Map(),requests=[];f.ctx.CacheService={getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})};f.ctx.revenueToken_=()=> 'synthetic-private-token';
 f.ctx.UrlFetchApp.fetch=(url,opt)=>{requests.push({url,opt});assert.equal(opt.method,'get');assert.equal(opt.followRedirects,false);const query=new URL(url).searchParams;assert.equal(query.get('$top'),'1');assert.ok(query.get('$filter').includes('datetime'));return {getResponseCode:()=>400,getContentText:()=>JSON.stringify({message:'Cannot filter addresses; synthetic-private-token test@example.invalid https://private.invalid/token'})};};
 const status=f.ctx.getSalesSyncStatus();assert.equal(requests.length,7);assert.equal(status.errors.length,f.db['sales_meta/lean_sync'].errors.length+1);assert.ok(!JSON.stringify(status).includes('synthetic-private-token'));assert.ok(!JSON.stringify(status).includes('test@example.invalid'));assert.equal(JSON.stringify(f.db),before);
 f.ctx.getSalesSyncStatus();assert.equal(requests.length,7,'Repeated manual status uses the cached diagnostic');assert.equal(JSON.stringify(f.db),before);
});
test('normal status and nonadministrator status never issue filter probes',()=>{
 const f=bulkFixture();f.finishBulk();f.ctx.UrlFetchApp.fetch=()=>{throw Error('Diagnostic not allowed');};f.ctx.getSalesSyncStatus();
 const summary={paused:true,id:'synthetic',revision:1,errors:[{message:'Unternehmen: HQ hat den Änderungsfilter abgelehnt'}]};assert.equal(f.ctx.salesDeltaDiagnosticStatus_(summary,false),summary);
});
test('filter diagnosis stops after authentication or server failure instead of retrying',()=>{
 const f=bulkFixture();let requests=0;f.ctx.revenueToken_=()=> 'synthetic-private-token';f.ctx.UrlFetchApp.fetch=(_,opt)=>{requests++;assert.equal(opt.method,'get');return {getResponseCode:()=>401,getContentText:()=>'{"message":"Not authorized"}'};};const out=f.ctx.salesDeltaFilterProbes_('2026-01-01T00:00:00.123Z',0);assert.equal(requests,1);assert.equal(out.length,1);assert.match(out[0],/HTTP 401/);
});
test('edition-only run uses cached invoices and neither executes jobs nor changes cursors',()=>{
 const f=bulkFixture();f.remote.Projects[570]={id:570,companyId:102,number:'P70',name:'Synthetic magazine #70',updatedOn:'2026-01-01'};f.doc(70,1);f.remote.Documents[1].updatedOn='2026-01-01';f.finishBulk();
 const e=f.ctx.saveSalesEditionConfig({magazine:'Synthetic magazine',issue:70,projectId:570}).id;
 const metadata=JSON.stringify(f.db['sales_meta/bulk']),customer=JSON.stringify(f.db['sales_companies/102']),calls=f.calls.length;
 assert.equal(f.ctx.getSalesV1State().capabilities.editionRefreshViaSync,true);f.ctx.startSalesSync({mode:'editions'});finish(f);assert.equal(f.calls.length,calls);assert.equal(f.db['sales_editions/'+e].documents.length,1);assert.equal(JSON.stringify(f.db['sales_meta/bulk']),metadata);assert.equal(JSON.stringify(f.db['sales_companies/102']),customer);
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
 const f=bulkFixture();f.setEmail('outside@example.invalid');assert.throws(()=>f.ctx.startSalesEditionRefresh(),/Zugriff/);assert.throws(()=>f.ctx.startSalesSync({mode:'editions'}),/Zugriff/);
});
test('invalid edition gateway requests cannot fall back to HQ sync',()=>{
 const f=bulkFixture(),before=JSON.stringify(f.db),calls=f.calls.length;
 for(const request of [null,{},[],{mode:'other'},{mode:'editions',extra:true}])assert.throws(()=>f.ctx.startSalesSync(request),/Unbekannter Abgleichmodus/);
 assert.equal(JSON.stringify(f.db),before);assert.equal(f.calls.length,calls);
});
test('missing edition backend rejects gateway and advertises no capability',()=>{
 const f=bulkFixture();f.ctx.startSalesEditionRefresh=undefined;assert.equal(f.ctx.getSalesV1State().capabilities.editionRefreshViaSync,false);const before=JSON.stringify(f.db),calls=f.calls.length;
 assert.throws(()=>f.ctx.startSalesSync({mode:'editions'}),/Ausgabenverknüpfung fehlt/);assert.equal(JSON.stringify(f.db),before);assert.equal(f.calls.length,calls);
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
function cleanupFixture(){
 const f=bulkFixture();f.remote.PlannedRevenues[108]={id:108,companyId:102,projectId:null,netTotal:100,updatedOn:'2026-01-01T00:00:00Z'};f.finishBulk();f.ctx.startSalesSync();const run=f.ctx.salesRead_('sales_meta/sync'),raw=f.ctx.salesRead_('sales_rawplans/108');
 run.planCleanupPending=true;run.errors=[{label:'HQ-Einzelprüfung · Planumsätze',message:'Kennung 108 wurde nicht mehr gefunden. Gespeicherter Datensatz bleibt zur Klärung erhalten; keine automatische Löschung.'},{kind:'write',id:'unrelated',message:'Synthetic unrelated'}];
 f.ctx.salesWrite_('sales_meta/sync',run);f.ctx.salesWrite_('sales_meta/plan_cleanup_'+run.id,{approved:true,runId:run.id,id:108,generation:raw.generation,before:raw.row,state:'approved',source:'synthetic explicit request'});delete f.remote.PlannedRevenues[108];return {f,run,raw};
}
test('explicit orphan-plan cleanup rechecks HQ twice and atomically adjusts raw row, both counters and audit without resuming the run',()=>{
 const {f,run,raw}=cleanupFixture(),cursor=run.cursor,tasks=JSON.stringify(run.tasks),calls=f.calls.length;f.props.SALES_SYNC_HOLD='synthetic-hold';f.ctx.salesDeltaResolvePlan_(run);
 assert.equal(f.db['sales_rawplans/108'],undefined);assert.equal(f.db['sales_meta/bulk'].entities.PlannedRevenues.count,0);assert.equal(run.entities.PlannedRevenues.count,0);assert.ok(!run.entities.PlannedRevenues.knownIds.includes('108'));assert.ok(!f.db['sales_meta/bulk'].entities.PlannedRevenues.ids.includes('108'));
 assert.equal(run.cursor,cursor);assert.equal(JSON.stringify(run.tasks),tasks);assert.equal(run.planCleanupPending,false);assert.equal(run.errors.length,1);assert.equal(run.errors[0].id,'unrelated');assert.equal(f.props.SALES_SYNC_HOLD,'synthetic-hold');
 const request=f.db['sales_meta/plan_cleanup_'+run.id];assert.equal(request.state,'removed');assert.deepEqual(request.before,raw.row);assert.equal(f.calls.length-calls,2);assert.ok(f.calls.slice(calls).every(c=>c.method==='get'));
 assert.throws(()=>f.ctx.salesDeltaResolvePlan_(run),/nicht freigegeben/);assert.equal(f.db['sales_meta/bulk'].entities.PlannedRevenues.count,0);
});
test('orphan-plan cleanup keeps a reappeared record and its indexes instead of deleting it',()=>{
 const {f,run,raw}=cleanupFixture();f.remote.PlannedRevenues[108]={...raw.row,netTotal:150};f.ctx.salesDeltaResolvePlan_(run);
 assert.equal(f.db['sales_rawplans/108'].row.netTotal,150);assert.equal(f.fields['sales_rawplans/108'].companyBucket.stringValue,'38');assert.equal(f.fields['sales_rawplans/108'].projectBucket.stringValue,'none');assert.equal(run.entities.PlannedRevenues.count,1);assert.equal(f.db['sales_meta/plan_cleanup_'+run.id].state,'refreshed');
});
test('cleanup stops on an HQ error, contradictory list, changed generation or a project-linked plan without dropping financial data',()=>{
 for(const mode of ['http','list','generation','project']){const {f,run}=cleanupFixture(),get=f.ctx.salesHqGet_;
  if(mode==='http')f.ctx.salesHqGet_=()=>{throw Error('HQ-Lesetest: HTTP 503');};
  if(mode==='list')f.ctx.salesHqGet_=path=>path.includes('/PlannedRevenues?')?{data:[{id:108}],headers:{'helloHQ-Count':1}}:get(path);
  if(mode==='generation')f.ctx.salesWrite_('sales_rawplans/108',{...f.db['sales_rawplans/108'],generation:'other'});
  if(mode==='project')f.ctx.salesWrite_('sales_rawplans/108',{...f.db['sales_rawplans/108'],row:{...f.db['sales_rawplans/108'].row,projectId:99}});
  const before=JSON.stringify(f.db);assert.throws(()=>f.ctx.salesDeltaResolvePlan_(run),/HTTP 503|nicht eindeutig|inzwischen geändert/);assert.equal(JSON.stringify(f.db),before);assert.equal(run.planCleanupPending,true);
 }
});
test('lost cleanup commit response keeps a durable once-only checkpoint for the next resume',()=>{
 const {f,run}=cleanupFixture();f.failCommit='after';assert.throws(()=>f.ctx.salesDeltaResolvePlan_(run),/response lost/);
 const saved=f.ctx.salesRead_('sales_meta/sync');assert.equal(saved.planCleanupPending,false);assert.equal(saved.entities.PlannedRevenues.count,0);assert.equal(f.db['sales_meta/bulk'].entities.PlannedRevenues.count,0);assert.equal(f.db['sales_meta/plan_cleanup_'+run.id].state,'removed');
 f.step();assert.equal(f.db['sales_meta/bulk'].entities.PlannedRevenues.count,0);assert.equal(f.db['sales_rawplans/108'],undefined);
});
function mirrorFixture(){
 const f=bulkFixture();f.fixtureCatalog=JSON.parse(JSON.stringify(f.db['sales_meta/catalog']));for(let i=0;i<230;i++){const id=1000+i;f.remote.Companies[id]={id,name:'Synthetic mirror '+id,updatedOn:'2026-01-01T00:00:00Z'};f.remote.ContactPersons[2000+i]={id:2000+i,companyId:id,firstName:'Synthetic',updatedOn:'2026-01-01T00:00:00Z'};}
 f.finishBulk();return f;
}
test('confirmed upstream company and contact deletions remove app copies and counts using only ID pages and GET checks',()=>{
 const f=mirrorFixture();f.remote.Documents[9001]={id:9001,companyId:1229,currency:'EUR',documentType:'Invoice',netValue:10,updatedOn:new Date().toISOString()};f.remote.PlannedRevenues[9002]={id:9002,companyId:1229,netTotal:20,updatedOn:new Date().toISOString()};f.finishBulk();f.ctx.salesWrite_('sales_meta/catalog',f.fixtureCatalog);const local=f.ctx.saveSalesCompany({...f.input,name:'Synthetic unsent mirror protection'});f.db['sales_jobs/'+local.id].state='uncertain';f.ctx.salesWrite_('sales_jobs/'+local.id,f.db['sales_jobs/'+local.id]);f.ctx.salesWrite_('sales_meta/lean_names',{deletionVisibilityVersion:1,rows:[{id:'1229',name:'Synthetic mirror 1229'},{id:'draft_'+local.id,name:'Synthetic unsent mirror protection'}]});f.ctx.salesWrite_('sales_meta/lean_filters',{rows:[{id:'1229'},{id:'101'}]});
 const before=f.calls.length;delete f.remote.Companies[1229];delete f.remote.ContactPersons[2229];const run=f.finishBulk();
 assert.equal(f.db['sales_rawcompanies/1229'],undefined);assert.equal(f.db['sales_companies/1229'],undefined);assert.equal(f.db['sales_directory/1229'],undefined);assert.equal(f.db['sales_rawcontacts/2229'],undefined);assert.equal(run.entities.Companies.count,Object.keys(f.remote.Companies).length);assert.equal(run.entities.ContactPersons.count,Object.keys(f.remote.ContactPersons).length);
 assert.ok(f.db['sales_meta/lean_names'].rows.every(c=>c.id!=='1229'));assert.ok(f.db['sales_meta/lean_filters'].rows.every(c=>c.id!=='1229'));assert.ok(f.db['sales_drafts/'+local.id]);assert.ok(f.db['sales_rawdocuments/9001']);assert.ok(f.db['sales_rawplans/9002']);
 assert.equal(f.db['sales_meta/mirror_Companies_1229'].verification,'single-404-and-filtered-empty-list');assert.ok(f.calls.slice(before).filter(c=>c.path.startsWith('/v1/')).every(c=>c.path.includes('$select=Id&$orderby=Id&$top=200&$skip=')));assert.ok(f.calls.slice(before).every(c=>c.method==='get'));assert.ok(f.calls.slice(before).some(c=>c.path.includes('$skip=200')));
});
test('a company deletion retains still-existing HQ contacts as unassigned and cancels its open app changes without retrying HQ writes',()=>{
 const f=bulkFixture();f.remote.ContactPersons[300]={id:300,companyId:102,firstName:'Synthetic orphan',updatedOn:'2026-01-01T00:00:00Z'};f.finishBulk();const r=f.ctx.saveSalesEntityChange({companyId:102,entity:'company',targetId:102,base:{name:f.remote.Companies[102].name},changeReason:'Synthetic customer change',change:{name:'Synthetic pending deleted customer'}});
 delete f.remote.Companies[102];const start=f.calls.length;const run=f.finishBulk();assert.equal(f.db['sales_jobs/'+r.id].state,'canceled');assert.ok(!run.errors.some(e=>e.id===r.id));assert.equal(f.db['sales_companies/102'],undefined);assert.ok(f.db['sales_rawcontacts/300']);assert.ok(f.db['sales_meta/unassignedcontacts'].rows.some(c=>String(c.id)==='300'));assert.ok(f.calls.slice(start).every(c=>c.method==='get'));
});
test('HTTP errors or an ambiguous second deletion check preserve the company and all cached copies',()=>{
 for(const mode of ['http','list','count']){const f=bulkFixture();f.finishBulk();delete f.remote.Companies[102];const get=f.ctx.salesHqGet_;f.ctx.salesHqGet_=p=>{if(p.startsWith('/v2/Companies/102')&&mode==='http')throw Error('HQ-Lesetest: HTTP 403');if(p.includes('/Companies?')&&decodeURIComponent(p).includes('id eq 102'))return mode==='list'?{data:[{id:102}],headers:{'helloHQ-Count':1}}:{data:[],headers:{}};return get(p);};f.ctx.startSalesSync();f.worker();assert.ok(f.db['sales_meta/sync'].paused);assert.ok(f.db['sales_rawcompanies/102']);assert.ok(f.db['sales_companies/102']);assert.equal(f.db['sales_meta/bulk'].entities.Companies.count,2);}
});
test('incomplete, duplicate, expanded or changing ID lists never become authority for deletion',()=>{
 for(const mode of ['short','duplicate','expanded','changed']){const f=mirrorFixture();delete f.remote.Companies[1229];const get=f.ctx.salesHqGet_;let counts=0;f.ctx.salesHqGet_=p=>{const r=get(p);if(p.startsWith('/v1/Companies?')){if(mode==='short')r.data=[];if(mode==='duplicate'&&r.data.length>1)r.data[1]=r.data[0];if(mode==='expanded'&&r.data.length)r.data[0].Name='not requested';}if(mode==='changed'&&p.startsWith('/v2/Companies?')&&p.includes('$top=1&')&&++counts>1)r.headers['helloHQ-Count']=r.headers['helloHQ-Count']+1;return r;};f.ctx.startSalesSync();f.worker();assert.ok(f.db['sales_meta/sync'].paused);assert.ok(f.db['sales_rawcompanies/1229']);assert.ok(f.db['sales_companies/1229']);f.ctx.salesHqGet_=get;f.finishBulk();assert.equal(f.db['sales_rawcompanies/1229'],undefined);}
});
test('identifier reconciliation follows actual row counts when HQ supplies smaller pages',()=>{
 const f=mirrorFixture(),get=f.ctx.salesHqGet_,skips=[];delete f.remote.Companies[1229];f.ctx.salesHqGet_=p=>{const r=get(p);if(p.startsWith('/v1/Companies?')){skips.push(Number(new URL('https://fixture'+p).searchParams.get('$skip')));r.data=r.data.slice(0,80);}return r;};f.finishBulk();assert.deepEqual(skips,[0,80,160]);assert.equal(f.db['sales_rawcompanies/1229'],undefined);
});
test('HQ HTTP 500 on a 200-ID page retries with 50 IDs at the same offset and confirmed deletions still mirror',()=>{
 const f=mirrorFixture(),get=f.ctx.salesHqGet_,pages=[];delete f.remote.Companies[1229];
 f.ctx.salesHqGet_=p=>{
  if(!p.startsWith('/v1/Companies?'))return get(p);
  const params=new URL('https://fixture'+p).searchParams,top=Number(params.get('$top')),skip=Number(params.get('$skip'));
  pages.push([top,skip]);if(top===200&&skip===200)throw Object.assign(Error('HQ-Lesetest: HTTP 500'),{hqHttpStatus:500});
  const r=get(p.replace('$top=50','$top=200'));return {...r,data:r.data.slice(0,top)};
 };
 f.finishBulk();assert.deepEqual(pages,[[200,0],[200,200],[50,200]]);assert.equal(f.db['sales_rawcompanies/1229'],undefined);
});
test('a failing optional HQ deletion scan reports an open point while other sections finish safely',()=>{
 for(const failure of ['ids','count']){
  const f=mirrorFixture(),get=f.ctx.salesHqGet_,attempts=[];delete f.remote.Companies[1229];delete f.remote.ContactPersons[2229];
  f.ctx.salesHqGet_=p=>{
   if(failure==='ids'&&p.startsWith('/v1/Companies?')||failure==='count'&&p.startsWith('/v2/Companies?$top=1&')){attempts.push(p);throw Object.assign(Error('HQ-Lesetest: HTTP 500'),{hqHttpStatus:500});}
   return get(p);
  };
  const run=f.finishBulk();assert.equal(attempts.length,2);assert.equal(run.state,'completedWithErrors');assert.ok(!run.paused);
  assert.ok(run.errors.some(e=>e.label==='HQ-Löschabgleich · Unternehmen'&&/HTTP 500/.test(e.message)));
  assert.ok(f.db['sales_rawcompanies/1229']);assert.equal(f.db['sales_rawcontacts/2229'],undefined);
  f.ctx.salesHqGet_=get;f.finishBulk();assert.equal(f.db['sales_rawcompanies/1229'],undefined);
 }
});
test('a company reappearing after the identifier scan is refreshed rather than removed',()=>{
 const f=mirrorFixture(),row=f.remote.Companies[1229],get=f.ctx.salesHqGet_;delete f.remote.Companies[1229];f.ctx.salesHqGet_=p=>{if(p.startsWith('/v2/Companies/1229?'))f.remote.Companies[1229]={...row,name:'Synthetic reappeared'};return get(p);};f.ctx.startSalesSync();
 finish(f);assert.equal(f.db['sales_companies/1229'].company.name,'Synthetic reappeared');assert.equal(f.db['sales_meta/mirror_Companies_1229'],undefined);
});
test('lost deletion commit responses retain the advanced checkpoint and never decrement counts twice',()=>{
 for(const fail of ['before','after']){const f=bulkFixture();f.finishBulk();delete f.remote.Companies[102];f.ctx.startSalesSync();let run=f.db['sales_meta/sync'];for(let i=0;i<100;i++){const t=run.tasks[run.cursor];if(t.kind==='deltaProbe'&&t.id==='Companies')break;run=f.step();}const t=run.tasks[run.cursor];while(String(t.ids?.[t.index]||'')!=='102'){run=f.step();if(run.tasks[run.cursor]!==t)break;}f.failCommit=fail;assert.throws(()=>f.ctx.salesBulkStep_(run),/commit failed|response lost/);if(fail==='before')assert.ok(f.db['sales_rawcompanies/102']);else{assert.equal(f.db['sales_rawcompanies/102'],undefined);assert.equal(f.db['sales_meta/bulk'].entities.Companies.count,1);}finish(f);assert.equal(f.db['sales_meta/bulk'].entities.Companies.count,1);assert.equal(f.db['sales_meta/sync'].entities.Companies.count,1);}
});
test('an unassigned HQ contact deletion is removed locally and a deleted first app contact cannot reappear from its original draft',()=>{
 const f=bulkFixture();f.remote.ContactPersons[300]={id:300,companyId:null,firstName:'Synthetic orphan',updatedOn:'2026-01-01T00:00:00Z'};f.finishBulk();delete f.remote.ContactPersons[300];delete f.remote.ContactPersons[202];f.finishBulk();assert.equal(f.db['sales_rawcontacts/300'],undefined);assert.equal(f.db['sales_meta/unassignedcontacts'].rows.some(c=>String(c.id)==='300'),false);const draft=Object.values(f.db).find(d=>d.company&&d.contact&&d.hqId===101);assert.ok(draft.contactDeletedAt);assert.equal(f.ctx.getSalesCompany('draft_'+draft.id).contacts.some(c=>String(c.id)==='202'),false);
});
test('confirmed contact deletion clears even an unconfirmed local overlay and deferred edits to its first-contact alias',()=>{
 const f=bulkFixture();f.finishBulk();const draft=Object.values(f.db).find(d=>d.contact&&d.hqId===101);f.ctx.salesWrite_('sales_jobs/contact-overlay',{id:'contact-overlay',kind:'createContact',companyRef:'101',hqId:101,contactId:202,state:'uncertain'});f.ctx.salesWrite_('sales_jobs/deferred-edit',{id:'deferred-edit',kind:'entityChange',entity:'contact',draftDependency:draft.id,companyRef:'draft_'+draft.id,targetRef:'draft_'+draft.id+'_contact',state:'pending'});f.ctx.salesWrite_('sales_communication/101',{contacts:[{id:'local_contact-overlay',jobId:'contact-overlay',syncState:'uncertain'}],histories:[]});delete f.remote.ContactPersons[202];f.finishBulk();assert.equal(f.db['sales_communication/101'].contacts.length,0);assert.equal(f.db['sales_jobs/contact-overlay'].state,'canceled');assert.equal(f.db['sales_jobs/deferred-edit'].state,'canceled');
});
for(const c of cases){c.fn();console.log('PASS',c.name);}console.log(cases.length+' delta checks passed.');
