/** Sales pilot. All public RPCs authenticate. HQ write targets derive only from server-created jobs. */
const SALES = Object.freeze({admin:'pp@markatus.de', edition:'coburger-70', projectNumber:'250334', projectName:'COBURGER Ausgabe #70', maxMs:210000});
const SALES_RELEASE = '2026-11-23-r37';
const SALES_COMPANY_CUSTOM_FIELDS=['Kundenklassifizierung','Kundenherkunft','Grund der Adressanlage','Erstelldatum'];
const SALES_CUSTOMER_FORM_KEYS=['name','companyTypeId','industrialSector','newIndustry','subsystemId','responsibleUserId','homepage','description','street','houseNumber','zipCode','city','country','erstelldatum','Kundenherkunft','addressCreationReason'];
const salesCompanyCustomKey_=name=>String(name||'').trim().toLowerCase();
function salesCompanyCustomSelected_(rows){return (rows||[]).filter(f=>SALES_COMPANY_CUSTOM_FIELDS.some(name=>salesCompanyCustomKey_(name)===salesCompanyCustomKey_(f.name)));}
function salesCompanyCustomCatalog_(catalog){
  // Editors use Firebase only. Metadata is refreshed exclusively by the central sync.
  return catalog;
}
function salesCompanyDefinitions_(){
  const filter=SALES_COMPANY_CUSTOM_FIELDS.map(name=>"name eq '"+name+"'").join(' or '),rows=salesHqRows_(salesCustomerGet_('/v2/Companies/CustomFieldDefinitions?$filter='+encodeURIComponent(filter)).data);
  if(rows.length>500)throw Error('HQ-Felddefinitionen konnten nicht vollständig gelesen werden.');
  const fields=salesCompanyCustomSelected_(rows).map(f=>salesPick_(f,['name','type'])),names=new Set();
  for(const f of fields){const key=salesCompanyCustomKey_(f.name);if(names.has(key))throw Error('HQ-Felddefinition nicht eindeutig: '+f.name);names.add(key);}
  return fields;
}
function salesCompanyReasonOptions_(fields){
  const reason=fields.find(f=>salesCompanyCustomKey_(f.name)==='grund der adressanlage');
  if(!reason||!/^Dropdown/.test(reason.type))return;
  const filter="Category eq 'Company' and Name eq 'Grund der Adressanlage'",path='/v1/CustomFieldDefinitions?$filter='+encodeURIComponent(filter)+'&$select=Name,Category,Options&$expand=Options&$top=2';
  const rows=salesHqRows_(salesCustomerGet_(path).data);
  if(rows.length!==1||rows[0].Category!=='Company'||rows[0].Name!==reason.name||!Array.isArray(rows[0].Options)||rows[0].Options.length>500)throw Error('HQ-Auswahlwerte für Grund der Adressanlage wurden nicht vollständig geliefert.');
  reason.options=[...new Set(rows[0].Options.map(o=>String(o.OptionValue||'')).filter(Boolean))];
}
function salesCompanyNewOrigin_(catalog){
  const def=(catalog.fields||[]).find(f=>salesCompanyCustomKey_(f.name)==='kundenherkunft');
  if(!def||!['DropdownCheckbox','Dropdown','Text'].includes(def.type))throw Error('HQ-Feld Kundenherkunft ist noch nicht bestätigt. Bitte zuerst synchronisieren.');
  return {name:def.name,type:def.type,value:def.type==='DropdownCheckbox'?['Medienhaus']:'Medienhaus'};
}
function salesCompanyReason_(text,base,catalog){
  const value=salesText_(text,2000,false);if(value===String(base||''))return value;
  const def=(catalog.fields||[]).find(f=>salesCompanyCustomKey_(f.name)==='grund der adressanlage');
  if(!def){if(value)throw Error('HQ-Feld Grund der Adressanlage fehlt. Bitte zuerst synchronisieren.');return value;}
  if(!['Text','TextMultiline','Dropdown','DropdownCheckbox'].includes(def.type))throw Error('Nicht unterstützter HQ-Feldtyp für Grund der Adressanlage: '+def.type);
  const parsed=salesCompanyCustomInput_(value,def),values=Array.isArray(parsed)?parsed:parsed?[parsed]:[],prior=salesCompanyCustomInput_(String(base||''),def),allowed=[...(def.options||[]),...(Array.isArray(prior)?prior:prior?[prior]:[])];
  if(/^Dropdown/.test(def.type)&&values.some(v=>!allowed.includes(v)))throw Error('Grund der Adressanlage ist kein bestätigter HQ-Auswahlwert. Bitte zuerst synchronisieren.');
  return value;
}
function salesCompanyCustomInput_(text,definition){
  if(definition.type==='DropdownCheckbox')return Array.from(new Set(text.trim().startsWith('[')?JSON.parse(text):text.split(/\r?\n/).map(v=>v.trim()).filter(Boolean)));
  if(definition.type==='Date'){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(text)||!Number.isFinite(Date.parse(text))||new Date(text+'T00:00:00Z').toISOString().slice(0,10)!==text)throw Error('Bitte ein gültiges Datum für „'+definition.name+'“ eingeben.');
    return text+'T00:00:00Z';
  }
  return text;
}
function salesHqRows_(value){const rows=Array.isArray(value)?value:value?.value||value?.data||value?.d?.results;if(!Array.isArray(rows))throw Error('HQ-Auswahlliste hat ein unbekanntes Format.');return rows;}
function salesCustomerGet_(path){try{return salesHqGet_(path);}catch(error){throw Error('HQ-Auswahlliste '+path.split('?')[0]+': '+error.message);}}
function salesCustomerList_(entity,filter,started){
  if(!['Companies','CompanyTypes','Subsystems','Users'].includes(entity))throw Error('Unbekannte Auswahlliste.');const rows=[],seen=new Set();
  for(let page=0;page<50;page++){
    if(Date.now()-started>45000)throw Error('HQ-Auswahllisten benötigen länger. Vorhandene Werte bleiben erhalten; bitte erneut aktualisieren.');
    const response=salesCustomerGet_('/v2/'+entity+'?$top=200&$skip='+rows.length+'&orderby=id'+(filter?'&$filter='+encodeURIComponent(filter):'')),batch=salesHqRows_(response.data);
    if(batch.length>200)throw Error('HQ hat die angeforderte Seitengröße nicht eingehalten.');for(const row of batch){const id=salesId_(row.id);if(seen.has(id))throw Error('HQ-Auswahlliste enthält doppelte IDs. Prüfstand bleibt erhalten.');seen.add(id);rows.push(row);}
    const key=Object.keys(response.headers||{}).find(k=>k.toLowerCase()==='hellohq-count'),total=key?Number(response.headers[key]):null;
    if(total!==null&&(!Number.isSafeInteger(total)||total<rows.length))throw Error('HQ-Auswahllistenzähler ist widersprüchlich.');
    if(batch.length===0){if(!filter&&total!==null&&rows.length<total)throw Error('HQ-Auswahlliste ist unvollständig.');return rows;}if(total!==null&&rows.length===total)return rows;
  }throw Error('HQ-Auswahlliste noch nicht vollständig. Gespeicherter Prüfstand bleibt erhalten.');
}
function salesCustomerCatalog_(){
  const catalog=salesRead_('sales_meta/catalog');if(!catalog)throw Error('Auswahllisten fehlen. Bitte zuerst synchronisieren.');return catalog;
}
function salesCustomerSyncCatalog_(){
  try{return salesCustomerCatalogRefresh_(true);}catch(error){
    const cached=salesRead_('sales_meta/catalog');
    if(!cached||!['types','users','subsystems'].every(k=>Array.isArray(cached[k])&&cached[k].length))throw error;
    return {...cached,customerFormWarning:'HQ-Auswahllisten konnten nicht aktualisiert werden. Gespeicherte Werte werden verwendet. '+String(error.message)};
  }
}
function salesCustomerCatalogRefresh_(force){
  const old=salesRead_('sales_meta/catalog');if(!old)throw Error('Zuerst die HQ-Auswahllisten importieren.');
  if(!force&&old.customerFormVersion===1&&Date.now()-Date.parse(old.customerFormCheckedAt)<15*60000)return old;
  const started=Date.now(),checkedAt=salesNow_(),fields=salesCompanyDefinitions_();salesCompanyReasonOptions_(fields);
  // Industries are already collected from imported companies by the central sync.
  const industries=new Set(old.industries||[]);
  const lists={};for(const [entity,key] of [['CompanyTypes','types'],['Subsystems','subsystems'],['Users','users']]){
    const rows=salesCustomerList_(entity,'',started);lists[key]=rows.filter(x=>entity!=='Users'||!x.isDeactivated).map(x=>({id:x.id,name:entity==='Users'?[x.firstName,x.lastName].filter(Boolean).join(' '):x.name}));
  }
  return salesLock_(()=>{const current=salesRead_('sales_meta/catalog')||old,catalog={...current,...lists,fields,industries:Array.from(new Set([...industries,...current.industries||[]])).sort((a,b)=>a.localeCompare(b,'de')),industriesCheckedAt:checkedAt,customerFormCheckedAt:checkedAt,customerFormVersion:1,companyFieldsVersion:1};salesWrite_('sales_meta/catalog',catalog);return catalog;});
}
let salesContextCache_;
// User actions wait for the current background section (the worker yields between sections) instead of failing after 1 s.
const SALES_LOCK_WAIT_MS=30000;

function salesUser_(admin) {
  if(typeof salesAuthEnabled_==='function'&&salesAuthEnabled_()){
    const request=salesAuthRequest_;if(!request?.user)throw Error('AUTH_REQUIRED: Bitte zuerst anmelden.');
    if(admin&&!request.user.admin&&!['sync.run','settings.edit'].includes(request.requiredPermission))throw Error('AUTH_DENIED: Aktion nicht freigegeben.');
    return salesAuthPublicUser_(request.user);
  }
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const p = PropertiesService.getScriptProperties();
  const owner = String(p.getProperty('SALES_ADMIN_EMAIL') || SALES.admin).toLowerCase();
  const allowed = String(p.getProperty('SALES_ALLOWED_EMAILS') || owner).split(',').map(x=>x.trim().toLowerCase());
  if (!email || !allowed.includes(email) || (admin && email !== owner)) throw new Error('Zugriff nicht freigegeben. Bitte mit einem ausdrücklich freigegebenen Google-Konto anmelden.');
  return {email,admin:email===owner};
}
function salesPage_(event) {
  if(typeof salesAuthEnabled_==='function'&&salesAuthEnabled_()){
    try{const cfg=salesAuthConfig_(),invite=event?.parameter?.invite||'';if(invite)salesAuthKey_(invite);return HtmlService.createHtmlOutput(HtmlService.createHtmlOutputFromFile('Sales').getContent().replace('"AUTH_RUNTIME_CONFIG"',JSON.stringify({enabled:true,origin:cfg.origin,invitation:invite,appUrl:SALES_AUTH_APP_URL,release:SALES_RELEASE}).replace(/</g,'\\u003c'))).setTitle('Sales Markatus').addMetaTag('viewport','width=device-width, initial-scale=1');}
    catch(_){return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><h1>Anmeldung wird eingerichtet</h1><p>Aktuell werden keine Kundendaten ausgeliefert.</p>');}
  }
  try {salesUser_();} catch (_) {return HtmlService.createHtmlOutput('<!doctype html><html lang="de"><meta charset="utf-8"><h1>Zugriff nicht freigegeben</h1><p>Bitte diese App mit deinem freigegebenen Google-Konto öffnen. Wenn Google deine Identität nicht übermittelt, muss die Bereitstellung geprüft werden.</p></html>');}
  return HtmlService.createHtmlOutputFromFile('Sales').setTitle('Sales Markatus').addMetaTag('viewport','width=device-width, initial-scale=1');
}
function salesContext_() {
  if (salesContextCache_) return salesContextCache_;
  const p=PropertiesService.getScriptProperties(), project=p.getProperty('FIREBASE_PROJECT_ID');
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project || '')) throw new Error('Firebase-Projekt fehlt.');
  let account; try {account=JSON.parse(p.getProperty('FIREBASE_SERVICE_ACCOUNT_JSON') || '{}');} catch (_) {throw new Error('Firebase-Dienstkonto ungültig.');}
  if (account.project_id!==project || account.type!=='service_account' || !account.private_key) throw new Error('Firebase-Dienstkonto passt nicht zum Projekt.');
  // Reuse the one-hour service-account token across executions (script-private cache) instead of signing a new JWT per call.
  const cache=salesCache_(),key='sales-fs-token-'+project+'-'+String(account.client_email||'').replace(/[^a-z0-9]/gi,'').slice(0,60);
  let token=null;try{token=cache?.get(key)||null;}catch(_){token=null;}
  if(!token){token=pilotGoogleToken_(account);try{cache?.put(key,token,3000);}catch(_){}}
  salesContextCache_={project,token};
  return salesContextCache_;
}
function salesCache_() {try{return typeof CacheService!=='undefined'?CacheService.getScriptCache():null;}catch(_){return null;}}
function salesPath_(path) {if (!/^sales_[a-z]+\/[a-zA-Z0-9_-]+$/.test(path)) throw new Error('Ungültiger Datenpfad.'); return path;}
function salesRead_(path) {
  const c=salesContext_(), raw=pilotReadDocument_(c.project,salesPath_(path),c.token);
  return raw ? salesDecodeStored_(path,raw.payload,c) : null;
}
function salesWrite_(path,value) {
  const status=typeof salesLeanPrepareWrite_==='function'?salesLeanPrepareWrite_(path,value):null;
  salesStorePayload_(path,value);
  if(status)salesStorePayload_('sales_meta/lean_sync',status);
  if(typeof salesLeanAfterWrite_==='function')salesLeanAfterWrite_(path,value);
}
function salesList_(collection) {
  if (!/^sales_(jobs|drafts|editions|directory|deletions)$/.test(collection)) throw new Error('Ungültige Sammlung.');
  const c=salesContext_(), result=[];let next='';
  for (let i=0;i<1000;i++) {
    const page=pilotCall_(pilotUrl_(c.project,collection)+'?pageSize=100'+(next?'&pageToken='+encodeURIComponent(next):''),{method:'get',headers:{Authorization:'Bearer '+c.token}});
    (page.documents||[]).forEach(d=>result.push(salesDecodeStored_(collection+'/'+d.name.split('/').pop(),d.fields.payload.stringValue,c)));
    next=page.nextPageToken;if (!next) return result;
  }
  throw new Error('Zu viele Datensätze für diesen Pilotabruf.');
}
function salesLock_(fn) {const l=LockService.getScriptLock();if (!l.tryLock(SALES_LOCK_WAIT_MS)) throw new Error('Ein Speichervorgang läuft. Bitte gleich erneut versuchen.');try{return fn();}finally{l.releaseLock();}}
function salesNow_() {return new Date().toISOString();}
function salesId_(value) {const id=Number(value);if (!Number.isSafeInteger(id)||id<=0) throw new Error('Ungültige HQ-ID.');return id;}
function salesText_(value,max,required) {if (typeof value!=='string') value='';value=value.trim();if (value.length>max || (required&&!value)) throw new Error('Pflichtfeld fehlt oder Eingabe ist zu lang.');return value;}
function salesKey_(value) {if (!/^[a-zA-Z0-9_-]{1,100}$/.test(value||'')) throw new Error('Ungültige Datensatzkennung.');return value;}
function salesPick_(value,keys) {const out={};keys.forEach(k=>{if(value&&value[k]!==undefined) out[k]=value[k];});return out;}
function salesHqGet_(path) {
  if (!/^\/v2\/(Companies|CompanyTypes|ContactPersons|ContactHistories|Projects|Documents|PlannedRevenues|Users|Subsystems)(\/\d+|\/CustomFieldDefinitions)?(\?[^#\r\n]*)?$/.test(path)&&!/^\/v2\/Companies\/\d+\/Addresses$/.test(path)&&!/^\/v1\/(CustomFieldDefinitions|Companies\(\d+\))(\?[^#\r\n]*)?$/.test(path)&&!/^\/v1\/(Companies|ContactPersons)\?\$select=Id&\$orderby=Id&\$top=200&\$skip=\d+$/.test(path)) throw new Error('HQ-Lesepfad nicht freigegeben.');
  const r=UrlFetchApp.fetch('https://api.hellohq.io'+path,{method:'get',headers:{Authorization:'Bearer '+revenueToken_(),Accept:'application/json'},followRedirects:false,muteHttpExceptions:true});
  if(r.getResponseCode()!==200) throw new Error('HQ-Lesetest: HTTP '+r.getResponseCode()+'. Kein unvollständiger Import wird freigegeben.');
  let data;try{data=JSON.parse(r.getContentText());}catch(_){throw new Error('HQ liefert kein gültiges JSON.');}
  return {data,headers:r.getAllHeaders()};
}
function salesCollect_(entity,filter,started,expand) {
  const rows=[],seen={};
  for(let page=0;page<50;page++) {
    if(Date.now()-started>SALES.maxMs) throw new Error('Zeitbudget erreicht. Bitte einen kleineren Lesetest ausführen.');
    // These endpoints document $filter/$top/$skip in HQ's v2 OpenAPI schema.
    const prefix=['PlannedRevenues','ContactPersons','ContactHistories'].includes(entity)?'$':'';
    const r=salesHqGet_('/v2/'+entity+'?'+prefix+'top=200&'+prefix+'skip='+rows.length+'&orderby=id'+(filter?'&'+prefix+'filter='+encodeURIComponent(filter):'')+(expand?'&expand='+encodeURIComponent(expand):''));
    const batch=Array.isArray(r.data)?r.data:r.data.data||r.data.value;
    if(!Array.isArray(batch)) throw new Error('Unbekanntes HQ-Listenformat für '+entity+'.');
    batch.forEach(x=>{const id=salesId_(x.id);if(seen[id]) throw new Error('Doppelte HQ-ID; Seitennavigation prüfen.');seen[id]=true;rows.push(x);});
    const key=Object.keys(r.headers).find(k=>k.toLowerCase()==='hellohq-count');
    const total=key?Number(r.headers[key]):null;
    if(total!==null&&(!Number.isSafeInteger(total)||total<rows.length)) throw new Error('HQ-Seitenzähler ist widersprüchlich.');
    if(total!==null ? rows.length===total : batch.length<200) return rows;
    if(!batch.length) throw new Error('HQ-Seite fehlt.');
  }
  throw new Error('HQ-Seitenlimit erreicht.');
}
function salesOne_(entity,id) {const data=salesHqGet_('/v2/'+entity+'/'+salesId_(id)).data;if(!data||Number(data.id)!==Number(id)) throw new Error('HQ-Objekt stimmt nicht mit der angefragten ID überein.');return data;}
function salesAssertPrivate_() {
  const c=salesContext_();
  for(const path of ['sales_editions/'+SALES.edition,'sales_jobs/security-probe','sales_companies/security-probe','sales_directory/security-probe','sales_chunks/security-probe','sales_meta/security-probe','sales_imports/security-probe']) {
    const r=UrlFetchApp.fetch(pilotUrl_(c.project,path),{method:'get',muteHttpExceptions:true,followRedirects:false});
    if(r.getResponseCode()===429)throw Error('Firestore HTTP 429 bei Schutzprüfung.');
    if(![401,403].includes(r.getResponseCode())) throw new Error('Firestore-Schutz für die App-Daten fehlt. Import angehalten.');
  }
}

function getSalesState() {
  const user=salesUser_(), edition=salesRead_('sales_editions/'+SALES.edition), catalog=salesRead_('sales_meta/catalog');
  const drafts=salesList_('sales_drafts'),jobs=salesList_('sales_jobs');
  return {release:SALES_RELEASE,user,edition,catalog,drafts,localCompanies:drafts.map(d=>salesLocalCompany_(d,catalog,jobs.find(j=>j.id===d.id))),jobs:jobs.map(salesJobSummary_),access:user.admin?salesAccess_():null};
}
function salesAccess_() {const p=PropertiesService.getScriptProperties(),owner=p.getProperty('SALES_ADMIN_EMAIL')||SALES.admin;return {owner,emails:(p.getProperty('SALES_ALLOWED_EMAILS')||owner).split(',')};}
function saveSalesAccess(input) {
  salesUser_(true);return salesLock_(()=>{const cfg=salesAccess_();const list=String(input||'').split(/[\s,;]+/).map(x=>x.trim().toLowerCase()).filter(Boolean);
    if(list.length>100||list.some(x=>! /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(x))) throw new Error('Bitte gültige E-Mail-Adressen eintragen.');
    if(!list.includes(cfg.owner.toLowerCase())) throw new Error('Deine Administratoradresse muss freigegeben bleiben.');
    PropertiesService.getScriptProperties().setProperty('SALES_ALLOWED_EMAILS',Array.from(new Set(list)).join(','));return salesAccess_();});
}
function syncSalesCatalog() {
  salesUser_(true);return salesLock_(()=>{salesAssertPrivate_();const started=Date.now();
    const users=salesCollect_('Users','',started).filter(x=>!x.isDeactivated).map(x=>({id:x.id,name:[x.firstName,x.lastName].filter(Boolean).join(' ')}));
    const types=salesCollect_('CompanyTypes','',started).map(x=>({id:x.id,name:x.name}));
    const subsystems=salesCollect_('Subsystems','',started).map(x=>({id:x.id,name:x.name}));
    const fields=salesCompanyDefinitions_();salesCompanyReasonOptions_(fields);
    const old=salesRead_('sales_meta/catalog')||{},industries=old.industries||[],salutations=old.salutations||[];
    salesWrite_('sales_meta/catalog',{users,types,subsystems,fields,companyFieldsVersion:1,industries,salutations,updatedAt:salesNow_()});return {message:'Auswahllisten einschließlich Branchen und Anreden aus HQ nach Firebase übertragen. Jetzt erneut aus Firebase laden.',industries:industries.length,salutations:salutations.length};});
}
function salesWebsiteInput_(value) {
  const raw=salesText_(value,500,false);if(!raw)return '';
  const result=/^https?:\/\//i.test(raw)?raw:'https://'+raw;
  if(!/^https?:\/\/[^\s@/:?#]+\.[^\s@/:?#]{2,}(?::\d{1,5})?(?:[/?#][^\s]*)?$/i.test(result)) throw new Error('Homepage bitte als Domain wie test.de oder vollständige https-Adresse eingeben.');
  return result;
}
function salesSubsystemConfirmed_(company,expectedId){
  const id=salesId_(expectedId),linked=company.subsystems||[];if(!Array.isArray(linked)||!linked.length)return false;
  if(linked.some(row=>row.id!=null))return linked.every(row=>row.id!=null)&&linked.filter(row=>Number(row.id)===id).length===1;
  // CompanyGetRelated embeds SubsystemBase without an ID. Resolve only a unique fresh name.
  const response=salesHqGet_('/v2/Subsystems?$top=200&$skip=0&orderby=id'),data=response.data,rows=Array.isArray(data)?data:data?.data||data?.value;
  if(!Array.isArray(rows)||rows.length>=200)throw Error('HQ-Unternehmensbereiche nicht vollständig prüfbar.');
  const key=Object.keys(response.headers).find(k=>k.toLowerCase()==='hellohq-count');if(key&&Number(response.headers[key])!==rows.length)throw Error('HQ-Unternehmensbereiche nicht vollständig prüfbar.');
  const targets=rows.filter(row=>Number(row.id)===id);if(targets.length!==1||!targets[0].name||rows.filter(row=>row.name===targets[0].name).length!==1)return false;
  const target=targets[0],matches=linked.filter(row=>row.name===target.name);return matches.length===1&&['isMaster','currency'].every(k=>matches[0][k]===undefined||String(matches[0][k]??'')===String(target[k]??''));
}
function salesCompanyTypeId_(row) {
  const id=Number(row?.companyTypeId??row?.id);
  if(!Number.isSafeInteger(id)||id<=0||(row?.id!=null&&row?.companyTypeId!=null&&Number(row.id)!==Number(row.companyTypeId)))throw new Error('HQ-Firmenart ist nicht eindeutig.');
  return id;
}
function salesCompanyTypes_(rows) {
  return (rows||[]).map(row=>({...salesPick_(row,['name','number']),companyTypeId:salesCompanyTypeId_(row)}));
}
function salesCompany_(raw) {
  const pickAddress=a=>a?salesPick_(a,['id','street','houseNumber','zipCode','city','country','description','standardForDocumentType','website']):null;
  const website=salesWebsite_(raw);
  return {id:String(salesId_(raw.id)),name:raw.name||'',industrialSector:raw.industrialSector||'',description:raw.description||'',homepage:raw.homepage||'',
    homepageDisplay:website.value,homepageSource:website.source,
    subsystems:(raw.subsystems||[]).map(x=>salesPick_(x,['id','name','isMaster','currency'])),companyTypes:salesCompanyTypes_(raw.companyTypes),responsibleUsers:(raw.responsibleUsers||[]).map(x=>salesPick_(x,['id','userId','firstName','lastName'])),
    defaultAddress:pickAddress(raw.defaultAddress),addresses:(raw.addresses||[]).map(pickAddress),customFields:salesCompanyCustomSelected_(raw.customFields).map(x=>salesPick_(x,['name','type','value'])),updatedOn:raw.updatedOn||null};
}
function salesWebsite_(raw) {
  const clean=v=>typeof v==='string'?v.trim():'';
  if(clean(raw.homepage)) return {value:clean(raw.homepage),source:'Firma'};
  const addresses=raw.addresses||[],standard=raw.defaultAddress;
  const standardWebsite=clean(standard?.website)||clean(addresses.find(a=>standard?.id&&String(a.id)===String(standard.id))?.website);
  if(standardWebsite) return {value:standardWebsite,source:'Standardadresse'};
  const invoice=Array.from(new Set(addresses.filter(a=>a.standardForDocumentType==='Invoice').map(a=>clean(a.website)).filter(Boolean)));
  if(invoice.length===1) return {value:invoice[0],source:'Rechnungsadresse'};
  return {value:'',source:invoice.length>1?'Mehrere Websites an Rechnungsadressen':'Von HQ nicht geliefert'};
}
function salesDate_(value) {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)) return null;
  const day=value.slice(0,10),date=new Date(day+'T00:00:00Z');
  return !isNaN(date.getTime())&&date.toISOString().slice(0,10)===day&&day>'1900-01-01'?day:null;
}
function salesPlannedRevenue_(raw) {
  const amount=v=>{const n=revenueAmountCents_(v);return Number.isSafeInteger(n)?n:null;};
  return {id:String(salesId_(raw.id)),description:raw.description||'',status:raw.status||'',currency:raw.currency||'',interval:raw.interval||'',
    netCents:amount(raw.netTotal),startDate:salesDate_(raw.startDate),endDate:salesDate_(raw.endDate),dueDay:raw.dueDay??null,dueMonth:raw.dueMonth??null,invoiceDateRule:raw.invoiceDate||'',
    estimations:Array.isArray(raw.estimations)?raw.estimations.map(e=>({date:salesDate_(e.estimatedDueDate),cents:amount(e.estimatedNetValue),status:e.documentStatus||'',documentId:Number.isSafeInteger(e.documentId)&&e.documentId>=0?e.documentId:null})):null};
}
function salesHistory_(raw,documents,projectById) {
  const row=salesPick_(raw,['id','companyId','projectId','contactPersonId','userId','reason','content','contactOn','nextContactDate','contactHistoryChannel','contactHistoryStatus','updatedOn','syncId','responsibleUserIds','isReminder','recipientEmailAddress']);
  const reason=String(raw.reason||''),content=String(raw.content||''),channel=raw.contactHistoryChannel;
  row.documentDispatch=channel==='SentDocument';
  const possibleDocumentMail=channel==='Mail'&&!String(raw.syncId||'').startsWith('sales-')&&/\b(rechnung|invoice|gutschrift|credit note)\b/i.test(reason);
  if(!row.documentDispatch&&!possibleDocumentMail) return row;
  const project=projectById[String(raw.projectId)];
  row.projectName=project?.name||'';
  // HQ has no documentId on ContactHistories. Match only an explicit, unique document number
  // in the subject, or a labelled invoice reference in the message; never match by sum/date alone.
  const candidates=documents.filter(d=>['Invoice','CreditNote'].includes(d.documentType)&&Number(d.companyId)===Number(raw.companyId)&&(!raw.projectId||Number(d.projectId)===Number(raw.projectId))&&String(d.number||'').trim()).filter(d=>{
    const number=String(d.number).trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const boundary='(?![\\p{L}\\p{N}_/-]|\\.[\\p{L}\\p{N}])';
    const exact=new RegExp('(?:^|[^\\p{L}\\p{N}_/.-])'+number+boundary,'iu');
    const labelled=new RegExp('(?:rechnung|invoice|gutschrift|credit note)(?:snummer|s?nr\\.?|\\s+(?:nummer|number|no\\.?|nr\\.?))?[\\s:#-]*'+number+boundary,'iu');
    return (exact.test(reason)&&(/\D/.test(String(d.number))||labelled.test(reason)))||labelled.test(content);
  });
  if(candidates.length!==1) {if(row.documentDispatch)row.documentMatch=candidates.length?'ambiguous':'missing';return row;}
  row.documentDispatch=true;
  const d=candidates[0],n=revenueAmountCents_(d.netValue);
  row.documentMatch='number';row.projectName=projectById[String(d.projectId)]?.name||row.projectName;
  row.invoice={id:String(d.id),projectId:d.projectId?String(d.projectId):null,number:d.number,type:d.documentType,date:salesDate_(d.date),currency:d.currency||'',netCents:Number.isSafeInteger(n)?(d.documentType==='CreditNote'?-Math.abs(n):n):null};
  return row;
}
function salesBelegs_(docs) {
  const accepted=[],ignored={draft:0,canceled:0,other:0},issues=[];
  for(const d of docs) {
    if(!['Invoice','CreditNote'].includes(d.documentType)) {ignored.other++;continue;}
    const status=d.documentStatusEntity&&d.documentStatusEntity.documentStatusType;
    if(status==='Draft') {ignored.draft++;continue;}
    if(status==='Canceled') {ignored.canceled++;continue;}
    if(!['Sent','Accepted','Paid'].includes(status)) {issues.push({id:d.id,reason:'Belegstatus noch nicht fachlich zugeordnet'});continue;}
    const cents=revenueAmountCents_(d.netValue);
    if(d.currency!=='EUR'||cents===null||!Number.isSafeInteger(cents)||!d.companyId||!/^\d{4}-\d{2}-\d{2}/.test(d.date||'')) {issues.push({id:d.id,reason:'Betrag, Währung, Empfänger oder Datum prüfen'});continue;}
    accepted.push({id:String(salesId_(d.id)),companyId:String(salesId_(d.companyId)),projectId:d.projectId?String(d.projectId):null,type:d.documentType,status,date:d.date.slice(0,10),number:d.number||'',cents:d.documentType==='CreditNote'?-Math.abs(cents):cents,sourceId:d.createdFromId||null});
  }
  // A credit referencing a canceled source must be reviewed to avoid subtracting twice.
  const canceled=new Set(docs.filter(d=>d.documentStatusEntity&&d.documentStatusEntity.documentStatusType==='Canceled').map(d=>Number(d.id)));
  accepted.forEach(d=>{if(d.type==='CreditNote'&&canceled.has(Number(d.sourceId))) issues.push({id:d.id,reason:'Gutschrift zu storniertem Beleg: fachlichen Nettobetrag prüfen'});});
  return {accepted,ignored,issues,complete:issues.length===0};
}
function syncSalesEdition() {
  salesUser_(true);return salesLock_(()=>{salesAssertPrivate_();const started=Date.now();
    const projects=salesCollect_('Projects',"number eq '"+SALES.projectNumber+"'",started);
    if(projects.length!==1||String(projects[0].number)!==SALES.projectNumber||projects[0].name!==SALES.projectName) throw new Error('Das Pilotprojekt wurde nicht eindeutig als COBURGER Ausgabe #70 erkannt. Kein Import.');
    const project=projects[0],docs=salesCollect_('Documents','projectId eq '+salesId_(project.id),started);
    if(docs.some(d=>Number(d.projectId)!==Number(project.id))) throw new Error('HQ-Projektfilter wurde nicht eingehalten.');
    const result=salesBelegs_(docs),ids=Array.from(new Set(docs.filter(d=>['Invoice','CreditNote'].includes(d.documentType)&&d.companyId).map(d=>salesId_(d.companyId))));
    const companies=ids.map(id=>{if(Date.now()-started>SALES.maxMs) throw new Error('Zeitbudget erreicht.');return salesCompany_(salesOne_('Companies',id));});
    const old=salesRead_('sales_editions/'+SALES.edition);
    const edition={id:SALES.edition,magazine:'Coburger',issue:70,projectId:String(project.id),projectNumber:project.number,projectName:project.name,companies,documents:result.accepted,ignored:result.ignored,issues:result.issues,complete:result.complete,loadedAt:salesNow_(),settings:old&&old.settings||{targetCents:null,adDeadline:'',printDate:'',releaseDate:'',revision:0},changes:old&&old.changes||[]};
    salesWrite_('sales_editions/'+SALES.edition,edition);
    return {message:'Ausgabe und '+companies.length+' Unternehmen nach Firebase übertragen.',companies:companies.length,documents:result.accepted.length,complete:result.complete};});
}
function getSalesCompany(id) {
  salesUser_();
  if(typeof id==='string'&&id.startsWith('draft_')) {
    const draft=salesRead_('sales_drafts/'+salesKey_(id.slice(6)));
    if(!draft?.company||draft.deletedAt) throw new Error(draft?.deletedAt?'Dieser Kunde wurde gelöscht.':'Firebase-Firma fehlt.');
    const job=salesRead_('sales_jobs/'+draft.id),catalog=salesRead_('sales_meta/catalog');
    const local=salesLocalCompany_(draft,catalog,job),stored=draft.hqId?salesRead_('sales_companies/'+draft.hqId):null;
    const contacts=draft.contact&&!draft.contactDeletedAt?[{...draft.contact,id:job?.contactId||'draft_'+draft.id+'_contact',localDraftId:draft.id,syncState:job?.steps?.contact?'confirmed':'pending'}]:[];
    return {...(stored||{}),company:job?.state==='synced'&&stored?{...stored.company,id:local.id,localDraftId:draft.id,hqId:String(draft.hqId),syncState:job.state}:local,
      contacts:stored?.contacts?.length?stored.contacts:contacts,histories:draft.hqId?salesVisibleHistories_(draft.hqId,stored?.histories):[],projects:stored?.projects||[],detailVersion:3,source:'firebase'};
  }
  id=String(salesId_(id));const edition=salesRead_('sales_editions/'+SALES.edition),drafts=salesList_('sales_drafts');
  const own=drafts.filter(d=>String(d.hqId)===id);
  if(own.length>1)throw new Error('HQ-Firma ist mehreren Testentwürfen zugeordnet. Zuordnung zuerst prüfen.');
  if(own.length===1)return getSalesCompany('draft_'+own[0].id);
  if(!edition?.companies.some(c=>c.id===id)&&!drafts.some(d=>String(d.hqId)===id)) throw new Error('Firma gehört nicht zum freigegebenen Pilotbestand.');
  const stored=salesRead_('sales_companies/'+id);
  return stored?{...stored,histories:salesVisibleHistories_(id,stored.histories)}:null;
}
function salesVisibleHistories_(companyId,rows) {
  const histories=(rows||[]).map(h=>({...h,source:'hq'}));
  salesList_('sales_jobs').filter(j=>j.kind==='history'&&String(j.hqId)===String(companyId)&&j.state!=='canceled').forEach(j=>{
    const matches=histories.filter(h=>(j.historyId&&String(h.id)===String(j.historyId))||(h.syncId&&h.syncId===j.history.syncId));
    if(matches.length)matches.forEach(h=>Object.assign(h,{jobId:j.id,syncState:j.state}));
    else histories.push({...j.history,id:'local_'+j.id,jobId:j.id,source:'app',syncState:j.state==='synced'?'missing':j.state});
  });
  return histories;
}
function salesHistoryRows_(histories,documents,projects,started) {
  const byId={};projects.forEach(p=>{byId[String(p.id)]=p;});
  const rows=histories.map(h=>salesHistory_(h,documents,byId));
  const ids=Array.from(new Set(rows.filter(h=>h.documentDispatch).map(h=>h.invoice?.projectId||h.projectId).filter(Boolean).map(id=>String(salesId_(id)))));
  ids.forEach(id=>{if(!byId[id]){if(Date.now()-started>SALES.maxMs)throw new Error('Zeitbudget erreicht. Bisherige Historie bleibt erhalten.');byId[id]=salesOne_('Projects',id);}});
  rows.forEach(h=>{if(h.documentDispatch)h.projectName=byId[String(h.invoice?.projectId||h.projectId)]?.name||'';});
  return rows;
}
function syncSalesHistory(id) {
  salesUser_(true);return salesLock_(()=>{
    const visible=getSalesCompany(id);
    if(!visible)throw new Error('Zuerst Firmendetails importieren.');
    const companyId=salesId_(visible.company.hqId||visible.company.id);
    salesAssertPrivate_();const started=Date.now();
    let stored=salesRead_('sales_companies/'+companyId);
    if(!stored){
      // A contact read-back may still be open. History import needs only the known company.
      const draft=salesRead_('sales_drafts/'+salesKey_(visible.company.localDraftId)),creation=draft&&salesRead_('sales_jobs/'+draft.id);
      salesHistoryCompanyBinding_(draft,creation);
      const actual=salesOne_('Companies',companyId);
      if(Number(actual.id)!==companyId||actual.name!==draft.company.name)throw new Error('HQ-Firmenzuordnung nicht bestätigt.');
      stored={company:salesCompany_(actual),contacts:[],histories:[],projects:[],detailVersion:3};
    }
    const histories=salesCollect_('ContactHistories','companyId eq '+companyId,started),documents=salesCollect_('Documents','companyId eq '+companyId,started);
    if([...histories,...documents].some(h=>Number(h.companyId)!==companyId))throw new Error('HQ-Firmenfilter wurde nicht eingehalten. Bisherige Historie bleibt erhalten.');
    const rows=salesHistoryRows_(histories,documents,[],started);
    stored.histories=rows;stored.historyLoadedAt=salesNow_();
    salesWrite_('sales_companies/'+companyId,stored);
    return {message:rows.length+' HQ-Historieneinträge vollständig nach Firebase übertragen. Offene App-Einträge bleiben erhalten.'};
  });
}
function salesLocalCompany_(draft,catalog,job) {
  draft=salesBusinessVisibleDraft_(draft);
  const company=draft.company,user=(catalog?.users||[]).find(u=>Number(u.id)===Number(company.responsibleUserIds?.[0]));
  const addressOrigin=draft.addressOrigin==='Sonstige'?draft.addressOriginOther:draft.addressOrigin;
  return {id:'draft_'+draft.id,localDraftId:draft.id,hqId:draft.hqId?String(draft.hqId):null,name:company.name,industrialSector:company.industrialSector||'',description:company.description||'',homepage:company.homepage||'',homepageDisplay:company.homepage||'',homepageSource:'App',defaultAddress:company.defaultAddress,addresses:[],companyTypes:(company.companyTypes||[]).map(t=>({...t,name:(catalog?.types||[]).find(x=>Number(x.id)===Number(t.companyTypeId))?.name||draft.kind})),responsibleUsers:[{userId:company.responsibleUserIds?.[0],firstName:user?.name||'',lastName:''}],customFields:[...(company.customFields||[]),...((company.customFields||[]).some(f=>f.name==='Adressherkunft')?[]:[{name:'Adressherkunft',value:addressOrigin||''}])],subsystems:(company.subsystemIds||[]).map(id=>({id,name:(catalog?.subsystems||[]).find(s=>Number(s.id)===Number(id))?.name||''})),pendingEditCount:(draft.pendingChanges||[]).length,syncState:job?.state||'pending'};
}
function syncSalesCompany(id) {
  salesUser_(true);id=String(salesId_(id));return salesLock_(()=>{
    const edition=salesRead_('sales_editions/'+SALES.edition),drafts=salesList_('sales_drafts');
    if(!edition?.companies.some(c=>c.id===id)&&!drafts.some(d=>String(d.hqId)===id)) throw new Error('Firma gehört nicht zum Pilotbestand.');
    salesAssertPrivate_();const started=Date.now(),company=salesCompany_(salesOne_('Companies',id));
    const contacts=salesCollect_('ContactPersons','companyId eq '+id,started,'DefaultAddress'),histories=salesCollect_('ContactHistories','companyId eq '+id,started),projects=salesCollect_('Projects','companyId eq '+id,started);
    if([...contacts,...histories,...projects].some(x=>Number(x.companyId)!==Number(id))) throw new Error('HQ-Firmenfilter wurde nicht eingehalten.');
    const customerDocuments=salesCollect_('Documents','companyId eq '+id,started);
    if(customerDocuments.some(d=>Number(d.companyId)!==Number(id))) throw new Error('HQ-Belegempfänger stimmt nicht mit der Firma überein.');
    const historyRows=salesHistoryRows_(histories,customerDocuments,projects,started);
    const projectRows=projects.map(p=>{
      const ds=salesCollect_('Documents','projectId eq '+salesId_(p.id),started);if(ds.some(d=>Number(d.projectId)!==Number(p.id))) throw new Error('HQ-Projektfilter wurde nicht eingehalten.');
      const b=salesBelegs_(ds),actualFinishDate=salesDate_(p.actualFinishDate),status=p.status||p.projectStatus?.name||'';
      const completed=!!actualFinishDate||/^(abgeschlossen|completed|finished)$/i.test(status.trim());
      let plans=[];
      if(!completed) {
        try {plans=salesCollect_('PlannedRevenues','projectId eq '+salesId_(p.id),started,'Estimations');}
        catch(e) {throw new Error('Planumsätze konnten nicht gelesen werden. '+e.message+' Der bisherige Firebase-Stand bleibt erhalten.');}
        if(plans.some(r=>Number(r.projectId)!==Number(p.id))) throw new Error('HQ-Planumsätze gehören nicht zum angefragten Projekt.');
      }
      return {id:String(p.id),number:p.number||'',name:p.name||'',status,actualFinishDate,plannedFinishDate:salesDate_(p.plannedFinishDate),completed,
        plannedRevenues:plans.map(salesPlannedRevenue_),revenueCents:b.accepted.reduce((n,d)=>n+d.cents,0),complete:b.complete};
    });
    const value={company,contacts:contacts.map(salesContactView_),histories:historyRows,historyLoadedAt:salesNow_(),projects:projectRows,detailVersion:3,loadedAt:salesNow_()};
    salesWrite_('sales_companies/'+id,value);return {message:'Firmendetails nach Firebase übertragen. Jetzt erneut aus Firebase laden.'};});
}
function saveSalesEditionSettings(input) {
  const user=salesUser_();return salesLock_(()=>{const e=salesRead_('sales_editions/'+SALES.edition);if(!e) throw new Error('Zuerst Ausgabe importieren.');
    if(Number(input.revision)!==e.settings.revision) throw new Error('Ziel oder Termine wurden inzwischen geändert. Bitte neu laden und vergleichen.');
    const target=Number(input.target);if(!Number.isFinite(target)||target<0||target>100000000) throw new Error('Zielumsatz ungültig.');
    const settings={targetCents:Math.round(target*100),revision:e.settings.revision+1};
    ['adDeadline','printDate','releaseDate'].forEach(k=>{const v=salesText_(input[k],10,false);if(v&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)) throw new Error('Ungültiges Datum.');settings[k]=v;});
    if(settings.adDeadline&&settings.printDate&&settings.adDeadline>settings.printDate || settings.printDate&&settings.releaseDate&&settings.printDate>settings.releaseDate) throw new Error('Termine müssen in zeitlicher Reihenfolge liegen.');
    e.changes=[{at:salesNow_(),actor:user.email,...(user.uid?{actorUid:user.uid}:{}),before:e.settings,after:settings}].concat(e.changes||[]).slice(0,50);e.settings=settings;salesWrite_('sales_editions/'+SALES.edition,e);return {message:'Ziel und Termine für alle Nutzer gespeichert.'};});
}

function salesJobSummary_(j) {
  const out=salesPick_(j,['id','kind','draftId','name','state','createdAt','updatedAt','message','hqId','contactId','conflict','steps','companyConfirmedAt','lastWrite','markerMode','entity','targetId','business']);
  if(j.kind==='createCompany') {out.nextStep=j.companyConfirmedAt?'contact':'company';out.historyReady=salesHistoryReady_(salesRead_('sales_drafts/'+j.id),j);}
  return out;
}
function salesDraftInput_(input,catalog) {
  if(input.companyTypeId)input={...input,...salesCustomerValidate_(salesPick_(input,SALES_CUSTOMER_FORM_KEYS),{Kundenherkunft:'[]'},catalog)};
  const name=salesText_(input.name,150,true);
  const requested=input.kind==='Kunde'?'Kunde':'Interessent',type=input.companyTypeId?catalog.types.find(t=>Number(t.id)===salesId_(input.companyTypeId)):catalog.types.find(t=>t.name.toLowerCase()===requested.toLowerCase()),typeName=type?.name||requested;
  if(!type) throw new Error('HQ-Firmentyp '+typeName+' fehlt in den eingelesenen Auswahllisten.');
  const userId=salesId_(input.responsibleUserId);if(!catalog.users.some(u=>Number(u.id)===userId)) throw new Error('Verantwortlichen HQ-Benutzer auswählen.');
  const subsystemId=salesId_(input.subsystemId);if(!catalog.subsystems.some(s=>Number(s.id)===subsystemId)) throw new Error('HQ-Unternehmensbereich auswählen.');
  const homepage=salesWebsiteInput_(input.homepage);
  const address={street:salesText_(input.street,150,true),houseNumber:salesText_(input.houseNumber,30,false),zipCode:salesText_(input.zipCode,20,true),city:salesText_(input.city,100,true),country:salesText_(input.country||'DE',2,true),description:'Standardadresse'};
  if(homepage)address.website=homepage;
  if(!/^[A-Z]{2}$/.test(address.country)) throw new Error('Land als zweistelligen Code angeben, zum Beispiel DE.');
  const origin=salesText_(input.addressOrigin,80,false);if(!['','Wirtschaftsclub Bamberg','Logan Five','Sonstige'].includes(origin)) throw new Error('Adressherkunft ungültig.');
  const originOther=salesText_(input.addressOriginOther,200,origin==='Sonstige');
  const industry=salesText_(input.industrialSector,150,false);
  if(industry&&!(catalog.industries||[]).includes(industry)&&input.newIndustry!==true&&input.newIndustry!=='true') throw new Error('Bitte eine Branche aus der aktuellen HQ-Auswahlliste wählen.');
  const company={name,industrialSector:industry,homepage,description:salesText_(input.description,20000,false),defaultAddress:address,companyTypes:[{companyTypeId:type.id}],responsibleUserIds:[userId],subsystemIds:[subsystemId]};
  const customFields=[salesCompanyNewOrigin_(catalog)];['Kundenklassifizierung','erstelldatum'].forEach(k=>{const text=salesText_(input[k],2000,false);if(text){const def=catalog.fields.find(f=>salesCompanyCustomKey_(f.name)===salesCompanyCustomKey_(k));if(!def)throw new Error('HQ-Feld '+k+' ist noch nicht bestätigt.');const value=salesCompanyCustomInput_(text,def);if(Array.isArray(value)&&!value.length)return;customFields.push({name:def.name,type:def.type,value});}});
  const reason=salesCompanyReason_(input.addressCreationReason,'',catalog);if(reason){const def=catalog.fields.find(f=>salesCompanyCustomKey_(f.name)==='grund der adressanlage');customFields.push({name:def.name,type:def.type,value:salesCompanyCustomInput_(reason,def)});}
  if(customFields.length) company.customFields=customFields;
  const contact={};['firstName','lastName','position','salutation','eMail','phoneMobile','phoneLandline'].forEach(k=>contact[k]=salesText_(input[k],200,false));
  if(!contact.firstName||!contact.lastName) throw new Error('Bitte Vor- und Nachname des ersten Ansprechpartners eingeben.');
  if(contact.salutation&&!(catalog.salutations||[]).includes(contact.salutation)) throw new Error('Bitte eine Anrede aus der aktuellen HQ-Auswahlliste wählen.');
  contact.salutationForm=salesSalutationForm_(input.salutationForm);
  return {company,contact,kind:typeName,addressOrigin:origin,addressOriginOther:origin==='Sonstige'?originOther:''};
}
function salesSalutationForm_(value) {
  const form=value===undefined||value===null||value===''?'Formal':value;
  if(!['Formal','Informal','Neutral'].includes(form)) throw new Error('Bitte eine gültige Ansprache wählen: Formell, Informell oder Neutral.');
  return form;
}
function saveSalesTestCompany(input) {
  const user=salesUser_();return salesLock_(()=>{salesAssertPrivate_();const cat=salesRead_('sales_meta/catalog');if(!cat) throw new Error('Zuerst HQ-Auswahllisten importieren.');
    const requestId=input?.requestId===undefined||input.requestId===''?'':salesKey_(String(input.requestId)),value=salesDraftInput_(input,cat),id=requestId?'req_'+requestId:Utilities.getUuid();
    if(value.company.industrialSector&&!(cat.industries||[]).includes(value.company.industrialSector)){cat.industries=[...(cat.industries||[]),value.company.industrialSector].sort((a,b)=>a.localeCompare(b,'de'));salesWrite_('sales_meta/catalog',cat);}
    // A repeated request after a lost response returns the stored draft instead of creating a second HQ company.
    if(requestId){const old=salesRead_('sales_jobs/'+id);if(old){const prior=salesRead_('sales_drafts/'+id);
      if(old.kind!=='createCompany'||old.actor!==user.email||!prior||Object.keys(value).some(k=>JSON.stringify(prior[k])!==JSON.stringify(value[k])))throw new Error('Speicherkennung gehört zu einer anderen Eingabe.');
      return {id,replay:true,message:'Diese Firma wurde bereits gespeichert. Es wurde keine zweite Anlage erzeugt.'};}}
    const draft={id,createdBy:user.email,createdAt:salesNow_(),...value,hqId:null};
    salesWrite_('sales_drafts/'+id,draft);
    const job={id,kind:'createCompany',markerMode:'none',draftId:id,name:value.company.name,state:'pending',actor:user.email,...(user.uid?{actorUid:user.uid}:{}),createdAt:salesNow_(),updatedAt:salesNow_(),steps:{},message:'In Firebase gespeichert. HQ wurde noch nicht verändert.'};
    salesWrite_('sales_jobs/'+id,job);return {id,message:'Firma und Ansprechpartner sind in Firebase gespeichert und sofort in der Kundenansicht sichtbar. HQ wurde noch nicht verändert.'};});
}
function getSalesJobPreview(id) {
  const user=salesUser_(),job=salesRead_('sales_jobs/'+salesKey_(id));if(!job) throw new Error('Auftrag fehlt.');
  const review=user.admin&&job.review?{review:job.review,changeReason:job.changeReason,previousValue:job.base,changeAuthor:job.actor}:{};
  if(job.business===1)return {job:salesJobSummary_(job),...review,change:job.change,contact:job.contact,companyRef:job.companyRef,history:job.history||(job.kind==='communication'?{reason:job.capture.notReached?'Nicht erreicht':'Gespräch / Notiz',content:job.capture.content||'Nicht erreicht',contactOn:job.capture.contactOn,contactHistoryChannel:job.capture.notReached?'Call':'Note',contactPersonId:job.capture.contactRef}:null),note:'Kundenstammdaten und Kommunikation. HQ-Projekte und Rechnungen bleiben nur lesbar.'};const d=salesRead_('sales_drafts/'+job.draftId);
  return {job:salesJobSummary_(job),...review,company:d.company,contact:d.contact,addressOrigin:d.addressOrigin,addressOriginOther:d.addressOriginOther,history:job.history||null,change:job.kind==='cleanupMarker'?{description:d.company.description,operation:'Technische Kennzeichnung nach Prüfung entfernen'}:job.change||null,note:'HQ-Ziel ausschließlich eigene Firma. Kein Projekt-/Rechnungsschreibzugriff.'};
}
function getSalesTestAudit(id) {
  salesUser_(true);const d=salesRead_('sales_drafts/'+salesKey_(id));
  if(!d?.company||!d.hqId) throw new Error('Nur eine eigene bestätigte Firma kann geprüft werden.');
  const actual=salesOne_('Companies',d.hqId),stored=salesRead_('sales_companies/'+d.hqId),website=salesWebsite_(actual),job=salesRead_('sales_jobs/'+d.id);
  if(actual.name!==d.company.name) throw new Error('HQ-Ziel ist nicht mehr die eigene Firma.');
  let contactStatus=d.contact?'Noch nicht in HQ bestätigt':'Kein Ansprechpartner im Entwurf gespeichert.';
  if(d.contact&&job?.contactId){
    let contact=salesOne_('ContactPersons',job.contactId),addressNote='';
    if(Number(contact.companyId)!==Number(d.hqId)) throw new Error('HQ-Kontakt gehört nicht zur gespeicherten Firma. Prüfung angehalten.');
    if(contact.defaultAddressId&&!contact.defaultAddress){
      try {
        const expanded=salesHqGet_('/v2/ContactPersons/'+salesId_(job.contactId)+'?expand=DefaultAddress').data;
        if(Number(expanded?.id)!==Number(job.contactId)||Number(expanded?.companyId)!==Number(d.hqId)) throw new Error('Kontaktzuordnung beim Adressabruf unklar.');
        contact=expanded;
      }catch(_){addressNote=' · Kontaktadresse: zusätzlicher Lesetest nicht erfolgreich; keine Aussage über ihren Inhalt';}
    }
    contactStatus=salesContactDiagnostic_(contact,d.contact)+addressNote;
  }
  else if(d.contact&&job?.contactAttempted)contactStatus='Schreibversuch unklar: vor erneutem Anlegen Auftrag prüfen.';
  return {draftHomepage:d.company.homepage||'',hqHomepage:actual.homepage||'',hqAddressWebsite:actual.defaultAddress?.website||'',appHomepage:stored?.company?.homepageDisplay||'',displayHomepage:website.value,displaySource:website.source,
    markerPresent:String(actual.description||'').includes('[Sales-Test '+d.id+']'),detailVersion:stored?.detailVersion||null,creationState:job?.state||'Auftrag fehlt',contactStatus};
}
function salesContactDifferences_(actual,expected) {
  // Return only known field names, never values from the contact.
  const keys=['firstName','lastName','position','salutation','salutationForm','eMail','phoneMobile','phoneLandline'];
  const normalized=Object.assign({},actual,{eMail:salesContactEmail_(actual)});
  return keys.filter(k=>expected[k]!==undefined&&!salesEqualFields_(normalized,{[k]:expected[k]}));
}
function salesContactEmail_(contact) {return String(contact?.eMail||contact?.defaultAddress?.email||'');}
function salesContactView_(contact) {
  return {...salesPick_(contact,['id','companyId','firstName','lastName','position','salutation','salutationForm','phoneMobile','phoneLandline','language','birthdate','note','customFields','defaultAddressId','defaultAddress','updatedOn']),eMail:salesContactEmail_(contact)};
}
function salesContactWithAddress_(id) {
  const contact=salesOne_('ContactPersons',id);
  if(contact.defaultAddressId&&!contact.defaultAddress){
    const full=salesHqGet_('/v2/ContactPersons/'+salesId_(id)+'?expand=DefaultAddress').data;
    if(Number(full?.id)!==Number(id)||Number(full?.companyId)!==Number(contact.companyId)) throw new Error('Kontaktzuordnung beim Adressabruf unklar.');
    return full;
  }
  return contact;
}
function salesContactDiagnostic_(actual,expected) {
  const expectedEmail=String(expected.eMail||'').trim();
  function status(object,key){
    if(!object||!Object.prototype.hasOwnProperty.call(object,key))return 'Feld nicht geliefert';
    const value=String(object[key]??'').trim();
    return !value?'leer':!expectedEmail?'vorhanden (Firebase leer)':value===expectedEmail?'stimmt mit Firebase überein':'vorhanden, weicht von Firebase ab';
  }
  const parts=['Kontaktprüfung 2026-10-06-r19.1','E-Mail in Firebase: '+(expectedEmail?'vorhanden':'leer')];
  ['eMail','email','Email','EMail'].forEach(k=>parts.push('HQ '+k+': '+status(actual,k)));
  parts.push('HQ defaultAddress.email: '+status(actual.defaultAddress,'email'));
  parts.push('HQ-Kontaktadresse verknüpft: '+(actual.defaultAddressId?'ja':'nicht bestätigt'));
  const differences=salesContactDifferences_(actual,expected);
  parts.push('Abweichende Kontaktfelder: '+(differences.join(', ')||'keine'));
  return parts.join(' · ');
}
function salesContactAddressFields_(address) {
  return salesPick_(address,['alternativeCompanyName','additionalInformation','street','houseNumber','zipCode','city','country','description','phone','email','fax','website','addressLine2','standardForDocumentType']);
}
function salesContactEmailState_(draft,contactId) {
  const creation=salesRead_('sales_jobs/'+draft.id);
  if(!draft.company||creation?.kind!=='createCompany'||Number(creation.hqId)!==Number(draft.hqId)||Number(creation.contactId)!==Number(contactId)) throw new Error('Kontakt ist nicht der selbst angelegte Ansprechpartner dieser Firma.');
  const company=salesOne_('Companies',draft.hqId);
  if(company.name!==draft.company.name) throw new Error('HQ-Firmenzuordnung wurde verändert.');
  const contact=salesHqGet_('/v2/ContactPersons/'+salesId_(contactId)+'?expand=DefaultAddress,CustomFields').data;
  if(Number(contact?.id)!==Number(contactId)||Number(contact?.companyId)!==Number(draft.hqId)) throw new Error('HQ-Kontaktzuordnung stimmt nicht mit dem Auftrag überein.');
  const scalar=['firstName','lastName','position','phoneLandline','phoneMobile','eMail','salutation','salutationForm','language','birthdate','note'];
  if(scalar.some(k=>!Object.prototype.hasOwnProperty.call(contact,k))||!Object.prototype.hasOwnProperty.call(contact,'customFields')) throw new Error('HQ hat die Kontaktfelder nicht vollständig geliefert. Keine Änderung, damit vorhandene Daten erhalten bleiben.');
  const addressId=salesId_(contact.defaultAddressId);
  if(!contact.defaultAddress||typeof contact.defaultAddress!=='object') throw new Error('Verknüpfte Kontaktadresse nicht vollständig lesbar. Keine Änderung.');
  const payload=salesPick_(contact,scalar);
  if(contact.customFields!==null&&!Array.isArray(contact.customFields)) throw new Error('Eigene Kontaktfelder nicht eindeutig lesbar.');
  payload.customFields=contact.customFields===null?null:contact.customFields.map(f=>{
    if(!f.name||!f.type||!Object.prototype.hasOwnProperty.call(f,'value')) throw new Error('Eigenes Kontaktfeld nicht vollständig lesbar.');
    return salesPick_(f,['name','type','value']);
  });
  payload.defaultAddress=salesContactAddressFields_(contact.defaultAddress);
  // Canonical comparison tolerates HQ exposing the address e-mail only via the address.
  payload.eMail=salesContactEmail_(contact);
  return {addressId,payload};
}
function salesAssertOwnContactAddress_(draft,contactId,addressId) {
  const data=salesHqGet_('/v2/Companies/'+salesId_(draft.hqId)+'/Addresses').data;
  const addresses=Array.isArray(data)?data:data?.data||data?.value;
  if(!Array.isArray(addresses)) throw new Error('Firmenadressen nicht vollständig lesbar.');
  if(addresses.some(a=>Number(a.id)===addressId)) throw new Error('Die Kontaktadresse wird auch als Firmenadresse verwendet. Keine automatische E-Mail-Änderung.');
  const contacts=salesCollect_('ContactPersons','defaultAddressId eq '+addressId,Date.now());
  if(contacts.length!==1||Number(contacts[0].id)!==Number(contactId)||Number(contacts[0].defaultAddressId)!==addressId||Number(contacts[0].companyId)!==Number(draft.hqId)) throw new Error('Kontaktadresse ist nicht eindeutig diesem Ansprechpartner zugeordnet. Keine Änderung.');
}
function queueSalesContactEmail(id) {
  salesUser_(true);return salesLock_(()=>{salesAssertPrivate_();const draft=salesRead_('sales_drafts/'+salesKey_(id)),creation=salesRead_('sales_jobs/'+id);
    if(!draft?.company||creation?.state!=='contactCreated'||!creation.contactId) throw new Error('Zuerst den eigenen Ansprechpartner anlegen. Diese Korrektur gilt nur für eine offene Kontakt-Rückprüfung.');
    const existing=salesList_('sales_jobs').find(j=>j.kind==='contactEmail'&&j.draftId===id&&j.state!=='canceled');
    if(existing)return {id:existing.id,message:'Der E-Mail-Auftrag ist bereits vorhanden. Bitte dessen Ergebnis prüfen.'};
    const email=salesText_(draft.contact?.eMail,200,true),base=salesContactEmailState_(draft,creation.contactId);
    const differing=salesContactDifferences_(base.payload,draft.contact).filter(k=>k!=='eMail');
    if(differing.length) throw new Error('Andere Kontaktfelder wurden verändert: '+differing.join(', ')+'. Keine automatische E-Mail-Korrektur.');
    if(base.payload.eMail||base.payload.defaultAddress.email) throw new Error('In HQ ist bereits eine E-Mail vorhanden. Bitte zuerst zurückprüfen; vorhandene E-Mail wird nicht überschrieben.');
    salesAssertOwnContactAddress_(draft,creation.contactId,base.addressId);
    const target=JSON.parse(JSON.stringify(base)),address=target.payload.defaultAddress;
    const location=['street','zipCode','city','country'];let copiedAddress=false;
    if(location.every(k=>!address[k])){
      // An empty auto-created contact address needs the documented mandatory address fields.
      location.concat(['houseNumber']).forEach(k=>{address[k]=draft.company.defaultAddress[k]||'';});copiedAddress=true;
    }
    if(location.some(k=>!address[k])) throw new Error('Kontaktanschrift ist nur teilweise gefüllt. Bitte die fehlenden Adressangaben klären; keine Vermischung von Anschriften.');
    if(!address.description)address.description='Kontaktadresse';
    target.payload.eMail=email;address.email=email;
    const job={id:Utilities.getUuid(),kind:'contactEmail',draftId:id,hqId:draft.hqId,contactId:creation.contactId,name:draft.company.name,state:'pending',baseContact:base,targetContact:target,createdAt:salesNow_(),updatedAt:salesNow_(),
      change:{operation:'E-Mail am vorhandenen Ansprechpartner und seiner eigenen Kontaktadresse ergänzen',eMail:email,contactAddress:address,addressNote:copiedAddress?'Leere Kontaktanschrift: Pflichtangaben werden aus dem Firmenentwurf übernommen.':'Vorhandene Kontaktanschrift bleibt erhalten.'},message:'E-Mail-Korrektur vorbereitet. Vorschau prüfen; HQ wurde nur gelesen.'};
    salesWrite_('sales_jobs/'+job.id,job);return {id:job.id,message:job.message};
  });
}
function salesContactEmailEqual_(a,b){
  function ordered(value){
    if(Array.isArray(value))return value.map(ordered);
    if(value&&typeof value==='object'){const out={};Object.keys(value).sort().forEach(k=>out[k]=ordered(value[k]));return out;}
    return value;
  }
  return JSON.stringify(ordered(a))===JSON.stringify(ordered(b));
}
function salesRunContactEmail_(job,draft) {
  const current=salesContactEmailState_(draft,job.contactId);
  if(salesContactEmailEqual_(current,job.targetContact)){job.message='E-Mail in HQ bestätigt. Jetzt den ursprünglichen Anlageauftrag abschließen.';return;}
  if(!salesContactEmailEqual_(current,job.baseContact)) throw new Error('Kontakt oder Adresse seit der Vorschau verändert. Keine E-Mail-Änderung.');
  if(job.writeAttempted) throw new Error('Ein Schreibversuch liegt bereits vor. Nur Rückprüfung erlaubt.');
  salesAssertOwnContactAddress_(draft,job.contactId,current.addressId);
  salesWriteHq_(job,'/v2/ContactPersons/'+salesId_(job.contactId),'put',job.targetContact.payload);
  const after=salesContactEmailState_(draft,job.contactId);
  if(!salesContactEmailEqual_(after,job.targetContact)) throw new Error('Kontakt-E-Mail oder erhaltene Kontakt-/Adresswerte noch nicht vollständig bestätigt.');
  job.message='E-Mail und erhaltene Kontaktdaten in HQ bestätigt. Jetzt den ursprünglichen Anlageauftrag abschließen.';
}
function queueSalesMarkerCleanup(id) {
  const user=salesUser_(true);return salesLock_(()=>{
    const d=salesRead_('sales_drafts/'+salesKey_(id));if(!d?.company||!d.hqId) throw new Error('Nur die eigene bestätigte Firma kann bereinigt werden.');
    const creation=salesRead_('sales_jobs/'+d.id);if(creation?.state!=='synced') throw new Error('Firmenanlage muss zuerst vollständig bestätigt sein.');
    const actual=salesOne_('Companies',d.hqId),marker='[Sales-Test '+d.id+']';
    if(actual.name!==d.company.name||String(actual.description||'').replace(/\r\n/g,'\n')!==[d.company.description,marker].filter(Boolean).join('\n')) throw new Error('Technische Kennzeichnung fehlt oder Beschreibung wurde verändert.');
    const existing=salesList_('sales_jobs').find(j=>j.kind==='cleanupMarker'&&j.draftId===d.id&&!['synced','canceled'].includes(j.state));
    if(existing) return {id:existing.id,message:'Bereinigungsauftrag ist bereits vorhanden. Bitte ansehen.'};
    const job={id:Utilities.getUuid(),kind:'cleanupMarker',draftId:d.id,hqId:d.hqId,name:d.company.name,state:'pending',createdAt:salesNow_(),updatedAt:salesNow_(),actor:user.email,...(user.uid?{actorUid:user.uid}:{}),message:'Beschreibung bereinigen: Auftrag prüfen, dann bewusst nach HQ übertragen.'};
    salesWrite_('sales_jobs/'+job.id,job);return {id:job.id,message:job.message};
  });
}
function salesCompanyPut_(actual) {return salesPick_(actual,['name','industrialSector','description','homepage','iban','bic','vatId','financesChargeRateId','standardDeliveryConditionId','standardPaymentConditionId','debitorNumber','creditorNumber','documentDefaultMailEntityId','routingId','eInvoiceType']);}
function salesCleanMarker_(job,draft) {
  const actual=salesOne_('Companies',job.hqId),desired=draft.company.description,marked=[desired,'[Sales-Test '+draft.id+']'].filter(Boolean).join('\n');
  if(actual.name!==draft.company.name) throw new Error('Firma stimmt nicht mit dem HQ-Ziel überein.');
  const current=String(actual.description||'').replace(/\r\n/g,'\n');
  if(current===desired)return;
  if(current!==marked) throw new Error('Beschreibung wurde in HQ geändert. Keine automatische Bereinigung.');
  job.markerCleanupAttempted=true;salesWrite_('sales_jobs/'+job.id,job);
  const payload=salesCompanyPut_(actual);payload.description=desired;
  salesWriteHq_(job,'/v2/Companies/'+job.hqId,'put',payload);
  const after=salesOne_('Companies',job.hqId);
  if(after.name!==draft.company.name||String(after.description||'')!==desired) throw new Error('Bereinigte Beschreibung nicht eindeutig bestätigt.');
}
function salesRunMarkerCleanup_(job,draft) {
  salesCleanMarker_(job,draft);
  const stored=salesRead_('sales_companies/'+job.hqId);
  if(stored){stored.company=salesCompany_(salesOne_('Companies',job.hqId));stored.loadedAt=salesNow_();salesWrite_('sales_companies/'+job.hqId,stored);}
}
function salesWriteHq_(job,path,method,body) {
  if(typeof salesAuthSource_==='function')salesAuthSource_(job);
  // Never accept an arbitrary destination or payload from the browser.
  if(job.business===1)return salesBusinessTransport_(job,path,method,body);
  if(job.state!=='running') throw new Error('Kein laufender Auftrag.');
  const allowed=job.kind==='createCompany'&&((!job.hqId&&path==='/v2/Companies'&&method==='post')||(job.hqId&&path==='/v2/ContactPersons'&&method==='post'&&Number(body.companyId)===Number(job.hqId))) ||
    job.kind==='contactEmail'&&method==='put'&&path==='/v2/ContactPersons/'+job.contactId&&Number(salesRead_('sales_jobs/'+job.draftId)?.contactId)===Number(job.contactId)&&JSON.stringify(body)===JSON.stringify(job.targetContact?.payload) ||
    ['createCompany','cleanupMarker'].includes(job.kind)&&job.hqId&&path==='/v2/Companies/'+job.hqId&&method==='put'&&body.name===salesRead_('sales_drafts/'+job.draftId)?.company?.name&&body.description===salesRead_('sales_drafts/'+job.draftId)?.company?.description ||
    job.kind==='history'&&method==='post'&&path==='/v2/ContactHistories'&&Number(body.companyId)===Number(job.hqId)&&JSON.stringify(body)===JSON.stringify(job.history) ||
    job.kind==='companyChange'&&method==='put'&&(path==='/v2/Companies/'+job.hqId||job.addressId&&path==='/v2/Companies/'+job.hqId+'/Addresses/'+job.addressId&&body.website===job.change.homepage);
  if(!allowed) throw new Error('Dieser HQ-Schreibpfad ist gesperrt.');
  const draft=salesRead_('sales_drafts/'+job.draftId);
  if(!draft||!draft.company||job.hqId&&Number(draft.hqId)!==Number(job.hqId)) throw new Error('HQ-Schreibziel ist keine selbst angelegte Firma.');
  const priorMarker={writeAttempted:job.writeAttempted,phaseWriteAttempted:job.phaseWriteAttempted,lastWrite:job.lastWrite};
  job.writeAttempted=true;job.phaseWriteAttempted=true;
  job.lastWrite={method:method.toUpperCase(),resource:path.replace(/\/\d+/g,'/{id}'),at:salesNow_(),status:null,fields:[]};
  // The marker only counts once it is durable; if it cannot be stored, HQ is not contacted.
  try{salesWrite_('sales_jobs/'+job.id,job);}catch(e){Object.assign(job,priorMarker);throw e;}
  const r=UrlFetchApp.fetch('https://api.hellohq.io'+path,{method,contentType:'application/json',headers:{Authorization:'Bearer '+revenueToken_()},payload:JSON.stringify(body),muteHttpExceptions:true,followRedirects:false});
  job.lastWrite.status=r.getResponseCode();
  if(r.getResponseCode()<200||r.getResponseCode()>=300) {
    // Never persist/echo raw API errors: they can contain customer data or request values.
    job.lastWrite.fields=salesValidationFields_(r.getContentText());
    salesWrite_('sales_jobs/'+job.id,job);
    throw new Error(job.lastWrite.method+' '+job.lastWrite.resource+': HTTP '+r.getResponseCode()+(job.lastWrite.fields.length?' · Von HQ genannte Felder: '+job.lastWrite.fields.join(', '):' · HQ liefert keinen erkennbaren Feldhinweis')+'. Ausgang vor Wiederholung prüfen.');
  }
  salesWrite_('sales_jobs/'+job.id,job);
  return r.getContentText()?JSON.parse(r.getContentText()):null;
}
function salesValidationFields_(raw) {
  const known=['companyId','firstName','lastName','position','phoneLandline','phoneMobile','eMail','salutation','salutationForm','language','birthdate','note','defaultAddress','customFields','street','houseNumber','zipCode','city','country','description','reason','content','contactOn','contactPersonId','contactHistoryChannel','contactHistoryStatus','syncId','responsibleUserIds','nextContactDate','isReminder'];
  const text=String(raw||'').slice(0,20000);
  return known.filter(k=>new RegExp('\\b'+k+'\\b','i').test(text));
}
function salesEqualFields_(actual,expected) {
  return Object.keys(expected).every(k=>{const v=expected[k];if(v&&typeof v==='object') return JSON.stringify(actual[k])===JSON.stringify(v);return String(actual[k]??'')===String(v??'');});
}
function runSalesJob(id,step) {
  salesUser_(true);return salesLock_(()=>salesRunJobLocked_(id,step));
}
function salesJobFailState_(job,e) {
  const reason=e?.message||'Unbekannter Fehler';
  // Deletions re-read HQ before every step, so a failure never needs a manual reconcile.
  if(job.kind==='deleteCompany')return salesDeleteFailed_(job,reason);
  if(['companyChange','contactEmail','history','entityChange','communication','createContact'].includes(job.kind)&&!job.writeAttempted) {job.state='pending';job.message=e?.message||'HQ-Ziel konnte vor dem Schreiben nicht geprüft werden.';}
  // Without a persisted write marker for this phase, HQ was not contacted: return to the stored stage instead of locking the job.
  else if(job.kind==='createCompany'&&['pending','ready','companyCreated','companyConfirmed','contactCreated'].includes(job.safeStage)&&!job.phaseWriteAttempted) {job.state=job.safeStage;job.message=(job.safeStage==='pending'?'Noch nicht an HQ gesendet: ':'HQ-Rückprüfung noch offen: ')+reason;}
  else {job.state='uncertain';job.message='Übertragung oder Rückprüfung nicht vollständig bestätigt: '+reason+'. Nicht erneut anlegen; zuerst HQ-Ergebnis prüfen.';}
  return job;
}
// Callers hold the global script lock, so a stored 'running' job belongs to an interrupted execution
// (quota/budget stop or runtime limit) and is classified with the same rules as a caught error.
function salesJobRecoverInterrupted_(job) {
  if(job?.state!=='running')return job;
  salesJobFailState_(job,{message:'Vorherige Übertragung wurde unterbrochen (Kontingent, Tagesbudget oder Laufzeitgrenze)'});
  job.updatedAt=salesNow_();salesWrite_('sales_jobs/'+job.id,job);return job;
}
function salesRunJobLocked_(id,step) {
  salesAssertPrivate_();const job=salesJobRecoverInterrupted_(salesRead_('sales_jobs/'+salesKey_(id)));if(!job) throw new Error('Auftrag fehlt.');
    if(job.state==='synced') {if(typeof salesCommunicationAfterJob_==='function')salesCommunicationAfterJob_(job);return {message:'Bereits synchronisiert. Keine erneute Anlage.'};}
    if(!['pending','ready','companyCreated','companyConfirmed','contactCreated'].includes(job.state)) throw new Error('Auftrag ist gesperrt. Unklaren Ausgang oder Konflikt zuerst prüfen.');
    const draft=job.business===1?null:salesRead_('sales_drafts/'+job.draftId);if(job.business!==1&&!draft?.company) throw new Error('Firma fehlt.');
    if(job.kind==='createCompany') {
      step=step||'company';
      if(!['company','contact'].includes(step)) throw new Error('Unbekannter Anlageschritt.');
      if(step==='contact'&&(!job.companyConfirmedAt||!job.steps?.company||!job.hqId||Number(draft.hqId)!==Number(job.hqId))) throw new Error('Zuerst Schritt 1: Firma in HQ anlegen und bestätigen.');
    }
    const priorState=job.state;
    job.state='running';job.safeStage=priorState;job.phaseWriteAttempted=false;job.updatedAt=salesNow_();job.message='Übertragung gestartet.';salesWrite_('sales_jobs/'+id,job);
    try {
      if(job.business===1)salesBusinessRun_(job,false);
      else if(job.kind==='createCompany') salesRunCreate_(job,draft,step);
      else if(job.kind==='history') salesRunHistory_(job,draft);
      else if(job.kind==='companyChange') salesRunChange_(job,draft);
      else if(job.kind==='cleanupMarker') salesRunMarkerCleanup_(job,draft);
      else if(job.kind==='contactEmail') salesRunContactEmail_(job,draft);
      else throw new Error('Unbekannter Auftrag.');
      if(job.state==='running') {job.state='synced';if(job.kind!=='contactEmail')job.message='HQ zurückgelesen; Übertragung bestätigt.';}
    }catch(e) {
      salesJobFailState_(job,e);
    }
    job.updatedAt=salesNow_();salesWrite_('sales_jobs/'+id,job);if(typeof salesCommunicationAfterJob_==='function')salesCommunicationAfterJob_(job);return salesJobSummary_(job);
}
function salesRunCreate_(job,draft,step) {
  if(!job.hqId) {
    // Marker persists in HQ for reconciliation after a lost response; no arbitrary name-based adoption.
    const marker=job.markerMode==='none'?'':'[Sales-Test '+job.id+']';if(marker)job.marker=marker;salesWrite_('sales_jobs/'+job.id,job);
    const payload=Object.assign({},draft.company,{description:[draft.company.description,marker].filter(Boolean).join('\n')});
    const result=salesWriteHq_(job,'/v2/Companies','post',payload);job.hqId=salesId_(result&&result.id);draft.hqId=job.hqId;
    salesWrite_('sales_drafts/'+draft.id,draft);salesWrite_('sales_jobs/'+job.id,job);
    job.safeStage='companyCreated';job.phaseWriteAttempted=false;salesWrite_('sales_jobs/'+job.id,job);
  }
  const actual=salesOne_('Companies',job.hqId);
  if(actual.name!==draft.company.name||![draft.company.description,[draft.company.description,'[Sales-Test '+job.id+']'].filter(Boolean).join('\n')].includes(String(actual.description||'').replace(/\r\n/g,'\n'))) throw new Error('Firmenname oder Testkennung stimmen in HQ nicht mit diesem Auftrag überein.');
  // The unique marker and returned HQ ID establish the target before the dependent contact is written.
  // Non-key company fields are checked below, after the contact has been created and read back.
  job.steps.company=true;salesWrite_('sales_jobs/'+job.id,job);
  if(step==='company') {
    // Hard execution boundary: repeating step 1 can never dispatch the dependent POST.
    job.companyConfirmedAt=job.companyConfirmedAt||salesNow_();
    job.state=job.contactId?'contactCreated':'companyConfirmed';
    job.message='Schritt 1 abgeschlossen: Firma in HQ angelegt und zurückgelesen. Ansprechpartner bleibt in Firebase. Der HQ-Sync führt den Ansprechpartner im nächsten getrennten Abschnitt aus.';
    return;
  }
  if(draft.contact&&!job.steps.contact&&!job.contactId) {
    if(job.salutationRetryPreparedAt) {
      // Recheck immediately before the corrected POST, even if the user waited
      // after preparing it. Any returned contact blocks this narrow retry path.
      if(salesCollect_('ContactPersons','companyId eq '+job.hqId,Date.now()).length) throw new Error('Seit der Prüfung sind Kontakte in HQ vorhanden. Keine erneute Anlage; bitte HQ prüfen.');
    }
    // Separate HQ fields: salutation is e.g. Herr/Frau, salutationForm is an enum.
    // Complete drafts saved by older app versions before their first contact attempt.
    draft.contact.salutationForm=salesSalutationForm_(draft.contact.salutationForm);
    salesWrite_('sales_drafts/'+draft.id,draft);
    // Persist intent before the POST. A timeout cannot cause an automatic duplicate.
    job.contactAttempted=true;salesWrite_('sales_jobs/'+job.id,job);
    const payload={companyId:salesId_(job.hqId)};
    // Optional strings are nullable in ContactPersonPost. Omit empty values instead of
    // asking HQ to validate an empty e-mail address or salutation.
    Object.keys(draft.contact).forEach(k=>{if(draft.contact[k]!=='')payload[k]=draft.contact[k];});
    if(draft.contact.eMail)payload.defaultAddress=Object.assign({},salesContactAddressFields_(draft.company.defaultAddress),draft.contact.defaultAddress||{},{email:draft.contact.eMail});
    const result=salesWriteHq_(job,'/v2/ContactPersons','post',payload);job.contactId=salesId_(result&&result.id);salesWrite_('sales_jobs/'+job.id,job);
    job.safeStage='contactCreated';job.phaseWriteAttempted=false;salesWrite_('sales_jobs/'+job.id,job);
  }
  if(draft.contact&&!job.steps.contact){
    const contact=salesContactWithAddress_(job.contactId);
    if(Number(contact.companyId)!==Number(job.hqId)) throw new Error('Ansprechpartner gehört in HQ nicht zur gespeicherten Firma.');
    const differences=salesContactDifferences_(contact,draft.contact);
    if(differences.length) throw new Error('Ansprechpartner noch nicht bestätigt. Abweichende Kontaktfelder: '+differences.join(', ')+'. Bitte auf der Daten-Testseite „Homepage in HQ prüfen“ ausführen und den Text bei „Ansprechpartner“ mitteilen.');
    job.steps.contact=true;salesWrite_('sales_jobs/'+job.id,job);
  }
  if(!salesEqualFields_(actual,salesPick_(draft.company,['industrialSector']))) throw new Error('Branche der Firma wurde in HQ noch nicht bestätigt.');
  if(!salesHomepageConfirmed_(actual,draft.company.homepage)) throw new Error('Homepage der Firma wurde in HQ noch nicht bestätigt.');
  if(!salesEqualFields_(actual.defaultAddress||{},salesPick_(draft.company.defaultAddress,['street','houseNumber','zipCode','city','country','website']))) throw new Error('Standardadresse der Firma wurde in HQ noch nicht vollständig bestätigt.');
  if(!(actual.companyTypes||[]).some(t=>salesCompanyTypeId_(t)===Number(draft.company.companyTypes[0].companyTypeId))) throw new Error('Firmenart wurde in HQ noch nicht bestätigt.');
  if(!(actual.responsibleUsers||[]).some(u=>Number(u.userId||u.id)===Number(draft.company.responsibleUserIds[0]))) throw new Error('Verantwortlicher HQ-Benutzer wurde noch nicht bestätigt.');
  if(!salesSubsystemConfirmed_(actual,draft.company.subsystemIds[0])) throw new Error('HQ-Unternehmensbereich wurde noch nicht bestätigt.');
  if(!salesBusinessCustomMatches_(actual.customFields,draft.company.customFields)) throw new Error('Eigene Felder stimmen nicht überein.');
  if(job.markerMode!=='none'){salesCleanMarker_(job,draft);job.steps.descriptionClean=true;salesWrite_('sales_jobs/'+job.id,job);}
  const cleanCompany=salesOne_('Companies',job.hqId);
  if(job.editedFields)salesBusinessVerifyDraft_(job,draft,cleanCompany,job.contactId?salesContactWithAddress_(job.contactId):null);
  if(!salesHomepageConfirmed_(cleanCompany,draft.company.homepage)||!salesEqualFields_(cleanCompany.defaultAddress||{},salesPick_(draft.company.defaultAddress,['street','houseNumber','zipCode','city','country','website']))) throw new Error('Homepage oder Adresse nach Bereinigung in HQ nicht mehr bestätigt.');
  const stored=salesRead_('sales_companies/'+job.hqId)||{histories:[],projects:[]};
  const contacts=(stored.contacts||[]).filter(c=>String(c.id)!==String(job.contactId));
  if(job.contactId)contacts.push(salesContactView_(salesContactWithAddress_(job.contactId)));
  salesWrite_('sales_companies/'+job.hqId,{...stored,company:salesCompany_(cleanCompany),contacts,detailVersion:3,loadedAt:salesNow_()});
}
function salesPrepareSalutationRetry_(job,draft) {
  const rejection=job.lastWrite;
  // Only the identified old payload defect is repairable here. Never unlock a
  // timeout, another endpoint/status, an already fixed payload or a known contact.
  if(job.state!=='uncertain'||job.kind!=='createCompany'||!job.contactAttempted||job.contactId||job.steps?.contact||job.markerCleanupAttempted||draft.contact?.salutationForm||job.salutationRetryPreparedAt||
     rejection?.method!=='POST'||rejection.resource!=='/v2/ContactPersons'||rejection.status!==400||!rejection.fields?.includes('salutationForm')) return false;
  if(!draft.contact||!draft.company||!job.companyConfirmedAt||!job.steps?.company||!job.hqId||Number(draft.hqId)!==Number(job.hqId)) throw new Error('Firmenzuordnung für die Kontaktkorrektur nicht bestätigt. Auftrag bleibt gesperrt.');
  const actual=salesOne_('Companies',job.hqId),marked=[draft.company.description,'[Sales-Test '+job.id+']'].filter(Boolean).join('\n');
  if(actual.name!==draft.company.name||String(actual.description||'').replace(/\r\n/g,'\n')!==marked) throw new Error('HQ-Firma oder Testkennung inzwischen verändert. Auftrag bleibt gesperrt.');
  const contacts=salesCollect_('ContactPersons','companyId eq '+job.hqId,Date.now());
  if(contacts.some(c=>Number(c.companyId)!==Number(job.hqId))) throw new Error('HQ-Kontaktfilter liefert fremde Firmen. Auftrag bleibt gesperrt.');
  if(contacts.length) throw new Error('In HQ sind bereits Kontakte dieser Firma vorhanden. Keine erneute Kontaktanlage freigegeben; bitte den vorhandenen Kontakt prüfen.');
  draft.contact.salutationForm='Formal';
  job.previousContactRejection=rejection;job.salutationRetryPreparedAt=salesNow_();
  job.contactAttempted=false;job.state='companyConfirmed';job.updatedAt=salesNow_();
  job.message='HQ geprüft: Firma bestätigt, keine Kontakte vorhanden. Fehlende Ansprache in Firebase auf Formell ergänzt. Beim nächsten HQ-Sync wird der Ansprechpartner übertragen; diese Prüfung hat HQ nicht verändert.';
  salesWrite_('sales_drafts/'+draft.id,draft);salesWrite_('sales_jobs/'+job.id,job);
  return true;
}
function reconcileSalesJob(id) {
  salesUser_(true);return salesLock_(()=>{const job=salesRead_('sales_jobs/'+salesKey_(id));if(!job||!['uncertain','running'].includes(job.state)) throw new Error('Kein unklarer Auftrag.');
    const draft=job.business===1?null:salesRead_('sales_drafts/'+job.draftId);if(job.business!==1&&!draft?.company) throw new Error('Firma fehlt.');
    if(job.business===1){salesBusinessRun_(job,true);if(job.state!=='conflict'){job.state='synced';job.message='HQ-Ergebnis nur lesend bestätigt.';}}else if(job.kind==='contactEmail') {
      const current=salesContactEmailState_(draft,job.contactId);
      if(!salesContactEmailEqual_(current,job.targetContact)) throw new Error('E-Mail-Korrektur in HQ noch nicht vollständig bestätigt. Kein weiterer Schreibversuch freigegeben.');
      job.state='synced';job.message='E-Mail-Korrektur nur lesend bestätigt. Jetzt den ursprünglichen Anlageauftrag abschließen.';
    } else if(job.kind==='createCompany') {
      if(salesPrepareSalutationRetry_(job,draft)) return salesJobSummary_(job);
      if(job.hqId&&job.markerCleanupAttempted) {
        const checked=salesOne_('Companies',job.hqId),marker=[draft.company.description,'[Sales-Test '+draft.id+']'].filter(Boolean).join('\n');
        if(checked.name!==draft.company.name||!salesEqualFields_(checked,salesPick_(draft.company,['industrialSector']))||!salesHomepageConfirmed_(checked,draft.company.homepage)||!salesEqualFields_(checked.defaultAddress||{},salesPick_(draft.company.defaultAddress,['street','houseNumber','zipCode','city','country','website']))) throw new Error('Firmenwerte in HQ nicht eindeutig bestätigt. Auftrag bleibt gesperrt.');
        if(draft.contact&&!job.steps.contact) throw new Error('Ansprechpartner noch nicht bestätigt. Auftrag bleibt gesperrt.');
        if(String(checked.description||'')===draft.company.description) {job.state='ready';job.message='Beschreibung in HQ bereinigt. Abschlussprüfung fortsetzen.';}
        else if(String(checked.description||'').replace(/\r\n/g,'\n')===marker) {job.state='ready';job.message='Kennzeichnung noch vorhanden. Bereinigung kontrolliert fortsetzen.';}
        else throw new Error('Beschreibung in HQ verändert. Auftrag bleibt gesperrt.');
        job.updatedAt=salesNow_();salesWrite_('sales_jobs/'+job.id,job);return salesJobSummary_(job);
      }
      if(job.markerMode==='none'&&!job.hqId)throw new Error('HQ-Antwort ohne gespeicherte Firmen-ID. Auftrag bleibt gesperrt. HQ manuell prüfen; keine automatische Namenszuordnung oder erneute Anlage.');
      const list=job.markerMode==='none'?[salesOne_('Companies',job.hqId)]:salesCollect_('Companies',"name eq '"+draft.company.name.replace(/'/g,"''")+"'",Date.now()).filter(x=>x.name===draft.company.name&&(x.description||'').includes('[Sales-Test '+job.id+']'));
      if(list.length!==1) throw new Error('Keine eindeutige Firmenanlage gefunden. Auftrag bleibt gesperrt; HQ manuell prüfen.');
      const found=list[0];if(job.hqId&&Number(job.hqId)!==Number(found.id)) throw new Error('Abweichende HQ-ID.');job.hqId=salesId_(found.id);draft.hqId=job.hqId;salesWrite_('sales_drafts/'+draft.id,draft);
      if(draft.contact&&job.contactAttempted) {
        const contacts=salesCollect_('ContactPersons','companyId eq '+job.hqId,Date.now(),'DefaultAddress').filter(x=>Number(x.companyId)===job.hqId&&!salesContactDifferences_(x,draft.contact).length);
        if(contacts.length!==1) throw new Error('Kontaktanlage nicht eindeutig bestätigt. Auftrag bleibt gesperrt.');job.contactId=salesId_(contacts[0].id);job.steps.contact=true;
      }
      job.state='ready';job.message='Gefundene HQ-Anlage zugeordnet. Fortsetzen führt die Rückprüfung und nur noch ausstehende Schritte aus.';
    } else if(job.kind==='cleanupMarker') {
      const checked=salesOne_('Companies',job.hqId),marker=[draft.company.description,'[Sales-Test '+draft.id+']'].filter(Boolean).join('\n');
      if(checked.name!==draft.company.name) throw new Error('HQ-Ziel stimmt nicht mit der Firma überein.');
      if(String(checked.description||'')===draft.company.description) {job.state='synced';job.message='Beschreibung in HQ bereinigt und bestätigt.';}
      else if(String(checked.description||'').replace(/\r\n/g,'\n')===marker) {job.state='ready';job.message='Technische Kennzeichnung noch vorhanden. Bereinigung kann fortgesetzt werden.';}
      else throw new Error('Beschreibung wurde in HQ verändert. Auftrag bleibt gesperrt.');
    } else if(job.kind==='history') {
      salesHistoryTarget_(job,draft);
      salesConfirmHistory_(job);
      job.state='synced';job.message='Historieneintrag in HQ nur lesend bestätigt. Kein weiterer Schreibversuch.';
    } else if(job.kind==='companyChange') {
      const actual=salesOne_('Companies',job.hqId),website=actual.defaultAddress?.website||'';
      if(actual.name!==draft.company.name) throw new Error('HQ-Ziel stimmt nicht mit der Firma überein.');
      if(actual.industrialSector===job.change.industrialSector&&(actual.homepage||'')===job.change.homepage&&website===job.change.homepage || actual.industrialSector===job.change.industrialSector&&!(actual.homepage||'')&&website===job.change.homepage) {job.state='synced';job.message='Homepage und Branche in HQ bestätigt.';}
      else if([job.base.industrialSector,job.change.industrialSector].includes(actual.industrialSector)&&[job.base.homepage,job.change.homepage].includes(actual.homepage||'')&&[job.baseAddressWebsite||'',job.change.homepage].includes(website)) {job.state='ready';job.message='Teilübertragung geprüft. Offene Schritte kontrolliert fortsetzen.';}
      else throw new Error('HQ-Werte weichen vom Auftrag ab. Auftrag bleibt gesperrt.');
    }
    job.updatedAt=salesNow_();salesWrite_('sales_jobs/'+job.id,job);if(typeof salesCommunicationAfterJob_==='function')salesCommunicationAfterJob_(job);return salesJobSummary_(job);});
}
function salesHistoryDate_(raw) {
  if(typeof raw!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(raw)||!Number.isFinite(Date.parse(raw))||new Date(raw).toISOString().slice(0,19)!==raw.slice(0,19))throw new Error('Bitte einen gültigen Kontaktzeitpunkt oder Termin angeben.');
  return new Date(Math.floor(Date.parse(raw)/1000)*1000).toISOString();
}
function salesHistoryCompanyBinding_(draft,creation) {
  if(!draft?.company||creation?.kind!=='createCompany'||creation.id!==draft.id||!draft.hqId||Number(creation.hqId)!==Number(draft.hqId)||!creation.steps?.company||!creation.companyConfirmedAt||creation.state==='canceled')throw new Error('Eigene HQ-Firmenzuordnung zuerst bestätigen. Anlageauftrag öffnen; keine neue Firma anlegen.');
}
function salesHistoryReady_(draft,creation) {
  try{salesHistoryCompanyBinding_(draft,creation);}catch(_){return false;}
  if(creation.state==='synced')return true;
  const proof=creation.historyBinding;
  return !!(proof?.checkedAt&&Number(proof.hqId)===Number(draft.hqId)&&proof.name===draft.company.name&&
    (!draft.contact||(creation.contactId&&Number(proof.contactId)===Number(creation.contactId)&&proof.firstName===draft.contact.firstName&&proof.lastName===draft.contact.lastName)));
}
function salesCheckHistoryBinding_(draft,creation) {
  salesHistoryCompanyBinding_(draft,creation);
  const actual=salesOne_('Companies',creation.hqId);
  if(Number(actual.id)!==Number(creation.hqId)||actual.name!==draft.company.name)throw new Error('HQ-Firmenzuordnung nicht bestätigt.');
  if(draft.contact){
    if(!creation.contactId)throw new Error('Gespeicherte HQ-Ansprechpartner-ID fehlt. Anlageauftrag öffnen und den vorhandenen HQ-Ausgang prüfen; nicht erneut anlegen.');
    const contact=salesOne_('ContactPersons',creation.contactId);
    if(Number(contact.id)!==Number(creation.contactId)||Number(contact.companyId)!==Number(creation.hqId)||contact.firstName!==draft.contact.firstName||contact.lastName!==draft.contact.lastName)throw new Error('HQ-Ansprechpartnerzuordnung nicht bestätigt.');
  }
}
function checkSalesHistoryBinding(draftId) {
  salesUser_(true);return salesLock_(()=>{
    salesAssertPrivate_();const draft=salesRead_('sales_drafts/'+salesKey_(draftId)),creation=draft&&salesRead_('sales_jobs/'+draft.id);
    salesHistoryCompanyBinding_(draft,creation);
    delete creation.historyBinding;salesWrite_('sales_jobs/'+creation.id,creation);
    salesCheckHistoryBinding_(draft,creation);
    creation.historyBinding={checkedAt:salesNow_(),hqId:creation.hqId,name:draft.company.name,contactId:creation.contactId||null,firstName:draft.contact?.firstName||'',lastName:draft.contact?.lastName||''};
    salesWrite_('sales_jobs/'+creation.id,creation);
    return {message:'HQ-Zuordnung von Firma und Ansprechpartner bestätigt. Kommunikation erfassen ist freigegeben. Der ursprüngliche Anlageauftrag bleibt unverändert; in HQ wurde nichts geschrieben.'};
  });
}
function saveSalesHistory(input) {
  const user=salesUser_();return salesLock_(()=>{salesAssertPrivate_();const general=input.companyId!==undefined&&!input.draftId,data=general?salesBusinessKnown_(input.companyId):null,draft=general?{hqId:salesId_(input.companyId),company:data.company}:salesRead_('sales_drafts/'+salesKey_(input.draftId)),creation=general?null:salesRead_('sales_jobs/'+input.draftId);
    // Capturing is Firebase-only. The HQ read-back belongs to the later transfer.
    if(!general)salesHistoryCompanyBinding_(draft,creation);
    const history={reason:salesText_(input.reason,200,true),content:salesText_(input.content,10000,true),contactOn:salesHistoryDate_(input.channel==='Mail'?salesNow_():input.contactOn||salesNow_()),contactHistoryChannel:input.channel,companyId:draft.hqId};
    if(!['Note','Mail','Call','Meeting','Visit'].includes(history.contactHistoryChannel)) throw new Error('Unzulässige Kontaktart. Aufgaben werden später über awork angebunden.');
    if(input.channel==='Call'){
      if(!['Reached','NotReached'].includes(input.status))throw new Error('Unzulässiger Anrufstatus.');
      history.contactHistoryStatus=input.status;
    }
    if(input.channel==='Mail'){
      const emails=salesText_(input.recipientEmailAddress,1000,true).split(/[;,]/).map(x=>x.trim().toLowerCase());
      if(emails.length>10||emails.some(x=>! /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(x)))throw new Error('Bitte gültige Empfänger-E-Mail-Adressen eingeben.');
      history.recipientEmailAddress=Array.from(new Set(emails)).join(',');
    }
    if(['Call','Meeting','Visit'].includes(input.channel)){
      const contactId=input.contactPersonId||(input.contactTarget==='contact'?creation?.contactId:null);
      const contacts=salesRead_('sales_companies/'+draft.hqId)?.contacts||[];
      if(!contactId||Number(contactId)!==Number(creation?.contactId)&&!contacts.some(c=>Number(c.id)===Number(contactId)&&Number(c.companyId)===Number(draft.hqId)))throw new Error('Bitte einen Ansprechpartner dieses Kunden auswählen.');
      history.contactPersonId=salesId_(contactId);
    }
    const id=Utilities.getUuid();history.syncId='sales-'+id;const job={id,kind:'history',...(general?{business:1}:{}),draftId:draft.id||null,hqId:draft.hqId,name:draft.company.name,state:'pending',history,createdAt:salesNow_(),updatedAt:salesNow_(),actor:user.email,...(user.uid?{actorUid:user.uid}:{}),message:'Kontakt in Firebase gespeichert; HQ-Abgleich offen.'};salesWrite_('sales_jobs/'+id,job);return {id,message:job.message};});
}
function salesHistoryTarget_(job,draft) {
  if(job.business===1){salesBusinessKnown_(job.hqId);salesOne_('Companies',job.hqId);}else{
  const creation=salesRead_('sales_jobs/'+draft.id);
  if(Number(draft.hqId)!==Number(job.hqId))throw new Error('Historienziel ist keine bestätigte eigene Firma.');
  salesCheckHistoryBinding_(draft,creation);}
  const allowed=['reason','content','contactOn','contactHistoryChannel','contactHistoryStatus','companyId','contactPersonId','syncId','recipientEmailAddress'];
  if(Object.keys(job.history).some(k=>!allowed.includes(k))||!['Note','Mail','Call','Meeting','Visit'].includes(job.history.contactHistoryChannel)||Number(job.history.companyId)!==Number(job.hqId)||job.history.syncId!=='sales-'+job.id)throw new Error('Historienauftrag enthält unzulässige Zielfelder. Aufgaben werden nicht mehr nach HQ übertragen.');
  if(job.history.contactPersonId){
    const contact=salesOne_('ContactPersons',job.history.contactPersonId);
    if(Number(contact.companyId)!==Number(job.hqId))throw new Error('Ansprechpartner gehört nicht mehr zur Firma.');
  }
}
function salesHistoryDifferences_(actual,expected) {
  // HQ may serialize the same instant without milliseconds. Compare whole seconds.
  return Object.keys(expected).filter(k=>{
    if(['contactOn','nextContactDate'].includes(k))return !(Number.isFinite(Date.parse(actual[k]))&&Math.floor(Date.parse(actual[k])/1000)===Math.floor(Date.parse(expected[k])/1000));
    if(k==='responsibleUserIds')return !Array.isArray(actual[k])||JSON.stringify(actual[k].map(Number).sort((a,b)=>a-b))!==JSON.stringify(expected[k].map(Number).sort((a,b)=>a-b));
    return !salesEqualFields_(actual,{[k]:expected[k]});
  });
}
function salesConfirmHistory_(job) {
  const rows=job.historyId?[salesOne_('ContactHistories',job.historyId)]:salesCollect_('ContactHistories','companyId eq '+job.hqId,Date.now());
  if(rows.some(h=>Number(h.companyId)!==Number(job.hqId)))throw new Error('Historienprüfung liefert ein fremdes Firmenziel.');
  const matches=rows.filter(h=>h.syncId==='sales-'+job.id);
  if(matches.length!==1)throw new Error('Historieneintrag noch nicht eindeutig bestätigt. Nur HQ-Ergebnis prüfen, nicht erneut anlegen.');
  const differences=salesHistoryDifferences_(matches[0],job.history);
  if(differences.length)throw new Error('Historien-Rückprüfung offen. Abweichende Felder: '+differences.join(', ')+'. Nur HQ-Ergebnis prüfen, nicht erneut anlegen.');
  job.historyId=salesId_(matches[0].id);
  salesWrite_('sales_jobs/'+job.id,job);
  const data=salesRead_('sales_companies/'+job.hqId);
  if(data){data.histories=(data.histories||[]).filter(h=>String(h.id)!==String(job.historyId)&&h.syncId!==job.history.syncId);data.histories.push(salesHistory_(matches[0],[],{}));salesWrite_('sales_companies/'+job.hqId,data);}
}
function salesRunHistory_(job,draft) {
  salesHistoryTarget_(job,draft);
  if(job.writeAttempted)throw new Error('Schreibversuch bereits erfolgt. Nur HQ-Ergebnis prüfen.');
  const result=salesWriteHq_(job,'/v2/ContactHistories','post',job.history);
  if(result?.id){job.historyId=salesId_(result.id);salesWrite_('sales_jobs/'+job.id,job);}
  salesConfirmHistory_(job);
}
function saveSalesCompanyChange(input) {
  const user=salesUser_();return salesLock_(()=>{const d=salesRead_('sales_drafts/'+salesKey_(input.draftId));if(!d?.company||!d.hqId) throw new Error('Nur eigene Firmen können geändert werden.');
    const data=salesRead_('sales_companies/'+d.hqId);if(!data) throw new Error('Zuerst Firmendetails importieren.');
    const industry=salesText_(input.industrialSector,150,false),known=salesRead_('sales_meta/catalog')?.industries||[];
    if(industry&&!known.includes(industry)&&industry!==data.company.industrialSector) throw new Error('Bitte eine Branche aus der aktuellen HQ-Auswahlliste wählen.');
    const change={industrialSector:industry,homepage:salesWebsiteInput_(input.homepage)};
    const reason=salesReviewReason_(input.changeReason),base=salesPick_(data.company,Object.keys(change)),baseAddressWebsite=data.company.defaultAddress?.website||'',id=Utilities.getUuid();const job={id,kind:'companyChange',draftId:d.id,hqId:d.hqId,name:d.company.name,state:'pending',change,base,baseAddressWebsite,changeReason:reason,createdAt:salesNow_(),updatedAt:salesNow_(),actor:user.email,...(user.uid?{actorUid:user.uid}:{}),message:'Änderung in Firebase gespeichert; HQ-Abgleich offen.'};if(salesReviewOverwrite_({...base,addressWebsite:baseAddressWebsite},{...change,addressWebsite:change.homepage}))salesReviewHold_(job);salesWrite_('sales_jobs/'+id,job);return {id,message:job.message};});
}
function salesAddressForWrite_(actual) {
  const address=actual.defaultAddress;if(!address?.id) throw new Error('HQ hat keine eindeutige Standardadress-ID geliefert. Keine Änderung.');
  const id=salesId_(address.id);
  const response=salesHqGet_('/v2/Companies/'+salesId_(actual.id)+'/Addresses').data;
  const rows=Array.isArray(response)?response:response.data||response.value;
  if(!Array.isArray(rows)) throw new Error('HQ-Adressliste ist unvollständig. Keine Änderung.');
  const matches=rows.filter(a=>Number(a.id)===id);
  if(matches.length!==1||!salesEqualFields_(matches[0],salesPick_(address,['street','houseNumber','zipCode','city','country','website']))) throw new Error('HQ-Standardadresse wurde verändert oder ist nicht eindeutig. Keine Änderung.');
  return matches[0];
}
function salesRunChange_(job) {
  const actual=salesOne_('Companies',job.hqId),draft=salesRead_('sales_drafts/'+job.draftId);
  if(!draft?.company||actual.name!==draft.company.name) throw new Error('Ziel ist keine eigene Firma mehr.');
  const website=actual.defaultAddress?.website||'',companyCompatible=Object.keys(job.change).every(k=>[String(job.base[k]??''),String(job.change[k]??'')].includes(String(actual[k]??''))),addressCompatible=[job.baseAddressWebsite||'',job.change.homepage].includes(website);
  if(!companyCompatible||!addressCompatible) {if(job.changeReason){job.state='canceled';job.message='HQ hat diese Daten inzwischen geändert. Der zentrale Abgleich übernimmt den HQ-Stand.';if(job.review)job.review.status='superseded';return;}job.state='conflict';job.conflict={before:{...job.base,addressWebsite:job.baseAddressWebsite||''},app:{...job.change,addressWebsite:job.change.homepage},hq:{...salesPick_(actual,Object.keys(job.change)),addressWebsite:website}};job.message='HQ und App unterscheiden sich. Bitte entscheiden.';return;}
  if((!salesEqualFields_(actual,job.change)||website!==job.change.homepage)&&!salesReviewAllowed_(job,{...actual,addressWebsite:website},{...job.change,addressWebsite:job.change.homepage}))return;
  const addressNeedsWrite=website!==job.change.homepage;
  const address=addressNeedsWrite?salesAddressForWrite_(actual):null;
  if(address) {job.addressId=salesId_(address.id);salesWrite_('sales_jobs/'+job.id,job);}
  // PUT uses a whitelist of the documented writable fields, preserving unrelated HQ values.
  if(!salesEqualFields_(actual,job.change)) {const payload=salesCompanyPut_(actual);Object.assign(payload,job.change);salesWriteHq_(job,'/v2/Companies/'+job.hqId,'put',payload);}
  if(address){const payload=salesPick_(address,['alternativeCompanyName','additionalInformation','street','houseNumber','zipCode','city','country','description','phone','email','fax','website','addressLine2','standardForDocumentType']);payload.website=job.change.homepage;salesWriteHq_(job,'/v2/Companies/'+job.hqId+'/Addresses/'+job.addressId,'put',payload);}
  const after=salesOne_('Companies',job.hqId);
  if(after.industrialSector!==job.change.industrialSector||!salesHomepageConfirmed_(after,job.change.homepage)||String(after.defaultAddress?.website||'')!==job.change.homepage) throw new Error('Homepage oder Branche nicht vollständig in HQ bestätigt.');
  // HQ is confirmed at this point; a missing local file must not turn a confirmed change into 'uncertain'.
  const data=salesRead_('sales_companies/'+job.hqId);if(data){data.company=salesCompany_(after);data.loadedAt=salesNow_();salesWrite_('sales_companies/'+job.hqId,data);}
}
function salesHomepageConfirmed_(actual,expected) {return String(actual.homepage||'')===expected||!!expected&&!actual.homepage&&String(actual.defaultAddress?.website||'')===expected;}
function resolveSalesConflict(id,choice) {
  salesUser_(true);return salesLock_(()=>{const j=salesRead_('sales_jobs/'+salesKey_(id));if(j?.state!=='conflict') throw new Error('Kein offener Konflikt.');
    if(choice==='app'&&['entityChange','companyChange'].includes(j.kind))throw Error('Der aktuelle HQ-Stand hat Vorrang. Bitte die Daten neu laden und bei Bedarf einen neuen Änderungsantrag stellen.');
    if(j.business===1){
      if(choice==='hq'){j.state='canceled';const actual=salesBusinessTarget_(j.hqId,j.entity,j.targetId);salesBusinessFinish_(j,actual);j.message='HQ-Werte behalten.';}
      else if(choice==='app'){j.base=j.conflict.hq;j.state='pending';j.writeAttempted=false;j.message='App-Werte ausgewählt. HQ wird vor dem Schreiben erneut geprüft.';}
      else throw new Error('Bitte HQ oder App wählen.');
    }else if(choice==='hq') {j.state='canceled';j.message='HQ-Wert behalten. App-Änderung verworfen.';}
    else if(choice==='app') {j.base=salesPick_(j.conflict.hq,['industrialSector','homepage']);j.baseAddressWebsite=j.conflict.hq.addressWebsite||'';j.state='pending';j.message='App-Werte ausgewählt. Beim nächsten Abgleich wird HQ erneut auf weitere Änderungen geprüft.';}
    else throw new Error('Bitte HQ oder App wählen.');j.conflict=null;j.updatedAt=salesNow_();salesWrite_('sales_jobs/'+id,j);return salesJobSummary_(j);});
}

/** Immutable payload parts; publish the root pointer only after every part exists. */
function salesDecodeStored_(path,payload,c){
  const value=JSON.parse(payload);
  if(value?.storageFormat!=='sales-parts-v1')return value;
  if(!Number.isSafeInteger(value.parts)||value.parts<1||value.parts>2000||!value.generation)throw new Error('Ungültiger Firebase-Datensatz: '+path);
  const parts=[];
  for(let i=0;i<value.parts;i++){
    const raw=pilotReadDocument_(c.project,'sales_chunks/'+salesKey_(value.generation)+'-'+i,c.token);
    if(!raw)throw new Error('Firebase-Teilpaket fehlt: '+path+' · Teil '+(i+1));
    const part=JSON.parse(raw.payload);
    if(part.source!==path||part.index!==i||typeof part.text!=='string')throw new Error('Firebase-Teilpaket passt nicht: '+path);
    parts.push(part.text);
  }
  const text=parts.join('');if(text.length!==value.length)throw new Error('Firebase-Datensatz unvollständig: '+path);
  return JSON.parse(text);
}
// Root documents written for a signed-in user go through a commit that verifies the user's ACL revision,
// so a write started just before a rights change or lock-out is rejected. Worker writes keep the plain path.
function salesStoreRoot_(path,payload,c){
  if(typeof salesAuthRequest_!=='undefined'&&salesAuthRequest_?.user&&!salesAuthRequest_.worker&&typeof salesBulkRest_==='function'){
    salesBulkRest_('commit',{writes:[{update:{name:salesBulkName_(path),fields:{payload:{stringValue:payload}}}}]});return;
  }
  pilotWriteDocument_(c.project,path,{payload},c.token);
}
function salesStorePayload_(path,value){
  path=salesPath_(path);const c=salesContext_(),payload=JSON.stringify(value);
  if(Utilities.newBlob(payload).getBytes().length<=650000){salesStoreRoot_(path,payload,c);return;}
  const generation=Utilities.getUuid(),parts=Math.ceil(payload.length/100000);
  if(parts>2000)throw new Error('Datensatz überschreitet das Gesamtlimit: '+path+'. Bisheriger Stand bleibt erhalten.');
  for(let i=0;i<parts;i++){
    const fragment=JSON.stringify({source:path,index:i,text:payload.slice(i*100000,(i+1)*100000)});
    if(Utilities.newBlob(fragment).getBytes().length>750000)throw new Error('Teilpaket überschreitet das Größenlimit: '+path);
    pilotWriteDocument_(c.project,'sales_chunks/'+generation+'-'+i,{payload:fragment},c.token);
  }
  salesStoreRoot_(path,JSON.stringify({storageFormat:'sales-parts-v1',generation,parts,length:payload.length}),c);
}

/** Explicitly authorized V1 read workflows. No HQ POST/PUT is called here. */
function salesV1Index_(){
  const records=salesList_('sales_directory'),entries=new Map();
  records.forEach(e=>(e.companies||[]).forEach(company=>entries.set(String(company.id),{company,contacts:[],loadedAt:null,explicit:false})));
  // Fully loaded entries take precedence over preliminary discovery pages.
  (salesRead_('sales_meta/directory')?.entries||[]).forEach(e=>entries.set(String(e.company.id),e));
  records.filter(e=>e.company).forEach(e=>entries.set(String(e.company.id),e));
  // Customers deleted through the app stay out of rebuilt lists, even if an old discovery page still names them.
  (salesRead_('sales_meta/deleted_companies')?.ids||[]).forEach(id=>entries.delete(String(id)));
  return {entries:Array.from(entries.values())};
}
function salesV1Editions_(){return salesList_('sales_editions');}
function salesV1Known_(id){
  id=String(salesId_(id));
  return salesV1Index_().entries.some(e=>e.company.id===id)||salesV1Editions_().some(e=>(e.companyIds||[]).includes(id)||(e.companies||[]).some(c=>c.id===id));
}
function getSalesV1State(){
  salesUser_();const state=getSalesState(),editions=salesV1Editions_(),index=salesV1Index_(),companies={};
  editions.forEach(e=>{(e.companies||[]).forEach(c=>{companies[c.id]=c;});(e.companyIds||[]).forEach(id=>{if(!companies[id])companies[id]={id,name:'HQ-Unternehmen '+id+' · Details fehlen',companyTypes:[],responsibleUsers:[],customFields:[],addresses:[]};});});index.entries.forEach(e=>{companies[e.company.id]=e.company;});
  return {...state,capabilities:{editionRefreshViaSync:typeof startSalesEditionRefresh==='function'},editions,companies:Object.values(companies),directory:index.entries,preferences:salesRead_('sales_meta/preferences')||{},importRun:salesRead_('sales_meta/import'),syncRun:salesSyncSummary_(salesRead_('sales_meta/sync')),unassignedSummary:salesRead_('sales_meta/unassignedsummary')};
}
function getSalesV1Company(id){
  salesUser_();if(String(id).startsWith('draft_')||salesList_('sales_drafts').some(d=>String(d.hqId)===String(id)))return getSalesCompany(id);
  id=String(salesId_(id));if(!salesV1Known_(id))throw new Error('Firma ist noch nicht ausdrücklich in den App-Bestand aufgenommen.');
  const stored=salesRead_('sales_companies/'+id);return stored?{...stored,histories:salesVisibleHistories_(id,stored.histories)}:null;
}
function salesV1IndexCompany_(value,explicit){
  const id=value.company.id,old=salesRead_('sales_directory/'+id)||(salesRead_('sales_meta/directory')?.entries||[]).find(e=>e.company.id===id);
  const entry={company:value.company,contacts:value.contacts||old?.contacts||[],loadedAt:value.loadedAt||old?.loadedAt||null,explicit:explicit||old?.explicit||false};
  salesWrite_('sales_directory/'+id,entry);
}
function salesV1Page_(entity,filter,skip,top,expand){
  const r=salesHqGet_('/v2/'+entity+'?$top='+top+'&$skip='+skip+'&orderby=id'+(filter?'&$filter='+encodeURIComponent(filter):'')+(expand?'&expand='+encodeURIComponent(expand):''));
  const rows=Array.isArray(r.data)?r.data:r.data?.data||r.data?.value;if(!Array.isArray(rows))throw new Error('HQ-Listenformat unbekannt.');
  const key=Object.keys(r.headers).find(k=>k.toLowerCase()==='hellohq-count'),total=key?Number(r.headers[key]):null;
  if(total!==null&&(!Number.isSafeInteger(total)||total<skip+rows.length))throw new Error('HQ-Seitenzähler widersprüchlich.');
  if(total!==null&&total>skip&&!rows.length)throw new Error('HQ-Seite fehlt.');
  return {rows,total,done:total!==null?skip+rows.length===total:rows.length<top};
}
function salesV1Search_(entity,input,skip){
  const term=salesText_(input,100,true);if(term.length<3)throw new Error('Bitte mindestens drei Zeichen eingeben.');
  skip=skip===undefined?0:Number(skip);if(!Number.isSafeInteger(skip)||skip<0||skip>10000)throw new Error('Ungültige Suchseite. Bitte Suche eingrenzen.');
  // HQ v2 documents substringof(value, field), not OData contains(field, value).
  const literal=term.replace(/'/g,"''"),filter="substringof('"+literal+"',name)"+(entity==='Projects'?" or number eq '"+literal+"'":'');
  const page=salesV1Page_(entity,filter,skip,200),query=term.toLocaleLowerCase('de');
  const rows=page.rows.filter(x=>String(x.name||'').toLocaleLowerCase('de').includes(query)||entity==='Projects'&&String(x.number)===term);
  return {rows:rows.map(x=>salesPick_(x,['id','name','number'])),limited:!page.done,nextSkip:page.done?null:skip+page.rows.length,total:page.total};
}
function searchSalesProjects(term,skip){salesUser_(true);return salesV1Search_('Projects',term,skip);}
function searchSalesCompanies(term){salesUser_(true);return salesV1Search_('Companies',term);}
function addSalesCompany(id){
  salesUser_(true);return salesLock_(()=>{salesAssertPrivate_();const company=salesCompany_(salesOne_('Companies',salesId_(id)));salesV1IndexCompany_({company},true);return {message:'Unternehmen für den nächsten Datenimport aufgenommen. In HQ wurde nichts verändert.'};});
}
function saveSalesEditionConfig(input){
  salesUser_(true);return salesLock_(()=>{
    if(salesRead_('sales_meta/sync')?.state==='running')throw new Error('Auswahl erst nach Abschluss des laufenden HQ-Sync ändern.');
    salesAssertPrivate_();const enteredMagazine=salesText_(input.magazine,80,true),issue=Number(input.issue),projectId=String(salesId_(input.projectId));
    if(!Number.isSafeInteger(issue)||issue<1||issue>100000)throw new Error('Bitte eine gültige Ausgabennummer eingeben.');
    const project=salesOne_('Projects',projectId),editions=salesV1Editions_(),key=enteredMagazine.toLocaleLowerCase('de');
    const magazine=editions.find(e=>e.magazine.toLocaleLowerCase('de')===key)?.magazine||enteredMagazine,old=editions.find(e=>String(e.projectId)===projectId);
    if(editions.some(e=>e.id!==old?.id&&e.magazine.toLocaleLowerCase('de')===key&&Number(e.issue)===issue))throw new Error('Diese Ausgabe ist bereits einem anderen Projekt zugeordnet.');
    if(old&&(old.magazine.toLocaleLowerCase('de')!==key||Number(old.issue)!==issue))throw new Error('Dieses HQ-Projekt ist bereits einer anderen Ausgabe zugeordnet.');
    const id=old?.id||'project-'+projectId;
    const value={...(old||{}),id,magazine,issue,projectId,projectNumber:String(project.number||''),projectName:project.name,companyIds:old?.companyIds||[],companies:old?.companies||[],documents:old?.documents||[],complete:old?.complete||false,settings:old?.settings||{targetCents:null,adDeadline:'',printDate:'',releaseDate:'',revision:0},changes:old?.changes||[],excludedDocumentIds:old?.excludedDocumentIds||[]};
    value.cacheLinkPending=!old?.loadedAt||old.cacheLinkPending===true||old.syncEnabled===false;value.syncEnabled=true;salesWrite_('sales_editions/'+id,value);
    if(input.current===true||input.current==='on')salesWrite_('sales_meta/preferences',{currentEditionId:id});
    return {id,edition:value,message:'Magazin und Ausgabe dem ausgewählten HQ-Projekt zugeordnet. Der Datenimport kann jetzt gestartet werden.'};
  });
}
function saveSalesV1EditionSettings(input){
  const user=salesUser_();return salesLock_(()=>{
    const id=salesKey_(input.editionId),e=salesRead_('sales_editions/'+id);if(!e)throw new Error('Ausgabe fehlt.');
    if(Number(input.revision)!==e.settings.revision)throw new Error('Ausgabe inzwischen geändert. Bitte neu laden.');
    const target=Number(input.target);if(!Number.isFinite(target)||target<0||target>100000000)throw new Error('Zielumsatz ungültig.');
    const settings={targetCents:Math.round(target*100),revision:e.settings.revision+1};
    for(const k of ['adDeadline','printDate','releaseDate']){settings[k]=salesText_(input[k],10,false);if(settings[k]&&salesDate_(settings[k])!==settings[k])throw new Error('Ungültiges Datum.');}
    if(settings.adDeadline&&settings.printDate&&settings.adDeadline>settings.printDate||settings.printDate&&settings.releaseDate&&settings.printDate>settings.releaseDate)throw new Error('Termine müssen in zeitlicher Reihenfolge liegen.');
    e.changes=[{at:salesNow_(),actor:user.email,before:e.settings,after:settings},...(e.changes||[])].slice(0,50);e.settings=settings;salesWrite_('sales_editions/'+id,e);return {edition:e,message:'Ziel und Termine dieser Ausgabe für alle Nutzer gespeichert.'};
  });
}
function salesV1Scope_(id){
  id=String(salesId_(id));if(!salesV1Known_(id)&&!salesList_('sales_drafts').some(d=>String(d.hqId)===id))throw new Error('Firma gehört nicht zum bestätigten App-Bestand.');return id;
}
function salesV1LoadCompany_(id,alreadyChecked){
  id=alreadyChecked?String(salesId_(id)):salesV1Scope_(id);const started=Date.now(),company=salesCompany_(salesOne_('Companies',id));
  const contacts=salesCollect_('ContactPersons','companyId eq '+id,started,'DefaultAddress'),histories=salesCollect_('ContactHistories','companyId eq '+id,started),projects=salesCollect_('Projects','companyId eq '+id,started),documents=salesCollect_('Documents','companyId eq '+id,started);
  if([...contacts,...histories,...projects,...documents].some(x=>Number(x.companyId)!==Number(id)))throw new Error('HQ-Firmenfilter wurde nicht eingehalten.');
  const projectRows=projects.map(p=>{
    const ds=salesCollect_('Documents','projectId eq '+salesId_(p.id),started);if(ds.some(d=>Number(d.projectId)!==Number(p.id)))throw new Error('HQ-Projektfilter wurde nicht eingehalten.');
    const b=salesBelegs_(ds),actualFinishDate=salesDate_(p.actualFinishDate),status=p.status||p.projectStatus?.name||'',completed=!!actualFinishDate||/^(abgeschlossen|completed|finished)$/i.test(status.trim());
    const plans=completed?[]:salesCollect_('PlannedRevenues','projectId eq '+salesId_(p.id),started,'Estimations');if(plans.some(r=>Number(r.projectId)!==Number(p.id)))throw new Error('HQ-Planumsatz gehört zu anderem Projekt.');
    return {id:String(p.id),number:p.number||'',name:p.name||'',status,actualFinishDate,plannedFinishDate:salesDate_(p.plannedFinishDate),completed,plannedRevenues:plans.map(salesPlannedRevenue_),revenueCents:b.accepted.reduce((n,d)=>n+d.cents,0),complete:b.complete};
  });
  // Pending app changes are an overlay owned by their jobs; a refresh from HQ must keep them (same rule as the bulk sync).
  const pendingChanges=salesRead_('sales_companies/'+id)?.pendingChanges;
  const value={...(pendingChanges?{pendingChanges}:{}),company,contacts:contacts.map(salesContactView_),histories:salesHistoryRows_(histories,documents,projects,started),historyLoadedAt:salesNow_(),projects:projectRows,detailVersion:3,loadedAt:salesNow_()};
  salesWrite_('sales_companies/'+id,value);salesV1IndexCompany_(value,false);return {detail:value,message:'Kundendetails einschließlich aller Kontakte, Historie und Projekte aktualisiert.'};
}
function syncSalesV1Company(id){salesUser_(true);return salesLock_(()=>{salesAssertPrivate_();return salesV1LoadCompany_(id);});}
function syncSalesV1History(id){
  salesUser_(true);return salesLock_(()=>{
    const visible=getSalesV1Company(id);if(!visible)throw new Error('Zuerst Kundendetails importieren.');
    const companyId=salesV1Scope_(visible.company.hqId||visible.company.id);salesAssertPrivate_();const started=Date.now();
    const histories=salesCollect_('ContactHistories','companyId eq '+companyId,started),documents=salesCollect_('Documents','companyId eq '+companyId,started);
    if([...histories,...documents].some(h=>Number(h.companyId)!==Number(companyId)))throw new Error('HQ-Firmenfilter wurde nicht eingehalten.');
    const stored=salesRead_('sales_companies/'+companyId)||{company:visible.company,contacts:visible.contacts,projects:[],detailVersion:3};
    stored.histories=salesHistoryRows_(histories,documents,[],started);stored.historyLoadedAt=salesNow_();salesWrite_('sales_companies/'+companyId,stored);
    return {message:stored.histories.length+' HQ-Historieneinträge vollständig nach Firebase übertragen.'};
  });
}
function startSalesImport(editionIds){
  salesUser_(true);return salesLock_(()=>{
    if(salesRead_('sales_meta/sync')?.state==='running')throw new Error('Der gemeinsame HQ-Sync läuft bereits. Bitte unter Datenabgleich fortsetzen.');
    salesAssertPrivate_();const scoped=editionIds!==undefined;
    if(scoped&&(!Array.isArray(editionIds)||!editionIds.length||editionIds.length>200||new Set(editionIds).size!==editionIds.length))throw new Error('Bitte 1 bis 200 unterschiedliche Ausgaben auswählen.');
    const all=salesV1Editions_();if(scoped&&editionIds.some(id=>!all.some(e=>e.id===id)))throw new Error('Auswahl enthält eine nicht zugeordnete Ausgabe.');
    const old=salesRead_('sales_meta/import');if(old?.state==='running'){if(scoped)throw new Error('Zuerst den laufenden Import unter Datenabgleich fortsetzen und abschließen. Die neue Auswahl ist noch nicht gestartet.');return old;}
    const editions=scoped?all.filter(e=>editionIds.includes(e.id)):all,companyIds=scoped?[]:salesV1Index_().entries.map(e=>e.company.id);
    if(!editions.length&&!companyIds.length)throw new Error('Zuerst eine Ausgabe zuordnen oder ein Unternehmen aufnehmen.');
    const run={id:Utilities.getUuid(),revision:0,state:'running',startedAt:salesNow_(),updatedAt:salesNow_(),cursor:0,tasks:[...editions.map(e=>({kind:'edition',id:e.id,label:e.magazine+' #'+e.issue,skip:0,pages:0})),...companyIds.map(id=>({kind:'company',id,label:'HQ-Unternehmen '+id}))],errors:[],done:0};
    salesWrite_('sales_meta/import',run);return run;
  });
}
function salesV1EditionStep_(run,task){
  const e=salesRead_('sales_editions/'+salesKey_(task.id));if(!e?.projectId)throw new Error('Ausgabe hat keine bestätigte HQ-Projektzuordnung.');
  const project=salesOne_('Projects',e.projectId);if(project.name!==e.projectName||String(project.number)!==String(e.projectNumber))throw new Error('HQ-Projekt wurde geändert. Zuordnung in der Verwaltung erneut bestätigen.');
  if(task.pages>=50)throw new Error('Ausgabe überschreitet 10.000 Belege; Importumfang prüfen.');
  const page=salesV1Page_('Documents','projectId eq '+salesId_(e.projectId),task.skip,200);
  if(page.rows.some(d=>Number(d.projectId)!==Number(e.projectId)))throw new Error('HQ-Projektfilter wurde nicht eingehalten.');
  if(task.total!==undefined&&task.total!==page.total)throw new Error('HQ-Beleganzahl während des Imports geändert. Ausgabe erneut importieren.');
  const key=run.id+'-'+task.id+'-'+task.pages;salesWrite_('sales_imports/'+key,{rows:page.rows});task.total=page.total;task.pages++;task.skip+=page.rows.length;
  if(!page.done)return false;
  const docs=[];for(let p=0;p<task.pages;p++)docs.push(...salesRead_('sales_imports/'+run.id+'-'+task.id+'-'+p).rows);
  if(new Set(docs.map(d=>String(d.id))).size!==docs.length)throw new Error('Doppelte Belege über mehrere HQ-Seiten.');
  const excluded=new Set(e.excludedDocumentIds||[]),result=salesBelegs_(docs.filter(d=>!excluded.has(String(d.id))));
  excluded.forEach(id=>{if(docs.some(d=>String(d.id)===id))result.issues.push({id,reason:'Mehrere Ausgaben / Zuordnung ungeklärt: aus Summe ausgeschlossen'});});
  const companyIds=Array.from(new Set(docs.filter(d=>['Invoice','CreditNote'].includes(d.documentType)&&d.companyId).map(d=>String(salesId_(d.companyId)))));
  salesWrite_('sales_editions/'+e.id,{...e,documents:result.accepted,excludedDocuments:docs.filter(d=>excluded.has(String(d.id))).map(d=>({id:String(d.id),number:d.number||''})),ignored:result.ignored,issues:result.issues,complete:result.issues.length===0,companyIds,loadedAt:salesNow_()});
  companyIds.forEach(id=>{if(!run.tasks.some(t=>t.kind==='company'&&t.id===id))run.tasks.push({kind:'company',id,label:'HQ-Unternehmen '+id});});return true;
}
function runSalesImportStep(id,revision){
  salesUser_(true);return salesLock_(()=>{
    if(salesRead_('sales_meta/sync')?.state==='running')throw new Error('Der gemeinsame HQ-Sync läuft bereits. Bitte unter Datenabgleich fortsetzen.');
    const run=salesRead_('sales_meta/import');if(!run||run.id!==id)throw new Error('Importlauf nicht gefunden.');
    if(run.state!=='running'||Number(revision)!==run.revision)return run;
    salesAssertPrivate_();const task=run.tasks[run.cursor];
    try{const done=task.kind==='edition'?salesV1EditionStep_(run,task):(salesV1LoadCompany_(task.id),true);if(done){run.done++;run.cursor++;}}
    catch(e){run.errors.push({kind:task.kind,id:task.id,label:task.label,message:e.message||'Import fehlgeschlagen'});run.cursor++;}
    run.revision++;run.updatedAt=salesNow_();
    if(run.cursor>=run.tasks.length){run.state=run.errors.length?'completedWithErrors':'completed';run.finishedAt=salesNow_();}
    salesWrite_('sales_meta/import',run);return run;
  });
}
function retrySalesImport(){
  salesUser_(true);return salesLock_(()=>{
    if(salesRead_('sales_meta/sync')?.state==='running')throw new Error('Der gemeinsame HQ-Sync läuft bereits. Bitte unter Datenabgleich fortsetzen.');
    const old=salesRead_('sales_meta/import');if(!old?.errors?.length||old.state==='running')throw new Error('Keine abgeschlossenen Fehlerabschnitte vorhanden.');
    const run={id:Utilities.getUuid(),revision:0,state:'running',startedAt:salesNow_(),updatedAt:salesNow_(),cursor:0,tasks:old.errors.map(e=>({kind:e.kind,id:e.id,label:e.label,skip:0,pages:0})),errors:[],done:0};salesWrite_('sales_meta/import',run);return run;
  });
}
function setSalesDocumentExcluded(input){
  salesUser_(true);return salesLock_(()=>{
    const id=salesKey_(input.editionId),e=salesRead_('sales_editions/'+id),documentId=String(salesId_(input.documentId));
    if(!e||![...(e.documents||[]),...(e.excludedDocuments||[])].some(d=>String(d.id)===documentId))throw new Error('Beleg gehört nicht zu dieser Ausgabe.');
    const ids=new Set(e.excludedDocumentIds||[]);if(input.excluded===true){ids.add(documentId);const doc=e.documents.find(d=>d.id===documentId);e.excludedDocuments=[...(e.excludedDocuments||[]).filter(d=>d.id!==documentId),{id:documentId,number:doc?.number||''}];e.documents=e.documents.filter(d=>d.id!==documentId);}else ids.delete(documentId);
    e.cacheLinkPending=true;e.excludedDocumentIds=Array.from(ids);e.complete=false;e.issues=[...(e.issues||[]),{id:documentId,reason:'Belegzuordnung geändert: Ausgabe neu importieren.'}];salesWrite_('sales_editions/'+id,e);return {edition:e,message:'Zuordnung in Firebase markiert. Für eine neue vollständige Bewertung den Import starten. HQ bleibt unverändert.'};
  });
}

/** One explicit sync: saved app jobs first, full HQ reads second. Never runs on a timer. */
function salesSyncSummary_(run){
  if(!run)return null;
  if(run.engine===2)return salesBulkSummary_(run);
  const discovery=run.tasks.find(t=>t.kind==='discover')?.collections?.companies;
  return {id:run.id,revision:run.revision,state:run.state,paused:run.paused===true,done:run.done,total:run.tasks.length,current:run.tasks[run.cursor]?.label||'',stage:run.tasks[run.cursor]?.stage||'',updatedAt:run.updatedAt,stats:run.stats,errors:run.errors,coverage:run.coverage||[],discovery:{count:run.companyIds.length,total:discovery?.total??run.stats.hqCompanies??null,pages:discovery?.pages||0,complete:run.discoveryComplete===true}};
}
function startSalesSync(request){
  if(request!==undefined){
    salesUser_(true);
    if(!request||typeof request!=='object'||Array.isArray(request)||request.mode!=='editions'||Object.keys(request).some(k=>k!=='mode'))throw new Error('Unbekannter Abgleichmodus. Kein HQ-Abgleich gestartet.');
    if(typeof startSalesEditionRefresh!=='function')throw new Error('Ausgabenverknüpfung fehlt im Serverstand. SalesBackend.gs vollständig ersetzen und eine neue Version bereitstellen. Kein HQ-Abgleich gestartet.');
    // The edition refresh is an owner action (SalesAuthorization rule); 'sync.run' must not reach it through this mode.
    if(typeof salesAuthEnabled_==='function'&&salesAuthEnabled_())salesAuthOwner_();
    return startSalesEditionRefresh();
  }
  if(typeof salesBulkStart_==='function')return salesBulkStart_();
  salesUser_(true);return salesLock_(()=>{
    salesAssertPrivate_();const old=salesRead_('sales_meta/sync');if(old?.state==='running'){
      if(old.paused){old.paused=false;old.revision++;salesWrite_('sales_meta/sync',old);}
      return salesSyncSummary_(old);
    }
    const jobs=salesList_('sales_jobs').filter(j=>!['synced','canceled'].includes(j.state)),tasks=[];
    // Separate executions for company and contact, with all companies scheduled first.
    for(const step of ['company','contact'])jobs.filter(j=>j.kind==='createCompany').forEach(j=>tasks.push({kind:'write',id:j.id,step,label:step==='company'?'App → HQ: Firma anlegen/bestätigen':'App → HQ: Ansprechpartner anlegen/bestätigen'}));
    salesCommunicationOrder_(jobs.filter(j=>j.kind!=='createCompany')).forEach(j=>tasks.push({kind:'write',id:j.id,label:'App → HQ: gespeicherte Änderung'}));
    tasks.push({kind:'discover',id:'all',label:'HQ → Firebase: alle Unternehmen erfassen'});
    tasks.push({kind:'catalog',id:'lists',label:'HQ → Firebase: Auswahllisten'});
    salesV1Editions_().filter(e=>e.syncEnabled!==false).forEach(e=>tasks.push({kind:'edition',id:e.id,label:e.magazine+' #'+e.issue,skip:0,pages:0}));
    const run={id:Utilities.getUuid(),revision:0,state:'running',cursor:0,done:0,tasks,errors:[],companyIds:[],loadedCompanyIds:[],startedAt:salesNow_(),updatedAt:salesNow_(),stats:{companies:0,contacts:0,histories:0,editions:0,writes:0}};
    const legacy=salesRead_('sales_meta/import');if(legacy?.state==='running'){legacy.state='superseded';legacy.message='Vom vollständigen HQ-Sync abgelöst.';salesWrite_('sales_meta/import',legacy);}
    salesWrite_('sales_meta/sync',run);return salesSyncSummary_(run);
  });
}
function pauseSalesSync(id){
  salesUser_(true);
  if(typeof salesWorkerPause_==='function'&&salesRead_('sales_meta/sync')?.engine===2)return salesWorkerPause_(id);
  salesUser_(true);return salesLock_(()=>{
    const run=salesRead_('sales_meta/sync');if(!run||run.id!==id)throw new Error('HQ-Sync nicht gefunden.');
    if(run.state==='running'&&!run.paused){run.paused=true;run.revision++;run.pausedAt=salesNow_();salesWrite_('sales_meta/sync',run);}
    return salesSyncSummary_(run);
  });
}
function salesSyncWrite_(task,run){
  const job=salesJobRecoverInterrupted_(salesRead_('sales_jobs/'+salesKey_(task.id)));if(!job)throw new Error('Gespeicherter Auftrag fehlt.');
  if(salesReviewWaiting_(job))return;
  if(job.draftDependency&&salesRead_('sales_jobs/'+salesKey_(job.draftDependency))?.state!=='synced')return;
  if(job.formPrevious&&!['synced','canceled'].includes(salesRead_('sales_jobs/'+salesKey_(job.formPrevious))?.state))return;
  if(job.state==='synced'||job.state==='canceled'){if(job.state==='synced')salesCommunicationAfterJob_(job);return;}
  if(job.business===1){salesRunJobLocked_(job.id);const after=salesRead_('sales_jobs/'+job.id);if(after.kind==='deleteCompany'&&after.state==='synced'&&run)salesDeleteApplyCounts_(run,after);if(!['synced','canceled'].includes(after.state)&&!salesReviewWaiting_(after))throw new Error(after.message);return;}
  const draft=salesRead_('sales_drafts/'+salesKey_(job.draftId));
  if(!draft?.company||draft.id!==job.draftId)throw new Error('Kein freigegebenes eigenes Firmenziel. Auftrag nicht übertragen.');
  if(!['createCompany','history','companyChange','contactEmail','cleanupMarker'].includes(job.kind)||job.history?.contactHistoryChannel==='Task')throw new Error('Auftragsart nicht für den HQ-Sync freigegeben.');
  if(!['pending','ready','companyCreated','companyConfirmed','contactCreated'].includes(job.state))throw new Error('Auftrag '+job.state+': Ausgang oder Konflikt zuerst in der Auftragsübersicht klären. Kein erneuter Schreibversuch.');
  if(task.step==='company'&&job.companyConfirmedAt&&job.steps?.company)return;
  if(task.step==='contact'&&(!job.companyConfirmedAt||!job.steps?.company))throw new Error('Firma noch nicht bestätigt; Ansprechpartner bleibt in Firebase.');
  salesRunJobLocked_(job.id,task.step);
  const after=salesRead_('sales_jobs/'+job.id);
  if(salesReviewWaiting_(after)||after.state==='canceled')return;
  if(task.step==='company'?(!after.companyConfirmedAt||!after.steps?.company):after.state!=='synced')throw new Error(after.message||'HQ-Rückprüfung noch offen.');
}
function salesSyncPage_(run,task,key,entity,filter,expand){
  task.collections=task.collections||{};const meta=task.collections[key]||(task.collections[key]={pages:0,skip:0});
  const page=salesV1Page_(entity,filter,meta.skip,50,expand);
  if(meta.total!==undefined&&meta.total!==page.total)throw new Error('HQ-Anzahl während des Abschnitts geändert. Beim nächsten Sync erneut prüfen.');
  if(new Set(page.rows.map(r=>String(salesId_(r.id)))).size!==page.rows.length)throw new Error('Doppelte IDs in HQ-Seite.');
  if(task.kind==='discover'){
    const known=new Set(run.companyIds);if(page.rows.some(r=>known.has(String(r.id))))throw new Error('Doppelte Firmen-ID über mehrere HQ-Seiten.');
  }
  if(filter){const m=/^(companyId|projectId) eq (\d+)$/.exec(filter);if(m&&page.rows.some(r=>Number(r[m[1]])!==Number(m[2])))throw new Error('HQ-Zuordnung stimmt nicht mit dem abgefragten Ziel überein.');}
  salesWrite_('sales_imports/'+run.id+'-'+task.kind+'-'+task.id+'-'+key+'-'+meta.pages,{rows:page.rows});
  meta.pages++;meta.skip+=page.rows.length;meta.total=page.total;
  if(page.done){if(task.kind!=='discover'){const rows=salesSyncRows_(run,task,key);if(new Set(rows.map(r=>String(r.id))).size!==rows.length)throw new Error('Doppelte IDs über mehrere HQ-Seiten.');}meta.complete=true;}
  return page;
}
function salesSyncRows_(run,task,key){
  const meta=task.collections?.[key];if(!meta)return [];
  const rows=[];for(let i=0;i<meta.pages;i++){const p=salesRead_('sales_imports/'+run.id+'-'+task.kind+'-'+task.id+'-'+key+'-'+i);if(!p?.rows)throw new Error('Gespeicherte Importseite fehlt.');rows.push(...p.rows);}return rows;
}
function salesSyncDiscover_(run,task){
  const skip=task.collections?.companies?.skip||0;
  const page=salesSyncPage_(run,task,'companies','Companies','');
  // One summary write per page. Existing individual records keep contacts and loadedAt.
  salesWrite_('sales_directory/discovery-'+skip,{companies:page.rows.map(salesCompany_)});
  run.companyIds=Array.from(new Set([...run.companyIds,...page.rows.map(r=>String(r.id))]));run.stats.hqCompanies=page.total;
  if(!page.done)return false;
  run.discoveryComplete=true;
  const queued=new Set(run.tasks.filter(t=>t.kind==='company').map(t=>t.id));
  run.companyIds.forEach(id=>{if(!queued.has(id)){queued.add(id);run.tasks.push({kind:'company',id,label:'HQ-Unternehmen · Kennung '+id});}});
  return true;
}
function salesSyncCompany_(run,task){
  const id=String(salesId_(task.id));task.stage=task.stage||'Stammdaten';
  if(task.stage==='Stammdaten'){
    salesWrite_('sales_imports/'+run.id+'-base-'+id,{company:salesCompany_(salesOne_('Companies',id))});task.stage='Ansprechpartner';return false;
  }
  const sections={Ansprechpartner:['contacts','ContactPersons','DefaultAddress'],Belege:['documents','Documents'],Projekte:['projects','Projects'],Kontakthistorie:['histories','ContactHistories']},order=Object.keys(sections);
  if(sections[task.stage]){
    const [key,entity,expand]=sections[task.stage],page=salesSyncPage_(run,task,key,entity,'companyId eq '+id,expand);
    if(page.done)task.stage=order[order.indexOf(task.stage)+1]||'Projektdetails';return false;
  }
  if(task.stage==='Projektdetails'){
    const projects=salesSyncRows_(run,task,'projects');task.projectIndex=task.projectIndex||0;
    if(task.projectIndex>=projects.length){task.stage='Historientexte';return false;}
    const p=projects[task.projectIndex],key='p'+salesId_(p.id),actualFinishDate=salesDate_(p.actualFinishDate),status=p.status||p.projectStatus?.name||'',completed=!!actualFinishDate||/^(abgeschlossen|completed|finished)$/i.test(status.trim());
    if(!task.collections[key+'docs']?.complete){salesSyncPage_(run,task,key+'docs','Documents','projectId eq '+p.id);return false;}
    if(!completed&&!task.collections[key+'plans']?.complete){salesSyncPage_(run,task,key+'plans','PlannedRevenues','projectId eq '+p.id,'Estimations');return false;}
    const b=salesBelegs_(salesSyncRows_(run,task,key+'docs'));
    salesWrite_('sales_imports/'+run.id+'-project-'+id+'-'+task.projectIndex,{row:{id:String(p.id),number:p.number||'',name:p.name||'',status,actualFinishDate,plannedFinishDate:salesDate_(p.plannedFinishDate),completed,plannedRevenues:completed?[]:salesSyncRows_(run,task,key+'plans').map(salesPlannedRevenue_),revenueCents:b.accepted.reduce((n,d)=>n+d.cents,0),complete:b.complete}});
    task.projectIndex++;return false;
  }
  if(task.stage==='Historientexte'){
    task.historyPage=task.historyPage||0;const pages=task.collections.histories.pages;
    if(task.historyPage>=pages){task.stage='Veröffentlichen';return false;}
    const raw=salesRead_('sales_imports/'+run.id+'-company-'+id+'-histories-'+task.historyPage).rows;
    const rows=salesHistoryRows_(raw,salesSyncRows_(run,task,'documents'),salesSyncRows_(run,task,'projects'),Date.now());
    salesWrite_('sales_imports/'+run.id+'-historyview-'+id+'-'+task.historyPage,{rows});task.historyPage++;return false;
  }
  const company=salesRead_('sales_imports/'+run.id+'-base-'+id).company,contacts=salesSyncRows_(run,task,'contacts').map(salesContactView_),histories=[],projects=[];
  for(let i=0;i<task.historyPage;i++)histories.push(...salesRead_('sales_imports/'+run.id+'-historyview-'+id+'-'+i).rows);
  for(let i=0;i<task.projectIndex;i++)projects.push(salesRead_('sales_imports/'+run.id+'-project-'+id+'-'+i).row);
  const value={company,contacts,histories,projects,detailVersion:3,loadedAt:salesNow_(),historyLoadedAt:salesNow_(),syncRunId:run.id};
  salesWrite_('sales_companies/'+id,value);salesV1IndexCompany_(value,false);
  if(!run.loadedCompanyIds.includes(id)){run.loadedCompanyIds.push(id);run.stats.companies++;run.stats.contacts+=contacts.length;run.stats.histories+=histories.length;}
  return true;
}
function salesSyncAudit_(run){
  for(const [entity,key] of [['ContactPersons','hqContacts'],['ContactHistories','hqHistories']])run.stats[key]=salesV1Page_(entity,'',0,1).total;
  const loaded=new Set(run.loadedCompanyIds);run.coverage=salesV1Editions_().filter(e=>e.syncEnabled!==false).map(e=>({id:e.id,label:e.magazine+' #'+e.issue,companies:(e.companyIds||[]).length,missingCompanyIds:(e.companyIds||[]).filter(id=>!loaded.has(id)),editionLoaded:run.tasks.some(t=>t.kind==='edition'&&t.id===e.id&&t.finished),belegsComplete:e.complete===true}));
  if(!run.discoveryComplete||run.stats.hqCompanies===null||run.stats.companies!==run.stats.hqCompanies||run.stats.hqContacts===null||run.stats.contacts+(run.stats.unassignedContacts||0)!==run.stats.hqContacts||run.stats.hqHistories===null||run.stats.histories+(run.stats.unassignedHistories||0)!==run.stats.hqHistories)run.errors.push({label:'Vollständigkeitsprüfung',message:'HQ-Gesamtzahlen und vollständig geladene Firmen/Kontakte/Historie stimmen noch nicht bestätigt überein. Fehlende Abschnitte oder Änderungen während des Laufs prüfen.'});
  if(run.coverage.some(e=>!e.editionLoaded||e.missingCompanyIds.length||!e.belegsComplete))run.errors.push({label:'Ausgabenprüfung',message:'Mindestens eine ausgewählte Ausgabe oder ihre Firmen sind noch nicht vollständig bestätigt. Siehe Ausgabenübersicht.'});
  const index=salesV1Index_(),catalog=salesRead_('sales_meta/catalog');if(catalog){catalog.industries=Array.from(new Set(index.entries.map(e=>e.company.industrialSector).filter(Boolean))).sort();catalog.salutations=Array.from(new Set(index.entries.flatMap(e=>(e.contacts||[]).map(c=>c.salutation)).filter(Boolean))).sort();salesWrite_('sales_meta/catalog',catalog);}
}
function salesSyncCatalog_(run,task){
  const started=Date.now(),lists={};for(const entity of ['Users','CompanyTypes','Subsystems'])lists[entity]=salesCustomerList_(entity,'',started);
  const old=salesRead_('sales_meta/catalog')||{},fields=salesCompanyDefinitions_().map(f=>({...f,...((old.fields||[]).find(o=>o.name===f.name&&o.type===f.type)?.options?{options:(old.fields||[]).find(o=>o.name===f.name&&o.type===f.type).options}:{})}));
  try{salesCompanyReasonOptions_(fields);}catch(error){run.errors.push({label:'HQ-Auswahllisten · Grund der Adressanlage',message:String(error.message)});}
  const industries=Array.from(new Set([...(old.industries||[]),...run.catalogIndustries||[]])).sort((a,b)=>a.localeCompare(b,'de'));
  salesWrite_('sales_meta/catalog',{...old,customerFormWarning:null,industries,users:lists.Users.filter(u=>!u.isDeactivated).map(u=>({id:u.id,name:[u.firstName,u.lastName].filter(Boolean).join(' ')})),types:lists.CompanyTypes.map(t=>({id:t.id,name:t.name})),subsystems:lists.Subsystems.map(t=>({id:t.id,name:t.name})),fields,companyFieldsVersion:1,updatedAt:salesNow_()});return true;
}
function salesSyncUnassigned_(run,task){
  const contacts=task.id==='contacts',entity=contacts?'ContactPersons':'ContactHistories',page=salesSyncPage_(run,task,'all',entity,'',contacts?'DefaultAddress':undefined);
  const known=new Set(run.companyIds),rows=page.rows.filter(r=>!known.has(String(r.companyId))).map(r=>contacts?salesContactView_(r):salesHistory_(r,[],{}));
  salesWrite_('sales_imports/'+run.id+'-unassigned-'+task.id+'-'+(task.collections.all.pages-1),{rows});
  if(!page.done)return false;
  const all=[];for(let i=0;i<task.collections.all.pages;i++)all.push(...salesRead_('sales_imports/'+run.id+'-unassigned-'+task.id+'-'+i).rows);
  salesWrite_('sales_meta/unassigned'+task.id,{rows:all,loadedAt:salesNow_()});
  const summary=salesRead_('sales_meta/unassignedsummary')||{};summary[task.id]=all.length;summary.updatedAt=salesNow_();salesWrite_('sales_meta/unassignedsummary',summary);
  run.stats[contacts?'unassignedContacts':'unassignedHistories']=all.length;return true;
}
function getSalesUnassigned(){salesUser_();return {contacts:salesRead_('sales_meta/unassignedcontacts')?.rows||[],histories:salesRead_('sales_meta/unassignedhistories')?.rows||[]};}
function runSalesSyncStep(id,revision){
  if(typeof salesBulkStart_==='function'){salesUser_(true);return salesSyncSummary_(salesRead_('sales_meta/sync'));}
  salesUser_(true);return salesLock_(()=>{
    const run=salesRead_('sales_meta/sync');if(!run||run.id!==id)throw new Error('HQ-Sync nicht gefunden.');
    if(run.state!=='running'||run.paused||run.revision!==Number(revision))return salesSyncSummary_(run);
    salesAssertPrivate_();const task=run.tasks[run.cursor];
    try{
      let done=false;
      if(task.kind==='write'){salesSyncWrite_(task,run);run.stats.writes++;done=true;}
      else if(task.kind==='discover')done=salesSyncDiscover_(run,task);
      else if(task.kind==='edition'){done=salesV1EditionStep_(run,task);if(done)run.stats.editions++;}
      else if(task.kind==='company')done=salesSyncCompany_(run,task);
      else if(task.kind==='catalog')done=salesSyncCatalog_(run,task);
      else if(task.kind==='unassigned')done=salesSyncUnassigned_(run,task);
      else if(task.kind==='audit'){salesSyncAudit_(run);done=true;}
      else throw new Error('Unbekannter Sync-Abschnitt.');
      if(done){task.finished=true;run.done++;run.cursor++;}
    }catch(e){run.errors.push({kind:task.kind,id:task.id,label:task.label,stage:task.stage||'',message:e.message||'Abschnitt fehlgeschlagen'});run.cursor++;}
    if(run.cursor>=run.tasks.length&&!run.auditScheduled){run.auditScheduled=true;run.tasks.push({kind:'unassigned',id:'contacts',label:'Kontakte ohne Firmenzuordnung prüfen'},{kind:'unassigned',id:'histories',label:'Historie ohne Firmenzuordnung prüfen'},{kind:'audit',id:'coverage',label:'Vollständigkeit mit HQ vergleichen'});}
    if(run.cursor>=run.tasks.length)run.state=run.errors.length?'completedWithErrors':'completed';
    run.revision++;run.updatedAt=salesNow_();salesWrite_('sales_meta/sync',run);return salesSyncSummary_(run);
  });
}
function setSalesEditionEnabled(id,enabled){
  salesUser_(true);return salesLock_(()=>{salesAssertPrivate_();const e=salesRead_('sales_editions/'+salesKey_(id));if(!e)throw new Error('Ausgabe fehlt.');if(salesRead_('sales_meta/sync')?.state==='running')throw new Error('Auswahl erst nach Abschluss des laufenden HQ-Sync ändern.');if(enabled===true&&e.syncEnabled===false)e.cacheLinkPending=true;e.syncEnabled=enabled===true;salesWrite_('sales_editions/'+id,e);return {message:'Ausgaben-Auswahl in Firebase gespeichert. Wird beim nächsten HQ-Sync berücksichtigt.'};});
}

/** Server-only Firestore transport. Indexed envelopes, chunked payloads, bounded commits. */
function salesBulkCollection_(entity){
  const names={Companies:'companies',ContactPersons:'contacts',ContactHistories:'histories',Projects:'projects',Documents:'documents',PlannedRevenues:'plans'};
  if(!names[entity])throw new Error('Unbekannte HQ-Datenart.');return 'sales_raw'+names[entity];
}
function salesBulkRest_(operation,body){
  if(operation==='commit'&&typeof salesAuthProtectWrites_==='function')body={...body,writes:salesAuthProtectWrites_(body.writes)};
  const c=salesContext_();return pilotCall_(pilotUrl_(c.project,'').replace(/\/$/,'')+':'+operation,{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+c.token},payload:JSON.stringify(body)});
}
function salesBulkName_(path){return 'projects/'+salesContext_().project+'/databases/(default)/documents/'+salesPath_(path);}
function salesBulkDecode_(doc){
  const path=doc.name.split('/documents/')[1];return salesDecodeStored_(path,doc.fields.payload.stringValue,salesContext_());
}
function salesBulkGet_(paths){
  paths=Array.from(new Set(paths));const result={},cache=salesBulkStepCache_?.documents;
  if(cache){for(const path of paths)if(cache.has(path))result[path]=cache.get(path);paths=paths.filter(path=>!cache.has(path));}
  for(let i=0;i<paths.length;i+=100){
    const batch=paths.slice(i,i+100),reply=salesBulkRest_('batchGet',{documents:batch.map(salesBulkName_)});
    if(!Array.isArray(reply))throw new Error('Firebase-Sammelantwort fehlt.');
    const seen=new Set();for(const row of reply){const name=row.found?.name||row.missing;if(!name)continue;const path=name.split('/documents/')[1];if(!batch.includes(path)||seen.has(path))throw new Error('Firebase-Sammelantwort widersprüchlich.');seen.add(path);result[path]=row.found?salesBulkDecode_(row.found):null;}
    if(seen.size!==batch.length)throw new Error('Firebase-Sammelantwort unvollständig.');
  }if(cache)for(const [path,value] of Object.entries(result))cache.set(path,value);return result;
}
function salesBulkPayload_(path,value){
  const payload=JSON.stringify(value);if(Utilities.newBlob(payload).getBytes().length<=650000)return payload;
  const generation=Utilities.getUuid(),parts=Math.ceil(payload.length/100000);if(parts>2000)throw new Error('Datenpaket zu groß; bisherige Ansicht bleibt erhalten.');
  for(let i=0;i<parts;i++)salesWrite_('sales_chunks/'+generation+'-'+i,{source:path,index:i,text:payload.slice(i*100000,(i+1)*100000)});
  return JSON.stringify({storageFormat:'sales-parts-v1',generation,parts,length:payload.length});
}
function salesBulkPut_(entries){
  let writes=[],bytes=0;const flush=()=>{if(writes.length){salesBulkRest_('commit',{writes});writes=[];bytes=0;}};
  for(const e of entries){
    const fields={payload:{stringValue:salesBulkPayload_(e.path,e.value)}};
    Object.entries(e.index||{}).forEach(([k,v])=>{fields[k]={stringValue:String(v)};});
    const write={update:{name:salesBulkName_(e.path),fields}},size=Utilities.newBlob(JSON.stringify(write)).getBytes().length;
    if(writes.length>=100||bytes+size>4000000)flush();writes.push(write);bytes+=size;
  }flush();
  if(salesBulkStepCache_){salesBulkStepCache_.rows.clear();for(const e of entries)salesBulkStepCache_.documents.set(e.path,e.value);}
  if(typeof salesLeanNamesUpdate_==='function')salesLeanNamesUpdate_(entries);
  if(typeof salesLeanFiltersUpdate_==='function')salesLeanFiltersUpdate_(entries);
}
function salesBulkQuery_(collection,field,value){
  if(!/^sales_(raw(companies|contacts|histories|projects|documents|plans)|projectviews)$/.test(collection)||!['companyBucket','projectBucket'].includes(field))throw new Error('Firebase-Sammelabfrage nicht freigegeben.');
  const out=[];let last='';
  for(let page=0;page<100;page++){
    const query={from:[{collectionId:collection}],where:{fieldFilter:{field:{fieldPath:field},op:'EQUAL',value:{stringValue:String(value)}}},orderBy:[{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:250};
    if(last)query.startAt={values:[{referenceValue:last}],before:false};
    const result=salesBulkRest_('runQuery',{structuredQuery:query});if(!Array.isArray(result))throw new Error('Firebase-Abfrage unvollständig.');
    const docs=result.filter(r=>r.document).map(r=>r.document);for(const doc of docs){if(doc.name===last)throw new Error('Firebase-Seite wiederholt sich.');const value=salesBulkDecode_(doc);out.push(value);if(salesBulkStepCache_)salesBulkStepCache_.documents.set(doc.name.split('/documents/')[1],value);}if(docs.length<250)return out;last=docs[docs.length-1].name;
  }throw new Error('Datenpartition überschreitet 25.000 Einträge; weitere Aufteilung erforderlich. Bisherige Kundenansicht bleibt erhalten.');
}
function salesBulkBucket_(id){return Number(id)>0?String(Number(id)%64):'none';}
let salesBulkStepCache_=null;
function salesBulkRows_(run,entity,field,bucket){
  const generation=run.entities[entity].generation;
  const key=[generation,entity,field,bucket].join(':'),cache=salesBulkStepCache_?.rows;if(cache?.has(key))return cache.get(key);
  const rows=salesBulkQuery_(salesBulkCollection_(entity),field,bucket).filter(v=>v.generation===generation).map(v=>v.row);
  if(cache)cache.set(key,rows);return rows;
}

/** Global HQ pages, independent change cursors, Firebase-only joins. No HQ writes here. */
const SALES_BULK_ENTITIES=['Companies','ContactPersons','Projects','Documents','PlannedRevenues','ContactHistories'];
const SALES_BULK_LABELS={Companies:'Unternehmen',ContactPersons:'Ansprechpartner',Projects:'Projekte',Documents:'Belege',PlannedRevenues:'Planumsätze',ContactHistories:'Kontakthistorie'};
const SALES_BULK_EXPAND={Companies:'Addresses,DefaultAddress,CompanyTypes,ResponsibleUsers,CustomFields,Subsystems',ContactPersons:'DefaultAddress,CustomFields',Projects:'ProjectStatus',Documents:'DocumentStatusEntity',PlannedRevenues:'Estimations'};
function salesBulkSelect_(entity,raw){
  const keys={Companies:['name','industrialSector','description','homepage','debitorNumber','subsystems','companyTypes','responsibleUsers','defaultAddress','addresses','customFields'],ContactPersons:['companyId','firstName','lastName','position','phoneLandline','phoneMobile','eMail','salutation','salutationForm','defaultAddress','defaultAddressId'],Projects:['companyId','number','name','status','projectStatus','actualFinishDate','plannedFinishDate'],Documents:['companyId','projectId','number','date','currency','documentType','documentStatusEntity','netValue','createdFromId'],PlannedRevenues:['companyId','projectId','description','interval','startDate','endDate','dueMonth','dueDay','invoiceDate','currency','status','netTotal','estimations'],ContactHistories:['companyId','projectId','contactPersonId','userId','reason','content','contactOn','nextContactDate','contactHistoryChannel','contactHistoryStatus','syncId','responsibleUserIds','isReminder','recipientEmailAddress']};
  const row=salesPick_(raw,['id','updatedOn',...keys[entity]]);
  if(entity==='Companies'){
    const address=a=>a?salesPick_(a,['id','updatedOn','street','houseNumber','zipCode','city','country','description','standardForDocumentType','website']):null;
    row.defaultAddress=address(raw.defaultAddress);row.addresses=(raw.addresses||[]).map(address);row.customFields=salesCompanyCustomSelected_(raw.customFields);
  }
  if(entity==='ContactPersons'){
    Object.assign(row,salesPick_(raw,['language','birthdate','note','customFields']));
    if(raw.defaultAddress)row.defaultAddress={id:raw.defaultAddress.id,...salesContactAddressFields_(raw.defaultAddress)};
  }
  return row;
}
function salesBulkSummary_(run){
  const task=run.tasks[run.cursor],e=run.entities.Companies;
  return {id:run.id,engine:2,kind:run.kind||'sync',revision:run.revision,state:run.state,paused:!!run.paused,background:!run.paused&&run.state==='running',pauseRequested:salesWorkerProps_().getProperty('SALES_SYNC_PAUSE')===run.id,mode:run.kind==='editions'?'Ausgaben aus Firebase verknüpfen':run.full?'Einmaliger Erstimport':'Änderungsabgleich',done:run.done,total:run.tasks.length,current:task?.label||'',stage:task?.stage||'',updatedAt:run.updatedAt,heartbeat:run.heartbeat||null,stats:run.stats,errors:run.errors.concat(run.blockedMessage?[{label:'Lauf angehalten · Abschnitt wird beim Fortsetzen erneut gelesen',message:run.blockedMessage}]:[]),coverage:run.coverage||[],note:run.note||'',discovery:{count:run.companyIds.length,total:run.stats.hqCompanies??null,pages:e?.pages||0,complete:!!e?.complete},reads:SALES_BULK_ENTITIES.map(entity=>({label:SALES_BULK_LABELS[entity],count:run.entities[entity]?.seen||0,changed:run.entities[entity]?.changed||0,removed:run.entities[entity]?.removed||0,complete:!!run.entities[entity]?.complete,mode:run.kind==='editions'?'Vorhandener Firebase-Bestand':run.entities[entity]?.full?'Einmaliger Erstimport':'Änderungen seit letztem Abgleich'}))};
}
function salesBulkPrepare_(old){
  return salesDeltaPrepare_(old);
}
function salesBulkDirty_(run,entity,row){
  if(!row)return;const company=entity==='Companies'?row.id:row.companyId,project=entity==='Projects'?row.id:row.projectId;
  if(company&&run.changedCompanyIds&&!run.changedCompanyIds.includes(String(company)))run.changedCompanyIds.push(String(company));
  if(project&&run.changedProjectIds&&!run.changedProjectIds.includes(String(project)))run.changedProjectIds.push(String(project));
  if(company&&!run.dirtyCompanies.includes(salesBulkBucket_(company)))run.dirtyCompanies.push(salesBulkBucket_(company));
  if(['Projects','Documents','PlannedRevenues'].includes(entity)&&project&&!run.dirtyProjects.includes(salesBulkBucket_(project)))run.dirtyProjects.push(salesBulkBucket_(project));
}
function salesBulkPage_(entity,filter){
  const r=salesHqGet_('/v2/'+entity+'?$top=200&$skip=0&orderby=id'+(filter?'&$filter='+encodeURIComponent(filter):'')+(SALES_BULK_EXPAND[entity]?'&expand='+encodeURIComponent(SALES_BULK_EXPAND[entity]):''));
  const rows=Array.isArray(r.data)?r.data:r.data?.data||r.data?.value;if(!Array.isArray(rows)||rows.length>200)throw new Error('HQ-Sammelseite hat ein unbekanntes Format oder überschreitet die angeforderte Größe.');
  const key=Object.keys(r.headers).find(k=>k.toLowerCase()==='hellohq-count'),total=key?Number(r.headers[key]):null;
  if(total!==null&&(!Number.isSafeInteger(total)||total<rows.length))throw new Error('HQ-Seitenzähler widersprüchlich.');
  // Some endpoints may report a global rather than filtered count. Keep advancing IDs until exhausted.
  return {rows,done:rows.length===0||total===rows.length};
}
function salesBulkRead_(run,task){
  const entity=task.id,m=run.entities[entity],collection=salesBulkCollection_(entity);
  if(m.complete)return true;
  if(task.pendingPage)return salesBulkCommitPage_(run,task);
  const clauses=[];if(m.lastId)clauses.push('id gt '+m.lastId);if(m.since)clauses.push(salesDeltaFilter_(entity,m.since));
  let page;try{page=salesBulkPage_(entity,clauses.join(' and '));}
  catch(e){if(m.since&&/HTTP 400/.test(e.message))throw new Error(SALES_BULK_LABELS[entity]+': HQ hat den Änderungsfilter abgelehnt. Kein Gesamtimport als Ersatz. Gespeicherter Änderungsstand bleibt erhalten; technischen Filter prüfen.');throw e;}
  let last=m.lastId;for(const row of page.rows){const id=salesId_(row.id);if(id<=last)throw new Error('HQ-ID-Reihenfolge oder Fortsetzungsfilter verletzt.');last=id;if(m.since&&!salesDeltaRecent_(entity,row,m.since))throw new Error('HQ-Änderungsfilter wurde nicht eingehalten. Kein Gesamtimport gestartet.');}
  page.rows=page.rows.map(row=>salesBulkSelect_(entity,row));
  const paths=page.rows.map(r=>collection+'/'+r.id),old=salesBulkGet_(paths),entries=[];
  for(const row of page.rows){
    if(run.policy===3){salesDeltaRecord_(run,entity,row,old[collection+'/'+row.id],entries);if(m.full)m.ids.push(String(row.id));continue;}
    const path=collection+'/'+row.id,prior=old[path],changed=!prior||prior.generation!==m.previousGeneration||JSON.stringify(prior.row)!==JSON.stringify(row);
    if(changed){salesBulkDirty_(run,entity,prior?.row);salesBulkDirty_(run,entity,row);m.changed++;}
    if(entity==='Projects'&&m.full)salesBulkDirty_(run,entity,row);
    if(m.full||!prior||prior.generation!==m.generation)m.count++;if(m.full)m.ids.push(String(row.id));
    if(changed||prior.generation!==m.generation)entries.push({path,value:{row,generation:m.generation},index:{companyBucket:salesBulkBucket_(entity==='Companies'?row.id:row.companyId),projectBucket:salesBulkBucket_(entity==='Projects'?row.id:row.projectId)}});
  }
  m.lastId=last;m.pages++;m.seen+=page.rows.length;task.stage=m.seen+' Datensätze gelesen';
  // With no changes there is no data commit to replay. The normal end-of-step checkpoint is sufficient.
  if(!entries.length)return salesBulkFinishPage_(run,task,page.done);
  // Journal the immutable page and next cursor before any raw-cache write. Lost responses replay exactly this page.
  task.pendingPage='sales_imports/'+run.id+'-bulk-'+entity+'-'+m.pages;
  salesWrite_(task.pendingPage,{entries,done:page.done});salesWrite_('sales_meta/sync',run);
  return salesBulkCommitPage_(run,task);
}
function salesBulkCommitPage_(run,task){
  const entity=task.id,m=run.entities[entity],collection=salesBulkCollection_(entity),pending=salesRead_(task.pendingPage);
  if(!pending)throw new Error('Vorbereitete Sammelseite fehlt.');salesBulkPut_(pending.entries);
  return salesBulkFinishPage_(run,task,pending.done);
}
function salesBulkFinishPage_(run,task,done){
  const entity=task.id,m=run.entities[entity],collection=salesBulkCollection_(entity);
  if(!done){delete task.pendingPage;return false;}
  if(m.full){
    const ids=new Set(m.ids),removed=(m.previousIds||[]).filter(id=>!ids.has(id));
    const missing=salesBulkGet_(removed.map(id=>collection+'/'+id));Object.values(missing).forEach(v=>salesBulkDirty_(run,entity,v?.row));
    if(entity==='Companies'){run.companyIds=m.ids.slice();run.discoveryComplete=true;run.stats.hqCompanies=m.count;if(removed.length)run.errors.push({label:'Nicht mehr von HQ gelieferte Firmen',message:removed.length+' bisherige Firmen wurden nicht mehr geliefert. Ihre alten Kundenakten bleiben erhalten; Löschung oder Archivierung muss fachlich geprüft werden.'});}
  }
  m.complete=true;delete m.previousIds;delete task.pendingPage;return true;
}
function salesBulkProject_(run,task){
  const bucket=task.id,projects=salesBulkRows_(run,'Projects','projectBucket',bucket),docs=salesBulkRows_(run,'Documents','projectBucket',bucket),plans=salesBulkRows_(run,'PlannedRevenues','projectBucket',bucket),entries=[];
  for(const p of projects){
    if(!run.full&&run.changedProjectIds&&!run.changedProjectIds.includes(String(p.id)))continue;
    const actualFinishDate=salesDate_(p.actualFinishDate),status=p.status||p.projectStatus?.name||'',completed=!!actualFinishDate||/^(abgeschlossen|completed|finished)$/i.test(status.trim()),b=salesBelegs_(docs.filter(d=>Number(d.projectId)===Number(p.id)));
    const row={id:String(p.id),number:p.number||'',name:p.name||'',status,actualFinishDate,plannedFinishDate:salesDate_(p.plannedFinishDate),completed,plannedRevenues:completed?[]:plans.filter(r=>Number(r.projectId)===Number(p.id)).map(salesPlannedRevenue_),revenueCents:b.accepted.reduce((n,d)=>n+d.cents,0),complete:b.complete};
    entries.push({path:'sales_projectviews/'+p.id,value:{row,companyId:p.companyId,generation:run.entities.Projects.generation},index:{companyBucket:salesBulkBucket_(p.companyId),projectBucket:bucket}});salesBulkDirty_(run,'Projects',p);
  }
  // Project changes also affect invoice recipients and dispatch history outside the project-owning company.
  docs.filter(d=>run.full||!run.changedProjectIds||run.changedProjectIds.includes(String(d.projectId))).forEach(d=>salesBulkDirty_(run,'ContactHistories',d));salesBulkPut_(entries);return true;
}
function salesBulkCompany_(run,task){
  const bucket=task.id,companies=salesBulkRows_(run,'Companies','companyBucket',bucket),contacts=salesBulkRows_(run,'ContactPersons','companyBucket',bucket),histories=salesBulkRows_(run,'ContactHistories','companyBucket',bucket),docs=salesBulkRows_(run,'Documents','companyBucket',bucket),projects=salesBulkRows_(run,'Projects','companyBucket',bucket);
  const ids=Array.from(new Set([...docs,...histories].map(r=>r.projectId).filter(Boolean).concat(projects.map(p=>p.id)))).map(String);
  const rawProjects=salesBulkGet_(ids.map(id=>salesBulkCollection_('Projects')+'/'+id)),views=salesBulkGet_(projects.map(p=>'sales_projectviews/'+p.id)),byId={};
  Object.values(rawProjects).filter(v=>v&&v.generation===run.entities.Projects.generation).forEach(v=>{byId[v.row.id]=v.row;});
  const prior=typeof salesBusinessView_==='function'?salesBulkGet_(companies.filter(c=>run.full||!run.changedCompanyIds||run.changedCompanyIds.includes(String(c.id))).map(c=>'sales_companies/'+c.id)):{};
  const entries=[];for(const raw of companies){
    if(!run.full&&run.changedCompanyIds&&!run.changedCompanyIds.includes(String(raw.id)))continue;
    if(raw.industrialSector)run.catalogIndustries=Array.from(new Set([...(run.catalogIndustries||[]),raw.industrialSector]));
    const id=String(raw.id),company=salesCompany_(raw),cs=contacts.filter(c=>String(c.companyId)===id).map(salesContactView_),ds=docs.filter(d=>String(d.companyId)===id),hs=histories.filter(h=>String(h.companyId)===id).map(h=>salesHistory_(h,ds,byId));
    const ps=projects.filter(p=>String(p.companyId)===id).map(p=>{const v=views['sales_projectviews/'+p.id];if(!v||v.generation!==run.entities.Projects.generation)throw new Error('Projektübersicht fehlt; Kundenakte bleibt erhalten.');return v.row;});
    const value={...(prior['sales_companies/'+id]?.pendingChanges?{pendingChanges:prior['sales_companies/'+id].pendingChanges}:{}),...(prior['sales_companies/'+id]?.deletion?{deletion:prior['sales_companies/'+id].deletion}:{}),company,contacts:cs,histories:hs,projects:ps,detailVersion:3,loadedAt:salesNow_(),historyLoadedAt:salesNow_(),syncRunId:run.id};
    const visible=typeof salesBusinessView_==='function'?salesBusinessView_(value):value;entries.push({path:'sales_companies/'+id,value},{path:'sales_directory/'+id,value:{company:visible.company,contacts:visible.contacts,loadedAt:value.loadedAt,explicit:false}});
  }
  salesBulkPut_(entries);run.stats.companies+=companies.length;run.stats.contacts+=contacts.filter(c=>companies.some(p=>Number(p.id)===Number(c.companyId))).length;run.stats.histories+=histories.filter(h=>companies.some(p=>Number(p.id)===Number(h.companyId))).length;return true;
}
function salesEditionProjectName_(edition,name){
  if(name===edition.projectName)return true;
  const parse=value=>/^(.*) Ausgabe #(\d+)$/.exec(String(value||'')),before=parse(edition.projectName),after=parse(name);
  return !!before&&!!after&&before[1]===edition.magazine&&after[1]===edition.magazine&&Number(before[2])===Number(edition.issue)&&Number(after[2])===Number(edition.issue);
}
function salesBulkEdition_(run,task,cached){
  const e=cached?.edition||salesRead_('sales_editions/'+salesKey_(task.id)),p=cached?cached.project:salesBulkGet_([salesBulkCollection_('Projects')+'/'+e.projectId])[salesBulkCollection_('Projects')+'/'+e.projectId];
  if(!p||p.generation!==run.entities.Projects.generation||Number(p.row.id)!==Number(e.projectId)||!salesEditionProjectName_(e,p.row.name)||String(p.row.number)!==String(e.projectNumber))throw new Error('HQ-Projektzuordnung der Ausgabe wurde geändert oder nicht geliefert. In der Verwaltung prüfen.');
  const docs=(cached?cached.docs:salesBulkRows_(run,'Documents','projectBucket',salesBulkBucket_(e.projectId))).filter(d=>String(d.projectId)===String(e.projectId)),excluded=new Set(e.excludedDocumentIds||[]),b=salesBelegs_(docs.filter(d=>!excluded.has(String(d.id))));
  const excludedDocuments=docs.filter(d=>excluded.has(String(d.id))).map(d=>({id:String(d.id),number:d.number||''}));excludedDocuments.forEach(d=>b.issues.push({id:d.id,reason:'Mehrere Ausgaben / Zuordnung ungeklärt: aus Summe ausgeschlossen'}));
  const companyIds=Array.from(new Set(docs.filter(d=>['Invoice','CreditNote'].includes(d.documentType)&&d.companyId).map(d=>String(d.companyId))));
  salesWrite_('sales_editions/'+e.id,{...e,projectName:p.row.name,cacheLinkPending:false,documents:b.accepted,excludedDocuments,ignored:b.ignored,issues:b.issues,complete:b.issues.length===0,companyIds,loadedAt:salesNow_()});run.stats.editions++;return true;
}
function salesBulkUnassigned_(run,task){
  const entity=task.id==='contacts'?'ContactPersons':'ContactHistories',known=new Set(run.companyIds),rows=[];
  // Scan each cache partition once, not HQ again. Includes references to absent companies.
  task.bucket=task.bucket||0;const bucket=task.bucket===64?'none':String(task.bucket),raw=salesBulkRows_(run,entity,'companyBucket',bucket);
  raw.filter(r=>!known.has(String(r.companyId))).forEach(r=>rows.push(entity==='ContactPersons'?salesContactView_(r):salesHistory_(r,[],{})));
  task.parts=task.parts||[];if(rows.length){const path='sales_imports/'+run.id+'-orphan-'+task.id+'-'+task.bucket;salesWrite_(path,{rows});if(!task.parts.includes(path))task.parts.push(path);}task.bucket++;if(task.bucket<=64)return false;
  const all=[];for(const path of task.parts)all.push(...salesRead_(path).rows);
  salesWrite_('sales_meta/unassigned'+task.id,{rows:all,loadedAt:salesNow_()});run.stats[task.id==='contacts'?'unassignedContacts':'unassignedHistories']=all.length;return true;
}
function salesBulkAudit_(run){
  return salesDeltaAudit_(run);

}
function salesBulkStep_(run){
  salesBulkStepCache_={documents:new Map(),rows:new Map()};
  try{return salesBulkStepWork_(run);}finally{salesBulkStepCache_=null;}
}
function salesBulkStepWork_(run){
  if(run.planCleanupPending)salesDeltaResolvePlan_(run);
  const task=run.tasks[run.cursor];let done=false,writeBoundary=false;
  if(task.kind==='write'){const job=salesRead_('sales_jobs/'+salesKey_(task.id));writeBoundary=!!job&&['pending','ready','companyCreated','companyConfirmed','contactCreated'].includes(job.state)&&!(task.step==='company'&&job.companyConfirmedAt&&job.steps?.company);try{if(typeof salesWorkerReserve_==='function')salesWorkerReserve_(400,80);salesSyncWrite_(task,run);run.stats.writes++;}catch(e){if(typeof salesWorkerLimited_==='function'&&salesWorkerLimited_(e))throw e;run.errors.push({kind:'write',id:task.id,label:task.label,message:e.message});}done=true;}
  else if(task.kind==='deltaProbe')done=salesDeltaProbe_(run,task);
  else if(task.kind==='deltaMissing')done=salesDeltaMissing_(run,task);
  else if(task.kind==='deltaEditions')done=salesDeltaEditions_(run,task);
  else if(task.kind==='deltaEditionAudit'){salesDeltaCoverage_(run);done=true;}
  else if(task.kind==='bulkRead')done=salesBulkRead_(run,task);
  else if(task.kind==='bulkPlan'){run.tasks.push(...run.dirtyProjects.map(id=>({kind:'bulkProject',id,label:'Projektübersichten aus Firebase bilden · Gruppe '+id})),{kind:'bulkCompanyPlan',label:'Kundenübersichten vorbereiten'});done=true;}
  else if(task.kind==='bulkProject')done=salesBulkProject_(run,task);
  else if(task.kind==='bulkCompanyPlan'){
    run.tasks.push(...run.dirtyCompanies.map(id=>({kind:'bulkCompany',id,label:'Kundenakten aus Firebase bilden · Gruppe '+id})),...salesDeltaEditionTasks_(run,false));
    if(run.full)run.tasks.push({kind:'catalog',id:'lists',label:'Auswahllisten aktualisieren'},{kind:'bulkUnassigned',id:'contacts',label:'Kontakte ohne bekannte Firma sichern'},{kind:'bulkUnassigned',id:'histories',label:'Historie ohne bekannte Firma sichern'});
    else run.tasks.push({kind:'catalog',id:'lists',label:'Auswahllisten aktualisieren'},{kind:'deltaUnassigned',label:'Geänderte Daten ohne Firmenzuordnung prüfen'});
    run.tasks.push({kind:'bulkAudit',label:'Gesamtzahlen und Ausgaben prüfen'});done=true;
  }
  else if(task.kind==='bulkCompany')done=salesBulkCompany_(run,task);
  else if(task.kind==='bulkEdition')done=salesBulkEdition_(run,task);
  else if(task.kind==='deltaUnassigned')done=salesDeltaUnassigned_(run);
  else if(task.kind==='bulkUnassigned')done=salesBulkUnassigned_(run,task);
  else if(task.kind==='catalog')done=salesSyncCatalog_(run,task);
  else if(task.kind==='bulkAudit')done=salesBulkAudit_(run);
  else throw new Error('Unbekannter Sammelabschnitt.');
  if(done){task.finished=true;run.done++;run.cursor++;}run.revision++;run.updatedAt=salesNow_();
  if(run.cursor>=run.tasks.length)run.state=run.errors.length?'completedWithErrors':'completed';run.inFlight=null;salesWrite_('sales_meta/sync',run);return writeBoundary;
}

/** Persistent change cursors. No scheduled or mismatch-triggered full reread. */
function salesDeltaCache_(old){
  let cache=salesRead_('sales_meta/bulk')||{};
  // r18 discarded its metadata on a count warning although all read/projection steps finished.
  // Recover only from a durably completed run, never from a merely read/partially published run.
  if(old?.engine===2&&old.policy!==3&&['completed','completedWithErrors'].includes(old.state)&&old.kind!=='editions'&&
      old.cursor===old.tasks.length&&SALES_BULK_ENTITIES.every(e=>old.entities?.[e]?.complete)&&
      (!cache.completedAt||Date.parse(old.updatedAt)>Date.parse(cache.completedAt))){
    const entities={};
    for(const e of SALES_BULK_ENTITIES){const m=old.entities[e],prev=cache.entities?.[e];
      entities[e]={generation:m.generation,count:m.count,watermark:old.startedAt,ids:m.full?m.ids:(m.knownIds||prev?.ids||[]),checkOffset:prev?.checkOffset||0};
    }
    cache={...cache,entities,companyIds:old.companyIds,stats:old.stats,completedAt:old.updatedAt,policy:3,needsFull:false,
      warnings:(old.errors||[]).filter(e=>e.label==='Vollständigkeitsprüfung').map(()=>({label:'Bestandsprüfung',message:'Der übernommene Erstimport enthält eine Mengenabweichung. Vorhandene Daten bleiben erhalten; kein erneuter Gesamtimport. Der nächste Änderungsabgleich zeigt die betroffene Datenart.'}))};
    salesWrite_('sales_meta/bulk',cache);
  }
  if(cache.completedAt&&!SALES_BULK_ENTITIES.every(e=>cache.entities?.[e]?.generation&&Number.isFinite(Date.parse(cache.entities[e].watermark))))throw new Error('Gespeicherte Änderungsmarken unvollständig. Bestand bleibt erhalten; kein automatischer Gesamtimport. Einrichtung prüfen.');
  return cache;
}
function salesDeltaPrepare_(old){
  const cache=salesDeltaCache_(old),now=salesNow_(),full=!cache.completedAt;
  // A new database needs one initial baseline. A known database is never silently reset.
  if(full&&old?.engine===2&&old.state!=='running')throw new Error('Vorhandener Abgleich hat keine wiederherstellbare Ausgangsbasis. Kein erneuter Gesamtimport gestartet. Gespeicherten Lauf prüfen.');
  let tasks=[];
  if(old?.state==='running')tasks=old.tasks.slice(old.cursor).filter(t=>t.kind==='write');
  else {const jobs=salesList_('sales_jobs').filter(j=>!['synced','canceled','awaitingApproval','awaitingAnswer'].includes(j.state));for(const step of ['company','contact'])jobs.filter(j=>j.kind==='createCompany').forEach(j=>tasks.push({kind:'write',id:j.id,step,label:'App → HQ: '+(step==='company'?'Firma bestätigen':'Ansprechpartner übertragen')}));salesCommunicationOrder_(jobs.filter(j=>j.kind!=='createCompany')).forEach(j=>tasks.push({kind:'write',id:j.id,label:'App → HQ: gespeicherte Änderung'}));}
  const run={id:old?.state==='running'?old.id:Utilities.getUuid(),engine:2,policy:3,revision:(old?.revision||0)+1,state:'running',paused:false,cursor:0,done:0,tasks,
    errors:old?.state==='running'?(old.errors||[]).filter(e=>e.kind==='write'):[],entities:{},dirtyCompanies:[],dirtyProjects:[],changedCompanyIds:[],changedProjectIds:[],companyIds:(cache.companyIds||cache.entities?.Companies?.ids||[]).slice(),loadedCompanyIds:[],startedAt:now,updatedAt:now,full,
    stats:{companies:0,contacts:0,histories:0,editions:0,writes:0,unassignedContacts:cache.stats?.unassignedContacts||0,unassignedHistories:cache.stats?.unassignedHistories||0},previousStats:cache.stats||{}};
  for(const e of SALES_BULK_ENTITIES){const prev=cache.entities?.[e];
    run.entities[e]={full,generation:full?run.id:prev.generation,previousGeneration:prev?.generation||null,since:full?null:new Date(Date.parse(prev.watermark)-120000).toISOString(),lastId:0,pages:0,seen:0,changed:0,count:full?0:prev.count,ids:[],knownIds:(prev?.ids||[]).slice(),checkOffset:prev?.checkOffset||0,deltaSupported:true};
    tasks.push({kind:'bulkRead',id:e,label:'HQ → Firebase: '+SALES_BULK_LABELS[e]+(full?' erstmals lesen':' · Änderungen lesen')});
  }
  if(!full)for(const e of SALES_BULK_ENTITIES)tasks.push({kind:'deltaProbe',id:e,label:SALES_BULK_LABELS[e]+' · begrenzte Einzelprüfung (höchstens 10)'});
  if(!full)for(const e of ['Companies','ContactPersons'])tasks.push({kind:'deltaMissing',id:e,label:SALES_BULK_LABELS[e]+' · HQ-Löschungen abgleichen'});
  if(full)run.dirtyCompanies=run.dirtyProjects=Array.from({length:64},(_,i)=>String(i));
  tasks.push({kind:'bulkPlan',label:'Geänderte Kundenakten zuordnen'});
  return run;
}
// HQ accepts whole UTC seconds. Floor the request boundary; keep durable watermarks unchanged.
function salesDeltaSince_(since){return new Date(since).toISOString().replace(/\.\d{3}Z$/,'Z');}
function salesDeltaFilter_(entity,since){
  const date="datetime'"+salesDeltaSince_(since)+"'",parts=['updatedOn ge '+date,'createdOn ge '+date];
  // Company addresses expose their own timestamp. Contact-address DTOs and estimations do not.
  if(entity==='Companies')parts.push('defaultAddress/updatedOn ge '+date,'addresses/any(a: a/updatedOn ge '+date+')');
  return '('+parts.join(' or ')+')';
}
function salesDeltaRecent_(entity,row,since){
  const values=[row.updatedOn,row.createdOn];if(entity==='Companies')values.push(row.defaultAddress?.updatedOn,...(row.addresses||[]).map(a=>a.updatedOn));
  return values.some(x=>Number.isFinite(Date.parse(x))&&Date.parse(x)>=Date.parse(salesDeltaSince_(since)));
}
/** Owner-only, bounded GET probes for an already paused filter failure. Never changes the run. */
function salesDeltaDiagnosticStatus_(summary,admin){
  if(!admin||!summary?.paused||!summary.errors?.some(e=>/Unternehmen: HQ hat den Änderungsfilter abgelehnt/.test(e.message||'')))return summary;
  const cache=CacheService.getScriptCache(),key='sales-filter-diagnostic-'+summary.id+'-'+summary.revision;
  let result;try{result=JSON.parse(cache.get(key)||'null');}catch{}
  if(!Array.isArray(result)){
    const run=salesRead_('sales_meta/sync'),task=run?.tasks?.[run.cursor],since=run?.entities?.Companies?.since;
    if(run?.id!==summary.id||!run.paused||task?.kind!=='bulkRead'||task.id!=='Companies'||!Number.isFinite(Date.parse(since)))return summary;
    result=salesDeltaFilterProbes_(since,run.entities.Companies.lastId||0);try{cache.put(key,JSON.stringify(result),1800);}catch{}
  }
  return {...summary,errors:summary.errors.concat({label:'HQ-Filterdiagnose · nur lesend',message:result.join(' · ')})};
}
function salesDeltaFilterProbes_(since,lastId){
  const date="datetime'"+new Date(since).toISOString()+"'",floor=new Date(since).toISOString().replace(/\.\d{3}Z$/,'Z');
  const probes=[['Gesamtfilter',salesDeltaFilter_('Companies',since)],['Nur Datumsfelder','(updatedOn ge '+date+' or createdOn ge '+date+')'],['Nur updatedOn','updatedOn ge '+date],['Nur createdOn','createdOn ge '+date],['Standardadresse','defaultAddress/updatedOn ge '+date],['Adressliste','addresses/any(a: a/updatedOn ge '+date+')'],['Ohne Millisekunden',salesDeltaFilter_('Companies',floor)]];
  const token=revenueToken_(),out=[],until=Date.now()+20000;
  for(const [label,filter] of probes){
    if(Date.now()>=until){out.push('Weitere Prüfungen wegen Zeitgrenze ausgelassen');break;}
    const query=(lastId?'id gt '+salesId_(lastId)+' and ':'')+filter;
    try{
      const response=UrlFetchApp.fetch('https://api.hellohq.io/v2/Companies?$top=1&$skip=0&orderby=id&$filter='+encodeURIComponent(query)+'&expand='+encodeURIComponent(SALES_BULK_EXPAND.Companies),{method:'get',headers:{Authorization:'Bearer '+token,Accept:'application/json'},muteHttpExceptions:true,followRedirects:false});
      const code=response.getResponseCode();let text='';
      if(code!==200){let body;try{body=JSON.parse(response.getContentText());}catch{}text=salesDeltaSafeDiagnostic_(body?.message||body?.Message||body?.error?.message||body?.title||'Kein auswertbarer HQ-Fehlerhinweis',token);}
      out.push(label+': HTTP '+code+(text?' – '+text:''));
      if(code!==200&&code!==400)break;
    }catch(e){out.push(label+': '+salesDeltaSafeDiagnostic_(e.message,token));break;}
  }
  return out;
}
function salesDeltaSafeDiagnostic_(value,token){
  return String(value).split(token).join('[Zugangsdaten entfernt]').replace(/https?:\/\/\S+/g,'[URL entfernt]').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[E-Mail entfernt]').replace(/[\x00-\x1F\x7F]/g,' ').slice(0,450);
}
function salesDeltaRecord_(run,entity,row,prior,entries){
  const m=run.entities[entity],path=salesBulkCollection_(entity)+'/'+row.id;
  const exists=prior&&prior.generation===m.generation,changed=!exists||JSON.stringify(prior.row)!==JSON.stringify(row);
  if(changed){salesBulkDirty_(run,entity,prior?.row);salesBulkDirty_(run,entity,row);m.changed++;m.touchedIds=m.touchedIds||[];if(!m.touchedIds.includes(String(row.id)))m.touchedIds.push(String(row.id));entries.push({path,value:{row,generation:m.generation},index:{companyBucket:salesBulkBucket_(entity==='Companies'?row.id:row.companyId),projectBucket:salesBulkBucket_(entity==='Projects'?row.id:row.projectId)}});}
  if(!exists)m.count++;
  const id=String(row.id);if(!m.knownIds.includes(id))m.knownIds.push(id);
  if(entity==='Companies'&&!run.companyIds.includes(id))run.companyIds.push(id);
}
function salesDeltaProbe_(run,task){
  // Bounded round-robin checks cover silent nested changes without scanning the whole database.
  // CRM deletions require a second exact empty list; other entity types remain read-only preserved copies.
  const m=run.entities[task.id];if(task.pendingPage){salesBulkPut_(salesRead_(task.pendingPage).entries);delete task.pendingPage;task.index++;return task.index>=task.ids.length;}
  if(!task.ids){const ids=m.knownIds||[],n=Math.min(10,ids.length);task.ids=Array.from({length:n},(_,i)=>ids[(m.checkOffset+i)%ids.length]);m.checkOffset=ids.length?(m.checkOffset+n)%ids.length:0;task.index=0;}
  if(task.index>=task.ids.length)return true;
  const id=task.ids[task.index];let raw;
  try{raw=salesHqGet_('/v2/'+task.id+'/'+salesId_(id)+(SALES_BULK_EXPAND[task.id]?'?expand='+encodeURIComponent(SALES_BULK_EXPAND[task.id]):'')).data;}
  catch(e){if(!/HTTP 404/.test(e.message))throw e;if(['Companies','ContactPersons'].includes(task.id)){salesDeltaMirrorMissing_(run,task,id);return task.index>=task.ids.length;}run.errors.push({label:'HQ-Einzelprüfung · '+SALES_BULK_LABELS[task.id],message:'Kennung '+id+' wurde nicht mehr gefunden. Gespeicherter Datensatz bleibt zur Klärung erhalten; keine automatische Löschung.'});task.index++;return task.index>=task.ids.length;}
  if(String(raw.id)!==id)throw new Error('HQ-Einzelprüfung liefert eine andere Kennung.');
  const row=salesBulkSelect_(task.id,raw),path=salesBulkCollection_(task.id)+'/'+id,prior=salesBulkGet_([path])[path],entries=[];
  salesDeltaRecord_(run,task.id,row,prior,entries);m.checked=(m.checked||0)+1;
  if(!entries.length){task.index++;return task.index>=task.ids.length;}
  task.pendingPage='sales_imports/'+run.id+'-probe-'+task.id+'-'+task.index;salesWrite_(task.pendingPage,{entries});salesWrite_('sales_meta/sync',run);
  return salesDeltaProbe_(run,task);
}
/** Compare identifiers only when the CRM cache has more rows than HQ. Never imports full entities as a fallback. */
function salesDeltaMissing_(run,task){
  if(!['Companies','ContactPersons'].includes(task.id))throw Error('HQ-Löschabgleich ist nur für Unternehmen und Ansprechpartner freigegeben.');
  const m=run.entities[task.id];
  if(task.expected===undefined){
    const total=salesV1Page_(task.id,'',0,1).total;
    if(total===null)throw Error('HQ-Gesamtzahl für den Löschabgleich nicht bestätigt.');
    if(total>=m.count)return true;
    task.expected=total;task.hqIds=[];task.lastId=0;
  }
  if(!task.ids){
    const invalid=message=>{for(const key of ['expected','hqIds','lastId','ids','index'])delete task[key];task.stage='Kennungsvergleich nach Prüffehler erneut beginnen';salesWrite_('sales_meta/sync',run);throw Error(message);};
    const rows=salesHqRows_(salesHqGet_('/v1/'+task.id+'?$select=Id&$orderby=Id&$top=200&$skip='+task.hqIds.length).data);
    if(rows.length>200)invalid('HQ-Kennungsseite überschreitet die angeforderte Größe.');
    for(const row of rows){
      if(Object.keys(row).some(k=>k!=='Id'&&!k.startsWith('@odata.')))invalid('HQ hat die reine Kennungsabfrage nicht eingehalten. Kein Gesamtabruf als Ersatz.');
      const id=salesId_(row.Id);if(id<=task.lastId)invalid('HQ-Kennungsseiten enthalten doppelte oder ungeordnete Kennungen.');
      task.lastId=id;task.hqIds.push(String(id));
    }
    if(task.hqIds.length>task.expected||task.hqIds.length>100000)invalid('HQ-Kennungsbestand hat sich während der Prüfung geändert. Bitte erneut abgleichen.');
    task.stage=task.hqIds.length+' von '+task.expected+' HQ-Kennungen geprüft';
    if(rows.length&&task.hqIds.length<task.expected)return false;
    if(task.hqIds.length!==task.expected||salesV1Page_(task.id,'',0,1).total!==task.expected)invalid('HQ-Kennungsliste ist unvollständig oder inzwischen geändert. Es wird nichts daraus gelöscht.');
    const present=new Set(task.hqIds);task.ids=(m.knownIds||[]).filter(id=>!present.has(String(id)));task.index=0;delete task.hqIds;
  }
  return salesDeltaProbe_(run,task);
}
/** A GET 404 plus an exact empty list confirms an upstream CRM deletion. One atomic checkpoint removes its app copies. */
function salesDeltaMirrorMissing_(run,task,id){
  const entity=task.id,key=String(salesId_(id));if(!['Companies','ContactPersons'].includes(entity))throw Error('HQ-Löschziel nicht freigegeben.');
  const page=salesV1Page_(entity,'id eq '+key,0,2);
  if(page.total!==0||page.rows.length||!page.done)throw Error('HQ bestätigt die Löschung nicht eindeutig. Firebase-Datensatz bleibt erhalten.');
  const rawPath=salesBulkCollection_(entity)+'/'+key,raw=salesRead_(rawPath),cache=salesRead_('sales_meta/bulk');
  if(!raw||raw.generation!==run.entities[entity].generation||raw.generation!==cache?.entities?.[entity]?.generation)throw Error('Gespeicherter HQ-Datensatz oder Generation nicht prüfbar. Keine Löschung.');
  const next=JSON.parse(JSON.stringify(run)),nextCache=JSON.parse(JSON.stringify(cache)),nextTask=next.tasks[next.cursor],now=salesNow_();
  if(nextTask.id!==entity||String(nextTask.ids?.[nextTask.index])!==key)throw Error('Löschprüfpunkt passt nicht zum laufenden Abgleich.');
  for(const target of [next,nextCache]){
    const meta=target.entities[entity];if(!Number.isSafeInteger(meta.count)||meta.count<1)throw Error('Gespeicherter Bestandszähler nicht prüfbar. Keine Löschung.');
    meta.count--;for(const list of ['ids','knownIds','touchedIds'])if(Array.isArray(meta[list]))meta[list]=meta[list].filter(x=>String(x)!==key);
    if(entity==='Companies')for(const list of ['companyIds','loadedCompanyIds'])if(Array.isArray(target[list]))target[list]=target[list].filter(x=>String(x)!==key);
  }
  const stat=entity==='Companies'?'companies':'contacts';if(Number.isSafeInteger(nextCache.stats?.[stat]))nextCache.stats[stat]=Math.max(0,nextCache.stats[stat]-1);
  // Keep removed IDs as touched so the orphan views also drop deleted contacts.
  const touched=next.entities[entity].touchedIds||(next.entities[entity].touchedIds=[]);if(!touched.includes(key))touched.push(key);
  salesBulkDirty_(next,entity,raw.row);next.entities[entity].removed=(next.entities[entity].removed||0)+1;nextTask.index++;nextTask.stage=nextTask.index+' fehlende Kennungen geprüft';next.revision++;next.updatedAt=now;
  const entries=new Map(),deleted=new Set([rawPath]),put=(path,value)=>entries.set(path,value),drop=path=>{entries.delete(path);deleted.add(path);};
  const drafts=salesList_('sales_drafts'),jobs=salesList_('sales_jobs'),companyId=entity==='Companies'?key:String(raw.row.companyId||''),related=new Set([companyId].filter(Boolean));
  if(entity==='ContactPersons')for(const job of jobs)if(String(job.contactId)===key){if(job.companyRef)related.add(String(job.companyRef));if(job.hqId)related.add(String(job.hqId));}
  const own=drafts.filter(d=>d.hqId&&related.has(String(d.hqId))||related.has('draft_'+d.id)),refs=new Set([...related,...own.map(d=>'draft_'+d.id)]),canceled=new Set();
  const aliases=new Set([key]);for(const job of jobs)if(entity==='ContactPersons'&&String(job.contactId)===key){aliases.add('local_'+job.id);aliases.add('draft_'+job.id+'_contact');}
  for(const job of jobs){
    const companyMatch=refs.has(String(job.hqId))||refs.has(String(job.companyRef))||own.some(d=>job.id===d.id||job.draftId===d.id||job.draftDependency===d.id);
    const contactMatch=String(job.contactId)===key||job.entity==='contact'&&(aliases.has(String(job.targetId))||aliases.has(String(job.targetRef)))||aliases.has(String(job.capture?.contactRef))||aliases.has(String(job.history?.contactPersonId));
    if((entity==='Companies'?!companyMatch:!contactMatch)||['synced','canceled'].includes(job.state))continue;
    put('sales_jobs/'+job.id,{...job,state:'canceled',updatedAt:now,message:'In HQ gelöscht; offener App-Auftrag wird nicht mehr übertragen.'});canceled.add(job.id);
  }
  for(const draft of own){
    const value={...draft,pendingChanges:(draft.pendingChanges||[]).filter(p=>!canceled.has(p.jobId))};
    if(entity==='Companies')value.deletedAt=now;
    else if(jobs.some(j=>j.id===draft.id&&String(j.contactId)===key))value.contactDeletedAt=now;
    if(JSON.stringify(value)!==JSON.stringify(draft))put('sales_drafts/'+draft.id,value);
  }
  if(entity==='Companies'){
    // A remaining HQ contact/history becomes unassigned; do not invent a cascading HQ deletion.
    for(const relatedEntity of ['ContactPersons','ContactHistories']){
      const ids=next.entities[relatedEntity].touchedIds||(next.entities[relatedEntity].touchedIds=[]);
      for(const row of salesBulkRows_(run,relatedEntity,'companyBucket',salesBulkBucket_(key)))if(String(row.companyId)===key&&!ids.includes(String(row.id)))ids.push(String(row.id));
    }
    for(const path of ['sales_companies/'+key,'sales_directory/'+key,...[...refs].map(ref=>'sales_communication/'+ref)])drop(path);
    for(const path of ['sales_meta/lean_names','sales_meta/lean_filters']){const old=salesRead_(path);if(old)put(path,{...old,rows:old.rows.filter(c=>!refs.has(String(c.id))&&String(c.hqId||'')!==key)});}
    const legacy=salesRead_('sales_meta/directory');if(legacy)put('sales_meta/directory',{...legacy,entries:legacy.entries.filter(e=>String(e.company?.id)!==key)});
    const owners=salesRead_('sales_meta/lean_testowners');if(owners?.rows?.[key]){delete owners.rows[key];put('sales_meta/lean_testowners',owners);}
    const tomb=salesRead_('sales_meta/deleted_companies')||{ids:[]};put('sales_meta/deleted_companies',{...tomb,ids:[...new Set([...tomb.ids,key])]});
    const request=salesRead_('sales_deletions/'+key);if(request&&request.state!=='done')put('sales_deletions/'+key,{...request,state:'done',completedAt:now,message:'Bereits in HQ gelöscht; lokale Kopie im HQ-Abgleich entfernt.',revision:(request.revision||0)+1});
  }else{
    for(const ref of refs)if(/^\d+$/.test(ref))for(const path of ['sales_companies/'+ref,'sales_directory/'+ref]){const old=salesRead_(path);if(old)put(path,{...old,contacts:(old.contacts||[]).filter(c=>String(c.id)!==key),pendingChanges:(old.pendingChanges||[]).filter(p=>!canceled.has(p.jobId))});}
    const legacy=salesRead_('sales_meta/directory');if(legacy)put('sales_meta/directory',{...legacy,entries:legacy.entries.map(e=>({...e,contacts:(e.contacts||[]).filter(c=>String(c.id)!==key)}))});
    for(const ref of refs){const old=salesRead_('sales_communication/'+ref);if(old)put('sales_communication/'+ref,{...old,contacts:(old.contacts||[]).filter(c=>!aliases.has(String(c.hqId||c.id))&&!canceled.has(c.jobId)),histories:(old.histories||[]).filter(h=>!canceled.has(h.jobId))});}
    const orphan=salesRead_('sales_meta/unassignedcontacts');if(orphan){const rows=orphan.rows.filter(c=>String(c.id)!==key);put('sales_meta/unassignedcontacts',{...orphan,rows});const summary=salesRead_('sales_meta/unassignedsummary');if(summary)put('sales_meta/unassignedsummary',{...summary,contacts:rows.length,updatedAt:now});}
  }
  next.errors=next.errors.filter(e=>!canceled.has(e.id));
  put('sales_meta/mirror_'+entity+'_'+key,{entity,id:key,runId:run.id,removedAt:now,verification:'single-404-and-filtered-empty-list',canceledJobIds:[...canceled]});
  put('sales_meta/bulk',nextCache);put('sales_meta/sync',next);put('sales_meta/lean_sync',salesSyncSummary_(next));
  if(entries.size+deleted.size>450)throw Error('Zu viele zugehörige App-Aufträge für einen atomaren Löschabgleich. Gezielte Klärung erforderlich.');
  const writes=[...[...deleted].map(path=>({delete:salesBulkName_(path)})),...[...entries].map(([path,value])=>({update:{name:salesBulkName_(path),fields:{payload:{stringValue:salesBulkPayload_(path,value)}}}}))];
  salesBulkRest_('commit',{writes});if(salesBulkStepCache_){salesBulkStepCache_.documents.clear();salesBulkStepCache_.rows.clear();}
  Object.assign(task,nextTask);next.tasks[next.cursor]=task;Object.assign(run,next);
}
/** Explicit administrative repair of one missing orphan plan. Runs only inside the resumed central sync. */
function salesDeltaResolvePlan_(run){
  if(typeof salesWorkerReserve_==='function')salesWorkerReserve_(20,10);
  const path='sales_meta/plan_cleanup_'+salesKey_(run.id),request=salesRead_(path);
  if(!request||request.approved!==true||request.runId!==run.id||request.state!=='approved')throw Error('Planumsatz-Klärung nicht freigegeben.');
  const id=String(salesId_(request.id)),rawPath=salesBulkCollection_('PlannedRevenues')+'/'+id,raw=salesRead_(rawPath),cache=salesRead_('sales_meta/bulk'),m=run.entities.PlannedRevenues,cm=cache?.entities?.PlannedRevenues;
  if(!raw||raw.generation!==request.generation||raw.generation!==m.generation||raw.generation!==cm?.generation||JSON.stringify(raw.row)!==JSON.stringify(request.before)||raw.row.projectId)throw Error('Planumsatz oder Zuordnung inzwischen geändert. Bestand bleibt erhalten.');
  let actual=null;try{actual=salesHqGet_('/v2/PlannedRevenues/'+id+'?expand=Estimations').data;}catch(e){if(!/HTTP 404/.test(e.message||''))throw e;}
  if(actual&&(String(actual.id)!==id||actual.projectId||Number(actual.companyId)!==Number(raw.row.companyId)))throw Error('HQ-Planumsatz hat eine abweichende Zuordnung. Bestand bleibt zur Prüfung erhalten.');
  if(!actual){const page=salesV1Page_('PlannedRevenues','id eq '+id,0,2,'Estimations');if(page.total!==0||page.rows.length||!page.done)throw Error('HQ-Liste bestätigt den fehlenden Planumsatz nicht eindeutig. Bestand bleibt erhalten.');}
  const nextRun=JSON.parse(JSON.stringify(run)),nextCache=JSON.parse(JSON.stringify(cache)),nextRequest={...request,state:actual?'refreshed':'removed',resolvedAt:salesNow_(),verification:actual?'single-get':'single-404-and-filtered-empty-list'};
  if(!actual){for(const meta of [nextRun.entities.PlannedRevenues,nextCache.entities.PlannedRevenues]){if(!Number.isSafeInteger(meta.count)||meta.count<1)throw Error('Planumsatz-Zähler nicht prüfbar. Bestand bleibt erhalten.');meta.count--;for(const key of ['ids','knownIds','touchedIds'])if(Array.isArray(meta[key]))meta[key]=meta[key].filter(x=>String(x)!==id);}}
  nextRun.planCleanupPending=false;nextRun.revision++;nextRun.updatedAt=salesNow_();nextRun.errors=(nextRun.errors||[]).filter(e=>!(e.label==='HQ-Einzelprüfung · Planumsätze'&&e.message==='Kennung '+id+' wurde nicht mehr gefunden. Gespeicherter Datensatz bleibt zur Klärung erhalten; keine automatische Löschung.'));
  const update=(p,value)=>({update:{name:salesBulkName_(p),fields:{payload:{stringValue:salesBulkPayload_(p,value)}}}});
  const rawWrite=actual?update(rawPath,{...raw,row:actual}):{delete:salesBulkName_(rawPath)};
  if(actual){rawWrite.update.fields.companyBucket={stringValue:salesBulkBucket_(actual.companyId)};rawWrite.update.fields.projectBucket={stringValue:'none'};}
  salesBulkRest_('commit',{writes:[rawWrite,update(path,nextRequest),update('sales_meta/bulk',nextCache),update('sales_meta/sync',nextRun),update('sales_meta/lean_sync',salesSyncSummary_(nextRun))]});
  Object.assign(run,nextRun);
}
function salesDeltaEditionTasks_(run,onlyPending){
  const byBucket={};for(const e of salesV1Editions_().filter(e=>e.syncEnabled!==false)){
    if(!onlyPending&&e.loadedAt&&!e.cacheLinkPending&&!run.full&&!(run.changedProjectIds||[]).includes(String(e.projectId)))continue;
    if(onlyPending&&e.loadedAt&&!e.cacheLinkPending)continue;
    const bucket=salesBulkBucket_(e.projectId);(byBucket[bucket]||(byBucket[bucket]=[])).push(e.id);
  }
  return Object.entries(byBucket).map(([id,editionIds])=>({kind:'deltaEditions',id,editionIds,label:'Magazinausgaben aus Firebase verknüpfen · Gruppe '+id}));
}
function salesDeltaEditions_(run,task){
  const editions=task.editionIds.map(id=>salesRead_('sales_editions/'+salesKey_(id)));
  if(editions.some(e=>!e))throw new Error('Ausgabenzuordnung fehlt.');
  const paths=editions.map(e=>salesBulkCollection_('Projects')+'/'+e.projectId),projects=salesBulkGet_(paths),docs=salesBulkRows_(run,'Documents','projectBucket',task.id);
  for(const e of editions){salesBulkEdition_(run,{id:e.id}, {edition:e,project:projects[salesBulkCollection_('Projects')+'/'+e.projectId],docs});}return true;
}
function startSalesEditionRefresh(){
  salesUser_(true);return salesLock_(()=>{
    salesAssertPrivate_();const old=salesRead_('sales_meta/sync');if(old?.state==='running')throw new Error('Zuerst den gespeicherten Abgleich fortsetzen oder abschließen.');
    const cache=salesDeltaCache_(old);if(!cache.completedAt)throw new Error('Es fehlt ein abgeschlossener Erstimport. Vorhandenen HQ-Abgleich zuerst abschließen.');
    const now=salesNow_(),run={id:Utilities.getUuid(),engine:2,policy:3,kind:'editions',revision:0,state:'running',cursor:0,done:0,tasks:[],errors:(cache.warnings||[]).slice(),entities:cache.entities,companyIds:cache.companyIds||cache.entities.Companies.ids||[],startedAt:now,updatedAt:now,full:false,stats:{...cache.stats,editions:0,writes:0},note:'Nur neue oder zur Aktualisierung markierte Ausgaben aus Firebase. Kein HQ-Abruf und keine HQ-Schreibaufträge. Der Stand entspricht dem letzten HQ-Abgleich; bestehende Bestandswarnungen bleiben offen.'};
    run.tasks=salesDeltaEditionTasks_(run,true);if(!run.tasks.length)throw new Error('Keine neuen oder geänderten Ausgabenzuordnungen vorhanden.');
    run.tasks.push({kind:'deltaEditionAudit',label:'Ausgabenzuordnungen prüfen'});salesWorkerEnsure_();salesWorkerProps_().setProperty('SALES_SYNC_PAUSE','');salesWrite_('sales_meta/sync',run);return salesBulkSummary_(run);
  });
}
function salesDeltaCoverage_(run){
  const known=new Set(run.companyIds);run.coverage=salesV1Editions_().filter(e=>e.syncEnabled!==false).map(e=>({id:e.id,label:e.magazine+' #'+e.issue,companies:(e.companyIds||[]).length,missingCompanyIds:(e.companyIds||[]).filter(id=>!known.has(id)),editionLoaded:!!e.loadedAt&&!e.cacheLinkPending,belegsComplete:e.complete===true}));
  if(run.coverage.some(e=>!e.editionLoaded||e.missingCompanyIds.length||!e.belegsComplete))run.errors.push({label:'Ausgabenprüfung',message:'Mindestens eine Ausgabe hat offene Beleg- oder Firmenzuordnungen. Siehe Ausgabenübersicht.'});
}
function salesDeltaUnassigned_(run){
  const known=new Set(run.companyIds);let changed=false;
  for(const [entity,key] of [['ContactPersons','contacts'],['ContactHistories','histories']]){
    const ids=run.entities[entity].touchedIds||[];if(!ids.length&&!(run.entities.Companies.touchedIds||[]).length)continue;
    const path='sales_meta/unassigned'+key,old=salesRead_(path)||{rows:[]},map=new Map(old.rows.map(r=>[String(r.id),r]));
    for(const [id,row] of map)if(known.has(String(row.companyId)))map.delete(id);
    const records=salesBulkGet_(ids.map(id=>salesBulkCollection_(entity)+'/'+id));
    for(const id of ids){map.delete(id);const row=records[salesBulkCollection_(entity)+'/'+id]?.row;if(row&&!known.has(String(row.companyId)))map.set(id,entity==='ContactPersons'?salesContactView_(row):salesHistory_(row,[],{}));}
    const rows=Array.from(map.values());if(JSON.stringify(rows)!==JSON.stringify(old.rows)){salesWrite_(path,{rows,loadedAt:salesNow_()});changed=true;}
    run.stats[key==='contacts'?'unassignedContacts':'unassignedHistories']=rows.length;
  }
  if(changed)salesWrite_('sales_meta/unassignedsummary',{contacts:run.stats.unassignedContacts??run.previousStats.unassignedContacts??0,histories:run.stats.unassignedHistories??run.previousStats.unassignedHistories??0,updatedAt:salesNow_()});return true;
}
function salesDeltaAudit_(run){
  const warnings=[];for(const e of SALES_BULK_ENTITIES){const total=salesV1Page_(e,'',0,1).total,m=run.entities[e],key={Companies:'hqCompanies',ContactPersons:'hqContacts',ContactHistories:'hqHistories'}[e];
    if(key)run.stats[key]=total;m.confirmedTotal=total;
    if(total===null||total!==m.count)warnings.push({label:'Bestandsprüfung · '+SALES_BULK_LABELS[e],message:'Firebase: '+m.count+' · HQ: '+(total===null?'nicht bestätigt':total)+'. Mengenabweichung bleibt zur Prüfung offen. Änderungsstand gespeichert; kein erneuter Gesamtimport.'});
  }
  salesDeltaCoverage_(run);run.errors.push(...warnings);
  const entities={};for(const e of SALES_BULK_ENTITIES){const m=run.entities[e];entities[e]={generation:m.generation,count:m.count,watermark:run.startedAt,ids:m.full?m.ids:(m.knownIds||[]),checkOffset:m.checkOffset||0};}
  // Each stream was fully read and all affected projections published. Counts are diagnostics, not reset switches.
  run.stats.companies=run.entities.Companies.count;run.stats.contacts=run.entities.ContactPersons.count;run.stats.histories=run.entities.ContactHistories.count;
  // Cache totals include unassigned rows; UI must not add them a second time.
  run.stats.totalsIncludeUnassigned=true;
  if(run.full)salesWrite_('sales_meta/unassignedsummary',{contacts:run.stats.unassignedContacts||0,histories:run.stats.unassignedHistories||0,updatedAt:salesNow_()});
  salesWrite_('sales_meta/bulk',{policy:3,entities,companyIds:run.companyIds,stats:run.stats,completedAt:salesNow_(),needsFull:false,warnings});return true;
}

/** Temporary Apps Script continuation trigger. Never starts a new/nightly business sync. */
let salesWorkerBudgetActive_=false;
function salesWorkerDay_(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function salesWorkerHoldState_(){try{return JSON.parse(salesWorkerProps_().getProperty('SALES_SYNC_HOLD')||'null');}catch{throw Error('Gespeicherte Kontingentpause ungültig. Bitte administrativ prüfen.');}}
function salesWorkerBudget_(reads,writes){
  if(!salesWorkerBudgetActive_)return;
  const p=salesWorkerProps_(),day=salesWorkerDay_();let meter;try{meter=JSON.parse(p.getProperty('SALES_SYNC_BUDGET')||'null');}catch{throw Error('Gespeichertes Importbudget ungültig.');}
  if(!meter||meter.day!==day)meter={day,reads:0,writes:0};
  if(!Number.isSafeInteger(meter.reads)||meter.reads<0||!Number.isSafeInteger(meter.writes)||meter.writes<0||!Number.isSafeInteger(reads)||!Number.isSafeInteger(writes))throw Error('Gespeichertes Importbudget ungültig.');
  const next={day,reads:Math.max(0,meter.reads+reads),writes:Math.max(0,meter.writes+writes)};
  if(next.reads>20000||next.writes>12000){const e=Error('Tagesbudget des HQ-Imports erreicht. Gespeicherten Lauf am nächsten Tag manuell fortsetzen.');e.salesBudget=true;throw e;}
  p.setProperty('SALES_SYNC_BUDGET',JSON.stringify(next));
}
// Before an HQ write task: stop cleanly unless enough budget remains to finish the job and store its state.
function salesWorkerReserve_(reads,writes){
  if(!salesWorkerBudgetActive_)return;
  const day=salesWorkerDay_();let meter;try{meter=JSON.parse(salesWorkerProps_().getProperty('SALES_SYNC_BUDGET')||'null');}catch{throw Error('Gespeichertes Importbudget ungültig.');}
  if(!meter||meter.day!==day)return;
  if(meter.reads+reads>20000||meter.writes+writes>12000){const e=Error('Tagesbudget des HQ-Imports reicht nicht mehr sicher für einen Schreibauftrag. Gespeicherten Lauf am nächsten Tag manuell fortsetzen.');e.salesBudget=true;throw e;}
}
function salesWorkerRequestBudget_(url,options){
  if(!salesWorkerBudgetActive_||!/^https:\/\/firestore\.googleapis\.com\//.test(url))return null;
  const method=String(options?.method||'get').toLowerCase();let body;try{body=JSON.parse(options?.payload||'{}');}catch{throw Error('Importanfrage ohne prüfbares Budget.');}
  let reads=0,writes=0,query=false;
  if(url.endsWith(':batchGet'))reads=body.documents.length;
  else if(url.endsWith(':runQuery')){reads=body.structuredQuery.limit;query=true;}
  else if(url.endsWith(':commit')){reads=body.writes.filter(w=>w.verify).length;writes=body.writes.filter(w=>w.update||w.delete||w.transform).length;}
  else if(method==='get'){reads=Number(/[?&]pageSize=(\d+)/.exec(url)?.[1]||1);query=/[?&]pageSize=/.test(url);}
  else if(['patch','delete'].includes(method))writes=1;
  else throw Error('Importanfrage ohne prüfbares Budget.');
  if(!Number.isSafeInteger(reads)||reads<0)throw Error('Import-Lesemenge nicht begrenzt.');
  salesWorkerBudget_(reads,writes);return {reads,query};
}
function salesWorkerLimited_(e){return e.salesQuota||e.salesBudget||/Firestore[^\n]*HTTP 429/.test(e.message||'');}
function salesWorkerHold_(e){
  const message=e.salesBudget?'Tagesbudget des HQ-Imports erreicht. Gespeicherten Lauf am nächsten Tag manuell fortsetzen.':'Firebase-Kontingent ausgeschöpft. Hintergrundlauf gestoppt; nach Erneuerung des Kontingents manuell fortsetzen.';
  salesWorkerProps_().setProperty('SALES_SYNC_HOLD',JSON.stringify({day:salesWorkerDay_(),at:salesNow_(),reason:e.salesBudget?'budget':'quota',message}));salesWorkerStop_();
}
function salesWorkerStatus_(summary){const hold=salesWorkerHoldState_();return summary?.state==='running'&&hold?{...summary,paused:true,background:false,errors:summary.errors.concat({label:'HQ-Abgleich angehalten · Kontingentschutz',message:hold.message})}:summary;}
function salesWorkerProps_(){return PropertiesService.getScriptProperties();}
function setupSalesSyncWorker(){
  const user=salesUser_(true),email=String(Session.getEffectiveUser().getEmail()||'').trim().toLowerCase();
  if(!email)throw new Error('Google-Ausführungskonto nicht erkennbar. Im Apps-Script-Editor freigeben.');
  ScriptApp.getProjectTriggers(); // Requests script.scriptapp authorization before any run is changed.
  const p=salesWorkerProps_();p.setProperty('SALES_SYNC_EXECUTOR',email);p.setProperty('SALES_SYNC_ADMIN',user.email);
  return {message:'Hintergrundfortsetzung freigegeben. Der nächste manuelle HQ-Sync darf ohne offenen Browser weiterlaufen. Kein Nachtlauf eingerichtet.'};
}
function salesWorkerEnsure_(){
  const hold=salesWorkerHoldState_();if(hold?.day===salesWorkerDay_())throw Error(hold.message);
  const p=salesWorkerProps_(),email=String(Session.getEffectiveUser().getEmail()||'').trim().toLowerCase(),admin=String(p.getProperty('SALES_ADMIN_EMAIL')||SALES.admin).trim().toLowerCase();
  if(!email||p.getProperty('SALES_SYNC_EXECUTOR')!==email||p.getProperty('SALES_SYNC_ADMIN')!==admin)throw new Error('Hintergrundlauf noch nicht freigegeben. In Apps Script einmal setupSalesSyncWorker ausführen und Google-Berechtigung bestätigen.');
  if(hold)p.setProperty('SALES_SYNC_HOLD','');
  const existing=ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='salesSyncWorker_'),saved=p.getProperty('SALES_SYNC_TRIGGER');
  const keep=existing.find(t=>t.getUniqueId()===saved);existing.filter(t=>t!==keep).forEach(t=>ScriptApp.deleteTrigger(t));
  if(!keep){const trigger=ScriptApp.newTrigger('salesSyncWorker_').timeBased().everyMinutes(1).create();p.setProperty('SALES_SYNC_TRIGGER',trigger.getUniqueId());}
}
function salesWorkerStop_(){
  const p=salesWorkerProps_();p.setProperty('SALES_SYNC_TRIGGER','');ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='salesSyncWorker_').forEach(t=>ScriptApp.deleteTrigger(t));
}
function salesBulkStart_(){
  salesUser_(true);return salesLock_(()=>{
    salesAssertPrivate_();salesWorkerEnsure_();const old=salesRead_('sales_meta/sync');
    const run=old?.engine===2&&old.state==='running'?old:salesBulkPrepare_(old);
    run.paused=false;run.blockedMessage='';run.inFlight=null;run.statusPublishedAt=null;run.revision++;run.updatedAt=salesNow_();salesWorkerProps_().setProperty('SALES_SYNC_PAUSE','');
    const legacy=salesRead_('sales_meta/import');if(legacy?.state==='running'){legacy.state='superseded';salesWrite_('sales_meta/import',legacy);}
    salesWrite_('sales_meta/sync',run);return salesBulkSummary_(run);
  });
}
function getSalesSyncStatus(){
  const user=salesUser_();return salesDeltaDiagnosticStatus_(salesLeanSyncStatus_(),user.admin);
}
function salesWorkerPause_(id){
  const run=salesRead_('sales_meta/sync');if(!run||run.id!==id)throw new Error('HQ-Sync nicht gefunden.');
  salesWorkerProps_().setProperty('SALES_SYNC_PAUSE',id);const lock=LockService.getScriptLock();
  if(lock.tryLock(1000)){try{const current=salesRead_('sales_meta/sync');if(current?.id===id&&current.state==='running'){current.paused=true;current.revision++;current.updatedAt=salesNow_();salesWrite_('sales_meta/sync',current);salesWorkerStop_();return salesBulkSummary_(current);}}finally{lock.releaseLock();}}
  return salesBulkSummary_(run);
}
function salesSyncWorker_(event){
  const p=salesWorkerProps_(),owner=p.getProperty('SALES_SYNC_EXECUTOR'),admin=String(p.getProperty('SALES_ADMIN_EMAIL')||SALES.admin).trim().toLowerCase(),allowed=String(p.getProperty('SALES_ALLOWED_EMAILS')||admin).split(',').map(x=>x.trim().toLowerCase());
  if(!event?.triggerUid||String(event.triggerUid)!==p.getProperty('SALES_SYNC_TRIGGER')||String(Session.getEffectiveUser().getEmail()||'').toLowerCase()!==owner||p.getProperty('SALES_SYNC_ADMIN')!==admin||!allowed.includes(admin))throw new Error('Hintergrundauftrag nicht autorisiert.');
  try{
  if(salesWorkerHoldState_()){salesWorkerStop_();return;}
  // Only a validated installable trigger may establish this server-only context.
  if(typeof salesAuthEnabled_==='function'&&salesAuthEnabled_()){const cfg=salesAuthConfig_();salesAuthRequest_={user:salesAuthPrincipal_({uid:cfg.ownerUid,email:cfg.ownerEmail}),worker:true};}
  const until=Date.now()+180000;let checked=false;
  while(Date.now()<until){
    const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
    try{
      salesWorkerBudgetActive_=true;
      let run=salesRead_('sales_meta/sync');if(!run||run.engine!==2||run.state!=='running'||run.paused){if(run?.engine===2)salesWrite_('sales_meta/lean_sync',salesBulkSummary_(run));salesWorkerStop_();return;}
      if(p.getProperty('SALES_SYNC_PAUSE')===run.id){run.paused=true;run.revision++;run.updatedAt=salesNow_();salesWrite_('sales_meta/sync',run);salesWorkerStop_();return;}
      let writeBoundary=false;try{
        const task=run.tasks[run.cursor],key=[run.cursor,task.stage||'',task.bucket||0,run.entities[task.id]?.lastId||0,task.pendingPage||''].join(':');
        const attempts=run.inFlight?.key===key?run.inFlight.attempts+1:1;
        if(attempts>3)throw new Error('Derselbe Abschnitt wurde dreimal ohne Abschluss beendet, möglicherweise durch Googles Laufzeitgrenze. Lauf angehalten; bitte den Fehler unter Apps Script → Ausführungen prüfen. Keine Schreibaufträge neu anlegen.');
        run.inFlight={key,attempts};run.heartbeat=salesNow_();salesWrite_('sales_meta/sync',run);
        if(!checked){salesAssertPrivate_();salesWorkerPrivate_();checked=true;}
        writeBoundary=salesBulkStep_(run);
      }catch(e){
        if(salesWorkerLimited_(e)){salesWorkerHold_(e);return;}
        // Reload the durable checkpoint: an interrupted page may already have an immutable replay journal.
        run=salesRead_('sales_meta/sync');
        if(run&&run.state!=='running'){salesWrite_('sales_meta/lean_sync',salesBulkSummary_(run));salesWorkerStop_();return;}
        run.paused=true;run.blockedMessage=e.message||'Hintergrundabschnitt fehlgeschlagen.';run.updatedAt=salesNow_();run.revision++;salesWrite_('sales_meta/sync',run);salesWorkerStop_();return;
      }
      if(run.state!=='running'){salesWorkerStop_();return;}
      // Each company/contact write is followed by a separate trigger execution, not just another function call.
      if(writeBoundary)return;
    }finally{lock.releaseLock();}
    // Give waiting user saves a chance to take the lock before the next section; if one does, the next trigger continues.
    if(typeof Utilities!=='undefined'&&Utilities.sleep)Utilities.sleep(1500);
  }
  }catch(e){if(salesWorkerLimited_(e)){salesWorkerHold_(e);return;}throw e;}finally{salesWorkerBudgetActive_=false;if(typeof salesAuthRequest_!=='undefined')salesAuthRequest_=null;}
}
function salesWorkerPrivate_(){
  const c=salesContext_();for(const col of [...SALES_BULK_ENTITIES.map(salesBulkCollection_),'sales_projectviews']){const r=UrlFetchApp.fetch(pilotUrl_(c.project,col+'/security-probe'),{method:'get',muteHttpExceptions:true,followRedirects:false});if(![401,403].includes(r.getResponseCode()))throw new Error('Firestore-Schutz für den Sammelimport fehlt.');}
}

/** Click-driven read endpoints and shared compact projections. */
function salesLeanFilterRow_(c){
  const address=c.defaultAddress||(c.addresses||[]).find(a=>a.standardForDocumentType==='Invoice');
  return {id:String(c.id),name:c.name,industrialSector:c.industrialSector||'',defaultAddress:address?{city:address.city||''}:null,
    companyTypes:(c.companyTypes||[]).map(t=>salesPick_(t,['name','number'])),responsibleUsers:(c.responsibleUsers||[]).map(u=>salesPick_(u,['id','userId','firstName','lastName']))};
}
function salesLeanBookingRow_(e){
  const companyRevenue={};for(const d of e.documents||[])companyRevenue[String(d.companyId)]=(companyRevenue[String(d.companyId)]||0)+d.cents;
  return {...salesLeanEdition_(e),companyRevenue};
}
function salesLeanProjection_(path,build){
  const old=salesRead_(path);if(old)return old.rows;
  return salesLock_(()=>{const again=salesRead_(path);if(again)return again.rows;const rows=build();salesWrite_(path,{rows});return rows;});
}
function salesLeanFilters_(){return salesLeanProjection_('sales_meta/lean_filters',()=>salesV1Index_().entries.map(e=>salesLeanFilterRow_(e.company)));}
function salesLeanBookings_(){return salesLeanProjection_('sales_meta/lean_bookings',()=>salesV1Editions_().map(salesLeanBookingRow_));}
function salesLeanSyncStatus_(){
  const cached=salesRead_('sales_meta/lean_sync');if(cached){const value={...cached,pauseRequested:PropertiesService.getScriptProperties().getProperty('SALES_SYNC_PAUSE')===cached.id};return typeof salesWorkerStatus_==='function'?salesWorkerStatus_(value):value;}
  return salesLock_(()=>{const again=salesRead_('sales_meta/lean_sync');if(again)return again;const run=salesRead_('sales_meta/sync'),summary=salesSyncSummary_(run);if(run)salesWrite_('sales_meta/lean_sync',summary);return typeof salesWorkerStatus_==='function'?salesWorkerStatus_(summary):summary;});
}
/** Customers with an approved or completed deletion never come back into the compact lists through a later write. */
function salesLeanGone_(entries){
  const gone=new Set((salesRead_('sales_meta/deleted_companies')?.ids||[]).map(String));
  for(const e of entries){const v=e.value;if(!v||!(v.deletedAt||v.deletion?.state==='approved'))continue;if(/^sales_drafts\//.test(e.path)){gone.add('draft_'+v.id);if(v.hqId&&v.deletedAt)gone.add(String(v.hqId));}else if(v.company)gone.add(String(v.company.id));}
  return gone;
}
function salesLeanFiltersUpdate_(entries){
  let changes=entries.filter(e=>/^sales_(directory|companies)\/\d+$/.test(e.path)&&e.value.company).map(e=>salesLeanFilterRow_(e.value.company));
  if(!changes.length)return;const path='sales_meta/lean_filters',old=salesRead_(path);if(!old)return;
  const gone=salesLeanGone_(entries);changes=changes.filter(c=>!gone.has(String(c.id)));if(!changes.length)return;
  const map=new Map(old.rows.map(c=>[c.id,c]));let changed=false;
  for(const c of changes)if(JSON.stringify(map.get(c.id))!==JSON.stringify(c)){map.set(c.id,c);changed=true;}
  if(changed)salesWrite_(path,{rows:Array.from(map.values())});
}
function salesLeanEdition_(e){
  return {id:e.id,magazine:e.magazine,issue:e.issue,projectId:e.projectId,projectNumber:e.projectNumber,projectName:e.projectName,syncEnabled:e.syncEnabled,loadedAt:e.loadedAt,complete:e.complete,cacheLinkPending:e.cacheLinkPending,settings:e.settings,changes:(e.changes||[]).slice(0,1),revenueCents:(e.documents||[]).reduce((n,d)=>n+d.cents,0),summaryOnly:true};
}
function salesLeanRoster_(){
  const key='sales_meta/lean_editions',old=salesRead_(key);if(old)return old.rows;
  return salesLock_(()=>{const again=salesRead_(key);if(again)return again.rows;const rows=salesV1Editions_().map(salesLeanEdition_).sort((a,b)=>a.id.localeCompare(b.id));salesWrite_(key,{rows});return rows;});
}
function getSalesLeanState(selectedId){
  const user=salesUser_(),preferences=salesRead_('sales_meta/preferences')||{},editions=salesLeanRoster_();
  const edition=editions.find(e=>e.id===selectedId)||editions.find(e=>e.id===preferences.currentEditionId)||editions.find(e=>e.id===SALES.edition)||editions[0]||null;
  return {release:SALES_RELEASE,lean:true,user,capabilities:{editionRefreshViaSync:typeof startSalesEditionRefresh==='function'},preferences,editions,edition,companies:[],directory:[],drafts:[],jobs:[],localCompanies:[],catalog:null,access:null,syncRun:null,importRun:null,unassignedSummary:null};
}
function salesLeanNames_(){
  const path='sales_meta/lean_names',cached=salesRead_(path);if(cached?.deletionVisibilityVersion===1)return cached.rows;
  return salesLock_(()=>{
    const again=salesRead_(path);if(again?.deletionVisibilityVersion===1)return again.rows;
    salesDeleteMigrateVisibility_();
    const repaired=salesRead_(path);if(repaired){salesWrite_(path,{...repaired,deletionVisibilityVersion:1});return repaired.rows;}
    // Once, on the first explicit Customers click: migrate the existing directory to names only.
    const map=new Map(salesV1Index_().entries.map(e=>[String(e.company.id),{id:String(e.company.id),name:e.company.name}]));
    for(const d of salesList_('sales_drafts'))if(d.company&&!d.deletedAt&&d.deletion?.state!=='approved')map.set(String(d.hqId||'draft_'+d.id),{id:'draft_'+d.id,name:map.get(String(d.hqId))?.name||salesBusinessVisibleDraft_(d).company.name,...(d.hqId?{hqId:String(d.hqId)}:{})});
    const rows=Array.from(map.values());salesWrite_(path,{rows,deletionVisibilityVersion:1});return rows;
  });
}
function salesLeanNamesUpdate_(entries){
  const changes=entries.filter(e=>/^sales_(directory|companies)\/\d+$/.test(e.path)&&e.value.company).map(e=>({id:String(e.value.company.id),name:e.value.company.name}));
  for(const e of entries)if(/^sales_drafts\//.test(e.path)&&e.value.company)changes.push({id:'draft_'+e.value.id,name:salesBusinessVisibleDraft_(e.value).company.name,...(e.value.hqId?{hqId:String(e.value.hqId)}:{})});
  if(!changes.length)return;const path='sales_meta/lean_names',old=salesRead_(path);if(!old)return;
  const gone=salesLeanGone_(entries),kept=changes.filter(c=>!gone.has(c.id)&&!(c.hqId&&gone.has(c.hqId)));if(!kept.length)return;changes.length=0;changes.push(...kept);
  const map=new Map(old.rows.map(c=>[c.hqId||c.id,c]));let changed=false;
  for(const c of changes)if(c.hqId&&map.has(c.hqId))c.name=map.get(c.hqId).name;
  for(let c of changes){const key=c.hqId||c.id;if(c.hqId&&map.delete(c.id))changed=true;const prior=map.get(key);if(!c.id.startsWith('draft_')&&prior?.id.startsWith('draft_'))c={...prior,name:c.name};if(JSON.stringify(prior)!==JSON.stringify(c)){map.set(key,c);changed=true;}}
  if(changed)salesWrite_(path,{...old,rows:Array.from(map.values())});
}
function salesLeanHistoryIndex_(){
  const path='sales_meta/lean_historyjobs',cached=salesRead_(path);if(cached)return cached.rows;
  return salesLock_(()=>{
    const again=salesRead_(path);if(again)return again.rows;
    const rows=salesList_('sales_jobs').filter(j=>j.kind==='history'&&j.state!=='canceled').map(j=>({id:j.id,companyId:String(j.hqId)}));
    salesWrite_(path,{rows});return rows;
  });
}
function salesLeanPrepareWrite_(path,value){
  if(path!=='sales_meta/sync'||!(value.paused||value.state!=='running'||!value.inFlight&&!value.tasks?.[value.cursor]?.pendingPage))return null;
  if(!value.paused&&value.state==='running'&&value.statusPublishedAt&&Date.now()-Date.parse(value.statusPublishedAt)<15000)return null;
  value.statusPublishedAt=salesNow_();return salesSyncSummary_(value);
}
function salesLeanAfterWrite_(path,value){
  if(/^sales_(directory|companies)\/\d+$/.test(path)||/^sales_drafts\//.test(path)){salesLeanNamesUpdate_([{path,value}]);salesLeanFiltersUpdate_([{path,value}]);}
  if(/^sales_jobs\//.test(path)&&value.kind==='history'){
    const key='sales_meta/lean_historyjobs',old=salesRead_(key);if(!old)return;
    const rows=old.rows.filter(j=>j.id!==value.id);if(value.state!=='canceled')rows.push({id:value.id,companyId:String(value.hqId)});rows.sort((a,b)=>a.id.localeCompare(b.id));
    if(JSON.stringify(rows)!==JSON.stringify(old.rows))salesWrite_(key,{rows});
  }
  if(/^sales_editions\//.test(path)){
    for(const [key,project] of [['sales_meta/lean_editions',salesLeanEdition_],['sales_meta/lean_bookings',salesLeanBookingRow_]]){
      const old=salesRead_(key);if(!old)continue;const e=project(value),rows=old.rows.filter(x=>x.id!==e.id);rows.push(e);rows.sort((a,b)=>a.id.localeCompare(b.id));
      if(JSON.stringify(rows)!==JSON.stringify(old.rows))salesWrite_(key,{rows});
    }
  }
  if(/^sales_drafts\//.test(path)&&value.hqId){const key='sales_meta/lean_testowners',old=salesRead_(key);if(old){old.rows[String(value.hqId)]=value.id;salesWrite_(key,old);}}
}
function salesLeanOwnDraft_(id){
  const path='sales_meta/lean_testowners',old=salesRead_(path);if(old)return old.rows[String(id)]||null;
  return salesLock_(()=>{const again=salesRead_(path);if(again)return again.rows[String(id)]||null;const rows={};for(const d of salesList_('sales_drafts'))if(d.hqId&&!d.deletedAt)rows[String(d.hqId)]=d.id;salesWrite_(path,{rows});return rows[String(id)]||null;});
}
function salesLeanHistories_(id,rows){
  const out=(rows||[]).map(h=>({...h,source:'hq'}));
  for(const entry of salesLeanHistoryIndex_().filter(j=>j.companyId===String(id))){
    const j=salesRead_('sales_jobs/'+salesKey_(entry.id));if(!j||j.kind!=='history'||j.state==='canceled'||String(j.hqId)!==String(id))continue;
    const matches=out.filter(h=>j.historyId&&String(h.id)===String(j.historyId)||h.syncId&&h.syncId===j.history.syncId);
    if(matches.length)matches.forEach(h=>Object.assign(h,{jobId:j.id,syncState:j.state}));
    else out.push({...j.history,id:'local_'+j.id,jobId:j.id,source:'app',syncState:j.state==='synced'?'missing':j.state});
  }return out;
}
function salesLeanKnown_(id){
  id=String(salesId_(id));const entry=salesRead_('sales_directory/'+id);
  if(entry?.company&&String(entry.company.id)===id)return true;
  if((salesRead_('sales_meta/deleted_companies')?.ids||[]).includes(id))return false;
  if((salesRead_('sales_meta/directory')?.entries||[]).some(e=>String(e.company.id)===id))return true;
  return salesV1Editions_().some(e=>(e.companyIds||[]).map(String).includes(id)||(e.companies||[]).some(c=>String(c.id)===id));
}
function getSalesLeanCompany(id){return salesCommunicationMerge_(salesLeanCompanyBase_(id));}
function salesLeanCompanyBase_(id){
  salesUser_();
  if(String(id).startsWith('draft_')){
    const draft=salesRead_('sales_drafts/'+salesKey_(String(id).slice(6)));if(!draft?.company||draft.deletedAt)throw new Error(draft?.deletedAt?'Dieser Kunde wurde gelöscht.':'Firebase-Firma fehlt.');
    const job=salesRead_('sales_jobs/'+draft.id),catalog=salesRead_('sales_meta/catalog'),local=salesLocalCompany_(draft,catalog,job),stored=draft.hqId?salesRead_('sales_companies/'+draft.hqId):null;
    const contacts=draft.contact&&!draft.contactDeletedAt?[{...salesBusinessVisibleDraft_(draft).contact,id:job?.contactId||'draft_'+draft.id+'_contact',localDraftId:draft.id,syncState:job?.steps?.contact?'confirmed':'pending'}]:[];
    const pending=(draft.pendingChanges||[]).map(p=>({...p,targetId:p.entity==='contact'?job?.contactId:p.entity==='address'?stored?.company?.defaultAddress?.id:draft.hqId}));
    const visible=stored?salesBusinessView_({...stored,pendingChanges:[...(stored.pendingChanges||[]),...pending]}):stored,displayed=job?.state==='synced'&&stored?{...visible.company,id:local.id,localDraftId:draft.id,hqId:String(draft.hqId),syncState:job.state,pendingEditCount:pending.length}:local;
    return {...(visible||{}),...(draft.deletion?{deletion:draft.deletion}:{}),company:displayed,contacts:visible?.contacts?.length?visible.contacts:contacts,histories:draft.hqId?salesLeanHistories_(draft.hqId,stored?.histories):[],projects:stored?.projects||[],detailVersion:3,source:'firebase',patch:{draft,job:job?salesJobSummary_(job):null,localCompany:displayed}};
  }
  id=String(salesId_(id));const own=salesLeanOwnDraft_(id);if(own)return salesLeanCompanyBase_('draft_'+own);if(!salesLeanKnown_(id))throw new Error('Firma gehört nicht zum bestätigten App-Bestand.');
  const stored=salesRead_('sales_companies/'+id);
  if(stored)return {...(typeof salesBusinessView_==='function'?salesBusinessView_(stored):stored),histories:salesLeanHistories_(id,stored.histories)};
  const entry=salesRead_('sales_directory/'+id);return entry?.company?{company:entry.company,contacts:entry.contacts||[],histories:[],projects:[],detailMissing:true,...(entry.deletion?{deletion:entry.deletion}:{})}:null;
}
function getSalesLeanView(name,selectedId){
  const user=salesUser_();
  if(name==='customers')return {companies:salesLeanNames_()};
  if(name==='magazine')return {companies:salesLeanFilters_(),editions:salesLeanBookings_()};
  if(name==='contacts')return {directory:salesV1Index_().entries,drafts:salesList_('sales_drafts'),jobs:salesList_('sales_jobs').map(salesJobSummary_)};
  if(name==='invoices')return {editions:salesV1Editions_(),companies:salesLeanNames_()};
  if(name==='admin')return {editions:salesLeanRoster_(),access:user.admin?salesAccess_():null};
  if(name==='new')return {catalog:salesCustomerCatalog_(false)};
  if(name==='change')return {catalog:salesRead_('sales_meta/catalog')};
  if(name==='import')return {syncRun:salesLeanSyncStatus_(),unassignedSummary:salesRead_('sales_meta/unassignedsummary')};
  if(name==='test'){
    const drafts=salesList_('sales_drafts'),jobs=salesList_('sales_jobs'),catalog=salesRead_('sales_meta/catalog');
    return {drafts,jobs:jobs.map(salesJobSummary_),catalog,localCompanies:drafts.map(d=>salesLocalCompany_(d,catalog,jobs.find(j=>j.id===d.id))),...(name==='import'?{syncRun:salesSyncSummary_(salesRead_('sales_meta/sync')),unassignedSummary:salesRead_('sales_meta/unassignedsummary')}: {})};
  }
  if(name==='home')return getSalesLeanState(selectedId);
  throw new Error('Unbekannte Ansicht.');
}
function syncSalesLeanHistory(id){
  salesUser_(true);const result=salesLock_(()=>{
    const isDraft=String(id).startsWith('draft_');let draft=null,companyId;
    if(isDraft){draft=salesRead_('sales_drafts/'+salesKey_(String(id).slice(6)));if(!draft?.company||!draft.hqId)throw new Error('Zuerst eigene Firma in HQ bestätigen.');companyId=String(salesId_(draft.hqId));}
    else{companyId=String(salesId_(id));if(!salesLeanKnown_(companyId))throw new Error('Firma gehört nicht zum bestätigten App-Bestand.');}
    const stored=salesRead_('sales_companies/'+companyId);if(!stored)throw new Error('Zuerst Kundendetails importieren.');salesAssertPrivate_();const started=Date.now();
    const histories=salesCollect_('ContactHistories','companyId eq '+companyId,started),documents=salesCollect_('Documents','companyId eq '+companyId,started);
    if([...histories,...documents].some(h=>Number(h.companyId)!==Number(companyId)))throw new Error('HQ-Firmenfilter wurde nicht eingehalten.');
    stored.histories=salesHistoryRows_(histories,documents,[],started);stored.historyLoadedAt=salesNow_();salesWrite_('sales_companies/'+companyId,stored);
    return {stored,draft,companyId};
  });
  const detail={...result.stored,histories:salesLeanHistories_(result.companyId,result.stored.histories)};
  if(result.draft)detail.company={...detail.company,id:String(id),localDraftId:result.draft.id,hqId:result.companyId};
  return {message:result.stored.histories.length+' HQ-Historieneinträge vollständig nach Firebase übertragen.',detail};
}
function getSalesLeanEdition(id){salesUser_();const e=salesRead_('sales_editions/'+salesKey_(id));if(!e)throw new Error('Ausgabe fehlt.');return e;}
function saveSalesLeanEditionSettings(input){const result=saveSalesV1EditionSettings(input);return {...result,edition:salesLeanBookingRow_(result.edition)};}
function syncSalesLeanCompany(id){
  salesUser_(true);id=String(salesId_(id));const own=salesLeanOwnDraft_(id);const result=salesLock_(()=>{
    salesAssertPrivate_();const draft=own?salesRead_('sales_drafts/'+salesKey_(own)):null;if(!salesLeanKnown_(id)&&!(draft?.company&&String(draft.hqId)===id))throw new Error('Firma gehört nicht zum bestätigten App-Bestand.');
    // Existing complete HQ detail loader, with its membership check already satisfied by a direct lookup.
    return salesV1LoadCompany_(id,true);
  });result.detail.histories=salesLeanHistories_(id,result.detail.histories);return result;
}
function mutateSalesLean(name,args){
  salesUser_();if(!Array.isArray(args))throw new Error('Ungültige Parameter.');
  const allowed={bindSalesCompanyResult,saveSalesCompany,saveSalesTestCompany,saveSalesHistory,saveSalesCompanyChange,queueSalesContactEmail,queueSalesMarkerCleanup,runSalesJob,reconcileSalesJob,resolveSalesConflict,checkSalesHistoryBinding};
  if(!Object.prototype.hasOwnProperty.call(allowed,name))throw new Error('Aktion nicht freigegeben.');
  const result=allowed[name](...args),id=result.id||(['runSalesJob','reconcileSalesJob','resolveSalesConflict','checkSalesHistoryBinding'].includes(name)?args[0]:null);
  if(!id)return result;
  const job=salesRead_('sales_jobs/'+salesKey_(id)),draft=job?.draftId?salesRead_('sales_drafts/'+salesKey_(job.draftId)):null;
  const localCompany=draft?salesLocalCompany_(draft,salesRead_('sales_meta/catalog'),job):null;
  return {...result,patch:{job:job?{...salesJobSummary_(job),...(job.kind==='history'?{history:job.history}:{})}:null,draft,localCompany},...(['saveSalesCompany','saveSalesTestCompany'].includes(name)?{detail:{company:localCompany,contacts:[{...draft.contact,id:'draft_'+draft.id+'_contact',localDraftId:draft.id,syncState:'pending'}],histories:[],projects:[],detailVersion:3}}:{})};
}

/** Read-only, explicitly paged inventory. No customer contents, delete endpoint or automatic scanner. */
function getSalesStorageInventoryPage(input){
  salesUser_(true);input=input||{};
  const collections=['sales_meta','sales_editions','sales_directory','sales_companies','sales_jobs','sales_drafts','sales_communication','sales_rawcompanies','sales_rawcontacts','sales_rawhistories','sales_rawprojects','sales_rawdocuments','sales_rawplans','sales_projectviews','sales_imports','sales_chunks'];
  const collection=input.collection||collections[0],index=collections.indexOf(collection),token=input.pageToken||'';
  if(index<0||typeof token!=='string'||token.length>5000||/[\r\n]/.test(token))throw new Error('Ungültige Inventurseite.');
  const c=salesContext_(),page=pilotCall_(pilotUrl_(c.project,collection)+'?pageSize=50'+(token?'&pageToken='+encodeURIComponent(token):''),{method:'get',headers:{Authorization:'Bearer '+c.token}});
  const refs=new Set(),groups={},result={collection,documents:0,payloadBytes:0,splitRoots:0,unreadable:0,oldest:null,newest:null,references:[],chunkGroups:[],next:null};
  for(const doc of page.documents||[]){
    if(!doc.name?.split('/documents/')[1]?.startsWith(collection+'/'))throw new Error('Inventurantwort passt nicht zur Sammlung.');
    result.documents++;const text=doc.fields?.payload?.stringValue||'';result.payloadBytes+=Utilities.newBlob(text).getBytes().length;
    if(doc.updateTime){if(!result.oldest||doc.updateTime<result.oldest)result.oldest=doc.updateTime;if(!result.newest||doc.updateTime>result.newest)result.newest=doc.updateTime;}
    let value;try{value=JSON.parse(text);}catch(_){result.unreadable++;continue;}
    if(value?.storageFormat==='sales-parts-v1'&&value.generation){result.splitRoots++;refs.add(value.generation);}
    if(collection==='sales_chunks'){
      const key=doc.name.split('/').pop(),match=/^(.+)-\d+$/.exec(key);if(match)groups[match[1]]=(groups[match[1]]||0)+1;else result.unreadable++;
    }
  }
  result.references=Array.from(refs);result.chunkGroups=Object.entries(groups).map(([generation,count])=>({generation,count}));
  result.next=page.nextPageToken?{collection,pageToken:page.nextPageToken}:index+1<collections.length?{collection:collections[index+1]}:null;
  return result;
}

/** Writable HQ v2 fields. Source: https://api.hellohq.io/swagger/v2/swagger.json; checked 2026-10-18. */
const SALES_HQ_FIELDS={
  "CompanyPut": {
    "type": "object",
    "required": [
      "name"
    ],
    "properties": {
      "name": {
        "type": "string",
        "minLength": 1
      },
      "industrialSector": {
        "type": "string",
        "nullable": true
      },
      "description": {
        "type": "string",
        "nullable": true
      },
      "iban": {
        "type": "string",
        "nullable": true
      },
      "bic": {
        "type": "string",
        "nullable": true
      },
      "homepage": {
        "type": "string",
        "nullable": true
      },
      "vatId": {
        "type": "string",
        "nullable": true
      },
      "financesChargeRateId": {
        "type": "integer",
        "nullable": true,
        "format": "int32"
      },
      "standardDeliveryConditionId": {
        "type": "integer",
        "nullable": true,
        "format": "int32",
        "deprecated": true
      },
      "standardPaymentConditionId": {
        "type": "integer",
        "nullable": true,
        "format": "int32",
        "deprecated": true
      },
      "debitorNumber": {
        "type": "integer",
        "nullable": true,
        "format": "int32"
      },
      "creditorNumber": {
        "type": "integer",
        "nullable": true,
        "format": "int32"
      },
      "documentDefaultMailEntityId": {
        "type": "integer",
        "nullable": true,
        "format": "int32"
      },
      "routingId": {
        "type": "string",
        "nullable": true
      },
      "eInvoiceType": {
        "type": "string",
        "enum": [
          "None",
          "XRechnung"
        ]
      },
      "customFields": {
        "type": "array",
        "nullable": true,
        "items": {
          "type": "object",
          "required": [
            "name",
            "type"
          ],
          "properties": {
            "name": {
              "type": "string",
              "minLength": 1
            },
            "type": {
              "type": "string",
              "enum": [
                "Text",
                "TextMultiline",
                "Date",
                "Dropdown",
                "DropdownCheckbox",
                "Boolean",
                "Upload",
                "UserSelection",
                "CompanySelection",
                "ProjectSelection",
                "ResourceSelection",
                "ContactSelection",
                "Link",
                "Float",
                "Integer",
                "Token",
                "NumericText"
              ]
            },
            "value": {
              "nullable": true
            }
          }
        }
      }
    }
  },
  "CompanyAddressBase": {
    "type": "object",
    "required": [
      "city",
      "country",
      "description",
      "street",
      "zipCode"
    ],
    "properties": {
      "alternativeCompanyName": {
        "type": "string",
        "nullable": true
      },
      "additionalInformation": {
        "type": "string",
        "nullable": true
      },
      "street": {
        "type": "string",
        "minLength": 1
      },
      "houseNumber": {
        "type": "string",
        "nullable": true
      },
      "zipCode": {
        "type": "string",
        "minLength": 1
      },
      "city": {
        "type": "string",
        "minLength": 1
      },
      "country": {
        "type": "string",
        "minLength": 1
      },
      "description": {
        "type": "string",
        "minLength": 1
      },
      "phone": {
        "type": "string",
        "nullable": true
      },
      "email": {
        "type": "string",
        "nullable": true
      },
      "fax": {
        "type": "string",
        "nullable": true
      },
      "website": {
        "type": "string",
        "nullable": true
      },
      "addressLine2": {
        "type": "string",
        "nullable": true
      },
      "standardForDocumentType": {
        "type": "string",
        "enum": [
          "Quotation",
          "Invoice",
          "DeliveryNote",
          "Warning",
          "Reminder",
          "Cancellation",
          "CreditNote",
          "Confirmation",
          "IncomingInvoice",
          "Undefined",
          "Order",
          "PriceInquiry",
          "Letter",
          "Minute",
          "AdvancedInvoice",
          "PlannedRevenueStandard",
          "PlannedRevenueTimeAndMaterial",
          "PlannedCost",
          "FinalInvoice"
        ]
      }
    }
  },
  "ContactPersonPut": {
    "type": "object",
    "properties": {
      "firstName": {
        "type": "string",
        "nullable": true
      },
      "lastName": {
        "type": "string",
        "nullable": true
      },
      "position": {
        "type": "string",
        "nullable": true
      },
      "phoneLandline": {
        "type": "string",
        "nullable": true
      },
      "phoneMobile": {
        "type": "string",
        "nullable": true
      },
      "eMail": {
        "type": "string",
        "nullable": true
      },
      "salutation": {
        "type": "string",
        "nullable": true
      },
      "salutationForm": {
        "type": "string",
        "enum": [
          "Formal",
          "Informal",
          "Neutral"
        ]
      },
      "language": {
        "type": "string",
        "nullable": true
      },
      "birthdate": {
        "type": "string",
        "nullable": true
      },
      "note": {
        "type": "string",
        "nullable": true
      },
      "defaultAddress": {
        "type": "object",
        "required": [
          "city",
          "country",
          "description",
          "street",
          "zipCode"
        ],
        "properties": {
          "alternativeCompanyName": {
            "type": "string",
            "nullable": true
          },
          "additionalInformation": {
            "type": "string",
            "nullable": true
          },
          "street": {
            "type": "string",
            "minLength": 1
          },
          "houseNumber": {
            "type": "string",
            "nullable": true
          },
          "zipCode": {
            "type": "string",
            "minLength": 1
          },
          "city": {
            "type": "string",
            "minLength": 1
          },
          "country": {
            "type": "string",
            "minLength": 1
          },
          "description": {
            "type": "string",
            "minLength": 1
          },
          "phone": {
            "type": "string",
            "nullable": true
          },
          "email": {
            "type": "string",
            "nullable": true
          },
          "fax": {
            "type": "string",
            "nullable": true
          },
          "website": {
            "type": "string",
            "nullable": true
          },
          "addressLine2": {
            "type": "string",
            "nullable": true
          },
          "standardForDocumentType": {
            "type": "string",
            "enum": [
              "Quotation",
              "Invoice",
              "DeliveryNote",
              "Warning",
              "Reminder",
              "Cancellation",
              "CreditNote",
              "Confirmation",
              "IncomingInvoice",
              "Undefined",
              "Order",
              "PriceInquiry",
              "Letter",
              "Minute",
              "AdvancedInvoice",
              "PlannedRevenueStandard",
              "PlannedRevenueTimeAndMaterial",
              "PlannedCost",
              "FinalInvoice"
            ]
          }
        }
      },
      "customFields": {
        "type": "array",
        "nullable": true,
        "items": {
          "type": "object",
          "required": [
            "name",
            "type"
          ],
          "properties": {
            "name": {
              "type": "string",
              "minLength": 1
            },
            "type": {
              "type": "string",
              "enum": [
                "Text",
                "TextMultiline",
                "Date",
                "Dropdown",
                "DropdownCheckbox",
                "Boolean",
                "Upload",
                "UserSelection",
                "CompanySelection",
                "ProjectSelection",
                "ResourceSelection",
                "ContactSelection",
                "Link",
                "Float",
                "Integer",
                "Token",
                "NumericText"
              ]
            },
            "value": {
              "nullable": true
            }
          }
        }
      }
    }
  },
  "CompanyTypeToCompaniesPutWithoutNumberSchema": {
    "type": "object",
    "required": [
      "companyTypeId"
    ],
    "properties": {
      "number": {
        "type": "string",
        "nullable": true
      },
      "companyTypeId": {
        "type": "integer",
        "format": "int32"
      }
    }
  }
};

/** Production customer edits. Only documented HQ fields; no project/document writes. */
function salesCustomerIds_(raw,catalog){
  const responsibleUserIds=raw.responsibleUserIds||(raw.responsibleUsers||[]).map(u=>salesId_(u.userId||u.id));
  const subsystemIds=raw.subsystemIds||(raw.subsystems||[]).map(s=>{if(s.id)return salesId_(s.id);const rows=(catalog.subsystems||[]).filter(x=>x.name===s.name);if(rows.length!==1)throw Error('HQ-Unternehmensbereich ist nicht eindeutig zugeordnet. Bitte Auswahllisten aktualisieren.');return salesId_(rows[0].id);});
  return {responsibleUserIds,subsystemIds};
}
function salesCustomerValues_(raw,catalog){
  const ids=salesCustomerIds_(raw,catalog),address=raw.defaultAddress||{},fields=raw.customFields||[],date=fields.find(f=>salesCompanyCustomKey_(f.name)==='erstelldatum'),origin=fields.find(f=>salesCompanyCustomKey_(f.name)==='kundenherkunft'),reason=fields.find(f=>salesCompanyCustomKey_(f.name)==='grund der adressanlage');
  const origins=Array.isArray(origin?.value)?origin.value:origin?.value?[String(origin.value)]:[];
  return {name:raw.name||'',companyTypeId:String(raw.companyTypes?.length?salesCompanyTypeId_(raw.companyTypes[0]):''),industrialSector:raw.industrialSector||'',subsystemId:String(ids.subsystemIds[0]||''),responsibleUserId:String(ids.responsibleUserIds[0]||''),homepage:raw.homepage||address.website||'',description:raw.description||'',...Object.fromEntries(['street','houseNumber','zipCode','city','country'].map(k=>[k,address[k]||''])),erstelldatum:String(date?.value||'').slice(0,10),Kundenherkunft:JSON.stringify(origins),addressCreationReason:Array.isArray(reason?.value)?reason.value.join('\n'):String(reason?.value||'')};
}
function salesCustomerSource_(companyId){
  if(String(companyId).startsWith('draft_')){const d=salesBusinessDraft_({companyId,entity:'company',targetId:companyId});if((d.draft.pendingChanges||[]).length)throw Error('Für diesen Kunden sind Änderungen vorgemerkt. Bitte zuerst den offenen HQ-Abgleich klären.');return {...d,raw:d.draft.company};}
  const id=salesId_(companyId),data=salesBusinessKnown_(id);if((data.pendingChanges||[]).some(p=>['company','types','address','assignments'].includes(p.entity)))throw Error('Für diesen Kunden sind Stammdatenänderungen offen. Bitte zuerst den HQ-Abgleich abschließen.');
  return {ref:String(id),data,raw:data.company,hqId:id};
}
function salesCustomerEditor_(input){
  const catalog=salesCustomerCatalog_(false),source=salesCustomerSource_(input.companyId);
  return {entity:'customer',companyId:source.ref,targetId:source.ref,companyName:source.raw.name,local:!!source.draft,deferred:source.deferred===true,revision:source.draft?.revision||0,base:salesCustomerValues_(source.raw,catalog),catalog};
}
function salesCustomerValidate_(value,base,catalog){
  const allowed=SALES_CUSTOMER_FORM_KEYS;
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k)))throw Error('Unbekannte Kundenfelder.');
  const limits={name:150,industrialSector:150,description:20000,street:150,houseNumber:30,zipCode:20,city:100,country:2,erstelldatum:10},out={};for(const k of Object.keys(limits))out[k]=salesText_(value[k],limits[k],['name','street','zipCode','city','country'].includes(k));
  out.homepage=salesWebsiteInput_(value.homepage);out.country=out.country.toUpperCase();if(!/^[A-Z]{2}$/.test(out.country))throw Error('Land bitte als zweistelliges ISO-Kürzel eingeben.');
  for(const [key,list] of [['companyTypeId','types'],['subsystemId','subsystems'],['responsibleUserId','users']]){out[key]=String(salesId_(value[key]));if(!(catalog[list]||[]).some(x=>String(x.id)===out[key])&&out[key]!==String(base[key]||''))throw Error('Bitte eine gültige HQ-Auswahl treffen: '+key);}
  const industry=(catalog.industries||[]).find(x=>x.toLocaleLowerCase('de')===out.industrialSector.toLocaleLowerCase('de'));
  if(out.industrialSector&&!industry&&out.industrialSector!==base.industrialSector&&value.newIndustry!==true&&value.newIndustry!=='true')throw Error('Neue Branche bitte über „Neue Branche anlegen“ hinzufügen.');out.industrialSector=industry||out.industrialSector;
  // Hidden creation default must never overwrite an existing customer's origin.
  out.Kundenherkunft=base.Kundenherkunft||'[]';
  out.addressCreationReason=salesCompanyReason_(value.addressCreationReason===undefined?base.addressCreationReason:value.addressCreationReason,base.addressCreationReason,catalog);
  if(out.erstelldatum)salesCompanyCustomInput_(out.erstelldatum,{name:'Erstelldatum',type:'Date'});return out;
}
function salesCustomerParts_(raw,values,base,catalog){
  const current=salesCustomerValues_(raw,catalog),parts=[],company={},address={};
  for(const k of Object.keys(values))if(String(values[k])!==String(base[k]??'')&&String(current[k])!==String(base[k]??'')&&String(current[k])!==String(values[k]))throw Error('Das Kundenfeld wurde inzwischen geändert: '+k+'. Bitte neu laden und vergleichen.');
  for(const k of ['name','industrialSector','homepage','description'])if(values[k]!==String(base[k]??''))company[k]=values[k]||null;
  if(values.erstelldatum!==String(base.erstelldatum||'')||values.addressCreationReason!==String(base.addressCreationReason||'')){
    const fields=JSON.parse(JSON.stringify(raw.customFields||[]));for(const [key,name] of [['erstelldatum','Erstelldatum'],['addressCreationReason','Grund der Adressanlage']]){
      if(String(values[key])===String(base[key]||''))continue;
      const def=(catalog.fields||[]).find(f=>salesCompanyCustomKey_(f.name)===salesCompanyCustomKey_(name));if(!def)throw Error('HQ-Felddefinition fehlt: '+name);
      const next={name:def.name,type:def.type,value:values[key]?salesCompanyCustomInput_(values[key],def):null};
      const index=fields.findIndex(f=>f.name===def.name);if(index<0)fields.push(next);else fields[index]=next;
    }company.customFields=fields;
  }
  if(Object.keys(company).length)parts.push({entity:'company',change:company,base:salesPick_(raw,Object.keys(company))});
  for(const k of ['street','houseNumber','zipCode','city','country'])if(values[k]!==String(base[k]||''))address[k]=values[k]||null;
  if(Object.keys(address).length)parts.push({entity:'address',change:address,base:salesPick_(raw.defaultAddress||{},Object.keys(address))});
  if(values.companyTypeId!==String(base.companyTypeId||'')){const types=salesCompanyTypes_(raw.companyTypes),id=Number(values.companyTypeId),next=[types.find(t=>t.companyTypeId===id)||{companyTypeId:id},...types.slice(1).filter(t=>t.companyTypeId!==id)];parts.push({entity:'types',change:{companyTypes:next},base:{companyTypes:types}});}
  const ids=salesCustomerIds_(raw,catalog),assignments={};for(const [field,key] of [['responsibleUserId','responsibleUserIds'],['subsystemId','subsystemIds']])if(values[field]!==String(base[field]||''))assignments[key]=[Number(values[field])];
  if(Object.keys(assignments).length)parts.push({entity:'assignments',change:assignments,base:salesPick_(ids,Object.keys(assignments))});return parts;
}
function salesCustomerSave_(input,user){
  const request=salesKey_(input.requestId),ref=String(input.companyId),reason=salesReviewReason_(input.changeReason),signature=JSON.stringify(salesBusinessCanonical_({ref,base:input.base,values:input.change,revision:input.revision,reason})),headId=salesKey_('form_'+request),prior=salesRead_('sales_jobs/'+headId);
  if(prior){if(prior.formSignature!==signature||prior.actor!==user.email||prior.formCompanyRef!==ref)throw Error('Speicherkennung gehört zu einer anderen Eingabe.');const jobs=prior.formJobIds.map(id=>salesRead_('sales_jobs/'+id));if(prior.draftDependency){const draft=salesRead_('sales_drafts/'+prior.draftDependency),job=salesRead_('sales_jobs/'+prior.draftDependency),r=salesBusinessDraftResult_({draft,job,ref,deferred:true},'customer');return {...r,id:prior.id,patch:{...r.patch,jobs:jobs.map(salesJobSummary_)}};}return {id:prior.id,message:'Kundenänderung bereits gespeichert.',entityPatches:prior.formPatches,patch:{jobs:jobs.map(salesJobSummary_)}};}
  const source=salesCustomerSource_(ref),catalog=salesRead_('sales_meta/catalog');if(!catalog)throw Error('HQ-Auswahllisten fehlen.');
  if(source.draft?.lastCustomerForm?.request===request){if(source.draft.lastCustomerForm.signature!==signature||source.draft.lastCustomerForm.actor!==user.email)throw Error('Speicherkennung gehört zu einer anderen Eingabe.');return salesBusinessDraftResult_(source,'customer');}
  if(source.draft&&input.revision!==(source.draft.revision||0))throw Error('Kundendaten wurden inzwischen geändert. Bitte neu laden.');
  const values=salesCustomerValidate_(input.change,salesCustomerValues_(source.raw,catalog),catalog),parts=salesCustomerParts_(source.raw,values,input.base||{},catalog);if(!parts.length)return {message:'Keine Änderungen eingegeben.'};
  const entries=[],industry=values.industrialSector;if(industry&&!(catalog.industries||[]).includes(industry)){catalog.industries=[...(catalog.industries||[]),industry].sort((a,b)=>a.localeCompare(b,'de'));entries.push({path:'sales_meta/catalog',value:catalog});}
  const typeNames=Object.fromEntries(catalog.types.map(x=>[x.id,x.name])),jobs=[],patches=[];
  if(source.draft&&!source.deferred){
    for(const p of parts){if(p.entity==='address')Object.assign(source.draft.company.defaultAddress,p.change);else Object.assign(source.draft.company,p.change);source.job.editedFields=source.job.editedFields||{};source.job.editedFields[p.entity]=Array.from(new Set([...(source.job.editedFields[p.entity]||[]),...Object.keys(p.change)]));}
    source.draft.kind=typeNames[source.draft.company.companyTypes[0].companyTypeId];source.draft.revision=(source.draft.revision||0)+1;source.draft.lastCustomerForm={request,signature,actor:user.email,reason};source.job.name=source.draft.company.name;source.job.updatedAt=salesNow_();
    if(user.uid){const authors=source.job.editAuthors||[],author=authors.find(a=>a.uid===user.uid)||{uid:user.uid,email:user.email,permissions:[],financial:false};if(!author.permissions.includes('company.edit'))author.permissions.push('company.edit');if(!authors.includes(author))authors.push(author);if(authors.length>25)throw Error('Zu viele Bearbeiter vor dem ersten HQ-Abgleich.');source.job.editAuthors=authors;}
    entries.push({path:'sales_drafts/'+source.draft.id,value:source.draft},{path:'sales_jobs/'+source.job.id,value:source.job});
  }else{
    for(const [index,p] of parts.entries()){
      const id=index?headId+'_'+p.entity:headId,targetId=source.draft?ref+(p.entity==='company'||p.entity==='types'||p.entity==='assignments'?'':'_address'):p.entity==='address'?source.raw.defaultAddress?.id:source.hqId;
      if(!source.draft&&!targetId)throw Error('Keine bestätigte HQ-Standardadresse für diese Änderung vorhanden.');
      const job={id,kind:'entityChange',business:1,formGroup:headId,formOrder:index,...(index?{formPrevious:jobs[index-1].id}:{}),...(source.draft?{draftDependency:source.draft.id,companyRef:ref,targetRef:targetId}:{hqId:source.hqId,targetId}),entity:p.entity,change:p.change,base:p.base,name:values.name,state:'pending',actor:user.email,...(user.uid?{actorUid:user.uid}:{}),createdAt:salesNow_(),updatedAt:salesNow_(),message:source.deferred?'Änderung wartet auf Abschluss der ursprünglichen HQ-Anlage.':'Kundenänderung gespeichert; HQ-Abgleich offen.'};
      salesReviewInit_(job,reason);jobs.push(job);const labels=p.entity==='assignments'?{userNames:catalog.users.filter(u=>p.change.responsibleUserIds?.includes(Number(u.id))),subsystemNames:catalog.subsystems.filter(s=>p.change.subsystemIds?.includes(Number(s.id)))}:{},pending={jobId:id,entity:p.entity,targetId,change:p.change,base:p.base,typeNames,...labels};
      if(source.draft)source.draft.pendingChanges=[...(source.draft.pendingChanges||[]),pending];else source.data.pendingChanges=[...(source.data.pendingChanges||[]),pending];
      if(!job.review)patches.push({companyId:source.hqId||ref,entity:p.entity,targetId,change:p.change,typeNames,...labels});
    }
    jobs[0].formSignature=signature;jobs[0].formCompanyRef=ref;jobs[0].formJobIds=jobs.map(j=>j.id);jobs[0].formPatches=patches;jobs.forEach(job=>entries.push({path:'sales_jobs/'+job.id,value:job}));
    if(source.draft){source.draft.revision=(source.draft.revision||0)+1;entries.push({path:'sales_drafts/'+source.draft.id,value:source.draft});}
    else {entries.push({path:'sales_companies/'+source.hqId,value:source.data});const directory=salesRead_('sales_directory/'+source.hqId);if(directory){const visible=salesBusinessView_(source.data);entries.push({path:'sales_directory/'+source.hqId,value:{...directory,company:salesCompany_(visible.company),contacts:visible.contacts}});}}
  }
  const names=salesRead_('sales_meta/lean_names');if(names&&values.name!==input.base?.name&&(source.draft&&!source.deferred||patches.some(p=>p.change.name!==undefined)))entries.push({path:'sales_meta/lean_names',value:{...names,rows:names.rows.map(c=>String(c.id)===ref||String(c.hqId||c.id)===String(source.hqId)?{...c,name:values.name}:c)}});
  salesBulkRest_('commit',{writes:entries.map(e=>({update:{name:salesBulkName_(e.path),fields:{payload:{stringValue:salesBulkPayload_(e.path,e.value)}}}}))});
  const reviewMessage=jobs.some(j=>j.review)?'Änderungsantrag gespeichert. Vorhandene Werte brauchen eine Admin-Freigabe.':'';
  if(source.draft){const r=salesBusinessDraftResult_(source,'customer');return {...r,...(jobs.length?{id:jobs[0].id,message:reviewMessage||r.message}:{}),catalog,patch:{...r.patch,...(jobs.length?{jobs:jobs.map(salesJobSummary_)}:{})}};}
  return {id:jobs[0].id,message:reviewMessage||'Kundendaten gespeichert; Übertragung beim HQ-Abgleich.',catalog,entityPatches:patches,patch:{jobs:jobs.map(salesJobSummary_)}};
}
function salesBusinessCanonical_(value){
  if(Array.isArray(value)){
    const rows=value.map(salesBusinessCanonical_);
    if(rows.length&&rows.every(v=>typeof v==='number'))rows.sort((a,b)=>a-b);
    if(rows.length&&rows.every(v=>v&&typeof v==='object'&&!Array.isArray(v)&&v.companyTypeId!==undefined))rows.sort((a,b)=>Number(a.companyTypeId)-Number(b.companyTypeId));
    else if(rows.length&&rows.every(v=>v&&typeof v==='object'&&!Array.isArray(v)&&v.name!==undefined))rows.sort((a,b)=>String(a.name).localeCompare(String(b.name)));
    return rows;
  }
  if(value&&typeof value==='object'){const out=Object.create(null);Object.keys(value).sort().forEach(k=>{out[k]=salesBusinessCanonical_(value[k]);});if(value.type==='Date'&&typeof value.value==='string')out.value=value.value.slice(0,10);if(value.type==='DropdownCheckbox'&&Array.isArray(value.value)&&value.value.every(v=>typeof v==='string'))out.value=[...value.value].sort();return out;}return value;
}
function salesBusinessEqual_(actual,expected){
  return Object.keys(expected).every(k=>expected[k]&&typeof expected[k]==='object'?JSON.stringify(salesBusinessCanonical_(actual[k]))===JSON.stringify(salesBusinessCanonical_(expected[k])):String(actual[k]??'')===String(expected[k]??''));
}
function salesReviewReason_(value){
  if(typeof value!=='string'||!value.trim())throw Error('Bitte einen Änderungsgrund angeben.');
  return salesText_(value,1000,true);
}
function salesReviewFilled_(value){
  if(Array.isArray(value))return value.some(salesReviewFilled_);
  if(value&&typeof value==='object')return Object.values(value).some(salesReviewFilled_);
  return value!==null&&value!==undefined&&(typeof value!=='string'||!!value.trim());
}
function salesReviewOverwrite_(base,change){
  return Object.keys(change).some(key=>{
    const old=base?.[key],next=change[key];
    if(salesBusinessEqual_({value:old},{value:next}))return false;
    if(key==='customFields'&&Array.isArray(old)&&Array.isArray(next))return old.some(field=>{
      const updated=next.find(v=>v.name===field.name);
      return salesReviewFilled_(field.value)&&(!updated||!salesBusinessEqual_(field,{value:updated.value,type:updated.type}));
    });
    if(key==='defaultAddress'&&old&&next)return salesReviewOverwrite_(old,next);
    return salesReviewFilled_(old);
  });
}
function salesReviewInit_(job,reason){
  job.changeReason=reason;
  if(salesReviewOverwrite_(job.base,job.change))salesReviewHold_(job);
  return job;
}
function salesReviewHold_(job){
  job.review={status:'waiting',revision:1,conversation:[]};
  job.state='awaitingApproval';
  job.message='Eine Änderung vorhandener Werte wartet auf die Freigabe durch den Admin.';
}
function salesReviewWaiting_(job){return ['awaitingApproval','awaitingAnswer'].includes(job?.state);}
function salesReviewAllowed_(job,base,change){
  if(job.changeReason&&(!salesReviewOverwrite_(base,change)||job.review?.status==='approved'))return true;
  salesReviewHold_(job);return false;
}
function salesReviewOverlay_(pending,current){
  return !!pending.base&&!salesReviewOverwrite_(pending.base,pending.change)&&
    Object.keys(pending.change).every(k=>salesBusinessEqual_(current,{[k]:pending.base[k]})||salesBusinessEqual_(current,{[k]:pending.change[k]}));
}

function salesReviewOwn_(job,user){return job.actorUid?job.actorUid===user.uid:job.actor===user.email;}
function listSalesChangeReviews(){
  const user=salesUser_();
  return salesList_('sales_jobs').filter(j=>j.review&&salesReviewOwn_(j,user))
    .map(j=>salesPick_(j,['id','name','state','changeReason','review','message','updatedAt']))
    .sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
function respondSalesChangeReview(input){
  const user=salesUser_();
  return salesLock_(()=>{
    salesAssertPrivate_();const id=salesKey_(input?.id),job=salesRead_('sales_jobs/'+id);
    const decision=input?.decision,author=decision==='answer';
    if(author){
      if(!job||!salesReviewOwn_(job,user)||job.state!=='awaitingAnswer')throw Error('Nur der ursprüngliche Mitarbeiter kann diese Rückfrage beantworten.');
    }else if(!user.admin||!['approve','keep','ask'].includes(decision))throw Error('Nur der Admin kann über diese Änderung entscheiden.');
    if(!job||!salesReviewWaiting_(job)||!job.review||input.revision!==job.review.revision)throw Error('Änderungsantrag inzwischen aktualisiert. Bitte neu laden.');
    if(['approve','ask'].includes(decision)&&job.state!=='awaitingApproval')throw Error('Bitte zuerst die Antwort auf die Rückfrage abwarten.');
    const review=job.review;
    const note=['ask','answer'].includes(decision)?salesReviewReason_(input.note):'';
    if(review.conversation.length>=20&&note)throw Error('Zu viele Rückfragen zu diesem Auftrag. Bitte die Änderung abschließend prüfen.');
    if(note)review.conversation.push({kind:decision,text:note,at:salesNow_()});
    review.revision++;job.updatedAt=salesNow_();
    if(decision==='approve'){
      if(!job.changeReason)job.changeReason=salesReviewReason_(input.note);
      review.status='approved';review.decidedBy=user.email;review.decidedAt=job.updatedAt;
      job.state='pending';job.message='Vom Admin freigegeben. Übertragung beim nächsten HQ-Abgleich.';
    }else if(decision==='keep'){
      review.status='kept';review.decidedBy=user.email;review.decidedAt=job.updatedAt;
      job.state='canceled';job.message='Admin hat entschieden: bestehenden Wert behalten.';
    }else if(decision==='ask'){
      review.status='question';job.state='awaitingAnswer';job.message='Der Admin wartet auf eine Antwort des Mitarbeiters.';
    }else{
      review.status='waiting';job.state='awaitingApproval';job.message='Antwort gespeichert. Der Admin prüft den Änderungsantrag.';
    }
    const entries=[{path:'sales_jobs/'+id,value:job}];
    if(decision==='keep'){
      const ref=job.draftDependency,hqId=job.hqId;
      const path=ref?'sales_drafts/'+salesKey_(ref):hqId?'sales_companies/'+salesId_(hqId):null;
      const data=path?salesRead_(path):null;
      if(data?.pendingChanges?.some(p=>p.jobId===id)){
        data.pendingChanges=data.pendingChanges.filter(p=>p.jobId!==id);
        if(ref)data.revision=(data.revision||0)+1;
        entries.push({path,value:data});
      }
    }
    salesBulkRest_('commit',{writes:entries.map(e=>({update:{name:salesBulkName_(e.path),fields:{payload:{stringValue:salesBulkPayload_(e.path,e.value)}}}}))});
    return {message:job.message,...(!author?{patch:{job:salesJobSummary_(job)}}:{})};
  });
}
function salesBusinessCustomMatches_(actual,expected){return (expected||[]).every(f=>(actual||[]).some(a=>a.name===f.name&&a.type===f.type&&JSON.stringify(salesBusinessCanonical_({type:a.type,value:a.value??null}))===JSON.stringify(salesBusinessCanonical_({type:f.type,value:f.value??null}))));}
function saveSalesCompany(input){return saveSalesTestCompany(input);}
function bindSalesCompanyResult(id,hqId){
  salesUser_(true);return salesLock_(()=>{
    salesAssertPrivate_();const job=salesJobRecoverInterrupted_(salesRead_('sales_jobs/'+salesKey_(id)));
    if(job?.kind!=='createCompany'||job.markerMode!=='none'||job.state!=='uncertain'||job.hqId||!job.writeAttempted)throw new Error('Keine offene Firmenzuordnung.');
    const draft=salesRead_('sales_drafts/'+job.draftId),actual=salesOne_('Companies',salesId_(hqId));
    if(!draft?.company||!salesBusinessEqual_(actual,salesPick_(draft.company,['name','description','industrialSector']))||!salesHomepageConfirmed_(actual,draft.company.homepage)||!salesBusinessEqual_(actual.defaultAddress||{},salesPick_(draft.company.defaultAddress,['street','houseNumber','zipCode','city','country','website'])))throw new Error('Die ausgewählte HQ-Firma stimmt nicht vollständig mit der gespeicherten Anlage überein. Auftrag bleibt gesperrt.');
    if(!(actual.companyTypes||[]).some(t=>salesCompanyTypeId_(t)===Number(draft.company.companyTypes?.[0]?.companyTypeId))||!(actual.responsibleUsers||[]).some(u=>Number(u.userId||u.id)===Number(draft.company.responsibleUserIds?.[0]))||!salesSubsystemConfirmed_(actual,draft.company.subsystemIds?.[0])||!salesBusinessCustomMatches_(actual.customFields,draft.company.customFields))throw new Error('Firmenart, Verantwortlicher, Unternehmensbereich oder eigene HQ-Felder stimmen nicht überein.');
    if(salesCollect_('ContactPersons','companyId eq '+actual.id,Date.now()).length)throw new Error('Die ausgewählte Firma besitzt bereits Ansprechpartner. Bitte die vorhandene HQ-Anlage gesondert prüfen; keine neue Kontaktanlage freigegeben.');
    job.hqId=salesId_(actual.id);draft.hqId=job.hqId;job.state='ready';job.updatedAt=salesNow_();job.message='Manuell ausgewählte HQ-Firma nur lesend zugeordnet. Fortsetzung prüft die vorhandene Anlage; kein erneuter Firmen-POST.';
    salesWrite_('sales_drafts/'+draft.id,draft);salesWrite_('sales_jobs/'+job.id,job);return {id:job.id,message:job.message};
  });
}
function salesBusinessSchema_(entity){
  if(entity==='assignments')return {type:'object',properties:{responsibleUserIds:{type:'array',items:{type:'integer'}},subsystemIds:{type:'array',items:{type:'integer'}}}};
  if(entity==='types')return {type:'object',required:['companyTypes'],properties:{companyTypes:{type:'array',items:SALES_HQ_FIELDS.CompanyTypeToCompaniesPutWithoutNumberSchema}}};
  const names={company:'CompanyPut',address:'CompanyAddressBase',contact:'ContactPersonPut'};
  if(!names[entity])throw new Error('Unbekannte Stammdatenart.');
  return SALES_HQ_FIELDS[names[entity]];
}
function salesBusinessValidate_(value,schema,path){
  if(value===null){if(!schema.nullable)throw new Error('Feld darf nicht leer sein: '+path);return;}
  if(schema.enum&&!schema.enum.includes(value))throw new Error('Ungültige Auswahl: '+path);
  if(schema.type==='object'){
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Ungültige Felder: '+path);
    for(const k of Object.keys(value)){if(!Object.prototype.hasOwnProperty.call(schema.properties,k))throw new Error('Nicht schreibbares Feld: '+path+'.'+k);salesBusinessValidate_(value[k],schema.properties[k],path+'.'+k);}
    for(const k of schema.required||[])if(value[k]===undefined||!schema.properties[k].nullable&&(value[k]===null||value[k]===''))throw new Error('Pflichtfeld fehlt: '+path+'.'+k);
  }else if(schema.type==='array'){
    if(!Array.isArray(value)||value.length>500)throw new Error('Ungültige Liste: '+path);
    value.forEach(v=>salesBusinessValidate_(v,schema.items,path));
  }else if(schema.type==='string'){
    if(typeof value!=='string'||value.length>20000||value.length<(schema.minLength||0))throw new Error('Ungültiger Text: '+path);
  }else if(schema.type==='integer'&&(!Number.isInteger(value)||value<-2147483648||value>2147483647))throw new Error('Ungültige Ganzzahl: '+path);
  else if(schema.type==='number'&&(typeof value!=='number'||!Number.isFinite(value)))throw new Error('Ungültige Zahl: '+path);
  else if(schema.type==='boolean'&&typeof value!=='boolean')throw new Error('Ungültige Auswahl: '+path);
}
function salesBusinessPick_(raw,schema){
  const out={};for(const k of Object.keys(schema.properties||{}))if(raw[k]!==undefined){const s=schema.properties[k];out[k]=s.type==='object'&&raw[k]!==null?salesBusinessPick_(raw[k],s):s.type==='array'&&s.items.type==='object'&&Array.isArray(raw[k])?raw[k].map(v=>salesBusinessPick_(v,s.items)):raw[k];}return out;
}
function salesBusinessKnown_(id){
  id=String(salesId_(id));const data=salesRead_('sales_companies/'+id);
  if(!data?.company||String(data.company.id)!==id)throw new Error('Kundendetails zuerst über den HQ-Sync importieren.');return data;
}
function salesBusinessCachedTarget_(data,entity,targetId){
  if(['company','types'].includes(entity)){if(Number(data.company.id)!==targetId)throw Error('Abweichendes Firmenziel.');return entity==='types'?{...data.company,companyTypes:salesCompanyTypes_(data.company.companyTypes)}:data.company;}
  const rows=entity==='contact'?data.contacts||[]:entity==='address'?[data.company.defaultAddress,...data.company.addresses||[]]:[];
  const row=rows.find(x=>Number(x?.id)===targetId);if(!row)throw Error('Stammdatenziel gehört nicht zum geladenen Kunden.');return row;
}
function salesBusinessTarget_(hqId,entity,targetId){
  hqId=salesId_(hqId);targetId=salesId_(targetId);
  if(entity==='assignments'){
    if(targetId!==hqId)throw Error('Abweichendes Firmenziel.');const response=salesHqGet_('/v1/Companies('+hqId+')?$expand=ResponsibleUsers,Subsystems,DefaultAddress,Addresses,CompanyTypes,CustomFields,Files').data,raw=response?.data||response?.d||response;
    if(Number(raw?.Id)!==hqId||!Array.isArray(raw.ResponsibleUsers)||!Array.isArray(raw.Subsystems)||['Name','IndustrialSector','Description','IBAN','BIC','DebitorNumber','CreditorNumber','TaxId','DefaultDeliveryConditionId','DefaultPaymentConditionId','DefaultAddress','Addresses','CompanyTypes','CustomFields','Files'].some(k=>!Object.prototype.hasOwnProperty.call(raw,k)))throw Error('HQ-Zuordnungen und zu erhaltende Firmenwerte wurden nicht vollständig gelesen.');
    return {responsibleUserIds:raw.ResponsibleUsers.map(x=>salesId_(x.Id)),subsystemIds:raw.Subsystems.map(x=>salesId_(x.Id)),legacy:raw};
  }
  if(entity==='company'||entity==='types'){if(targetId!==hqId)throw new Error('Abweichendes Firmenziel.');const raw=salesOne_('Companies',hqId);return entity==='types'?{...raw,companyTypes:salesCompanyTypes_(raw.companyTypes)}:raw;}
  if(entity==='contact'){const c=salesHqGet_('/v2/ContactPersons/'+targetId+'?expand=DefaultAddress,CustomFields').data;if(Number(c?.id)!==targetId||Number(c.companyId)!==hqId)throw new Error('Ansprechpartner gehört nicht zur Firma.');return {...c,eMail:salesContactEmail_(c)};}
  if(entity==='address'){
    const result=salesHqGet_('/v2/Companies/'+hqId+'/Addresses').data,rows=Array.isArray(result)?result:result?.data||result?.value;
    if(!Array.isArray(rows))throw new Error('Firmenadressen unvollständig.');const matches=rows.filter(a=>Number(a.id)===targetId);
    if(matches.length!==1)throw new Error('Adresse gehört nicht eindeutig zur Firma.');return matches[0];
  }throw new Error('Unbekannte Stammdatenart.');
}
function getSalesEditor(input){
  salesUser_();salesAssertPrivate_();
  if(input.entity==='catalog')return {catalog:salesCustomerCatalog_(input.force===true)};
  if(input.entity==='customer')return salesCustomerEditor_(input);
  if(String(input.companyId).startsWith('draft_'))return salesBusinessDraftEditor_(input);
  const id=salesId_(input.companyId),schema=salesBusinessSchema_(input.entity),data=salesBusinessKnown_(id);
  const pending=(data.pendingChanges||[]).filter(p=>p.entity===input.entity&&Number(p.targetId)===Number(input.targetId));
  if(pending.length)throw new Error('Für diese Stammdaten ist bereits eine Änderung offen. Bitte zuerst den HQ-Sync abschließen oder den Konflikt in der Auftragsübersicht klären.');
  const raw=salesBusinessCachedTarget_(data,input.entity,salesId_(input.targetId));
  const catalog=['types','company'].includes(input.entity)?salesRead_('sales_meta/catalog'):null;
  return {companyId:id,companyName:data.company.name,entity:input.entity,targetId:salesId_(input.targetId),schema,base:salesBusinessPick_(raw,schema),types:catalog?.types||[],customFieldDefinitions:input.entity==='company'?catalog?.fields||[]:[]};
}
/** Unsent intent changes in place; after an HQ attempt, edits are separate dependent jobs. */
function salesBusinessDraft_(input){
  const ref=String(input.companyId),id=salesKey_(ref.slice(6)),draft=salesRead_('sales_drafts/'+id),job=salesRead_('sales_jobs/'+id);
  if(ref!=='draft_'+id||!draft?.company||draft.id!==id||job?.kind!=='createCompany'||job.draftId!==id)throw Error('Kundenentwurf fehlt.');
  if(['synced','canceled'].includes(job.state))throw Error('Der Anlagezustand hat sich geändert. Bitte den Kunden neu laden.');
  const deferred=!!(draft.hqId||job.hqId||!['pending','ready'].includes(job.state)||job.writeAttempted||job.contactAttempted||job.phaseWriteAttempted);
  const entity=input.entity,schema=salesBusinessSchema_(entity),target=['company','types'].includes(entity)?ref:ref+'_'+entity;
  if(String(input.targetId)!==target)throw Error('Stammdatenziel gehört nicht zum Kundenentwurf.');
  const raw=entity==='address'?draft.company.defaultAddress:entity==='contact'?{...draft.contact,defaultAddress:draft.contact.defaultAddress||{...salesContactAddressFields_(draft.company.defaultAddress),email:draft.contact.eMail||null}}:entity==='types'?{companyTypes:draft.company.companyTypes}:draft.company;
  return {ref,draft,job,schema,raw,deferred};
}
function salesBusinessDraftEditor_(input){
  const d=salesBusinessDraft_(input),catalog=salesRead_('sales_meta/catalog');
  if((d.draft.pendingChanges||[]).some(p=>p.entity===input.entity))throw Error('Für diese Stammdaten ist bereits eine Änderung vorgemerkt. Bitte zuerst den offenen HQ-Abgleich klären.');
  return {companyId:d.ref,companyName:d.draft.company.name,entity:input.entity,targetId:input.targetId,local:true,deferred:d.deferred,revision:d.draft.revision||0,schema:d.schema,base:salesBusinessPick_(d.raw,d.schema),types:catalog?.types||[],customFieldDefinitions:input.entity==='company'?catalog?.fields||[]:[]};
}
function salesBusinessVisibleDraft_(draft){
  const out=JSON.parse(JSON.stringify(draft));
  for(const p of draft.pendingChanges||[]){const current=p.entity==='contact'?draft.contact:p.entity==='address'?draft.company.defaultAddress:draft.company;if(!salesReviewOverlay_(p,current))continue;if(['company','types','assignments'].includes(p.entity))Object.assign(out.company,p.change);else if(p.entity==='address')Object.assign(out.company.defaultAddress,p.change);else if(p.entity==='contact')Object.assign(out.contact,p.change);}
  return out;
}
function salesBusinessTypes_(change,catalog){
  const names=Object.fromEntries((catalog?.types||[]).map(t=>[t.id,t.name]));
  if(!change.companyTypes?.length||new Set(change.companyTypes.map(t=>t.companyTypeId)).size!==change.companyTypes.length||change.companyTypes.some(t=>!Object.prototype.hasOwnProperty.call(names,t.companyTypeId)))throw Error('Bitte mindestens eine bekannte HQ-Firmenart auswählen.');
  return names;
}
function salesBusinessCustom_(change,base,definitions){
  if(!change.customFields)return;
  const names=new Set();
  for(const f of change.customFields){
    if(names.has(f.name))throw Error('HQ-Feld doppelt: '+f.name);names.add(f.name);
    const old=(base.customFields||[]).find(x=>x.name===f.name),def=(definitions||[]).find(x=>x.name===f.name);
    if(!old&&(!def||def.type!==f.type)||old&&old.type!==f.type)throw Error('HQ-Feld oder Feldtyp ist nicht bestätigt: '+f.name);
    if(old&&salesBusinessEqual_(f,old))continue;
    const v=f.value;
    if(v===null||v===undefined)continue;
    if(f.type==='Date'&&(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)!==v.slice(0,10)))throw Error('Bitte ein gültiges Datum für „'+f.name+'“ eingeben.');
    if(f.type==='DropdownCheckbox'&&(!Array.isArray(v)||v.some(x=>typeof x!=='string'||!x.trim())))throw Error('Bitte einen Wert pro Zeile für „'+f.name+'“ eingeben.');
    if(f.type==='Boolean'?typeof v!=='boolean':f.type==='Integer'?!Number.isInteger(v):f.type==='Float'?typeof v!=='number'||!Number.isFinite(v):['Text','TextMultiline','Date','Dropdown','Link','NumericText'].includes(f.type)?typeof v!=='string':false)throw Error('Ungültiger Wert für HQ-Feld: '+f.name);
  }
}
function salesBusinessOriginPreserved_(change,base){
  if(!change.customFields)return;
  const origin=rows=>(rows||[]).filter(f=>salesCompanyCustomKey_(f.name)==='kundenherkunft');
  if(JSON.stringify(salesBusinessCanonical_(origin(change.customFields)))!==JSON.stringify(salesBusinessCanonical_(origin(base.customFields))))throw Error('Kundenherkunft bleibt beim Bearbeiten unverändert.');
}
function salesBusinessDraftResult_(d,entity){
  const catalog=salesRead_('sales_meta/catalog'),company=salesLocalCompany_(d.draft,catalog,d.job),visible=salesBusinessVisibleDraft_(d.draft);
  return {id:d.job.id,message:d.deferred?'Änderung in Firebase vorgemerkt. Übertragung erst nach Klärung und Abschluss der ursprünglichen HQ-Anlage.':'Kundendaten in Firebase gespeichert; werden bei der ersten HQ-Übertragung verwendet.',entityPatch:{companyId:d.ref,entity,localCompany:company,contact:{...visible.contact,id:d.job.contactId||d.ref+'_contact'}},patch:{draft:d.draft,...(!d.deferred?{job:salesJobSummary_(d.job)}:{}),localCompany:company}};
}
function salesBusinessSaveDraft_(input,user){
  const d=salesBusinessDraft_(input),{draft,job,schema}=d,change=input.change?JSON.parse(JSON.stringify(input.change)):null;
  const requestId=salesText_(input.requestId,80,true),reason=salesReviewReason_(input.changeReason);
  if(!/^[a-zA-Z0-9_-]{8,80}$/.test(requestId))throw Error('Ungültige Speicherkennung.');
  const signature=JSON.stringify(salesBusinessCanonical_({entity:input.entity,targetId:input.targetId,revision:input.revision,change,reason}));
  const deferredId=salesKey_('edit_'+requestId),prior=d.deferred?salesRead_('sales_jobs/'+deferredId):null;
  if(prior){if(prior.draftDependency!==draft.id||prior.actor!==user.email||prior.requestSignature!==signature)throw Error('Speicherkennung gehört zu einer anderen Eingabe.');const result=salesBusinessDraftResult_(d,input.entity);return {...result,id:prior.id,patch:{...result.patch,job:salesJobSummary_(prior)}};}
  if(job.lastEdit?.requestId===requestId){if(job.lastEdit.actor!==user.email||job.lastEdit.signature!==signature)throw Error('Speicherkennung gehört zu einer anderen Eingabe.');return salesBusinessDraftResult_(d,input.entity);}
  if(input.revision!==(draft.revision||0))throw Error('Kundendaten wurden inzwischen geändert. Bitte zur Firma zurückkehren und neu laden.');
  if((draft.pendingChanges||[]).some(p=>p.entity===input.entity))throw Error('Für diese Stammdaten ist bereits eine Änderung vorgemerkt. Bitte zuerst den offenen HQ-Abgleich klären.');
  if(!change||typeof change!=='object'||Array.isArray(change)||!Object.keys(change).length)throw Error('Keine Änderungen eingegeben.');
  if(input.entity==='contact'&&change.defaultAddress?.email!==undefined){if(change.eMail!==undefined&&change.eMail!==change.defaultAddress.email)throw Error('Die beiden Kontakt-E-Mail-Felder müssen übereinstimmen.');change.eMail=change.defaultAddress.email;}
  for(const k of Object.keys(change)){if(!Object.prototype.hasOwnProperty.call(schema.properties,k))throw Error('Nicht schreibbares Feld: '+k);salesBusinessValidate_(change[k],schema.properties[k],k);}
  const merged={...d.raw,...change},catalog=salesRead_('sales_meta/catalog');
  if(input.entity==='contact'&&!draft.contact.defaultAddress&&change.defaultAddress===undefined)delete merged.defaultAddress;
  if(input.entity==='contact'&&change.eMail!==undefined&&merged.defaultAddress)merged.defaultAddress={...merged.defaultAddress,email:change.eMail};
  salesBusinessValidate_(salesBusinessPick_(merged,schema),schema,input.entity);
  if(input.entity==='company'&&!String(merged.name||'').trim()||input.entity==='contact'&&(!String(merged.firstName||'').trim()||!String(merged.lastName||'').trim()))throw Error('Name bleibt ein Pflichtfeld.');
  if(input.entity==='address'&&!/^[A-Z]{2}$/.test(merged.country||''))throw Error('Land bitte als zweistelliges ISO-Kürzel eingeben.');
  if(input.entity==='company')salesBusinessOriginPreserved_(change,d.raw);
  salesBusinessCustom_(change,d.raw,input.entity==='company'?catalog?.fields:[]);
  if(d.deferred){
    const typeNames=input.entity==='types'?salesBusinessTypes_(merged,catalog):{},base=Object.fromEntries(Object.keys(change).map(k=>[k,d.raw[k]??null]));
    const edit={id:deferredId,kind:'entityChange',business:1,draftDependency:draft.id,companyRef:d.ref,targetRef:input.targetId,entity:input.entity,change,base,requestSignature:signature,name:draft.company.name,state:'pending',actor:user.email,...(user.uid?{actorUid:user.uid}:{}),createdAt:salesNow_(),updatedAt:salesNow_(),message:'Änderung wartet in Firebase auf Abschluss der ursprünglichen HQ-Anlage.'};
    salesReviewInit_(edit,reason);draft.pendingChanges=[...(draft.pendingChanges||[]),{jobId:edit.id,entity:input.entity,targetId:input.targetId,change,base,typeNames}];draft.revision=(draft.revision||0)+1;draft.updatedAt=salesNow_();
    const entries=[{path:'sales_drafts/'+draft.id,value:draft},{path:'sales_jobs/'+edit.id,value:edit}];
    if(!edit.review&&change.name!==undefined){const names=salesRead_('sales_meta/lean_names');if(names)entries.push({path:'sales_meta/lean_names',value:{...names,rows:names.rows.map(c=>c.id===d.ref?{...c,name:change.name}:c)}});}
    salesBulkRest_('commit',{writes:entries.map(e=>({update:{name:salesBulkName_(e.path),fields:{payload:{stringValue:salesBulkPayload_(e.path,e.value)}}}}))});
    const result=salesBusinessDraftResult_(d,input.entity);return {...result,id:edit.id,message:edit.message,patch:{...result.patch,job:salesJobSummary_(edit)}};
  }
  if(input.entity==='types'){const names=salesBusinessTypes_(merged,catalog);draft.company.companyTypes=merged.companyTypes;draft.kind=names[merged.companyTypes[0].companyTypeId];}
  else if(input.entity==='company')draft.company=merged;
  else if(input.entity==='address')draft.company.defaultAddress=merged;
  else draft.contact=merged;
  draft.revision=(draft.revision||0)+1;draft.updatedAt=salesNow_();job.name=draft.company.name;job.updatedAt=draft.updatedAt;
  job.editedFields=job.editedFields||{};job.editedFields[input.entity]=Array.from(new Set([...(job.editedFields[input.entity]||[]),...Object.keys(change)]));
  job.lastEdit={requestId,actor:user.email,signature,reason};
  if(user.uid){
    const authors=job.editAuthors||[],author=authors.find(a=>a.uid===user.uid)||{uid:user.uid,email:user.email,permissions:[],financial:false};
    const permission=input.entity==='contact'?'contact.edit':'company.edit';if(!author.permissions.includes(permission))author.permissions.push(permission);
    const financial=v=>v&&typeof v==='object'&&Object.entries(v).some(([k,x])=>salesAuthFinancialKey_(k)||financial(x));
    author.financial=author.financial||!!financial(change);if(!authors.includes(author))authors.push(author);
    if(authors.length>25)throw Error('Zu viele Bearbeiter vor der ersten HQ-Übertragung. Bitte den Anlageauftrag prüfen.');job.editAuthors=authors;
  }
  const entries=[{path:'sales_drafts/'+draft.id,value:draft},{path:'sales_jobs/'+job.id,value:job}];
  if(change.name!==undefined){const names=salesRead_('sales_meta/lean_names');if(names)entries.push({path:'sales_meta/lean_names',value:{...names,rows:names.rows.map(c=>c.id===d.ref?{...c,name:draft.company.name}:c)}});}
  salesBulkRest_('commit',{writes:entries.map(e=>({update:{name:salesBulkName_(e.path),fields:{payload:{stringValue:salesBulkPayload_(e.path,e.value)}}}}))});
  return salesBusinessDraftResult_(d,input.entity);
}
function salesBusinessVerifyDraft_(job,draft,company,contact){
  for(const [entity,keys] of Object.entries(job.editedFields||{})){
    const expected=entity==='address'?draft.company.defaultAddress:entity==='contact'?draft.contact:draft.company,actual=entity==='address'?company.defaultAddress:entity==='contact'?contact:company;
    for(const key of keys){
      const value=expected[key];let matches;
      if(key==='homepage')matches=salesHomepageConfirmed_(company,value);
      else if(key==='customFields')matches=salesBusinessCustomMatches_(actual?.customFields,value);
      else if(key==='companyTypes')matches=(value||[]).every(t=>(actual?.companyTypes||[]).some(a=>salesCompanyTypeId_(a)===Number(t.companyTypeId)&&salesBusinessEqual_(a,{number:t.number})));
      else if(key==='responsibleUserIds')matches=(value||[]).every(id=>(actual?.responsibleUsers||[]).some(u=>Number(u.userId||u.id)===Number(id)));
      else if(key==='subsystemIds')matches=(value||[]).every(id=>salesSubsystemConfirmed_(company,id));
      else if(key==='defaultAddress')matches=salesBusinessEqual_(actual?.defaultAddress||{},value||{});
      else matches=salesBusinessEqual_(actual||{},{[key]:value});
      if(!matches)throw Error('Geändertes Kundenfeld in HQ noch nicht bestätigt: '+entity+'.'+key+'. Kein erneuter Anlageversuch.');
    }
  }
}
function salesBusinessView_(value){
  const data=JSON.parse(JSON.stringify(value));
  for(const p of data.pendingChanges||[]){
    const actual=p.entity==='contact'?(value.contacts||[]).find(c=>Number(c.id)===Number(p.targetId)):p.entity==='address'?[value.company.defaultAddress,...value.company.addresses||[]].find(a=>Number(a?.id)===Number(p.targetId)):value.company;
    const current=p.entity==='types'&&actual?{companyTypes:salesCompanyTypes_(actual.companyTypes)}:p.entity==='assignments'&&actual?{responsibleUserIds:actual.responsibleUsers?.map(u=>u.userId||u.id),subsystemIds:actual.subsystems?.map(s=>s.id)}:actual;
    if(!current||!salesReviewOverlay_(p,current))continue;
    if(p.entity==='company'){Object.assign(data.company,p.change);if(p.change.homepage!==undefined){data.company.homepageDisplay=p.change.homepage||'';data.company.homepageSource='App';}}
    if(p.entity==='types')data.company.companyTypes=p.change.companyTypes.map(t=>({...t,name:p.typeNames?.[t.companyTypeId]||'HQ-Firmenart '+t.companyTypeId}));
    if(p.entity==='assignments'){
      if(p.change.responsibleUserIds)data.company.responsibleUsers=p.change.responsibleUserIds.map(id=>({userId:id,firstName:(p.userNames||[]).find(u=>Number(u.id)===Number(id))?.name||'',lastName:''}));
      if(p.change.subsystemIds)data.company.subsystems=p.change.subsystemIds.map(id=>({id,name:(p.subsystemNames||[]).find(u=>Number(u.id)===Number(id))?.name||''}));
    }
    if(p.entity==='contact'){const contact=(data.contacts||[]).find(c=>Number(c.id)===Number(p.targetId));if(contact)Object.assign(contact,p.change);}
    if(p.entity==='address')for(const a of [data.company.defaultAddress,...data.company.addresses||[]])if(a&&Number(a.id)===Number(p.targetId))Object.assign(a,p.change);
  }return data;
}
function salesBusinessStore_(id,data){
  salesWrite_('sales_companies/'+id,data);const visible=salesBusinessView_(data),directory=salesRead_('sales_directory/'+id);
  if(directory)salesWrite_('sales_directory/'+id,{...directory,company:salesCompany_(visible.company),contacts:visible.contacts});
}
function saveSalesEntityChange(input){
  const user=salesUser_();return salesLock_(()=>{
    if(input.entity==='customer'){salesAssertPrivate_();return salesCustomerSave_(input,user);}
    salesAssertPrivate_();if(String(input.companyId).startsWith('draft_'))return salesBusinessSaveDraft_(input,user);
    const hqId=salesId_(input.companyId),targetId=salesId_(input.targetId),entity=input.entity,schema=salesBusinessSchema_(entity),data=salesBusinessKnown_(hqId);
    if(['company','types'].includes(entity)&&targetId!==hqId||entity==='contact'&&!(data.contacts||[]).some(c=>Number(c.id)===targetId&&Number(c.companyId)===hqId)||entity==='address'&&![data.company.defaultAddress,...data.company.addresses||[]].some(a=>Number(a?.id)===targetId))throw new Error('Stammdatenziel gehört nicht zum geladenen Kunden.');
    if((data.pendingChanges||[]).some(p=>p.entity===entity&&Number(p.targetId)===targetId))throw new Error('Für diese Stammdaten ist bereits eine Änderung offen. Zuerst synchronisieren.');
    const reason=salesReviewReason_(input.changeReason),change=input.change;if(!change||typeof change!=='object'||Array.isArray(change)||!Object.keys(change).length)throw new Error('Keine Änderungen eingegeben.');
    if(entity==='contact'&&change.defaultAddress?.email!==undefined){if(change.eMail!==undefined&&change.eMail!==change.defaultAddress.email)throw new Error('Die beiden Kontakt-E-Mail-Felder müssen übereinstimmen.');change.eMail=change.defaultAddress.email;}
    const stored=salesBusinessPick_(salesBusinessCachedTarget_(data,entity,targetId),schema),base={};for(const k of Object.keys(change)){
      if(!Object.prototype.hasOwnProperty.call(schema.properties,k))throw new Error('Nicht schreibbares Feld: '+k);
      salesBusinessValidate_(change[k],schema.properties[k],k);base[k]=stored[k]??null;
      if(input.base&&!salesBusinessEqual_(stored,{[k]:input.base[k]??null})&&!salesBusinessEqual_(stored,{[k]:change[k]}))throw Error('Daten wurden inzwischen geändert. Bitte neu laden und vergleichen.');
      if(entity==='contact'&&['firstName','lastName'].includes(k)&&!String(change[k]||'').trim())throw new Error('Vor- und Nachname des Ansprechpartners bleiben Pflichtfelder.');
      if(schema.required?.includes(k)&&(change[k]===null||change[k]===''))throw new Error('Pflichtfeld fehlt: '+k);
    }
    const typeNames={};if(entity==='types'){
      Object.assign(typeNames,salesBusinessTypes_(change,salesRead_('sales_meta/catalog')));
    }
    if(entity==='company'&&change.customFields){salesBusinessOriginPreserved_(change,data.company);salesBusinessCustom_(change,stored,salesRead_('sales_meta/catalog')?.fields);}
    // Base values are expected values, never a destination or a complete PUT body.
    const id=Utilities.getUuid(),job={id,kind:'entityChange',business:1,hqId,targetId,entity,name:data.company.name,change,base,state:'pending',actor:user.email,...(user.uid?{actorUid:user.uid}:{}),createdAt:salesNow_(),updatedAt:salesNow_(),message:'Stammdatenänderung in Firebase gespeichert; HQ-Abgleich offen.'};
    salesReviewInit_(job,reason);data.pendingChanges=[...(data.pendingChanges||[]),{jobId:id,entity,targetId,change,base,...(entity==='types'?{typeNames}:{})}];
    const entries=[{path:'sales_jobs/'+id,value:job},{path:'sales_companies/'+hqId,value:data}];
    const directory=salesRead_('sales_directory/'+hqId);
    if(directory&&!job.review){const visible=salesBusinessView_(data);entries.push({path:'sales_directory/'+hqId,value:{...directory,company:salesCompany_(visible.company),contacts:visible.contacts}});}
    salesBulkRest_('commit',{writes:entries.map(e=>({update:{name:salesBulkName_(e.path),fields:{payload:{stringValue:salesBulkPayload_(e.path,e.value)}}}}))});
    return {id,message:job.message,...(!job.review?{entityPatch:{companyId:hqId,entity,targetId,change,...(entity==='types'?{typeNames}:{})}}:{}),patch:{job:salesJobSummary_(job)}};
  });
}
function salesBusinessFinish_(job,actual){
  const data=salesBusinessKnown_(job.hqId);data.pendingChanges=(data.pendingChanges||[]).filter(p=>p.jobId!==job.id);
  if(job.entity==='company')data.company={...data.company,...salesCompany_(actual)};
  if(job.entity==='types')data.company.companyTypes=salesCompany_(actual).companyTypes;
  if(job.entity==='assignments'){const catalog=salesRead_('sales_meta/catalog');if(job.change.responsibleUserIds)data.company.responsibleUsers=actual.responsibleUserIds.map(id=>({userId:id,firstName:catalog.users.find(u=>Number(u.id)===id)?.name||'',lastName:''}));if(job.change.subsystemIds)data.company.subsystems=actual.subsystemIds.map(id=>({id,name:catalog.subsystems.find(s=>Number(s.id)===id)?.name||''}));}
  if(job.entity==='contact')data.contacts=(data.contacts||[]).map(c=>Number(c.id)===Number(job.targetId)?{...c,...salesContactView_(actual)}:c);
  if(job.entity==='address')for(const a of [data.company.defaultAddress,...data.company.addresses||[]])if(a&&Number(a.id)===Number(job.targetId))Object.assign(a,salesBusinessPick_(actual,salesBusinessSchema_('address')));
  salesBusinessStore_(job.hqId,data);
  if(job.draftDependency){const draft=salesRead_('sales_drafts/'+salesKey_(job.draftDependency));if(!draft)throw Error('Kundenentwurf für Änderungsabschluss fehlt.');draft.pendingChanges=(draft.pendingChanges||[]).filter(p=>p.jobId!==job.id);draft.revision=(draft.revision||0)+1;salesWrite_('sales_drafts/'+draft.id,draft);}
}
function salesAssignmentGuard_(raw){
  function clean(value){if(Array.isArray(value))return value.map(clean).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).filter(k=>!['CreatedOn','UpdatedOn','CreatedBy','UpdatedBy'].includes(k)&&!k.startsWith('@')).sort().map(k=>[k,clean(value[k])]));return value;}
  return clean(salesPick_(raw,['Id','Name','IndustrialSector','Description','IBAN','BIC','DebitorNumber','CreditorNumber','TaxId','DefaultDeliveryConditionId','DefaultPaymentConditionId','DefaultAddress','Addresses','CompanyTypes','CustomFields','Files']));
}
function salesBusinessDeferredTarget_(job){
  if(!job.draftDependency)return true;
  const parent=salesRead_('sales_jobs/'+salesKey_(job.draftDependency)),draft=salesRead_('sales_drafts/'+salesKey_(job.draftDependency));
  if(parent?.kind!=='createCompany'||parent.draftId!==draft?.id||job.companyRef!=='draft_'+draft.id)throw Error('Ursprüngliche Firmenanlage gehört nicht zur Änderung.');
  if(parent.state!=='synced'){job.state='pending';job.message='Änderung bleibt in Firebase vorgemerkt; zuerst die ursprüngliche HQ-Anlage klären und abschließen.';return false;}
  if(!draft.hqId||Number(draft.hqId)!==Number(parent.hqId))throw Error('HQ-Firmenzuordnung noch nicht eindeutig bestätigt.');
  const data=salesBusinessKnown_(draft.hqId),target=job.entity==='contact'?parent.contactId:job.entity==='address'?data.company.defaultAddress?.id:draft.hqId;
  job.hqId=salesId_(draft.hqId);job.targetId=salesId_(target);return true;
}
function salesBusinessRun_(job,verifyOnly){
  if(job.kind==='deleteCompany'){salesDeleteRun_(job,verifyOnly);return;}
  if(['communication','createContact'].includes(job.kind)){salesCommunicationRun_(job,verifyOnly);return;}
  if(job.kind==='history'){
    if(verifyOnly){salesHistoryTarget_(job,null);salesConfirmHistory_(job);return;}
    salesRunHistory_(job,null);return;
  }
  if(job.kind!=='entityChange'||job.business!==1)throw new Error('Unbekannter Stammdatenauftrag.');
  if(job.formPrevious&&!['synced','canceled'].includes(salesRead_('sales_jobs/'+salesKey_(job.formPrevious))?.state)){if(verifyOnly)throw Error('Vorheriger Teil der Kundenänderung ist noch offen.');job.state='pending';job.message='Änderung wartet auf Abschluss des vorherigen Teils dieses Formulars.';return;}
  if(!salesBusinessDeferredTarget_(job)){if(verifyOnly)throw Error('Keine HQ-Bestätigung der Änderung: ursprüngliche Anlage noch offen.');return;}
  salesBusinessKnown_(job.hqId);const actual=salesBusinessTarget_(job.hqId,job.entity,job.targetId),schema=salesBusinessSchema_(job.entity),current=salesBusinessPick_(actual,schema);
  if(job.formGroup&&job.change.customFields){const names=new Set(job.change.customFields.map(f=>f.name));current.customFields=(current.customFields||[]).filter(f=>names.has(f.name));}
  const conflicts=Object.keys(job.change).filter(k=>!salesBusinessEqual_(current,{[k]:job.change[k]})&&!salesBusinessEqual_(current,{[k]:job.base[k]}));
  if(conflicts.length&&!verifyOnly&&job.changeReason){salesBusinessFinish_(job,actual);job.state='canceled';job.message='HQ hat diese Daten inzwischen geändert. Der aktuelle HQ-Stand wurde übernommen.';if(job.review)job.review.status='superseded';return;}
  if(conflicts.length){job.state='conflict';job.conflict={before:job.base,app:job.change,hq:salesPick_(current,Object.keys(job.change))};job.message='HQ und App unterscheiden sich. Bitte die Stammdatenwerte in der Auftragsübersicht vergleichen.';return;}
  let wrote=false;
  if(!salesBusinessEqual_(current,job.change)){
    if(verifyOnly){job.state='conflict';job.conflict={before:job.base,app:job.change,hq:salesPick_(current,Object.keys(job.change))};job.message='HQ-Ergebnis stimmt noch nicht mit der Änderung überein. Mit „HQ-Werte behalten“ wird der Auftrag verworfen.';return;}
    if(!salesReviewAllowed_(job,current,job.change))return;
    if(job.entity==='contact'&&(job.change.defaultAddress!==undefined||job.change.eMail!==undefined)){
      if(!actual.defaultAddressId)throw new Error('Kontaktadresse ist nicht eindeutig zugeordnet. Bitte zuerst in HQ prüfen.');
      salesAssertOwnContactAddress_({hqId:job.hqId},job.targetId,salesId_(actual.defaultAddressId));
    }
    const payload={...current,...job.change};
    if(job.formGroup&&job.change.customFields)payload.customFields=[...(actual.customFields||[]).filter(f=>!job.change.customFields.some(c=>c.name===f.name)),...job.change.customFields];
    // Embedded address updates are optional. Do not resubmit an unrelated address
    // (older HQ contacts can have an incomplete address which cannot be PUT).
    if(job.entity==='contact'&&job.change.eMail!==undefined)payload.defaultAddress={...(payload.defaultAddress||{}),email:job.change.eMail};
    else if(job.entity==='contact'&&job.change.defaultAddress===undefined)delete payload.defaultAddress;
    salesBusinessValidate_(payload,schema,job.entity);
    const path=job.entity==='assignments'?'/v1/Companies('+job.hqId+')':job.entity==='types'?'/v2/Companies/'+job.hqId+'/UpdateCompanyTypes':job.entity==='company'?'/v2/Companies/'+job.hqId:job.entity==='contact'?'/v2/ContactPersons/'+job.targetId:'/v2/Companies/'+job.hqId+'/Addresses/'+job.targetId;
    const body=job.entity==='assignments'?{...salesPick_(actual.legacy,['Id','Name','IndustrialSector','Description','IBAN','BIC','DebitorNumber','CreditorNumber','TaxId','DefaultDeliveryConditionId','DefaultPaymentConditionId','DefaultAddress','Addresses','CompanyTypes','CustomFields','Files']),ResponsibleUsers:payload.responsibleUserIds.map(Id=>({Id})),Subsystems:payload.subsystemIds.map(Id=>({Id}))}:job.entity==='types'?payload.companyTypes:payload;
    if(job.entity==='assignments'&&!job.assignmentGuard)job.assignmentGuard=salesAssignmentGuard_(actual.legacy);
    salesBusinessTransport_(job,path,job.entity==='types'?'post':'put',body);
    wrote=true;
  }
  const after=wrote?salesBusinessTarget_(job.hqId,job.entity,job.targetId):actual;
  if(job.entity==='assignments'&&JSON.stringify(salesAssignmentGuard_(after.legacy))!==JSON.stringify(job.assignmentGuard||salesAssignmentGuard_(actual.legacy)))throw Error('HQ hat neben der Zuordnung weitere Firmenwerte verändert. Rückprüfung offen; kein erneuter Schreibversuch.');
  if(job.entity==='contact'&&job.change.defaultAddress===undefined){const expected=salesBusinessPick_(actual.defaultAddress||{},salesBusinessSchema_('address'));if(job.change.eMail!==undefined)expected.email=job.change.eMail;if(String(after.defaultAddressId??'')!==String(actual.defaultAddressId??'')||!salesBusinessEqual_(after.defaultAddress||{},expected))throw new Error('Kontaktadresse wurde unerwartet verändert. Rückprüfung offen.');}
  const confirmed=salesBusinessPick_(after,schema);if(job.formGroup&&job.change.customFields)confirmed.customFields=(confirmed.customFields||[]).filter(f=>job.change.customFields.some(c=>c.name===f.name));
  if(!salesBusinessEqual_(confirmed,job.change))throw new Error('Stammdaten-Rückprüfung noch offen.');
  salesBusinessFinish_(job,after);
}
function salesBusinessTransport_(job,path,method,body){
  const expected=['history','communication'].includes(job.kind)?'/v2/ContactHistories':job.kind==='createContact'?'/v2/ContactPersons':job.entity==='assignments'?'/v1/Companies('+salesId_(job.hqId)+')':job.entity==='types'?'/v2/Companies/'+salesId_(job.hqId)+'/UpdateCompanyTypes':job.entity==='company'?'/v2/Companies/'+salesId_(job.hqId):job.entity==='contact'?'/v2/ContactPersons/'+salesId_(job.targetId):job.entity==='address'?'/v2/Companies/'+salesId_(job.hqId)+'/Addresses/'+salesId_(job.targetId):null;
  if(job.entity==='assignments'&&(Number(body.Id)!==Number(job.hqId)||!Array.isArray(body.ResponsibleUsers)||!Array.isArray(body.Subsystems)))throw Error('Abweichendes Zuordnungsziel.');
  if(job.business!==1||job.state!=='running'||path!==expected||method!==(['history','communication','createContact'].includes(job.kind)||job.entity==='types'?'post':'put'))throw new Error('HQ-Schreibziel nicht freigegeben.');
  if(['communication','createContact'].includes(job.kind)&&Number(body.companyId)!==Number(job.hqId))throw new Error('Abweichendes Firmenziel.');
  const priorMarker={writeAttempted:job.writeAttempted,phaseWriteAttempted:job.phaseWriteAttempted,lastWrite:job.lastWrite};
  job.writeAttempted=true;job.phaseWriteAttempted=true;job.lastWrite={method:method.toUpperCase(),resource:path.replace(/\/\d+/g,'/{id}'),at:salesNow_(),status:null,fields:[]};
  try{salesWrite_('sales_jobs/'+job.id,job);}catch(e){Object.assign(job,priorMarker);throw e;}
  const result=UrlFetchApp.fetch('https://api.hellohq.io'+path,{method,contentType:'application/json',headers:{Authorization:'Bearer '+revenueToken_()},payload:JSON.stringify(body),muteHttpExceptions:true,followRedirects:false});
  job.lastWrite.status=result.getResponseCode();salesWrite_('sales_jobs/'+job.id,job);
  if(job.lastWrite.status<200||job.lastWrite.status>=300)throw new Error('HQ-Schreiben: HTTP '+job.lastWrite.status+'. Ausgang vor Wiederholung prüfen.');
  return result.getContentText()?JSON.parse(result.getContentText()):null;
}

/** Inspection never reconciles, binds, unlocks or writes a job. Only stored HQ IDs are read. */
function getSalesJobInspection(id){
  salesUser_(true);const job=salesRead_('sales_jobs/'+salesKey_(id));if(!job)throw new Error('Auftrag fehlt.');
  const draft=job.draftId?salesRead_('sales_drafts/'+salesKey_(job.draftId)):null,checks=[];
  const note='Nur gelesen. Auftrag und Sperre bleiben unverändert; keine erneute Anlage freigegeben.';
  const result=()=>({id:job.id,state:job.state,checks,note});
  function read(entity,key,label){
    if(!key){checks.push(label+': Keine gespeicherte HQ-ID. Ausgang bleibt ungeklärt.');return null;}
    try{return salesOne_(entity,salesId_(key));}catch(e){const http=/HTTP (\d{3})/.exec(e.message||'');checks.push(label+': '+(http?'HTTP '+http[1]+'; gespeicherte Zuordnung nicht bestätigt.':'Lesetest nicht bestätigt.')+' Keine Neuanlage.');return null;}
  }
  const hqId=job.hqId||draft?.hqId;
  if(job.hqId&&draft?.hqId&&Number(job.hqId)!==Number(draft.hqId)){checks.push('Firma: Gespeicherte HQ-Zuordnungen widersprechen sich.');return result();}
  const company=read('Companies',hqId,'Firma');if(!company)return result();
  if(job.kind==='createCompany'){
    if(!draft?.company){checks.push('Firma: Gespeicherter Entwurf fehlt.');return result();}
    const expected=draft.company,diff=[];
    for(const key of ['name','industrialSector'])if(!salesBusinessEqual_(company,{[key]:expected[key]}))diff.push(key);
    if(![expected.description,[expected.description,'[Sales-Test '+job.id+']'].filter(Boolean).join('\n')].includes(String(company.description||'').replace(/\r\n/g,'\n')))diff.push('description');
    if(!salesHomepageConfirmed_(company,expected.homepage))diff.push('homepage');
    if(!salesBusinessEqual_(company.defaultAddress||{},salesPick_(expected.defaultAddress,['street','houseNumber','zipCode','city','country','website'])))diff.push('defaultAddress');
    try{if(!(company.companyTypes||[]).some(t=>salesCompanyTypeId_(t)===Number(expected.companyTypes?.[0]?.companyTypeId)))diff.push('companyTypes');}catch{diff.push('companyTypes');}
    if(!(company.responsibleUsers||[]).some(u=>Number(u.userId||u.id)===Number(expected.responsibleUserIds?.[0])))diff.push('responsibleUsers');
    if(!salesSubsystemConfirmed_(company,expected.subsystemIds?.[0]))diff.push('subsystems');
    if((expected.customFields||[]).some(f=>!(company.customFields||[]).some(a=>a.name===f.name&&String(a.value)===String(f.value))))diff.push('customFields');
    checks.push('Firma: '+(diff.length?'Abweichende Felder: '+diff.join(', ')+'.':'Gespeicherte Anlagefelder stimmen überein.'));
    if(company.name!==expected.name)return result();
    if(draft.contact){const contact=read('ContactPersons',job.contactId,'Ansprechpartner');if(contact){if(Number(contact.companyId)!==Number(hqId))checks.push('Ansprechpartner: Gehört zu einer anderen Firma.');else {const fields=salesContactDifferences_(contact,draft.contact);checks.push('Ansprechpartner: '+(fields.length?'Abweichende Felder: '+fields.join(', ')+'.':'Gespeicherte Kontaktfelder stimmen überein.'));}}}
  }else if(job.kind==='entityChange'){
    try{const raw=job.entity==='company'?company:job.entity==='types'?{...company,companyTypes:salesCompanyTypes_(company.companyTypes)}:salesBusinessTarget_(hqId,job.entity,job.targetId);const current=salesBusinessPick_(raw,salesBusinessSchema_(job.entity));checks.push('Änderung: '+(salesBusinessEqual_(current,job.change)?'Gespeicherte Zielfelder stimmen überein.':'Gespeicherte Zielfelder noch nicht bestätigt.'));}catch{checks.push('Änderung: Ziel oder Felder nicht bestätigt.');}
  }else if(job.kind==='contactEmail'){
    try{if(!draft||!job.targetContact)throw Error('Zielzustand fehlt');const actual=salesContactEmailState_(draft,job.contactId);checks.push('Kontakt-E-Mail: '+(salesContactEmailEqual_(actual,job.targetContact)?'Gespeicherter Zielzustand stimmt überein.':'Gespeicherter Zielzustand noch nicht bestätigt.'));}catch{checks.push('Kontakt-E-Mail: Zuordnung oder gespeicherter Zielzustand nicht bestätigt.');}
  }else if(['history','communication'].includes(job.kind)){
    const row=read('ContactHistories',job.historyId,'Kommunikation');if(row){const diff=job.history?salesHistoryDifferences_(row,job.history):['Gespeicherter Zielzustand fehlt'];if(Number(row.companyId)!==Number(hqId))diff.push('companyId');if(row.syncId!=='sales-'+job.id)diff.push('syncId');checks.push('Kommunikation: '+(diff.length?'Nicht bestätigte Felder: '+Array.from(new Set(diff)).join(', ')+'.':'Gespeicherter Eintrag stimmt überein.'));}
  }else {checks.push('Firma: Gespeicherte HQ-ID ist lesbar. Weitere Zielfelder dieses Auftragstyps sind damit noch nicht bestätigt.');}
  return result();
}

/** Customer-scoped overlays. Capture never calls HQ; stable request IDs make retries safe. */
function salesCommunicationCompany_(ref){
  ref=salesKey_(String(ref));
  if(ref.startsWith('draft_')){
    const draft=salesRead_('sales_drafts/'+ref.slice(6));
    if(!draft?.company||draft.deletedAt)throw new Error('Kunde nicht im App-Bestand.');
    const stored=draft.hqId?salesRead_('sales_companies/'+draft.hqId):null;
    return {ref,draft,hqId:draft.hqId||null,company:stored?.company||draft.company,contacts:stored?.contacts||[],name:draft.company.name};
  }
  const id=salesId_(ref),data=salesRead_('sales_companies/'+id)||salesRead_('sales_directory/'+id);
  if(!data?.company||Number(data.company.id)!==id)throw new Error('Kunde nicht im bestätigten App-Bestand.');
  return {ref,hqId:id,company:data.company,contacts:data.contacts||[],name:data.company.name};
}
function salesCommunicationData_(ref){return salesRead_('sales_communication/'+ref)||{contacts:[],histories:[]};}
function salesCommunicationView_(data,base){
  const contacts=(base.contacts||[]).slice(),aliases=new Map();
  if(base.company?.localDraftId){const first=contacts.find(c=>c.localDraftId===base.company.localDraftId||base.patch?.job?.contactId&&String(c.id)===String(base.patch.job.contactId));if(first)aliases.set('draft_'+base.company.localDraftId+'_contact',first.id);}
  for(const c of data.contacts){
    const i=c.hqId?contacts.findIndex(x=>Number(x.id)===Number(c.hqId)):-1;
    const value={...(i<0?c:contacts[i]),id:c.hqId||c.id,localContactId:c.id,jobId:c.jobId,syncState:c.syncState};
    if(i<0)contacts.push(value);else contacts[i]=value;
    aliases.set(c.id,value.id);
  }
  const histories=(base.histories||[]).slice();
  for(const h of data.histories){
    const i=histories.findIndex(x=>x.syncId===h.syncId||h.historyId&&String(x.id)===String(h.historyId));
    const value={...h,contactPersonId:aliases.get(h.contactRef)||h.contactPersonId||h.contactRef,source:'app'};
    if(i<0)histories.push(value);else histories[i]={...histories[i],jobId:h.jobId,syncState:h.syncState,actor:h.actor};
  }
  return {...base,contacts,histories};
}
function salesCommunicationMerge_(value){
  if(!value?.company)return value;
  const ref=value.company.localDraftId?'draft_'+value.company.localDraftId:String(value.company.id);
  return {...salesCommunicationView_(salesCommunicationData_(ref),value),communicationRef:ref};
}
function salesCommunicationInput_(input,kind){
  if(!input||typeof input!=='object')throw new Error('Ungültige Eingabe.');
  const out={companyRef:salesKey_(String(input.companyRef)),requestId:salesKey_(String(input.requestId))};
  if(kind==='createContact'){
    for(const k of ['firstName','lastName','position','eMail','phoneMobile','phoneLandline'])out[k]=salesText_(input[k],200,['firstName','lastName'].includes(k));
    if(out.eMail&&!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(out.eMail))throw new Error('Bitte eine gültige E-Mail-Adresse eingeben.');
  }else{
    if(typeof input.notReached!=='boolean')throw new Error('Ungültiges Kontaktergebnis.');
    out.notReached=input.notReached;out.content=salesText_(input.content,10000,!input.notReached);
    out.contactRef=salesKey_(String(input.contactRef));out.contactOn=salesHistoryDate_(input.contactOn);
  }
  return out;
}
function salesCommunicationContact_(ctx,data,ref){
  const local=data.contacts.find(c=>c.id===ref||c.hqId&&String(c.hqId)===ref);
  if(local)return {ref:local.id,hqId:local.syncState==='synced'?local.hqId||null:null};
  const contact=ctx.contacts.find(c=>String(c.id)===ref&&Number(c.companyId)===Number(ctx.hqId));
  if(contact)return {ref,hqId:salesId_(contact.id)};
  if(ctx.draft?.contact&&!ctx.draft.contactDeletedAt){
    const creation=salesRead_('sales_jobs/'+ctx.draft.id);
    if(ref==='draft_'+ctx.draft.id+'_contact'||creation?.contactId&&String(creation.contactId)===ref)return {ref:'draft_'+ctx.draft.id+'_contact',hqId:creation?.steps?.contact?creation.contactId:null};
  }
  throw new Error('Bitte einen Ansprechpartner dieses Kunden auswählen.');
}
function salesCommunicationApplyJob_(job,data){
  if(job.kind==='createContact'){
    const c={...job.contact,id:'local_'+job.id,jobId:job.id,...(job.contactId?{hqId:job.contactId}:{}),syncState:job.state};
    const i=data.contacts.findIndex(x=>x.jobId===job.id);if(i<0)data.contacts.push(c);else data.contacts[i]=c;
  }else{
    const h={id:'local_'+job.id,jobId:job.id,syncId:'sales-'+job.id,contactRef:job.capture.contactRef,contactOn:job.capture.contactOn,content:job.capture.content||'Nicht erreicht',reason:job.capture.notReached?'Nicht erreicht':'Gespräch / Notiz',contactHistoryChannel:job.capture.notReached?'Call':'Note',...(job.capture.notReached?{contactHistoryStatus:'NotReached'}:{}),actor:job.actor,syncState:job.state,...(job.historyId?{historyId:job.historyId}:{})};
    const i=data.histories.findIndex(x=>x.jobId===job.id);if(i<0)data.histories.push(h);else data.histories[i]=h;
  }
  return data;
}
function salesCommunicationResult_(job,data){
  const result={id:job.id,message:job.state==='synced'?'Bereits gespeichert und in HQ bestätigt.':job.kind==='createContact'?'Ansprechpartner gespeichert; HQ-Abgleich offen.':'Kommunikation gespeichert; HQ-Abgleich offen.',patch:{job:salesJobSummary_(job)}};
  if(job.kind==='createContact')result.contact=data.contacts.find(c=>c.jobId===job.id);
  else result.communication=data.histories.find(h=>h.jobId===job.id);
  return result;
}
function salesCommunicationCommit_(job,data){
  const entries=[{path:'sales_jobs/'+job.id,value:job},{path:'sales_communication/'+job.companyRef,value:data}];
  // Existing chunk writer prepares any large payload first; publish both root documents atomically.
  const writes=entries.map(e=>({update:{name:salesBulkName_(e.path),fields:{payload:{stringValue:salesBulkPayload_(e.path,e.value)}}}}));
  salesBulkRest_('commit',{writes});
}
function salesCommunicationSave_(input,kind){
  const user=salesUser_(),capture=salesCommunicationInput_(input,kind);
  return salesLock_(()=>{
    salesAssertPrivate_();const id=salesKey_('comm_'+capture.requestId),path='sales_jobs/'+id,old=salesRead_(path);
    if(old){
      if(old.actor!==user.email||old.kind!==kind||JSON.stringify(old.capture)!==JSON.stringify(capture))throw new Error('Speicherkennung gehört zu einer anderen Eingabe.');
      const data=salesCommunicationData_(old.companyRef),before=JSON.stringify(data);salesCommunicationApplyJob_(old,data);if(JSON.stringify(data)!==before)salesWrite_('sales_communication/'+old.companyRef,data);return salesCommunicationResult_(old,data);
    }
    const ctx=salesCommunicationCompany_(capture.companyRef),data=salesCommunicationData_(ctx.ref);
    if(kind!=='createContact')salesCommunicationContact_(ctx,data,capture.contactRef);
    if(kind==='createContact'&&[...ctx.contacts,...data.contacts].some(c=>String(c.firstName).trim().toLocaleLowerCase('de')===capture.firstName.toLocaleLowerCase('de')&&String(c.lastName).trim().toLocaleLowerCase('de')===capture.lastName.toLocaleLowerCase('de')))throw new Error('Ein Ansprechpartner mit diesem Namen ist bereits vorhanden. Bitte den vorhandenen Kontakt auswählen.');
    const job={id,kind,business:1,companyRef:ctx.ref,hqId:ctx.hqId,name:ctx.name,capture,actor:user.email,...(user.uid?{actorUid:user.uid}:{}),state:'pending',createdAt:salesNow_(),updatedAt:salesNow_(),message:'In Firebase gespeichert; kontrollierter HQ-Abgleich offen.'};
    if(kind==='createContact')job.contact=salesPick_(capture,['firstName','lastName','position','eMail','phoneMobile','phoneLandline']);
    salesCommunicationApplyJob_(job,data);salesCommunicationCommit_(job,data);
    return salesCommunicationResult_(job,data);
  });
}
function saveSalesCommunication(input){return salesCommunicationSave_(input,'communication');}
function createSalesCustomerContact(input){return salesCommunicationSave_(input,'createContact');}
function salesCommunicationAfterJob_(job){
  if(!['communication','createContact'].includes(job.kind))return;
  const data=salesCommunicationData_(job.companyRef),before=JSON.stringify(data);salesCommunicationApplyJob_(job,data);if(JSON.stringify(data)!==before)salesWrite_('sales_communication/'+job.companyRef,data);
}
function salesCommunicationRun_(job,verifyOnly){
  const ctx=salesCommunicationCompany_(job.companyRef);
  if(!ctx.hqId)throw new Error('Firmenanlage noch offen; Kontakt und Kommunikation bleiben in Firebase.');
  if(ctx.draft){const parent=salesRead_('sales_jobs/'+ctx.draft.id);if(!parent?.steps?.contact||!parent.steps.company)throw new Error('Firmenanlage zuerst vollständig bestätigen.');}
  job.hqId=salesId_(ctx.hqId);
  if(job.kind==='createContact'){
    const company=salesOne_('Companies',job.hqId);if(Number(company.id)!==job.hqId)throw new Error('HQ-Firmenziel nicht bestätigt.');
    if(!job.contactId){
      if(verifyOnly||job.writeAttempted)throw new Error('HQ-Anlage ohne bestätigte Kontakt-ID. Auftrag bleibt gesperrt; HQ manuell prüfen und die geprüfte ID zuordnen.');
      const payload={companyId:job.hqId,salutationForm:'Formal'};
      for(const [k,v] of Object.entries(job.contact))if(v)payload[k]=v;
      if(job.contact.eMail)payload.defaultAddress={...salesContactAddressFields_(company.defaultAddress||{}),email:job.contact.eMail};
      const result=salesWriteHq_(job,'/v2/ContactPersons','post',payload);job.contactId=salesId_(result?.id);salesWrite_('sales_jobs/'+job.id,job);
    }
    const actual=salesContactWithAddress_(job.contactId);
    if(Number(actual.companyId)!==job.hqId||salesContactDifferences_(actual,job.contact).length)throw new Error('HQ-Kontakt stimmt nicht vollständig mit dem Anlageauftrag überein.');
    return;
  }
  const contact=salesCommunicationContact_(ctx,salesCommunicationData_(ctx.ref),job.capture.contactRef);
  if(!contact.hqId)throw new Error('Ansprechpartner noch nicht in HQ bestätigt; Kommunikation bleibt in Firebase.');
  job.history={companyId:job.hqId,contactPersonId:salesId_(contact.hqId),reason:job.capture.notReached?'Nicht erreicht':'Gespräch / Notiz',content:job.capture.content||'Nicht erreicht',contactOn:job.capture.contactOn,contactHistoryChannel:job.capture.notReached?'Call':'Note',...(job.capture.notReached?{contactHistoryStatus:'NotReached'}:{}),syncId:'sales-'+job.id};
  salesWrite_('sales_jobs/'+job.id,job);
  if(verifyOnly){salesHistoryTarget_(job,null);salesConfirmHistory_(job);}else salesRunHistory_(job,null);
}
function bindSalesCustomerContact(id,hqId){
  salesUser_(true);return salesLock_(()=>{
    const job=salesRead_('sales_jobs/'+salesKey_(id));
    if(job?.kind!=='createContact'||!['uncertain','running'].includes(job.state)||job.contactId||!job.writeAttempted)throw new Error('Keine unklare Kontaktanlage ohne ID.');
    const ctx=salesCommunicationCompany_(job.companyRef),actual=salesContactWithAddress_(salesId_(hqId));
    if(Number(actual.companyId)!==Number(ctx.hqId)||salesContactDifferences_(actual,job.contact).length)throw new Error('Die geprüfte Kontakt-ID passt nicht vollständig zu Firma und Anlageauftrag.');
    const data=salesCommunicationData_(job.companyRef);if(data.contacts.some(c=>c.jobId!==job.id&&Number(c.hqId)===Number(hqId)))throw new Error('Kontakt-ID ist bereits einem anderen Anlageauftrag zugeordnet.');
    job.hqId=ctx.hqId;job.contactId=salesId_(hqId);job.state='synced';job.updatedAt=salesNow_();job.message='Manuell geprüfte HQ-Kontakt-ID zugeordnet; kein weiterer Anlageversuch.';
    salesWrite_('sales_jobs/'+job.id,job);salesCommunicationAfterJob_(job);return {id:job.id,message:job.message,patch:{job:salesJobSummary_(job)}};
  });
}
function salesCommunicationOrder_(jobs){return jobs.slice().sort((a,b)=>(a.kind==='createContact'?0:1)-(b.kind==='createContact'?0:1)||(a.formGroup&&b.formGroup?a.formGroup.localeCompare(b.formGroup)||a.formOrder-b.formOrder:a.formGroup?1:b.formGroup?-1:0));}

/** Customer deletion (R15). Any user requests, an admin approves, the central sync deletes in HQ and then in the app.
 * No trash bin, no restore. Projects, documents, planned revenues and open jobs block the deletion until someone cleans up.
 * Contacts and contact histories of the customer are deleted together with it. */
const SALES_DELETE_HQ_BATCH=80;
function salesDeleteOwnDraft_(hqId){
  const owners=salesRead_('sales_meta/lean_testowners');if(owners)return owners.rows[String(hqId)]||null;
  const draft=salesList_('sales_drafts').find(d=>Number(d.hqId)===Number(hqId)&&!d.deletedAt);return draft?draft.id:null;
}
function salesDeleteRef_(companyId){
  if(String(companyId).startsWith('draft_')){
    const id=salesKey_(String(companyId).slice(6)),draft=salesRead_('sales_drafts/'+id),job=salesRead_('sales_jobs/'+id);
    if(!draft?.company||draft.deletedAt)throw Error('Kunde fehlt.');
    if(draft.hqId&&job?.state==='synced')return {hqId:salesId_(draft.hqId),draftId:draft.id,key:String(salesId_(draft.hqId))};
    const hqId=draft.hqId||job?.hqId;
    // Never sent to HQ: the customer exists only in Firebase and is deleted there directly after the admin approval.
    if(!hqId&&(!job||salesDeleteUnsent_(job)))return {local:true,hqId:null,draftId:draft.id,key:'draft_'+draft.id};
    // Transfer started and an HQ ID is known: delete in HQ through the central sync like any HQ customer; its own open jobs are discarded.
    if(hqId)return {hqId:salesId_(hqId),draftId:draft.id,key:String(salesId_(hqId)),pendingDraft:true};
    // Transfer started without a confirmed HQ ID: only the app entry can be deleted; HQ must be checked by hand.
    return {local:true,uncertain:true,hqId:null,draftId:draft.id,key:'draft_'+draft.id};
  }
  const hqId=salesId_(companyId),draftId=salesDeleteOwnDraft_(hqId);
  if(draftId&&salesRead_('sales_jobs/'+salesKey_(draftId))?.state!=='synced')return salesDeleteRef_('draft_'+draftId);
  return {hqId,draftId,key:String(hqId)};
}
function salesDeleteUnsent_(job){return !!job&&['pending','ready'].includes(job.state)&&!job.writeAttempted&&!job.phaseWriteAttempted&&!job.contactAttempted;}
function salesDeleteLocalJobs_(draftId){
  return salesList_('sales_jobs').filter(j=>j.kind!=='deleteCompany'&&!['synced','canceled'].includes(j.state)&&(j.id===draftId||j.draftId===draftId||j.draftDependency===draftId||j.companyRef==='draft_'+draftId));
}
function salesDeleteDiscardable_(job){
  if(!['createContact','communication','history','entityChange','companyChange','contactEmail','cleanupMarker'].includes(job.kind))return false;
  if(job.kind==='entityChange'&&!['company','customer','contact','address','types'].includes(job.entity))return false;
  const financial=value=>value&&typeof value==='object'&&Object.entries(value).some(([k,v])=>salesAuthFinancialKey_(k)||/budget/i.test(k)||k==='documentDispatch'||financial(v));
  return !financial(job);
}
function salesDeleteRawRows_(entity,hqId){
  const cache=salesRead_('sales_meta/bulk'),generation=cache?.entities?.[entity]?.generation;
  if(!generation)throw Error('Der gespeicherte HQ-Bestand ist unvollständig. Bitte zuerst den HQ-Abgleich abschließen.');
  return salesBulkQuery_(salesBulkCollection_(entity),'companyBucket',salesBulkBucket_(hqId)).filter(v=>v.generation===generation&&Number(v.row?.companyId)===Number(hqId)).map(v=>v.row);
}
function salesDeleteOpenJobs_(ref){
  const draftRef=ref.draftId?'draft_'+ref.draftId:null;
  return salesList_('sales_jobs').filter(j=>j.kind!=='deleteCompany'&&!['synced','canceled'].includes(j.state)&&(Number(j.hqId)===ref.hqId||String(j.companyRef)===String(ref.hqId)||draftRef&&(j.draftId===ref.draftId||j.draftDependency===ref.draftId||j.companyRef===draftRef)));
}
/** Firebase-only check. HQ is read again before the actual deletion in the central sync. */
function salesDeleteBlockers_(ref){
  if(ref.local){
    const draft=salesRead_('sales_drafts/'+salesKey_(ref.draftId));if(!draft?.company||draft.deletedAt)throw Error('Kunde fehlt.');
    return {stored:draft,jobs:salesDeleteLocalJobs_(ref.draftId),blockers:[]};
  }
  const imported=salesRead_('sales_companies/'+ref.hqId),draft=ref.pendingDraft?salesRead_('sales_drafts/'+salesKey_(ref.draftId)):null;
  let stored=ref.pendingDraft?draft:imported,statusPath=ref.pendingDraft?'sales_drafts/'+salesKey_(ref.draftId):'sales_companies/'+ref.hqId;
  // Customers known only from the directory (no full customer file yet) are deletable too; the status copy then lives in the directory entry.
  if(!stored?.company){const entry=salesRead_('sales_directory/'+ref.hqId);if(entry?.company){stored=entry;statusPath='sales_directory/'+ref.hqId;}}
  if(!stored?.company){const row=(salesRead_('sales_meta/lean_names')?.rows||[]).find(c=>String(c.id)===String(ref.hqId)||String(c.hqId||'')===String(ref.hqId));if(!row)throw Error('Kunde ist in Firebase nicht gespeichert. Bitte die Kundenliste neu laden.');stored={company:{id:ref.hqId,name:row.name}};statusPath=null;}
  const out=[],count=(n,one,many)=>n+' '+(n===1?one:many);
  const projects=Math.max((imported?.projects||[]).length,salesDeleteRawRows_('Projects',ref.hqId).length);if(projects)out.push(count(projects,'Projekt','Projekte'));
  const documents=salesDeleteRawRows_('Documents',ref.hqId).length;if(documents)out.push(count(documents,'Beleg','Belege'));
  const plans=salesDeleteRawRows_('PlannedRevenues',ref.hqId).length;if(plans)out.push(count(plans,'Planumsatz','Planumsätze'));
  // A customer whose own creation is still open has no other way out: its jobs are discarded instead of blocking.
  const own=ref.pendingDraft?salesDeleteLocalJobs_(ref.draftId):ref.draftId&&(ref.discardOwnChanges||ref.discardJobIds)?salesDeleteLocalJobs_(ref.draftId).filter(j=>salesDeleteDiscardable_(j)&&(!ref.discardJobIds||ref.discardJobIds.includes(j.id))):[],open=salesDeleteOpenJobs_(ref).filter(j=>!own.some(o=>o.id===j.id)),jobs=open.length+(imported?.pendingChanges||[]).filter(p=>!open.some(j=>j.id===p.jobId)&&!own.some(o=>o.id===p.jobId)).length;if(jobs)out.push(count(jobs,'offener Auftrag','offene Aufträge'));
  return {stored,statusPath,jobs:own,blockers:out};
}
function salesDeleteBlockedMessage_(blockers){
  return 'Löschen nicht möglich. Zu diesem Kunden gibt es noch: '+blockers.join(', ')+'. Bitte zuerst aufräumen (Projekte, Belege und Planumsätze in HQ, offene Aufträge in der Auftragsübersicht). Kunden sollten möglichst nie gelöscht werden.';
}
/** The status copy lives in the customer file, which opening a customer reads anyway (no extra read). */
function salesDeleteSave_(doc,stored,extra){
  const writes=[{path:'sales_deletions/'+(doc.key||doc.hqId),value:doc},...(extra||[])];
  const statusPath=salesDeleteStatusPath_(doc);
  if(stored?.company&&statusPath){if(['requested','approved','blocked','failed'].includes(doc.state))stored.deletion=salesDeleteView_(doc);else delete stored.deletion;writes.push({path:statusPath,value:stored});}
  salesBulkRest_('commit',{writes:writes.map(e=>({update:{name:salesBulkName_(e.path),fields:{payload:{stringValue:salesBulkPayload_(e.path,e.value)}}}}))});
}
function salesDeleteStatusPath_(doc){if(doc.statusPath!==undefined)return doc.statusPath;return doc.local||doc.pendingDraft?'sales_drafts/'+salesKey_(doc.draftId):'sales_companies/'+doc.hqId;}
function salesDeleteStatusDoc_(doc){const path=salesDeleteStatusPath_(doc);return path?salesRead_(path):null;}
/** After the approval the customer leaves the customer list at once; a later block restores the stored rows. */
function salesDeleteHide_(doc){
  const keys=new Set([doc.key,doc.hqId?String(doc.hqId):null,doc.draftId?'draft_'+doc.draftId:null].filter(Boolean)),hit=c=>keys.has(String(c.id))||keys.has(String(c.hqId||''));
  const names=salesRead_('sales_meta/lean_names'),filters=salesRead_('sales_meta/lean_filters'),hidden={names:(names?.rows||[]).filter(hit),filters:(filters?.rows||[]).filter(hit)};
  if(hidden.names.length)salesWrite_('sales_meta/lean_names',{...names,rows:names.rows.filter(c=>!hit(c))});
  if(hidden.filters.length)salesWrite_('sales_meta/lean_filters',{...filters,rows:filters.rows.filter(c=>!hit(c))});
  if(doc.hqId){const tomb=salesRead_('sales_meta/deleted_companies')||{ids:[]};if(!tomb.ids.includes(String(doc.hqId)))salesWrite_('sales_meta/deleted_companies',{ids:[...tomb.ids,String(doc.hqId)].slice(-5000)});}
  const merge=(old,rows)=>Array.from(new Map([...(old||[]),...rows].map(c=>[String(c.id),c])).values());
  doc.hidden={names:merge(doc.hidden?.names,hidden.names),filters:merge(doc.hidden?.filters,hidden.filters)};return Array.from(keys);
}
/** One-time repair of approvals made before immediate list removal was introduced. Never approves a request or calls HQ. */
function salesDeleteMigrateVisibility_(){
  for(const doc of salesList_('sales_deletions').filter(d=>d.state==='approved')){
    salesDeleteHide_(doc);salesWrite_('sales_deletions/'+(doc.key||doc.hqId),doc);
  }
}
function salesDeleteRestore_(doc){
  const h=doc.hidden;delete doc.hidden;if(!h)return;
  const add=(path,rows)=>{if(!rows?.length)return;const old=salesRead_(path);if(!old)return;const ids=new Set(old.rows.map(c=>String(c.id)));salesWrite_(path,{...old,rows:[...old.rows,...rows.filter(c=>!ids.has(String(c.id)))]});};
  add('sales_meta/lean_names',h.names);add('sales_meta/lean_filters',h.filters);
  if(doc.hqId){const tomb=salesRead_('sales_meta/deleted_companies');if(tomb?.ids?.includes(String(doc.hqId)))salesWrite_('sales_meta/deleted_companies',{ids:tomb.ids.filter(x=>x!==String(doc.hqId))});}
}
function salesDeleteView_(d){return d?salesPick_(d,['key','local','uncertain','pendingDraft','hqId','name','reason','state','message','requestedBy','requestedAt','decidedBy','decidedAt','jobId','revision','completedAt','discardJobCount']):null;}
function requestSalesCustomerDelete(input){
  const user=salesUser_();return salesLock_(()=>{
    salesAssertPrivate_();const reason=salesText_(input?.reason,500,true),ref=salesDeleteRef_(input?.companyId),path='sales_deletions/'+ref.key,prior=salesRead_(path);
    if(prior&&['requested','approved'].includes(prior.state))return {message:prior.state==='requested'?'Für diesen Kunden liegt bereits ein Löschantrag vor. Er wartet auf die Freigabe durch einen Admin.':'Die Löschung ist bereits freigegeben.',deletion:salesDeleteView_(prior)};
    ref.discardOwnChanges=input?.discardOwnChanges===true;
    const check=salesDeleteBlockers_(ref);if(check.blockers.length)throw Error(salesDeleteBlockedMessage_(check.blockers));
    const now=salesNow_(),value={key:ref.key,...(ref.discardOwnChanges&&!ref.pendingDraft?{discardJobIds:check.jobs.map(j=>j.id),discardJobCount:check.jobs.length}:{}),...(check.statusPath!==undefined?{statusPath:check.statusPath}:{}),...(ref.local?{local:true}:{}),...(ref.uncertain?{uncertain:true}:{}),...(ref.pendingDraft?{pendingDraft:true}:{}),hqId:ref.hqId,draftId:ref.draftId,name:check.stored.company.name,reason,state:'requested',message:'Wartet auf Freigabe durch einen Admin.',requestedBy:user.email,...(user.uid?{requestedByUid:user.uid}:{}),requestedAt:now,revision:(prior?.revision||0)+1,log:[...(prior?.log||[]).slice(-20),{action:'requested',by:user.email,at:now,reason}]};
    salesDeleteSave_(value,check.stored);return {message:ref.uncertain?'Löschantrag gespeichert. Ein Admin muss ihn freigeben. Danach wird der Kunde sofort in der App gelöscht. Seine HQ-Übertragung war begonnen, aber nicht bestätigt: bitte in HQ prüfen, ob die Firma dort angelegt wurde.':ref.local?'Löschantrag gespeichert. Ein Admin muss ihn freigeben. Der Kunde ist noch nicht in HQ und wird nach der Freigabe sofort in der App gelöscht.':'Löschantrag gespeichert. Ein Admin muss ihn freigeben; erst dann wird der Kunde beim nächsten HQ-Abgleich in HQ und in der App gelöscht.',deletion:salesDeleteView_(value)};
  });
}
function salesDeleteAdmin_(){const user=salesUser_(true);if(!user.admin)throw Error('AUTH_DENIED: Nur ein Admin darf Löschanträge bearbeiten.');return user;}
function salesDeleteResolvedErrors_(jobs){
  if(!jobs.length)return [];const ids=new Set(jobs.map(j=>j.id)),run=salesRead_('sales_meta/sync');if(!run)return [];
  const errors=(run.errors||[]).filter(e=>!(e.kind==='write'&&ids.has(e.id)));if(errors.length===(run.errors||[]).length)return [];
  run.errors=errors;run.revision++;run.updatedAt=salesNow_();
  return [{path:'sales_meta/sync',value:run},{path:'sales_meta/lean_sync',value:salesSyncSummary_(run)}];
}
function listSalesCustomerDeletions(){
  salesDeleteAdmin_();const rows=salesList_('sales_deletions').sort((a,b)=>String(b.requestedAt).localeCompare(String(a.requestedAt)));
  const open=rows.filter(d=>['requested','approved','failed','blocked'].includes(d.state)),done=rows.filter(d=>!open.includes(d)).slice(0,20);
  return {deletions:[...open,...done].map(salesDeleteView_)};
}
function decideSalesCustomerDelete(input){
  const user=salesDeleteAdmin_();return salesLock_(()=>{
    salesAssertPrivate_();const key=input?.key!==undefined?salesKey_(String(input.key)):String(salesId_(input?.hqId)),path='sales_deletions/'+key,doc=salesRead_(path),hqId=doc?.hqId||null;
    if(!doc||doc.revision!==input.revision)throw Error('Der Löschantrag wurde inzwischen geändert. Bitte die Liste neu laden.');
    if(!['requested','failed','blocked'].includes(doc.state))throw Error('Dieser Löschantrag ist bereits entschieden.');
    const now=salesNow_();doc.revision++;doc.decidedBy=user.email;doc.decidedAt=now;
    if(input.approve!==true){doc.state='rejected';doc.message='Vom Admin abgelehnt. Der Kunde bleibt erhalten.';doc.log=[...(doc.log||[]).slice(-20),{action:'rejected',by:user.email,at:now}];salesDeleteSave_(doc,salesDeleteStatusDoc_(doc));return {message:'Löschantrag abgelehnt. Der Kunde bleibt erhalten.',deletion:salesDeleteView_(doc)};}
    let ref={hqId,draftId:doc.draftId||null,key,...(doc.pendingDraft?{pendingDraft:true}:{}),...(doc.discardJobIds?{discardJobIds:doc.discardJobIds}:{})};
    if(doc.local){
      try{ref=salesDeleteRef_('draft_'+doc.draftId);}catch(e){ref=null;doc.message=e.message;}
      if(!ref?.local){doc.state='blocked';doc.message=ref?'Der Kunde wurde inzwischen an HQ übertragen. Bitte den Löschantrag in der Kundenakte neu stellen.':doc.message;doc.log=[...(doc.log||[]).slice(-20),{action:'blocked',by:user.email,at:now}];salesDeleteSave_(doc,null);return {message:doc.message,deletion:salesDeleteView_(doc)};}
    }
    const check=salesDeleteBlockers_(ref);
    if(check.blockers.length){doc.state='blocked';doc.message=salesDeleteBlockedMessage_(check.blockers);doc.log=[...(doc.log||[]).slice(-20),{action:'blocked',by:user.email,at:now}];salesDeleteSave_(doc,check.stored);return {message:doc.message,deletion:salesDeleteView_(doc)};}
    if(check.statusPath!==undefined)doc.statusPath=check.statusPath;
    if(ref.local){doc.uncertain=!!ref.uncertain;return salesDeleteLocal_(doc,check,user,now);}
    const id=salesKey_('delete_'+hqId+'_'+doc.revision),job={id,kind:'deleteCompany',business:1,hqId,draftId:ref.draftId,name:doc.name,state:'pending',actor:user.email,...(user.uid?{actorUid:user.uid,approvedByUid:user.uid}:{}),approvedBy:user.email,requestedBy:doc.requestedBy,createdAt:now,updatedAt:now,message:'Löschung freigegeben. Wird beim nächsten HQ-Abgleich in HQ und danach in der App ausgeführt.'};
    doc.state='approved';doc.jobId=id;doc.message=job.message;doc.log=[...(doc.log||[]).slice(-20),{action:'approved',by:user.email,at:now}];
    // The customer's own unfinished creation jobs stop now, so the sync does not continue them before the deletion.
    const own=(check.jobs||[]).map(j=>({...j,state:'canceled',updatedAt:now,message:'Wegen freigegebener Kundenlöschung verworfen.'}));
    const hiddenIds=salesDeleteHide_(doc);
    salesDeleteSave_(doc,check.stored,[{path:'sales_jobs/'+id,value:job},...own.map(j=>({path:'sales_jobs/'+j.id,value:j})),...salesDeleteResolvedErrors_(own)]);
    return {message:'Löschung freigegeben. Der Kunde ist ab sofort aus der Kundenliste entfernt und wird beim nächsten HQ-Abgleich in HQ gelöscht.',deletion:salesDeleteView_(doc),hiddenIds,patch:{jobs:[job,...own].map(salesJobSummary_)}};
  });
}
/** Unsent customer: nothing exists in HQ, so the approval deletes it in Firebase right away and cancels its unsent jobs. */
function salesDeleteLocal_(doc,check,user,now){
  const draft=check.stored,ref='draft_'+draft.id;
  const jobs=check.jobs.map(j=>({...j,state:'canceled',updatedAt:now,message:'Kunde vor der HQ-Übertragung gelöscht (Admin-Freigabe). Nichts an HQ gesendet.'}));
  draft.deletedAt=now;doc.state='done';doc.completedAt=now;doc.message=(doc.uncertain?'Kunde in der App gelöscht. Seine HQ-Übertragung war begonnen, aber nicht bestätigt: bitte in HQ prüfen, ob die Firma dort angelegt wurde, und sie gegebenenfalls dort löschen':'Kunde war noch nicht in HQ und wurde in der App gelöscht')+(jobs.length?' ('+jobs.length+(jobs.length===1?' offener Auftrag':' offene Aufträge')+' verworfen).':'.');
  doc.log=[...(doc.log||[]).slice(-20),{action:'approved',by:user.email,at:now},{action:'deleted',by:user.email,at:now}];
  salesDeleteSave_(doc,draft,[...jobs.map(j=>({path:'sales_jobs/'+j.id,value:j})),...salesDeleteResolvedErrors_(jobs)]);
  salesBulkRest_('commit',{writes:[{delete:salesBulkName_('sales_communication/'+ref)}]});
  const hiddenIds=salesDeleteHide_(doc);delete doc.hidden;salesWrite_('sales_deletions/'+doc.key,doc);
  return {message:doc.message,deletion:salesDeleteView_(doc),hiddenIds,patch:{jobs:jobs.map(salesJobSummary_)}};
}
function salesDeleteApproved_(job){
  const doc=salesRead_('sales_deletions/'+salesId_(job.hqId));
  if(!doc||doc.state!=='approved'||doc.jobId!==job.id)throw Error('Keine gültige Admin-Freigabe für diese Löschung.');
  if(typeof salesAuthEnabled_==='function'&&salesAuthEnabled_()){const cfg=salesAuthConfig_();if(!job.approvedByUid||job.approvedByUid!==cfg.ownerUid)throw Error('Die Löschung wurde nicht vom Admin freigegeben.');}
  else {const owner=String(PropertiesService.getScriptProperties().getProperty('SALES_ADMIN_EMAIL')||SALES.admin).toLowerCase();if(job.approvedBy!==owner)throw Error('Die Löschung wurde nicht vom Admin freigegeben.');}
  return doc;
}
function salesDeleteHq_(job,path){
  if(job.kind!=='deleteCompany'||job.state!=='running'||!/^\/v2\/(ContactHistories|ContactPersons|Companies)\/\d+$/.test(path))throw Error('HQ-Löschziel nicht freigegeben.');
  job.writeAttempted=true;
  const r=UrlFetchApp.fetch('https://api.hellohq.io'+path,{method:'delete',headers:{Authorization:'Bearer '+revenueToken_()},muteHttpExceptions:true,followRedirects:false}),code=r.getResponseCode();
  job.lastWrite={method:'DELETE',resource:path.replace(/\/\d+/g,'/{id}'),at:salesNow_(),status:code,fields:[]};
  if(code!==404&&(code<200||code>=300))throw Error('HQ-Löschen: HTTP '+code+'. Nichts weiter gelöscht; beim nächsten Abgleich wird erneut geprüft.');
}
function salesDeleteMissing_(entity,id){try{salesOne_(entity,id);return false;}catch(e){if(/HTTP 404/.test(e.message||''))return true;throw e;}}
function salesDeleteRun_(job,verifyOnly){
  if(verifyOnly)throw Error('Löschaufträge werden nur im zentralen HQ-Abgleich geprüft.');
  const doc=salesDeleteApproved_(job),id=salesId_(job.hqId),started=Date.now(),own=rows=>{if(rows.some(r=>Number(r.companyId)!==id))throw Error('HQ-Zuordnung stimmt nicht mit dem Kunden überein.');return rows;};
  const present=!salesDeleteMissing_('Companies',id);
  if(present){
    const blockers=[['Projects','Projekt','Projekte'],['Documents','Beleg','Belege'],['PlannedRevenues','Planumsatz','Planumsätze']].map(([entity,one,many])=>{const n=own(salesCollect_(entity,'companyId eq '+id,started)).length;return n?n+' '+(n===1?one:many):'';}).filter(Boolean);
    if(blockers.length){
      job.state='canceled';job.message='In HQ nichts gelöscht. '+salesDeleteBlockedMessage_(blockers);
      doc.state='blocked';doc.message=job.message;doc.revision++;doc.log=[...(doc.log||[]).slice(-20),{action:'blocked',by:'HQ-Abgleich',at:salesNow_()}];salesDeleteRestore_(doc);salesDeleteSave_(doc,salesDeleteStatusDoc_(doc));return;
    }
  }
  // Contacts and histories go with the customer; histories first because they can reference contacts.
  const histories=own(salesCollect_('ContactHistories','companyId eq '+id,started)),contacts=own(salesCollect_('ContactPersons','companyId eq '+id,started));
  job.removed=job.removed||{contactIds:[],historyIds:[]};
  let budget=SALES_DELETE_HQ_BATCH;
  for(const [entity,rows,key] of [['ContactHistories',histories,'historyIds'],['ContactPersons',contacts,'contactIds']])for(const row of rows){
    if(budget--<=0)break;salesDeleteHq_(job,'/v2/'+entity+'/'+salesId_(row.id));if(!job.removed[key].includes(String(row.id)))job.removed[key].push(String(row.id));
  }
  const remaining=histories.length+contacts.length-SALES_DELETE_HQ_BATCH;
  if(remaining>0){job.state='pending';job.message='Löschung läuft: '+SALES_DELETE_HQ_BATCH+' Einträge in HQ gelöscht, noch '+remaining+' offen. Wird beim nächsten HQ-Abgleich fortgesetzt.';doc.message=job.message;salesDeleteSave_(doc,salesDeleteStatusDoc_(doc));return;}
  if(present){salesDeleteHq_(job,'/v2/Companies/'+id);if(!salesDeleteMissing_('Companies',id))throw Error('HQ meldet die Firma nach dem Löschen weiterhin. Beim nächsten Abgleich wird erneut geprüft.');}
  salesDeleteCleanup_(job);
  job.state='synced';job.message='Kunde in HQ und in der App gelöscht (mit '+job.removed.contactIds.length+' Ansprechpartnern und '+job.removed.historyIds.length+' Historieneinträgen).';
  const now=salesNow_();delete doc.hidden;doc.state='done';doc.message=job.message;doc.completedAt=now;doc.revision++;doc.log=[...(doc.log||[]).slice(-20),{action:'deleted',by:'HQ-Abgleich',at:now}];salesWrite_('sales_deletions/'+id,doc);
}
/** App side after HQ confirmed the deletion: dossier, directory, raw rows, compact lists and sync counters. */
function salesDeleteCleanup_(job){
  const id=salesId_(job.hqId),key=String(id),draftRef=job.draftId?'draft_'+job.draftId:null,raw={};
  for(const entity of ['ContactPersons','ContactHistories'])raw[entity]=salesDeleteRawRows_(entity,id).map(r=>String(r.id));
  const cache=salesRead_('sales_meta/bulk'),rawCompany=salesBulkGet_([salesBulkCollection_('Companies')+'/'+key])[salesBulkCollection_('Companies')+'/'+key];
  raw.Companies=rawCompany&&rawCompany.generation===cache?.entities?.Companies?.generation?[key]:[];
  const contactIds=Array.from(new Set([...job.removed.contactIds,...raw.ContactPersons])),historyIds=Array.from(new Set([...job.removed.historyIds,...raw.ContactHistories]));
  const paths=['sales_companies/'+key,'sales_directory/'+key,'sales_communication/'+key,salesBulkCollection_('Companies')+'/'+key,...contactIds.map(c=>salesBulkCollection_('ContactPersons')+'/'+c),...historyIds.map(h=>salesBulkCollection_('ContactHistories')+'/'+h)];
  if(draftRef)paths.push('sales_communication/'+draftRef);
  for(let i=0;i<paths.length;i+=100)salesBulkRest_('commit',{writes:paths.slice(i,i+100).map(p=>({delete:salesBulkName_(p)}))});
  job.removed={...job.removed,contactIds,historyIds,raw};
  if(cache){salesDeleteApplyCounts_(cache,job);salesWrite_('sales_meta/bulk',cache);}
  const names=salesRead_('sales_meta/lean_names');if(names)salesWrite_('sales_meta/lean_names',{...names,rows:names.rows.filter(c=>String(c.id)!==key&&String(c.hqId||'')!==key&&c.id!==draftRef)});
  const filters=salesRead_('sales_meta/lean_filters');if(filters)salesWrite_('sales_meta/lean_filters',{...filters,rows:filters.rows.filter(c=>String(c.id)!==key)});
  const owners=salesRead_('sales_meta/lean_testowners');if(owners?.rows?.[key]){delete owners.rows[key];salesWrite_('sales_meta/lean_testowners',owners);}
  const legacy=salesRead_('sales_meta/directory');if(legacy?.entries?.some(e=>String(e.company?.id)===key))salesWrite_('sales_meta/directory',{...legacy,entries:legacy.entries.filter(e=>String(e.company?.id)!==key)});
  const tomb=salesRead_('sales_meta/deleted_companies')||{ids:[]};if(!tomb.ids.includes(key))salesWrite_('sales_meta/deleted_companies',{ids:[...tomb.ids,key].slice(-5000)});
  if(job.draftId){
    const draft=salesRead_('sales_drafts/'+salesKey_(job.draftId));if(draft&&!draft.deletedAt){draft.deletedAt=salesNow_();delete draft.deletion;salesWrite_('sales_drafts/'+draft.id,draft);}
    for(const j of salesDeleteLocalJobs_(job.draftId))salesWrite_('sales_jobs/'+j.id,{...j,state:'canceled',updatedAt:salesNow_(),message:'Kunde gelöscht; Auftrag verworfen.'});
  }
}
/** Keeps the stored HQ counts and known IDs in line with the deleted raw rows (cache or an in-memory sync run). */
function salesDeleteApplyCounts_(target,job){
  const r=job.removed;if(!r?.raw)return;const key=String(salesId_(job.hqId));
  for(const [entity,ids] of [['Companies',[key]],['ContactPersons',r.contactIds],['ContactHistories',r.historyIds]]){
    const m=target.entities?.[entity];if(!m)continue;const drop=new Set(ids.map(String));
    for(const list of ['ids','knownIds','touchedIds'])if(Array.isArray(m[list]))m[list]=m[list].filter(x=>!drop.has(String(x)));
    if(Number.isFinite(m.count))m.count=Math.max(0,m.count-(r.raw[entity]||[]).length);
  }
  if(Array.isArray(target.companyIds))target.companyIds=target.companyIds.filter(x=>String(x)!==key);
  if(Array.isArray(target.loadedCompanyIds))target.loadedCompanyIds=target.loadedCompanyIds.filter(x=>String(x)!==key);
}
function salesDeleteFailed_(job,reason){
  job.failures=(job.failures||0)+1;const stop=job.failures>=3;
  job.state=stop?'canceled':'pending';job.message=(stop?'Löschung nach drei Fehlversuchen angehalten: ':'Löschung nicht abgeschlossen, wird beim nächsten HQ-Abgleich erneut geprüft: ')+reason;
  try{const doc=salesRead_('sales_deletions/'+salesId_(job.hqId));if(doc&&doc.jobId===job.id&&doc.state==='approved'){doc.message=job.message;if(stop){doc.state='failed';doc.revision++;doc.log=[...(doc.log||[]).slice(-20),{action:'failed',by:'HQ-Abgleich',at:salesNow_()}];salesDeleteRestore_(doc);}salesDeleteSave_(doc,salesDeleteStatusDoc_(doc));}}catch(_){}
  return job;
}

/** Spark: Google's REST endpoint validates tokens. Decoding alone NEVER authenticates. */
let salesAuthRequest_=null;
// Public releases must never fall back to the historical Google email list.
const SALES_AUTH_REQUIRE_FIREBASE=true;
const SALES_AUTH_APP_URL='https://script.google.com/a/macros/markatus.de/s/AKfycbxlNLBoZvy6SgSHHEFviByTN9bL07nb7kLzlUWaAcCs0Jmrc96lIrAyGNxUrwtevDWrFw/exec';
function salesAuthEnabled_(){const mode=PropertiesService.getScriptProperties().getProperty('SALES_AUTH_MODE');if(mode&&mode!=='firebase')throw Error('AUTH_REQUIRED: Ungültige Anmeldekonfiguration.');return mode==='firebase'||SALES_AUTH_REQUIRE_FIREBASE;}
function salesAuthConfig_(){
  const p=PropertiesService.getScriptProperties(),project=p.getProperty('FIREBASE_PROJECT_ID'),apiKey=p.getProperty('SALES_FIREBASE_WEB_API_KEY'),origin=p.getProperty('SALES_AUTH_ORIGIN');
  if(project!=='sales-markatus'||!/^AIza[\w-]{30,60}$/.test(apiKey||'')||origin!=='https://sales-markatus.firebaseapp.com')throw Error('AUTH_REQUIRED: Benutzeranmeldung noch nicht eingerichtet.');
  return {project,apiKey,origin,ownerUid:p.getProperty('SALES_AUTH_OWNER_UID'),ownerEmail:String(p.getProperty('SALES_ADMIN_EMAIL')||SALES.admin).toLowerCase()};
}
function salesAuthHash_(value){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value)).map(b=>('0'+(b&255).toString(16)).slice(-2)).join('');}
function salesAuthRandom_(){return salesAuthHash_(Utilities.getUuid()+Utilities.getUuid()+Utilities.getUuid());}
function salesAuthKey_(value){if(typeof value!=='string'||!/^[-\w]{32,128}$/.test(value))throw Error('AUTH_REQUIRED: Ungültige Anmeldung.');return value;}
function salesAuthEmail_(value){value=String(value||'').trim().toLowerCase();if(value.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(value))throw Error('Bitte eine gültige E-Mail-Adresse eingeben.');return value;}
function salesAuthDocument_(kind,id){if(!['users','sessions','attempts','invites','emails','audit'].includes(kind)||!/^[-\w]{1,128}$/.test(id))throw Error('Ungültiger Auth-Datenpfad.');return 'sales_auth'+kind+'/'+id;}
function salesAuthRead_(kind,id){
  const c=salesContext_(),path=salesAuthDocument_(kind,id),r=UrlFetchApp.fetch(pilotUrl_(c.project,path),{method:'get',headers:{Authorization:'Bearer '+c.token},muteHttpExceptions:true});
  if(r.getResponseCode()===404)return null;if(r.getResponseCode()===429){const e=Error('Der Firebase-Datenspeicher hat sein Kontingent erreicht. Bitte später erneut versuchen. Erneutes Anmelden behebt dies nicht.');e.salesQuota=true;throw e;}if(r.getResponseCode()!==200)throw Error('AUTH_REQUIRED: Freigabe momentan nicht prüfbar.');
  const doc=JSON.parse(r.getContentText());return {...JSON.parse(doc.fields.payload.stringValue),_path:path,_updateTime:doc.updateTime};
}
// Firestore TTL field for short-lived auth documents (policy on field 'ttl' in sales_authattempts/sales_authsessions).
// Grace periods keep expired sessions briefly traceable; the app itself already rejects them via expiresAt.
function salesAuthTtlField_(kind,value){
  const grace=kind==='attempts'?86400000:kind==='sessions'?7*86400000:null;
  if(grace===null||!Number.isFinite(value?.expiresAt))return {};
  return {ttl:{timestampValue:new Date(value.expiresAt+grace).toISOString()}};
}
// Spark has no TTL policies (they require billing). After a successful login, at most every 10 minutes,
// delete a bounded number of auth attempts/sessions whose 'ttl' (expiry plus grace) has passed.
// Best effort: each delete is conditional on the read updateTime; failures never affect the login.
const SALES_AUTH_CLEANUP_LIMIT=20;
function salesAuthCleanup_(){
  if(salesAuthCacheCount_('sales-auth-cleanup'))return 0;salesAuthCachePut_('sales-auth-cleanup',1,600);
  const c=salesContext_(),root=pilotUrl_(c.project,'').replace(/\/$/,''),now=Date.now(),writes=[];
  for(const kind of ['attempts','sessions']){
    const query={structuredQuery:{from:[{collectionId:'sales_auth'+kind}],where:{fieldFilter:{field:{fieldPath:'ttl'},op:'LESS_THAN',value:{timestampValue:new Date(now).toISOString()}}},limit:SALES_AUTH_CLEANUP_LIMIT}};
    const r=UrlFetchApp.fetch(root+':runQuery',{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+c.token},payload:JSON.stringify(query),muteHttpExceptions:true});
    if(r.getResponseCode()!==200)return 0;
    for(const row of JSON.parse(r.getContentText())||[]){
      const d=row?.document,rel=String(d?.name||'').split('/documents/')[1]||'',ttl=Date.parse(d?.fields?.ttl?.timestampValue||'');
      if(!new RegExp('^sales_auth'+kind+'/[-\\w]{1,128}$').test(rel)||!Number.isFinite(ttl)||ttl>=now||!d.updateTime)continue;
      writes.push({delete:d.name,currentDocument:{updateTime:d.updateTime}});
    }
  }
  if(!writes.length)return 0;
  const r=UrlFetchApp.fetch(root+':commit',{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+c.token},payload:JSON.stringify({writes}),muteHttpExceptions:true});
  return r.getResponseCode()===200?writes.length:0;
}
function salesAuthCommit_(entries,checks=[]){
  const c=salesContext_(),base='projects/'+c.project+'/databases/(default)/documents/';
  const writes=checks.map(d=>({verify:base+d._path,currentDocument:{updateTime:d._updateTime}}));
  for(const {kind,id,value,prior,create} of entries){const clean=Object.fromEntries(Object.entries(value).filter(([k])=>!k.startsWith('_')));writes.push({update:{name:base+salesAuthDocument_(kind,id),fields:{payload:{stringValue:JSON.stringify(clean)},...salesAuthTtlField_(kind,clean)}},...(prior?{currentDocument:{updateTime:prior._updateTime}}:create?{currentDocument:{exists:false}}:{})});}
  const response=UrlFetchApp.fetch(pilotUrl_(c.project,'').replace(/\/$/,'')+':commit',{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+c.token},payload:JSON.stringify({writes}),muteHttpExceptions:true,followRedirects:false});
  const code=response.getResponseCode();if(code<200||code>=300){let body;try{body=JSON.parse(response.getContentText());}catch{}const error=Error('Auth-Speicher HTTP '+code+'. Bitte erneut versuchen.');error.firestoreStatus=body?.error?.status;throw error;}
  return response.getContentText()?JSON.parse(response.getContentText()):null;
}
function salesAuthIdentity_(idToken){
  const cfg=salesAuthConfig_();if(typeof idToken!=='string'||idToken.length>10000)throw Error('AUTH_REQUIRED: Ungültige Anmeldung.');
  // Never log the response: Firebase may include confidential account fields.
  const r=UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+cfg.apiKey,{method:'post',contentType:'application/json',payload:JSON.stringify({idToken}),muteHttpExceptions:true});
  if(r.getResponseCode()!==200)throw Error('AUTH_REQUIRED: Anmeldung ungültig oder abgelaufen.');
  const users=JSON.parse(r.getContentText()).users;if(!Array.isArray(users)||users.length!==1)throw Error('AUTH_REQUIRED: Konto nicht eindeutig.');
  const u=users[0];let claims;try{claims=JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(idToken.split('.')[1])).getDataAsString());}catch{throw Error('AUTH_REQUIRED: Anmeldung ungültig.');}
  if(u.disabled||u.emailVerified!==true||claims.email_verified!==true||claims.sub!==u.localId||claims.aud!==cfg.project||claims.iss!=='https://securetoken.google.com/'+cfg.project||!Number.isFinite(claims.exp)||claims.exp<=Date.now()/1000||!Number.isFinite(claims.auth_time)||claims.auth_time<Number(u.validSince||0))throw Error('AUTH_REQUIRED: Konto unbestätigt, gesperrt oder Anmeldung widerrufen.');
  return {uid:u.localId,email:salesAuthEmail_(u.email),authTime:claims.auth_time,tokenExpiresAt:claims.exp*1000};
}
function salesAuthPrincipal_(identity,record=salesAuthRead_('users',identity.uid)){
  const cfg=salesAuthConfig_();
  if(!record||record.status!=='active'||record.email!==identity.email)throw Error('AUTH_DENIED: Zugriff nicht freigegeben.');
  const admin=identity.uid===cfg.ownerUid&&identity.email===cfg.ownerEmail;
  return {uid:identity.uid,email:identity.email,admin,permissions:salesPermissions_(record.permissions,admin),revision:record.revision,record};
}
// Script-cache guard against anonymous quota exhaustion: unknown session keys are counted per minute and,
// above the limit, rejected without any Firestore read. Recently verified sessions are never blocked by it.
const SALES_AUTH_UNKNOWN_LIMIT=40;
function salesAuthCacheCount_(key){const cache=salesCache_();try{return Number(cache?.get(key)||0)||0;}catch(_){return 0;}}
function salesAuthCachePut_(key,value,seconds){const cache=salesCache_();try{cache?.put(key,String(value),seconds);}catch(_){}}
function salesAuthVerify_(session){
  const id=salesAuthHash_(salesAuthKey_(session)),minute=Math.floor(Date.now()/60000),unknownKey='sales-auth-unknown-'+minute,knownKey='sales-auth-known-'+id;
  if(!salesAuthCacheCount_(knownKey)&&salesAuthCacheCount_(unknownKey)>=SALES_AUTH_UNKNOWN_LIMIT)throw Error('AUTH_REQUIRED: Viele ungültige Anfragen. Bitte in einer Minute erneut anmelden.');
  let entry=salesAuthRead_('sessions',id);
  if(!entry||entry.expiresAt<=Date.now()||entry.disabled){salesAuthCachePut_(unknownKey,salesAuthCacheCount_(unknownKey)+1,120);throw Error('AUTH_REQUIRED: Sitzung beendet. Bitte erneut anmelden.');}
  salesAuthCachePut_(knownKey,1,600);
  if(entry.tokenExpiresAt<Date.now()+60000)entry=(()=>{
    const current=salesAuthRead_('sessions',id);if(!current||current.expiresAt<=Date.now()||current.disabled)throw Error('AUTH_REQUIRED: Sitzung beendet.');if(current.tokenExpiresAt>=Date.now()+60000)return current;
    const r=UrlFetchApp.fetch('https://securetoken.googleapis.com/v1/token?key='+salesAuthConfig_().apiKey,{method:'post',contentType:'application/x-www-form-urlencoded',payload:'grant_type=refresh_token&refresh_token='+encodeURIComponent(current.refreshToken),muteHttpExceptions:true});
    if(r.getResponseCode()!==200)throw Error('AUTH_REQUIRED: Bitte erneut anmelden.');const refreshed=JSON.parse(r.getContentText());
    if(refreshed.user_id!==current.uid||![salesAuthConfig_().project,'539269099884'].includes(refreshed.project_id))throw Error('AUTH_REQUIRED: Anmeldung passt nicht zum Projekt.');
    const updated={...current,idToken:refreshed.id_token,refreshToken:refreshed.refresh_token,tokenExpiresAt:Date.now()+Number(refreshed.expires_in)*1000};
    try{salesAuthCommit_([{kind:'sessions',id,value:updated,prior:current}]);return updated;}
    catch(e){if(!salesAuthConflict_(e))throw e;const winner=salesAuthRead_('sessions',id);if(!winner||winner.disabled||winner.expiresAt<=Date.now()||!(winner.tokenExpiresAt>=Date.now()+60000))throw Error('AUTH_REQUIRED: Sitzung wurde gleichzeitig geändert. Bitte erneut anmelden.');return winner;}
  })();
  const identity=salesAuthIdentity_(entry.idToken);if(identity.uid!==entry.uid||identity.email!==entry.email)throw Error('AUTH_REQUIRED: Konto wurde geändert.');
  const user=salesAuthPrincipal_(identity);if(user.record.sessionEpoch!==entry.sessionEpoch)throw Error('AUTH_REQUIRED: Sitzung wurde gesperrt.');return user;
}
function getSalesLoginConfig(){return {enabled:salesAuthEnabled_(),release:SALES_RELEASE,appUrl:SALES_AUTH_APP_URL,...(salesAuthEnabled_()?{origin:salesAuthConfig_().origin}:{})};}
function beginSalesLogin(input){
  if(!salesAuthEnabled_())salesUser_(true);
  const allowed=JSON.parse(PropertiesService.getScriptProperties().getProperty('SALES_AUTH_ALLOWED_ORIGINS')||'[]');
  if(!input||!allowed.includes(input.origin)||!/^[-\w]{43}$/.test(input.challenge||'')||!/^[-\w]{32,128}$/.test(input.state||''))throw Error('AUTH_REQUIRED: Anmeldeursprung nicht freigegeben.');
  if(input.release&&input.release!==SALES_RELEASE)return {reloadRequired:true,release:SALES_RELEASE};
  // Bound anonymous writes and token-validation traffic; this is a quota guard, not an identity check.
  salesAuthThrottle_('begin',30);
  const attempt=salesAuthRandom_(),attemptId=salesAuthHash_(attempt);salesAuthCommit_([{kind:'attempts',id:attemptId,create:true,value:{origin:input.origin,challenge:input.challenge,state:input.state,expiresAt:Date.now()+5*60000}}]);
  salesAuthCachePut_('sales-auth-attempt-'+attemptId,1,360);return {attempt,origin:salesAuthConfig_().origin,release:SALES_RELEASE};
}
function salesAuthConflict_(error){return ['ABORTED','ALREADY_EXISTS','FAILED_PRECONDITION'].includes(error.firestoreStatus)||/\bHTTP (?:409|412)\b/.test(error.message||'');}
function salesAuthThrottle_(key,limit){
  // Atomic global quota guard is independent of the long business/worker script lock.
  const minute=Math.floor(Date.now()/60000),id='rate-'+key+'-'+minute,cacheKey='sales-auth-'+id;
  // Once the limit is known to be reached, reject from the script cache without another Firestore read.
  if(salesAuthCacheCount_(cacheKey)>=limit)throw Error('AUTH_REQUIRED: Zu viele Anmeldeversuche. Bitte in einer Minute erneut versuchen.');
  for(let retry=0;retry<3;retry++){
    const prior=salesAuthRead_('attempts',id),count=prior?.count||0;
    if(count>=limit){salesAuthCachePut_(cacheKey,count,120);throw Error('AUTH_REQUIRED: Zu viele Anmeldeversuche. Bitte in einer Minute erneut versuchen.');}
    try{salesAuthCommit_([{kind:'attempts',id,prior,create:!prior,value:{count:count+1,expiresAt:(minute+2)*60000}}]);salesAuthCachePut_(cacheKey,count+1,120);return;}
    catch(e){if(!salesAuthConflict_(e))throw e;}
  }
  throw Error('AUTH_REQUIRED: Viele gleichzeitige Anmeldungen. Bitte gleich erneut versuchen.');
}
function finishSalesLogin(input){
  if(input?.release&&input.release!==SALES_RELEASE)return {reloadRequired:true,release:SALES_RELEASE};
  // Cheap checks first: malformed input or an attempt this server never issued does not count against
  // the shared login limit and causes no Firestore or token traffic.
  if(typeof input?.idToken!=='string'||input.idToken.length>10000||typeof input.refreshToken!=='string'||input.refreshToken.length<20||input.refreshToken.length>10000||!/^[-\w]{32,128}$/.test(input.state||''))throw Error('AUTH_REQUIRED: Anmeldeanfrage ungültig oder abgelaufen.');
  const hash=salesAuthHash_(salesAuthKey_(input.attempt));salesAuthKey_(input.verifier);
  if(salesCache_()&&!salesAuthCacheCount_('sales-auth-attempt-'+hash))throw Error('AUTH_REQUIRED: Anmeldeanfrage ungültig oder abgelaufen. Bitte erneut anmelden.');
  salesAuthThrottle_('finish',30);
  const identity=salesAuthIdentity_(input.idToken);
  const attempt=salesAuthRead_('attempts',hash),verifier=salesAuthKey_(input?.verifier),challenge=Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,verifier)).replace(/=+$/,'');
  if(!attempt||attempt.used||attempt.expiresAt<=Date.now()||attempt.state!==input.state||attempt.challenge!==challenge||typeof input.refreshToken!=='string'||input.refreshToken.length<20||input.refreshToken.length>10000||Date.now()/1000-identity.authTime>300||identity.authTime>Date.now()/1000+60)throw Error('AUTH_REQUIRED: Anmeldeanfrage ungültig oder abgelaufen.');
  if(!salesAuthEnabled_()){
    const legacy=salesUser_(true);if(identity.email!==legacy.email)throw Error('AUTH_DENIED: Bitte mit dem bisherigen Administratorkonto anmelden.');
    if(salesAuthConfig_().ownerUid&&salesAuthConfig_().ownerUid!==identity.uid)throw Error('AUTH_DENIED: Administrator bereits gebunden.');
    if(!salesAuthRead_('users',identity.uid))salesAuthCommit_([{kind:'users',id:identity.uid,create:true,value:{uid:identity.uid,email:identity.email,status:'active',permissions:salesPermissions_({},true),revision:1,sessionEpoch:0,createdAt:salesNow_()}}]);
    PropertiesService.getScriptProperties().setProperty('SALES_AUTH_OWNER_UID',identity.uid);
  }
  let record=salesAuthRead_('users',identity.uid);
  // A previously activated account signs in with its current ACL, not its old invitation.
  if(!record&&input.invitation){salesAuthActivate_(input.invitation,identity);record=salesAuthRead_('users',identity.uid);}
  const user=salesAuthPrincipal_(identity,record),session=salesAuthRandom_(),expiresAt=Date.now()+8*3600000;
  salesAuthCommit_([{kind:'attempts',id:hash,prior:attempt,value:{used:true,expiresAt:attempt.expiresAt}},{kind:'sessions',id:salesAuthHash_(session),create:true,value:{uid:identity.uid,email:identity.email,idToken:input.idToken,refreshToken:input.refreshToken,tokenExpiresAt:identity.tokenExpiresAt,expiresAt,sessionEpoch:user.record.sessionEpoch}}],[user.record]);try{salesAuthCleanup_();}catch(_){}return {session,expiresAt,user:salesAuthPublicUser_(user)};
}
function salesAuthPublicUser_(user){return {uid:user.uid,email:user.email,admin:user.admin,permissions:user.permissions,revision:user.revision};}
function salesAuthActivate_(token,identity){
  const id=salesAuthHash_(salesAuthKey_(token)),invite=salesAuthRead_('invites',id),reservation=salesAuthRead_('emails',salesAuthHash_(identity.email));
  if(!invite||invite.used||invite.expiresAt<=Date.now()||invite.email!==identity.email||reservation?.latestInvite!==id||reservation.uid||salesAuthRead_('users',identity.uid))throw Error('AUTH_DENIED: Einladung passt nicht zu diesem bestätigten Konto.');
  salesAuthCommit_([{kind:'users',id:identity.uid,create:true,value:{uid:identity.uid,email:identity.email,status:'active',permissions:salesPermissions_(invite.permissions),revision:1,sessionEpoch:0,createdAt:salesNow_()}},{kind:'invites',id,prior:invite,value:{...invite,used:true}},{kind:'emails',id:salesAuthHash_(identity.email),prior:reservation,value:{email:identity.email,uid:identity.uid}}]);
}
function salesAuthenticatedRpc(session,method,args){
  if(!salesAuthEnabled_()||salesAuthRequest_)throw Error('AUTH_REQUIRED: Anmeldung erforderlich.');
  const user=salesAuthVerify_(session);salesAuthRequest_={user,session,method,args};
  try{return {result:salesAuthFilter_(salesAuthDispatch_(method,args),user,method),identity:salesAuthPublicUser_(user)};}finally{salesAuthRequest_=null;}
}
function salesAuthRequire_(key){const user=salesAuthRequest_?.user;if(!user||!user.admin&&!user.permissions[key])throw Error('AUTH_DENIED: Diese Aktion ist nicht freigegeben.');return user;}
function salesAuthOwner_(){const user=salesAuthRequest_?.user;if(!user?.admin)throw Error('AUTH_DENIED: Benutzerverwaltung nur für den Administrator.');return user;}

/** Explicit operation registry. Old public RPCs cannot establish an authenticated context. */
function salesAuthRule_(method,args){
  if(['listSalesChangeReviews','respondSalesChangeReview'].includes(method))return 'home.read';
  const rules={getSalesLeanState:'home.read',getSalesLeanCompany:'customers.read',getSalesLeanEdition:'magazine.read',saveSalesCompany:'company.create',saveSalesTestCompany:'company.create',saveSalesCompanyChange:'company.edit',saveSalesCommunication:'communication.create',saveSalesHistory:'communication.create',createSalesCustomerContact:'contact.create',getSalesSyncStatus:'sync.read',startSalesSync:'sync.run',pauseSalesSync:'sync.run',runSalesSyncStep:'sync.run',syncSalesLeanCompany:'sync.run',syncSalesLeanHistory:'sync.run',saveSalesLeanEditionSettings:'settings.edit',searchSalesProjects:'settings.edit',searchSalesCompanies:'sync.run',addSalesCompany:'sync.run',saveSalesEditionConfig:'settings.edit',setSalesEditionEnabled:'settings.edit',getSalesUnassigned:'sync.read',getSalesJobPreview:'sync.read',requestSalesCustomerDelete:'customers.read'};
  if(method==='getSalesLeanView')return ({home:'home.read',customers:'customers.read',magazine:'magazine.read',contacts:'directory.read',invoices:'finance.read',admin:'settings.read',import:'sync.read',new:'company.create',change:'company.edit',test:'owner'})[args[0]]||'deny';
  if(method==='getSalesEditor'&&args[0]?.entity==='catalog')return salesAuthRequest_.user.admin||salesAuthRequest_.user.permissions['company.edit']?'company.edit':'company.create';
  if(method==='getSalesEditor'||method==='saveSalesEntityChange')return args[0]?.entity==='contact'?'contact.edit':['company','address','types','customer'].includes(args[0]?.entity)?'company.edit':'deny';
  if(['getSalesJobInspection','getSalesStorageInventoryPage','getSalesTestAudit','setupSalesSyncWorker','runSalesJob','reconcileSalesJob','resolveSalesConflict','checkSalesHistoryBinding','queueSalesContactEmail','queueSalesMarkerCleanup','bindSalesCompanyResult','bindSalesCustomerContact','listSalesUsers','createSalesUserInvitation','updateSalesUser','getSalesAuthSetup','saveSalesAuthSetup','setSalesDocumentExcluded','startSalesEditionRefresh','listSalesCustomerDeletions','decideSalesCustomerDelete'].includes(method))return 'owner';
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
  if(method==='listSalesChangeReviews')return listSalesChangeReviews();
  if(method==='respondSalesChangeReview')return respondSalesChangeReview(...args);
  const methods={getSalesJobInspection,getSalesLeanState,getSalesLeanView,getSalesLeanCompany,getSalesLeanEdition,saveSalesCompany,saveSalesTestCompany,saveSalesCompanyChange,saveSalesCommunication,saveSalesHistory,createSalesCustomerContact,getSalesSyncStatus,startSalesSync,pauseSalesSync,runSalesSyncStep,syncSalesLeanCompany,syncSalesLeanHistory,saveSalesLeanEditionSettings,searchSalesProjects,searchSalesCompanies,addSalesCompany,saveSalesEditionConfig,setSalesEditionEnabled,getSalesUnassigned,getSalesJobPreview,getSalesEditor,saveSalesEntityChange,getSalesStorageInventoryPage,getSalesTestAudit,setupSalesSyncWorker,runSalesJob,reconcileSalesJob,resolveSalesConflict,checkSalesHistoryBinding,queueSalesContactEmail,queueSalesMarkerCleanup,bindSalesCompanyResult,bindSalesCustomerContact,listSalesUsers,createSalesUserInvitation,updateSalesUser,logoutSalesUser,getSalesAuthSetup,saveSalesAuthSetup,setSalesDocumentExcluded,startSalesEditionRefresh,requestSalesCustomerDelete,listSalesCustomerDeletions,decideSalesCustomerDelete};
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
      if(k==='patch'&&!user.permissions['sync.read']){out.patch={};if(v?.localCompany)out.patch.localCompany=project(v.localCompany,'company');if(v?.draft&&['saveSalesCompany','saveSalesEntityChange'].includes(method))out.patch.draft=project(v.draft,'draft');continue;}
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
  const cfg=salesAuthConfig_();
  for(const a of job.editAuthors||[]){
    const editor=salesAuthRead_('users',a.uid);
    if(!editor||editor.status!=='active'||editor.email!==a.email||a.uid!==cfg.ownerUid&&((a.permissions||[]).some(p=>!salesPermissions_(editor.permissions)[p])||a.financial&&!editor.permissions['finance.read']))throw Error('Bearbeiter oder Änderungsrecht inzwischen gesperrt. Anlageauftrag angehalten.');
  }
  if(!job.actorUid){if(job.actor===cfg.ownerEmail||job.createdBy===cfg.ownerEmail)return;throw Error('Bisheriger Auftrag benötigt Administratorprüfung der Autorenzuordnung.');}
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

// Shared by the browser, Apps Script and the authentication service.
const SALES_PERMISSION_CATALOG = Object.freeze([
  ['home.read','Mein Tag','Bereiche'],['customers.read','Kunden','Bereiche'],
  ['magazine.read','Magazinverkauf','Bereiche'],['directory.read','Adressbuch aller Ansprechpartner','Bereiche'],
  ['finance.read','Buchungen, Rechnungen und Umsätze','Bereiche'],['projects.read','Kundenprojekte','Bereiche'],
  ['sync.read','Datenabgleich ansehen','Bereiche'],['sync.run','Datenabgleich ausführen und anhalten','Bereiche'],
  ['settings.read','Fachliche Verwaltung ansehen','Bereiche'],['settings.edit','Ausgabeziele und Termine ändern','Bereiche'],
  ['company.read','Firmendaten lesen','Firmen'],['company.create','Firma hinzufügen','Firmen'],['company.edit','Firmendaten und Adressen ändern','Firmen'],
  ['contact.read','Ansprechpartner lesen','Ansprechpartner'],['contact.create','Ansprechpartner hinzufügen','Ansprechpartner'],['contact.edit','Ansprechpartner ändern','Ansprechpartner'],
  ['communication.read','Kommunikation lesen','Kommunikation'],['communication.create','Gespräch / Nicht erreicht hinzufügen','Kommunikation']
]);
const SALES_PERMISSION_BASE = Object.freeze(['home.read','customers.read','company.read','contact.read','communication.read']);
function salesPermissions_(input,owner=false){
  if(input!==undefined&&(!input||typeof input!=='object'||Array.isArray(input)))throw Error('Ungültige Rechte.');
  const known=new Set(SALES_PERMISSION_CATALOG.map(p=>p[0]));
  for(const [key,value] of Object.entries(input||{}))if(!known.has(key)||typeof value!=='boolean')throw Error('Unbekanntes oder ungültiges Recht: '+key);
  const out=Object.fromEntries(SALES_PERMISSION_CATALOG.map(([key])=>[key,owner||SALES_PERMISSION_BASE.includes(key)||input?.[key]===true]));
  for(const [write,read] of [['sync.run','sync.read'],['settings.edit','settings.read'],['company.create','company.read'],['company.edit','company.read'],['contact.create','contact.read'],['contact.edit','contact.read'],['communication.create','communication.read']])if(out[write])out[read]=true;
  return out;
}
if(typeof module!=='undefined'&&module.exports)module.exports={SALES_PERMISSION_CATALOG,SALES_PERMISSION_BASE,salesPermissions_};
