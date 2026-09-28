const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{setup}=require('./test-sales-v1.cjs');
let count=0;function test(name,fn){fn();console.log('PASS '+name);count++;}
function finish(f,run=f.ctx.startSalesSync()){
 for(let n=0;run.state==='running'&&n<2000;n++)run=f.ctx.runSalesSyncStep(run.id,run.revision);
 assert.notEqual(run.state,'running','sync did not finish');return run;
}
function useRealStorage(f){
 const raw={};for(const [p,value]of Object.entries(f.db))raw[p]={payload:JSON.stringify(value)};
 vm.runInContext(fs.readFileSync(__dirname+'/SalesStorage.gs','utf8'),f.ctx);
 const src=fs.readFileSync(__dirname+'/Sales.gs','utf8');vm.runInContext(src.slice(src.indexOf('function salesRead_('),src.indexOf('function salesList_(')),f.ctx);
 f.ctx.salesContext_=()=>({project:'synthetic',token:'synthetic'});
 f.ctx.pilotReadDocument_=(_project,path)=>raw[path]||null;
 f.ctx.pilotWriteDocument_=(_project,path,value)=>{assert.ok(Buffer.byteLength(value.payload)<750000,'oversized physical document');raw[path]={...value};};
 f.ctx.salesList_=col=>Object.keys(raw).filter(p=>p.startsWith(col+'/')).map(p=>f.ctx.salesRead_(p));
 return raw;
}
test('large Unicode payloads are split losslessly and failed publication preserves the previous snapshot',()=>{
 const f=setup(),raw=useRealStorage(f),path='sales_companies/102';f.ctx.salesWrite_(path,{old:true});
 const value={histories:[{content:'ä😀\n\t"'.repeat(150000)}]},write=f.ctx.pilotWriteDocument_;
 f.ctx.pilotWriteDocument_=(project,p,v)=>{if(p.startsWith('sales_chunks/')&&p.endsWith('-2'))throw Error('Simulated interrupted part');write(project,p,v);};
 assert.throws(()=>f.ctx.salesWrite_(path,value),/interrupted/);assert.equal(f.ctx.salesRead_(path).old,true);
 f.ctx.pilotWriteDocument_=write;f.ctx.salesWrite_(path,value);assert.equal(f.ctx.salesRead_(path).histories[0].content,value.histories[0].content);
 const manifest=JSON.parse(raw[path].payload);assert.equal(manifest.storageFormat,'sales-parts-v1');delete raw['sales_chunks/'+manifest.generation+'-0'];assert.throws(()=>f.ctx.salesRead_(path),/Teilpaket fehlt/);
});
test('full sync imports an oversized company, all companies and unassigned records with exact counts',()=>{
 const f=setup();f.config(70);f.doc(70,1);for(let i=1;i<=112;i++)f.remote.ContactHistories[i]={id:i,companyId:102,reason:'Synthetic',content:'Content '.repeat(1600),contactHistoryChannel:'Note'};
 f.remote.ContactPersons[333]={id:333,companyId:null,firstName:'Unassigned'};f.remote.ContactHistories[999]={id:999,companyId:null,reason:'Unassigned',content:'Standalone',contactHistoryChannel:'Note'};
 const raw=useRealStorage(f),n=f.calls.length,run=finish(f);
 assert.equal(run.state,'completed',JSON.stringify(run.errors));assert.equal(run.stats.companies,2);assert.equal(run.stats.histories,112);assert.equal(run.stats.hqHistories,113);assert.equal(run.stats.unassignedHistories,1);assert.equal(run.stats.unassignedContacts,1);
 assert.equal(f.ctx.getSalesV1Company('102').histories.length,112);assert.equal(JSON.parse(raw['sales_companies/102'].payload).storageFormat,'sales-parts-v1');
 assert.ok(f.ctx.getSalesV1State().companies.some(c=>c.id==='101'));assert.equal(run.coverage[0].missingCompanyIds.length,0);assert.equal(f.ctx.getSalesUnassigned().contacts[0].firstName,'Unassigned');
 assert.ok(f.calls.slice(n).every(c=>c.method==='get'));
});
test('company page errors preserve old complete data and are reflected in edition coverage',()=>{
 const f=setup();f.config(70);f.doc(70,1);assert.equal(finish(f).state,'completed');const before=JSON.stringify(f.db['sales_companies/102']);
 for(let i=1;i<=60;i++)f.remote.ContactHistories[i]={id:i,companyId:102,reason:'Synthetic',content:'Text',contactHistoryChannel:'Note'};
 const get=f.ctx.salesHqGet_;f.ctx.salesHqGet_=p=>{if(p.includes('/ContactHistories?')&&decodeURIComponent(p).includes('companyId eq 102')&&p.includes('$skip=50'))throw Error('Synthetic later page error');return get(p);};
 const run=finish(f);assert.equal(run.state,'completedWithErrors');assert.equal(JSON.stringify(f.db['sales_companies/102']),before);assert.ok(run.coverage[0].missingCompanyIds.includes('102'));assert.ok(run.errors.some(e=>e.stage==='Kontakthistorie'));
 f.ctx.salesHqGet_=get;assert.equal(finish(f).state,'completed');assert.equal(f.db['sales_companies/102'].histories.length,60);
});
test('a sync can be resumed and a stale revision cannot repeat a page',()=>{
 const f=setup();let run=f.ctx.startSalesSync();const old=run.revision;run=f.ctx.runSalesSyncStep(run.id,old);const n=f.calls.length;
 assert.equal(f.ctx.runSalesSyncStep(run.id,old).revision,run.revision);assert.equal(f.calls.length,n);assert.equal(f.ctx.startSalesSync().id,run.id);assert.equal(finish(f,run).state,'completed');
});
function freshDraft(){
 const f=setup();for(const p of Object.keys(f.db))if(p.startsWith('sales_jobs/')||p.startsWith('sales_drafts/')||p.startsWith('sales_companies/'))delete f.db[p];
 f.remote.Companies={};f.remote.ContactPersons={};const id=f.ctx.saveSalesTestCompany(f.input).id;return {f,id};
}
test('one sync creates and confirms the company before a separate contact execution',()=>{
 const {f,id}=freshDraft();let run=f.ctx.startSalesSync(),n=f.calls.length;run=f.ctx.runSalesSyncStep(run.id,run.revision);
 assert.deepEqual(Array.from(f.calls.slice(n).filter(c=>c.method==='post'),c=>c.path),['/v2/Companies']);assert.ok(f.db['sales_jobs/'+id].companyConfirmedAt);
 const calls=f.calls.length;f.ctx.runSalesSyncStep(run.id,run.revision-1);assert.equal(f.calls.length,calls);
 run=f.ctx.runSalesSyncStep(run.id,run.revision);assert.equal(f.remote.ContactPersons[202].companyId,101);assert.equal(f.db['sales_jobs/'+id].state,'synced');
 assert.equal(finish(f,run).state,'completed');const posts=f.calls.filter(c=>c.method==='post').length;finish(f);assert.equal(f.calls.filter(c=>c.method==='post').length,posts);
});
test('lost HQ responses never cause an automatic duplicate on a subsequent sync',()=>{
 const {f,id}=freshDraft(),before=f.calls.filter(c=>c.method==='post').length;f.loseResponse();let r=finish(f);assert.equal(r.state,'completedWithErrors');assert.equal(f.db['sales_jobs/'+id].state,'uncertain');
 const n=f.calls.filter(c=>c.method==='post').length;r=finish(f);assert.equal(r.state,'completedWithErrors');assert.equal(f.calls.filter(c=>c.method==='post').length,n);assert.equal(n-before,1);assert.equal(Object.keys(f.remote.ContactPersons).length,0);
});
test('a server job without its own TEST draft cannot write an imported customer',()=>{
 const f=setup();f.db['sales_jobs/foreign']={id:'foreign',kind:'companyChange',draftId:'102',hqId:102,state:'pending'};const n=f.calls.length,run=finish(f);
 assert.ok(run.errors.some(e=>e.kind==='write'));assert.ok(f.calls.slice(n).every(c=>c.method==='get'));
});
test('conflicted jobs remain visible and are not retried by the common button',()=>{
 const f=setup();f.db['sales_jobs/conflict']={id:'conflict',kind:'companyChange',draftId:'test-1',state:'conflict'};const n=f.calls.length,run=finish(f);
 assert.ok(run.errors.some(e=>e.message.includes('Konflikt')));assert.ok(f.calls.slice(n).every(c=>c.method==='get'));
});
test('only explicitly enabled magazine editions participate, while firms without invoices are imported',()=>{
 const f=setup(),a=f.config(70),b=f.config(71);f.doc(70,1);f.doc(71,2);f.ctx.setSalesEditionEnabled(b,false);const run=finish(f);
 assert.equal(run.stats.editions,1);assert.ok(f.db['sales_editions/'+a].loadedAt);assert.equal(f.db['sales_editions/'+b].loadedAt,undefined);assert.equal(run.stats.companies,2);
 const active=f.ctx.startSalesSync();assert.throws(()=>f.ctx.setSalesEditionEnabled(a,false),/Abschluss/);assert.throws(()=>f.ctx.saveSalesEditionConfig({}),/Abschluss/);finish(f,active);
});
test('all common sync endpoints enforce identity and administrative mutation permissions',()=>{
 const f=setup();f.setEmail('outside@example.invalid');for(const name of ['startSalesSync','runSalesSyncStep','setSalesEditionEnabled','getSalesUnassigned'])assert.throws(()=>f.ctx[name]({}),/Zugriff/);
 f.setEmail('pp@markatus.de');f.ctx.saveSalesAccess('pp@markatus.de,reader@example.invalid');f.setEmail('reader@example.invalid');assert.doesNotThrow(()=>f.ctx.getSalesUnassigned());for(const name of ['startSalesSync','runSalesSyncStep','setSalesEditionEnabled'])assert.throws(()=>f.ctx[name]({}),/Zugriff/);
});
test('discovery and global contact scans cross page boundaries without omitting companies or contacts',()=>{
 const f=setup();for(let i=200;i<254;i++)f.remote.Companies[i]={...f.remote.Companies[102],id:i,name:'Synthetic '+i};
 for(let i=400;i<461;i++)f.remote.ContactPersons[i]={id:i,companyId:200,firstName:'Synthetic '+i};
 const run=finish(f);assert.equal(run.state,'completed',JSON.stringify(run.errors));assert.equal(run.stats.companies,56);assert.equal(run.stats.contacts,62);
 assert.equal(f.ctx.getSalesV1Company('200').contacts.length,61);assert.equal(new Set(f.ctx.getSalesV1State().companies.map(c=>c.id)).size,56);
 assert.ok(f.calls.some(c=>c.path.startsWith('/v2/Companies?')&&c.path.includes('$skip=50')));
});
test('legacy directory migration preserves other records and blocks overlapping old import starts',()=>{
 const f=setup(),old=f.ctx.salesCompany_(f.remote.Companies[102]);f.db['sales_meta/directory']={entries:[{company:old,contacts:[{id:'legacy-contact'}]}]};
 f.ctx.salesV1IndexCompany_({company:{...old,name:'Updated'}},false);assert.equal(f.ctx.salesV1Index_().entries[0].company.name,'Updated');assert.equal(f.ctx.salesV1Index_().entries[0].contacts[0].id,'legacy-contact');
 f.ctx.startSalesSync();for(const name of ['startSalesImport','runSalesImportStep','retrySalesImport'])assert.throws(()=>f.ctx[name](),/gemeinsame HQ-Sync/);
});
console.log(count+' storage and sync checks passed.');
