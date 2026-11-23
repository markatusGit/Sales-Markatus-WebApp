const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function productionFixture(){
  const prior=fs.readFileSync(__dirname+'/test-sales.cjs','utf8'),scope={require,__dirname,console,Buffer,URL};
  vm.runInNewContext(prior.slice(0,prior.indexOf("test('all public RPCs"))+'globalThis.f=fixture();globalThis.finish=finishCreate;',scope);
  const f=scope.f,r=f.ctx.saveSalesCompany({...f.input,name:'Synthetic production customer'});scope.finish(f,r.id);
  // Simulate an imported ordinary customer, with no app creation provenance.
  for(const key of Object.keys(f.db))if(/^sales_(drafts|jobs)\//.test(key))delete f.db[key];
  f.db['sales_directory/101']={company:f.db['sales_companies/101'].company,contacts:f.db['sales_companies/101'].contacts};
  vm.runInContext(['SalesV1.gs','SalesSync.gs','SalesLean.gs'].map(p=>fs.readFileSync(__dirname+'/'+p,'utf8')).join('\n'),f.ctx);
  f.db['sales_companies/101'].company=JSON.parse(JSON.stringify(f.remote.Companies[101]));return f;
}
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name);}
function approveReview(f,id){
  const job=f.db['sales_jobs/'+id];
  if(job.state==='awaitingApproval')f.ctx.respondSalesChangeReview({id,revision:job.review.revision,decision:'approve',note:'Synthetic approval reason'});
}
function saveForTest(f,input){
  const result=f.ctx.saveSalesEntityChange({changeReason:'Synthetic edit reason',...input});
  for(const job of result.patch?.jobs||[result.patch?.job].filter(Boolean))approveReview(f,job.id);
  return result;
}
function edit(f,entity,change,targetId=entity==='contact'?202:entity==='address'?501:101){
  const model=f.ctx.getSalesEditor({companyId:101,entity,targetId});return saveForTest(f,{companyId:101,entity,targetId,base:model.base,change});
}
function customerFixture(){
 const f=productionFixture(),cat=f.db['sales_meta/catalog'];cat.fields=[{name:'Erstelldatum',type:'Date',options:[]},{name:'Kundenherkunft',type:'DropdownCheckbox',options:['Synthetic source','Synthetic extra source']},{name:'Grund der Adressanlage',type:'DropdownCheckbox',options:['Synthetic reason','Synthetic extra reason']}];cat.users.push({id:8,name:'Synthetic responsible'});cat.subsystems=[{id:4,name:'Markatus'},{id:5,name:'Synthetic subsystem'}];
 Object.assign(f.remote.Companies[101],{updatedOn:new Date().toISOString(),customFields:[{name:'Erstelldatum',type:'Date',value:'2025-01-02T00:00:00Z'},{name:'Kundenherkunft',type:'DropdownCheckbox',value:['Synthetic source']},{name:'Unshown field',type:'Text',value:'Keep'}],iban:'synthetic-iban'});
 const legacy=()=>{const c=f.remote.Companies[101];return {Id:101,Name:c.name,IndustrialSector:c.industrialSector,Description:c.description,IBAN:c.iban,BIC:null,DebitorNumber:null,CreditorNumber:null,TaxId:c.vatId||null,DefaultDeliveryConditionId:null,DefaultPaymentConditionId:null,DefaultAddress:{Id:c.defaultAddress.id,City:c.defaultAddress.city},Addresses:[],CompanyTypes:c.companyTypes,CustomFields:c.customFields,Files:[],ResponsibleUsers:c.responsibleUsers.map(u=>({Id:u.userId||u.id})),Subsystems:c.subsystems.map(s=>({Id:s.id}))};};
 const get=f.ctx.salesHqGet_;f.ctx.salesHqGet_=path=>{
  if(path.startsWith('/v1/Companies(')){f.calls.push({method:'get',path});return {data:legacy(),headers:{}};}
  if(path.startsWith('/v1/CustomFieldDefinitions?'))return {data:cat.fields.filter(x=>x.name==='Grund der Adressanlage').map((x,i)=>({Id:i+1,Name:x.name,Category:'Company',Options:x.options.map((OptionValue,i)=>({Id:i+10,OptionValue}))})),headers:{}};
  if(path.startsWith('/v2/Companies/CustomFieldDefinitions?')){f.calls.push({method:'get',path});return {data:cat.fields,headers:{}};}
  for(const [entity,key] of [['CompanyTypes','types'],['Subsystems','subsystems'],['Users','users']])if(path.startsWith('/v2/'+entity+'?')){const rows=cat[key].map(x=>entity==='Users'?{id:x.id,firstName:x.name,lastName:'',isDeactivated:false}:x);return {data:rows,headers:{'helloHQ-Count':rows.length}};}
  return get(path);
 };
 const fetch=f.ctx.UrlFetchApp.fetch;f.ctx.UrlFetchApp.fetch=(url,options)=>{if(url==='https://api.hellohq.io/v2/Companies/101/UpdateCompanyTypes'&&options.method==='post'){const body=JSON.parse(options.payload);f.calls.push({method:'post',path:'/v2/Companies/101/UpdateCompanyTypes',body});f.remote.Companies[101].companyTypes=body;return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(body)};}if(url==='https://api.hellohq.io/v1/Companies(101)'&&options.method==='put'){
  const body=JSON.parse(options.payload),before=legacy();for(const key of Object.keys(before).filter(k=>!['ResponsibleUsers','Subsystems'].includes(k)))assert.equal(JSON.stringify(body[key]),JSON.stringify(before[key]),key+' preserved');f.calls.push({method:'put',path:'/v1/Companies(101)',body});
  f.remote.Companies[101].responsibleUsers=body.ResponsibleUsers.map(u=>({userId:u.Id}));f.remote.Companies[101].subsystems=body.Subsystems.map(s=>({id:s.Id}));return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(legacy())};
 }return fetch(url,options);};f.db['sales_companies/101'].company=JSON.parse(JSON.stringify(f.remote.Companies[101]));return f;
}
if(require.main===module){
test('only app creation sets Medienhaus and both edit paths preserve existing or absent origin',()=>{
 for(const type of ['DropdownCheckbox','Dropdown','Text']){const f=customerFixture();f.db['sales_meta/catalog'].fields.find(x=>x.name==='Kundenherkunft').type=type;const r=f.ctx.saveSalesCompany({...f.input,Kundenherkunft:'tampered client value'}),field=f.db['sales_drafts/'+r.id].company.customFields.find(x=>x.name==='Kundenherkunft');assert.equal(field.type,type);assert.equal(JSON.stringify(field.value),JSON.stringify(type==='DropdownCheckbox'?['Medienhaus']:'Medienhaus'));}
 for(const absent of [false,true]){const f=customerFixture();if(absent){f.remote.Companies[101].customFields=f.remote.Companies[101].customFields.filter(x=>x.name!=='Kundenherkunft');f.db['sales_companies/101'].company=JSON.parse(JSON.stringify(f.remote.Companies[101]));}const before=JSON.stringify(f.remote.Companies[101].customFields.filter(x=>x.name==='Kundenherkunft')),m=f.ctx.getSalesEditor({entity:'customer',companyId:101}),r=saveForTest(f,{...m,requestId:'origin-edit-preserved',change:{...m.base,name:'Synthetic preserved customer',erstelldatum:'2026-11-23',Kundenherkunft:'["tampered"]'}});for(const j of r.patch.jobs)f.ctx.salesSyncWrite_({id:j.id});assert.equal(JSON.stringify(f.remote.Companies[101].customFields.filter(x=>x.name==='Kundenherkunft')),before);assert.throws(()=>edit(f,'company',{customFields:[...f.remote.Companies[101].customFields.filter(x=>x.name!=='Kundenherkunft'),{name:'Kundenherkunft',type:'DropdownCheckbox',value:['Medienhaus']}]}),/unverändert/);}
 const f=customerFixture();f.db['sales_meta/catalog'].fields=f.db['sales_meta/catalog'].fields.filter(x=>x.name!=='Kundenherkunft');const before=JSON.stringify(f.db);assert.throws(()=>f.ctx.saveSalesCompany(f.input),/Kundenherkunft.*bestätigt/);assert.equal(JSON.stringify(f.db),before);
});
test('Grund der Adressanlage uses the exact HQ field and options while retaining unrelated custom fields',()=>{
 const f=customerFixture(),r=f.ctx.saveSalesCompany({...f.input,addressCreationReason:'Synthetic reason'}),created=f.db['sales_drafts/'+r.id].company.customFields;assert.equal(created.find(x=>x.name==='Grund der Adressanlage').value[0],'Synthetic reason');assert.equal(created.some(x=>x.name==='Adressherkunft'),false);
 const m=f.ctx.getSalesEditor({entity:'customer',companyId:101});assert.throws(()=>saveForTest(f,{...m,requestId:'reason-unknown-value',change:{...m.base,addressCreationReason:'Invented reason'}}),/bestätigter HQ-Auswahlwert/);
 const saved=saveForTest(f,{...m,requestId:'reason-customer-edit',change:{...m.base,addressCreationReason:'Synthetic extra reason'}});f.ctx.salesSyncWrite_({id:saved.id});assert.equal(f.remote.Companies[101].customFields.find(x=>x.name==='Grund der Adressanlage').value[0],'Synthetic extra reason');assert.equal(f.remote.Companies[101].customFields.find(x=>x.name==='Kundenherkunft').value[0],'Synthetic source');assert.equal(f.remote.Companies[101].customFields.find(x=>x.name==='Unshown field').value,'Keep');
 const next=f.ctx.getSalesEditor({entity:'customer',companyId:101});assert.equal(next.base.addressCreationReason,'Synthetic extra reason');const clear=saveForTest(f,{...next,requestId:'reason-customer-clear',change:{...next.base,addressCreationReason:''}});f.ctx.salesSyncWrite_({id:clear.id});assert.equal(f.remote.Companies[101].customFields.find(x=>x.name==='Grund der Adressanlage').value,null);
});
test('fixed origin requires no legacy options call and reason option failure retains the previous usable options',()=>{
 const f=customerFixture(),get=f.ctx.salesHqGet_,paths=[];f.db['sales_meta/catalog'].fields=f.db['sales_meta/catalog'].fields.filter(x=>x.name!=='Grund der Adressanlage');f.ctx.salesHqGet_=p=>{paths.push(p);if(p.startsWith('/v1/CustomFieldDefinitions'))throw Error('old broad request forbidden');return get(p);};const run={errors:[]};f.ctx.salesSyncCatalog_(run,{});assert.equal(run.errors.length,0);assert.equal(paths.some(p=>p.startsWith('/v1/CustomFieldDefinitions')),false);assert.equal(f.ctx.salesCompanyNewOrigin_(f.db['sales_meta/catalog']).value[0],'Medienhaus');
});
test('central catalog sync updates imported industries and preserves source options on legacy HQ failure',()=>{
 const f=customerFixture(),run={errors:[],catalogIndustries:['Synthetic imported branch']};assert.equal(f.ctx.salesSyncCatalog_(run,{id:'lists'}),true);assert.equal(run.errors.length,0);assert.equal(f.db['sales_meta/catalog'].industries.includes('Synthetic imported branch'),true);
 const get=f.ctx.salesHqGet_;f.ctx.salesHqGet_=p=>{if(p.startsWith('/v1/CustomFieldDefinitions'))throw Error('HTTP 500 synthetic');return get(p);};f.ctx.salesSyncCatalog_(run,{id:'lists'});assert.equal(run.errors.length,1);assert.match(run.errors[0].message,/CustomFieldDefinitions.*HTTP 500/);assert.equal(f.db['sales_meta/catalog'].fields.find(f=>f.name==='Kundenherkunft').options[0],'Synthetic source');assert.match(run.errors[0].label,/Grund der Adressanlage/);
});
test('normal creation, all editors, catalog reload and customer saving make zero HQ calls even with an expired catalog',()=>{
 const f=customerFixture();f.db['sales_meta/catalog'].customerFormCheckedAt='2000-01-01';const n=f.calls.length;
 f.ctx.salesHqGet_=()=>{throw Error('HQ forbidden outside sync');};f.ctx.salesOne_=()=>{throw Error('HQ forbidden outside sync');};
 f.ctx.getSalesLeanView('new');f.ctx.getSalesEditor({entity:'catalog',force:true});
 for(const [entity,targetId] of [['company',101],['types',101],['address',501],['contact',202]])f.ctx.getSalesEditor({companyId:101,entity,targetId});
 const m=f.ctx.getSalesEditor({entity:'customer',companyId:101});saveForTest(f,{...m,requestId:'firebase-only-form',change:{...m.base,name:'Synthetic Firebase only'}});f.ctx.saveSalesCompany({...f.input,name:'Synthetic Firebase creation'});assert.equal(f.calls.length,n);
});
test('HQ conflicts are detected during sync after a Firebase-only common form save, preserving unrelated HQ fields',()=>{
 const f=customerFixture(),m=f.ctx.getSalesEditor({entity:'customer',companyId:101});f.remote.Companies[101].name='Synthetic concurrent HQ';const r=saveForTest(f,{...m,requestId:'delayed-hq-conflict',change:{...m.base,name:'Synthetic app'}});assert.equal(f.ctx.runSalesJob(r.id).state,'canceled');assert.equal(f.remote.Companies[101].name,'Synthetic concurrent HQ');assert.equal(f.db['sales_companies/101'].company.name,'Synthetic concurrent HQ');
});
test('HQ metadata HTTP500 preserves the last catalog and keeps both customer forms available',()=>{
 const f=customerFixture(),before=JSON.stringify(f.db['sales_meta/catalog']),get=f.ctx.salesHqGet_;delete f.db['sales_meta/catalog'].customerFormCheckedAt;const saved=JSON.stringify(f.db['sales_meta/catalog']);f.ctx.salesHqGet_=path=>{if(path.startsWith('/v1/CustomFieldDefinitions'))throw Error('HQ-Lesetest: HTTP 500');return get(path);};
 for(const model of [f.ctx.getSalesLeanView('new'),f.ctx.getSalesEditor({entity:'customer',companyId:101})]){assert.equal(model.catalog.customerFormWarning,undefined);assert.equal(model.catalog.types.length>0,true);}assert.equal(JSON.stringify(f.db['sales_meta/catalog']),saved);
 delete f.db['sales_meta/catalog'].types;assert.throws(()=>f.ctx.salesCustomerSyncCatalog_(),/HTTP 500/);
});
test('common customer form saves all documented fields atomically and transfers changed sections without losing hidden data',()=>{
 const f=customerFixture(),m=f.ctx.getSalesEditor({entity:'customer',companyId:101}),values={...m.base,name:'Synthetic common customer',industrialSector:'Synthetic new sector',newIndustry:'true',companyTypeId:'3',subsystemId:'5',responsibleUserId:'8',city:'Synthetic new city',erstelldatum:'2026-11-18',Kundenherkunft:JSON.stringify(['Synthetic extra source'])},writes=f.calls.filter(c=>c.method!=='get').length,input={...m,requestId:'common-customer-request',change:values};
 const r=saveForTest(f,input);saveForTest(f,input);assert.equal(f.calls.filter(c=>c.method!=='get').length,writes);assert.equal(r.patch.jobs.length,4);assert.equal(Object.values(f.db).filter(j=>j.formSignature).length,1);assert.equal(f.ctx.getSalesLeanCompany(101).company.name,m.base.name);assert.equal(f.db['sales_meta/catalog'].industries.includes(values.industrialSector),true);
 const n=f.calls.length;f.ctx.salesSyncWrite_({id:r.patch.jobs.at(-1).id});assert.equal(f.calls.length,n);assert.equal(JSON.stringify(f.ctx.salesCommunicationOrder_(r.patch.jobs.map(j=>f.db['sales_jobs/'+j.id]).reverse()).map(j=>j.id)),JSON.stringify(r.patch.jobs.map(j=>j.id)));
 for(const j of r.patch.jobs)f.ctx.salesSyncWrite_({id:j.id});assert.equal(f.remote.Companies[101].name,values.name);assert.equal(f.remote.Companies[101].industrialSector,values.industrialSector);assert.equal(f.remote.Companies[101].defaultAddress.city,values.city);assert.equal(f.remote.Companies[101].responsibleUsers[0].userId,8);assert.equal(f.remote.Companies[101].subsystems[0].id,5);assert.equal(f.remote.Companies[101].iban,'synthetic-iban');assert.equal(f.remote.Companies[101].customFields.find(x=>x.name==='Unshown field').value,'Keep');assert.equal(f.db['sales_companies/101'].pendingChanges.length,0);
});
test('common form preserves original creation intent after an HQ attempt and carries all fields in an unsent draft',()=>{
 for(const deferred of [false,true]){const f=customerFixture(),r=f.ctx.saveSalesCompany(f.input),ref='draft_'+r.id;if(deferred){Object.assign(f.db['sales_jobs/'+r.id],{state:'uncertain',writeAttempted:true,hqId:101});f.db['sales_drafts/'+r.id].hqId=101;}
  const before=JSON.stringify(f.db['sales_jobs/'+r.id]),original=JSON.stringify(f.db['sales_drafts/'+r.id].company),m=f.ctx.getSalesEditor({entity:'customer',companyId:ref}),input={...m,requestId:'common-draft-request',change:{...m.base,name:'Synthetic form draft',subsystemId:'5',responsibleUserId:'8',companyTypeId:'3',city:'Synthetic form city',erstelldatum:'2026-11-18',Kundenherkunft:'["Synthetic source"]'}};
  saveForTest(f,input);saveForTest(f,input);const d=f.db['sales_drafts/'+r.id];assert.equal(d.revision,1);assert.equal(f.ctx.getSalesLeanCompany(ref).company.name,deferred?m.base.name:'Synthetic form draft');
  if(deferred){assert.equal(JSON.stringify(f.db['sales_jobs/'+r.id]),before);assert.equal(JSON.stringify(d.company),original);assert.equal(d.pendingChanges.length,4);}else{assert.equal(d.company.subsystemIds[0],5);assert.equal(d.company.responsibleUserIds[0],8);assert.equal(d.company.defaultAddress.city,'Synthetic form city');for(let n=0;n<4&&f.db['sales_jobs/'+r.id].state!=='synced';n++)f.ctx.runSalesJob(r.id,f.db['sales_jobs/'+r.id].companyConfirmedAt?'contact':'company');assert.equal(f.db['sales_jobs/'+r.id].state,'synced',f.db['sales_jobs/'+r.id].message);assert.equal(f.remote.Companies[101].subsystems[0].id,5);assert.equal(f.remote.Companies[101].responsibleUsers[0].userId,8);}
 }
});
test('catalog refresh loads only required definitions and reason options, with no additional company import',()=>{
 const f=customerFixture(),get=f.ctx.salesHqGet_,paths=[];f.ctx.salesHqGet_=p=>{paths.push(p);return get(p);};const r=f.ctx.salesCustomerSyncCatalog_();assert.equal(r.fields.find(x=>x.name==='Grund der Adressanlage').options[0],'Synthetic reason');assert.equal(paths.some(p=>p.startsWith('/v2/Companies?')),false);assert.equal(paths.some(p=>p==='/v1/CustomFieldDefinitions?$expand=Options'),false);
 const definition=new URL('https://hq'+paths.find(p=>p.startsWith('/v2/Companies/CustomFieldDefinitions?')));assert.match(definition.searchParams.get('$filter'),/Grund der Adressanlage/);assert.doesNotMatch(definition.searchParams.get('$filter'),/Adressherkunft/);
 const options=new URL('https://hq'+paths.find(p=>p.startsWith('/v1/CustomFieldDefinitions?')));assert.equal(options.searchParams.get('$filter'),"Category eq 'Company' and Name eq 'Grund der Adressanlage'");assert.equal(options.searchParams.get('$select'),'Name,Category,Options');assert.equal(options.searchParams.get('$top'),'2');
 const before=JSON.stringify(f.db['sales_meta/catalog']);f.ctx.salesHqGet_=p=>{if(p.startsWith('/v2/Companies/CustomFieldDefinitions?'))throw Error('Synthetic rejected filter');return get(p);};assert.match(f.ctx.salesCustomerSyncCatalog_().customerFormWarning,/rejected filter/);assert.equal(JSON.stringify(f.db['sales_meta/catalog']),before);
});
test('common form rejects fabricated HQ selections, extra fields, stale values and rolls a failed multi-job save back',()=>{
 const f=customerFixture(),m=f.ctx.getSalesEditor({entity:'customer',companyId:101});for(const change of [{...m.base,subsystemId:'999'},{...m.base,iban:'forbidden'},{...m.base,industrialSector:'Unknown'}])assert.throws(()=>saveForTest(f,{...m,requestId:'common-invalid-request',change}));
 const input={...m,requestId:'common-atomic-request',change:{...m.base,name:'Synthetic atomic',city:'Synthetic atomic city'}};const original=JSON.stringify(f.db),commit=f.ctx.salesBulkRest_;f.ctx.salesBulkRest_=()=>{throw Error('Synthetic atomic failure');};assert.throws(()=>saveForTest(f,input),/atomic failure/);assert.equal(JSON.stringify(f.db),original);f.ctx.salesBulkRest_=commit;f.db['sales_companies/101'].company.name='Concurrent Firebase';assert.throws(()=>saveForTest(f,input),/inzwischen/);
});
test('a lost HQ assignment response is confirmed by readback without a second write, and incomplete legacy reads never write',()=>{
 const f=customerFixture(),m=f.ctx.getSalesEditor({entity:'customer',companyId:101}),r=saveForTest(f,{...m,requestId:'assignment-lost-request',change:{...m.base,responsibleUserId:'8'}}),fetch=f.ctx.UrlFetchApp.fetch;
 f.ctx.UrlFetchApp.fetch=(url,options)=>{const result=fetch(url,options);if(url.endsWith('/v1/Companies(101)')&&options.method==='put')throw Error('Synthetic assignment response lost');return result;};assert.equal(f.ctx.runSalesJob(r.id).state,'uncertain');assert.equal(f.ctx.reconcileSalesJob(r.id).state,'synced');assert.equal(f.calls.filter(c=>c.path==='/v1/Companies(101)'&&c.method==='put').length,1);
 const g=customerFixture(),model=g.ctx.getSalesEditor({entity:'customer',companyId:101}),change=saveForTest(g,{...model,requestId:'assignment-incomplete-request',change:{...model.base,responsibleUserId:'8'}}),get=g.ctx.salesHqGet_,n=g.calls.filter(c=>c.method!=='get').length;
 g.ctx.salesHqGet_=path=>{const result=get(path);if(path.startsWith('/v1/Companies('))delete result.data.IBAN;return result;};assert.throws(()=>g.ctx.salesSyncWrite_({id:change.id}),/vollständig/);assert.equal(g.calls.filter(c=>c.method!=='get').length,n);
});
test('selection paging follows actual row counts, tolerates a global filtered count and rejects duplicates',()=>{
 const f=customerFixture(),skips=[];f.ctx.salesHqGet_=path=>{const skip=Number(new URL('https://hq'+path).searchParams.get('$skip'));skips.push(skip);return {data:skip===0?[{id:1},{id:2}]:[{id:3}],headers:{'helloHQ-Count':3}};};assert.equal(f.ctx.salesCustomerList_('Users','',Date.now()).length,3);assert.deepEqual(skips,[0,2]);
 f.ctx.salesHqGet_=path=>({data:path.includes('$skip=0')?[{id:1}]:[],headers:{'helloHQ-Count':100}});assert.equal(f.ctx.salesCustomerList_('Companies','updatedOn ge 2026-11-18T00:00:00Z',Date.now()).length,1);
 f.ctx.salesHqGet_=()=>({data:[{id:1}],headers:{'helloHQ-Count':100}});assert.throws(()=>f.ctx.salesCustomerList_('Users','',Date.now()),/doppelte/);
});
test('assignment readback keeps the original guard across reconciliation and cannot confirm unrelated changes',()=>{
 const f=customerFixture(),m=f.ctx.getSalesEditor({entity:'customer',companyId:101}),r=saveForTest(f,{...m,requestId:'assignment-guard-request',change:{...m.base,responsibleUserId:'8'}}),fetch=f.ctx.UrlFetchApp.fetch,before=f.remote.Companies[101].description;
 f.ctx.UrlFetchApp.fetch=(url,options)=>{const result=fetch(url,options);if(url.endsWith('/v1/Companies(101)')&&options.method==='put')f.remote.Companies[101].description='Synthetic unexpected replacement';return result;};assert.equal(f.ctx.runSalesJob(r.id).state,'uncertain');assert.throws(()=>f.ctx.reconcileSalesJob(r.id),/weitere Firmenwerte/);assert.equal(f.db['sales_jobs/'+r.id].state,'uncertain');f.remote.Companies[101].description=before;assert.equal(f.ctx.reconcileSalesJob(r.id).state,'synced');assert.equal(f.calls.filter(c=>c.path==='/v1/Companies(101)'&&c.method==='put').length,1);
});
test('unsent app customer edits update one creation intent, survive reload and reach HQ once',()=>{
 const f=productionFixture(),r=f.ctx.saveSalesCompany({...f.input,name:'Synthetic editable draft'}),ref='draft_'+r.id,n=f.calls.length;
 f.ctx.getSalesLeanView('customers');
 const save=(entity,change)=>{const targetId=['company','types'].includes(entity)?ref:ref+'_'+entity,model=f.ctx.getSalesEditor({companyId:ref,entity,targetId});return saveForTest(f,{...model,change,requestId:'edit-request-'+entity});};
 save('company',{name:'Synthetic updated draft',homepage:'https://synthetic.invalid',vatId:'synthetic-vat'});
  save('address',{city:'Synthetic updated city',phone:'synthetic-phone'});save('contact',{phoneMobile:'synthetic-mobile',note:'Synthetic note'});save('types',{companyTypes:[{companyTypeId:3,number:'synthetic-number'},{companyTypeId:2}]});
 assert.equal(f.calls.length,n,'edit and reload use no HQ');assert.equal(Object.values(f.db).filter(j=>j.kind==='createCompany').length,1);assert.equal(Object.values(f.db).filter(j=>j.kind==='entityChange').length,0);
  assert.equal(f.ctx.getSalesLeanCompany(ref).company.name,'Synthetic updated draft');assert.equal(f.ctx.getSalesLeanCompany(ref).company.companyTypes[0].name,'Kunde');assert.equal(f.ctx.getSalesLeanView('customers').companies.find(c=>c.id===ref).name,'Synthetic updated draft');
 for(let i=0;i<4&&f.db['sales_jobs/'+r.id].state!=='synced';i++)f.ctx.runSalesJob(r.id,f.db['sales_jobs/'+r.id].companyConfirmedAt?'contact':'company');
  assert.equal(f.db['sales_jobs/'+r.id].state,'synced',f.db['sales_jobs/'+r.id].message);assert.equal(f.calls.slice(n).filter(c=>c.method==='post'&&c.path==='/v2/Companies').length,1);
  assert.equal(f.remote.Companies[101].vatId,'synthetic-vat');assert.equal(f.remote.Companies[101].defaultAddress.phone,'synthetic-phone');assert.equal(f.remote.ContactPersons[202].note,'Synthetic note');assert.equal(f.remote.Companies[101].companyTypes.length,2);assert.equal(f.remote.Companies[101].companyTypes[0].number,'synthetic-number');
});
test('draft revision, foreign target, first-write guard and atomic failure protect original intent',()=>{
 const f=productionFixture(),r=f.ctx.saveSalesCompany(f.input),ref='draft_'+r.id,model=f.ctx.getSalesEditor({companyId:ref,entity:'company',targetId:ref}),input={...model,requestId:'edit-request-atomic',change:{name:'Synthetic changed'}};
 const original=JSON.stringify(f.db['sales_drafts/'+r.id]),commit=f.ctx.salesBulkRest_;f.ctx.salesBulkRest_=()=>{throw Error('Synthetic commit failed');};assert.throws(()=>saveForTest(f,input),/commit failed/);assert.equal(JSON.stringify(f.db['sales_drafts/'+r.id]),original);f.ctx.salesBulkRest_=commit;
 saveForTest(f,input);saveForTest(f,input);assert.equal(f.db['sales_drafts/'+r.id].revision,1);
 assert.throws(()=>saveForTest(f,{...input,requestId:'different-request',change:{name:'Stale'}}),/inzwischen/);
 assert.throws(()=>f.ctx.getSalesEditor({companyId:ref,entity:'contact',targetId:'draft_foreign_contact'}),/gehört/);
 for(const state of ['running','uncertain','companyCreated']){f.db['sales_jobs/'+r.id].state=state;assert.equal(f.ctx.getSalesEditor(model).deferred,true);}
 f.db['sales_jobs/'+r.id].state='synced';assert.throws(()=>f.ctx.getSalesEditor(model),/geändert/);
 f.db['sales_jobs/'+r.id].state='pending';f.db['sales_jobs/'+r.id].writeAttempted=true;const before=JSON.stringify(f.db['sales_jobs/'+r.id]);saveForTest(f,{...input,revision:1,requestId:'new-request'});assert.equal(JSON.stringify(f.db['sales_jobs/'+r.id]),before);assert.equal(f.db['sales_drafts/'+r.id].company.name,'Synthetic changed');
});
test('partially transferred customer accepts deferred edits without changing creation, then writes only after completion',()=>{
 const f=productionFixture(),r=f.ctx.saveSalesCompany(f.input),ref='draft_'+r.id;f.ctx.getSalesLeanView('customers');f.ctx.runSalesJob(r.id,'company');
 const parent=JSON.stringify(f.db['sales_jobs/'+r.id]),original=JSON.stringify(f.db['sales_drafts/'+r.id].company),m=f.ctx.getSalesEditor({companyId:ref,entity:'company',targetId:ref}),input={...m,requestId:'deferred-company-edit',change:{name:'Synthetic deferred name'}},n=f.calls.length;
 assert.equal(m.deferred,true);const saved=saveForTest(f,input);saveForTest(f,input);assert.equal(f.calls.length,n);assert.equal(JSON.stringify(f.db['sales_jobs/'+r.id]),parent);assert.equal(JSON.stringify(f.db['sales_drafts/'+r.id].company),original);assert.equal(f.ctx.getSalesLeanCompany(ref).company.name,f.input.name);assert.equal(f.db['sales_drafts/'+r.id].pendingChanges.length,1);
 f.ctx.salesSyncWrite_({id:saved.id});assert.equal(f.calls.length,n);assert.equal(f.db['sales_jobs/'+saved.id].state,'pending');assert.throws(()=>f.ctx.getSalesEditor(m),/vorgemerkt/);
 f.ctx.runSalesJob(r.id,'contact');assert.equal(f.db['sales_jobs/'+r.id].state,'synced');const completedParent=JSON.stringify(f.db['sales_jobs/'+r.id]);assert.equal(f.remote.Companies[101].name,f.input.name);assert.equal(f.ctx.getSalesLeanCompany(ref).company.name,f.input.name);
 const posts=f.calls.filter(c=>c.method==='post').length;f.ctx.salesSyncWrite_({id:saved.id});assert.equal(f.db['sales_jobs/'+saved.id].state,'synced');assert.equal(f.remote.Companies[101].name,'Synthetic deferred name');assert.equal(f.calls.filter(c=>c.method==='post').length,posts);assert.equal(f.db['sales_drafts/'+r.id].pendingChanges.length,0);assert.equal(JSON.stringify(f.db['sales_jobs/'+r.id]),completedParent);assert.equal(f.ctx.getSalesLeanView('customers').companies.find(c=>c.id===ref).name,'Synthetic deferred name');
});
test('deferred contact/address edits preserve target ownership and can keep HQ values on conflict',()=>{
 const f=productionFixture(),r=f.ctx.saveSalesCompany(f.input),ref='draft_'+r.id;f.ctx.runSalesJob(r.id,'company');
 const save=(entity,change)=>{const m=f.ctx.getSalesEditor({companyId:ref,entity,targetId:ref+'_'+entity});return saveForTest(f,{...m,change,requestId:'deferred-'+entity+'-request'});};
 const c=save('contact',{phoneMobile:'synthetic-deferred-mobile'}),a=save('address',{city:'Synthetic deferred city'});f.ctx.runSalesJob(r.id,'contact');assert.equal(f.db['sales_jobs/'+r.id].state,'synced');f.remote.Companies[101].defaultAddress.city='Concurrent HQ city';
 f.ctx.salesSyncWrite_({id:c.id});assert.equal(f.remote.ContactPersons[202].phoneMobile,'synthetic-deferred-mobile');f.ctx.salesSyncWrite_({id:a.id});assert.equal(f.db['sales_jobs/'+a.id].state,'canceled');assert.equal(f.db['sales_drafts/'+r.id].pendingChanges.length,0);assert.equal(f.ctx.getSalesLeanCompany(ref).company.defaultAddress.city,'Concurrent HQ city');
});
test('unclear creation stays byte-identical while deferred edits wait, including interrupted read-only reconciliation',()=>{
 const f=productionFixture(),r=f.ctx.saveSalesCompany(f.input),ref='draft_'+r.id;f.db['sales_jobs/'+r.id].state='uncertain';f.db['sales_jobs/'+r.id].writeAttempted=true;
 const parent=JSON.stringify(f.db['sales_jobs/'+r.id]),m=f.ctx.getSalesEditor({companyId:ref,entity:'company',targetId:ref}),saved=saveForTest(f,{...m,requestId:'uncertain-deferred-request',change:{description:'Synthetic pending description'}}),n=f.calls.length;
 f.ctx.salesSyncWrite_({id:saved.id});assert.equal(f.calls.length,n);assert.equal(JSON.stringify(f.db['sales_jobs/'+r.id]),parent);f.db['sales_jobs/'+saved.id].state='running';assert.throws(()=>f.ctx.reconcileSalesJob(saved.id),/ursprüngliche Anlage/);assert.notEqual(f.db['sales_jobs/'+saved.id].state,'synced');
});
test('own HQ field editors never refresh metadata and new customers use only the fixed origin',()=>{
 const f=productionFixture(),get=f.ctx.salesHqGet_;delete f.db['sales_meta/catalog'].companyFieldsVersion;let definitions=0;f.ctx.salesHqGet_=path=>path==='/v2/Companies/CustomFieldDefinitions'?(definitions++,{data:[{name:'Erstelldatum',type:'Date'},{name:'Kundenherkunft',type:'DropdownCheckbox'},{name:'Unrelated field',type:'Text'}]}):get(path);
 const catalog=f.ctx.salesCompanyCustomCatalog_(f.db['sales_meta/catalog']);f.ctx.salesCompanyCustomCatalog_(f.db['sales_meta/catalog']);assert.equal(definitions,0);assert.equal(catalog.fields.length,1);catalog.fields.push({name:'Erstelldatum',type:'Date'});f.db['sales_meta/catalog']=catalog;
 const r=f.ctx.saveSalesCompany({...f.input,erstelldatum:'2026-11-18',Kundenherkunft:'Synthetic origin\nSynthetic second origin\nSynthetic origin'}),fields=f.db['sales_drafts/'+r.id].company.customFields;
 assert.equal(fields[0].name,'Kundenherkunft');assert.deepEqual(Array.from(fields[0].value),['Medienhaus']);assert.equal(fields[1].name,'Erstelldatum');assert.equal(fields[1].value,'2026-11-18T00:00:00Z');assert.throws(()=>f.ctx.saveSalesCompany({...f.input,erstelldatum:'2026-02-30'}),/gültiges Datum/);
 assert.equal(f.ctx.salesCompany_({id:101,name:'Synthetic',customFields:fields}).customFields.length,2);
});
test('new contact address and empty defined HQ fields retain their target and type',()=>{
 const f=productionFixture();f.db['sales_meta/catalog'].fields=[{name:'Grund der Adressanlage',type:'Text'},{name:'Kundenherkunft',type:'DropdownCheckbox'}];
 const m=f.ctx.getSalesEditor({companyId:101,entity:'company',targetId:101});assert.equal(m.customFieldDefinitions[0].name,'Grund der Adressanlage');
 const change={customFields:[...(m.base.customFields||[]),{name:'Grund der Adressanlage',type:'Text',value:'Synthetic reason'}]},r=saveForTest(f,{...m,change});f.ctx.salesSyncWrite_({id:r.id});assert.equal(f.remote.Companies[101].customFields.find(x=>x.name==='Grund der Adressanlage').value,'Synthetic reason');
 assert.throws(()=>edit(f,'company',{customFields:[...f.db['sales_companies/101'].company.customFields,{name:'Invented field',type:'Text',value:'x'}]}),/nicht bestätigt/);
 const draft=f.ctx.saveSalesCompany(f.input),ref='draft_'+draft.id,contact=f.ctx.getSalesEditor({companyId:ref,entity:'contact',targetId:ref+'_contact'});
 saveForTest(f,{...contact,requestId:'contact-address-edit',change:{defaultAddress:{...contact.base.defaultAddress,city:'Separate city',email:'synthetic@example.invalid'}}});
 for(let i=0;i<4&&f.db['sales_jobs/'+draft.id].state!=='synced';i++)f.ctx.runSalesJob(draft.id,f.db['sales_jobs/'+draft.id].companyConfirmedAt?'contact':'company');
 assert.equal(f.db['sales_jobs/'+draft.id].state,'synced',f.db['sales_jobs/'+draft.id].message);assert.equal(f.remote.ContactPersons[202].defaultAddress.city,'Separate city');assert.equal(f.remote.ContactPersons[202].eMail,'synthetic@example.invalid');
});
test('ignored newly edited creation fields fail readback without a repeated company POST',()=>{
 const f=productionFixture(),r=f.ctx.saveSalesCompany(f.input),ref='draft_'+r.id,m=f.ctx.getSalesEditor({companyId:ref,entity:'company',targetId:ref}),n=f.calls.length;saveForTest(f,{...m,requestId:'ignored-field-edit',change:{vatId:'synthetic-vat'}});
  f.ctx.runSalesJob(r.id,'company');delete f.remote.Companies[101].vatId;f.ctx.runSalesJob(r.id,'contact');assert.notEqual(f.db['sales_jobs/'+r.id].state,'synced');assert.match(f.db['sales_jobs/'+r.id].message,/company.vatId/);assert.equal(f.calls.slice(n).filter(c=>c.method==='post'&&c.path==='/v2/Companies').length,1);
});
test('all production RPCs authenticate before accessing customer or HQ data',()=>{
 const f=productionFixture();f.setEmail('outsider@example.invalid');const n=f.calls.length;
 for(const name of ['saveSalesCompany','getSalesEditor','saveSalesEntityChange','bindSalesCompanyResult','getSalesJobInspection'])assert.throws(()=>f.ctx[name]({}),/Zugriff/);
 assert.equal(f.calls.length,n);
});
test('ordinary imported customer captures each communication type without creation jobs or immediate HQ writes',()=>{
 for(const channel of ['Note','Mail','Call','Meeting','Visit']){
  const f=productionFixture(),n=f.calls.length,r=f.ctx.mutateSalesLean('saveSalesHistory',[{companyId:101,channel,reason:'Synthetic activity',content:'Synthetic content',contactOn:'2026-10-18T10:00:00Z',status:'Reached',recipientEmailAddress:'synthetic@example.invalid',contactPersonId:202}]);
  assert.equal(f.calls.length,n);assert.equal(r.patch.job.history.companyId,101);assert.equal(f.ctx.getSalesLeanCompany(101).histories.length,1);
  f.ctx.salesSyncWrite_({id:r.id});assert.equal(f.db['sales_jobs/'+r.id].state,'synced');const post=f.calls.slice(n).filter(c=>c.method==='post');assert.equal(post.length,1);assert.equal(post[0].path,'/v2/ContactHistories');
  const after=f.calls.length;f.ctx.salesSyncWrite_({id:r.id});assert.equal(f.calls.length,after);
 }
});
test('company edits store only changed values, display pending input and preserve unrelated current HQ fields',()=>{
 const f=productionFixture();f.remote.Companies[101].iban='synthetic-iban';const r=edit(f,'company',{name:'Synthetic renamed',vatId:'synthetic-vat'});
 assert.deepEqual(Object.keys(f.db['sales_jobs/'+r.id].change).sort(),['name','vatId']);assert.ok(!('detail' in r));assert.equal(r.entityPatch,undefined);assert.equal(f.ctx.getSalesLeanCompany(101).company.name,f.remote.Companies[101].name);
 f.remote.Companies[101].description='Concurrent unrelated description';f.ctx.salesSyncWrite_({id:r.id});
 const put=f.calls.filter(c=>c.method==='put').at(-1);assert.equal(put.body.description,'Concurrent unrelated description');assert.equal(put.body.iban,'synthetic-iban');assert.equal(put.body.vatId,'synthetic-vat');assert.ok(!('id' in put.body));assert.ok(!('companyTypes' in put.body));assert.equal(f.db['sales_companies/101'].pendingChanges.length,0);
});
test('contact and address fields use the documented paths and preserve target ownership',()=>{
 const f=productionFixture(),r=edit(f,'contact',{phoneMobile:'synthetic-mobile',language:'de',note:'Synthetic note'});f.ctx.salesSyncWrite_({id:r.id});
 const put=f.calls.filter(c=>c.method==='put').at(-1);assert.equal(put.path,'/v2/ContactPersons/202');assert.equal(put.body.language,'de');assert.ok(!('companyId' in put.body));
 const a=edit(f,'address',{city:'Synthetic city',phone:'synthetic-phone',additionalInformation:'Synthetic address detail'});f.ctx.salesSyncWrite_({id:a.id});
 assert.equal(f.calls.filter(c=>c.method==='put').at(-1).path,'/v2/Companies/101/Addresses/501');assert.equal(f.remote.Companies[101].defaultAddress.city,'Synthetic city');
});
test('readonly, malformed and foreign targets are rejected without a write',()=>{
 const f=productionFixture(),n=f.calls.filter(c=>c.method!=='get').length;
 for(const change of [{id:999},{responsibleUserIds:[1]},{debitorNumber:'bad'},{eInvoiceType:'bad'},{name:''},{customFields:[{name:'x',type:'Wrong',value:'x'}]}])assert.throws(()=>edit(f,'company',change));
 assert.throws(()=>edit(f,'contact',{firstName:''}),/Pflicht/);assert.throws(()=>edit(f,'contact',{companyId:999}));
 f.remote.ContactPersons[999]={id:999,companyId:999};assert.throws(()=>f.ctx.getSalesEditor({companyId:101,entity:'contact',targetId:999}),/gehört/);
 assert.throws(()=>f.ctx.getSalesEditor({companyId:101,entity:'address',targetId:999}),/gehört/);assert.throws(()=>f.ctx.getSalesEditor({companyId:101,entity:'project',targetId:101}));
 assert.equal(f.calls.filter(c=>c.method!=='get').length,n);
});
test('the current HQ value wins when an approved change is stale',()=>{
 const f=productionFixture(),r=edit(f,'company',{description:'Synthetic app value'}),n=f.calls.filter(c=>c.method!=='get').length;
 f.remote.Companies[101].description='Synthetic HQ value';f.ctx.salesSyncWrite_({id:r.id});
 assert.equal(f.db['sales_jobs/'+r.id].state,'canceled');assert.equal(f.calls.filter(c=>c.method!=='get').length,n);
 assert.equal(f.db['sales_companies/101'].company.description,'Synthetic HQ value');
 assert.equal(f.db['sales_companies/101'].pendingChanges.length,0);
});
test('empty fields sync with a reason while overwrites stay private and require an admin decision',()=>{
 const f=productionFixture(),employee='employee@example.invalid',other='other@example.invalid';
 f.props.SALES_ALLOWED_EMAILS=['pp@markatus.de',employee,other].join(',');f.setEmail(employee);
 const m=f.ctx.getSalesEditor({companyId:101,entity:'contact',targetId:202});
 assert.throws(()=>f.ctx.saveSalesEntityChange({...m,changeReason:'  ',change:{phoneMobile:'123'}}),/Änderungsgrund/);
 const fill=f.ctx.saveSalesEntityChange({...m,changeReason:'Synthetic new phone',change:{phoneMobile:'123'}});
 assert.equal(fill.patch.job.state,'pending');assert.equal(f.ctx.getSalesLeanCompany(101).contacts[0].phoneMobile,'123');
 f.setEmail('pp@markatus.de');f.ctx.salesSyncWrite_({id:fill.id});assert.equal(f.remote.ContactPersons[202].phoneMobile,'123');
 f.setEmail(employee);const updated=f.ctx.getSalesEditor({companyId:101,entity:'contact',targetId:202});
 const overwrite=f.ctx.saveSalesEntityChange({...updated,changeReason:'Synthetic corrected phone',change:{phoneMobile:'456'}});
 assert.equal(overwrite.patch.job.state,'awaitingApproval');assert.equal(f.ctx.getSalesLeanCompany(101).contacts[0].phoneMobile,'123');
 const decide=(decision,revision,note)=>f.ctx.respondSalesChangeReview({id:overwrite.id,decision,revision,note});
 assert.throws(()=>decide('approve',1),/Nur der Admin/);
 f.setEmail('pp@markatus.de');const before=f.calls.length;f.ctx.salesSyncWrite_({id:overwrite.id});assert.equal(f.calls.length,before);
 assert.equal(f.ctx.getSalesJobPreview(overwrite.id).previousValue.phoneMobile,'123');
 decide('ask',1,'Synthetic clarification?');assert.throws(()=>decide('approve',2),/Antwort/);
 f.setEmail(other);assert.equal(f.ctx.listSalesChangeReviews().length,0);assert.throws(()=>decide('answer',2,'Not the author'),/ursprüngliche/);
 f.setEmail(employee);assert.equal(f.ctx.listSalesChangeReviews()[0].review.conversation[0].text,'Synthetic clarification?');decide('answer',2,'Synthetic answer');
 f.setEmail('pp@markatus.de');assert.throws(()=>decide('approve',2),/inzwischen/);decide('keep',3);
 assert.equal(f.db['sales_jobs/'+overwrite.id].state,'canceled');assert.equal(f.db['sales_companies/101'].pendingChanges.length,0);assert.equal(f.calls.length,before);
});
test('old queued edits cannot write until a reason and approval are recorded',()=>{
 const f=productionFixture(),m=f.ctx.getSalesEditor({companyId:101,entity:'contact',targetId:202});
 const result=f.ctx.saveSalesEntityChange({...m,changeReason:'Synthetic old form',change:{phoneMobile:'123'}}),path='sales_jobs/'+result.id;
 delete f.db[path].changeReason;const before=f.calls.filter(c=>c.method!=='get').length;
 f.ctx.salesSyncWrite_({id:result.id});assert.equal(f.db[path].state,'awaitingApproval');assert.equal(f.calls.filter(c=>c.method!=='get').length,before);
 assert.throws(()=>f.ctx.respondSalesChangeReview({id:result.id,decision:'approve',revision:1}),/Änderungsgrund/);
 f.ctx.respondSalesChangeReview({id:result.id,decision:'approve',revision:1,note:'Synthetic old edit reason'});
 f.ctx.salesSyncWrite_({id:result.id});assert.equal(f.remote.ContactPersons[202].phoneMobile,'123');
});
test('lost PUT response remains blocked until read-only reconciliation and never repeats the write',()=>{
 const f=productionFixture(),r=edit(f,'company',{homepage:'https://synthetic.invalid'}),fetch=f.ctx.UrlFetchApp.fetch;
 f.ctx.UrlFetchApp.fetch=(url,opt)=>{const result=fetch(url,opt);if(opt.method==='put')throw Error('Synthetic lost response');return result;};
 assert.equal(f.ctx.runSalesJob(r.id).state,'uncertain');assert.throws(()=>f.ctx.runSalesJob(r.id),/gesperrt/);assert.equal(f.ctx.reconcileSalesJob(r.id).state,'synced');assert.equal(f.calls.filter(c=>c.method==='put').length,1);
});
test('rejected update can be read-checked and explicitly discarded without an automatic retry',()=>{
 const f=productionFixture(),r=edit(f,'company',{vatId:'synthetic-rejected'}),fetch=f.ctx.UrlFetchApp.fetch;
 f.ctx.UrlFetchApp.fetch=(url,opt)=>opt.method==='put'?{getResponseCode:()=>400,getContentText:()=>'{"error":"synthetic"}'}:fetch(url,opt);
 assert.equal(f.ctx.runSalesJob(r.id).state,'uncertain');assert.equal(f.ctx.reconcileSalesJob(r.id).state,'conflict');f.ctx.resolveSalesConflict(r.id,'hq');assert.equal(f.db['sales_jobs/'+r.id].state,'canceled');assert.equal(f.db['sales_companies/101'].pendingChanges.length,0);
});
test('shared contact address blocks address/email edits before PUT',()=>{
 const f=productionFixture(),r=edit(f,'contact',{eMail:'synthetic@example.invalid'});f.remote.ContactPersons[202].defaultAddressId=501;
 assert.notEqual(f.ctx.runSalesJob(r.id).state,'synced');assert.equal(f.calls.filter(c=>c.method==='put').length,0);
});
test('contact email uses its own complete address and survives address-only HQ readback',()=>{
 const f=productionFixture();f.remote.ContactPersons[202].defaultAddress={...f.remote.Companies[101].defaultAddress,id:707,email:null};
 const r=edit(f,'contact',{eMail:'synthetic@example.invalid'}),fetch=f.ctx.UrlFetchApp.fetch;
 f.ctx.UrlFetchApp.fetch=(url,opt)=>{const result=fetch(url,opt);if(opt.method==='put'&&url.endsWith('/ContactPersons/202'))f.remote.ContactPersons[202].eMail=null;return result;};
 f.ctx.salesSyncWrite_({id:r.id});assert.equal(f.db['sales_companies/101'].contacts[0].eMail,'synthetic@example.invalid');assert.equal(f.remote.Companies[101].defaultAddress.email,undefined);
});
test('documented company type endpoint receives only known IDs and numbers',()=>{
 const f=productionFixture(),fetch=f.ctx.UrlFetchApp.fetch;f.ctx.UrlFetchApp.fetch=(url,opt)=>{
  if(url.endsWith('/Companies/101/UpdateCompanyTypes')){const rows=JSON.parse(opt.payload);f.calls.push({method:opt.method,path:'/v2/Companies/101/UpdateCompanyTypes',body:rows});f.remote.Companies[101].companyTypes=rows;return {getResponseCode:()=>200,getContentText:()=>''};}return fetch(url,opt);
 };
 const r=edit(f,'types',{companyTypes:[{companyTypeId:3,number:'synthetic-number'}]},101);assert.equal(f.db['sales_companies/101'].pendingChanges[0].typeNames['3'],'Kunde');f.ctx.salesSyncWrite_({id:r.id});assert.equal(f.remote.Companies[101].companyTypes[0].number,'synthetic-number');assert.equal(f.calls.at(-1).method,'get');
 assert.throws(()=>edit(f,'types',{companyTypes:[{companyTypeId:999}]},101),/bekannte/);
});
test('new ordinary company sends no marker and a lost POST cannot auto-adopt a name match',()=>{
 const f=productionFixture(),r=f.ctx.saveSalesCompany({...f.input,name:'Synthetic new customer',description:'Synthetic ordinary description'});f.remote.ContactPersons={};f.loseResponse();assert.equal(f.ctx.runSalesJob(r.id).state,'uncertain');
 assert.equal(f.calls.filter(c=>c.path==='/v2/Companies'&&c.method==='post').at(-1).body.description,'Synthetic ordinary description');assert.equal(f.db['sales_drafts/'+r.id].testOnly,undefined);
 assert.throws(()=>f.ctx.reconcileSalesJob(r.id),/gesperrt/);f.remote.Companies[999]={...f.remote.Companies[101],id:999,name:'Synthetic different'};assert.throws(()=>f.ctx.bindSalesCompanyResult(r.id,999),/stimmt/);
 const before=f.calls.filter(c=>c.path==='/v2/Companies'&&c.method==='post').length;f.ctx.bindSalesCompanyResult(r.id,101);f.ctx.runSalesJob(r.id,'company');assert.equal(f.calls.filter(c=>c.path==='/v2/Companies'&&c.method==='post').length,before);
});
test('HQ id-shaped company types normalize at read boundary and ambiguous types stay blocked',()=>{
 const f=productionFixture();f.remote.Companies[101].companyTypes=[{id:2,name:'Interessent',number:'S-2'}];f.db['sales_companies/101'].company.companyTypes=f.remote.Companies[101].companyTypes;
 const model=f.ctx.getSalesEditor({companyId:101,entity:'types',targetId:101});assert.equal(model.base.companyTypes[0].companyTypeId,2);assert.equal(model.base.companyTypes[0].number,'S-2');assert.ok(!('id' in model.base.companyTypes[0]));assert.equal(f.ctx.salesCompany_(f.remote.Companies[101]).companyTypes[0].companyTypeId,2);
 const n=f.calls.filter(c=>c.method!=='get').length;
 for(const row of [{id:2,companyTypeId:3},{id:0},{id:'invalid'}]){f.remote.Companies[101].companyTypes=[row];f.db['sales_companies/101'].company.companyTypes=[row];assert.throws(()=>f.ctx.getSalesEditor({companyId:101,entity:'types',targetId:101}),/nicht eindeutig/);}
 assert.equal(f.calls.filter(c=>c.method!=='get').length,n);
});
test('new company verifies documented id-shaped HQ types without a second company POST',()=>{
 const f=productionFixture(),before=f.calls.filter(c=>c.method==='post'&&c.path==='/v2/Companies').length,r=f.ctx.saveSalesCompany({...f.input,name:'Synthetic id type company'}),one=f.ctx.salesOne_;
 f.ctx.salesOne_=(entity,id)=>{const row=one(entity,id);if(entity==='Companies')row.companyTypes=row.companyTypes.map(t=>({id:t.companyTypeId}));return row;};
 assert.equal(f.ctx.runSalesJob(r.id,'company').state,'companyConfirmed');assert.equal(f.ctx.runSalesJob(r.id,'contact').state,'synced');assert.equal(f.calls.filter(c=>c.method==='post'&&c.path==='/v2/Companies').length,before+1);
});
test('job inspection is GET-only and leaves matching, missing and unknown outcomes locked',()=>{
 const f=productionFixture(),r=f.ctx.saveSalesCompany({...f.input,name:'Synthetic inspect company'});f.ctx.runSalesJob(r.id,'company');f.ctx.runSalesJob(r.id,'contact');f.db['sales_jobs/'+r.id].state='uncertain';
 let before=JSON.stringify(f.db),n=f.calls.length;const result=f.ctx.getSalesJobInspection(r.id);assert.equal(result.state,'uncertain');assert.ok(result.checks.some(x=>x.includes('Anlagefelder stimmen')));assert.ok(result.checks.some(x=>x.includes('Kontaktfelder stimmen')));assert.equal(JSON.stringify(f.db),before);assert.ok(f.calls.slice(n).every(c=>c.method==='get'));assert.equal(f.calls.length-n,2);
 f.ctx.salesOne_=()=>{throw Error('HQ-Lesetest: HTTP 404.');};before=JSON.stringify(f.db);const missing=f.ctx.getSalesJobInspection(r.id);assert.match(missing.checks[0],/HTTP 404/);assert.equal(JSON.stringify(f.db),before);
 delete f.db['sales_jobs/'+r.id].hqId;delete f.db['sales_drafts/'+r.id].hqId;f.ctx.salesOne_=()=>{throw Error('Must not search HQ');};assert.match(f.ctx.getSalesJobInspection(r.id).checks[0],/Keine gespeicherte HQ-ID/);
 f.setEmail('test@example.invalid');assert.throws(()=>f.ctx.getSalesJobInspection(r.id),/Zugriff|Administrator/);
});
test('ID-less embedded subsystem requires a unique fresh bounded HQ mapping',()=>{
 const f=productionFixture();f.remote.Subsystems={10:{id:10,name:'Synthetic main',isMaster:true,currency:'EUR'}};const company={subsystems:[{name:'Synthetic main',isMaster:true,currency:'EUR'}]},n=f.calls.length;assert.equal(f.ctx.salesSubsystemConfirmed_(company,10),true);assert.equal(f.calls.length,n+1);assert.match(f.calls.at(-1).path,/\$top=200/);
 f.remote.Subsystems[11]={id:11,name:'Synthetic main',isMaster:true,currency:'EUR'};assert.equal(f.ctx.salesSubsystemConfirmed_(company,10),false);delete f.remote.Subsystems[11];assert.equal(f.ctx.salesSubsystemConfirmed_(company,11),false);assert.equal(f.ctx.salesSubsystemConfirmed_({subsystems:[{name:'Synthetic main',currency:'USD'}]},10),false);
 const before=f.calls.filter(c=>c.method!=='get').length;for(let id=20;id<220;id++)f.remote.Subsystems[id]={id,name:'Synthetic '+id};assert.throws(()=>f.ctx.salesSubsystemConfirmed_(company,10),/nicht vollständig/);assert.equal(f.calls.filter(c=>c.method!=='get').length,before);
});
test('documented ID-less subsystem shape completes the original company without duplicate POST',()=>{
 const f=productionFixture(),r=f.ctx.saveSalesCompany({...f.input,name:'Synthetic subsystem contract'}),one=f.ctx.salesOne_;f.remote.Subsystems={4:{id:4,name:'Synthetic main',isMaster:true,currency:'EUR'}};
 f.ctx.salesOne_=(entity,id)=>{const row=one(entity,id);if(entity==='Companies')row.subsystems=[{name:'Synthetic main',isMaster:true,currency:'EUR'}];return row;};const before=f.calls.filter(c=>c.method==='post'&&c.path==='/v2/Companies').length;assert.equal(f.ctx.runSalesJob(r.id,'company').state,'companyConfirmed');assert.equal(f.ctx.runSalesJob(r.id,'contact').state,'synced');assert.equal(f.calls.filter(c=>c.method==='post'&&c.path==='/v2/Companies').length,before+1);
});
test('legacy email and history inspections report exact field status without reconciliation writes',()=>{
 const f=productionFixture(),r=f.ctx.saveSalesCompany({...f.input,name:'Synthetic inspection fields'});f.ctx.runSalesJob(r.id,'company');f.ctx.runSalesJob(r.id,'contact');const draft=f.db['sales_drafts/'+r.id],target=f.ctx.salesContactEmailState_(draft,202);
 f.db['sales_jobs/inspect-email']={id:'inspect-email',kind:'contactEmail',draftId:r.id,hqId:101,contactId:202,state:'uncertain',targetContact:target};let before=JSON.stringify(f.db);assert.match(f.ctx.getSalesJobInspection('inspect-email').checks.join(' '),/Zielzustand stimmt/);assert.equal(JSON.stringify(f.db),before);f.remote.ContactPersons[202].eMail='different@example.invalid';assert.match(f.ctx.getSalesJobInspection('inspect-email').checks.join(' '),/noch nicht bestätigt/);
 const history={companyId:101,syncId:'sales-inspect-history',reason:'Synthetic history',content:'Synthetic note',contactOn:'2026-11-17T09:00:00Z',contactHistoryChannel:'Note'};f.remote.ContactHistories[999]={...history,id:999,reason:'Synthetic changed'};f.db['sales_jobs/inspect-history']={id:'inspect-history',kind:'history',draftId:r.id,hqId:101,historyId:999,state:'uncertain',history};before=JSON.stringify(f.db);const n=f.calls.length,result=f.ctx.getSalesJobInspection('inspect-history');assert.match(result.checks.join(' '),/Nicht bestätigte Felder: reason/);assert.equal(JSON.stringify(f.db),before);assert.ok(f.calls.slice(n).every(c=>c.method==='get'));
});
console.log(count+' production checks passed.');
}
module.exports={productionFixture,customerFixture,approveReview};
