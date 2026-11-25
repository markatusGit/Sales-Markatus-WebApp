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
test('empty delta pages need no journals and unchanged 50-probe sync beats published r20 budget (histories need no probe)',()=>{
 const f=bulkFixture();f.config(70);f.doc(70,1001);
 for(const [i,entity] of ['Companies','ContactPersons','Projects','Documents','PlannedRevenues','ContactHistories'].entries())for(let j=0;Object.keys(f.remote[entity]).length<10;j++){
  const id=20000+i*1000+j;f.remote[entity][id]={id,companyId:102,projectId:570,name:'Synthetic',number:'S'+id,updatedOn:'2026-01-01',date:'2026-01-01',currency:'EUR',documentType:'Invoice',documentStatusEntity:{documentStatusType:'Sent'},netValue:1,reason:'Synthetic',content:'Synthetic',contactOn:'2026-01-01',contactHistoryChannel:'Note',estimations:[]};
 }
 f.finishBulk();const a=instrument(f),m=a.measure('unchanged sync',()=>{f.ctx.startSalesSync();f.worker();return f.ctx.salesRead_('sales_meta/sync');});
 assert.equal(m.result.state,'completed');assert.equal(Object.values(m.result.entities).reduce((n,e)=>n+(e.checked||0),0),50);assert.equal(m.result.entities.ContactHistories.checked||0,0);
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
test('r42: 30 changed firms in 30 groups read only their own raw records after the one-time key tagging',()=>{
 // Synthetic stock: 640 firms in all 64 groups, each with contact, two histories, project, document and planned revenue.
 const f=bulkFixture(),at='2026-01-01T00:00:00Z';
 for(let i=0;i<640;i++){const id=1000+i,p=5000+i;
  f.remote.Companies[id]={id,name:'Synthetic '+id,updatedOn:at};f.remote.ContactPersons[20000+i]={id:20000+i,companyId:id,firstName:'Synthetic',updatedOn:at};
  for(const h of [0,1])f.remote.ContactHistories[30000+2*i+h]={id:30000+2*i+h,companyId:id,reason:'Synthetic',content:'Synthetic',contactOn:at,contactHistoryChannel:'Note',updatedOn:at};
  f.remote.Projects[p]={id:p,companyId:id,name:'Synthetic project',number:'S'+p,status:'InProgress',updatedOn:at};
  f.remote.Documents[40000+i]={id:40000+i,companyId:id,projectId:p,number:'RE-'+i,date:'2026-01-01',currency:'EUR',documentType:'Invoice',documentStatusEntity:{documentStatusType:'Sent'},netValue:1,updatedOn:at};
  f.remote.PlannedRevenues[60000+i]={id:60000+i,companyId:id,projectId:p,netTotal:1,currency:'EUR',startDate:'2026-12-01',estimations:[],updatedOn:at};
 }
 f.finishBulk();const raw=Object.keys(f.fields).filter(k=>k.startsWith('sales_raw'));
 assert.ok(raw.every(k=>f.fields[k].companyKey&&f.fields[k].projectKey),'every raw write carries firm and project keys');
 // Model the stock before r42: no keys on stored records, no tagging progress.
 for(const k of raw){delete f.fields[k].companyKey;delete f.fields[k].projectKey;}
 const bulk=f.ctx.salesRead_('sales_meta/bulk');delete bulk.keyTags;f.ctx.salesWrite_('sales_meta/bulk',bulk);
 const a=instrument(f),sum=(o,prefix)=>Object.entries(o).filter(([c])=>c.startsWith(prefix)).reduce((n,[,v])=>n+v,0),rawReads=m=>sum(m.readsByCollection,'sales_raw');
 const change=from=>{for(let i=from;i<from+30;i++){f.remote.Companies[i].name='Changed '+i;f.remote.Companies[i].updatedOn=new Date().toISOString();}};
 const sync=label=>a.measure(label,()=>{f.ctx.startSalesSync();f.worker();return f.ctx.salesRead_('sales_meta/sync');});
 const budget=f.ctx.salesKeyTagBudget_;f.ctx.salesKeyTagBudget_=()=>0;change(1000);
 const before=sync('before');assert.equal(before.result.state,'completed');assert.equal(new Set(before.result.dirtyCompanies).size,30);
 assert.equal(f.ctx.salesRead_('sales_companies/1000').company.name,'Changed 1000');
 // One-time tagging, measured: a count query first, then only the two key fields per record.
 assert.equal(budget(),12000);assert.equal(f.ctx.salesKeyExtraBudget_(),4000);const extra=f.ctx.salesKeyExtraBudget_;f.ctx.salesKeyTagBudget_=budget;f.ctx.salesKeyExtraBudget_=()=>10000;const tag=sync('tagging');f.ctx.salesKeyExtraBudget_=extra;const tags=f.ctx.salesRead_('sales_meta/bulk').keyTags;
 assert.equal(tag.result.state,'completed');assert.ok(Object.values(tags.collections).every(t=>t.complete));assert.equal(tags.written,raw.length-30,'the 30 firms rewritten by the earlier sync already carry keys');assert.ok(raw.every(k=>f.fields[k].companyKey&&f.fields[k].projectKey));assert.equal(tags.measured.total,raw.length);
 assert.ok(tag.result.notices.some(n=>/Abgeschlossen: alle Rohdaten/.test(n.message)));
 change(1100);const after=sync('after');assert.equal(after.result.state,'completed');
 const file=f.ctx.salesRead_('sales_companies/1100');assert.equal(file.company.name,'Changed 1100');assert.equal(file.contacts.length,1);assert.equal(file.histories.length,2);assert.equal(file.projects.length,1);
 assert.ok(rawReads(after)*5<rawReads(before),'keyed reads must be far below the group reads');
 console.log('MEASURE r42 30 changed firms in 30 groups: raw reads before '+rawReads(before)+' / after '+rawReads(after)+'; whole sync reads '+before.readDocumentsModel+' -> '+after.readDocumentsModel+'; one-time tagging of '+raw.length+' raw records: '+sum(tag.writesByCollection,'sales_raw')+' writes, '+rawReads(tag)+' raw reads');
});
test('r42: open-job lists read open jobs and change requests only; finished jobs stay stored',()=>{
 const f=bulkFixture();const a=instrument(f),now='2026-11-24T00:00:00Z';
 // 300 finished jobs and 3 open ones saved before r42 (no activity flag yet), one finished change request.
 for(let i=0;i<300;i++)a.seed('sales_jobs/old-'+i,{id:'old-'+i,kind:'history',state:i%10?'synced':'canceled',hqId:102,history:{syncId:'sales-old-'+i},actor:'pp@markatus.de',createdAt:now,updatedAt:now});
 for(let i=0;i<3;i++)a.seed('sales_jobs/open-'+i,{id:'open-'+i,kind:'history',state:'pending',hqId:102,history:{syncId:'sales-open-'+i},actor:'pp@markatus.de',createdAt:now,updatedAt:now});
 a.seed('sales_jobs/review-1',{id:'review-1',kind:'companyChange',state:'synced',review:{status:'approved',revision:2,conversation:[]},changeReason:'Synthetic',name:'Synthetic',actor:'pp@markatus.de',createdAt:now,updatedAt:now});
 const all=Object.keys(f.fields).filter(k=>k.startsWith('sales_jobs/')).length;
 const before=a.measure('before',()=>f.ctx.salesList_('sales_jobs').filter(j=>!['synced','canceled'].includes(j.state)));assert.equal(before.readsByCollection.sales_jobs,all);
 const first=a.measure('first',()=>f.ctx.listSalesChangeReviews());assert.equal(first.readsByCollection.sales_jobs,all);assert.equal(first.writesByCollection.sales_jobs,4);assert.equal(first.result.length,1);
 const after=a.measure('after',()=>f.ctx.listSalesChangeReviews());assert.equal(after.readsByCollection.sales_jobs,4);assert.equal(after.writtenDocuments,0);assert.equal(after.result[0].id,'review-1');
 const open=a.measure('open',()=>f.ctx.salesList_('sales_jobs',{active:true}).filter(j=>!['synced','canceled'].includes(j.state)));assert.equal(open.result.map(j=>j.id).sort().join(),'open-0,open-1,open-2');assert.equal(open.readsByCollection.sales_jobs,4);
 // New and closed jobs keep the flag in step with their state; nothing is deleted.
 f.ctx.salesWrite_('sales_jobs/new-1',{id:'new-1',kind:'history',state:'pending',hqId:102,history:{}});f.ctx.salesWrite_('sales_jobs/open-0',{...f.ctx.salesRead_('sales_jobs/open-0'),state:'synced'});
 f.ctx.salesBulkRest_('commit',{writes:[{update:{name:f.ctx.salesBulkName_('sales_jobs/open-1'),fields:{payload:{stringValue:JSON.stringify({...f.ctx.salesRead_('sales_jobs/open-1'),state:'canceled'})}}}}]});
 assert.equal(f.ctx.salesList_('sales_jobs',{active:true}).filter(j=>!['synced','canceled'].includes(j.state)).map(j=>j.id).sort().join(),'new-1,open-2');
 assert.equal(Object.keys(f.fields).filter(k=>k.startsWith('sales_jobs/')).length,all+1);
 console.log('MEASURE r42 open-job list with '+all+' saved jobs: reads before '+before.readsByCollection.sales_jobs+' / after '+after.readsByCollection.sales_jobs+' (one-time flagging: '+first.writesByCollection.sales_jobs+' writes)');
});
test('r42.1: groups a sync reads anyway are tagged completely; untouched groups get at most 4,000 extra writes',()=>{
 const f=bulkFixture(),at='2026-01-01T00:00:00Z';
 for(let i=0;i<640;i++){const id=1000+i,p=5000+i;
  f.remote.Companies[id]={id,name:'Synthetic '+id,updatedOn:at};f.remote.ContactPersons[20000+i]={id:20000+i,companyId:id,firstName:'Synthetic',updatedOn:at};
  for(const h of [0,1])f.remote.ContactHistories[30000+2*i+h]={id:30000+2*i+h,companyId:id,reason:'Synthetic',content:'Synthetic',contactOn:at,contactHistoryChannel:'Note',updatedOn:at};
  f.remote.Projects[p]={id:p,companyId:id,name:'Synthetic project',number:'S'+p,status:'InProgress',updatedOn:at};
  f.remote.Documents[40000+i]={id:40000+i,companyId:id,projectId:p,number:'RE-'+i,date:'2026-01-01',currency:'EUR',documentType:'Invoice',documentStatusEntity:{documentStatusType:'Sent'},netValue:1,updatedOn:at};
 }
 f.finishBulk();const raw=Object.keys(f.fields).filter(k=>k.startsWith('sales_raw'));for(const k of raw){delete f.fields[k].companyKey;delete f.fields[k].projectKey;}
 const bulk=f.ctx.salesRead_('sales_meta/bulk');delete bulk.keyTags;f.ctx.salesWrite_('sales_meta/bulk',bulk);
 const a=instrument(f),sum=(o,prefix)=>Object.entries(o).filter(([c])=>c.startsWith(prefix)).reduce((n,[,v])=>n+v,0);
 const change=()=>{for(let i=1000;i<1030;i++){f.remote.Companies[i].name='Changed '+i+Math.random();f.remote.Companies[i].updatedOn=new Date().toISOString();}};
 const sync=()=>a.measure('sync',()=>{f.ctx.startSalesSync();f.worker();return f.ctx.salesRead_('sales_meta/sync');});
 // Like the first live r42 sync: many changed groups without keys. Every group read for the customer files is now finished.
 f.ctx.salesKeyExtraBudget_=()=>1000;change();const first=sync(),tags=f.ctx.salesRead_('sales_meta/bulk').keyTags,groups=Array.from({length:30},(_,i)=>String((1000+i)%64));
 assert.equal(first.result.state,'completed');
 for(const c of ['sales_rawcompanies','sales_rawcontacts','sales_rawhistories','sales_rawdocuments','sales_rawprojects'])assert.ok(groups.every(g=>tags.collections[c].done.includes(g)),c);
 const written=sum(first.writesByCollection,'sales_raw')-30,opportunistic=raw.filter(k=>groups.includes(f.fields[k].companyBucket?.stringValue)&&!k.startsWith('sales_rawplans')).length-30;
 assert.ok(written>=opportunistic&&written<=Math.max(opportunistic,1000+250),'extra tagging only while this sync wrote fewer than the extra cap');assert.ok(!Object.values(tags.collections).every(t=>t.complete));
 const note=first.result.notices.find(n=>n.label==='Einmalige Nachkennzeichnung der Rohdaten');assert.match(note.message,new RegExp('Gezählt: '+raw.length+' Rohdaten'));
 // The same groups change again (no extra tagging this time): now only the changed firms are read.
 f.ctx.salesKeyExtraBudget_=()=>0;change();const second=sync();assert.equal(second.result.state,'completed');assert.ok(sum(second.readsByCollection,'sales_raw')*4<sum(first.readsByCollection,'sales_raw'));
 console.log('MEASURE r42.1 first untagged sync over 30 groups: '+sum(first.readsByCollection,'sales_raw')+' raw reads, '+written+' key writes ('+opportunistic+' in groups read anyway); same groups next sync: '+sum(second.readsByCollection,'sales_raw')+' raw reads');
});
test('r42.2: project groups read anyway become keyed on their own; the extra pass is capped in reads too',()=>{
 const f=bulkFixture(),at='2026-01-01T00:00:00Z';
 for(let i=0;i<640;i++){const id=1000+i,p=5000+i;
  f.remote.Companies[id]={id,name:'Synthetic '+id,updatedOn:at};
  f.remote.Projects[p]={id:p,companyId:id,name:'Synthetic project',number:'S'+p,status:'InProgress',updatedOn:at};
  for(const k of [0,1])f.remote.Documents[40000+2*i+k]={id:40000+2*i+k,companyId:id,projectId:p,number:'RE-'+i+'-'+k,date:'2026-01-01',currency:'EUR',documentType:'Invoice',documentStatusEntity:{documentStatusType:'Sent'},netValue:1,updatedOn:at};
  for(const k of [0,1])f.remote.PlannedRevenues[60000+2*i+k]={id:60000+2*i+k,companyId:id,projectId:p,netTotal:1,currency:'EUR',startDate:'2026-12-01',estimations:[],updatedOn:at};
 }
 f.finishBulk();const raw=Object.keys(f.fields).filter(k=>k.startsWith('sales_raw'));for(const k of raw){delete f.fields[k].companyKey;delete f.fields[k].projectKey;}
 const bulk=f.ctx.salesRead_('sales_meta/bulk');delete bulk.keyTags;f.ctx.salesWrite_('sales_meta/bulk',bulk);
 const a=instrument(f),sum=(o,prefix)=>Object.entries(o).filter(([c])=>c.startsWith(prefix)).reduce((n,[,v])=>n+v,0);
 // Planned revenues change in 30 project groups (the case that never became keyed in r42.1).
 const change=()=>{for(let i=0;i<30;i++){const r=f.remote.PlannedRevenues[60000+2*i];r.netTotal++;r.updatedOn=new Date().toISOString();}};
 const sync=()=>a.measure('sync',()=>{f.ctx.startSalesSync();f.worker();return f.ctx.salesRead_('sales_meta/sync');});
 const extra=f.ctx.salesKeyExtraBudget_;f.ctx.salesKeyExtraBudget_=()=>300;
 change();const first=sync(),tags=f.ctx.salesRead_('sales_meta/bulk').keyTags,groups=Array.from({length:30},(_,i)=>String((5000+i)%64));
 assert.equal(first.result.state,'completed');
 for(const c of ['sales_rawprojects','sales_rawdocuments','sales_rawplans'])assert.ok(groups.every(g=>(tags.collections[c].pdone||[]).includes(g)),c);
 assert.ok(!tags.collections.sales_rawplans.complete,'plans are not complete, yet their project groups are keyed');
 f.ctx.salesKeyExtraBudget_=()=>0;change();const second=sync();assert.equal(second.result.state,'completed');
 const projectReads=m=>sum(m.readsByCollection,'sales_rawprojects')+sum(m.readsByCollection,'sales_rawdocuments')+sum(m.readsByCollection,'sales_rawplans');
 assert.ok(projectReads(second)*4<projectReads(first),'project groups are read by key the second time');
 f.ctx.salesKeyExtraBudget_=extra;
 console.log('MEASURE r42.2 planned revenues changed in 30 project groups: project raw reads first '+projectReads(first)+' / next sync '+projectReads(second));
});
test('r42.2: extra tagging reads stop at the cap even when the groups need no writes any more',()=>{
 const f=bulkFixture(),at='2026-01-01T00:00:00Z';
 for(let i=0;i<640;i++){const id=1000+i;f.remote.Companies[id]={id,name:'Synthetic '+id,updatedOn:at};f.remote.ContactPersons[20000+i]={id:20000+i,companyId:id,firstName:'Synthetic',updatedOn:at};}
 f.finishBulk();
 // Every record already carries keys, but no group is recorded as done (as after a lost progress note).
 const bulk=f.ctx.salesRead_('sales_meta/bulk');bulk.keyTags={version:1,written:0,collections:{}};f.ctx.salesWrite_('sales_meta/bulk',bulk);
 const a=instrument(f),sum=(o,prefix)=>Object.entries(o).filter(([c])=>c.startsWith(prefix)).reduce((n,[,v])=>n+v,0);
 const extra=f.ctx.salesKeyExtraBudget_;f.ctx.salesKeyExtraBudget_=()=>200;
 const m=a.measure('sync',()=>{f.ctx.startSalesSync();f.worker();return f.ctx.salesRead_('sales_meta/sync');});f.ctx.salesKeyExtraBudget_=extra;
 assert.equal(m.result.state,'completed');assert.equal(sum(m.writesByCollection,'sales_raw'),0);
 assert.ok(sum(m.readsByCollection,'sales_raw')<200+120,'extra reads capped near 200 (plus at most one group and the probes)');
});
console.log(count+' performance and inventory tests passed.');
