const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/Sales.gs','utf8');
let count=0;
function test(name,fn){fn();console.log('PASS',name);count++;}
function fixture(){
  const db={},props={},remote={Companies:{},ContactPersons:{},ContactHistories:{}},calls=[];let seq=0,email='pp@markatus.de',failAfterCreate=false;
  const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
  const ctx={console,Set,Date,JSON,Number,String,Object,Array,Math,Error,PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null,setProperty:(k,v)=>props[k]=v})},Session:{getActiveUser:()=>({getEmail:()=>email})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},Utilities:{getUuid:()=>`test-${++seq}`,newBlob:x=>({getBytes:()=>Buffer.from(x)})},revenueToken_:()=> 'secret',revenueAmountCents_:x=>typeof x==='number'&&Number.isFinite(x)?Math.round(x*100):null};
  vm.createContext(ctx);vm.runInContext(source,ctx);
  ctx.salesRead_=p=>clone(db[p]||null);ctx.salesWrite_=(p,v)=>{db[p]=clone(v);};ctx.salesList_=col=>Object.entries(db).filter(([k])=>k.startsWith(col+'/')).map(([,v])=>clone(v));ctx.salesAssertPrivate_=()=>{};
  ctx.salesHqGet_=path=>{
    calls.push({method:'get',path});const addressPath=/^\/v2\/Companies\/(\d+)\/Addresses$/.exec(path);if(addressPath)return {data:[clone(remote.Companies[addressPath[1]].defaultAddress)],headers:{}};
    const m=path.match(/^\/v2\/(\w+)(?:\/(\d+))?/),entity=m[1];
    if(m[2])return {data:clone(remote[entity][m[2]]),headers:{}};
    let rows=Object.values(remote[entity]||{}).map(clone);const q=new URL('https://hq'+path).searchParams,filter=q.get('filter')||q.get('$filter')||'';
    const company=/companyId eq (\d+)/.exec(filter),name=/name eq '(.*)'/.exec(filter);if(company)rows=rows.filter(x=>Number(x.companyId)===Number(company[1]));if(name)rows=rows.filter(x=>x.name===name[1].replace(/''/g,"'"));
    const address=/defaultAddressId eq (\d+)/.exec(filter);if(address)rows=rows.filter(x=>Number(x.defaultAddressId)===Number(address[1]));
    const project=/projectId eq (\d+)/.exec(filter);if(project)rows=rows.filter(x=>Number(x.projectId)===Number(project[1]));
    return {data:rows,headers:{'helloHQ-Count':rows.length}};
  };
  ctx.UrlFetchApp={fetch:(url,opt)=>{const path=url.replace('https://api.hellohq.io',''),body=JSON.parse(opt.payload);calls.push({method:opt.method,path,body});let result;
    if(path==='/v2/Companies'&&opt.method==='post') {const id=101;result={...clone(body),id,defaultAddress:{...body.defaultAddress,id:501},companyTypes:body.companyTypes,responsibleUsers:body.responsibleUserIds.map(userId=>({userId})),subsystems:body.subsystemIds.map(id=>({id}))};remote.Companies[id]=result;if(failAfterCreate)throw new Error('Simulated lost response');}
    else if(path==='/v2/ContactPersons') {
      // Model the observed salutation validation failure; the enum values come
      // from HQ ContactPersonPost/SalutationForm, not from our payload builder.
      if(!['Formal','Informal','Neutral'].includes(body.salutationForm))return {getResponseCode:()=>400,getContentText:()=>JSON.stringify({errors:{salutationForm:['Required for salutation']}})};
      result={position:null,phoneLandline:null,phoneMobile:null,eMail:null,salutation:null,language:null,birthdate:null,note:null,customFields:[],defaultAddressId:707,defaultAddress:{street:null,zipCode:null,city:null,country:null,description:null,email:null},...body,id:202};remote.ContactPersons[202]=result;
    }
    else if(path==='/v2/ContactPersons/202'&&opt.method==='put') {result={...remote.ContactPersons[202],...clone(body)};remote.ContactPersons[202]=result;}
    else if(path==='/v2/ContactHistories') {result={...body,id:303};remote.ContactHistories[303]=result;}
    else if(path==='/v2/Companies/101'&&opt.method==='put') {result={...remote.Companies[101],...body};remote.Companies[101]=result;}
    else if(path==='/v2/Companies/101/Addresses/501'&&opt.method==='put') {result={...remote.Companies[101].defaultAddress,...body,id:501};remote.Companies[101].defaultAddress=result;}
    else throw new Error('Unexpected external mutation '+path);
    return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(result)};
  }};
  db['sales_meta/catalog']={users:[{id:1,name:'Test User'}],types:[{id:2,name:'Interessent'},{id:3,name:'Kunde'}],subsystems:[{id:4,name:'Testbereich'}],fields:[],industries:['App','Medien','New','Technik'],salutations:['Frau','Herr']};
  const input={name:'TEST Integration',kind:'Interessent',responsibleUserId:'1',subsystemId:'4',street:'Testweg',houseNumber:'1',zipCode:'00000',city:'Testort',country:'DE',firstName:'Test',lastName:'Kontakt',addressOrigin:'Sonstige',addressOriginOther:'Manueller Test'};
  return {ctx,db,props,remote,calls,input,setEmail:x=>email=x,loseResponse:()=>failAfterCreate=true};
}
function finishCreate(f,id){
  for(let step=0;step<4;step++){
    const job=f.db['sales_jobs/'+id];const result=f.ctx.runSalesJob(id,job.companyConfirmedAt?'contact':'company');
    if(result.state==='synced')return result;
    assert.ok(['companyCreated','companyConfirmed','contactCreated'].includes(result.state),'Unexpected creation state: '+result.state+' '+result.message);
  }
  throw new Error('Create workflow did not finish.');
}
test('all public RPCs enforce the allowlist before accessing data',()=>{
  const f=fixture();f.setEmail('outsider@example.invalid');
  for(const name of ['getSalesState','saveSalesAccess','syncSalesCatalog','syncSalesEdition','getSalesCompany','syncSalesCompany','saveSalesEditionSettings','saveSalesTestCompany','getSalesJobPreview','getSalesTestAudit','queueSalesMarkerCleanup','queueSalesContactEmail','runSalesJob','reconcileSalesJob','saveSalesHistory','saveSalesCompanyChange','resolveSalesConflict'])assert.throws(()=>f.ctx[name]({}),/Zugriff/);
  assert.equal(f.calls.length,0);
});
test('Google identity must be present even for a configured account',()=>{const f=fixture();f.setEmail('');assert.throws(()=>f.ctx.getSalesState(),/Zugriff/);});
test('ordinary Firebase state request never contacts HQ',()=>{const f=fixture();f.ctx.getSalesState();assert.equal(f.calls.length,0);});
test('only admin edits access; removal of admin prohibited; case normalized',()=>{const f=fixture();assert.throws(()=>f.ctx.saveSalesAccess('x@example.invalid'),/Administrator/);f.ctx.saveSalesAccess('pp@markatus.de\nTEST@example.invalid');f.setEmail('test@example.invalid');assert.equal(f.ctx.getSalesState().user.admin,false);assert.throws(()=>f.ctx.saveSalesAccess('test@example.invalid'),/Zugriff/);});
test('real pilot firms cannot become write targets via client supplied IDs',()=>{const f=fixture();assert.throws(()=>f.ctx.saveSalesTestCompany({...f.input,name:'Real company'}),/TEST/);assert.throws(()=>f.ctx.saveSalesCompanyChange({draftId:'real',hqId:999}),/Testfirmen/);assert.equal(f.calls.length,0);});
test('Sonstige requires free text, valid responsible and subsystem IDs required',()=>{const f=fixture();assert.throws(()=>f.ctx.saveSalesTestCompany({...f.input,addressOriginOther:''}),/Pflichtfeld/);assert.throws(()=>f.ctx.saveSalesTestCompany({...f.input,responsibleUserId:999}),/Benutzer/);assert.throws(()=>f.ctx.saveSalesTestCompany({...f.input,subsystemId:999}),/Unternehmensbereich/);});
test('company and contact are visible from Firebase immediately, before any HQ write',()=>{const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input),state=f.ctx.getSalesState(),detail=f.ctx.getSalesCompany('draft_'+r.id);assert.equal(f.db['sales_jobs/'+r.id].state,'pending');assert.equal(f.db['sales_drafts/'+r.id].kind,'Interessent');assert.equal(state.localCompanies[0].id,'draft_'+r.id);assert.equal(state.localCompanies[0].syncState,'pending');assert.equal(detail.company.name,f.input.name);assert.equal(detail.contacts[0].firstName,f.input.firstName);assert.equal(detail.contacts[0].lastName,f.input.lastName);assert.equal(f.calls.length,0);});
test('contact names are required so entered contact data is never silently dropped',()=>{const f=fixture();assert.throws(()=>f.ctx.saveSalesTestCompany({...f.input,firstName:'',lastName:'',eMail:'test@example.invalid'}),/Vor- und Nachname/);assert.throws(()=>f.ctx.saveSalesTestCompany({...f.input,lastName:''}),/Vor- und Nachname/);assert.equal(f.calls.length,0);});
test('creation sequences company then contact with returned ID and verifies them',()=>{const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input);
  assert.equal(f.ctx.runSalesJob(r.id,'company').state,'companyConfirmed');assert.equal(f.calls.filter(x=>x.method==='post').length,1);assert.equal(f.ctx.runSalesJob(r.id,'contact').state,'synced');const writes=f.calls.filter(x=>x.method==='post');assert.deepEqual(writes.map(x=>x.path),['/v2/Companies','/v2/ContactPersons']);assert.equal(writes[1].body.companyId,101);assert.equal(f.db['sales_drafts/'+r.id].hqId,101);assert.equal(f.remote.ContactPersons[202].firstName,f.input.firstName);assert.ok(!f.remote.Companies[101].description.includes('[Sales-Test'));assert.equal(f.db['sales_companies/101'].contacts[0].id,202);assert.equal(f.ctx.getSalesCompany('draft_'+r.id).contacts[0].id,202);assert.equal(f.ctx.getSalesState().localCompanies[0].syncState,'synced');assert.ok(!('addressOrigin' in writes[0].body));assert.ok(!('note' in writes[1].body));});
test('HQ company read delay keeps a confirmed company phase without a second POST',()=>{const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input),original=f.ctx.salesOne_;f.ctx.salesOne_=(entity,id)=>{if(entity==='Companies')throw Error('HQ noch nicht lesbar');return original(entity,id);};const first=f.ctx.runSalesJob(r.id);assert.equal(first.state,'companyCreated');assert.match(first.message,/HQ noch nicht lesbar/);assert.equal(f.calls.filter(x=>x.method==='post').length,1);f.ctx.salesOne_=original;assert.equal(finishCreate(f,r.id).state,'synced');});
test('HQ contact read delay keeps a confirmed contact phase without a second POST',()=>{const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input),original=f.ctx.salesOne_;f.ctx.runSalesJob(r.id,'company');f.ctx.salesOne_=(entity,id)=>{if(entity==='ContactPersons')throw Error('HQ noch nicht lesbar');return original(entity,id);};const first=f.ctx.runSalesJob(r.id,'contact');assert.equal(first.state,'contactCreated');assert.match(first.message,/HQ noch nicht lesbar/);assert.equal(f.calls.filter(x=>x.method==='post').length,2);f.ctx.salesOne_=original;assert.equal(finishCreate(f,r.id).state,'synced');});
test('repeating completed creation is idempotent',()=>{const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input);finishCreate(f,r.id);const n=f.calls.length;f.ctx.runSalesJob(r.id);assert.equal(f.calls.length,n);});
test('HQ fixture rejects the old missing salutationForm and accepts all documented forms',()=>{
  const f=fixture(),response=f.ctx.UrlFetchApp.fetch('https://api.hellohq.io/v2/ContactPersons',{method:'post',payload:JSON.stringify({companyId:101,firstName:'Test',lastName:'Contact',salutation:'Herr'})});
  assert.equal(response.getResponseCode(),400);assert.equal(Object.keys(f.remote.ContactPersons).length,0);
  for(const form of ['Formal','Informal','Neutral']){
    const n=fixture(),r=n.ctx.saveSalesTestCompany({...n.input,salutation:'Herr',salutationForm:form});finishCreate(n,r.id);
    assert.equal(n.remote.ContactPersons[202].salutationForm,form);assert.equal(n.remote.ContactPersons[202].salutation,'Herr');
    assert.equal(n.db['sales_companies/101'].contacts[0].salutationForm,form);
  }
  assert.throws(()=>f.ctx.saveSalesTestCompany({...f.input,salutationForm:'Herr'}),/Ansprache/);
});
function oldSalutationFailure(){
  const f=fixture(),r=f.ctx.saveSalesTestCompany({...f.input,salutation:'Herr'});f.ctx.runSalesJob(r.id,'company');
  const j=f.db['sales_jobs/'+r.id];delete f.db['sales_drafts/'+r.id].contact.salutationForm;
  Object.assign(j,{state:'uncertain',contactAttempted:true,lastWrite:{method:'POST',resource:'/v2/ContactPersons',status:400,fields:['salutation','salutationForm']}});
  return {f,id:r.id,j};
}
test('existing rejected contact is repaired in Firebase after read-only HQ checks, then synced without a new company',()=>{
  const {f,id,j}=oldSalutationFailure(),writes=f.calls.filter(x=>x.method==='post'||x.method==='put').length;
  assert.equal(f.ctx.reconcileSalesJob(id).state,'companyConfirmed');
  assert.equal(f.calls.filter(x=>x.method==='post'||x.method==='put').length,writes);
  assert.equal(f.db['sales_drafts/'+id].contact.salutationForm,'Formal');
  assert.equal(f.db['sales_jobs/'+id].previousContactRejection.status,400);
  assert.equal(f.ctx.runSalesJob(id,'contact').state,'synced');
  assert.equal(f.calls.filter(x=>x.method==='post'&&x.path==='/v2/Companies').length,1);
  assert.equal(f.calls.filter(x=>x.method==='post'&&x.path==='/v2/ContactPersons').length,1);
});
test('salutation repair never unlocks unknown writes, other endpoints, statuses or already corrected payloads',()=>{
  for(const mutate of [j=>j.lastWrite.status=null,j=>j.lastWrite.status=500,j=>j.lastWrite.resource='/v2/Companies',j=>j.lastWrite.fields=['eMail'],j=>j.contactId=202,j=>j.state='running']){
    const {f,id,j}=oldSalutationFailure();mutate(j);assert.throws(()=>f.ctx.reconcileSalesJob(id),/gesperrt/);assert.equal(f.db['sales_drafts/'+id].contact.salutationForm,undefined);
  }
  const {f,id}=oldSalutationFailure();f.db['sales_drafts/'+id].contact.salutationForm='Formal';assert.throws(()=>f.ctx.reconcileSalesJob(id),/gesperrt/);
});
test('salutation repair blocks any existing contact, a foreign result or a changed company',()=>{
  for(const companyId of [101,999]){
    const {f,id}=oldSalutationFailure();f.remote.ContactPersons[202]={id:202,companyId,firstName:'Existing'};
    if(companyId===999){const original=f.ctx.salesCollect_;f.ctx.salesCollect_=(entity,...args)=>entity==='ContactPersons'?[f.remote.ContactPersons[202]]:original(entity,...args);}
    assert.throws(()=>f.ctx.reconcileSalesJob(id),/gesperrt|Keine erneute/);assert.equal(f.db['sales_jobs/'+id].state,'uncertain');
  }
  const {f,id}=oldSalutationFailure();f.remote.Companies[101].name='TEST Changed';assert.throws(()=>f.ctx.reconcileSalesJob(id),/verändert/);
});
test('a contact appearing after repair prevents the corrected POST',()=>{
  const {f,id}=oldSalutationFailure();f.ctx.reconcileSalesJob(id);f.remote.ContactPersons[202]={id:202,companyId:101};
  assert.equal(f.ctx.runSalesJob(id,'contact').state,'companyConfirmed');assert.equal(f.calls.filter(x=>x.method==='post'&&x.path==='/v2/ContactPersons').length,0);
});
test('older unattempted drafts gain the default form before their first contact POST',()=>{
  const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input);delete f.db['sales_drafts/'+r.id].contact.salutationForm;
  finishCreate(f,r.id);assert.equal(f.remote.ContactPersons[202].salutationForm,'Formal');
  assert.equal(f.db['sales_drafts/'+r.id].contact.salutationForm,'Formal');
});
test('failed contact read cannot unlock or modify the rejected draft',()=>{
  const {f,id}=oldSalutationFailure();f.ctx.salesCollect_=()=>{throw Error('HQ unavailable');};
  assert.throws(()=>f.ctx.reconcileSalesJob(id),/unavailable/);assert.equal(f.db['sales_jobs/'+id].state,'uncertain');
  assert.equal(f.db['sales_drafts/'+id].contact.salutationForm,undefined);
});
test('readback must confirm the requested salutation form',()=>{
  const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input);f.ctx.runSalesJob(r.id,'company');
  const one=f.ctx.salesOne_;f.ctx.salesOne_=(entity,id)=>{const value=one(entity,id);if(entity==='ContactPersons')value.salutationForm='Informal';return value;};
  assert.equal(f.ctx.runSalesJob(r.id,'contact').state,'contactCreated');assert.equal(f.db['sales_jobs/'+r.id].steps.contact,undefined);
});
test('contact email audit only reads HQ and reports fields without leaking contact values',()=>{
  const f=fixture(),r=f.ctx.saveSalesTestCompany({...f.input,eMail:'private-test@example.invalid'});finishCreate(f,r.id);
  const contact=f.remote.ContactPersons[202];contact.eMail=null;contact.defaultAddress={email:'private-test@example.invalid'};
  const before=f.calls.length,result=f.ctx.getSalesTestAudit(r.id).contactStatus;
  assert.match(result,/Kontaktprüfung 2026-09-26-r9/);assert.match(result,/E-Mail in Firebase: vorhanden/);assert.match(result,/HQ eMail: leer/);
  assert.match(result,/defaultAddress.email: stimmt mit Firebase überein/);assert.match(result,/Abweichende Kontaktfelder: keine/);
  assert.equal(result.includes('private-test@'),false);assert.ok(f.calls.slice(before).every(c=>c.method==='get'));
});
test('contact email diagnostic distinguishes missing, empty, alternate and different values',()=>{
  const f=fixture(),expected={eMail:'synthetic@example.invalid',salutationForm:'Formal'};
  const result=f.ctx.salesContactDiagnostic_({email:expected.eMail,defaultAddress:{email:'other@example.invalid'},salutationForm:'Informal'},expected);
  assert.match(result,/HQ eMail: Feld nicht geliefert/);assert.match(result,/HQ email: stimmt mit Firebase überein/);
  assert.match(result,/defaultAddress.email: vorhanden, weicht von Firebase ab/);assert.match(result,/Abweichende Kontaktfelder: salutationForm, eMail/);
  assert.equal(result.includes('@'),false);assert.match(f.ctx.salesContactDiagnostic_({eMail:null},{eMail:''}),/E-Mail in Firebase: leer/);
});
test('audit blocks a contact assigned to another company',()=>{
  const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input);finishCreate(f,r.id);f.remote.ContactPersons[202].companyId=999;
  assert.throws(()=>f.ctx.getSalesTestAudit(r.id),/gehört nicht/);
});
test('audit expands a linked contact address and reports failed reads without assuming an empty email',()=>{
  const f=fixture(),r=f.ctx.saveSalesTestCompany({...f.input,eMail:'synthetic@example.invalid'});finishCreate(f,r.id);
  f.remote.ContactPersons[202].defaultAddressId=777;f.remote.ContactPersons[202].defaultAddress=null;const get=f.ctx.salesHqGet_;
  f.ctx.salesHqGet_=path=>path.includes('expand=DefaultAddress')?{data:{...f.remote.ContactPersons[202],defaultAddress:{email:'synthetic@example.invalid'}},headers:{}}:get(path);
  assert.match(f.ctx.getSalesTestAudit(r.id).contactStatus,/defaultAddress.email: stimmt mit Firebase überein/);
  f.ctx.salesHqGet_=path=>{if(path.includes('expand=DefaultAddress'))throw Error('Unavailable');return get(path);};
  assert.match(f.ctx.getSalesTestAudit(r.id).contactStatus,/zusätzlicher Lesetest nicht erfolgreich/);
});
test('a missing HQ email reports the actual field and never creates a duplicate contact',()=>{
  const f=fixture(),r=f.ctx.saveSalesTestCompany({...f.input,eMail:'synthetic@example.invalid'}),fetch=f.ctx.UrlFetchApp.fetch;
  f.ctx.UrlFetchApp.fetch=(url,opt)=>{const response=fetch(url,opt);if(url.endsWith('/v2/ContactPersons')){f.remote.ContactPersons[202].eMail=null;if(f.remote.ContactPersons[202].defaultAddress)f.remote.ContactPersons[202].defaultAddress.email=null;}return response;};
  f.ctx.runSalesJob(r.id,'company');const result=f.ctx.runSalesJob(r.id,'contact');assert.equal(result.state,'contactCreated');
  assert.match(result.message,/Abweichende Kontaktfelder: eMail/);f.ctx.runSalesJob(r.id,'contact');
  assert.equal(f.calls.filter(c=>c.method==='post'&&c.path==='/v2/ContactPersons').length,1);
});
function missingContactEmail(){
  const f=fixture(),r=f.ctx.saveSalesTestCompany({...f.input,eMail:'contact@example.invalid'}),fetch=f.ctx.UrlFetchApp.fetch;
  f.ctx.runSalesJob(r.id,'company');
  f.ctx.UrlFetchApp.fetch=(url,opt)=>{const response=fetch(url,opt);if(url.endsWith('/v2/ContactPersons')){f.remote.ContactPersons[202].eMail=null;f.remote.ContactPersons[202].defaultAddress.email=null;}return response;};
  assert.equal(f.ctx.runSalesJob(r.id,'contact').state,'contactCreated');f.ctx.UrlFetchApp.fetch=fetch;
  return {f,id:r.id};
}
test('email correction previews read-only and updates one known contact while preserving its data',()=>{
  const {f,id}=missingContactEmail(),contact=f.remote.ContactPersons[202];
  Object.assign(contact,{note:'Keep note',language:'de-DE',birthdate:'01.01.1980',customFields:[{name:'Category',type:'Text',value:'Keep',id:999}]});
  Object.assign(contact.defaultAddress,{street:'Kontaktweg',houseNumber:'9',fax:'123',additionalInformation:'Keep address'});
  const n=f.calls.length,j=f.ctx.queueSalesContactEmail(id);assert.ok(f.calls.slice(n).every(c=>c.method==='get'));
  assert.equal(f.ctx.queueSalesContactEmail(id).id,j.id);
  const preview=f.ctx.getSalesJobPreview(j.id);assert.equal(preview.change.eMail,'contact@example.invalid');assert.equal(preview.change.contactAddress.street,'Kontaktweg');
  assert.equal(f.ctx.runSalesJob(j.id).state,'synced');
  const writes=f.calls.filter(c=>c.method==='put'&&c.path==='/v2/ContactPersons/202');assert.equal(writes.length,1);
  assert.equal(writes[0].body.note,'Keep note');assert.equal(writes[0].body.language,'de-DE');assert.equal(writes[0].body.birthdate,'01.01.1980');
  assert.deepEqual(writes[0].body.customFields,[{name:'Category',type:'Text',value:'Keep'}]);assert.equal(writes[0].body.defaultAddress.fax,'123');
  assert.equal(writes[0].body.defaultAddress.email,'contact@example.invalid');assert.ok(!('companyId' in writes[0].body));
  assert.equal(f.ctx.runSalesJob(id,'contact').state,'synced');assert.equal(f.ctx.getSalesCompany('draft_'+id).contacts[0].eMail,'contact@example.invalid');
  const after=f.calls.length;f.ctx.runSalesJob(j.id);assert.equal(f.calls.length,after);assert.equal(f.calls.filter(c=>c.method==='post').length,2);
});
test('new contacts send email on their own address and accept address-derived readback',()=>{
  const f=fixture(),r=f.ctx.saveSalesTestCompany({...f.input,eMail:'contact@example.invalid'}),fetch=f.ctx.UrlFetchApp.fetch;
  f.ctx.UrlFetchApp.fetch=(url,opt)=>{const result=fetch(url,opt);if(url.endsWith('/v2/ContactPersons'))f.remote.ContactPersons[202].eMail=null;return result;};
  assert.equal(finishCreate(f,r.id).state,'synced');
  const post=f.calls.find(c=>c.method==='post'&&c.path==='/v2/ContactPersons');assert.equal(post.body.defaultAddress.email,'contact@example.invalid');assert.ok(!('id' in post.body.defaultAddress));
  assert.equal(f.db['sales_companies/101'].contacts[0].eMail,'contact@example.invalid');
  assert.notEqual(f.remote.Companies[101].defaultAddress.email,'contact@example.invalid');
});
test('lost email PUT response is reconciled only by reading and never repeated',()=>{
  const {f,id}=missingContactEmail(),j=f.ctx.queueSalesContactEmail(id),fetch=f.ctx.UrlFetchApp.fetch;
  f.ctx.UrlFetchApp.fetch=(url,opt)=>{const result=fetch(url,opt);if(url.endsWith('/v2/ContactPersons/202'))throw Error('Lost response');return result;};
  assert.equal(f.ctx.runSalesJob(j.id).state,'uncertain');assert.throws(()=>f.ctx.runSalesJob(j.id),/gesperrt/);
  const n=f.calls.length;assert.equal(f.ctx.reconcileSalesJob(j.id).state,'synced');assert.ok(f.calls.slice(n).every(c=>c.method==='get'));
  assert.equal(f.calls.filter(c=>c.method==='put'&&c.path==='/v2/ContactPersons/202').length,1);
});
test('an unconfirmed email PUT stays blocked with no second write',()=>{
  const {f,id}=missingContactEmail(),j=f.ctx.queueSalesContactEmail(id),fetch=f.ctx.UrlFetchApp.fetch;
  f.ctx.UrlFetchApp.fetch=(url,opt)=>{const result=fetch(url,opt);if(url.endsWith('/v2/ContactPersons/202')){f.remote.ContactPersons[202].eMail=null;f.remote.ContactPersons[202].defaultAddress.email=null;}return result;};
  assert.equal(f.ctx.runSalesJob(j.id).state,'uncertain');assert.throws(()=>f.ctx.reconcileSalesJob(j.id),/nicht vollständig/);
  assert.throws(()=>f.ctx.runSalesJob(j.id),/gesperrt/);assert.equal(f.calls.filter(c=>c.method==='put').length,1);
});
test('email correction rejects foreign contacts and company or other-contact shared addresses',()=>{
  for(const mutate of [f=>f.remote.ContactPersons[202].companyId=999,f=>f.remote.ContactPersons[202].defaultAddressId=501,f=>f.remote.ContactPersons[303]={id:303,companyId:999,defaultAddressId:707}]){
    const {f,id}=missingContactEmail();mutate(f);assert.throws(()=>f.ctx.queueSalesContactEmail(id),/zuordnung|zugeordnet|Firmenadresse/i);assert.equal(f.calls.filter(c=>c.method==='put').length,0);
  }
});
test('email correction refuses changed fields or address association after preview',()=>{
  for(const mutate of [f=>f.remote.ContactPersons[202].note='Changed',f=>f.remote.ContactPersons[202].eMail='someone@example.invalid',f=>f.remote.ContactPersons[202].defaultAddressId=999]){
    const {f,id}=missingContactEmail(),j=f.ctx.queueSalesContactEmail(id);mutate(f);const result=f.ctx.runSalesJob(j.id);
    assert.equal(result.state,'pending');assert.match(result.message,/verändert/);assert.equal(f.calls.filter(c=>c.method==='put').length,0);
  }
});
test('empty contact address has explicit company-address preview; partial address is not invented',()=>{
  const {f,id}=missingContactEmail();f.remote.ContactPersons[202].defaultAddress={street:null,zipCode:null,city:null,country:null,description:null,email:null,phone:'Keep phone'};
  const j=f.ctx.queueSalesContactEmail(id),preview=f.ctx.getSalesJobPreview(j.id);
  assert.match(preview.change.addressNote,/Firmenentwurf/);assert.equal(preview.change.contactAddress.street,f.input.street);assert.equal(preview.change.contactAddress.phone,'Keep phone');
  assert.equal(f.ctx.runSalesJob(j.id).state,'synced');
  const other=missingContactEmail();other.f.remote.ContactPersons[202].defaultAddress.city=null;assert.throws(()=>other.f.ctx.queueSalesContactEmail(other.id),/teilweise/);
});
test('email correction requires complete writable fields and preserves existing email',()=>{
  for(const mutate of [f=>delete f.remote.ContactPersons[202].note,f=>delete f.remote.ContactPersons[202].customFields,f=>f.remote.ContactPersons[202].eMail='other@example.invalid']){
    const {f,id}=missingContactEmail();mutate(f);assert.throws(()=>f.ctx.queueSalesContactEmail(id),/vollständig|bereits eine E-Mail/);assert.equal(f.calls.filter(c=>c.method==='put').length,0);
  }
});
test('central writer limits email correction to the bound contact and exact preview payload',()=>{
  const {f,id}=missingContactEmail(),queued=f.ctx.queueSalesContactEmail(id),j=f.db['sales_jobs/'+queued.id];j.state='running';
  assert.throws(()=>f.ctx.salesWriteHq_(j,'/v2/ContactPersons/999','put',j.targetContact.payload),/gesperrt/);
  assert.throws(()=>f.ctx.salesWriteHq_(j,'/v2/ContactPersons/202','put',{...j.targetContact.payload,note:'Changed'}),/gesperrt/);
  assert.equal(f.calls.filter(c=>c.method==='put').length,0);
});
test('contact step is blocked before confirmation and repeated company clicks never post contacts',()=>{
  const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input);
  assert.throws(()=>f.ctx.runSalesJob(r.id,'contact'),/Zuerst Schritt 1/);assert.equal(f.calls.length,0);
  assert.equal(f.ctx.runSalesJob(r.id,'company').state,'companyConfirmed');
  assert.equal(f.ctx.runSalesJob(r.id,'company').state,'companyConfirmed');
  assert.equal(f.ctx.runSalesJob(r.id).state,'companyConfirmed');
  assert.equal(f.calls.filter(x=>x.method==='post').length,1);
  assert.equal(f.ctx.getSalesJobPreview(r.id).job.nextStep,'contact');
  assert.equal(f.ctx.getSalesCompany('draft_'+r.id).contacts[0].firstName,f.input.firstName);
  assert.equal(f.ctx.runSalesJob(r.id,'contact').state,'synced');
});
test('second call rereads the confirmed company and refuses a changed target before contact POST',()=>{
  const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input);f.ctx.runSalesJob(r.id,'company');
  f.remote.Companies[101].name='TEST Different';const begin=f.calls.length,result=f.ctx.runSalesJob(r.id,'contact');
  assert.equal(result.state,'companyConfirmed');assert.match(result.message,/Firmenname/);
  assert.equal(f.calls[begin].path,'/v2/Companies/101');assert.equal(f.calls.filter(x=>x.method==='post').length,1);
});
test('HTTP 400 identifies contact step and field names, without persisting error values or retrying',()=>{
  const f=fixture(),r=f.ctx.saveSalesTestCompany({...f.input,eMail:'synthetic@example.invalid'});f.ctx.runSalesJob(r.id,'company');
  const fetch=f.ctx.UrlFetchApp.fetch;
  f.ctx.UrlFetchApp.fetch=(url,opt)=>url.endsWith('/v2/ContactPersons')?{getResponseCode:()=>400,getContentText:()=>JSON.stringify({errors:{eMail:['Private customer value: secret-response-value']}})}:fetch(url,opt);
  const result=f.ctx.runSalesJob(r.id,'contact');
  assert.equal(result.state,'uncertain');assert.match(result.message,/POST \/v2\/ContactPersons: HTTP 400/);assert.match(result.message,/eMail/);
  assert.equal(result.lastWrite.status,400);assert.equal(JSON.stringify(f.db).includes('secret-response-value'),false);
  assert.throws(()=>f.ctx.runSalesJob(r.id,'contact'),/gesperrt/);
});
test('contact payload omits empty optional fields and only uses the confirmed parent ID',()=>{
  const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input);f.ctx.runSalesJob(r.id,'company');finishCreate(f,r.id);
  const payload=f.calls.find(x=>x.method==='post'&&x.path==='/v2/ContactPersons').body;
  assert.deepEqual(payload,{companyId:101,firstName:f.input.firstName,lastName:f.input.lastName,salutationForm:'Formal'});
});
test('contact step resumes in a fresh backend execution using only persisted Firebase state',()=>{
  const first=fixture(),r=first.ctx.saveSalesTestCompany(first.input);first.ctx.runSalesJob(r.id,'company');
  const second=fixture();Object.assign(second.db,JSON.parse(JSON.stringify(first.db)));Object.assign(second.remote,JSON.parse(JSON.stringify(first.remote)));
  assert.equal(second.ctx.runSalesJob(r.id,'contact').state,'synced');
  assert.deepEqual(second.calls.filter(x=>x.method==='post').map(x=>x.path),['/v2/ContactPersons']);
});
test('contact list uses documented OData filtering and paging names',()=>{
  const f=fixture();f.ctx.salesCollect_('ContactPersons','companyId eq 101',Date.now());
  const q=new URL('https://example.invalid'+f.calls[0].path).searchParams;
  assert.equal(q.get('$filter'),'companyId eq 101');assert.equal(q.get('$skip'),'0');assert.equal(q.get('$top'),'200');
});
test('lost company response is blocked and reconciled before the contact is posted',()=>{const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input);f.loseResponse();assert.equal(f.ctx.runSalesJob(r.id).state,'uncertain');assert.throws(()=>f.ctx.runSalesJob(r.id),/gesperrt/);assert.equal(f.ctx.reconcileSalesJob(r.id).state,'ready');assert.equal(finishCreate(f,r.id).state,'synced');assert.equal(f.calls.filter(x=>x.path==='/v2/Companies'&&x.method==='post').length,1);});
test('lost contact response is reconciled by unique matching contact without another POST',()=>{const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input),fetch=f.ctx.UrlFetchApp.fetch;f.ctx.runSalesJob(r.id,'company');let lost=true;f.ctx.UrlFetchApp.fetch=(url,opt)=>{const out=fetch(url,opt);if(lost&&url.endsWith('/v2/ContactPersons')&&opt.method==='post'){lost=false;throw Error('Lost response');}return out;};assert.equal(f.ctx.runSalesJob(r.id,'contact').state,'uncertain');assert.equal(f.ctx.reconcileSalesJob(r.id).state,'ready');assert.equal(finishCreate(f,r.id).state,'synced');assert.equal(f.calls.filter(x=>x.path==='/v2/ContactPersons'&&x.method==='post').length,1);});
test('reconciliation never adopts a same-name unrelated company',()=>{const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input);f.db['sales_jobs/'+r.id].state='uncertain';f.remote.Companies[99]={id:99,name:f.input.name,description:'unrelated'};assert.throws(()=>f.ctx.reconcileSalesJob(r.id),/Keine eindeutige/);assert.equal(f.db['sales_drafts/'+r.id].hqId,null);});
test('different HQ address is reported after safe contact linkage without duplicate writes',()=>{const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input),orig=f.ctx.salesOne_;f.ctx.runSalesJob(r.id,'company');f.ctx.salesOne_=(entity,id)=>{const v=orig(entity,id);if(entity==='Companies')v.defaultAddress.city='Wrong';return v;};const check=f.ctx.runSalesJob(r.id,'contact');assert.equal(check.state,'contactCreated');assert.match(check.message,/Standardadresse/);assert.equal(f.calls.filter(x=>x.path==='/v2/ContactPersons'&&x.method==='post').length,1);assert.equal(f.calls.filter(x=>x.path==='/v2/Companies'&&x.method==='post').length,1);});
test('central writer rejects project/invoice/foreign-company paths',()=>{const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input);const j=f.db['sales_jobs/'+r.id];j.state='running';for(const path of ['/v2/Documents','/v2/Projects','/v2/Companies/999'])assert.throws(()=>f.ctx.salesWriteHq_(j,path,'post',{}),/gesperrt/);assert.equal(f.calls.length,0);});
test('contact history is queued then written only to the own test company',()=>{const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input);finishCreate(f,r.id);const n=f.calls.length,h=f.ctx.saveSalesHistory({draftId:r.id,reason:'Call',content:'Test only',channel:'Call'});assert.equal(f.calls.length,n);assert.equal(f.ctx.runSalesJob(h.id).state,'synced');assert.equal(f.remote.ContactHistories[303].companyId,101);assert.equal(f.db['sales_companies/101'].histories.length,1);});
test('concurrent HQ change surfaces conflict and prevents another PUT',()=>{const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input);finishCreate(f,r.id);const baseline=f.calls.filter(x=>x.method==='put').length,j=f.ctx.saveSalesCompanyChange({draftId:r.id,industrialSector:'App',homepage:''});f.remote.Companies[101].industrialSector='HQ';assert.equal(f.ctx.runSalesJob(j.id).state,'conflict');assert.equal(f.calls.filter(x=>x.method==='put').length,baseline);f.ctx.resolveSalesConflict(j.id,'app');f.remote.Companies[101].industrialSector='HQ again';assert.equal(f.ctx.runSalesJob(j.id).state,'conflict');});
test('resolved edit preserves unrelated HQ fields and verifies result',()=>{const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input);finishCreate(f,r.id);f.remote.Companies[101].iban='unchanged';const j=f.ctx.saveSalesCompanyChange({draftId:r.id,industrialSector:'New',homepage:''});assert.equal(f.ctx.runSalesJob(j.id).state,'synced');assert.equal(f.remote.Companies[101].iban,'unchanged');assert.equal(f.db['sales_companies/101'].company.industrialSector,'New');});
test('own test homepage reaches company and standard address',()=>{const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input);finishCreate(f,r.id);const j=f.ctx.saveSalesCompanyChange({draftId:r.id,industrialSector:'',homepage:'test.invalid'});assert.equal(f.ctx.runSalesJob(j.id).state,'synced');assert.equal(f.remote.Companies[101].homepage,'https://test.invalid');assert.equal(f.remote.Companies[101].defaultAddress.website,'https://test.invalid');assert.equal(f.db['sales_companies/101'].company.homepageDisplay,'https://test.invalid');});
test('another HQ address value blocks a homepage change before writing',()=>{const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input);finishCreate(f,r.id);const j=f.ctx.saveSalesCompanyChange({draftId:r.id,industrialSector:'',homepage:'test.invalid'}),puts=f.calls.filter(c=>c.method==='put').length;f.remote.Companies[101].defaultAddress.website='https://changed.invalid';assert.equal(f.ctx.runSalesJob(j.id).state,'conflict');assert.equal(f.calls.filter(c=>c.method==='put').length,puts);f.ctx.resolveSalesConflict(j.id,'app');assert.equal(f.ctx.runSalesJob(j.id).state,'synced');assert.equal(f.remote.Companies[101].defaultAddress.website,'https://test.invalid');});
test('lost company update response resumes the address update without duplicating the firm',()=>{const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input);finishCreate(f,r.id);const j=f.ctx.saveSalesCompanyChange({draftId:r.id,industrialSector:'',homepage:'test.invalid'}),fetch=f.ctx.UrlFetchApp.fetch;let fail=true;f.ctx.UrlFetchApp.fetch=(url,opt)=>{const out=fetch(url,opt);if(fail&&url.endsWith('/v2/Companies/101')&&opt.method==='put'){fail=false;throw Error('Lost response');}return out;};assert.equal(f.ctx.runSalesJob(j.id).state,'uncertain');assert.equal(f.ctx.reconcileSalesJob(j.id).state,'ready');assert.equal(f.ctx.runSalesJob(j.id).state,'synced');assert.equal(f.calls.filter(x=>x.path==='/v2/Companies'&&x.method==='post').length,1);assert.equal(f.remote.Companies[101].defaultAddress.website,'https://test.invalid');});
test('lost address update response is reconciled from the confirmed HQ address',()=>{const f=fixture(),r=f.ctx.saveSalesTestCompany(f.input);finishCreate(f,r.id);const j=f.ctx.saveSalesCompanyChange({draftId:r.id,industrialSector:'',homepage:'test.invalid'}),fetch=f.ctx.UrlFetchApp.fetch;f.ctx.UrlFetchApp.fetch=(url,opt)=>{const out=fetch(url,opt);if(url.endsWith('/v2/Companies/101/Addresses/501')&&opt.method==='put')throw Error('Lost response');return out;};assert.equal(f.ctx.runSalesJob(j.id).state,'uncertain');assert.equal(f.ctx.reconcileSalesJob(j.id).state,'synced');assert.equal(f.remote.Companies[101].defaultAddress.website,'https://test.invalid');});
test('net revenue includes unpaid sent invoices and subtracts credit notes once',()=>{const f=fixture();const base={companyId:1,projectId:10,currency:'EUR',date:'2026-01-01',documentStatusEntity:{documentStatusType:'Sent'},documentType:'Invoice',netValue:100};const r=f.ctx.salesBelegs_([{...base,id:1},{...base,id:2,documentType:'CreditNote',netValue:-20},{...base,id:3,documentStatusEntity:{documentStatusType:'Draft'}}]);assert.equal(r.accepted.reduce((n,d)=>n+d.cents,0),8000);assert.equal(r.ignored.draft,1);assert.equal(r.complete,true);});
test('unknown status, foreign currency and canceled credit link flag incomplete data',()=>{const f=fixture(),base={id:1,companyId:1,currency:'EUR',date:'2026-01-01',documentType:'Invoice',netValue:100,documentStatusEntity:{documentStatusType:'Canceled'}};const r=f.ctx.salesBelegs_([base,{...base,id:2,documentType:'CreditNote',createdFromId:1,documentStatusEntity:{documentStatusType:'Sent'}},{...base,id:3,documentStatusEntity:{documentStatusType:'Delivered'}}]);assert.equal(r.complete,false);assert.equal(r.issues.length,2);});
test('HQ catalog derives only distinct industry and salutation labels, without storing contacts',()=>{
  const f=fixture();f.remote.Companies={1:{id:1,name:'Synthetic A',industrialSector:'Technik'},2:{id:2,name:'Synthetic B',industrialSector:'Technik'},3:{id:3,name:'Synthetic C',industrialSector:'Medien'}};
  f.remote.ContactPersons={5:{id:5,companyId:1,firstName:'Test',salutation:'Frau'},6:{id:6,companyId:2,salutation:'Herr'}};
  f.ctx.syncSalesCatalog();const c=f.db['sales_meta/catalog'];assert.deepEqual(Array.from(c.industries),['Medien','Technik']);assert.deepEqual(Array.from(c.salutations),['Frau','Herr']);assert.equal(JSON.stringify(c).includes('Synthetic A'),false);assert.equal(JSON.stringify(c).includes('firstName'),false);
});
test('homepage input normalizes missing scheme and writes matching firm and address websites',()=>{
  const f=fixture();let d=f.ctx.salesDraftInput_({...f.input,homepage:'www.test.invalid',industrialSector:'Technik',salutation:'Frau'},f.db['sales_meta/catalog']);
  assert.equal(d.company.homepage,'https://www.test.invalid');assert.equal(d.company.defaultAddress.website,d.company.homepage);assert.equal(d.company.industrialSector,'Technik');assert.equal(d.contact.salutation,'Frau');
  d=f.ctx.salesDraftInput_({...f.input,homepage:'test.invalid'},f.db['sales_meta/catalog']);assert.equal(d.company.homepage,'https://test.invalid');
  assert.throws(()=>f.ctx.salesDraftInput_({...f.input,homepage:'javascript:alert(1)'},f.db['sales_meta/catalog']),/Homepage/);
  assert.throws(()=>f.ctx.salesDraftInput_({...f.input,industrialSector:'Unbekannt'},f.db['sales_meta/catalog']),/Branche/);
  assert.throws(()=>f.ctx.salesDraftInput_({...f.input,salutation:'Unbekannt'},f.db['sales_meta/catalog']),/Anrede/);
  const job=f.ctx.saveSalesTestCompany({...f.input,homepage:'test.invalid'});assert.equal(finishCreate(f,job.id).state,'synced');assert.equal(f.remote.Companies[101].homepage,'https://test.invalid');assert.equal(f.remote.Companies[101].defaultAddress.website,'https://test.invalid');
});
test('new company description is clean after verified creation, while markers prevent duplicate retries',()=>{
  const f=fixture(),r=f.ctx.saveSalesTestCompany({...f.input,description:'Readable description'});assert.equal(finishCreate(f,r.id).state,'synced');
  assert.equal(f.remote.Companies[101].description,'Readable description');assert.equal(f.db['sales_companies/101'].company.description,'Readable description');
  const posts=f.calls.filter(c=>c.path==='/v2/Companies'&&c.method==='post').length;f.ctx.runSalesJob(r.id);assert.equal(f.calls.filter(c=>c.path==='/v2/Companies'&&c.method==='post').length,posts);
});
test('existing own test company can queue and verify marker removal without touching a foreign company',()=>{
  const f=fixture(),r=f.ctx.saveSalesTestCompany({...f.input,description:'Original'});finishCreate(f,r.id);
  f.remote.Companies[101].description='Original\n[Sales-Test '+r.id+']';f.db['sales_companies/101'].company.description=f.remote.Companies[101].description;
  const audit=f.ctx.getSalesTestAudit(r.id);assert.equal(audit.markerPresent,true);
  const cleanup=f.ctx.queueSalesMarkerCleanup(r.id),again=f.ctx.queueSalesMarkerCleanup(r.id);assert.equal(again.id,cleanup.id);
  assert.equal(f.ctx.getSalesJobPreview(cleanup.id).change.description,'Original');assert.equal(f.remote.Companies[101].description,'Original\n[Sales-Test '+r.id+']');
  assert.equal(f.ctx.runSalesJob(cleanup.id).state,'synced');assert.equal(f.remote.Companies[101].description,'Original');assert.equal(f.db['sales_companies/101'].company.description,'Original');
  assert.throws(()=>f.ctx.queueSalesMarkerCleanup(r.id),/fehlt/);
  assert.throws(()=>f.ctx.getSalesTestAudit('foreign'),/Testfirma/);
});
test('lost cleanup response reconciles by verified HQ id and never creates a duplicate',()=>{
  const f=fixture(),r=f.ctx.saveSalesTestCompany({...f.input,description:'Original'});finishCreate(f,r.id);
  f.remote.Companies[101].description='Original\n[Sales-Test '+r.id+']';const c=f.ctx.queueSalesMarkerCleanup(r.id);
  const fetch=f.ctx.UrlFetchApp.fetch;f.ctx.UrlFetchApp.fetch=(url,opt)=>{const out=fetch(url,opt);if(opt.method==='put')throw Error('Lost response');return out;};
  assert.equal(f.ctx.runSalesJob(c.id).state,'uncertain');assert.equal(f.ctx.reconcileSalesJob(c.id).state,'synced');assert.equal(f.remote.Companies[101].description,'Original');
  assert.equal(f.calls.filter(x=>x.path==='/v2/Companies'&&x.method==='post').length,1);
});
test('edition settings use revision check and record before/after changes',()=>{const f=fixture();f.db['sales_editions/coburger-70']={settings:{revision:0,targetCents:null},changes:[]};const input={revision:0,target:'10000',adDeadline:'2026-10-01',printDate:'2026-10-02',releaseDate:'2026-10-03'};f.ctx.saveSalesEditionSettings(input);assert.equal(f.db['sales_editions/coburger-70'].settings.targetCents,1000000);assert.equal(f.db['sales_editions/coburger-70'].changes.length,1);assert.throws(()=>f.ctx.saveSalesEditionSettings(input),/inzwischen/);assert.throws(()=>f.ctx.saveSalesEditionSettings({...input,revision:1,printDate:'2026-09-01'}),/Reihenfolge/);});
test('homepage prefers firm then standard address without changing the writable source field',()=>{
  const {ctx}=fixture(),base={id:1,homepage:'',defaultAddress:{id:10},addresses:[{id:10,website:'https://standard.invalid'},{id:11,website:'https://billing.invalid',standardForDocumentType:'Invoice'}]};
  let c=ctx.salesCompany_(base);assert.equal(c.homepageDisplay,'https://standard.invalid');assert.equal(c.homepage,'');assert.equal(c.homepageSource,'Standardadresse');
  c=ctx.salesCompany_({...base,homepage:' https://company.invalid '});assert.equal(c.homepageDisplay,'https://company.invalid');
  c=ctx.salesCompany_({...base,defaultAddress:null});assert.equal(c.homepageDisplay,'https://billing.invalid');
  c=ctx.salesCompany_({...base,defaultAddress:null,addresses:[{website:'https://a.invalid',standardForDocumentType:'Invoice'},{website:'https://b.invalid',standardForDocumentType:'Invoice'}]});assert.equal(c.homepageDisplay,'');
});
test('dispatch matches only the exact document number and recipient; body stays available',()=>{
  const {ctx}=fixture(),h={id:1,companyId:1,projectId:8,reason:'Rechnung RE-42',content:'Standard-E-Mail',contactHistoryChannel:'SentDocument'},d={id:2,companyId:1,projectId:8,number:'RE-42',documentType:'Invoice',netValue:125,date:'2026-04-01',currency:'EUR'};
  const row=ctx.salesHistory_(h,[d,{...d,id:3,number:'RE-420'},{...d,id:4,companyId:2}],{'8':{name:'Testprojekt'}});
  assert.equal(row.invoice.id,'2');assert.equal(row.invoice.netCents,12500);assert.equal(row.projectName,'Testprojekt');assert.equal(row.content,h.content);
  assert.equal(ctx.salesHistory_({...h,reason:'Rechnung RE-4200'},[d],{}).invoice,undefined);
  assert.equal(ctx.salesHistory_({...h,reason:'Rechnung RE-42. Vielen Dank.'},[d],{}).invoice.id,'2');
  assert.equal(ctx.salesHistory_({...h,reason:'Rechnung RE-42.1'},[d],{}).invoice,undefined);
  assert.equal(ctx.salesHistory_(h,[{...d,projectId:9}],{}).invoice,undefined);
});
test('ambiguous or absent invoice references never borrow the project total',()=>{
  const {ctx}=fixture(),h={companyId:1,projectId:8,reason:'Rechnung RE-42',contactHistoryChannel:'SentDocument'},d={id:1,companyId:1,projectId:8,number:'RE-42',documentType:'Invoice',netValue:100};
  assert.equal(ctx.salesHistory_(h,[d,{...d,id:2}],{}).documentMatch,'ambiguous');
  assert.equal(ctx.salesHistory_({...h,reason:'Rechnungsversand'},[d],{}).invoice,undefined);
  assert.equal(ctx.salesHistory_({...h,reason:'Telefonat',contactHistoryChannel:'Call'},[d],{}).documentDispatch,false);
  assert.equal(ctx.salesHistory_({...h,reason:'Versand',content:'Rechnung Nr. RE-42'},[d],{}).invoice.id,'1');
});
test('planned revenues preserve currencies and distinguish projection, billed and unknown rows',()=>{
  const {ctx}=fixture(),r=ctx.salesPlannedRevenue_({id:1,netTotal:200,currency:'USD',status:'Planned',interval:'Monthly',startDate:'2026-01-01',invoiceDate:'DueDate',estimations:[{estimatedDueDate:'2026-02-10',estimatedNetValue:200,documentId:0,documentStatus:'Planned'},{estimatedDueDate:'2026-01-10',estimatedNetValue:190,documentId:15,documentStatus:'Paid'},{estimatedNetValue:null}]});
  assert.equal(r.currency,'USD');assert.equal(r.estimations[0].cents,20000);assert.equal(r.estimations[0].documentId,0);assert.equal(r.estimations[1].documentId,15);assert.equal(r.estimations[2].documentId,null);assert.equal(r.estimations[2].cents,null);assert.equal(r.invoiceDateRule,'DueDate');
  assert.equal(ctx.salesDate_('2026-02-30'),null);assert.equal(ctx.salesDate_('0001-01-01T00:00:00'),null);
});
function importFixture(){
  const f=fixture();f.db['sales_editions/coburger-70']={companies:[{id:'1'}]};f.remote.Companies[1]={id:1,name:'Synthetic only',defaultAddress:{website:'https://synthetic.invalid'}};
  f.remote.Projects={8:{id:8,companyId:1,name:'Completed test',number:'8',status:'Abgeschlossen',actualFinishDate:'2026-02-03T00:00:00Z'},9:{id:9,companyId:1,name:'Open test',number:'9',status:'Läuft',plannedFinishDate:'2026-12-01'},10:{id:10,companyId:99,name:'Shared test'}};
  f.remote.Documents={21:{id:21,companyId:1,projectId:10,number:'RE-21',documentType:'Invoice',date:'2026-02-01',netValue:100,currency:'EUR',documentStatusEntity:{documentStatusType:'Paid'}}};
  f.remote.ContactHistories[31]={id:31,companyId:1,projectId:10,reason:'Rechnung RE-21',content:'Test mail',contactHistoryChannel:'SentDocument'};
  f.remote.PlannedRevenues={41:{id:41,companyId:1,projectId:9,netTotal:250,currency:'EUR',status:'Planned',estimations:[{documentId:0,documentStatus:'Planned',estimatedDueDate:'2026-11-01',estimatedNetValue:250}]}};
  return f;
}
test('detail import keeps shared invoice projects and fetches plans only for open direct projects',()=>{
  const f=importFixture();f.ctx.syncSalesCompany('1');const value=f.db['sales_companies/1'];
  assert.equal(value.company.homepageDisplay,'https://synthetic.invalid');assert.equal(value.histories[0].projectName,'Shared test');assert.equal(value.histories[0].invoice.netCents,10000);
  assert.equal(value.projects[0].actualFinishDate,'2026-02-03');assert.equal(value.projects[1].plannedRevenues[0].estimations[0].date,'2026-11-01');assert.equal(value.projects.length,2);
  const paths=f.calls.filter(c=>c.path.includes('PlannedRevenues')).map(c=>decodeURIComponent(c.path));assert.equal(paths.length,1);assert.ok(paths[0].includes('$filter=projectId eq 9'));assert.ok(paths[0].includes('expand=Estimations'));assert.ok(f.calls.every(c=>c.method==='get'));
  const n=f.calls.length;f.ctx.getSalesCompany('1');assert.equal(f.calls.length,n);
});
test('failed or foreign plan import leaves the last Firebase snapshot intact',()=>{
  for(const mode of ['failure','foreign']){const f=importFixture(),old={sentinel:true};f.db['sales_companies/1']=old;const original=f.ctx.salesHqGet_;
    f.ctx.salesHqGet_=path=>{if(path.includes('PlannedRevenues')){if(mode==='failure')throw new Error('HTTP 403');return {data:[{id:999,projectId:999}],headers:{}};}return original(path);};
    assert.throws(()=>f.ctx.syncSalesCompany('1'),/Planumsätze/);assert.deepEqual(f.db['sales_companies/1'],old);
  }
});
test('UI keeps sent email collapsed and separates billed and projected planning entries',()=>{
  const html=fs.readFileSync(__dirname+'/Sales.template.html','utf8'),script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
  const helpers=script.slice(0,script.indexOf('  let state='))+'globalThis.rows={historyRow,projectRow,plannedRevenueRow};})();';
  const sandbox={document:{getElementById:()=>({})}};vm.runInNewContext(helpers,sandbox);
  const h=sandbox.rows.historyRow({contactHistoryChannel:'SentDocument',projectName:'Test',content:'<img src=x onerror=alert(1)>',contactOn:'2026-02-01',invoice:{number:'RE-1',currency:'EUR',netCents:10000}});
  assert.ok(h.includes('<details>'));assert.ok(!h.includes('<details open'));assert.ok(h.indexOf('&lt;img')>h.indexOf('<details>'));assert.ok(!h.includes('<img'));
  const p=sandbox.rows.projectRow({id:'1',name:'Test',status:'Läuft',complete:true,revenueCents:5000,plannedRevenues:[{status:'Planned',currency:'EUR',interval:'Monthly',estimations:[{documentId:0,status:'Planned',date:'2026-11-01',cents:25000},{documentId:12,status:'Paid',date:'2026-10-01',cents:20000}]}]});
  assert.ok(p.includes('01.11.2026'));assert.ok(p.indexOf('01.10.2026')>p.indexOf('<details'));assert.ok(p.includes('250,00 EUR netto'));assert.ok(!p.includes('450,00'));
});
test('UI detects an old backend and displays its release before permitting actions',()=>{
  const html=fs.readFileSync(__dirname+'/Sales.template.html','utf8'),script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
  const preboot=script.slice(0,script.lastIndexOf("  act(async()=>{state=await rpc('getSalesState');});"));
  assert.ok(preboot.length>1000);
  const root={dataset:{},innerHTML:'',addEventListener(){}};
  const sandbox={document:{getElementById:()=>root},localStorage:{getItem:()=>null},setInterval(){}};
  vm.runInNewContext(preboot+"state={release:'previous'};render();})();",sandbox);
  assert.ok(root.innerHTML.includes('Dateien haben unterschiedliche Stände'));
  assert.ok(root.innerHTML.includes('Server: previous'));
  assert.ok(!root.innerHTML.includes('data-action="run-job"'));
});
test('UI uses catalog dropdowns for industry and salutation and hides deferred custom fields',()=>{
  const html=fs.readFileSync(__dirname+'/Sales.template.html','utf8'),script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
  const preboot=script.slice(0,script.lastIndexOf("  act(async()=>{state=await rpc('getSalesState');});"));
  const root={dataset:{},innerHTML:'',addEventListener(){}};
  const sandbox={document:{getElementById:()=>root},localStorage:{getItem:()=>null},setInterval(){}};
  vm.runInNewContext(preboot+"state={release:APP_RELEASE,catalog:{industries:['Technik'],salutations:['Frau'],users:[],types:[],subsystems:[],fields:[]},user:{email:'test@example.invalid',admin:true},drafts:[],jobs:[],edition:null};globalThis.form=newCompany();})();",sandbox);
  assert.ok(sandbox.form.includes('<select name="industrialSector">'));
  assert.ok(sandbox.form.includes('<select name="salutation">'));
  assert.ok(sandbox.form.includes('<select name="salutationForm">'));
  assert.match(sandbox.form,/<option value="Formal" selected>Formell<\/option>/);
  assert.ok(sandbox.form.includes('Technik'));
  assert.ok(!sandbox.form.includes('Kundenklassifizierung'));
  assert.ok(!sandbox.form.includes('type="url"'));
});
test('UI shows a new Firebase company and its contact before HQ has assigned an ID',()=>{
  const html=fs.readFileSync(__dirname+'/Sales.template.html','utf8'),script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
  const preboot=script.slice(0,script.lastIndexOf("  act(async()=>{state=await rpc('getSalesState');});"));
  const root={dataset:{},innerHTML:'',addEventListener(){}},company={id:'draft_test-1',localDraftId:'test-1',hqId:null,name:'TEST Lokal',industrialSector:'Technik',description:'',homepageDisplay:'https://test.invalid',companyTypes:[{name:'Interessent'}],responsibleUsers:[{firstName:'Test'}],defaultAddress:{street:'Testweg',houseNumber:'1',zipCode:'00000',city:'Testort',country:'DE'},customFields:[],syncState:'pending'};
  const contact={firstName:'Ada',lastName:'Test',salutation:'Frau',eMail:'ada@example.invalid'};
  const state={release:'2026-09-26-r9',user:{email:'test@example.invalid',admin:true},edition:null,catalog:{},drafts:[{id:'test-1',company:{name:company.name},contact}],localCompanies:[company],jobs:[{id:'test-1',kind:'createCompany',state:'pending',name:company.name,createdAt:'2026-09-26'}]};
  const sandbox={document:{getElementById:()=>root},localStorage:{getItem:()=>null},setInterval(){}};
  vm.runInNewContext(preboot+`state=${JSON.stringify(state)};view='customers';render();globalThis.customers=root.innerHTML;view='contacts';render();globalThis.contacts=root.innerHTML;selected='draft_test-1';detail={company:${JSON.stringify(company)},contacts:[${JSON.stringify(contact)}]};view='company';render();globalThis.companyView=root.innerHTML;})();`,sandbox);
  assert.ok(sandbox.customers.includes('TEST Lokal'));assert.ok(sandbox.customers.includes('Nur in Firebase'));
  assert.ok(sandbox.contacts.includes('Ada Test'));assert.ok(sandbox.contacts.includes('TEST Lokal öffnen'));
  assert.ok(sandbox.companyView.includes('Ada Test'));assert.ok(sandbox.companyView.includes('1. Firma in HQ anlegen und bestätigen'));
});
test('UI shows the explicit second step only after confirmation, and no write button after HTTP errors',()=>{
  const html=fs.readFileSync(__dirname+'/Sales.template.html','utf8'),script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
  const preboot=script.slice(0,script.lastIndexOf("  act(async()=>{state=await rpc('getSalesState');});"));
  const sandbox={document:{getElementById:()=>({dataset:{},addEventListener(){}})},localStorage:{getItem:()=>null},setInterval(){}};
  vm.runInNewContext(preboot+`state={user:{admin:true}};globalThis.first=createButton({id:'test',state:'pending',nextStep:'company'});globalThis.second=createButton({id:'test',state:'companyConfirmed',nextStep:'contact'});globalThis.blocked=createButton({id:'test',state:'uncertain',nextStep:'contact'});})();`,sandbox);
  assert.ok(sandbox.first.includes('data-action="create-company"'));assert.ok(!sandbox.first.includes('create-contact'));
  assert.ok(sandbox.second.includes('2. Ansprechpartner nach HQ übertragen'));assert.ok(sandbox.second.includes('data-action="create-contact"'));assert.equal(sandbox.blocked,'');
});
test('email preview shows the target person, address and action in readable escaped form',()=>{
  const html=fs.readFileSync(__dirname+'/Sales.template.html','utf8'),scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)],script=scripts.at(-1)[1];
  const preboot=script.slice(0,script.lastIndexOf("  act(async()=>{state=await rpc('getSalesState');});"));
  const sandbox={document:{getElementById:()=>({dataset:{},addEventListener(){}})},localStorage:{getItem:()=>null},setInterval(){}};
  vm.runInNewContext(preboot+`state={user:{admin:true}};preview={job:{id:'email-1',draftId:'test-1',kind:'contactEmail',state:'pending',name:'TEST Example'},contact:{firstName:'Ada',lastName:'Example'},change:{eMail:'ada@example.invalid',contactAddress:{street:'<Testweg>',city:'Testort',country:'DE'},addressNote:'Vorhandene Kontaktanschrift bleibt erhalten.'}};globalThis.output=previewPage();})();`,sandbox);
  for(const value of ['Ada Example','ada@example.invalid','&lt;Testweg&gt;','E-Mail jetzt in HQ ergänzen','Zur Testfirma'])assert.ok(sandbox.output.includes(value));
  assert.ok(!sandbox.output.includes('"contactAddress"'));
  vm.runInNewContext(preboot+`state={user:{admin:true}};preview={job:{id:'email-1',draftId:'test-1',kind:'contactEmail',state:'synced',message:'E-Mail und erhaltene Kontaktdaten in HQ bestätigt.'},contact:{},change:{contactAddress:{}}};globalThis.output=previewPage();})();`,sandbox);
  assert.ok(sandbox.output.includes('Status: Bestätigt'));assert.ok(sandbox.output.includes('E-Mail und erhaltene Kontaktdaten in HQ bestätigt.'));assert.ok(!sandbox.output.includes('data-action="run-job"'));
});
test('UI script compiles and has no demo storage or customer fixtures',()=>{const html=fs.readFileSync(__dirname+'/../hq-benchmark/Sales.html','utf8');for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);for(const forbidden of ['sales-markatus-demo-v1','Atelier am Markt','Mara Beispiel','seedBookings'])assert.ok(!html.includes(forbidden));});
test('startup guard replaces a stalled static screen with a useful release hint',()=>{
  const html=fs.readFileSync(__dirname+'/../hq-benchmark/Sales.html','utf8');
  const guard=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
  const pre={textContent:''},root={innerHTML:'App startet',querySelector:()=>pre},timers=[],listeners={};
  const window={addEventListener:(name,fn)=>listeners[name]=fn,setTimeout:fn=>timers.push(fn)};
  vm.runInNewContext(guard,{window,document:{getElementById:()=>root}});
  assert.equal(timers.length,1);
  timers[0]();
  assert.ok(root.innerHTML.includes('App-Start fehlgeschlagen'));
  assert.ok(root.innerHTML.includes('2026-09-26-r9'));
  window.__salesStarted=true;root.innerHTML='App läuft';timers[0]();
  assert.equal(root.innerHTML,'App läuft');
});
test('startup guard preserves the original syntax error as text through the timeout',()=>{
  const html=fs.readFileSync(__dirname+'/../hq-benchmark/Sales.html','utf8');
  const guard=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
  const pre={textContent:''},root={innerHTML:'',querySelector:()=>pre},timers=[],listeners={};
  const window={addEventListener:(name,fn)=>listeners[name]=fn,setTimeout:fn=>timers.push(fn)};
  vm.runInNewContext(guard,{window,document:{getElementById:()=>root}});
  listeners.error({message:'Invalid token <img src=x>',lineno:86,colno:244});
  assert.equal(pre.textContent,'Invalid token <img src=x> · Zeile 86, Spalte 244');
  assert.ok(!root.innerHTML.includes('<img'));
  timers[0]();assert.ok(pre.textContent.startsWith('Invalid token'));
});
test('browser homepage normalization handles bare domains, whitespace and existing schemes',()=>{
  const html=fs.readFileSync(__dirname+'/Sales.template.html','utf8'),script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
  const helpers=script.slice(0,script.indexOf('  let state='))+'globalThis.normalize=normalizeHomepageInput;})();';
  const sandbox={document:{getElementById:()=>({})}};vm.runInNewContext(helpers,sandbox);
  for(const [input,expected] of [['  test.de  ','https://test.de'],['www.test.de','https://www.test.de'],['https://test.de/path','https://test.de/path'],['http://test.de','http://test.de'],['   ','']])assert.equal(sandbox.normalize(input),expected);
});
console.log(`${count} meaningful checks passed.`);
