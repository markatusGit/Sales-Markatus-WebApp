/**
 * Live-Lesetest für Firmen und fakturierten Netto-Umsatz.
 * Die Feldzuordnung wird bewusst in der Testoberfläche geprüft: Die öffentliche
 * v2-Anleitung beschreibt die konkreten Belegfelder nicht verbindlich.
 * Es werden ausschließlich GET-Aufrufe an zwei feste HQ-v2-Endpunkte gesendet.
 */
const HQ_REVENUE = Object.freeze({origin: 'https://api.hellohq.io', pageSize: 500, maxPagesPerCollection: 25, minIntervalMs: 2000, maxDurationMs: 210000});

function inspectRevenueFields() {
  requireBenchUser_();
  const token = revenueToken_();
  const start = Date.now();
  const company = revenueFetch_('/v2/Companies?top=5', token);
  const document = revenueFetch_('/v2/Documents?top=30', token);
  return {
    companyFields: revenueDescribe_(company.records),
    documentFields: revenueDescribe_(document.records),
    companyRecords: company.records.length,
    documentRecords: document.records.length,
    timings: {companiesMs: company.ms, documentsMs: document.ms, totalMs: Date.now() - start}
  };
}

function runRevenueTest(input) {
  requireBenchUser_();
  const token = revenueToken_();
  const cfg = revenueConfig_(input);
  const began = Date.now();
  const metrics = {requests: 0, bytes: 0, requestTimesMs: [], companiesPages: 0, documentsPages: 0, companiesMs: 0, documentsMs: 0, processingMs: 0};
  // Absichtlich kein globales Script-Lock: Zwei angemeldete PCs sollen dieselbe
  // Ansicht tatsächlich gleichzeitig abrufen können. Je Lauf höchstens 30/min.
  let lastStarted = 0;
  function collect(collection) {
    const records = [];
    const phaseStart = Date.now();
    let skip = 0;
    for (let page = 0; page < HQ_REVENUE.maxPagesPerCollection; page++) {
      if (Date.now() - began >= HQ_REVENUE.maxDurationMs) throw new Error('Zeitbudget erreicht. Die Ergebnisliste wäre unvollständig und wird nicht angezeigt.');
      const wait = lastStarted + HQ_REVENUE.minIntervalMs - Date.now();
      if (wait > 0) Utilities.sleep(wait);
      lastStarted = Date.now();
      const path = '/v2/' + collection + '?top=' + HQ_REVENUE.pageSize + '&skip=' + skip;
      const result = revenueFetch_(path, token);
      metrics.requests++;
      metrics.bytes += result.bytes;
      metrics.requestTimesMs.push(result.ms);
      records.push.apply(records, result.records);
      skip += result.records.length;
      if (collection === 'Companies') metrics.companiesPages++;
      else metrics.documentsPages++;
      if (result.total !== null && skip < result.total && result.records.length === 0) throw new Error('HQ meldet weitere Seiten, liefert aber keine Datensätze.');
      if (result.total !== null ? skip >= result.total : result.records.length < HQ_REVENUE.pageSize) {
        metrics[collection === 'Companies' ? 'companiesMs' : 'documentsMs'] = Date.now() - phaseStart;
        return records;
      }
    }
    throw new Error('Mehr als ' + (HQ_REVENUE.maxPagesPerCollection * HQ_REVENUE.pageSize) + ' ' + collection + '-Einträge. Die Ergebnisliste wäre unvollständig und wird nicht angezeigt.');
  }
  const companies = collect('Companies');
  const documents = collect('Documents');
  const processingStart = Date.now();
  const byId = {};
  const allCompanyIds = {};
  let excludedCompanies = 0;
  companies.forEach(company => {
    const id = revenueSingle_(company, cfg.companyId);
    const name = revenueSingle_(company, cfg.companyName);
    if (id === null || !String(name || '').trim()) throw new Error('Firmen-ID oder Firmenname fehlt in HQ-Daten. Feldzuordnung prüfen.');
    const key = String(id);
    if (allCompanyIds[key]) throw new Error('Doppelte Firmen-ID in der Antwort. Seitennavigation prüfen.');
    allCompanyIds[key] = true;
    if (cfg.customerTypePath && !revenueValues_(company, cfg.customerTypePath).some(value => revenueEqual_(value, cfg.customerTypeValue))) { excludedCompanies++; return; }
    byId[key] = {id: key, name: String(name), revenueCents: 0, documents: 0};
  });
  const from = cfg.from, untilExclusive = revenueNextDate_(cfg.to);
  let matchedDocuments = 0, skippedType = 0, skippedStatus = 0, outsidePeriod = 0, missingCompany = 0, excludedCompanyDocuments = 0;
  const seenDocuments = {};
  documents.forEach(doc => {
    const type = revenueSingle_(doc, cfg.documentType);
    const isInvoice = cfg.invoiceTypes.some(value => revenueEqual_(type, value));
    const isCredit = cfg.creditTypes.some(value => revenueEqual_(type, value));
    if (!isInvoice && !isCredit) { skippedType++; return; }
    const status = revenueSingle_(doc, cfg.documentStatus);
    if (status === null) throw new Error('Belegstatus fehlt. Feldzuordnung prüfen.');
    if (!cfg.includedStatuses.some(value => revenueEqual_(status, value))) { skippedStatus++; return; }
    const date = revenueSingle_(doc, cfg.documentDate);
    const day = typeof date === 'string' ? date.slice(0,10) : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Belegdatum fehlt oder hat ein unbekanntes Format.');
    if (day < from || day >= untilExclusive) { outsidePeriod++; return; }
    const docId = revenueSingle_(doc, cfg.documentId);
    if (docId === null) throw new Error('Beleg-ID fehlt. Feldzuordnung prüfen.');
    if (seenDocuments[String(docId)]) throw new Error('Doppelte Beleg-ID in der Antwort. Seitennavigation prüfen.');
    seenDocuments[String(docId)] = true;
    const companyId = revenueSingle_(doc, cfg.documentCompanyId);
    const target = byId[String(companyId)];
    if (!target) { if (allCompanyIds[String(companyId)]) excludedCompanyDocuments++; else missingCompany++; return; }
    if (cfg.currencyPath) {
      const currency = revenueSingle_(doc, cfg.currencyPath);
      if (!revenueEqual_(currency, 'EUR')) throw new Error('Beleg mit anderer oder fehlender Währung. Umsatz wird nicht gemischt.');
    }
    const amount = revenueAmountCents_(revenueSingle_(doc, cfg.netAmount));
    if (amount === null) throw new Error('Netto-Betrag fehlt oder ist nicht eindeutig numerisch. Feldzuordnung prüfen.');
    target.revenueCents += isCredit ? -Math.abs(amount) : amount;
    target.documents++;
    matchedDocuments++;
  });
  if (missingCompany) throw new Error(missingCompany + ' Belege haben keinen zugeordneten Kunden in der geladenen Firmenliste. Umsatzliste wäre unvollständig.');
  metrics.processingMs = Date.now() - processingStart;
  const customers = Object.keys(byId).map(id => byId[id]).sort((a,b) => b.revenueCents-a.revenueCents || a.name.localeCompare(b.name,'de'));
  const totalCents = customers.reduce((sum, item) => sum + item.revenueCents, 0);
  return {
    startedAt: new Date(began).toISOString(), durationMs: Date.now() - began, from: cfg.from, to: cfg.to,
    customers: customers, totalCents: totalCents,
    counts: {loadedCompanies: companies.length, customerCount: customers.length, excludedCompanies: excludedCompanies, excludedCompanyDocuments: excludedCompanyDocuments, loadedDocuments: documents.length, matchedDocuments: matchedDocuments, skippedType: skippedType, skippedStatus: skippedStatus, outsidePeriod: outsidePeriod},
    metrics: metrics,
    note: 'Testauswertung aus HQ-v2-Dokumenten. Nur die ausdrücklich ausgewählten Belegarten und Statuswerte zählen. Alle Belegseiten wurden frisch gelesen; kein App-Cache.'
  };
}

function revenueToken_() {
  const token = String(PropertiesService.getScriptProperties().getProperty('HQ_API_TOKEN') || '').trim();
  if (!token || /[\r\n]/.test(token)) throw new Error('HQ_API_TOKEN fehlt oder ist ungültig.');
  return token;
}

function revenueFetch_(path, token) {
  const began = Date.now();
  let response;
  try {
    response = UrlFetchApp.fetch(HQ_REVENUE.origin + path, {method:'get',headers:{Authorization:'Bearer '+token,Accept:'application/json'},followRedirects:false,validateHttpsCertificates:true,muteHttpExceptions:true});
  } catch (_) { throw new Error('HQ-Transportfehler. Der Ausgang des Abrufs ist unbekannt; keine unvollständige Liste anzeigen.'); }
  const status = response.getResponseCode();
  if (status !== 200) throw new Error('HQ antwortet mit HTTP ' + status + '. Keine unvollständige Liste anzeigen.');
  const raw = response.getContentText();
  let body;
  try { body = JSON.parse(raw); } catch (_) { throw new Error('HQ-Antwort ist kein lesbares JSON.'); }
  const records = Array.isArray(body) ? body : ['data','items','value'].map(key => body && body[key]).find(Array.isArray);
  if (!records) throw new Error('HQ-Antwort enthält keine erkennbare Liste.');
  const headers = typeof response.getAllHeaders === 'function' ? response.getAllHeaders() : {};
  const countHeader = Object.keys(headers).find(key => key.toLowerCase() === 'hellohq-count');
  const count = countHeader ? Number(headers[countHeader]) : NaN;
  return {records: records, ms: Date.now() - began, bytes: response.getBlob().getBytes().length, total: Number.isInteger(count) && count >= 0 ? count : null};
}

function revenueDescribe_(records) {
  const found = {};
  function walk(value, path, depth) {
    if (depth > 3 || value === null || value === undefined) return;
    if (Array.isArray(value)) { value.slice(0,3).forEach(item => walk(item, path + '[]', depth + 1)); return; }
    if (typeof value === 'object') { Object.keys(value).slice(0,60).forEach(key => walk(value[key], path ? path + '.' + key : key, depth + 1)); return; }
    if (!path) return;
    if (!found[path]) found[path] = {path:path, type:typeof value, values:[]};
    if (/(type|status|state|currency|währung|waehrung)/i.test(path) && found[path].values.length < 8) {
      const sample = String(value).slice(0,80);
      if (!found[path].values.includes(sample)) found[path].values.push(sample);
    }
  }
  records.slice(0,30).forEach(record => walk(record,'',0));
  return Object.keys(found).sort().map(path => found[path]);
}

function revenueValues_(object, path) {
  let current = [object];
  String(path).split('.').forEach(segment => {
    const many = segment.endsWith('[]');
    const key = many ? segment.slice(0,-2) : segment;
    current = current.flatMap(item => {
      const value = item && typeof item === 'object' ? item[key] : undefined;
      return many ? (Array.isArray(value) ? value : []) : [value];
    });
  });
  return current.filter(value => value !== null && value !== undefined && typeof value !== 'object');
}

function revenueSingle_(object, path) {
  const values = revenueValues_(object, path);
  return values.length === 1 ? values[0] : null;
}

function revenueEqual_(a,b) { return String(a).trim().toLocaleLowerCase('de') === String(b).trim().toLocaleLowerCase('de'); }

function revenueAmountCents_(value) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^-?\d+(?:\.\d{1,2})?$/.test(value.trim()))) return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= 1e10 ? Math.round(number * 100) : null;
}

function revenueNextDate_(day) {
  const date = new Date(day + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate()+1);
  return date.toISOString().slice(0,10);
}

function revenueConfig_(input) {
  const data = input || {};
  const from = String(data.from || ''), to = String(data.to || '');
  const validDay = day => /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(new Date(day+'T00:00:00Z').getTime()) && new Date(day+'T00:00:00Z').toISOString().slice(0,10) === day;
  if (!validDay(from) || !validDay(to) || from > to || from < '2000-01-01' || to > '2100-12-31') throw new Error('Bitte einen gültigen Zeitraum wählen.');
  const path = key => {
    const value = String(data[key] || '');
    if (!/^[A-Za-z][A-Za-z0-9]*(?:\[\])?(?:\.[A-Za-z][A-Za-z0-9]*(?:\[\])?)*$/.test(value) || value.length > 120) throw new Error('Ungültige Feldzuordnung: ' + key);
    return value;
  };
  const list = key => {
    const values = String(data[key] || '').split(',').map(value => value.trim()).filter(Boolean);
    if (!values.length || values.length > 20 || values.some(value => value.length > 80)) throw new Error('Bitte gültige Werte für ' + key + ' eintragen.');
    return values;
  };
  const config = {
    from:from,to:to,companyId:path('companyId'),companyName:path('companyName'),documentId:path('documentId'),documentCompanyId:path('documentCompanyId'),documentDate:path('documentDate'),netAmount:path('netAmount'),documentType:path('documentType'),documentStatus:path('documentStatus'),
    invoiceTypes:list('invoiceTypes'),creditTypes:list('creditTypes'),includedStatuses:list('includedStatuses'),
    customerTypePath:data.customerTypePath ? path('customerTypePath') : '',customerTypeValue:String(data.customerTypeValue || '').trim(),currencyPath:data.currencyPath ? path('currencyPath') : ''
  };
  if (config.customerTypePath && !config.customerTypeValue) throw new Error('Bitte den HQ-Wert für den Kundentyp eintragen.');
  if (config.invoiceTypes.some(value => config.creditTypes.some(other => revenueEqual_(value,other)))) throw new Error('Rechnungs- und Gutschriftarten dürfen sich nicht überschneiden.');
  return config;
}
