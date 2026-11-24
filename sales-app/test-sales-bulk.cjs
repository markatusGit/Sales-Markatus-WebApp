const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{setup}=require('./test-sales-v1.cjs');
const source=['SalesStorage.gs','SalesBulkStore.gs','SalesBulkSync.gs','SalesDelta.gs','SalesWorker.gs'].map(n=>fs.readFileSync(__dirname+'/'+n,'utf8')).join('\n');
const clone=x=>JSON.parse(JSON.stringify(x));
function bulkFixture(){
 const f=setup();vm.runInContext(source,f.ctx);const fields={},transport=[],triggers=[];let triggerNumber=0;
 for(const [path,value] of Object.entries(f.db))fields[path]={payload:{stringValue:JSON.stringify(value)}};
 const save=f.ctx.salesWrite_;f.ctx.salesWrite_=(path,value)=>{save(path,value);fields[path]={payload:{stringValue:JSON.stringify(value)}};};
 f.ctx.salesContext_=()=>({project:'synthetic-project',token:'synthetic-token'});
 f.ctx.pilotUrl_=(project,path)=>'https://firestore.googleapis.com/v1/projects/'+project+'/databases/(default)/documents/'+path;
 f.ctx.pilotReadDocument_=(_,path)=>fields[path]?{payload:fields[path].payload.stringValue}:null;
 f.ctx.pilotCall_=(url,options)=>{
   const op=url.split(':').pop(),body=JSON.parse(options.payload);transport.push({op,body});
   const name=path=>'projects/synthetic-project/databases/(default)/documents/'+path;
   const document=path=>({name:name(path),fields:clone(fields[path])});
   if(op==='batchGet')return body.documents.map(n=>{const path=n.split('/documents/')[1];return fields[path]?{found:document(path)}:{missing:n};}).reverse();
   if(op==='commit'){
     if(f.failCommit==='before'){f.failCommit=null;throw Error('Synthetic commit failed');}
     for(const w of body.writes){if(w.verify)continue;if(w.delete){const path=w.delete.split('/documents/')[1];delete fields[path];delete f.db[path];continue;}const path=w.update.name.split('/documents/')[1];if(w.currentDocument?.exists===true&&!fields[path])throw Error('Synthetic precondition failed');fields[path]=w.updateMask?{...(fields[path]||{}),...clone(w.update.fields)}:clone(w.update.fields);if(fields[path].payload)f.db[path]=f.ctx.salesBulkDecode_(document(path));}
     if(f.failCommit==='after'){f.failCommit=null;throw Error('Synthetic response lost');}return {writeResults:body.writes.map(()=>({updateTime:'2026-01-01'}))};
   }
   if(op==='runQuery'){
     const q=body.structuredQuery,filter=q.where.fieldFilter;
     const match=v=>filter.op==='IN'?filter.value.arrayValue.values.some(x=>x.stringValue===v):v===filter.value.stringValue;
     return Object.keys(fields).filter(p=>p.startsWith(q.from[0].collectionId+'/')&&match(fields[p][filter.field.fieldPath]?.stringValue)).sort().filter(p=>!q.startAt||name(p)>q.startAt.values[0].referenceValue).slice(0,q.limit).map(p=>({document:document(p)}));
   }
   if(op==='runAggregationQuery'){const col=body.structuredAggregationQuery.structuredQuery.from[0].collectionId;return [{result:{aggregateFields:{n:{integerValue:String(Object.keys(fields).filter(p=>p.startsWith(col+'/')).length)}}}}];}
   throw Error('Unexpected Firebase operation '+op);
 };
 const get=f.ctx.salesHqGet_;f.ctx.salesHqGet_=path=>{
   const single=/^\/v2\/(Companies|ContactPersons|ContactHistories|Projects|Documents|PlannedRevenues)\/(\d+)(?:\?|$)/.exec(path);
   if(single){f.calls.push({method:'get',path});const row=f.remote[single[1]]?.[single[2]];if(!row)throw Error('HQ-Lesetest: HTTP 404');return {data:clone(row),headers:{}};}
   const identifiers=/^\/v1\/(Companies|ContactPersons)\?\$select=Id/.exec(path);if(identifiers){f.calls.push({method:'get',path});const q=new URL('https://fixture'+path).searchParams,rows=Object.values(f.remote[identifiers[1]]||{}).sort((a,b)=>a.id-b.id);return {data:rows.slice(Number(q.get('$skip')),Number(q.get('$skip'))+Number(q.get('$top'))).map(r=>({Id:r.id})),headers:{}};}
   const m=/^\/v2\/(Companies|ContactPersons|ContactHistories|Projects|Documents|PlannedRevenues)\?/.exec(path);if(!m)return get(path);
   f.calls.push({method:'get',path});const q=new URL('https://fixture'+path).searchParams,filter=q.get('$filter')||'';let rows=Object.values(f.remote[m[1]]||{}).map(clone).sort((a,b)=>a.id-b.id);
   const id=/id gt (\d+)/.exec(filter),exact=/^id eq (\d+)$/.exec(filter),since=/updatedOn ge datetime'([^']+)'/.exec(filter);if(id)rows=rows.filter(r=>r.id>Number(id[1]));if(exact)rows=rows.filter(r=>r.id===Number(exact[1]));if(since)rows=rows.filter(r=>[r.updatedOn,r.createdOn,...(filter.includes('defaultAddress/updatedOn')?[r.defaultAddress?.updatedOn,...(r.addresses||[]).map(a=>a.updatedOn)]:[])].some(d=>Date.parse(d)>=Date.parse(since[1])));
   const top=Number(q.get('$top')||200),skip=Number(q.get('$skip')||0);return {data:rows.slice(skip,skip+top),headers:{'helloHQ-Count':rows.length}};
 };
 for(const entity of ['Companies','ContactPersons','ContactHistories','Projects','Documents','PlannedRevenues']){f.remote[entity]=f.remote[entity]||{};Object.values(f.remote[entity]).forEach(r=>r.updatedOn='2026-01-01T00:00:00Z');}
 f.ctx.Session.getEffectiveUser=()=>({getEmail:()=>f.executor||'pp@markatus.de'});
 f.ctx.ScriptApp={getProjectTriggers:()=>triggers.slice(),deleteTrigger:t=>{const i=triggers.indexOf(t);if(i>=0)triggers.splice(i,1);},newTrigger:handler=>({timeBased(){return this;},everyMinutes(n){assert.equal(n,1);return this;},create(){const id='trigger-'+(++triggerNumber),t={getUniqueId:()=>id,getHandlerFunction:()=>handler};triggers.push(t);return t;}})};
 f.ctx.salesWorkerPrivate_=()=>{};f.ctx.setupSalesSyncWorker();
 f.fields=fields;f.transport=transport;f.triggers=triggers;
 f.step=()=>{const run=f.ctx.salesRead_('sales_meta/sync');f.ctx.salesBulkStep_(run);return f.ctx.salesRead_('sales_meta/sync');};
 f.finishBulk=()=>{let run=f.ctx.startSalesSync();for(let i=0;run.state==='running'&&!run.paused&&i<1000;i++)run=f.step();assert.notEqual(run.state,'running',run.blockedMessage);return run;};
 f.worker=()=>f.ctx.salesSyncWorker_({triggerUid:f.props.SALES_SYNC_TRIGGER});return f;
}
const cases=[];function test(name,fn){cases.push({name,fn});}
test('bulk import joins shared project invoices, plans, histories and chosen editions without per-company HQ detail calls',()=>{
 const f=bulkFixture(),edition=f.config(70);f.doc(70,1001);f.remote.Companies[103]={id:103,name:'Synthetic other',updatedOn:'2026-01-01T00:00:00Z'};f.doc(70,1002,103);
 f.remote.ContactHistories[800]={id:800,companyId:103,projectId:570,contactHistoryChannel:'SentDocument',reason:'Rechnung RE-1002',content:'<p>Test</p>',updatedOn:'2026-01-01T00:00:00Z'};
 f.remote.Projects[700]={id:700,companyId:103,name:'Planned',status:'InProgress',updatedOn:'2026-01-01T00:00:00Z'};f.remote.PlannedRevenues[701]={id:701,projectId:700,companyId:103,netTotal:500,currency:'EUR',startDate:'2026-12-01',estimations:[{estimatedDueDate:'2026-12-01',estimatedNetValue:500}],updatedOn:'2026-01-01T00:00:00Z'};
 const before=f.calls.length,run=f.finishBulk();assert.equal(run.state,'completed');assert.equal(run.stats.companies,3);assert.equal(f.db['sales_editions/'+edition].documents.length,2);assert.equal(f.db['sales_companies/102'].projects[0].revenueCents,20000);assert.equal(f.db['sales_companies/103'].projects[0].plannedRevenues[0].netCents,50000);assert.equal(f.db['sales_companies/103'].histories[0].projectName,'Coburger #70');assert.ok(!f.calls.slice(before).some(c=>/^\/v2\/(Companies|Projects)\/\d/.test(c.path)));assert.ok(f.calls.slice(before).every(c=>c.method==='get'));
});
test('3202 firms use 17 shared company pages and no per-company HQ reads',()=>{
 const f=bulkFixture();f.remote.Companies={};f.remote.ContactPersons={};for(let id=1;id<=3202;id++)f.remote.Companies[id]={id,name:'Synthetic '+id,updatedOn:'2026-01-01T00:00:00Z'};
 const start=f.calls.length,run=f.finishBulk();assert.equal(run.stats.companies,3202);assert.equal(run.entities.Companies.pages,17);assert.equal(run.state,'completed');assert.equal(f.calls.slice(start).filter(c=>/^\/v2\/Companies\?/.test(c.path)).length,18);assert.equal(Object.keys(f.db).filter(p=>p.startsWith('sales_companies/')).length,3202);
});
test('second run uses independent history/document/project change filters; unchanged companies are not republished',()=>{
 const f=bulkFixture();f.remote.ContactHistories[1]={id:1,companyId:102,reason:'Before',updatedOn:'2026-01-01T00:00:00Z'};f.finishBulk();const old=f.db['sales_companies/101'].syncRunId;
 f.remote.ContactHistories[1].reason='After';f.remote.ContactHistories[1].updatedOn=new Date().toISOString();const start=f.calls.length,run=f.finishBulk();assert.equal(run.full,false);assert.equal(f.db['sales_companies/101'].syncRunId,old);assert.equal(f.db['sales_companies/102'].histories[0].reason,'After');assert.equal(run.entities.ContactHistories.seen,1);assert.equal(run.entities.Companies.changed,0);assert.ok(f.calls.slice(start).some(c=>c.path.includes('/ContactHistories?')&&decodeURIComponent(c.path).includes('updatedOn ge datetime')));
});
test('unchanged parent timestamp still picks up contact address changes and moved/deleted contacts',()=>{
 const f=bulkFixture();f.remote.ContactPersons[300]={id:300,companyId:102,firstName:'Synthetic',defaultAddress:{email:'one@example.invalid'},updatedOn:'2026-01-01T00:00:00Z'};f.finishBulk();
 f.remote.ContactPersons[300].companyId=101;f.remote.ContactPersons[300].defaultAddress.email='two@example.invalid';f.finishBulk();assert.ok(!f.db['sales_companies/102'].contacts.some(c=>String(c.id)==='300'));assert.ok(f.db['sales_companies/101'].contacts.some(c=>String(c.id)==='300'&&c.eMail==='two@example.invalid'));
 delete f.remote.ContactPersons[300];const run=f.finishBulk();assert.equal(run.full,false);assert.ok(!run.errors.some(e=>/nicht mehr gefunden/.test(e.message)));assert.ok(!f.db['sales_companies/101'].contacts.some(c=>String(c.id)==='300'));assert.equal(f.db['sales_rawcontacts/300'],undefined);
});
test('lost cache commit response replays immutable page without losing counts or old associations',()=>{
 const f=bulkFixture();f.ctx.startSalesSync();f.failCommit='after';f.worker();let run=f.db['sales_meta/sync'];assert.ok(run.paused);assert.ok(run.tasks[run.cursor].pendingPage);assert.equal(f.db['sales_meta/bulk'],undefined);f.ctx.startSalesSync();run=f.finishBulk();assert.equal(run.stats.companies,2);assert.equal(run.entities.Companies.seen,2);assert.equal(run.state,'completed');
});
test('temporary HQ fault waits on a minute timer, retries the same section and records the recovery',()=>{
 const f=bulkFixture();f.finishBulk();const watermark=JSON.stringify(f.db['sales_meta/bulk']);f.remote.Companies[102].name='Changed';f.remote.Companies[102].updatedOn=new Date().toISOString();
 const get=f.ctx.salesHqGet_;let failures=2;f.ctx.salesHqGet_=p=>{if(failures&&p.startsWith('/v2/ContactHistories?')){failures--;throw Object.assign(Error('HQ-Lesetest: HTTP 503'),{hqHttpStatus:503});}return get(p);};
 f.ctx.startSalesSync();f.worker();let run=f.db['sales_meta/sync'];assert.equal(run.state,'running');assert.ok(!run.paused);assert.equal(f.triggers.length,1);assert.equal(JSON.stringify(f.db['sales_meta/bulk']),watermark);
 let retry=JSON.parse(f.props.SALES_SYNC_RETRY);assert.equal(retry.attempts,1);assert.equal(retry.minutes,2);assert.ok(retry.until>Date.now()+60000);
 const status=f.ctx.getSalesSyncStatus();assert.equal(status.retry.attempt,1);assert.match(status.retry.message,/HTTP 503/);
 const calls=f.calls.length,transport=f.transport.length;f.worker();assert.equal(f.calls.length,calls);assert.equal(f.transport.length,transport);
 const expire=()=>{const r=JSON.parse(f.props.SALES_SYNC_RETRY);r.until=Date.now()-1;f.props.SALES_SYNC_RETRY=JSON.stringify(r);};
 expire();f.worker();retry=JSON.parse(f.props.SALES_SYNC_RETRY);assert.equal(retry.attempts,2);assert.equal(retry.minutes,5);
 expire();f.worker();run=f.db['sales_meta/sync'];assert.notEqual(run.state,'running');assert.equal(f.props.SALES_SYNC_RETRY,'');assert.equal(f.triggers.length,0);
 assert.equal(f.db['sales_companies/102'].company.name,'Changed');assert.ok(run.notices.some(n=>/Nach 2 automatischen Wiederholungen/.test(n.message)));assert.ok(!run.errors.some(e=>/HTTP 503/.test(e.message)));
});
test('a section that keeps failing is recorded and skipped; its changes are read again by the next sync',()=>{
 const f=bulkFixture();f.finishBulk();const before=f.db['sales_meta/bulk'].entities.ContactHistories.watermark;
 f.remote.Companies[102].name='Changed';f.remote.Companies[102].updatedOn=new Date().toISOString();f.remote.ContactHistories[1]={id:1,companyId:102,reason:'Later',updatedOn:new Date().toISOString()};
 const get=f.ctx.salesHqGet_;let broken=true;f.ctx.salesHqGet_=p=>{if(broken&&p.startsWith('/v2/ContactHistories?'))throw Error('Synthetic unexpected HQ answer');return get(p);};
 f.ctx.startSalesSync();f.worker();const run=f.db['sales_meta/sync'];assert.notEqual(run.state,'running');assert.ok(!run.paused);
 assert.equal(f.db['sales_companies/102'].company.name,'Changed');assert.ok(run.errors.some(e=>e.kind==='bulkRead'&&e.id==='ContactHistories'&&/erneut gelesen/.test(e.message)));
 assert.equal(f.db['sales_meta/bulk'].entities.ContactHistories.watermark,before);assert.notEqual(f.db['sales_meta/bulk'].entities.Companies.watermark,before);
 broken=false;f.finishBulk();assert.equal(f.db['sales_companies/102'].histories.find(h=>h.id===1).reason,'Later');
});
test('legacy migration keeps prior write errors and never requeues completed write phases',()=>{
 const f=bulkFixture();f.db['sales_meta/sync']={id:'legacy',state:'running',paused:true,revision:10,cursor:2,tasks:[{kind:'write',id:'old',step:'company'},{kind:'write',id:'old',step:'contact'},{kind:'company',id:'102'}],errors:[{kind:'write',id:'old',message:'Uncertain'}]};const run=f.ctx.startSalesSync();assert.equal(run.id,'legacy');assert.equal(run.errors.length,1);assert.ok(f.db['sales_meta/sync'].tasks.every(t=>t.kind!=='write'));assert.equal(f.calls.filter(c=>c.method==='post').length,2);
});
test('background worker authorizes trigger identity, survives closed browser, removes trigger on completion and pause',()=>{
 const f=bulkFixture();assert.throws(()=>f.ctx.salesSyncWorker_({triggerUid:'foreign'}),/autorisiert/);f.ctx.startSalesSync();assert.equal(f.triggers.length,1);f.ctx.startSalesSync();assert.equal(f.triggers.length,1);f.setEmail('');f.worker();assert.equal(f.db['sales_meta/sync'].state,'completed');assert.equal(f.triggers.length,0);f.setEmail('pp@markatus.de');const run=f.ctx.startSalesSync();f.ctx.pauseSalesSync(run.id);assert.ok(f.db['sales_meta/sync'].paused);assert.equal(f.triggers.length,0);
});
test('public RPCs reject unapproved users; legacy step RPC cannot drive a worker run',()=>{
 const f=bulkFixture();f.setEmail('outside@example.invalid');for(const name of ['startSalesSync','pauseSalesSync','runSalesSyncStep','getSalesSyncStatus','setupSalesSyncWorker'])assert.throws(()=>f.ctx[name]('x'),/Zugriff/);f.setEmail('pp@markatus.de');const run=f.ctx.startSalesSync();f.ctx.runSalesSyncStep(run.id,run.revision);assert.equal(f.db['sales_meta/sync'].cursor,0);
});
test('large Unicode cache payloads retain indexed envelopes and use immutable chunks',()=>{
 const f=bulkFixture(),content='Ä🙂<p>Text</p>'.repeat(75000);f.remote.ContactHistories[1]={id:1,companyId:102,content,updatedOn:'2026-01-01T00:00:00Z'};const run=f.finishBulk();assert.equal(run.state,'completed');assert.equal(f.db['sales_companies/102'].histories[0].content,content);assert.ok(Object.keys(f.db).some(k=>k.startsWith('sales_chunks/')));assert.equal(f.fields['sales_rawhistories/1'].companyBucket.stringValue,'38');
});
test('unassigned contacts and histories are retained without inventing company links',()=>{
 const f=bulkFixture();f.remote.ContactPersons[400]={id:400,companyId:999,firstName:'Unassigned',updatedOn:'2026-01-01T00:00:00Z'};f.remote.ContactHistories[500]={id:500,companyId:null,content:'Synthetic',updatedOn:'2026-01-01T00:00:00Z'};const run=f.finishBulk();assert.equal(run.state,'completed');assert.equal(f.db['sales_meta/unassignedcontacts'].rows.length,1);assert.equal(f.db['sales_meta/unassignedhistories'].rows.length,1);
});
test('a history deleted in HQ is removed from Firebase and its customer view without a full import',()=>{
 const f=bulkFixture();f.remote.ContactHistories[1]={id:1,companyId:102,content:'Synthetic',updatedOn:'2026-01-01T00:00:00Z'};f.finishBulk();delete f.remote.ContactHistories[1];const run=f.finishBulk();assert.equal(run.state,'completed');assert.equal(run.full,false);assert.equal(f.db['sales_meta/bulk'].needsFull,false);
 assert.equal(f.db['sales_rawhistories/1'],undefined);assert.equal(f.db['sales_companies/102'].histories.length,0);assert.equal(f.db['sales_meta/bulk'].entities.ContactHistories.count,0);assert.ok(run.notices.some(n=>n.label==='Bestandsabgleich · Kontakthistorie'&&/1 in HQ gelöschter Eintrag/.test(n.message)));
});
test('company creation and contact creation use different worker executions; uncertain jobs never post again',()=>{
 const f=bulkFixture(),saved=f.ctx.saveSalesTestCompany({...f.input,name:'TEST Worker Company'});const start=f.calls.length;f.ctx.startSalesSync();f.setEmail('');f.worker();assert.ok(f.db['sales_jobs/'+saved.id].companyConfirmedAt);assert.equal(f.calls.slice(start).filter(c=>c.method==='post'&&c.path==='/v2/ContactPersons').length,0);f.worker();assert.equal(f.calls.slice(start).filter(c=>c.method==='post'&&c.path==='/v2/ContactPersons').length,1);f.setEmail('pp@markatus.de');
 f.db['sales_jobs/'+saved.id].state='uncertain';f.finishBulk();const count=f.calls.filter(c=>c.method==='post').length;f.ctx.startSalesSync();f.worker();assert.equal(f.calls.filter(c=>c.method==='post').length,count);
});
test('unsupported HQ date filter pauses without fallback; ignored keyset filter is stopped',()=>{
 const f=bulkFixture();f.finishBulk();const get=f.ctx.salesHqGet_;f.ctx.salesHqGet_=p=>{if(p.startsWith('/v2/ContactHistories?')&&decodeURIComponent(p).includes('updatedOn ge'))throw Error('HQ-Lesetest: HTTP 400');return get(p);};f.ctx.startSalesSync();f.worker();let run=f.db['sales_meta/sync'];assert.equal(run.entities.ContactHistories.full,false);assert.ok(run.paused);assert.match(run.blockedMessage,/Kein Gesamtimport/);
 f.ctx.salesHqGet_=get;f.finishBulk();
 f.remote.Companies={};for(let id=1;id<=201;id++)f.remote.Companies[id]={id,name:'Synthetic',updatedOn:'2026-01-01T00:00:00Z'};f.ctx.salesHqGet_=p=>get(p.replace(/&\$filter=[^&]+/,''));f.ctx.startSalesSync();f.worker();run=f.db['sales_meta/sync'];assert.ok(run.paused);assert.match(run.blockedMessage,/Fortsetzungsfilter|Änderungsfilter/);
});
test('updates to already paged low IDs during import are caught by the next independent watermark',()=>{
 const f=bulkFixture();for(let id=1;id<=201;id++)f.remote.ContactHistories[id]={id,companyId:102,reason:'Before',updatedOn:'2026-01-01T00:00:00Z'};f.ctx.startSalesSync();let run=f.db['sales_meta/sync'];while(!(run.tasks[run.cursor].id==='ContactHistories'&&run.entities.ContactHistories.pages===1))run=f.step();f.remote.ContactHistories[1].reason='During import';f.remote.ContactHistories[1].updatedOn=new Date().toISOString();f.finishBulk();assert.equal(f.db['sales_companies/102'].histories.find(h=>h.id===1).reason,'Before');f.finishBulk();assert.equal(f.db['sales_companies/102'].histories.find(h=>h.id===1).reason,'During import');
});
test('pause request survives a busy worker lock and revoked admin cannot continue',()=>{
 const f=bulkFixture(),run=f.ctx.startSalesSync();f.ctx.LockService={getScriptLock:()=>({tryLock:()=>false,releaseLock(){}})};assert.ok(f.ctx.pauseSalesSync(run.id).pauseRequested);f.ctx.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})};f.worker();assert.ok(f.db['sales_meta/sync'].paused);assert.equal(f.db['sales_meta/sync'].cursor,0);f.ctx.startSalesSync();f.props.SALES_ALLOWED_EMAILS='outside@example.invalid';assert.throws(()=>f.worker(),/autorisiert/);
});
test('ID pagination tolerates global counts and smaller pages; project deletions in HQ are mirrored',()=>{
 const f=bulkFixture();f.remote.Companies={};f.remote.ContactPersons={};for(let id=1;id<=400;id++)f.remote.Companies[id]={id,name:'Synthetic '+id,updatedOn:'2026-01-01T00:00:00Z'};f.remote.Projects[100]={id:100,companyId:1,name:'Project',updatedOn:'2026-01-01T00:00:00Z'};const get=f.ctx.salesHqGet_;f.ctx.salesHqGet_=p=>{const r=get(p);if(p.startsWith('/v2/Companies?')){r.data=r.data.slice(0,100);r.headers['helloHQ-Count']=400;}return r;};let run=f.finishBulk();assert.equal(run.stats.companies,400);assert.equal(run.state,'completed');delete f.remote.Projects[100];run=f.finishBulk();assert.equal(run.state,'completed');assert.equal(run.full,false);assert.equal(f.db['sales_meta/bulk'].needsFull,false);assert.equal(f.db['sales_companies/1'].projects.length,0);assert.equal(f.db['sales_projectviews/100'],undefined);assert.equal(f.db['sales_rawprojects/100'],undefined);assert.ok(run.notices.some(n=>n.label==='Bestandsabgleich · Projekte'));
});
test('three unfinished server attempts stop instead of consuming quota forever',()=>{
 const f=bulkFixture();f.ctx.startSalesSync();const run=f.db['sales_meta/sync'];run.inFlight={key:'0::0:0:',attempts:3};const n=f.calls.length;f.worker();assert.ok(f.db['sales_meta/sync'].paused);assert.match(f.db['sales_meta/sync'].blockedMessage,/dreimal/);assert.equal(f.calls.length,n);assert.equal(f.triggers.length,0);
});
test('fresh HQ imports preserve the pending request while projecting the HQ name',()=>{
 const f=bulkFixture();f.ctx.salesWrite_('sales_companies/102',{company:{id:'102',name:'Synthetic old'},contacts:[],pendingChanges:[{jobId:'synthetic-pending',entity:'company',targetId:102,change:{name:'Synthetic pending name'}}]});
 f.finishBulk();const saved=f.ctx.salesRead_('sales_companies/102');assert.equal(saved.company.name,'Synthetic prospect');assert.equal(saved.pendingChanges.length,1);assert.equal(f.ctx.getSalesLeanCompany(102).company.name,'Synthetic prospect');assert.equal(f.ctx.salesRead_('sales_directory/102').company.name,'Synthetic prospect');
});
if(require.main===module){let count=0;test('Firebase quota before the run can be read waits on a minute timer without touching the checkpoint',()=>{
 const f=bulkFixture();f.ctx.startSalesSync();const before=JSON.stringify(f.db),read=f.ctx.salesRead_;f.ctx.salesRead_=()=>{throw Error('Firestore-Lesezugriff HTTP 429.');};f.worker();
 assert.equal(f.triggers.length,1);assert.equal(JSON.stringify(f.db),before);const retry=JSON.parse(f.props.SALES_SYNC_RETRY);assert.equal(retry.key,'worker');assert.equal(retry.limit,30);assert.equal(retry.minutes,2);
 f.ctx.salesRead_=read;f.ctx.startSalesSync();assert.equal(JSON.parse(f.props.SALES_SYNC_RETRY).until,0);f.worker();assert.equal(f.props.SALES_SYNC_RETRY,'');assert.notEqual(f.db['sales_meta/sync'].state,'running');
});
test('quota during worker principal verification also waits before any business read',()=>{
 const f=bulkFixture();f.ctx.startSalesSync();f.ctx.salesAuthEnabled_=()=>true;f.ctx.salesAuthConfig_=()=>({ownerUid:'owner',ownerEmail:'owner@example.invalid'});f.ctx.salesAuthPrincipal_=()=>{const e=Error('Quota');e.salesQuota=true;throw e;};const before=JSON.stringify(f.db);f.worker();assert.equal(f.triggers.length,1);assert.equal(JSON.stringify(f.db),before);assert.equal(JSON.parse(f.props.SALES_SYNC_RETRY).key,'worker');
});
test('no app-side daily import budget: old hold and budget state is cleared and Firestore transports are not metered',()=>{
 const f=bulkFixture();f.props.SALES_SYNC_HOLD=JSON.stringify({day:'synthetic',reason:'budget',message:'Tagesbudget des HQ-Imports erreicht.'});f.props.SALES_SYNC_BUDGET=JSON.stringify({day:'synthetic',reads:20000,writes:12000});
 f.ctx.startSalesSync();assert.equal(f.props.SALES_SYNC_HOLD,'');assert.equal(f.props.SALES_SYNC_BUDGET,'');assert.equal(f.triggers.length,1);
 for(const name of ['salesWorkerBudget_','salesWorkerReserve_','salesWorkerRequestBudget_','salesWorkerHoldState_'])assert.equal(typeof f.ctx[name],'undefined');
 const core=fs.readFileSync(__dirname+'/../hq-benchmark/FirebaseSync.gs','utf8');assert.ok(!/salesWorker(Budget|RequestBudget)_/.test(core));vm.runInContext(core.slice(core.indexOf('function pilotCall_('),core.indexOf('function pilotWriteDocument_(')),f.ctx);
 const base='https://firestore.googleapis.com/v1/projects/synthetic-project/databases/(default)/documents';f.ctx.UrlFetchApp.fetch=()=>({getResponseCode:()=>200,getContentText:()=>JSON.stringify({writeResults:[]})});
 for(let i=0;i<5;i++)f.ctx.pilotCall_(base+':commit',{method:'post',payload:JSON.stringify({writes:[{update:{name:'synthetic'}}]})});assert.equal(f.props.SALES_SYNC_BUDGET,'');
 f.ctx.UrlFetchApp.fetch=()=>({getResponseCode:()=>429,getContentText:()=>''});assert.throws(()=>f.ctx.pilotCall_(base+':commit',{method:'post',payload:'{}'}),e=>f.ctx.salesWorkerTransient_(e)&&f.ctx.salesWorkerLimited_(e));
});
test('a write that failed before reaching HQ may be retried; a sent but unclear write is never treated as temporary',()=>{
 const f=bulkFixture();
 const before=f.ctx.salesSyncJobError_({state:'pending',message:'HQ-Lesetest: HTTP 503. Kein unvollständiger Import wird freigegeben.'});assert.equal(before.salesTransient,true);assert.ok(f.ctx.salesWorkerTransient_(before));
 const sent=f.ctx.salesSyncJobError_({state:'uncertain',message:'Übertragung oder Rückprüfung nicht vollständig bestätigt: POST /v2/ContactHistories: HTTP 503. Nicht erneut anlegen.'});assert.equal(sent.salesJobOutcome,true);assert.equal(f.ctx.salesWorkerTransient_(sent),false);
 assert.equal(f.ctx.salesWorkerTransient_(f.ctx.salesSyncJobError_({state:'companyCreated',phaseWriteAttempted:true,message:'HTTP 503'})),false);
 assert.equal(f.ctx.salesWorkerTransient_(f.ctx.salesSyncJobError_({state:'pending',message:'Bitte einen Ansprechpartner dieses Kunden auswählen.'})),false);
});
test('unclear history entries are only looked up again after minute delays and then reported to the admin',()=>{
 const f=bulkFixture();for(const id of ['h1','h2'])f.ctx.salesWrite_('sales_jobs/'+id,{id,kind:'history',state:'uncertain',writeAttempted:true,name:'Synthetic '+id});
 const run={engine:2,errors:[],notices:[]},task={kind:'verifyJobs',label:'Synthetic verify'};
 f.ctx.salesSyncQueueVerify_(run,{id:'h1',name:'Synthetic h1'},0);f.ctx.salesSyncQueueVerify_(run,{id:'h2',name:'Synthetic h2'},0);f.ctx.salesSyncQueueVerify_(run,{id:'h1'},0);assert.equal(run.verifyJobs.length,2);
 const checked=[];f.ctx.salesSyncVerifyJob_=job=>{checked.push(job.id);if(job.id==='h2')throw Object.assign(Error('Historieneintrag noch nicht eindeutig bestätigt.'),{salesHistoryMissing:true});f.ctx.salesWrite_('sales_jobs/'+job.id,{...job,state:'synced'});};
 assert.equal(f.ctx.salesSyncVerifyStep_(run,task),false);assert.equal(run.notices.length,1);assert.equal(run.verifyJobs.length,1);assert.ok(Date.parse(task.waitUntil)>Date.now()+4*60000);
 assert.equal(f.ctx.salesSyncVerifyStep_(run,task),false);assert.deepEqual(checked,['h1','h2']);
 let done=false;for(let i=0;i<2;i++){run.verifyJobs[0].notBefore=new Date(Date.now()-1).toISOString();done=f.ctx.salesSyncVerifyStep_(run,task);}
 assert.equal(done,true);assert.equal(run.verifyJobs.length,0);assert.equal(task.waitUntil,undefined);assert.equal(run.errors.length,1);assert.match(run.errors[0].message,/Meine Änderungen/);assert.equal(run.errors[0].decision,'reviews');assert.equal(f.db['sales_jobs/h2'].verifyResult,'notFound');assert.equal(f.db['sales_jobs/h2'].state,'uncertain');assert.equal(checked.length,4);
 assert.equal(f.ctx.salesSyncVerifiable_({state:'uncertain',kind:'history',writeAttempted:true},{engine:2}),true);
 assert.equal(f.ctx.salesSyncVerifiable_({state:'uncertain',kind:'createCompany',writeAttempted:true},{engine:2}),false);
 assert.equal(f.ctx.salesSyncVerifiable_({state:'uncertain',kind:'history',writeAttempted:false},{engine:2}),false);
});
test('a planned verification wait costs no request and is shown as a minute timer',()=>{
 const f=bulkFixture();f.finishBulk();const run=f.ctx.startSalesSync(),saved=f.db['sales_meta/sync'];saved.tasks.splice(saved.cursor,0,{kind:'verifyJobs',label:'Synthetic verify',waitUntil:new Date(Date.now()+5*60000).toISOString()});saved.verifyJobs=[{id:'h1',label:'Synthetic',attempts:0,notBefore:new Date(Date.now()+5*60000).toISOString()}];f.ctx.salesWrite_('sales_meta/sync',saved);
 const calls=f.calls.length;f.worker();assert.equal(f.calls.length,calls);const wait=JSON.parse(f.props.SALES_SYNC_RETRY);assert.equal(wait.wait,true);assert.equal(wait.runId,run.id);
 const transport=f.transport.length;f.worker();assert.equal(f.transport.length,transport);assert.equal(f.ctx.getSalesSyncStatus().retry.wait,true);assert.equal(f.triggers.length,1);
});

test('edition linking permits only zero-padding of the same immutable project and issue',()=>{
 const f=bulkFixture(),edition={id:'synthetic-4',magazine:'KRONACHER',issue:4,projectId:'42',projectNumber:'S4',projectName:'KRONACHER Ausgabe #04',settings:{targetCents:123},excludedDocumentIds:[]},project={generation:'synthetic',row:{id:42,number:'S4',name:'KRONACHER Ausgabe #4'}},run={entities:{Projects:{generation:'synthetic'}},stats:{editions:0}};
 f.ctx.salesBulkEdition_(run,{id:edition.id},{edition,project,docs:[]});const saved=f.db['sales_editions/'+edition.id];assert.equal(saved.projectName,project.row.name);assert.equal(saved.projectId,'42');assert.equal(saved.settings.targetCents,123);const before=JSON.stringify(f.db);
 for(const patch of [{name:'KRONACHER Ausgabe #5'},{name:'OTHER Ausgabe #4'},{name:'KRONACHER Ausgabe #4 EXTRA'},{number:'OTHER'},{id:43}])assert.throws(()=>f.ctx.salesBulkEdition_(run,{id:edition.id},{edition,project:{...project,row:{...project.row,...patch}},docs:[]}),/Projektzuordnung/);assert.equal(JSON.stringify(f.db),before);
});
test('quota during anonymous protection probe is recognized without accepting public data',()=>{
 const f=bulkFixture(),source=fs.readFileSync(__dirname+'/Sales.gs','utf8');vm.runInContext(source.slice(source.indexOf('function salesAssertPrivate_('),source.indexOf('function getSalesState(')),f.ctx);f.ctx.UrlFetchApp.fetch=()=>({getResponseCode:()=>429});assert.throws(()=>f.ctx.salesAssertPrivate_(),e=>f.ctx.salesWorkerLimited_(e));f.ctx.UrlFetchApp.fetch=()=>({getResponseCode:()=>200});assert.throws(()=>f.ctx.salesAssertPrivate_(),/Schutz/);
});

for(const c of cases){c.fn();console.log('PASS',c.name);count++;}console.log(count+' bulk/worker checks passed.');}
module.exports={bulkFixture};
