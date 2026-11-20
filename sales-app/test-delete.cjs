const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {productionFixture}=require('./test-business.cjs');
const plain=x=>JSON.parse(JSON.stringify(x));let count=0;function test(name,fn){fn();count++;console.log('PASS '+name);}
const ADMIN='pp@markatus.de',TEAM='team@example.test';
function fixture(){
  const f=productionFixture(),{ctx,db,remote}=f;
  const keep={name:ctx.salesBulkName_,payload:ctx.salesBulkPayload_,rest:ctx.salesBulkRest_};vm.runInContext(fs.readFileSync(__dirname+'/SalesBulkStore.gs','utf8'),ctx);ctx.salesBulkName_=keep.name;ctx.salesBulkPayload_=keep.payload;ctx.salesBulkRest_=keep.rest;
  f.props.SALES_ALLOWED_EMAILS=ADMIN+','+TEAM;
  const commit=ctx.salesBulkRest_;
  ctx.salesBulkRest_=(operation,body)=>{
    if(operation==='commit'&&body.writes.some(w=>w.delete)){for(const w of body.writes){if(w.delete)delete db[w.delete];else ctx.salesWrite_(w.update.name,JSON.parse(w.update.fields.payload.stringValue));}return {writeResults:[]};}
    return commit(operation,body);
  };
  ctx.salesBulkQuery_=(collection,field,value)=>Object.entries(db).filter(([k,v])=>k.startsWith(collection+'/')&&v[field]===String(value)).map(([,v])=>JSON.parse(JSON.stringify(v)));
  ctx.salesBulkGet_=paths=>Object.fromEntries(paths.map(p=>[p,db[p]?JSON.parse(JSON.stringify(db[p])):null]));
  const get=ctx.salesHqGet_;ctx.salesHqGet_=path=>{const m=/^\/v2\/(\w+)\/(\d+)$/.exec(path);if(m&&!remote[m[1]]?.[m[2]]){f.calls.push({method:'get',path});throw Error('HQ-Lesetest: HTTP 404. Kein unvollständiger Import wird freigegeben.');}return get(path);};
  f.deleteStatus=200;
  const fetch=ctx.UrlFetchApp.fetch;ctx.UrlFetchApp.fetch=(url,opt)=>{
    if(opt.method!=='delete')return fetch(url,opt);
    const path=url.replace('https://api.hellohq.io',''),m=/^\/v2\/(\w+)\/(\d+)$/.exec(path);f.calls.push({method:'delete',path});
    if(f.deleteStatus===200)delete remote[m[1]][m[2]];return {getResponseCode:()=>f.deleteStatus,getContentText:()=>''};
  };
  Object.assign(remote,{Projects:{},Documents:{},PlannedRevenues:{}});
  remote.ContactHistories[303]={id:303,companyId:101,contactPersonId:202,reason:'Synthetic'};
  remote.ContactHistories[304]={id:304,companyId:101,reason:'Synthetic 2'};
  const raw=(col,row,companyId)=>{db['sales_raw'+col+'/'+row.id]={row,generation:'g1',companyBucket:String(Number(companyId)%64),projectBucket:'none'};};
  raw('companies',{id:101},101);raw('contacts',{id:202,companyId:101},101);raw('histories',{id:303,companyId:101},101);raw('histories',{id:304,companyId:101},101);raw('contacts',{id:999,companyId:165},165);
  const entities={};for(const e of ['Companies','ContactPersons','ContactHistories','Projects','Documents','PlannedRevenues'])entities[e]={generation:'g1',count:10,watermark:new Date().toISOString(),ids:[],checkOffset:0};
  entities.Companies.ids=['101','102'];entities.ContactPersons.ids=['202','999'];entities.ContactHistories.ids=['303','304'];
  db['sales_meta/bulk']={policy:3,entities,companyIds:['101','102'],completedAt:new Date().toISOString(),stats:{}};
  db['sales_meta/lean_names']={rows:[{id:'101',name:'Synthetic production customer'},{id:'102',name:'Other'}]};
  db['sales_meta/lean_filters']={rows:[{id:'101',name:'Synthetic production customer'},{id:'102',name:'Other'}]};
  db['sales_communication/101']={contacts:[],histories:[]};
  f.as=email=>f.setEmail(email);
  return f;
}
function request(f,reason='Doppelt angelegt'){f.as(TEAM);try{return f.ctx.requestSalesCustomerDelete({companyId:'101',reason});}finally{f.as(ADMIN);}}
function approve(f){const d=f.db['sales_deletions/101'];return f.ctx.decideSalesCustomerDelete({hqId:101,revision:d.revision,approve:true});}
function runSync(f){const run={entities:JSON.parse(JSON.stringify(f.db['sales_meta/bulk'].entities)),companyIds:['101','102'],errors:[]};for(const e of Object.values(run.entities))e.knownIds=e.ids.slice();
  const id=f.db['sales_deletions/101'].jobId;try{f.ctx.salesSyncWrite_({kind:'write',id},run);}catch(e){run.error=e.message;}return run;}

if(require.main===module){
test('any user can request a deletion; Firebase only, no HQ call, status visible in the customer file without an extra read',()=>{
  const f=fixture(),n=f.calls.length,r=request(f);
  assert.match(r.message,/Admin muss ihn freigeben/);assert.equal(f.calls.length,n,'no HQ request');
  const doc=f.db['sales_deletions/101'];assert.equal(doc.state,'requested');assert.equal(doc.requestedBy,TEAM);assert.equal(doc.reason,'Doppelt angelegt');
  assert.equal(f.db['sales_companies/101'].deletion.state,'requested');
  assert.equal(f.ctx.getSalesLeanCompany('101').deletion.state,'requested');
  assert.match(request(f).message,/bereits ein Löschantrag/);assert.equal(f.db['sales_deletions/101'].revision,1);
  assert.throws(()=>{f.as(TEAM);try{f.ctx.requestSalesCustomerDelete({companyId:'101',reason:''});}finally{f.as(ADMIN);}},/Pflichtfeld/);
});
test('only the admin can list and decide; a rejection removes the status and keeps the customer',()=>{
  const f=fixture();request(f);f.as(TEAM);
  assert.throws(()=>f.ctx.listSalesCustomerDeletions(),/Zugriff nicht freigegeben|AUTH_DENIED/);
  assert.throws(()=>f.ctx.decideSalesCustomerDelete({hqId:101,revision:1,approve:true}),/Zugriff nicht freigegeben|AUTH_DENIED/);f.as(ADMIN);
  assert.equal(f.ctx.listSalesCustomerDeletions().deletions[0].state,'requested');
  assert.throws(()=>f.ctx.decideSalesCustomerDelete({hqId:101,revision:7,approve:true}),/inzwischen geändert/);
  const r=f.ctx.decideSalesCustomerDelete({hqId:101,revision:1,approve:false});assert.match(r.message,/abgelehnt/);
  assert.equal(f.db['sales_deletions/101'].state,'rejected');assert.equal(f.db['sales_companies/101'].deletion,undefined);assert.ok(f.db['sales_companies/101'].company);
  assert.equal(Object.keys(f.db).some(k=>k.startsWith('sales_jobs/delete_')),false);
  assert.equal(request(f).deletion.state,'requested','a new request after a rejection is possible');
});
test('projects, documents, planned revenues and open jobs block the request with a clean-up hint',()=>{
  const f=fixture();f.db['sales_companies/101'].projects=[{id:9,name:'P'}];
  assert.throws(()=>request(f),/Löschen nicht möglich.*1 Projekt.*aufräumen/s);
  f.db['sales_companies/101'].projects=[];f.db['sales_rawdocuments/71']={row:{id:71,companyId:101},generation:'g1',companyBucket:'37'};
  assert.throws(()=>request(f),/1 Beleg/);delete f.db['sales_rawdocuments/71'];
  f.db['sales_rawplans/81']={row:{id:81,companyId:101},generation:'g1',companyBucket:'37'};assert.throws(()=>request(f),/1 Planumsatz/);delete f.db['sales_rawplans/81'];
  f.db['sales_jobs/open-change']={id:'open-change',kind:'entityChange',business:1,hqId:101,state:'uncertain'};assert.throws(()=>request(f),/1 offener Auftrag/);
  f.db['sales_jobs/open-change'].state='synced';assert.equal(request(f).deletion.state,'requested');
  assert.equal(f.calls.filter(c=>c.method==='delete').length,0);
});
test('approval rechecks Firebase and queues one job; HQ deletes histories, contacts, then the company; the app removes everything',()=>{
  const f=fixture();request(f);
  f.db['sales_companies/101'].projects=[{id:9}];assert.match(approve(f).message,/Löschen nicht möglich/);assert.equal(f.db['sales_deletions/101'].state,'blocked');
  f.db['sales_companies/101'].projects=[];const r=approve(f);assert.match(r.message,/freigegeben/);
  const doc=f.db['sales_deletions/101'],job=f.db['sales_jobs/'+doc.jobId];assert.equal(job.kind,'deleteCompany');assert.equal(job.state,'pending');assert.equal(job.approvedBy,ADMIN);assert.equal(doc.state,'approved');
  assert.equal(f.calls.filter(c=>c.method==='delete').length,0,'approval itself never touches HQ');
  const run=runSync(f);assert.equal(run.error,undefined);
  assert.deepEqual(plain(f.calls.filter(c=>c.method==='delete').map(c=>c.path)),['/v2/ContactHistories/303','/v2/ContactHistories/304','/v2/ContactPersons/202','/v2/Companies/101']);
  assert.equal(f.db['sales_jobs/'+doc.jobId].state,'synced');assert.match(f.db['sales_jobs/'+doc.jobId].message,/1 Ansprechpartnern und 2 Historieneinträgen/);
  assert.equal(f.db['sales_deletions/101'].state,'done');
  for(const p of ['sales_companies/101','sales_directory/101','sales_communication/101','sales_rawcompanies/101','sales_rawcontacts/202','sales_rawhistories/303','sales_rawhistories/304'])assert.equal(f.db[p],undefined,p);
  assert.ok(f.db['sales_rawcontacts/999'],'other customers stay');
  assert.deepEqual(plain(f.db['sales_meta/lean_names'].rows.map(r=>r.id)),['102']);assert.deepEqual(plain(f.db['sales_meta/lean_filters'].rows.map(r=>r.id)),['102']);
  const cache=f.db['sales_meta/bulk'];assert.equal(cache.entities.Companies.count,9);assert.equal(cache.entities.ContactPersons.count,9);assert.equal(cache.entities.ContactHistories.count,8);assert.deepEqual(plain(cache.companyIds),['102']);assert.deepEqual(plain(cache.entities.ContactPersons.ids),['999']);
  assert.equal(run.entities.Companies.count,9);assert.equal(run.entities.ContactHistories.count,8);assert.deepEqual(plain(run.companyIds),['102']);assert.deepEqual(plain(run.entities.Companies.knownIds),['102']);
  assert.deepEqual(plain(f.db['sales_meta/deleted_companies'].ids),['101']);
  f.db['sales_meta/directory']={entries:[{company:{id:'101',name:'Old'}}]};assert.equal(f.ctx.salesV1Index_().entries.some(e=>String(e.company.id)==='101'),false);
  assert.equal(f.ctx.salesLeanKnown_('101'),false);
});
test('HQ projects or documents found during the sync stop the deletion before any HQ write',()=>{
  const f=fixture();request(f);approve(f);f.remote.Documents[55]={id:55,companyId:101};
  const run=runSync(f),doc=f.db['sales_deletions/101'];assert.match(run.error,/In HQ nichts gelöscht.*1 Beleg/s);
  assert.equal(f.calls.filter(c=>c.method==='delete').length,0);assert.equal(doc.state,'blocked');assert.equal(f.db['sales_jobs/'+doc.jobId].state,'canceled');
  assert.ok(f.db['sales_companies/101'].company);assert.equal(f.db['sales_companies/101'].deletion.state,'blocked');
  delete f.remote.Documents[55];approve(f);const again=runSync(f);assert.equal(again.error,undefined);assert.equal(f.db['sales_deletions/101'].state,'done');
});
test('a failed HQ delete retries in the next sync and stops after three attempts; the admin can approve again',()=>{
  const f=fixture();request(f);approve(f);f.deleteStatus=500;
  for(let i=1;i<=3;i++){const run=runSync(f);assert.match(run.error,/HTTP 500|angehalten/);}
  const doc=f.db['sales_deletions/101'],job=f.db['sales_jobs/'+doc.jobId];assert.equal(job.state,'canceled');assert.equal(job.failures,3);assert.equal(doc.state,'failed');
  assert.ok(f.remote.Companies[101]);f.deleteStatus=200;approve(f);assert.equal(runSync(f).error,undefined);assert.equal(f.remote.Companies[101],undefined);assert.equal(f.db['sales_deletions/101'].state,'done');
});
test('large customers are deleted in bounded batches over several syncs',()=>{
  const f=fixture();for(let i=0;i<85;i++)f.remote.ContactHistories[1000+i]={id:1000+i,companyId:101};
  request(f);approve(f);const first=runSync(f);assert.match(first.error,/noch \d+ offen/);assert.ok(f.remote.Companies[101]);
  assert.equal(f.calls.filter(c=>c.method==='delete').length,80);assert.equal(f.db['sales_deletions/101'].state,'approved');
  assert.equal(runSync(f).error,undefined);assert.equal(f.remote.Companies[101],undefined);assert.equal(Object.keys(f.remote.ContactHistories).length,0);
});
test('a forged or unapproved job is refused; verify-only never deletes',()=>{
  const f=fixture();request(f);approve(f);const doc=f.db['sales_deletions/101'],job=f.db['sales_jobs/'+doc.jobId];
  job.approvedBy=TEAM;f.db['sales_jobs/'+job.id]=job;const run=runSync(f);assert.match(run.error,/nicht vom Admin freigegeben/);assert.equal(f.calls.filter(c=>c.method==='delete').length,0);
  assert.throws(()=>f.ctx.salesDeleteRun_({...job,approvedBy:ADMIN,state:'running'},true),/nur im zentralen HQ-Abgleich/);
  assert.throws(()=>f.ctx.salesDeleteHq_({kind:'deleteCompany',state:'running'},'/v2/Projects/1'),/nicht freigegeben/);
});
test('authorization registry: requests need customer read access, listing and decisions are admin-only',()=>{
  const f=fixture();assert.equal(f.ctx.salesAuthRule_('requestSalesCustomerDelete',[{}]),'customers.read');
  assert.equal(f.ctx.salesAuthRule_('listSalesCustomerDeletions',[]),'owner');assert.equal(f.ctx.salesAuthRule_('decideSalesCustomerDelete',[{}]),'owner');
});
test('UI: delete button and request form in the customer file, admin approval needs a second confirmation click',()=>{
  const ui=fs.readFileSync(__dirname+'/../hq-benchmark/Sales.html','utf8');
  for(const s of ["deleteCustomerButton(c)","deleteCustomerPanel(c)","if(deleteClick(a,id))return;","if(deleteSubmit(form,input))return;","deletionAdminPanel()","'Ja, endgültig löschen'","'delete-customer':'customers.read'","'deletion-approve':'owner'"])assert.ok(ui.includes(s),s);
});
console.log(count+' customer deletion checks passed.');
}
module.exports={fixture,ADMIN,TEAM};
