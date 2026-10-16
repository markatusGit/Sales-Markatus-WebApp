/** Offline audit: real read/storage/join functions, synthetic transports only. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {bulkFixture} = require('../sales-app/test-sales-bulk.cjs');
const root = path.resolve(__dirname, '..');
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

function instrument(f) {
  let stats;
  const reset = () => stats = {readDocumentsModel: 0, writtenDocuments: 0, firebaseRequests: 0, deniedSecurityRequests: 0, returnedPayloadBytes: 0, readsByCollection: {}, writesByCollection: {}};
  reset();
  const name = key => 'projects/synthetic-project/databases/(default)/documents/' + key;
  const doc = key => ({name: name(key), fields: clone(f.fields[key])});
  function reads(keys, minimum = false) {
    stats.readDocumentsModel += Math.max(minimum ? 1 : 0, keys.length);
    for (const key of keys) {
      const col = key.split('/')[0]; stats.readsByCollection[col] = (stats.readsByCollection[col] || 0) + 1;
      if (f.fields[key]) stats.returnedPayloadBytes += Buffer.byteLength(JSON.stringify(doc(key)));
    }
  }
  function put(key, fields) {
    stats.writtenDocuments++;
    const col = key.split('/')[0]; stats.writesByCollection[col] = (stats.writesByCollection[col] || 0) + 1;
    f.fields[key] = clone(fields);
    // Keep the existing fixture's model aligned without instrumenting an extra read.
    f.db[key] = JSON.parse(fields.payload.stringValue);
  }
  f.ctx.pilotReadDocument_ = (_, key) => { stats.firebaseRequests++; reads([key]); return f.fields[key] ? {payload: f.fields[key].payload.stringValue} : null; };
  f.ctx.pilotWriteDocument_ = (_, key, value) => { stats.firebaseRequests++; put(key, {payload: {stringValue: value.payload}}); };
  f.ctx.pilotCall_ = (url, options = {}) => {
    stats.firebaseRequests++;
    if (url.endsWith(':batchGet')) {
      const keys = JSON.parse(options.payload).documents.map(n => n.split('/documents/')[1]); reads(keys);
      return keys.map(key => f.fields[key] ? {found: doc(key)} : {missing: name(key)}).reverse();
    }
    if (url.endsWith(':commit')) {
      const writes = JSON.parse(options.payload).writes;
      writes.forEach(w => put(w.update.name.split('/documents/')[1], w.update.fields));
      return {writeResults: writes.map(() => ({updateTime: '2026-10-16T00:00:00Z'}))};
    }
    if (url.endsWith(':runQuery')) {
      const q = JSON.parse(options.payload).structuredQuery, filter = q.where.fieldFilter;
      const keys = Object.keys(f.fields).filter(key => key.startsWith(q.from[0].collectionId + '/') && f.fields[key][filter.field.fieldPath]?.stringValue === filter.value.stringValue).sort().filter(key => !q.startAt || name(key) > q.startAt.values[0].referenceValue).slice(0, q.limit);
      reads(keys, true); return keys.map(key => ({document: doc(key)}));
    }
    const parsed = new URL(url), col = parsed.pathname.split('/documents/')[1];
    const keys = Object.keys(f.fields).filter(key => key.startsWith(col + '/') && !key.slice(col.length + 1).includes('/')).sort();
    const offset = Number(parsed.searchParams.get('pageToken') || 0), limit = Number(parsed.searchParams.get('pageSize') || 100), page = keys.slice(offset, offset + limit);
    reads(page, true);
    return {documents: page.map(doc), ...(offset + limit < keys.length ? {nextPageToken: String(offset + limit)} : {})};
  };
  const sales = fs.readFileSync(path.join(root, 'sales-app/Sales.gs'), 'utf8');
  vm.runInContext(sales.slice(sales.indexOf('function salesRead_('), sales.indexOf('function salesLock_(')), f.ctx);
  f.ctx.salesAssertPrivate_ = () => { stats.firebaseRequests += 7; stats.deniedSecurityRequests += 7; };
  f.ctx.salesWorkerPrivate_ = () => { stats.firebaseRequests += 7; stats.deniedSecurityRequests += 7; };
  return {
    reset,
    seed(key, value, index = {}) { f.fields[key] = {payload: {stringValue: JSON.stringify(value)}, ...Object.fromEntries(Object.entries(index).map(([k, v]) => [k, {stringValue: String(v)}]))}; f.db[key] = clone(value); },
    measure(label, fn) {
      reset(); const before = f.calls.length; const result = fn();
      return {label, ...clone(stats), hqRequests: f.calls.length - before, responseBytesSynthetic: Buffer.byteLength(JSON.stringify(result) || ''), result};
    }
  };
}

function baseline(companyCount = 3189, editionCount = 23) {
  const f = bulkFixture(), catalog = clone(f.db['sales_meta/catalog']);
  const hqGet = f.ctx.salesHqGet_;
  f.ctx.salesHqGet_ = url => {
    const reply = hqGet(url), parsed = new URL('https://synthetic.invalid' + url), filter = parsed.searchParams.get('$filter') || parsed.searchParams.get('filter') || '';
    const company = /companyId eq (\d+)/.exec(filter);
    if (company && Array.isArray(reply.data)) { reply.data = reply.data.filter(row => Number(row.companyId) === Number(company[1])); reply.headers = {'helloHQ-Count': reply.data.length}; }
    return reply;
  };
  for (const key of Object.keys(f.db)) delete f.db[key];
  for (const key of Object.keys(f.fields)) delete f.fields[key];
  const audit = instrument(f);
  audit.seed('sales_meta/catalog', catalog);
  for (let i = 0; i < companyCount; i++) {
    const id = String(10001 + i), company = {id, name: 'Synthetic company ' + id, companyTypes: [], responsibleUsers: [], customFields: [], addresses: [], defaultAddress: {city: 'Synthetic city'}};
    const contacts = [{id: String(50001 + i), companyId: Number(id), firstName: 'Synthetic', lastName: 'Contact', eMail: 'example@example.invalid'}];
    audit.seed('sales_directory/' + id, {company, contacts, loadedAt: '2026-10-16T00:00:00Z', explicit: false});
    audit.seed('sales_companies/' + id, {company, contacts, projects: [], histories: [], detailVersion: 3});
  }
  for (let i = 0; i < editionCount; i++) audit.seed('sales_editions/project-' + (501 + i), {id: 'project-' + (501 + i), magazine: 'Synthetic magazine', issue: i + 1, projectId: String(501 + i), companyIds: [], companies: [], documents: [], settings: {revision: 0, targetCents: null}, loadedAt: '2026-10-16T00:00:00Z', syncEnabled: true});
  return {f, audit};
}

function legacyMain() {
  const result = {date: '2026-10-16', scope: 'offline-only; no real Firebase/HQ; document-operation model, not Google billing', scenarios: [], syncScenarios: []};
  const {f, audit} = baseline();
  f.ctx.salesLeanAfterWrite_=()=>{};f.ctx.salesLeanNamesUpdate_=()=>{};
  const measure = (label, fn) => { const row = audit.measure(label, fn); delete row.result; result.scenarios.push(row); return row; };
  const initial = measure('Appstart / Frisch laden / Mein-Tag-Minutenabruf', () => f.ctx.getSalesV1State());
  assert.equal(initial.readDocumentsModel, 3221); assert.equal(initial.firebaseRequests, 42); assert.equal(initial.writtenDocuments, 0);
  const company = measure('Bestandskunde öffnen', () => f.ctx.getSalesV1Company('10001'));
  assert.equal(company.readDocumentsModel, 3193); assert.equal(company.firebaseRequests, 36);
  assert.equal(measure('Denselben Bestandskunden erneut öffnen', () => f.ctx.getSalesV1Company('10001')).readDocumentsModel, 3193);
  assert.equal(measure('Sync-Status bei fehlendem Lauf', () => f.ctx.getSalesSyncStatus()).readDocumentsModel, 1);
  assert.equal(measure('Ohne Firmenzuordnung ansehen', () => f.ctx.getSalesUnassigned()).readDocumentsModel, 2);
  const settings = measure('Ziel/Termine speichern einschließlich UI-Vollabruf', () => { const saved = f.ctx.saveSalesV1EditionSettings({editionId: 'project-501', revision: 0, target: 100}); return {saved, state: f.ctx.getSalesV1State()}; });
  assert.equal(settings.readDocumentsModel, 3222); assert.equal(settings.writtenDocuments, 1);
  const access = measure('E-Mail-Freigaben speichern einschließlich UI-Vollabruf', () => { f.ctx.saveSalesAccess(f.ctx.salesUser_().email); return f.ctx.getSalesV1State(); });
  assert.equal(access.readDocumentsModel, 3221); assert.equal(access.writtenDocuments, 0);
  measure('HQ-Firmensuche einschließlich unnötigem UI-Vollabruf', () => { const found = f.ctx.searchSalesCompanies('Synthetic'); return {found, state: f.ctx.getSalesV1State()}; });
  f.remote.Companies[10001] = {id: 10001, name: 'Synthetic company 10001', companyTypes: [], responsibleUsers: [], addresses: []};
  const refresh = measure('Kundendetails aus HQ aktualisieren einschließlich erneuter Aktenöffnung', () => { const saved = f.ctx.syncSalesV1Company('10001'); return {saved, detail: f.ctx.getSalesV1Company('10001')}; });
  assert.equal(refresh.readDocumentsModel, 6384); assert.equal(refresh.writtenDocuments, 2);
  const history = measure('Kundenhistorie aus HQ aktualisieren einschließlich erneuter Aktenöffnung', () => { const saved = f.ctx.syncSalesV1History('10001'); return {saved, detail: f.ctx.getSalesV1Company('10001')}; });
  assert.equal(history.readDocumentsModel, 9577); assert.equal(history.writtenDocuments, 1);
  const creation = measure('TEST-Firma speichern einschließlich Detail und UI-Vollabruf', () => { const saved = f.ctx.saveSalesTestCompany(f.input); return {saved, detail: f.ctx.getSalesV1Company('draft_' + saved.id), state: f.ctx.getSalesV1State()}; });
  assert.equal(creation.writtenDocuments, 2); assert.equal(creation.readDocumentsModel, 3226);
  for (let i = 1; i < 10; i++) f.ctx.saveSalesTestCompany({...f.input, name: 'TEST synthetic ' + i});
  const growing = measure('Appstart mit zehn Anlageaufträgen/Entwürfen', () => f.ctx.getSalesV1State());
  assert.equal(growing.readDocumentsModel, 3249);
  measure('Bestandskunde mit zehn Aufträgen/Entwürfen öffnen', () => f.ctx.getSalesV1Company('10001'));
  const large = 'x'.repeat(710000);
  const chunkWrite = measure('Großes Testdokument mit 710000 Textzeichen schreiben', () => f.ctx.salesWrite_('sales_meta/syntheticlarge', {text: large}));
  assert.equal(chunkWrite.writtenDocuments, 9);
  const chunkRead = measure('Dasselbe große Testdokument lesen', () => f.ctx.salesRead_('sales_meta/syntheticlarge'));
  assert.equal(chunkRead.readDocumentsModel, 9);
  const secondWrite = measure('Großes Testdokument erneut schreiben', () => f.ctx.salesWrite_('sales_meta/syntheticlarge', {text: large}));
  assert.equal(secondWrite.writtenDocuments, 9);
  result.retainedSyntheticChunksAfterTwoWrites = Object.keys(f.fields).filter(key => key.startsWith('sales_chunks/')).length;
  assert.equal(result.retainedSyntheticChunksAfterTwoWrites, 16);

  // Exercise actual worker checkpoints and sync joins, not the fixture's shortcut step().
  const s = bulkFixture(); s.config(70); s.doc(70, 1001);
  s.ctx.salesLeanAfterWrite_=()=>{};s.ctx.salesLeanNamesUpdate_=()=>{};
  const m = instrument(s);
  function runSync(label, prepare = () => {}, editionsOnly = false) {
    prepare(); let observations = 0;
    const row = m.measure(label, () => {
      if (editionsOnly) s.ctx.startSalesEditionRefresh(); else s.ctx.startSalesSync();
      let count = 0, status;
      do {
        s.worker(); status = s.ctx.salesRead_('sales_meta/sync'); observations++;
        if (++count > 20) throw Error('Synthetic worker did not finish');
      } while (status.state === 'running' && !status.paused);
      assert.notEqual(status.paused, true); assert.ok(['completed', 'completedWithErrors'].includes(status.state));
      return status;
    });
    // The loop's explicit observation read is instrumentation, not a UI/worker operation.
    row.readDocumentsModel -= observations; row.firebaseRequests -= observations; row.readsByCollection.sales_meta -= observations;
    result.syncScenarios.push({label, ...Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'result')), full: row.result.full, tasks: row.result.tasks.length, newOrChangedRows: Object.fromEntries(Object.entries(row.result.entities).map(([key, value]) => [key, value.changed || 0]))});
  }
  runSync('Kleiner Erstimport (synthetisch: zwei Firmen)');
  runSync('Folgeabgleich ohne HQ-Änderung');
  runSync('Eine Firma geändert', () => { s.remote.Companies[102].name = 'Synthetic changed'; s.remote.Companies[102].updatedOn = new Date().toISOString(); });
  f.ctx.salesWrite_('sales_meta/sync', {...clone(s.db['sales_meta/sync']), syntheticPadding: large});
  assert.equal(measure('Sync-Status mit künstlich aufgeteiltem Statusdokument', () => f.ctx.getSalesSyncStatus()).readDocumentsModel, 9);

  const p = bulkFixture(); p.config(70); p.doc(70, 1001);
  p.ctx.salesLeanAfterWrite_=()=>{};p.ctx.salesLeanNamesUpdate_=()=>{};
  for (const [entityIndex, entity] of ['Companies', 'ContactPersons', 'Projects', 'Documents', 'PlannedRevenues', 'ContactHistories'].entries()) {
    for (let i = 0; Object.keys(p.remote[entity]).length < 10; i++) {
      const id = 20000 + entityIndex * 1000 + i;
      p.remote[entity][id] = {id, companyId: 102, projectId: 570, name: 'Synthetic ' + entity, number: 'S-' + id, updatedOn: '2026-01-01T00:00:00Z', date: '2026-01-01', currency: 'EUR', documentType: 'Invoice', documentStatusEntity: {documentStatusType: 'Sent'}, netValue: 1, reason: 'Synthetic', content: 'Synthetic', contactOn: '2026-01-01T00:00:00Z', contactHistoryChannel: 'Note', estimations: []};
    }
  }
  p.finishBulk();
  const pm = instrument(p);
  const probes = pm.measure('Unveränderter Folgeabgleich mit zehn Datensätzen je Datenart', () => { p.ctx.startSalesSync(); p.worker(); return p.ctx.salesRead_('sales_meta/sync'); });
  assert.notEqual(probes.result.state, 'running');
  probes.readDocumentsModel--; probes.firebaseRequests--; probes.readsByCollection.sales_meta--;
  result.syncScenarios.push({...Object.fromEntries(Object.entries(probes).filter(([key]) => key !== 'result')), tasks: probes.result.tasks.length, checkedRows: Object.values(probes.result.entities).reduce((sum, entity) => sum + (entity.checked || 0), 0)});
  const output = path.join(root, 'output', 'firestore-audit-2026-10-16.json');
  fs.mkdirSync(path.dirname(output), {recursive: true}); fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  for (const row of [...result.scenarios, ...result.syncScenarios]) console.log(`${row.label}: ${row.readDocumentsModel} Reads, ${row.writtenDocuments} Writes, ${row.firebaseRequests} Firebase-Requests, ${row.hqRequests} HQ-Requests`);
  console.log('Offline-Prüfungen bestanden. Messmodell: ' + output);
}
function main(){
 const {f,audit}=baseline(),scenarios=[];
 function measure(label,fn){const row=audit.measure(label,fn);delete row.result;scenarios.push(row);console.log(`${label}: ${row.readDocumentsModel} Reads, ${row.writtenDocuments} Writes, ${row.firebaseRequests} Firebase-Requests`);return row;}
 measure('Startseite: einmaliger Aufbau der Ausgabenübersicht',()=>f.ctx.getSalesLeanState());
 assert.equal(measure('Startseite: regulärer Aufruf',()=>f.ctx.getSalesLeanState()).readDocumentsModel,2);
 measure('Kundenliste: einmaliger Aufbau des Namensindex',()=>f.ctx.getSalesLeanView('customers'));
 assert.equal(measure('Kundenliste: regulärer Aufruf',()=>f.ctx.getSalesLeanView('customers')).readDocumentsModel,1);
 measure('Kundenakte: einmaliger Aufbau kleiner Zuordnungsindizes',()=>f.ctx.getSalesLeanCompany('10001'));
 assert.equal(measure('Kundenakte: reguläre erste Öffnung je Browsersitzung',()=>f.ctx.getSalesLeanCompany('10001')).readDocumentsModel,4);
 measure('Ausgabeeinstellungen: nur betroffene Ausgabe und Übersicht',()=>f.ctx.saveSalesLeanEditionSettings({editionId:'project-501',revision:0,target:100}));
 const output=path.join(root,'output','firestore-audit-r20.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify({scope:'synthetic-only',release:'r20',companyCount:3189,editionCount:23,scenarios,ui:'0 idle Home requests and 0 repeat-open requests covered by test-lean-browser.cjs',deferred:['D07 magazine filters','D08 status','D09 completion full refresh','D11 access save full refresh','D14 legacy history sync','D17','D20','D21','D22']},null,2)+'\n');
 console.log('PASS model assertions; output: '+output);
}
if (require.main === module) {if(process.argv.includes('--legacy'))legacyMain();else main();}
module.exports = {instrument, baseline};
