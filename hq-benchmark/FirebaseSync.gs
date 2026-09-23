/** HQ -> Firestore: manuell oder per Zeittrigger ausführen. Keine Kundendaten im Log. */
const PILOT_SYNC = Object.freeze({maxChunkBytes: 180000, maxPages: 25, pageSize: 1000});

function syncFirebasePilot() {
  requireBenchUser_();
  return pilotSync_();
}

function pilotSync_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('Ein HQ-Abgleich läuft bereits.');
  try {
    const props = PropertiesService.getScriptProperties();
    const projectId = String(props.getProperty('FIREBASE_PROJECT_ID') || '').trim();
    if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)) throw new Error('FIREBASE_PROJECT_ID fehlt oder ist ungültig.');
    const account = JSON.parse(props.getProperty('FIREBASE_SERVICE_ACCOUNT_JSON') || '{}');
    if (account.project_id !== projectId || !account.client_email || !account.private_key || account.type !== 'service_account') throw new Error('Firebase-Dienstkonto passt nicht zum Projekt.');
    const accessToken = pilotGoogleToken_(account);
    const hqToken = revenueToken_();
    const started = Date.now();
    const companies = pilotCollect_('Companies', hqToken, started);
    const documents = pilotCollect_('Documents', hqToken, started);
    const customers = Object.create(null), allCompanies = Object.create(null), seen = Object.create(null);
    let excludedCompanies = 0;
    for (const company of companies) {
      const id = revenueSingle_(company, 'id');
      const name = revenueSingle_(company, 'name');
      if (id === null || !String(name || '').trim() || allCompanies[String(id)]) throw new Error('HQ-Firma ohne eindeutige ID/Name. Kein Abgleich veröffentlicht.');
      allCompanies[String(id)] = true;
      if (!revenueValues_(company, 'companyTypes[].name').some(v => revenueEqual_(v, 'Kunde'))) {excludedCompanies++; continue;}
      customers[String(id)] = {id:String(id), name:String(name), days:Object.create(null)};
    }
    const counts = {loadedCompanies:companies.length, customers:Object.keys(customers).length, excludedCompanies, loadedDocuments:documents.length, countedDocuments:0, otherTypes:0, otherStatuses:0, missingDate:0, missingStatus:0, missingId:0, missingAmount:0, missingCompany:0, excludedCompanyDocuments:0, nonEuro:0};
    for (const doc of documents) {
      const type = revenueSingle_(doc, 'documentType');
      const invoice = revenueEqual_(type, 'Invoice'), credit = revenueEqual_(type, 'CreditNote');
      if (!invoice && !credit) {counts.otherTypes++; continue;}
      const dayValue = revenueSingle_(doc, 'date');
      const day = typeof dayValue === 'string' ? dayValue.slice(0,10) : '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {counts.missingDate++; continue;}
      const status = revenueSingle_(doc, 'documentStatusEntity.documentStatusType');
      if (status === null) {counts.missingStatus++; continue;}
      if (!['Accepted','Paid','Sent'].some(v => revenueEqual_(status,v))) {counts.otherStatuses++; continue;}
      const docId = revenueSingle_(doc, 'id');
      if (docId === null) {counts.missingId++; continue;}
      if (seen[String(docId)]) throw new Error('Doppelte HQ-Beleg-ID. Kein Abgleich veröffentlicht.');
      seen[String(docId)] = true;
      const companyId = String(revenueSingle_(doc, 'companyId'));
      const customer = customers[companyId];
      if (!customer) {if (allCompanies[companyId]) counts.excludedCompanyDocuments++; else counts.missingCompany++; continue;}
      if (!revenueEqual_(revenueSingle_(doc, 'currency'), 'EUR')) {counts.nonEuro++; continue;}
      const amount = revenueAmountCents_(revenueSingle_(doc, 'netValue'));
      if (amount === null) {counts.missingAmount++; continue;}
      customer.days[day] = (customer.days[day] || 0) + (credit ? -Math.abs(amount) : amount);
      counts.countedDocuments++;
    }
    const rows = Object.keys(customers).map(id => {
      const c = customers[id];
      return [c.id,c.name,Object.keys(c.days).sort().map(day => [day,c.days[day]])];
    }).sort((a,b) => a[1].localeCompare(b[1],'de'));
    if (!rows.length) throw new Error('HQ lieferte keine Kunden. Kein leerer Abgleich veröffentlicht.');
    const chunks = pilotChunks_(rows);
    const snapshotId = Utilities.getUuid();
    const current = pilotReadDocument_(projectId,'pilot/current',accessToken);
    for (let i=0;i<chunks.length;i++) pilotWriteDocument_(projectId,'pilot_snapshots/'+snapshotId+'/chunks/'+String(i).padStart(4,'0'),{payload:JSON.stringify(chunks[i])},accessToken);
    const incomplete = Boolean(counts.missingDate || counts.missingStatus || counts.missingId || counts.missingAmount || counts.missingCompany || counts.nonEuro);
    const meta = {schema:1,snapshotId,chunkCount:chunks.length,createdAt:new Date().toISOString(),source:'HQ v2',counts,incomplete,previousSnapshotId:current && current.snapshotId || ''};
    pilotWriteDocument_(projectId,'pilot/current',meta,accessToken);
    // Einen Vorgänger behalten, damit ein bereits gestarteter Browserabruf gültig bleibt.
    const obsolete = current && current.previousSnapshotId;
    let cleanupPending=false;
    if (obsolete && obsolete !== snapshotId && obsolete !== meta.previousSnapshotId) {
      try {pilotDeleteSnapshot_(projectId,obsolete,accessToken);} catch (_) {cleanupPending=true;}
    }
    return {snapshotId, durationMs:Date.now()-started, chunkCount:chunks.length, counts, incomplete, cleanupPending};
  } finally {lock.releaseLock();}
}

function installFirebasePilotNightlySync() {
  requireBenchUser_();
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'pilotSync_').forEach(ScriptApp.deleteTrigger);
  ScriptApp.newTrigger('pilotSync_').timeBased().everyDays(1).atHour(3).create();
  return 'Täglicher HQ-Abgleich um etwa 03:00 Uhr eingerichtet.';
}

function pilotCollect_(collection, token, started) {
  const rows = [];
  for (let page=0;page<PILOT_SYNC.maxPages;page++) {
    if (Date.now()-started > 210000) throw new Error('Zeitbudget erreicht. Kein Abgleich veröffentlicht.');
    const result = revenueFetch_('/v2/'+collection+'?top='+PILOT_SYNC.pageSize+'&skip='+rows.length,token);
    rows.push.apply(rows,result.records);
    if (result.total !== null && rows.length < result.total && result.records.length === 0) throw new Error('HQ-Seitennavigation unvollständig.');
    if (result.total !== null ? rows.length >= result.total : result.records.length < PILOT_SYNC.pageSize) return rows;
  }
  throw new Error('HQ-Seitenlimit erreicht. Kein Abgleich veröffentlicht.');
}

function pilotChunks_(rows) {
  const chunks=[]; let chunk=[];
  for (const row of rows) {
    if (Utilities.newBlob(JSON.stringify([row])).getBytes().length > PILOT_SYNC.maxChunkBytes) throw new Error('Ein Kunde ist für einen Datenblock zu groß.');
    const candidate=chunk.concat([row]);
    if (chunk.length && Utilities.newBlob(JSON.stringify(candidate)).getBytes().length > PILOT_SYNC.maxChunkBytes) {chunks.push(chunk);chunk=[row];}
    else chunk=candidate;
  }
  if (chunk.length) chunks.push(chunk);
  return chunks;
}

function pilotGoogleToken_(account) {
  const now=Math.floor(Date.now()/1000);
  const encode=x=>Utilities.base64EncodeWebSafe(JSON.stringify(x)).replace(/=+$/,'');
  const head=encode({alg:'RS256',typ:'JWT'});
  const body=encode({iss:account.client_email,scope:'https://www.googleapis.com/auth/datastore',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
  const unsigned=head+'.'+body;
  const signature=Utilities.base64EncodeWebSafe(Utilities.computeRsaSha256Signature(unsigned,account.private_key)).replace(/=+$/,'');
  const response=UrlFetchApp.fetch('https://oauth2.googleapis.com/token',{method:'post',payload:{grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:unsigned+'.'+signature},muteHttpExceptions:true});
  if (response.getResponseCode() !== 200) throw new Error('Firebase-Dienstkonto konnte keinen Zugriffstoken erhalten (HTTP '+response.getResponseCode()+').');
  const token=JSON.parse(response.getContentText()).access_token;
  if (!token) throw new Error('Firebase-Zugriffstoken fehlt.');
  return token;
}

function pilotUrl_(projectId,path) {return 'https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(projectId)+'/databases/(default)/documents/'+path;}
function pilotCall_(url,options) {
  const response=UrlFetchApp.fetch(url,Object.assign({muteHttpExceptions:true},options));
  const status=response.getResponseCode();
  if (status<200 || status>=300) throw new Error('Firestore HTTP '+status+' bei HQ-Abgleich.');
  return response.getContentText() ? JSON.parse(response.getContentText()) : null;
}
function pilotReadDocument_(projectId,path,token) {
  const response=UrlFetchApp.fetch(pilotUrl_(projectId,path),{method:'get',headers:{Authorization:'Bearer '+token},muteHttpExceptions:true});
  if (response.getResponseCode()===404) return null;
  if (response.getResponseCode()!==200) throw new Error('Firestore-Lesezugriff HTTP '+response.getResponseCode()+'.');
  const fields=JSON.parse(response.getContentText()).fields || {};
  return Object.fromEntries(Object.keys(fields).map(key=>[key,fields[key].stringValue || fields[key].integerValue || fields[key].booleanValue || null]));
}
function pilotWriteDocument_(projectId,path,value,token) {
  const fields={};
  Object.keys(value).forEach(key => {
    const item=value[key];
    fields[key]=typeof item==='string' ? {stringValue:item} : typeof item==='boolean' ? {booleanValue:item} : typeof item==='number' ? {integerValue:String(item)} : {stringValue:JSON.stringify(item)};
  });
  return pilotCall_(pilotUrl_(projectId,path),{method:'patch',contentType:'application/json',headers:{Authorization:'Bearer '+token},payload:JSON.stringify({fields})});
}
function pilotDeleteSnapshot_(projectId,id,token) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) return;
  let pageToken='';
  do {
    const url=pilotUrl_(projectId,'pilot_snapshots/'+id+'/chunks')+'?pageSize=100'+(pageToken?'&pageToken='+encodeURIComponent(pageToken):'');
    const listing=pilotCall_(url,{method:'get',headers:{Authorization:'Bearer '+token}});
    (listing.documents || []).forEach(doc=>pilotCall_('https://firestore.googleapis.com/v1/'+doc.name,{method:'delete',headers:{Authorization:'Bearer '+token}}));
    pageToken=listing.nextPageToken || '';
  } while (pageToken);
}
