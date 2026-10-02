const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{setup}=require('./test-sales-v1.cjs');
const source=['SalesStorage.gs','SalesBulkStore.gs','SalesBulkSync.gs','SalesWorker.gs'].map(n=>fs.readFileSync(__dirname+'/'+n,'utf8')).join('\n');
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
     for(const w of body.writes){const path=w.update.name.split('/documents/')[1];fields[path]=clone(w.update.fields);f.db[path]=f.ctx.salesBulkDecode_(document(path));}
     if(f.failCommit==='after'){f.failCommit=null;throw Error('Synthetic response lost');}return {writeResults:body.writes.map(()=>({updateTime:'2026-01-01'}))};
   }
   if(op==='runQuery'){
     const q=body.structuredQuery,filter=q.where.fieldFilter;
     return Object.keys(fields).filter(p=>p.startsWith(q.from[0].collectionId+'/')&&fields[p][filter.field.fieldPath]?.stringValue===filter.value.stringValue).sort().filter(p=>!q.startAt||name(p)>q.startAt.values[0].referenceValue).slice(0,q.limit).map(p=>({document:document(p)}));
   }throw Error('Unexpected Firebase operation '+op);
 };
 const get=f.ctx.salesHqGet_;f.ctx.salesHqGet_=path=>{
   const m=/^\/v2\/(Companies|ContactPersons|ContactHistories|Projects|Documents|PlannedRevenues)\?/.exec(path);if(!m)return get(path);
   f.calls.push({method:'get',path});const q=new URL('https://fixture'+path).searchParams,filter=q.get('$filter')||'';let rows=Object.values(f.remote[m[1]]||{}).map(clone).sort((a,b)=>a.id-b.id);
   const id=/id gt (\d+)/.exec(filter),since=/updatedOn ge datetime'([^']+)'/.exec(filter);if(id)rows=rows.filter(r=>r.id>Number(id[1]));if(since)rows=rows.filter(r=>Date.parse(r.updatedOn)>=Date.parse(since[1]));
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
 delete f.remote.ContactPersons[300];f.finishBulk();assert.ok(!f.db['sales_companies/101'].contacts.some(c=>String(c.id)==='300'));
});
test('lost cache commit response replays immutable page without losing counts or old associations',()=>{
 const f=bulkFixture();f.ctx.startSalesSync();f.failCommit='after';f.worker();let run=f.db['sales_meta/sync'];assert.ok(run.paused);assert.ok(run.tasks[run.cursor].pendingPage);assert.equal(f.db['sales_meta/bulk'],undefined);f.ctx.startSalesSync();run=f.finishBulk();assert.equal(run.stats.companies,2);assert.equal(run.entities.Companies.seen,2);assert.equal(run.state,'completed');
});
test('read failure preserves published records and change cursors, then resumes the same task',()=>{
 const f=bulkFixture();f.finishBulk();const snapshot=JSON.stringify(f.db['sales_companies/102']),watermark=JSON.stringify(f.db['sales_meta/bulk']);f.remote.Companies[102].name='Changed';const get=f.ctx.salesHqGet_;f.ctx.salesHqGet_=p=>{if(p.startsWith('/v2/ContactHistories?'))throw Error('Synthetic HTTP 503');return get(p);};f.ctx.startSalesSync();f.worker();assert.ok(f.db['sales_meta/sync'].paused);assert.equal(JSON.stringify(f.db['sales_companies/102']),snapshot);assert.equal(JSON.stringify(f.db['sales_meta/bulk']),watermark);const id=f.db['sales_meta/sync'].id;f.ctx.salesHqGet_=get;f.finishBulk();assert.equal(f.db['sales_meta/sync'].id,id);assert.equal(f.db['sales_companies/102'].company.name,'Changed');
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
test('weekly control pass detects removed histories; mismatched totals never advance cursors',()=>{
 const f=bulkFixture();f.remote.ContactHistories[1]={id:1,companyId:102,content:'Synthetic',updatedOn:'2026-01-01T00:00:00Z'};f.finishBulk();delete f.remote.ContactHistories[1];let run=f.finishBulk();assert.equal(run.state,'completedWithErrors');assert.equal(f.db['sales_meta/bulk'].needsFull,true);run=f.finishBulk();assert.equal(run.full,true);assert.equal(run.state,'completed');assert.equal(f.db['sales_companies/102'].histories.length,0);
});
test('company creation and contact creation use different worker executions; uncertain jobs never post again',()=>{
 const f=bulkFixture(),saved=f.ctx.saveSalesTestCompany({...f.input,name:'TEST Worker Company'});const start=f.calls.length;f.ctx.startSalesSync();f.setEmail('');f.worker();assert.ok(f.db['sales_jobs/'+saved.id].companyConfirmedAt);assert.equal(f.calls.slice(start).filter(c=>c.method==='post'&&c.path==='/v2/ContactPersons').length,0);f.worker();assert.equal(f.calls.slice(start).filter(c=>c.method==='post'&&c.path==='/v2/ContactPersons').length,1);f.setEmail('pp@markatus.de');
 f.db['sales_jobs/'+saved.id].state='uncertain';f.finishBulk();const count=f.calls.filter(c=>c.method==='post').length;f.ctx.startSalesSync();f.worker();assert.equal(f.calls.filter(c=>c.method==='post').length,count);
});
test('unsupported HQ date filter falls back visibly; ignored keyset filter is stopped',()=>{
 const f=bulkFixture();f.finishBulk();const get=f.ctx.salesHqGet_;f.ctx.salesHqGet_=p=>{if(p.startsWith('/v2/ContactHistories?')&&decodeURIComponent(p).includes('updatedOn ge'))throw Error('HQ-Lesetest: HTTP 400');return get(p);};let run=f.finishBulk();assert.equal(run.entities.ContactHistories.full,true);assert.equal(run.entities.ContactHistories.deltaSupported,false);assert.match(run.note,/akzeptiert/);
 f.remote.Companies={};for(let id=1;id<=201;id++)f.remote.Companies[id]={id,name:'Synthetic',updatedOn:'2026-01-01T00:00:00Z'};f.ctx.salesHqGet_=p=>get(p.replace(/&\$filter=[^&]+/,''));f.ctx.startSalesSync();f.worker();run=f.db['sales_meta/sync'];assert.ok(run.paused);assert.match(run.blockedMessage,/Fortsetzungsfilter/);
});
test('updates to already paged low IDs during import are caught by the next independent watermark',()=>{
 const f=bulkFixture();for(let id=1;id<=201;id++)f.remote.ContactHistories[id]={id,companyId:102,reason:'Before',updatedOn:'2026-01-01T00:00:00Z'};f.ctx.startSalesSync();let run=f.db['sales_meta/sync'];while(!(run.tasks[run.cursor].id==='ContactHistories'&&run.entities.ContactHistories.pages===1))run=f.step();f.remote.ContactHistories[1].reason='During import';f.remote.ContactHistories[1].updatedOn=new Date().toISOString();f.finishBulk();assert.equal(f.db['sales_companies/102'].histories.find(h=>h.id===1).reason,'Before');f.finishBulk();assert.equal(f.db['sales_companies/102'].histories.find(h=>h.id===1).reason,'During import');
});
test('pause request survives a busy worker lock and revoked admin cannot continue',()=>{
 const f=bulkFixture(),run=f.ctx.startSalesSync();f.ctx.LockService={getScriptLock:()=>({tryLock:()=>false,releaseLock(){}})};assert.ok(f.ctx.pauseSalesSync(run.id).pauseRequested);f.ctx.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})};f.worker();assert.ok(f.db['sales_meta/sync'].paused);assert.equal(f.db['sales_meta/sync'].cursor,0);f.ctx.startSalesSync();f.props.SALES_ALLOWED_EMAILS='outside@example.invalid';assert.throws(()=>f.worker(),/autorisiert/);
});
test('ID pagination tolerates global counts and smaller pages; project deletions also trigger reconciliation',()=>{
 const f=bulkFixture();f.remote.Companies={};f.remote.ContactPersons={};for(let id=1;id<=400;id++)f.remote.Companies[id]={id,name:'Synthetic '+id,updatedOn:'2026-01-01T00:00:00Z'};f.remote.Projects[100]={id:100,companyId:1,name:'Project',updatedOn:'2026-01-01T00:00:00Z'};const get=f.ctx.salesHqGet_;f.ctx.salesHqGet_=p=>{const r=get(p);if(p.startsWith('/v2/Companies?')){r.data=r.data.slice(0,100);r.headers['helloHQ-Count']=400;}return r;};let run=f.finishBulk();assert.equal(run.stats.companies,400);assert.equal(run.state,'completed');delete f.remote.Projects[100];run=f.finishBulk();assert.equal(run.state,'completedWithErrors');assert.ok(f.db['sales_meta/bulk'].needsFull);run=f.finishBulk();assert.equal(run.state,'completed');assert.equal(f.db['sales_companies/1'].projects.length,0);
});
test('three unfinished server attempts stop instead of consuming quota forever',()=>{
 const f=bulkFixture();f.ctx.startSalesSync();const run=f.db['sales_meta/sync'];run.inFlight={key:'0::0:0:',attempts:3};const n=f.calls.length;f.worker();assert.ok(f.db['sales_meta/sync'].paused);assert.match(f.db['sales_meta/sync'].blockedMessage,/dreimal/);assert.equal(f.calls.length,n);assert.equal(f.triggers.length,0);
});
if(require.main===module){let count=0;for(const c of cases){c.fn();console.log('PASS',c.name);count++;}console.log(count+' bulk/worker checks passed.');}
module.exports={bulkFixture};
