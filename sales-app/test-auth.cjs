const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
function authFixture({legacy=false}={}){
 const db=new Map(),tokens=new Map(),cache=new Map(),calls=[];let tick=0;
 const props={SALES_AUTH_MODE:'firebase',FIREBASE_PROJECT_ID:'sales-markatus',SALES_FIREBASE_WEB_API_KEY:'AIza'+'a'.repeat(35),SALES_AUTH_ORIGIN:'https://sales-markatus.firebaseapp.com',SALES_AUTH_OWNER_UID:'owner',SALES_ADMIN_EMAIL:'owner@example.invalid',SALES_ALLOWED_EMAILS:'owner@example.invalid',SALES_AUTH_ALLOWED_ORIGINS:JSON.stringify(['https://fixture-script.googleusercontent.com']),SALES_APP_URL:'https://script.google.com/macros/s/existing/exec'};
 const response=(code,data)=>({getResponseCode:()=>code,getContentText:()=>JSON.stringify(data)});
 function transport(url,opt={}){
  calls.push({url,method:opt.method||'get'});
  if(url.startsWith('https://identitytoolkit.googleapis.com/')){const token=JSON.parse(opt.payload).idToken;return tokens.has(token)?response(200,{users:[tokens.get(token)]}):response(400,{error:{message:'INVALID_ID_TOKEN'}});}
  if(url.startsWith('https://securetoken.googleapis.com/'))return response(400,{});
  const path=url.split('/documents/')[1];
  if(url.endsWith(':runQuery')){
   const q=JSON.parse(opt.payload).structuredQuery,col=q.from[0].collectionId,limit=Number(q.limit),before=Date.parse(q.where.fieldFilter.value.timestampValue);
   const rows=[...db.entries()].filter(([p,d])=>p.startsWith(col+'/')&&!p.slice(col.length+1).includes('/')&&d.fields?.ttl&&Date.parse(d.fields.ttl.timestampValue)<before).slice(0,limit)
    .map(([p,d])=>({document:{name:'projects/sales-markatus/databases/(default)/documents/'+p,fields:clone(d.fields),updateTime:d.updateTime}}));
   return response(200,rows.length?rows:[{readTime:'synthetic'}]);
  }
  if(url.endsWith(':commit')){
   const writes=JSON.parse(opt.payload).writes;
   for(const w of writes){const p=(w.verify||w.update?.name||w.delete).split('/documents/')[1],prior=db.get(p),condition=w.currentDocument;
    if(condition&&(condition.exists===false&&prior||condition.updateTime&&condition.updateTime!==prior?.updateTime))throw Error('Precondition failed');}
   for(const w of writes)if(w.delete)db.delete(w.delete.split('/documents/')[1]);
   for(const w of writes)if(w.update){const p=w.update.name.split('/documents/')[1];db.set(p,{...clone(w.update),updateTime:'v'+(++tick)});}
   return response(200,{writeResults:writes.map(()=>({}))});
  }
  if(opt.method==='get'&&db.has(path))return response(200,db.get(path));
  return response(404,{});
 }
 const ctx={console,Date,JSON,Math,Object,Array,Set,Map,Number,String,Error,Buffer,
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null,setProperty:(k,v)=>props[k]=v})},
  Session:{getActiveUser:()=>({getEmail:()=>props.SALES_ADMIN_EMAIL})},
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},
  Utilities:{DigestAlgorithm:{SHA_256:'sha256'},getUuid:()=>crypto.randomUUID(),computeDigest:(_,v)=>Array.from(crypto.createHash('sha256').update(String(v)).digest()),base64EncodeWebSafe:v=>Buffer.from(v).toString('base64url'),base64DecodeWebSafe:v=>Buffer.from(v,'base64url'),newBlob:v=>({getDataAsString:()=>Buffer.from(v).toString(),getBytes:()=>Array.from(Buffer.from(v))})},
  UrlFetchApp:{fetch:transport},pilotUrl_:(p,path)=>'https://firestore.googleapis.com/v1/projects/'+p+'/databases/(default)/documents/'+path,
  pilotCall_:(url,opt)=>{const r=transport(url,opt);if(r.getResponseCode()!==200)throw Error('HTTP '+r.getResponseCode());return JSON.parse(r.getContentText());}};
 if(legacy)delete props.SALES_AUTH_MODE;
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../hq-benchmark/SalesBackend.gs','utf8').replace(/const SALES_AUTH_REQUIRE_FIREBASE=(true|false);/,'const SALES_AUTH_REQUIRE_FIREBASE='+(!legacy)+';'),ctx);
 ctx.salesContext_=()=>({project:'sales-markatus',token:'server-only'});
 const put=(kind,id,value)=>{db.set('sales_auth'+kind+'/'+id,{fields:{payload:{stringValue:JSON.stringify(value)}},updateTime:'v'+(++tick)});};
 const user=(uid='reader',permissions={},status='active')=>{put('users',uid,{uid,email:uid+'@example.invalid',permissions:ctx.salesPermissions_(permissions,uid==='owner'),status,revision:1,sessionEpoch:0});return status==='active'?ctx.salesAuthPrincipal_({uid,email:uid+'@example.invalid'}):null;};
 const token=(uid='reader',overrides={},account={})=>{const claims={sub:uid,aud:'sales-markatus',iss:'https://securetoken.google.com/sales-markatus',email_verified:true,auth_time:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,...overrides};const t='header.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.'+crypto.randomUUID();tokens.set(t,{localId:uid,email:uid+'@example.invalid',emailVerified:true,validSince:'0',...account});return t;};
 const session=(uid='reader',extra={})=>{const s=crypto.randomBytes(32).toString('hex'),t=token(uid);put('sessions',ctx.salesAuthHash_(s),{uid,email:uid+'@example.invalid',idToken:t,refreshToken:'r'.repeat(50),tokenExpiresAt:Date.now()+3600000,expiresAt:Date.now()+8*3600000,sessionEpoch:0,...extra});return s;};
 const request=u=>{ctx.fixtureUser=u;vm.runInContext('salesAuthRequest_={user:fixtureUser}',ctx);};
 user('owner');calls.length=0;return {ctx,props,db,tokens,calls,put,user,token,session,request};
}
let count=0;function test(name,fn){fn();console.log('PASS '+name);count++;}
if(require.main===module){
 test('public build never falls back to legacy email access when mode is missing or invalid',()=>{const f=authFixture();delete f.props.SALES_AUTH_MODE;assert.equal(f.ctx.salesAuthEnabled_(),true);assert.throws(()=>f.ctx.getSalesLeanState(),/AUTH_REQUIRED/);f.props.SALES_AUTH_MODE='legacy';assert.throws(()=>f.ctx.getSalesLeanState(),/AUTH_REQUIRED/);});
 test('anonymous page renders only login configuration and never reads business data',()=>{
  const f=authFixture();let reads=0;f.ctx.Session.getActiveUser=()=>{throw Error('No Google session');};f.ctx.salesRead_=()=>{reads++;throw Error('Business data forbidden');};
  const output=content=>({getContent:()=>content,setTitle(){return this;},addMetaTag(){return this;}});f.ctx.HtmlService={createHtmlOutput:output,createHtmlOutputFromFile:()=>output('const config="AUTH_RUNTIME_CONFIG";')};
  const page=f.ctx.salesPage_({parameter:{}}).getContent();assert.match(page,/"enabled":true/);assert.ok(!page.includes('owner@example.invalid'));assert.equal(reads,0);delete f.props.SALES_FIREBASE_WEB_API_KEY;assert.match(f.ctx.salesPage_({parameter:{}}).getContent(),/keine Kundendaten/);assert.equal(reads,0);
 });
 test('unknown permissions and client-invented admin/deletion grants are rejected',()=>{const f=authFixture();for(const p of [{admin:true},{'company.delete':true},{'company.edit':'true'}])assert.throws(()=>f.ctx.salesPermissions_(p));const p=f.ctx.salesPermissions_({'contact.create':true});assert.equal(p['company.edit'],false);assert.equal(p['contact.create'],true);assert.equal(p['customers.read'],true);});
 test('Google validates the exact token before any decoded identity is trusted',()=>{const f=authFixture();assert.throws(()=>f.ctx.salesAuthIdentity_('header.'+Buffer.from('{"sub":"owner"}').toString('base64url')+'.forged'),/AUTH_REQUIRED/);for(const [claims,account] of [[{aud:'other'},{}],[{iss:'other'},{}],[{exp:0},{}],[{email_verified:false},{}],[{sub:'owner'},{}],[{}, {emailVerified:false}],[{}, {disabled:true}],[{auth_time:1},{validSince:'2'}]])assert.throws(()=>f.ctx.salesAuthIdentity_(f.token('reader',claims,account)),/AUTH_REQUIRED/);assert.equal(f.ctx.salesAuthIdentity_(f.token()).uid,'reader');});
 test('all legacy data and write RPCs reject direct access before data or HQ calls',()=>{const f=authFixture();let reads=0;f.ctx.salesRead_=()=>{reads++;};for(const name of ['getSalesState','getSalesLeanState','getSalesLeanCompany','getSalesLeanView','getSalesV1State','getSalesV1Company','saveSalesAccess','saveSalesCompany','saveSalesCompanyChange','saveSalesCommunication','createSalesCustomerContact','saveSalesEntityChange','getSalesEditor','startSalesSync','getSalesJobInspection','runSalesJob','setupSalesSyncWorker'])assert.throws(()=>f.ctx[name]({}),/AUTH_REQUIRED/,name);assert.equal(reads,0);assert.equal(f.calls.length,0);});
 test('unlisted, disabled, changed-email, expired, revoked and invalid sessions fail closed',()=>{for(const kind of ['missing','disabled','email','expired','epoch','forged']){const f=authFixture();f.user();const s=f.session('reader',kind==='expired'?{expiresAt:0}:kind==='epoch'?{sessionEpoch:99}:kind==='forged'?{idToken:'forged'}:{});if(kind==='missing')f.db.delete('sales_authusers/reader');if(kind==='disabled')f.user('reader',{},'disabled');if(kind==='email')f.put('users','reader',{email:'other@example.invalid',status:'active'});assert.throws(()=>f.ctx.salesAuthVerify_(s),/AUTH_/);}});
 test('reader can read only allowed routes and cannot write through direct or lean wrappers',()=>{const f=authFixture(),u=f.user();f.request(u);f.ctx.getSalesLeanCompany=()=>({company:{id:1,name:'Synthetic'}});assert.equal(f.ctx.salesAuthDispatch_('getSalesLeanCompany',[1]).company.id,1);for(const [name,args] of [['getSalesJobInspection',['synthetic']],['getSalesLeanView',['invoices']],['getSalesLeanView',['contacts']],['saveSalesCommunication',[{}]],['saveSalesEntityChange',[{entity:'company'}]],['createSalesUserInvitation',[{}]],['mutateSalesLean',['saveSalesCompanyChange',[{}]]],['mutateSalesLean',['mutateSalesLean',[]]],['salesHqGet_',['/v2/Companies']],['constructor',[]]])assert.throws(()=>f.ctx.salesAuthDispatch_(name,args),/AUTH_DENIED/);});
 test('filter diagnosis never probes HQ or reads durable run data for a nonadministrator',()=>{const f=authFixture(),u=f.user('reader',{'sync.read':true});f.request(u);f.ctx.salesLeanSyncStatus_=()=>({paused:true,id:'synthetic',revision:1,errors:[{message:'Unternehmen: HQ hat den Änderungsfilter abgelehnt'}]});f.ctx.salesRead_=()=>{throw Error('Durable run read forbidden');};f.calls.length=0;const out=f.ctx.salesAuthDispatch_('getSalesSyncStatus',[]);assert.equal(out.errors.length,1);assert.equal(f.calls.length,0);});
 test('create-only grants cannot edit or delete; nested financial fields cannot bypass wrappers',()=>{const f=authFixture(),u=f.user('reader',{'company.create':true,'company.edit':true});f.request(u);for(const [name,args] of [['saveSalesEntityChange',[{entity:'company',change:{iban:'secret'}}]],['saveSalesEntityChange',[{entity:'company',change:{custom:{price:99}}}]],['mutateSalesLean',['saveSalesCompanyChange',[{change:{vatId:'secret'}}]]],['saveSalesCompany',[{company:{paymentTerm:'secret'}}]]])assert.throws(()=>f.ctx.salesAuthDispatch_(name,args),/Finanzfelder/);f.request(f.user('reader',{'company.create':true}));assert.throws(()=>f.ctx.salesAuthDispatch_('saveSalesEntityChange',[{entity:'company'}]),/AUTH_DENIED/);});
 test('finance, documents, projects, jobs and server identity records are removed recursively',()=>{const f=authFixture(),u=f.user();const raw={company:{id:1,name:'Synthetic',iban:'secret',defaultAddress:{city:'Place',paymentTerm:'secret'}},histories:[{content:'Note'},{documentDispatch:true,content:'Invoice secret'},{contactHistoryChannel:'SentDocument',content:'Invoice secret'}],projects:[{name:'Hidden'}],revenueCents:50,patch:{job:{secret:true},draft:{secret:true},localCompany:{name:'New'}},record:{idToken:'secret'},editions:[{id:'x',projectName:'Hidden',settings:{targetCents:200,adDeadline:'2026-10-23'}}]};const text=JSON.stringify(f.ctx.salesAuthFilter_(raw,u,'getSalesLeanCompany'));assert.ok(!/secret|Hidden|targetCents|revenueCents|projectName/.test(text));assert.match(text,/Note/);assert.match(text,/adDeadline/);assert.deepEqual(clone(f.ctx.salesAuthFilter_(raw,u,'read').projects),[]);});
 test('origin, PKCE, state, age and replay protect the login handshake',()=>{const f=authFixture();f.user();const verifier='v'.repeat(64),challenge=crypto.createHash('sha256').update(verifier).digest('base64url'),state='s'.repeat(40);assert.throws(()=>f.ctx.beginSalesLogin({origin:'https://attacker.invalid',challenge,state}),/AUTH_REQUIRED/);const begin=f.ctx.beginSalesLogin({origin:'https://fixture-script.googleusercontent.com',challenge,state});const input={attempt:begin.attempt,verifier,state,idToken:f.token(),refreshToken:'r'.repeat(50)};assert.throws(()=>f.ctx.finishSalesLogin({...input,state:'x'.repeat(40)}),/AUTH_REQUIRED/);assert.throws(()=>f.ctx.finishSalesLogin({...input,verifier:'x'.repeat(64)}),/AUTH_REQUIRED/);assert.throws(()=>f.ctx.finishSalesLogin({...input,refreshToken:''}),/AUTH_REQUIRED/);const result=f.ctx.finishSalesLogin(input);assert.equal(result.user.uid,'reader');assert.equal(result.expiresAt,f.ctx.salesAuthRead_('sessions',f.ctx.salesAuthHash_(result.session)).expiresAt);assert.ok(result.expiresAt>Date.now()+7*3600000&&result.expiresAt<=Date.now()+8*3600000);assert.ok(!JSON.stringify(result).includes('refreshToken'));assert.throws(()=>f.ctx.finishSalesLogin(input),/AUTH_REQUIRED/);assert.equal(f.ctx.salesAuthVerify_(result.session).uid,'reader');});
 test('reused invitation logs an activated account in with current rights and cannot reactivate a disabled account',()=>{
  const f=authFixture();f.request(f.user('owner'));const invite=f.ctx.createSalesUserInvitation({email:'new@example.invalid',permissions:{}}),invitation=new URL(invite.url).searchParams.get('invite');
  const login=uid=>{const verifier='v'.repeat(64),state='s'.repeat(40),challenge=crypto.createHash('sha256').update(verifier).digest('base64url'),begin=f.ctx.beginSalesLogin({origin:'https://fixture-script.googleusercontent.com',challenge,state});return f.ctx.finishSalesLogin({attempt:begin.attempt,verifier,state,idToken:f.token(uid),refreshToken:'r'.repeat(50),invitation});};
  const first=login('new');assert.equal(first.user.permissions['contact.create'],false);
  f.request(f.ctx.salesAuthPrincipal_({uid:'owner',email:'owner@example.invalid'}));f.ctx.updateSalesUser({uid:'new',revision:1,status:'active',permissions:{'contact.create':true}});
  assert.throws(()=>f.ctx.salesAuthVerify_(first.session),/gesperrt/);f.calls.length=0;
  const second=login('new');assert.equal(second.user.permissions['contact.create'],true);assert.equal(second.user.revision,2);assert.equal(f.calls.some(c=>c.url.includes('/sales_authinvites/')),false,'Activated users do not reread invitations');
  assert.throws(()=>login('other'),/Einladung/);f.user('new',{},'disabled');assert.throws(()=>login('new'),/Zugriff nicht freigegeben/);
 });
 test('outdated client receives update notice without auth database accesses or business reads',()=>{const f=authFixture(),response=f.ctx.beginSalesLogin({origin:'https://fixture-script.googleusercontent.com',challenge:'c'.repeat(43),state:'s'.repeat(40),release:'old'});assert.equal(response.reloadRequired,true);assert.equal(f.ctx.finishSalesLogin({release:'old'}).reloadRequired,true);assert.equal(f.calls.length,0);});
 test('token refresh after one hour preserves the original server session deadline',()=>{
  const f=authFixture();f.ctx.LockService.getScriptLock=()=>{throw Error('HQ owns the script lock');};f.user();const authTime=Math.floor(Date.now()/1000)-3601,refreshed=f.token('reader',{auth_time:authTime}),expired=f.token('reader',{auth_time:authTime,exp:Math.floor(Date.now()/1000)-1}),deadline=Date.now()+7*3600000,session=f.session('reader',{idToken:expired,tokenExpiresAt:Date.now()-1,expiresAt:deadline}),fetch=f.ctx.UrlFetchApp.fetch;
  f.ctx.UrlFetchApp.fetch=(url,opt)=>url.startsWith('https://securetoken.googleapis.com/')?{getResponseCode:()=>200,getContentText:()=>JSON.stringify({user_id:'reader',project_id:'539269099884',id_token:refreshed,refresh_token:'n'.repeat(50),expires_in:'3600'})}:fetch(url,opt);
  assert.equal(f.ctx.salesAuthVerify_(session).uid,'reader');assert.equal(f.ctx.salesAuthRead_('sessions',f.ctx.salesAuthHash_(session)).expiresAt,deadline);
 });
 test('login succeeds while HQ owns the global lock and still consumes each attempt once',()=>{
  const f=authFixture();f.user();f.ctx.LockService.getScriptLock=()=>{throw Error('HQ owns the script lock');};const verifier='v'.repeat(64),state='s'.repeat(40),challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
  const begin=f.ctx.beginSalesLogin({origin:'https://fixture-script.googleusercontent.com',challenge,state}),input={attempt:begin.attempt,verifier,state,idToken:f.token(),refreshToken:'r'.repeat(50)};
  const result=f.ctx.finishSalesLogin(input);assert.equal(result.user.uid,'reader');assert.equal(f.ctx.salesAuthVerify_(result.session).uid,'reader');assert.throws(()=>f.ctx.finishSalesLogin(input),/ungültig|abgelaufen/);
 });
 test('global login quota uses compare-and-set and retries only bounded storage conflicts',()=>{
  const f=authFixture(),commit=f.ctx.salesAuthCommit_;let clash=true;f.ctx.salesAuthCommit_=(entries,...rest)=>{if(clash){clash=false;f.put('attempts',entries[0].id,{count:1});throw Error('Firestore HTTP 409');}return commit(entries,...rest);};
  f.ctx.salesAuthThrottle_('begin',2);const path=[...f.db.keys()].find(k=>k.includes('/rate-begin-'));assert.equal(JSON.parse(f.db.get(path).fields.payload.stringValue).count,2);assert.throws(()=>f.ctx.salesAuthThrottle_('begin',2),/Zu viele/);
  let tries=0;f.ctx.salesAuthCommit_=()=>{tries++;throw Error('Firestore HTTP 412');};assert.throws(()=>f.ctx.salesAuthThrottle_('finish',30),/gleichzeitige/);assert.equal(tries,3);
 });
 test('concurrent session refresh adopts the committed winner and never revives logout',()=>{
  for(const disabled of [false,true]){
   const f=authFixture();f.user();const session=f.session('reader',{tokenExpiresAt:0}),id=f.ctx.salesAuthHash_(session),deadline=f.ctx.salesAuthRead_('sessions',id).expiresAt,refreshed=f.token(),fetch=f.ctx.UrlFetchApp.fetch,commit=f.ctx.salesAuthCommit_;
   f.ctx.UrlFetchApp.fetch=(url,opt)=>url.startsWith('https://securetoken.googleapis.com/')?{getResponseCode:()=>200,getContentText:()=>JSON.stringify({user_id:'reader',project_id:'sales-markatus',id_token:refreshed,refresh_token:'n'.repeat(50),expires_in:3600})}:fetch(url,opt);
   f.ctx.salesAuthCommit_=(entries,...rest)=>{if(entries[0].kind==='sessions'){const current=f.ctx.salesAuthRead_('sessions',id);f.put('sessions',id,{...current,idToken:refreshed,disabled,tokenExpiresAt:Date.now()+3600000});throw Error('Firestore HTTP 409');}return commit(entries,...rest);};
   if(disabled)assert.throws(()=>f.ctx.salesAuthVerify_(session),/AUTH_REQUIRED/);else assert.equal(f.ctx.salesAuthVerify_(session).uid,'reader');assert.equal(f.ctx.salesAuthRead_('sessions',id).expiresAt,deadline);
  }
 });
 test('concurrent login cannot reuse a consumed attempt or bypass an ACL change',()=>{
  for(const changed of ['attempt','acl']){
   const f=authFixture();f.user();const verifier='v'.repeat(64),state='s'.repeat(40),challenge=crypto.createHash('sha256').update(verifier).digest('base64url'),begin=f.ctx.beginSalesLogin({origin:'https://fixture-script.googleusercontent.com',challenge,state}),commit=f.ctx.salesAuthCommit_;
   f.ctx.salesAuthCommit_=(entries,...rest)=>{if(entries.some(e=>e.kind==='sessions')){if(changed==='attempt')f.put('attempts',f.ctx.salesAuthHash_(begin.attempt),{used:true});else f.user('reader',{},'disabled');}return commit(entries,...rest);};
   assert.throws(()=>f.ctx.finishSalesLogin({attempt:begin.attempt,verifier,state,idToken:f.token(),refreshToken:'r'.repeat(50)}),/Precondition/);assert.ok(![...f.db.keys()].some(k=>k.startsWith('sales_authsessions/')));
  }
 });
 test('quota retries structured Firestore precondition errors but never unrelated bad requests',()=>{
  for(const status of ['FAILED_PRECONDITION','INVALID_ARGUMENT']){
   const f=authFixture(),fetch=f.ctx.UrlFetchApp.fetch;let commits=0;f.ctx.UrlFetchApp.fetch=(url,opt)=>{if(url.endsWith(':commit')&&commits++===0)return {getResponseCode:()=>400,getContentText:()=>JSON.stringify({error:{status,message:'private diagnostic'}})};return fetch(url,opt);};
   if(status==='FAILED_PRECONDITION'){f.ctx.salesAuthThrottle_('begin',30);assert.equal(commits,2);}else {assert.throws(()=>f.ctx.salesAuthThrottle_('begin',30),/Auth-Speicher HTTP 400/);assert.equal(commits,1);}
  }
 });
 test('exhausted Firestore quota never bypasses ACL checks or creates a login session',()=>{
  const f=authFixture();f.ctx.UrlFetchApp.fetch=()=>({getResponseCode:()=>429,getContentText:()=>'{"error":{"status":"RESOURCE_EXHAUSTED"}}'});
  assert.throws(()=>f.ctx.salesAuthRead_('users','owner'),e=>e.salesQuota===true&&/Kontingent/.test(e.message));assert.throws(()=>f.ctx.beginSalesLogin({origin:'https://fixture-script.googleusercontent.com',challenge:'c'.repeat(43),state:'s'.repeat(40)}),/Kontingent/);assert.ok(![...f.db.keys()].some(k=>k.startsWith('sales_authsessions/')));
 });
 test('private bootstrap binds only the existing Google owner and activation requires that verified session',()=>{
  const f=authFixture({legacy:true});delete f.props.SALES_AUTH_OWNER_UID;f.db.delete('sales_authusers/owner');
  const verifier='v'.repeat(64),challenge=crypto.createHash('sha256').update(verifier).digest('base64url'),state='s'.repeat(40),begin=f.ctx.beginSalesLogin({origin:'https://fixture-script.googleusercontent.com',challenge,state}),input={attempt:begin.attempt,verifier,state,refreshToken:'r'.repeat(50)};
  assert.throws(()=>f.ctx.finishSalesLogin({...input,idToken:f.token()}),/bisherigen Administratorkonto/);assert.equal(f.props.SALES_AUTH_OWNER_UID,undefined);
  const owner=f.ctx.finishSalesLogin({...input,idToken:f.token('owner')});assert.equal(owner.user.admin,true);assert.equal(f.props.SALES_AUTH_MODE,undefined);assert.equal(f.props.SALES_AUTH_OWNER_UID,'owner');assert.throws(()=>f.ctx.enableSalesLogin('x'.repeat(64)),/AUTH_REQUIRED/);f.ctx.enableSalesLogin(owner.session);assert.equal(f.props.SALES_AUTH_MODE,'firebase');
 });
 test('invitation requires the exact verified email and newest single-use token',()=>{const f=authFixture();f.request(f.user('owner'));const r=f.ctx.createSalesUserInvitation({email:'new@example.invalid',permissions:{'contact.create':true}}),t=new URL(r.url).searchParams.get('invite');assert.throws(()=>f.ctx.salesAuthActivate_(t,{uid:'new',email:'wrong@example.invalid'}),/AUTH_DENIED/);f.ctx.salesAuthActivate_(t,{uid:'new',email:'new@example.invalid'});assert.equal(f.ctx.salesAuthPrincipal_({uid:'new',email:'new@example.invalid'}).permissions['contact.create'],true);assert.throws(()=>f.ctx.salesAuthActivate_(t,{uid:'new',email:'new@example.invalid'}),/AUTH_DENIED/);const a=f.ctx.createSalesUserInvitation({email:'another@example.invalid'}),b=f.ctx.createSalesUserInvitation({email:'another@example.invalid'});assert.throws(()=>f.ctx.salesAuthActivate_(new URL(a.url).searchParams.get('invite'),{uid:'another',email:'another@example.invalid'}),/AUTH_DENIED/);assert.notEqual(a.url,b.url);});
 test('rights changes revoke existing sessions, use revisions and cannot disable the owner',()=>{const f=authFixture();f.user();const s=f.session();f.request(f.user('owner'));assert.throws(()=>f.ctx.updateSalesUser({uid:'owner',status:'disabled',permissions:{},revision:1}),/Administratorkonto/);assert.throws(()=>f.ctx.updateSalesUser({uid:'reader',status:'disabled',permissions:{},revision:0}),/inzwischen/);f.ctx.updateSalesUser({uid:'reader',status:'active',permissions:{'contact.create':true},revision:1});assert.throws(()=>f.ctx.salesAuthVerify_(s),/gesperrt/);});
 test('atomic business writes verify the current ACL revision',()=>{const f=authFixture(),u=f.user();f.request(u);const writes=f.ctx.salesAuthProtectWrites_([{update:{name:'business'}}]);assert.equal(writes[0].verify.endsWith('/sales_authusers/reader'),true);assert.equal(writes[0].currentDocument.updateTime,u.record._updateTime);f.user('reader',{},'disabled');assert.throws(()=>f.ctx.salesAuthCommit_([{kind:'audit',id:'x',value:{}}],[u.record]),/Precondition/);assert.equal(f.db.has('sales_authaudit/x'),false);});
 test('HQ writes reject revoked authors and unrecognized legacy jobs',()=>{const f=authFixture();f.user('reader',{'contact.create':true});f.ctx.salesAuthSource_({kind:'createContact',actorUid:'reader',actor:'reader@example.invalid'});f.user('reader',{},'disabled');assert.throws(()=>f.ctx.salesAuthSource_({kind:'createContact',actorUid:'reader',actor:'reader@example.invalid'}),/gesperrt/);assert.throws(()=>f.ctx.salesAuthSource_({kind:'createContact',actor:'unknown@example.invalid'}),/Administratorprüfung/);});
 test('gateway always clears its trusted context after errors',()=>{const f=authFixture();f.user();const s=f.session();assert.throws(()=>f.ctx.salesAuthenticatedRpc(s,'saveSalesCompany',[{}]),/AUTH_DENIED/);assert.throws(()=>f.ctx.salesUser_(),/AUTH_REQUIRED/);});
 // --- Audit 17.11.2026 (F-2, F-3, F-8, F-9, F-15) ---
 test('F-2 unknown session keys above the per-minute limit are rejected without Firestore reads; verified sessions continue',()=>{
  const f=authFixture();f.user();const good=f.session();assert.equal(f.ctx.salesAuthVerify_(good).uid,'reader');
  for(let i=0;i<40;i++)assert.throws(()=>f.ctx.salesAuthVerify_(crypto.randomBytes(32).toString('hex')),/Sitzung beendet/);
  f.calls.length=0;assert.throws(()=>f.ctx.salesAuthVerify_(crypto.randomBytes(32).toString('hex')),/Viele ungültige/);assert.equal(f.calls.length,0);
  assert.equal(f.ctx.salesAuthVerify_(good).uid,'reader');
 });
 test('F-3 malformed or never-issued login completions neither touch Firestore nor consume the shared login limit',()=>{
  const f=authFixture();f.user();f.calls.length=0;
  for(let i=0;i<40;i++)assert.throws(()=>f.ctx.finishSalesLogin({attempt:'a'.repeat(40)+String(i).padStart(3,'0'),verifier:'v'.repeat(64),state:'s'.repeat(40),idToken:'x',refreshToken:'r'.repeat(50)}),/AUTH_REQUIRED/);
  for(const bad of [{},{idToken:5},{idToken:'x',refreshToken:'short'}])assert.throws(()=>f.ctx.finishSalesLogin(bad),/AUTH_REQUIRED/);
  assert.equal(f.calls.length,0);
  const verifier='v'.repeat(64),state='s'.repeat(40),challenge=crypto.createHash('sha256').update(verifier).digest('base64url'),begin=f.ctx.beginSalesLogin({origin:'https://fixture-script.googleusercontent.com',challenge,state});
  assert.equal(f.ctx.finishSalesLogin({attempt:begin.attempt,verifier,state,idToken:f.token(),refreshToken:'r'.repeat(50)}).user.uid,'reader');
 });
 test('F-8 the sync.run permission cannot start the owner-only edition refresh',()=>{
  const f=authFixture();f.request(f.user('reader',{'sync.run':true}));f.calls.length=0;
  assert.throws(()=>f.ctx.salesAuthDispatch_('startSalesSync',[{mode:'editions'}]),/AUTH_DENIED/);assert.equal(f.calls.length,0);
 });
 test('F-9 single business writes of a signed-in user verify the current ACL revision',()=>{
  const f=authFixture();f.request(f.user('reader'));f.ctx.salesStorePayload_('sales_jobs/synthetic',{value:1});
  assert.equal(JSON.parse(f.db.get('sales_jobs/synthetic').fields.payload.stringValue).value,1);
  f.user('reader',{'contact.create':true});assert.throws(()=>f.ctx.salesStorePayload_('sales_jobs/synthetic',{value:2}),/Precondition/);
  assert.equal(JSON.parse(f.db.get('sales_jobs/synthetic').fields.payload.stringValue).value,1);
 });
 test('F-15 login attempts and sessions carry a TTL timestamp after their expiry',()=>{
  const f=authFixture();f.user();const verifier='v'.repeat(64),state='s'.repeat(40),challenge=crypto.createHash('sha256').update(verifier).digest('base64url'),begin=f.ctx.beginSalesLogin({origin:'https://fixture-script.googleusercontent.com',challenge,state});
  const result=f.ctx.finishSalesLogin({attempt:begin.attempt,verifier,state,idToken:f.token(),refreshToken:'r'.repeat(50)});
  const session=f.db.get('sales_authsessions/'+f.ctx.salesAuthHash_(result.session)),attempt=f.db.get('sales_authattempts/'+f.ctx.salesAuthHash_(begin.attempt));
  assert.equal(Date.parse(session.fields.ttl.timestampValue),result.expiresAt+7*86400000);assert.ok(Date.parse(attempt.fields.ttl.timestampValue)>Date.now()+86400000);
  assert.equal(f.db.get('sales_authusers/reader').fields.ttl,undefined);
 });
 test('F-15 a successful login removes a bounded set of expired auth documents, at most every 10 minutes, never live ones',()=>{
  const f=authFixture();f.user();const past=new Date(Date.now()-60000).toISOString(),future=new Date(Date.now()+86400000).toISOString();
  const put=(kind,id,ttl)=>f.db.set('sales_auth'+kind+'/'+id,{fields:{payload:{stringValue:'{}'},ttl:{timestampValue:ttl}},updateTime:'old-'+id});
  for(let i=0;i<25;i++)put('attempts','expired'+i,past);put('sessions','expiredsession',past);put('sessions','livesession',future);put('attempts','liveattempt',future);
  const login=()=>{const verifier='v'.repeat(64),state='s'.repeat(40),challenge=crypto.createHash('sha256').update(verifier).digest('base64url'),begin=f.ctx.beginSalesLogin({origin:'https://fixture-script.googleusercontent.com',challenge,state});return f.ctx.finishSalesLogin({attempt:begin.attempt,verifier,state,idToken:f.token(),refreshToken:'r'.repeat(50)});};
  assert.equal(login().user.uid,'reader');
  const left=k=>[...f.db.keys()].filter(p=>p.includes(k)).length;
  assert.equal(left('/expired'),5);assert.equal(left('/expiredsession'),0);assert.equal(left('/livesession'),1);assert.equal(left('/liveattempt'),1);assert.equal(left('sales_authusers/reader'),1);
  assert.equal(login().user.uid,'reader');assert.equal(left('/expired'),5,'second login inside 10 minutes does not query again');
  const g=authFixture();g.user();g.ctx.UrlFetchApp.fetch=((fetch)=>(url,opt)=>url.endsWith(':runQuery')?{getResponseCode:()=>500,getContentText:()=>'{}'}:fetch(url,opt))(g.ctx.UrlFetchApp.fetch);
  const verifier='v'.repeat(64),state='s'.repeat(40),challenge=crypto.createHash('sha256').update(verifier).digest('base64url'),begin=g.ctx.beginSalesLogin({origin:'https://fixture-script.googleusercontent.com',challenge,state});
  assert.equal(g.ctx.finishSalesLogin({attempt:begin.attempt,verifier,state,idToken:g.token(),refreshToken:'r'.repeat(50)}).user.uid,'reader','cleanup failure never blocks the login');
 });
 console.log(count+' authentication and authorization tests passed');
}
module.exports={authFixture};
