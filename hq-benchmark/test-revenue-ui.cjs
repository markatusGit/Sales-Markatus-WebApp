const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, 'Index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 3);

class Element {
  constructor(id = '') { this.id = id; this.value = ''; this.children = []; this.listeners = {}; this.disabled = false; this.hidden = false; this.textContent = ''; }
  append(child) { this.children.push(child); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(event, handler) { this.listeners[event] = handler; }
  reportValidity() { return true; }
}
const elements = new Map();
const getElementById = id => { if (!elements.has(id)) elements.set(id, new Element(id)); return elements.get(id); };
const customers = Array.from({length: 3050}, (_, i) => ({id: String(i + 1), name: 'Customer ' + (i + 1), revenueCents: i * 100, documents: 1}));
const result = {
  customers, totalCents: 464970000, from: '2025-01-01', to: '2026-09-23', startedAt: '2026-09-23T08:00:00.000Z', durationMs: 900,
  revenueIncomplete: false, note: 'Test',
  counts: {customerCount: 3050, matchedDocuments: 3050, skippedType: 0, skippedStatus: 0, loadedDocuments: 3050, loadedCompanies: 3050},
  metrics: {requests: 10, pageSize: 1000, pacingMs: 0, companiesMs: 300, documentsMs: 500, processingMs: 100}
};
let serverCalls = 0;
const blobs = [];
const scriptRun = {
  withSuccessHandler(handler) {
    return {withFailureHandler() { return {runRevenueTest() { serverCalls++; handler(result); }}; }};
  }
};
const context = vm.createContext({
  document: {getElementById, createElement: tag => new Element(tag)},
  window: {google: {script: {run: scriptRun}}}, google: {script: {run: scriptRun}},
  Blob: class { constructor(parts) { this.parts = parts; blobs.push(this); } },
  URL: {createObjectURL: () => 'blob:test', revokeObjectURL: () => {}},
  Date, Intl, performance, setInterval: () => 1, clearInterval: () => {}
});
vm.runInContext(scripts[2][1], context);
const el = getElementById;
assert.equal(el('revDocumentType').value, 'documentType');
assert.equal(el('revDocumentStatus').value, 'documentStatusEntity.documentStatusType');
el('revSort').value = 'revenueDesc';
el('revFrom').value = '2025-01-01';
el('revTo').value = '2026-09-23';
el('revenueForm').onsubmit({preventDefault() {}});
assert.equal(serverCalls, 1);
assert.equal(el('revenueRows').children.length, 100);
assert.equal(el('revPage').textContent, 'Seite 1 von 31');
assert.equal(el('revPrev').disabled, true);
el('revNext').onclick();
assert.equal(el('revPage').textContent, 'Seite 2 von 31');
el('revSearch').value = 'Customer 1';
el('revSearch').listeners.input();
assert.equal(serverCalls, 1);
assert.equal(el('revPage').textContent, 'Seite 1 von 12');
assert.ok(el('revenueRows').children.length <= 100);
assert.match(el('revFilterTiming').textContent, /Kein neuer HQ-Abruf/);
const protocol = JSON.parse(blobs.at(-1).parts[0]);
assert.equal(protocol.metrics.pacingMs, 0);
assert.ok(protocol.interactions.some(item => item.action === 'revSearch'));
assert.ok(!blobs.at(-1).parts[0].includes('Customer 1'));
el('revFrom').value = '2026-01-01';
el('revenueForm').onsubmit({preventDefault() {}});
assert.equal(serverCalls, 2);
console.log('PASS Vertriebssicht: 100 Zeilen je Seite, lokale Filter ohne HQ, anonymes Protokoll und frischer Zeitraum-Abruf.');

const firebaseElements = new Map();
const firebaseGet = id => {if (!firebaseElements.has(id)) firebaseElements.set(id,new Element(id));return firebaseElements.get(id);};
let syncCalls=0;
const firebaseRun = {withSuccessHandler(handler) {return {withFailureHandler() {return {
  getFirebasePilotSetup() {handler({projectId:'sales-markatus',accountPresent:true,hqTokenPresent:true});},
  syncFirebasePilot() {syncCalls++;handler({durationMs:25100,chunkCount:3,counts:{customers:3025,loadedCompanies:3174,loadedDocuments:5779,countedDocuments:3486},incomplete:false,cleanupPending:false});}
};}};}};
const firebaseContext=vm.createContext({document:{getElementById:firebaseGet},window:{google:{script:{run:firebaseRun}}},google:{script:{run:firebaseRun}},Date,setInterval:()=>1,clearInterval:()=>{}});
vm.runInContext(scripts[1][1],firebaseContext);
assert.equal(firebaseGet('syncFirebase').disabled,false);
firebaseGet('syncFirebase').onclick();
assert.equal(syncCalls,1);
assert.equal(firebaseGet('firebaseCustomers').textContent,'3025');
assert.equal(firebaseGet('openFirebase').href,'https://sales-markatus.web.app');
assert.match(firebaseGet('firebaseStatus').textContent,/abgeschlossen/);
console.log('PASS Firebase-Test startet zuerst den HQ-Abgleich und zeigt danach den Datenbank-Link.');
