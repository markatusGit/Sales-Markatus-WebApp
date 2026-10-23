/** Explicit operation registry. Old public RPCs cannot establish an authenticated context. */
function salesAuthRule_(method,args){
  const rules={getSalesLeanState:'home.read',getSalesLeanCompany:'customers.read',getSalesLeanEdition:'magazine.read',saveSalesCompany:'company.create',saveSalesTestCompany:'company.create',saveSalesCompanyChange:'company.edit',saveSalesCommunication:'communication.create',saveSalesHistory:'communication.create',createSalesCustomerContact:'contact.create',getSalesSyncStatus:'sync.read',startSalesSync:'sync.run',pauseSalesSync:'sync.run',runSalesSyncStep:'sync.run',syncSalesLeanCompany:'sync.run',syncSalesLeanHistory:'sync.run',saveSalesLeanEditionSettings:'settings.edit',searchSalesProjects:'settings.edit',searchSalesCompanies:'sync.run',addSalesCompany:'sync.run',saveSalesEditionConfig:'settings.edit',setSalesEditionEnabled:'settings.edit',getSalesUnassigned:'sync.read',getSalesJobPreview:'sync.read'};
  if(method==='getSalesLeanView')return ({home:'home.read',customers:'customers.read',magazine:'magazine.read',contacts:'directory.read',invoices:'finance.read',admin:'settings.read',import:'sync.read',new:'company.create',change:'company.edit',test:'owner'})[args[0]]||'deny';
  if(method==='getSalesEditor'||method==='saveSalesEntityChange')return args[0]?.entity==='contact'?'contact.edit':['company','address','types'].includes(args[0]?.entity)?'company.edit':'deny';
  if(['getSalesStorageInventoryPage','getSalesTestAudit','setupSalesSyncWorker','runSalesJob','reconcileSalesJob','resolveSalesConflict','checkSalesHistoryBinding','queueSalesContactEmail','queueSalesMarkerCleanup','bindSalesCompanyResult','bindSalesCustomerContact','listSalesUsers','createSalesUserInvitation','updateSalesUser','getSalesAuthSetup','saveSalesAuthSetup','setSalesDocumentExcluded','startSalesEditionRefresh'].includes(method))return 'owner';
  if(method==='logoutSalesUser')return 'home.read';
  return rules[method]||'deny';
}
function salesAuthDispatch_(method,args){
  if(typeof method!=='string'||!Array.isArray(args)||args.length>5)throw Error('AUTH_DENIED: Ungültige Aktion.');
  if(method==='mutateSalesLean'){
    if(typeof args[0]!=='string'||!Array.isArray(args[1])||args[0]==='mutateSalesLean')throw Error('AUTH_DENIED: Ungültige Aktion.');
    const rule=salesAuthRule_(args[0],args[1]);if(rule==='owner')salesAuthOwner_();else salesAuthRequire_(rule);
    salesAuthValidateWrite_(args[0],args[1]);salesAuthRequest_.requiredPermission=rule;return mutateSalesLean(args[0],args[1]);
  }
  let rule=salesAuthRule_(method,args);
  if(method==='getSalesLeanEdition'&&salesAuthRequest_.user.permissions['finance.read'])rule='finance.read';
  if(method==='getSalesLeanView'&&args[0]==='admin'&&salesAuthRequest_.user.admin)rule='owner';
  if(rule==='owner')salesAuthOwner_();else salesAuthRequire_(rule);
  salesAuthRequest_.requiredPermission=rule;
  const methods={getSalesLeanState,getSalesLeanView,getSalesLeanCompany,getSalesLeanEdition,saveSalesCompany,saveSalesTestCompany,saveSalesCompanyChange,saveSalesCommunication,saveSalesHistory,createSalesCustomerContact,getSalesSyncStatus,startSalesSync,pauseSalesSync,runSalesSyncStep,syncSalesLeanCompany,syncSalesLeanHistory,saveSalesLeanEditionSettings,searchSalesProjects,searchSalesCompanies,addSalesCompany,saveSalesEditionConfig,setSalesEditionEnabled,getSalesUnassigned,getSalesJobPreview,getSalesEditor,saveSalesEntityChange,getSalesStorageInventoryPage,getSalesTestAudit,setupSalesSyncWorker,runSalesJob,reconcileSalesJob,resolveSalesConflict,checkSalesHistoryBinding,queueSalesContactEmail,queueSalesMarkerCleanup,bindSalesCompanyResult,bindSalesCustomerContact,listSalesUsers,createSalesUserInvitation,updateSalesUser,logoutSalesUser,getSalesAuthSetup,saveSalesAuthSetup,setSalesDocumentExcluded,startSalesEditionRefresh};
  if(!Object.prototype.hasOwnProperty.call(methods,method))throw Error('AUTH_DENIED: Aktion nicht freigegeben.');
  salesAuthValidateWrite_(method,args);
  return methods[method](...args);
}
function salesAuthValidateWrite_(method,args){
  if(['searchSalesProjects','saveSalesEditionConfig'].includes(method)&&!salesAuthRequest_.user.admin&&!salesAuthRequest_.user.permissions['projects.read'])throw Error('AUTH_DENIED: Projekte nicht freigegeben.');
  if(salesAuthRequest_.user.permissions['finance.read'])return;
  if(method==='saveSalesLeanEditionSettings')throw Error('AUTH_DENIED: Ziele und Termine benötigen zusätzlich die Finanzfreigabe.');
  function financial(value){return value&&typeof value==='object'&&Object.entries(value).some(([k,v])=>salesAuthFinancialKey_(k)||financial(v));}
  if(['saveSalesEntityChange','saveSalesCompanyChange','saveSalesCompany','saveSalesTestCompany','saveSalesLeanEditionSettings'].includes(method)&&financial(args[0]))throw Error('AUTH_DENIED: Finanzfelder nicht freigegeben.');
}
function salesAuthFinancialKey_(key){return /revenue|amount|cents|invoice|document|iban|bic|debitor|creditor|financ|payment|vatId|routing|chargeRate|netValue|grossValue|tax|price|currency|discount|rebate/i.test(key);}
function salesAuthFilter_(result,user,method){
  if(user.admin)return result;
  function project(value,key){
    if(Array.isArray(value))return value.filter(row=>!(row&&typeof row==='object'&&!user.permissions['finance.read']&&(row.documentDispatch||row.contactHistoryChannel==='SentDocument'||row.invoice))).map(row=>project(row,''));
    if(!value||typeof value!=='object')return value;
    const out={};for(const [k,v] of Object.entries(value)){
      if(k==='record'||k==='access'||k==='actorUid'||k==='credentials'||k==='idToken'||k==='refreshToken')continue;
      if(k==='user'){out.user=salesAuthPublicUser_(user);continue;}
      if(!user.permissions['finance.read']&&(salesAuthFinancialKey_(k)||k==='changes'))continue;
      if(!user.permissions['projects.read']&&(k==='projects'||k==='plannedRevenues')){out[k]=[];continue;}
      if(!user.permissions['projects.read']&&/^project/i.test(k))continue;
      if(!user.permissions['sync.read']&&['jobs','syncRun','importRun','unassignedSummary','pendingChanges'].includes(k))continue;
      if(k==='patch'&&!user.permissions['sync.read']){out.patch={};if(v?.localCompany)out.patch.localCompany=project(v.localCompany,'company');if(v?.draft&&method==='saveSalesCompany')out.patch.draft=project(v.draft,'draft');continue;}
      out[k]=project(v,k);
    }return out;
  }
  return project(result,'');
}
function salesAuthProtectWrites_(writes){
  if(!salesAuthRequest_)return writes;
  const r=salesAuthRequest_.user.record;if(!r?._path||!r._updateTime)throw Error('AUTH_REQUIRED: Freigabestand fehlt.');
  return [{verify:'projects/'+salesContext_().project+'/databases/(default)/documents/'+r._path,currentDocument:{updateTime:r._updateTime}},...writes];
}
function salesAuthSource_(job){
  if(!salesAuthEnabled_())return;
  const cfg=salesAuthConfig_();if(!job.actorUid){if(job.actor===cfg.ownerEmail||job.createdBy===cfg.ownerEmail)return;throw Error('Bisheriger Auftrag benötigt Administratorprüfung der Autorenzuordnung.');}
  const u=salesAuthRead_('users',job.actorUid),key=({createCompany:'company.create',createContact:'contact.create',history:'communication.create',communication:'communication.create',companyChange:'company.edit',entityChange:job.entity==='contact'?'contact.edit':'company.edit'})[job.kind];
  if(!u||u.status!=='active'||u.email!==job.actor||job.actorUid!==cfg.ownerUid&&(!key||!salesPermissions_(u.permissions)[key]))throw Error('Autor oder Schreibrecht inzwischen gesperrt. Auftrag angehalten.');
  if(job.actorUid!==cfg.ownerUid&&!u.permissions['finance.read']&&job.change&&JSON.stringify(job.change)!==JSON.stringify(salesAuthFilter_(job.change,{...u,admin:false},'job')))throw Error('Finanzrecht für diesen Auftrag inzwischen gesperrt.');
}
function listSalesUsers(cursor){
  salesAuthOwner_();if(cursor!==undefined&&cursor!==null&&(typeof cursor!=='string'||cursor.length>2000||/[\r\n]/.test(cursor)))throw Error('Ungültige Benutzerseite.');
  const c=salesContext_(),url=pilotUrl_(c.project,'sales_authusers')+'?pageSize=50'+(cursor?'&pageToken='+encodeURIComponent(cursor):'');
  const page=pilotCall_(url,{method:'get',headers:{Authorization:'Bearer '+c.token}});
  return {users:(page.documents||[]).map(d=>{const u=JSON.parse(d.fields.payload.stringValue);return salesPick_(u,['uid','email','status','permissions','revision','createdAt']);}),next:page.nextPageToken||null};
}
function createSalesUserInvitation(input){
  const actor=salesAuthOwner_(),email=salesAuthEmail_(input?.email),permissions=salesPermissions_(input?.permissions);
  const url=PropertiesService.getScriptProperties().getProperty('SALES_APP_URL');if(!/^https:\/\/script\.google\.com\/(?:a\/macros\/[^/]+|macros)\/s\/[\w-]+\/exec$/.test(url||''))throw Error('Feste App-Adresse fehlt.');
  return salesLock_(()=>{
    const emailId=salesAuthHash_(email),prior=salesAuthRead_('emails',emailId);if(prior?.uid)throw Error('Benutzer bereits angelegt. Bitte dessen Rechte bearbeiten.');
    const invitation=salesAuthRandom_(),id=salesAuthHash_(invitation),expiresAt=Date.now()+48*3600000;
    salesAuthCommit_([{kind:'invites',id,create:true,value:{email,permissions,expiresAt,createdBy:actor.uid}},{kind:'emails',id:emailId,prior,create:!prior,value:{email,latestInvite:id}},{kind:'audit',id:salesAuthRandom_(),create:true,value:{action:'invite',actor:actor.uid,target:emailId,at:salesNow_()}}],[actor.record]);
    return {url:url+'?invite='+invitation,expiresAt,message:'Einladung angelegt. Link persönlich weitergeben.'};
  });
}
function updateSalesUser(input){
  const actor=salesAuthOwner_(),cfg=salesAuthConfig_(),uid=input?.uid;if(typeof uid!=='string'||!/^[-\w]{1,128}$/.test(uid))throw Error('Ungültiger Benutzer.');
  if(uid===cfg.ownerUid)throw Error('Das Administratorkonto bleibt unverändert freigegeben.');
  if(!['active','disabled'].includes(input.status))throw Error('Ungültiger Status.');const permissions=salesPermissions_(input.permissions);
  return salesLock_(()=>{
    const prior=salesAuthRead_('users',uid);if(!prior||prior.revision!==input.revision)throw Error('Benutzer inzwischen geändert. Bitte neu laden.');
    salesAuthCommit_([{kind:'users',id:uid,prior,value:{...prior,status:input.status,permissions,revision:prior.revision+1,sessionEpoch:(prior.sessionEpoch||0)+1}},{kind:'audit',id:salesAuthRandom_(),create:true,value:{action:'access-'+input.status,actor:actor.uid,target:uid,at:salesNow_()}}],[actor.record]);
    return {user:{uid,email:prior.email,status:input.status,permissions,revision:prior.revision+1,createdAt:prior.createdAt},message:input.status==='disabled'?'Zugang und laufende Sitzungen gesperrt.':'Rechte gespeichert. Bestehende Sitzungen müssen sich erneut anmelden.'};
  });
}
function logoutSalesUser(){const current=salesAuthRead_('sessions',salesAuthHash_(salesAuthRequest_.session));if(current)salesAuthCommit_([{kind:'sessions',id:salesAuthHash_(salesAuthRequest_.session),prior:current,value:{disabled:true,expiresAt:Date.now()}}]);return {message:'Abgemeldet.'};}
function getSalesAuthSetup(){
  if(salesAuthEnabled_())salesAuthOwner_();else salesUser_(true);
  const p=PropertiesService.getScriptProperties();return {configured:!!p.getProperty('SALES_AUTH_OWNER_UID'),origin:p.getProperty('SALES_AUTH_ORIGIN')||'https://sales-markatus.firebaseapp.com',allowedOrigins:JSON.parse(p.getProperty('SALES_AUTH_ALLOWED_ORIGINS')||'[]'),enabled:salesAuthEnabled_()};
}
function saveSalesAuthSetup(input){
  if(salesAuthEnabled_())salesAuthOwner_();else salesUser_(true);
  if(!input||!Array.isArray(input.allowedOrigins)||!input.allowedOrigins.length||input.allowedOrigins.length>10||input.allowedOrigins.some(v=>!/^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/.test(v)))throw Error('Exakte App-Ursprünge erforderlich.');
  const config=pilotCall_('https://sales-markatus.firebaseapp.com/__/firebase/init.json',{method:'get'});
  if(config.projectId!=='sales-markatus'||!/^AIza[\w-]{30,60}$/.test(config.apiKey||''))throw Error('Öffentliche Firebase-Konfiguration passt nicht zum Projekt.');
  const p=PropertiesService.getScriptProperties();p.setProperty('SALES_FIREBASE_WEB_API_KEY',config.apiKey);p.setProperty('SALES_AUTH_ORIGIN','https://sales-markatus.firebaseapp.com');p.setProperty('SALES_AUTH_ALLOWED_ORIGINS',JSON.stringify(input.allowedOrigins));p.setProperty('SALES_APP_URL',SALES_AUTH_APP_URL);
  return {message:'Anmeldung vorbereitet. Bestehender Google-Zugang bleibt unverändert geschützt.'};
}
function enableSalesLogin(session){
  if(salesAuthEnabled_())throw Error('Anmeldung bereits aktiviert.');
  const legacy=salesUser_(true),user=salesAuthVerify_(session);if(!user.admin||user.email!==legacy.email)throw Error('AUTH_DENIED: Bestätigtes Administratorkonto erforderlich.');
  PropertiesService.getScriptProperties().setProperty('SALES_AUTH_MODE','firebase');return {message:'Benutzeranmeldung aktiviert. Bitte die App neu öffnen.'};
}
