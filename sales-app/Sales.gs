/** Sales pilot. All public RPCs authenticate. HQ write targets derive only from server-created jobs. */
const SALES = Object.freeze({admin:'pp@markatus.de', edition:'coburger-70', projectNumber:'250334', projectName:'COBURGER Ausgabe #70', maxMs:210000});
const SALES_RELEASE = '2026-09-25-r5';
let salesContextCache_;

function salesUser_(admin) {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const p = PropertiesService.getScriptProperties();
  const owner = String(p.getProperty('SALES_ADMIN_EMAIL') || SALES.admin).toLowerCase();
  const allowed = String(p.getProperty('SALES_ALLOWED_EMAILS') || owner).split(',').map(x=>x.trim().toLowerCase());
  if (!email || !allowed.includes(email) || (admin && email !== owner)) throw new Error('Zugriff nicht freigegeben. Bitte mit einem ausdrücklich freigegebenen Google-Konto anmelden.');
  return {email,admin:email===owner};
}
function salesPage_() {
  try {salesUser_();} catch (_) {return HtmlService.createHtmlOutput('<!doctype html><html lang="de"><meta charset="utf-8"><h1>Zugriff nicht freigegeben</h1><p>Bitte diese App mit deinem freigegebenen Google-Konto öffnen. Wenn Google deine Identität nicht übermittelt, muss die Bereitstellung geprüft werden.</p></html>');}
  return HtmlService.createHtmlOutputFromFile('Sales').setTitle('Sales Markatus').addMetaTag('viewport','width=device-width, initial-scale=1');
}
function salesContext_() {
  if (salesContextCache_) return salesContextCache_;
  const p=PropertiesService.getScriptProperties(), project=p.getProperty('FIREBASE_PROJECT_ID');
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project || '')) throw new Error('Firebase-Projekt fehlt.');
  let account; try {account=JSON.parse(p.getProperty('FIREBASE_SERVICE_ACCOUNT_JSON') || '{}');} catch (_) {throw new Error('Firebase-Dienstkonto ungültig.');}
  if (account.project_id!==project || account.type!=='service_account' || !account.private_key) throw new Error('Firebase-Dienstkonto passt nicht zum Projekt.');
  salesContextCache_={project,token:pilotGoogleToken_(account)};
  return salesContextCache_;
}
function salesPath_(path) {if (!/^sales_[a-z]+\/[a-zA-Z0-9_-]+$/.test(path)) throw new Error('Ungültiger Datenpfad.'); return path;}
function salesRead_(path) {
  const c=salesContext_(), raw=pilotReadDocument_(c.project,salesPath_(path),c.token);
  return raw ? JSON.parse(raw.payload) : null;
}
function salesWrite_(path,value) {
  const c=salesContext_(), payload=JSON.stringify(value);
  if (Utilities.newBlob(payload).getBytes().length>750000) throw new Error('Datenpaket zu groß. Import muss weiter aufgeteilt werden; bisheriger Stand bleibt erhalten.');
  pilotWriteDocument_(c.project,salesPath_(path),{payload},c.token);
}
function salesList_(collection) {
  if (!/^sales_(jobs|drafts|editions)$/.test(collection)) throw new Error('Ungültige Sammlung.');
  const c=salesContext_(), result=[];let next='';
  for (let i=0;i<20;i++) {
    const page=pilotCall_(pilotUrl_(c.project,collection)+'?pageSize=100'+(next?'&pageToken='+encodeURIComponent(next):''),{method:'get',headers:{Authorization:'Bearer '+c.token}});
    (page.documents||[]).forEach(d=>result.push(JSON.parse(d.fields.payload.stringValue)));
    next=page.nextPageToken;if (!next) return result;
  }
  throw new Error('Zu viele Datensätze für diesen Pilotabruf.');
}
function salesLock_(fn) {const l=LockService.getScriptLock();if (!l.tryLock(1000)) throw new Error('Ein Speichervorgang läuft. Bitte gleich erneut versuchen.');try{return fn();}finally{l.releaseLock();}}
function salesNow_() {return new Date().toISOString();}
function salesId_(value) {const id=Number(value);if (!Number.isSafeInteger(id)||id<=0) throw new Error('Ungültige HQ-ID.');return id;}
function salesText_(value,max,required) {if (typeof value!=='string') value='';value=value.trim();if (value.length>max || (required&&!value)) throw new Error('Pflichtfeld fehlt oder Eingabe ist zu lang.');return value;}
function salesKey_(value) {if (!/^[a-zA-Z0-9_-]{1,100}$/.test(value||'')) throw new Error('Ungültige Datensatzkennung.');return value;}
function salesPick_(value,keys) {const out={};keys.forEach(k=>{if(value&&value[k]!==undefined) out[k]=value[k];});return out;}
function salesHqGet_(path) {
  if (!/^\/v2\/(Companies|CompanyTypes|ContactPersons|ContactHistories|Projects|Documents|PlannedRevenues|Users|Subsystems)(\/\d+|\/CustomFieldDefinitions)?(\?[^#\r\n]*)?$/.test(path)&&!/^\/v2\/Companies\/\d+\/Addresses$/.test(path)) throw new Error('HQ-Lesepfad nicht freigegeben.');
  const r=UrlFetchApp.fetch('https://api.hellohq.io'+path,{method:'get',headers:{Authorization:'Bearer '+revenueToken_(),Accept:'application/json'},followRedirects:false,muteHttpExceptions:true});
  if(r.getResponseCode()!==200) throw new Error('HQ-Lesetest: HTTP '+r.getResponseCode()+'. Kein unvollständiger Import wird freigegeben.');
  let data;try{data=JSON.parse(r.getContentText());}catch(_){throw new Error('HQ liefert kein gültiges JSON.');}
  return {data,headers:r.getAllHeaders()};
}
function salesCollect_(entity,filter,started,expand) {
  const rows=[],seen={};
  for(let page=0;page<50;page++) {
    if(Date.now()-started>SALES.maxMs) throw new Error('Zeitbudget erreicht. Bitte einen kleineren Lesetest ausführen.');
    // PlannedRevenues documents $filter/$top/$skip; the established entities use the existing query form.
    const prefix=entity==='PlannedRevenues'?'$':'';
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
  for(const path of ['sales_editions/'+SALES.edition,'sales_jobs/security-probe','sales_companies/security-probe']) {
    const r=UrlFetchApp.fetch(pilotUrl_(c.project,path),{method:'get',muteHttpExceptions:true,followRedirects:false});
    if(![401,403].includes(r.getResponseCode())) throw new Error('Firestore-Schutz für die App-Daten fehlt. Import angehalten.');
  }
}

function getSalesState() {
  const user=salesUser_(), edition=salesRead_('sales_editions/'+SALES.edition), catalog=salesRead_('sales_meta/catalog');
  const drafts=salesList_('sales_drafts');
  return {release:SALES_RELEASE,user,edition,catalog,drafts,jobs:salesList_('sales_jobs').map(salesJobSummary_),access:user.admin?salesAccess_():null};
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
    const defs=salesHqGet_('/v2/Companies/CustomFieldDefinitions').data;
    const fields=(Array.isArray(defs)?defs:defs.data||[]).filter(x=>['Kundenklassifizierung','Kundenherkunft','Adressherkunft'].includes(x.name)).map(x=>salesPick_(x,['name','type','options','values']));
    // HQ v2 models both as strings and exposes no separate catalog endpoints.
    // Read the values actually used in this tenant; only distinct labels reach Firebase.
    const industries=Array.from(new Set(salesCollect_('Companies','',started).map(x=>String(x.industrialSector||'').trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'de'));
    const salutations=Array.from(new Set(salesCollect_('ContactPersons','',started).map(x=>String(x.salutation||'').trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'de'));
    salesWrite_('sales_meta/catalog',{users,types,subsystems,fields,industries,salutations,updatedAt:salesNow_()});return {message:'Auswahllisten einschließlich Branchen und Anreden aus HQ nach Firebase übertragen. Jetzt erneut aus Firebase laden.',industries:industries.length,salutations:salutations.length};});
}
function salesWebsiteInput_(value) {
  const raw=salesText_(value,500,false);if(!raw)return '';
  const result=/^https?:\/\//i.test(raw)?raw:'https://'+raw;
  if(!/^https?:\/\/[^\s@/:?#]+\.[^\s@/:?#]{2,}(?::\d{1,5})?(?:[/?#][^\s]*)?$/i.test(result)) throw new Error('Homepage bitte als Domain wie test.de oder vollständige https-Adresse eingeben.');
  return result;
}
function salesCompany_(raw) {
  const pickAddress=a=>a?salesPick_(a,['id','street','houseNumber','zipCode','city','country','description','standardForDocumentType','website']):null;
  const website=salesWebsite_(raw);
  return {id:String(salesId_(raw.id)),name:raw.name||'',industrialSector:raw.industrialSector||'',description:raw.description||'',homepage:raw.homepage||'',
    homepageDisplay:website.value,homepageSource:website.source,
    companyTypes:(raw.companyTypes||[]).map(x=>salesPick_(x,['companyTypeId','name','number'])),responsibleUsers:(raw.responsibleUsers||[]).map(x=>salesPick_(x,['id','userId','firstName','lastName'])),
    defaultAddress:pickAddress(raw.defaultAddress),addresses:(raw.addresses||[]).map(pickAddress),customFields:(raw.customFields||[]).filter(x=>['Kundenklassifizierung','Kundenherkunft','Adressherkunft'].includes(x.name)).map(x=>salesPick_(x,['name','type','value'])),updatedOn:raw.updatedOn||null};
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
  const row=salesPick_(raw,['id','companyId','projectId','contactPersonId','userId','reason','content','contactOn','nextContactDate','contactHistoryChannel','contactHistoryStatus','updatedOn']);
  const reason=String(raw.reason||''),content=String(raw.content||''),channel=raw.contactHistoryChannel;
  row.documentDispatch=channel==='SentDocument'||(channel==='Mail'&&/\b(rechnung|invoice|gutschrift|credit note)\b/i.test(reason));
  if(!row.documentDispatch) return row;
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
  if(candidates.length!==1) {row.documentMatch=candidates.length?'ambiguous':'missing';return row;}
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
  salesUser_();id=String(salesId_(id));const edition=salesRead_('sales_editions/'+SALES.edition),drafts=salesList_('sales_drafts');
  if(!edition?.companies.some(c=>c.id===id)&&!drafts.some(d=>String(d.hqId)===id)) throw new Error('Firma gehört nicht zum freigegebenen Pilotbestand.');
  return salesRead_('sales_companies/'+id);
}
function syncSalesCompany(id) {
  salesUser_(true);id=String(salesId_(id));return salesLock_(()=>{
    const edition=salesRead_('sales_editions/'+SALES.edition),drafts=salesList_('sales_drafts');
    if(!edition?.companies.some(c=>c.id===id)&&!drafts.some(d=>String(d.hqId)===id&&d.testOnly)) throw new Error('Firma gehört nicht zum Pilotbestand.');
    salesAssertPrivate_();const started=Date.now(),company=salesCompany_(salesOne_('Companies',id));
    const contacts=salesCollect_('ContactPersons','companyId eq '+id,started),histories=salesCollect_('ContactHistories','companyId eq '+id,started),projects=salesCollect_('Projects','companyId eq '+id,started);
    if([...contacts,...histories,...projects].some(x=>Number(x.companyId)!==Number(id))) throw new Error('HQ-Firmenfilter wurde nicht eingehalten.');
    const customerDocuments=salesCollect_('Documents','companyId eq '+id,started);
    if(customerDocuments.some(d=>Number(d.companyId)!==Number(id))) throw new Error('HQ-Belegempfänger stimmt nicht mit der Firma überein.');
    const projectById={};projects.forEach(p=>{projectById[String(p.id)]=p;});
    // Shared magazine projects need not have this company as their direct client.
    const historyRows=histories.map(x=>salesHistory_(x,customerDocuments,projectById));
    const relatedIds=Array.from(new Set(historyRows.filter(h=>h.documentDispatch).map(h=>h.invoice?.projectId||h.projectId).filter(Boolean).map(pid=>String(salesId_(pid)))));
    relatedIds.forEach(pid=>{if(!projectById[pid]) {if(Date.now()-started>SALES.maxMs) throw new Error('Zeitbudget erreicht.');projectById[pid]=salesOne_('Projects',pid);}});
    historyRows.forEach(h=>{if(h.documentDispatch) h.projectName=projectById[String(h.invoice?.projectId||h.projectId)]?.name||'';});
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
    const value={company,contacts:contacts.map(x=>salesPick_(x,['id','companyId','firstName','lastName','position','salutation','eMail','phoneMobile','phoneLandline','updatedOn'])),histories:historyRows,projects:projectRows,detailVersion:3,loadedAt:salesNow_()};
    salesWrite_('sales_companies/'+id,value);return {message:'Firmendetails nach Firebase übertragen. Jetzt erneut aus Firebase laden.'};});
}
function saveSalesEditionSettings(input) {
  const user=salesUser_();return salesLock_(()=>{const e=salesRead_('sales_editions/'+SALES.edition);if(!e) throw new Error('Zuerst Ausgabe importieren.');
    if(Number(input.revision)!==e.settings.revision) throw new Error('Ziel oder Termine wurden inzwischen geändert. Bitte neu laden und vergleichen.');
    const target=Number(input.target);if(!Number.isFinite(target)||target<0||target>100000000) throw new Error('Zielumsatz ungültig.');
    const settings={targetCents:Math.round(target*100),revision:e.settings.revision+1};
    ['adDeadline','printDate','releaseDate'].forEach(k=>{const v=salesText_(input[k],10,false);if(v&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)) throw new Error('Ungültiges Datum.');settings[k]=v;});
    if(settings.adDeadline&&settings.printDate&&settings.adDeadline>settings.printDate || settings.printDate&&settings.releaseDate&&settings.printDate>settings.releaseDate) throw new Error('Termine müssen in zeitlicher Reihenfolge liegen.');
    e.changes=[{at:salesNow_(),actor:user.email,before:e.settings,after:settings}].concat(e.changes||[]).slice(0,50);e.settings=settings;salesWrite_('sales_editions/'+SALES.edition,e);return {message:'Ziel und Termine für alle Nutzer gespeichert.'};});
}

function salesJobSummary_(j) {return salesPick_(j,['id','kind','draftId','name','state','createdAt','updatedAt','message','hqId','conflict']);}
function salesDraftInput_(input,catalog) {
  const name=salesText_(input.name,150,true);
  if(!/^TEST[ -]/i.test(name)) throw new Error('Schreibtests müssen mit TEST beginnen.');
  const typeName=input.kind==='Kunde'?'Kunde':'Interessent',type=catalog.types.find(t=>t.name.toLowerCase()===typeName.toLowerCase());
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
  if(industry&&!(catalog.industries||[]).includes(industry)) throw new Error('Bitte eine Branche aus der aktuellen HQ-Auswahlliste wählen.');
  const company={name,industrialSector:industry,homepage,description:salesText_(input.description,5000,false),defaultAddress:address,companyTypes:[{companyTypeId:type.id}],responsibleUserIds:[userId],subsystemIds:[subsystemId]};
  const customFields=[];['Kundenklassifizierung','Kundenherkunft'].forEach(k=>{const value=salesText_(input[k],200,false);if(value){const def=catalog.fields.find(f=>f.name===k);if(!def) throw new Error('HQ-Feld '+k+' ist noch nicht bestätigt.');customFields.push({name:k,type:def.type,value});}});
  if(customFields.length) company.customFields=customFields;
  let contact=null;if(input.firstName||input.lastName) {contact={};['firstName','lastName','position','salutation','eMail','phoneMobile','phoneLandline'].forEach(k=>contact[k]=salesText_(input[k],200,false));if(contact.salutation&&!(catalog.salutations||[]).includes(contact.salutation)) throw new Error('Bitte eine Anrede aus der aktuellen HQ-Auswahlliste wählen.');}
  return {company,contact,kind:typeName,addressOrigin:origin,addressOriginOther:origin==='Sonstige'?originOther:''};
}
function saveSalesTestCompany(input) {
  const user=salesUser_();return salesLock_(()=>{salesAssertPrivate_();const cat=salesRead_('sales_meta/catalog');if(!cat) throw new Error('Zuerst HQ-Auswahllisten importieren.');
    const value=salesDraftInput_(input,cat),id=Utilities.getUuid(),draft={id,testOnly:true,createdBy:user.email,createdAt:salesNow_(),...value,hqId:null};
    salesWrite_('sales_drafts/'+id,draft);
    const job={id,kind:'createCompany',draftId:id,name:value.company.name,state:'pending',createdAt:salesNow_(),updatedAt:salesNow_(),steps:{},message:'In Firebase gespeichert. HQ wurde noch nicht verändert.'};
    salesWrite_('sales_jobs/'+id,job);return {id,message:job.message};});
}
function getSalesJobPreview(id) {
  salesUser_();const job=salesRead_('sales_jobs/'+salesKey_(id));if(!job) throw new Error('Auftrag fehlt.');const d=salesRead_('sales_drafts/'+job.draftId);
  return {job:salesJobSummary_(job),company:d.company,contact:d.contact,addressOrigin:d.addressOrigin,addressOriginOther:d.addressOriginOther,history:job.history||null,change:job.kind==='cleanupMarker'?{description:d.company.description,operation:'Technische Kennzeichnung nach Prüfung entfernen'}:job.change||null,note:'HQ-Ziel ausschließlich eigene Testfirma. Adressherkunft bleibt vorerst in Firebase. Kein Projekt-/Rechnungsschreibzugriff.'};
}
function getSalesTestAudit(id) {
  salesUser_(true);const d=salesRead_('sales_drafts/'+salesKey_(id));
  if(!d?.testOnly||!d.hqId||!/^TEST[ -]/i.test(d.company.name)) throw new Error('Nur eine eigene bestätigte Testfirma kann geprüft werden.');
  const actual=salesOne_('Companies',d.hqId),stored=salesRead_('sales_companies/'+d.hqId),website=salesWebsite_(actual),job=salesRead_('sales_jobs/'+d.id);
  if(actual.name!==d.company.name) throw new Error('HQ-Ziel ist nicht mehr die eigene Testfirma.');
  let contactStatus=d.contact?'Noch nicht in HQ bestätigt':'Kein Ansprechpartner im Entwurf gespeichert.';
  if(d.contact&&job?.contactId){const contact=salesOne_('ContactPersons',job.contactId);contactStatus=Number(contact.companyId)===Number(d.hqId)&&salesEqualFields_(contact,d.contact)?'In HQ bestätigt':'HQ-Kontakt weicht vom Entwurf ab.';}
  else if(d.contact&&job?.contactAttempted)contactStatus='Schreibversuch unklar: vor erneutem Anlegen Auftrag prüfen.';
  return {draftHomepage:d.company.homepage||'',hqHomepage:actual.homepage||'',hqAddressWebsite:actual.defaultAddress?.website||'',appHomepage:stored?.company?.homepageDisplay||'',displayHomepage:website.value,displaySource:website.source,
    markerPresent:String(actual.description||'').includes('[Sales-Test '+d.id+']'),detailVersion:stored?.detailVersion||null,creationState:job?.state||'Auftrag fehlt',contactStatus};
}
function queueSalesMarkerCleanup(id) {
  const user=salesUser_(true);return salesLock_(()=>{
    const d=salesRead_('sales_drafts/'+salesKey_(id));if(!d?.testOnly||!d.hqId||!/^TEST[ -]/i.test(d.company.name)) throw new Error('Nur die eigene bestätigte Testfirma kann bereinigt werden.');
    const creation=salesRead_('sales_jobs/'+d.id);if(creation?.state!=='synced') throw new Error('Firmenanlage muss zuerst vollständig bestätigt sein.');
    const actual=salesOne_('Companies',d.hqId),marker='[Sales-Test '+d.id+']';
    if(actual.name!==d.company.name||String(actual.description||'').replace(/\r\n/g,'\n')!==[d.company.description,marker].filter(Boolean).join('\n')) throw new Error('Technische Kennzeichnung fehlt oder Beschreibung wurde verändert.');
    const existing=salesList_('sales_jobs').find(j=>j.kind==='cleanupMarker'&&j.draftId===d.id&&!['synced','canceled'].includes(j.state));
    if(existing) return {id:existing.id,message:'Bereinigungsauftrag ist bereits vorhanden. Bitte ansehen.'};
    const job={id:Utilities.getUuid(),kind:'cleanupMarker',draftId:d.id,hqId:d.hqId,name:d.company.name,state:'pending',createdAt:salesNow_(),updatedAt:salesNow_(),actor:user.email,message:'Beschreibung bereinigen: Auftrag prüfen, dann bewusst nach HQ übertragen.'};
    salesWrite_('sales_jobs/'+job.id,job);return {id:job.id,message:job.message};
  });
}
function salesCompanyPut_(actual) {return salesPick_(actual,['name','industrialSector','description','homepage','iban','bic','vatId','financesChargeRateId','standardDeliveryConditionId','standardPaymentConditionId','debitorNumber','creditorNumber','documentDefaultMailEntityId','routingId','eInvoiceType']);}
function salesCleanMarker_(job,draft) {
  const actual=salesOne_('Companies',job.hqId),desired=draft.company.description,marked=[desired,'[Sales-Test '+draft.id+']'].filter(Boolean).join('\n');
  if(actual.name!==draft.company.name) throw new Error('Testfirma stimmt nicht mit dem HQ-Ziel überein.');
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
  // Never accept an arbitrary destination or payload from the browser.
  if(job.state!=='running') throw new Error('Kein laufender Auftrag.');
  const allowed=job.kind==='createCompany'&&((!job.hqId&&path==='/v2/Companies'&&method==='post')||(job.hqId&&path==='/v2/ContactPersons'&&method==='post'&&Number(body.companyId)===Number(job.hqId))) ||
    ['createCompany','cleanupMarker'].includes(job.kind)&&job.hqId&&path==='/v2/Companies/'+job.hqId&&method==='put'&&body.name===salesRead_('sales_drafts/'+job.draftId)?.company?.name&&body.description===salesRead_('sales_drafts/'+job.draftId)?.company?.description ||
    job.kind==='history'&&method==='post'&&path==='/v2/ContactHistories'&&Number(body.companyId)===Number(job.hqId) ||
    job.kind==='companyChange'&&method==='put'&&(path==='/v2/Companies/'+job.hqId||job.addressId&&path==='/v2/Companies/'+job.hqId+'/Addresses/'+job.addressId&&body.website===job.change.homepage);
  if(!allowed) throw new Error('Dieser HQ-Schreibpfad ist gesperrt.');
  const draft=salesRead_('sales_drafts/'+job.draftId);
  if(!draft||!draft.testOnly||!/^TEST[ -]/i.test(draft.company.name)||job.hqId&&Number(draft.hqId)!==Number(job.hqId)) throw new Error('HQ-Schreibziel ist keine selbst angelegte Testfirma.');
  job.writeAttempted=true;job.phaseWriteAttempted=true;salesWrite_('sales_jobs/'+job.id,job);
  const r=UrlFetchApp.fetch('https://api.hellohq.io'+path,{method,contentType:'application/json',headers:{Authorization:'Bearer '+revenueToken_()},payload:JSON.stringify(body),muteHttpExceptions:true,followRedirects:false});
  if(r.getResponseCode()<200||r.getResponseCode()>=300) throw new Error('HQ-Schreibversuch HTTP '+r.getResponseCode()+'. Ausgang vor Wiederholung prüfen.');
  return r.getContentText()?JSON.parse(r.getContentText()):null;
}
function salesEqualFields_(actual,expected) {
  return Object.keys(expected).every(k=>{const v=expected[k];if(v&&typeof v==='object') return JSON.stringify(actual[k])===JSON.stringify(v);return String(actual[k]??'')===String(v??'');});
}
function runSalesJob(id) {
  salesUser_(true);return salesLock_(()=>{salesAssertPrivate_();const job=salesRead_('sales_jobs/'+salesKey_(id));if(!job) throw new Error('Auftrag fehlt.');
    if(job.state==='synced') return {message:'Bereits synchronisiert. Keine erneute Anlage.'};
    if(!['pending','ready','companyCreated','contactCreated'].includes(job.state)) throw new Error('Auftrag ist gesperrt. Unklaren Ausgang oder Konflikt zuerst prüfen.');
    const draft=salesRead_('sales_drafts/'+job.draftId);if(!draft?.testOnly) throw new Error('Testfirma fehlt.');
    const priorState=job.state;
    job.state='running';job.phaseWriteAttempted=false;job.updatedAt=salesNow_();job.message='Übertragung gestartet.';salesWrite_('sales_jobs/'+id,job);
    try {
      if(job.kind==='createCompany') salesRunCreate_(job,draft);
      else if(job.kind==='history') salesRunHistory_(job,draft);
      else if(job.kind==='companyChange') salesRunChange_(job,draft);
      else if(job.kind==='cleanupMarker') salesRunMarkerCleanup_(job,draft);
      else throw new Error('Unbekannter Auftrag.');
      if(job.state==='running') {job.state='synced';job.message='HQ zurückgelesen; Übertragung bestätigt.';}
    }catch(e) {
      if(job.kind==='companyChange'&&!job.writeAttempted) {job.state='pending';job.message=e.message||'HQ-Ziel konnte vor dem Schreiben nicht geprüft werden.';}
      else if(job.kind==='createCompany'&&['ready','companyCreated','contactCreated'].includes(priorState)&&job.state==='running'&&!job.phaseWriteAttempted) {job.state=priorState;job.message='HQ-Rückprüfung noch offen: '+(e.message||'Bitte später erneut prüfen.');}
      else {job.state='uncertain';job.message='Übertragung oder Rückprüfung nicht vollständig bestätigt: '+(e.message||'Unbekannter Fehler')+'. Nicht erneut anlegen; zuerst HQ-Ergebnis prüfen.';}
    }
    job.updatedAt=salesNow_();salesWrite_('sales_jobs/'+id,job);return salesJobSummary_(job);});
}
function salesRunCreate_(job,draft) {
  if(!job.hqId) {
    // Marker persists in HQ for reconciliation after a lost response; no arbitrary name-based adoption.
    const marker='[Sales-Test '+job.id+']';job.marker=marker;salesWrite_('sales_jobs/'+job.id,job);
    const payload=Object.assign({},draft.company,{description:[draft.company.description,marker].filter(Boolean).join('\n')});
    const result=salesWriteHq_(job,'/v2/Companies','post',payload);job.hqId=salesId_(result&&result.id);draft.hqId=job.hqId;
    salesWrite_('sales_drafts/'+draft.id,draft);salesWrite_('sales_jobs/'+job.id,job);
    job.state='companyCreated';job.message='Firma in HQ angelegt. Nach kurzer Wartezeit Firma prüfen und Ansprechpartner getrennt anlegen.';return;
  }
  const actual=salesOne_('Companies',job.hqId);
  if(actual.name!==draft.company.name||![draft.company.description,[draft.company.description,'[Sales-Test '+job.id+']'].filter(Boolean).join('\n')].includes(String(actual.description||'').replace(/\r\n/g,'\n'))) throw new Error('Firmenname oder Testkennung stimmen in HQ nicht mit diesem Auftrag überein.');
  if(!salesEqualFields_(actual,salesPick_(draft.company,['industrialSector']))) throw new Error('Branche der Firma wurde in HQ noch nicht bestätigt.');
  if(!salesHomepageConfirmed_(actual,draft.company.homepage)) throw new Error('Homepage der Firma wurde in HQ noch nicht bestätigt.');
  if(!salesEqualFields_(actual.defaultAddress||{},salesPick_(draft.company.defaultAddress,['street','houseNumber','zipCode','city','country','website']))) throw new Error('Standardadresse der Firma wurde in HQ noch nicht vollständig bestätigt.');
  if(!(actual.companyTypes||[]).some(t=>Number(t.companyTypeId)===Number(draft.company.companyTypes[0].companyTypeId))) throw new Error('Firmenart wurde in HQ noch nicht bestätigt.');
  if(!(actual.responsibleUsers||[]).some(u=>Number(u.userId||u.id)===Number(draft.company.responsibleUserIds[0]))) throw new Error('Verantwortlicher HQ-Benutzer wurde noch nicht bestätigt.');
  if(!(actual.subsystems||[]).some(s=>Number(s.id)===Number(draft.company.subsystemIds[0]))) throw new Error('HQ-Unternehmensbereich wurde noch nicht bestätigt.');
  if((draft.company.customFields||[]).some(f=>!(actual.customFields||[]).some(a=>a.name===f.name&&String(a.value)===String(f.value)))) throw new Error('Eigene Felder stimmen nicht überein.');
  job.steps.company=true;salesWrite_('sales_jobs/'+job.id,job);
  if(draft.contact&&!job.steps.contact&&!job.contactId) {
    // Persist intent before the POST. A timeout cannot cause an automatic duplicate.
    job.contactAttempted=true;salesWrite_('sales_jobs/'+job.id,job);
    const payload=Object.assign({},draft.contact,{companyId:job.hqId,note:'[Sales-Test '+job.id+']'});
    const result=salesWriteHq_(job,'/v2/ContactPersons','post',payload);job.contactId=salesId_(result&&result.id);salesWrite_('sales_jobs/'+job.id,job);
    job.state='contactCreated';job.message='Ansprechpartner in HQ angelegt. Nach kurzer Wartezeit prüfen und Beschreibung bereinigen.';return;
  }
  if(draft.contact&&!job.steps.contact){const contact=salesOne_('ContactPersons',job.contactId);if(Number(contact.companyId)!==Number(job.hqId)||!salesEqualFields_(contact,draft.contact)) throw new Error('Ansprechpartner wurde in HQ noch nicht vollständig bestätigt.');job.steps.contact=true;salesWrite_('sales_jobs/'+job.id,job);}
  salesCleanMarker_(job,draft);
  job.steps.descriptionClean=true;salesWrite_('sales_jobs/'+job.id,job);
  const cleanCompany=salesOne_('Companies',job.hqId);
  if(!salesHomepageConfirmed_(cleanCompany,draft.company.homepage)||!salesEqualFields_(cleanCompany.defaultAddress||{},draft.company.defaultAddress)) throw new Error('Homepage nach Bereinigung in HQ nicht mehr bestätigt.');
  salesWrite_('sales_companies/'+job.hqId,{company:salesCompany_(cleanCompany),contacts:job.contactId?[salesPick_(salesOne_('ContactPersons',job.contactId),['id','companyId','firstName','lastName','position','salutation','eMail','phoneMobile','phoneLandline'])]:[],histories:[],projects:[],detailVersion:3,loadedAt:salesNow_()});
}
function reconcileSalesJob(id) {
  salesUser_(true);return salesLock_(()=>{const job=salesRead_('sales_jobs/'+salesKey_(id));if(!job||!['uncertain','running'].includes(job.state)) throw new Error('Kein unklarer Auftrag.');
    const draft=salesRead_('sales_drafts/'+job.draftId);if(!draft?.testOnly) throw new Error('Testfirma fehlt.');
    if(job.kind==='createCompany') {
      if(job.hqId&&job.markerCleanupAttempted) {
        const checked=salesOne_('Companies',job.hqId),marker=[draft.company.description,'[Sales-Test '+draft.id+']'].filter(Boolean).join('\n');
        if(checked.name!==draft.company.name||!salesEqualFields_(checked,salesPick_(draft.company,['industrialSector']))||!salesHomepageConfirmed_(checked,draft.company.homepage)||!salesEqualFields_(checked.defaultAddress||{},draft.company.defaultAddress)) throw new Error('Firmenwerte in HQ nicht eindeutig bestätigt. Auftrag bleibt gesperrt.');
        if(draft.contact&&!job.steps.contact) throw new Error('Ansprechpartner noch nicht bestätigt. Auftrag bleibt gesperrt.');
        if(String(checked.description||'')===draft.company.description) {job.state='ready';job.message='Beschreibung in HQ bereinigt. Abschlussprüfung fortsetzen.';}
        else if(String(checked.description||'').replace(/\r\n/g,'\n')===marker) {job.state='ready';job.message='Kennzeichnung noch vorhanden. Bereinigung kontrolliert fortsetzen.';}
        else throw new Error('Beschreibung in HQ verändert. Auftrag bleibt gesperrt.');
        job.updatedAt=salesNow_();salesWrite_('sales_jobs/'+job.id,job);return salesJobSummary_(job);
      }
      const list=salesCollect_('Companies',"name eq '"+draft.company.name.replace(/'/g,"''")+"'",Date.now()).filter(x=>x.name===draft.company.name&&(x.description||'').includes('[Sales-Test '+job.id+']'));
      if(list.length!==1) throw new Error('Keine eindeutige Firmenanlage gefunden. Auftrag bleibt gesperrt; HQ manuell prüfen.');
      const found=list[0];if(job.hqId&&Number(job.hqId)!==Number(found.id)) throw new Error('Abweichende HQ-ID.');job.hqId=salesId_(found.id);draft.hqId=job.hqId;salesWrite_('sales_drafts/'+draft.id,draft);
      if(draft.contact&&job.contactAttempted) {
        const contacts=salesCollect_('ContactPersons','companyId eq '+job.hqId,Date.now()).filter(x=>Number(x.companyId)===job.hqId&&x.note==='[Sales-Test '+job.id+']'&&salesEqualFields_(x,draft.contact));
        if(contacts.length!==1) throw new Error('Kontaktanlage nicht eindeutig bestätigt. Auftrag bleibt gesperrt.');job.contactId=salesId_(contacts[0].id);job.steps.contact=true;
      }
      job.state='ready';job.message='Gefundene HQ-Anlage zugeordnet. Fortsetzen führt die Rückprüfung und nur noch ausstehende Schritte aus.';
    } else if(job.kind==='cleanupMarker') {
      const checked=salesOne_('Companies',job.hqId),marker=[draft.company.description,'[Sales-Test '+draft.id+']'].filter(Boolean).join('\n');
      if(checked.name!==draft.company.name) throw new Error('HQ-Ziel stimmt nicht mit der Testfirma überein.');
      if(String(checked.description||'')===draft.company.description) {job.state='synced';job.message='Beschreibung in HQ bereinigt und bestätigt.';}
      else if(String(checked.description||'').replace(/\r\n/g,'\n')===marker) {job.state='ready';job.message='Technische Kennzeichnung noch vorhanden. Bereinigung kann fortgesetzt werden.';}
      else throw new Error('Beschreibung wurde in HQ verändert. Auftrag bleibt gesperrt.');
    } else if(job.kind==='history') {
      const rows=salesCollect_('ContactHistories','companyId eq '+job.hqId,Date.now()).filter(h=>Number(h.companyId)===Number(job.hqId)&&h.syncId==='sales-'+job.id&&salesEqualFields_(h,job.history));
      if(rows.length!==1) throw new Error('Historieneintrag nicht eindeutig bestätigt. Auftrag bleibt gesperrt.');job.state='synced';job.message='Historieneintrag in HQ bestätigt.';
    } else if(job.kind==='companyChange') {
      const actual=salesOne_('Companies',job.hqId),website=actual.defaultAddress?.website||'';
      if(actual.name!==draft.company.name) throw new Error('HQ-Ziel stimmt nicht mit der Testfirma überein.');
      if(actual.industrialSector===job.change.industrialSector&&(actual.homepage||'')===job.change.homepage&&website===job.change.homepage || actual.industrialSector===job.change.industrialSector&&!(actual.homepage||'')&&website===job.change.homepage) {job.state='synced';job.message='Homepage und Branche in HQ bestätigt.';}
      else if([job.base.industrialSector,job.change.industrialSector].includes(actual.industrialSector)&&[job.base.homepage,job.change.homepage].includes(actual.homepage||'')&&[job.baseAddressWebsite||'',job.change.homepage].includes(website)) {job.state='ready';job.message='Teilübertragung geprüft. Offene Schritte kontrolliert fortsetzen.';}
      else throw new Error('HQ-Werte weichen vom Auftrag ab. Auftrag bleibt gesperrt.');
    }
    job.updatedAt=salesNow_();salesWrite_('sales_jobs/'+job.id,job);return salesJobSummary_(job);});
}
function saveSalesHistory(input) {
  const user=salesUser_();return salesLock_(()=>{const draft=salesRead_('sales_drafts/'+salesKey_(input.draftId));if(!draft?.testOnly||!draft.hqId) throw new Error('Zuerst eine eigene Testfirma vollständig anlegen.');
    const history={reason:salesText_(input.reason,200,true),content:salesText_(input.content,10000,true),contactOn:salesNow_(),contactHistoryChannel:input.channel,companyId:draft.hqId};
    if(!['Note','Call','Meeting','Visit'].includes(history.contactHistoryChannel)) throw new Error('Unzulässige Kontaktart.');
    const id=Utilities.getUuid();history.syncId='sales-'+id;const job={id,kind:'history',draftId:draft.id,hqId:draft.hqId,name:draft.company.name,state:'pending',history,createdAt:salesNow_(),updatedAt:salesNow_(),actor:user.email,message:'Kontakt in Firebase gespeichert; HQ-Abgleich offen.'};salesWrite_('sales_jobs/'+id,job);return {id,message:job.message};});
}
function salesRunHistory_(job) {
  const actual=salesOne_('Companies',job.hqId);if(!/^TEST[ -]/i.test(actual.name)) throw new Error('Ziel ist keine Testfirma mehr.');
  salesWriteHq_(job,'/v2/ContactHistories','post',job.history);
  const rows=salesCollect_('ContactHistories','companyId eq '+job.hqId,Date.now()).filter(h=>Number(h.companyId)===Number(job.hqId)&&h.syncId==='sales-'+job.id&&salesEqualFields_(h,job.history));
  if(rows.length!==1) throw new Error('Historieneintrag nicht eindeutig bestätigt.');
  const data=salesRead_('sales_companies/'+job.hqId);if(data) {data.histories.push(salesPick_(rows[0],['id','companyId','reason','content','contactOn','contactHistoryChannel']));salesWrite_('sales_companies/'+job.hqId,data);}
}
function saveSalesCompanyChange(input) {
  const user=salesUser_();return salesLock_(()=>{const d=salesRead_('sales_drafts/'+salesKey_(input.draftId));if(!d?.testOnly||!d.hqId) throw new Error('Nur eigene Testfirmen können geändert werden.');
    const data=salesRead_('sales_companies/'+d.hqId);if(!data) throw new Error('Zuerst Firmendetails importieren.');
    const industry=salesText_(input.industrialSector,150,false),known=salesRead_('sales_meta/catalog')?.industries||[];
    if(industry&&!known.includes(industry)&&industry!==data.company.industrialSector) throw new Error('Bitte eine Branche aus der aktuellen HQ-Auswahlliste wählen.');
    const change={industrialSector:industry,homepage:salesWebsiteInput_(input.homepage)};
    const base=salesPick_(data.company,Object.keys(change)),baseAddressWebsite=data.company.defaultAddress?.website||'',id=Utilities.getUuid();const job={id,kind:'companyChange',draftId:d.id,hqId:d.hqId,name:d.company.name,state:'pending',change,base,baseAddressWebsite,createdAt:salesNow_(),updatedAt:salesNow_(),actor:user.email,message:'Änderung in Firebase gespeichert; HQ-Abgleich offen.'};salesWrite_('sales_jobs/'+id,job);return {id,message:job.message};});
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
  if(!draft?.testOnly||actual.name!==draft.company.name||!/^TEST[ -]/i.test(actual.name)) throw new Error('Ziel ist keine eigene Testfirma mehr.');
  const website=actual.defaultAddress?.website||'',companyCompatible=Object.keys(job.change).every(k=>[String(job.base[k]??''),String(job.change[k]??'')].includes(String(actual[k]??''))),addressCompatible=[job.baseAddressWebsite||'',job.change.homepage].includes(website);
  if(!companyCompatible||!addressCompatible) {job.state='conflict';job.conflict={before:{...job.base,addressWebsite:job.baseAddressWebsite||''},app:{...job.change,addressWebsite:job.change.homepage},hq:{...salesPick_(actual,Object.keys(job.change)),addressWebsite:website}};job.message='HQ und App unterscheiden sich. Bitte entscheiden.';return;}
  const addressNeedsWrite=website!==job.change.homepage;
  const address=addressNeedsWrite?salesAddressForWrite_(actual):null;
  if(address) {job.addressId=salesId_(address.id);salesWrite_('sales_jobs/'+job.id,job);}
  // PUT uses a whitelist of the documented writable fields, preserving unrelated HQ values.
  if(!salesEqualFields_(actual,job.change)) {const payload=salesCompanyPut_(actual);Object.assign(payload,job.change);salesWriteHq_(job,'/v2/Companies/'+job.hqId,'put',payload);}
  if(address){const payload=salesPick_(address,['alternativeCompanyName','additionalInformation','street','houseNumber','zipCode','city','country','description','phone','email','fax','website','addressLine2','standardForDocumentType']);payload.website=job.change.homepage;salesWriteHq_(job,'/v2/Companies/'+job.hqId+'/Addresses/'+job.addressId,'put',payload);}
  const after=salesOne_('Companies',job.hqId);
  if(after.industrialSector!==job.change.industrialSector||!salesHomepageConfirmed_(after,job.change.homepage)||String(after.defaultAddress?.website||'')!==job.change.homepage) throw new Error('Homepage oder Branche nicht vollständig in HQ bestätigt.');
  const data=salesRead_('sales_companies/'+job.hqId);data.company=salesCompany_(after);data.loadedAt=salesNow_();salesWrite_('sales_companies/'+job.hqId,data);
}
function salesHomepageConfirmed_(actual,expected) {return String(actual.homepage||'')===expected||!!expected&&!actual.homepage&&String(actual.defaultAddress?.website||'')===expected;}
function resolveSalesConflict(id,choice) {
  salesUser_(true);return salesLock_(()=>{const j=salesRead_('sales_jobs/'+salesKey_(id));if(j?.state!=='conflict') throw new Error('Kein offener Konflikt.');
    if(choice==='hq') {j.state='canceled';j.message='HQ-Wert behalten. App-Änderung verworfen.';}
    else if(choice==='app') {j.base=salesPick_(j.conflict.hq,['industrialSector','homepage']);j.baseAddressWebsite=j.conflict.hq.addressWebsite||'';j.state='pending';j.message='App-Werte ausgewählt. Beim nächsten Abgleich wird HQ erneut auf weitere Änderungen geprüft.';}
    else throw new Error('Bitte HQ oder App wählen.');j.conflict=null;j.updatedAt=salesNow_();salesWrite_('sales_jobs/'+id,j);return salesJobSummary_(j);});
}
