const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const prior=fs.readFileSync(__dirname+'/test-sales.cjs','utf8'),moduleSource=fs.readFileSync(__dirname+'/SalesV1.gs','utf8'),cases=[];let count=0;
function test(name,fn){cases.push({name,fn});}
function setup(){
  const scope={require,__dirname,console,Buffer,URL};vm.runInNewContext(prior.slice(0,prior.indexOf("test('all public RPCs"))+'globalThis.f=fixture();globalThis.finish=finishCreate;',scope);
  const f=scope.f;vm.runInContext(moduleSource,f.ctx);
  const d=f.ctx.saveSalesTestCompany(f.input);scope.finish(f,d.id);
  f.remote.Companies[102]={...JSON.parse(JSON.stringify(f.remote.Companies[101])),id:102,name:'Synthetic prospect'};
  f.remote.Projects={};f.remote.Documents={};f.remote.PlannedRevenues={};
  const get=f.ctx.salesHqGet_;f.ctx.salesHqGet_=path=>{
    const r=get(path);if(!path.includes('?'))return r;
    const q=new URL('https://fixture'+path).searchParams,filter=q.get('$filter')||q.get('filter')||'';let rows=r.data;
    const number=/number eq '((?:''|[^'])*)'/.exec(filter),contains=/contains\(name,'((?:''|[^'])*)'\)/.exec(filter);
    if(contains||number)rows=rows.filter(x=>contains&&String(x.name).toLowerCase().includes(contains[1].replace(/''/g,"'").toLowerCase())||number&&x.number===number[1]);
    return {data:rows.slice(Number(q.get('$skip')||q.get('skip')||0),Number(q.get('$skip')||q.get('skip')||0)+Number(q.get('$top')||q.get('top')||200)),headers:{'helloHQ-Count':rows.length}};
  };
  f.config=(issue,magazine='Coburger')=>{const id=500+issue;f.remote.Projects[id]={id,name:magazine+' #'+issue,number:'P'+issue,companyId:102,status:'Completed'};return f.ctx.saveSalesEditionConfig({magazine,issue,projectId:id}).id;};
  f.doc=(issue,id,companyId=102)=>{f.remote.Documents[id]={id,projectId:500+issue,companyId,number:'RE-'+id,date:'2026-01-01',netValue:100,currency:'EUR',documentType:'Invoice',documentStatusEntity:{documentStatusType:'Sent'}};};
  f.finish=()=>{let run=f.ctx.startSalesImport();for(let i=0;run.state==='running'&&i<100;i++)run=f.ctx.runSalesImportStep(run.id,run.revision);assert.notEqual(run.state,'running');return run;};
  return f;
}
test('all V1 entry points require an allowed identity before reads or writes',()=>{
 const f=setup();f.setEmail('outside@example.invalid');const n=f.calls.length;
 for(const name of ['getSalesV1State','getSalesV1Company','searchSalesProjects','searchSalesCompanies','addSalesCompany','saveSalesEditionConfig','saveSalesV1EditionSettings','syncSalesV1Company','syncSalesV1History','startSalesImport','runSalesImportStep','retrySalesImport','setSalesDocumentExcluded'])assert.throws(()=>f.ctx[name]({}),/Zugriff/);
 assert.equal(f.calls.length,n);
});
test('project selection is verified; duplicate issue/project mappings cannot replace history',()=>{
 const f=setup(),id=f.config(70);assert.throws(()=>f.ctx.saveSalesEditionConfig({magazine:'Other',issue:2,projectId:570}),/bereits/);
 f.remote.Projects[571]={id:571,name:'Other',number:'OTHER'};assert.throws(()=>f.ctx.saveSalesEditionConfig({magazine:'Coburger',issue:70,projectId:571}),/bereits/);
 assert.throws(()=>f.ctx.saveSalesEditionConfig({magazine:'Coburger',issue:71,projectId:999}));assert.equal(f.db['sales_editions/'+id].projectId,'570');
 const prior=f.config(69,'COBURGER');assert.equal(f.db['sales_editions/'+prior].magazine,'Coburger');
});
test('multi-edition import deduplicates companies, imports contacts and never writes HQ',()=>{
 const f=setup();f.config(69);f.config(70);f.doc(69,1001);f.doc(70,1002);const n=f.calls.length;
 const run=f.finish();assert.equal(run.state,'completed');assert.equal(run.tasks.filter(t=>t.kind==='company').length,1);
 const state=f.ctx.getSalesV1State();assert.equal(state.editions.length,2);assert.equal(state.companies.length,1);assert.ok(state.directory[0].loadedAt);assert.equal(f.ctx.getSalesV1Company('102').projects.length,2);
 assert.ok(f.calls.slice(n).every(c=>c.method==='get'));assert.throws(()=>f.ctx.saveSalesHistory({draftId:'102',channel:'Note',reason:'No',content:'No'}));
 f.finish();assert.equal(f.ctx.getSalesV1State().companies.length,1);
});
test('an explicit prospect without invoices is imported; arbitrary IDs remain inaccessible',()=>{
 const f=setup();assert.throws(()=>f.ctx.getSalesV1Company('102'),/aufgenommen/);assert.throws(()=>f.ctx.syncSalesV1Company('102'),/Bestand/);
 f.ctx.addSalesCompany(102);assert.equal(f.finish().state,'completed');assert.equal(f.ctx.getSalesV1Company('102').company.id,'102');
});
test('edition pages resume after reload and stale revision cannot advance another item',()=>{
 const f=setup(),id=f.config(70);for(let i=1;i<=205;i++)f.doc(70,1000+i);
 let run=f.ctx.startSalesImport();const old=run.revision;run=f.ctx.runSalesImportStep(run.id,old);assert.equal(run.tasks[0].pages,1);assert.equal(run.cursor,0);assert.equal(f.db['sales_editions/'+id].loadedAt,undefined);
 const n=f.calls.length;assert.equal(f.ctx.runSalesImportStep(run.id,old).revision,run.revision);assert.equal(f.calls.length,n);
 assert.equal(f.ctx.startSalesImport().id,run.id);assert.equal(f.finish().state,'completed');assert.equal(f.db['sales_editions/'+id].documents.length,205);
});
test('failed later page preserves old complete snapshot and retry processes failed sections',()=>{
 const f=setup(),id=f.config(70);f.doc(70,1);f.finish();const before=JSON.stringify(f.db['sales_editions/'+id]);for(let i=2;i<=205;i++)f.doc(70,i);
 const get=f.ctx.salesHqGet_;f.ctx.salesHqGet_=p=>{if(p.startsWith('/v2/Documents?')&&p.includes('$skip=200'))throw Error('Page unavailable');return get(p);};
 const run=f.finish();assert.equal(run.state,'completedWithErrors');assert.equal(JSON.stringify(f.db['sales_editions/'+id]),before);
 f.ctx.salesHqGet_=get;f.ctx.retrySalesImport();assert.equal(f.finish().state,'completed');assert.equal(f.db['sales_editions/'+id].documents.length,205);
});
test('foreign documents are rejected without replacing the edition snapshot',()=>{
 const f=setup(),id=f.config(70);f.doc(70,1);const get=f.ctx.salesHqGet_;
 f.ctx.salesHqGet_=p=>{const r=get(p);if(p.startsWith('/v2/Documents?'))r.data.forEach(d=>d.projectId=999);return r;};
 assert.equal(f.finish().state,'completedWithErrors');assert.equal(f.db['sales_editions/'+id].loadedAt,undefined);
});
test('ambiguous multi-edition documents can be excluded and cannot count as complete history',()=>{
 const f=setup(),id=f.config(70);f.doc(70,1);f.doc(70,2);f.finish();f.ctx.setSalesDocumentExcluded({editionId:id,documentId:1,excluded:true});
 assert.equal(f.db['sales_editions/'+id].documents.length,1);assert.equal(f.db['sales_editions/'+id].complete,false);f.finish();assert.equal(f.db['sales_editions/'+id].documents.length,1);
 assert.throws(()=>f.ctx.setSalesDocumentExcluded({editionId:id,documentId:999,excluded:true}));
 f.ctx.setSalesDocumentExcluded({editionId:id,documentId:1,excluded:false});f.finish();assert.equal(f.db['sales_editions/'+id].documents.length,2);assert.equal(f.db['sales_editions/'+id].complete,true);
});
test('edition targets and dates are independent and protected from lost updates',()=>{
 const f=setup(),a=f.config(69),b=f.config(70);f.ctx.saveSalesV1EditionSettings({editionId:a,revision:0,target:'123',adDeadline:'2026-10-01',printDate:'2026-10-02',releaseDate:'2026-10-03'});
 assert.equal(f.db['sales_editions/'+a].settings.targetCents,12300);assert.equal(f.db['sales_editions/'+b].settings.targetCents,null);
 assert.throws(()=>f.ctx.saveSalesV1EditionSettings({editionId:a,revision:0,target:'999'}),/inzwischen/);
});
test('HQ search is read-only and escapes literal quote characters',()=>{
 const f=setup();f.config(70);const n=f.calls.length;assert.equal(f.ctx.searchSalesProjects('P70').rows.length,1);f.ctx.searchSalesCompanies("O'Brien");
 assert.ok(f.calls.slice(n).every(c=>c.method==='get'));assert.ok(decodeURIComponent(f.calls.at(-1).path).includes("O''Brien"));
});
test('ordinary allowed users can read but cannot change import scope or run HQ import',()=>{
 const f=setup();f.ctx.saveSalesAccess('pp@markatus.de\ntest@example.invalid');f.setEmail('test@example.invalid');f.ctx.getSalesV1State();
 for(const name of ['addSalesCompany','saveSalesEditionConfig','startSalesImport','runSalesImportStep','retrySalesImport','setSalesDocumentExcluded'])assert.throws(()=>f.ctx[name]({}),/Zugriff/);
});
test('history filters distinguish missing coverage, magazine scope, previous five and older clients',()=>{
 const sandbox={};vm.runInNewContext(fs.readFileSync(__dirname+'/SalesV1.js','utf8')+';globalThis.choose=historySelection;',sandbox);
 const editions=[64,65,66,67,68,69,70].map(issue=>({id:'e'+issue,magazine:'Coburger',issue,loadedAt:'2026-09-28',complete:true,documents:[]}));
 editions[0].documents=[{companyId:'old',cents:100}];editions[2].documents=[{companyId:'active',cents:100},{companyId:'credited',cents:100},{companyId:'credited',cents:-100}];editions[5].documents=[{companyId:'latest',cents:100}];
 editions.push({magazine:'Other',issue:69,loadedAt:'2026-09-28',complete:true,documents:[{companyId:'foreign',cents:100}]});
 assert.deepEqual(Array.from(sandbox.choose(editions,editions[6],'last5').ids).sort(),['active','latest']);
 assert.deepEqual(Array.from(sandbox.choose(editions,editions[6],'lapsed').ids).sort(),['active','old']);
 assert.equal(sandbox.choose(editions.filter(e=>e.issue!==68),editions[6],'last5').unknown,true);
 editions[5].complete=false;assert.equal(sandbox.choose(editions,editions[6],'lapsed').unknown,true);
});
test('an imported additional contact can be selected only within the own TEST company',()=>{
 const f=setup(),draft=Object.values(f.db).find(v=>v.testOnly),input={draftId:draft.id,reason:'TEST contact',content:'Test',channel:'Meeting',contactOn:'2026-09-28T10:00:00Z',contactPersonId:203};
 f.remote.ContactPersons[203]={id:203,companyId:101,firstName:'Other',lastName:'Test'};f.db['sales_companies/101'].contacts.push(f.remote.ContactPersons[203]);
 const h=f.ctx.saveSalesHistory(input);assert.equal(f.ctx.runSalesJob(h.id).state,'synced');assert.equal(f.remote.ContactHistories[303].contactPersonId,203);
 const again=f.ctx.saveSalesHistory(input),n=f.calls.length;f.remote.ContactPersons[203].companyId=102;assert.notEqual(f.ctx.runSalesJob(again.id).state,'synced');assert.ok(f.calls.slice(n).every(c=>c.method==='get'));
 assert.throws(()=>f.ctx.saveSalesHistory({...input,contactPersonId:999}));
});
if(require.main===module){for(const {name,fn} of cases){fn();count++;console.log('PASS',name);}console.log(count+' V1 checks passed.');}
module.exports={setup};
