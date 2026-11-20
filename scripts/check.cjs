const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {root, app, appFiles, canonical, run, git, checkTrackedFiles} = require('./release-lib.cjs');

function appsScriptSyntax(source, name) {
  // Apps Script's parser rejects logical assignment, even though current Node accepts it.
  if (/\|\|=|&&=|\?\?=/.test(source)) throw Error(`${name}: logische Zuweisungsoperatoren sind für Apps Script nicht freigegeben.`);
  new vm.Script(source, {filename: name});
}

function check() {
  const sources = ['sales-app', 'hq-benchmark', 'firebase-pilot', 'scripts'];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const name = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(name);
      else if (/\.(cjs|mjs|js|gs)$/.test(name)) {
        if (name.endsWith('.gs')) appsScriptSyntax(fs.readFileSync(name, 'utf8'), name);
        else run(process.execPath, ['--check', name]);
      } else if (name.endsWith('.html')) {
        for (const match of fs.readFileSync(name, 'utf8').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
          if (/\bsrc\s*=|\btype\s*=\s*["'](?:module|application\/)/i.test(match[1])) continue;
          new vm.Script(match[2], {filename: name});
        }
      } else if (name.endsWith('.json') && !entry.name.startsWith('.clasp')) JSON.parse(fs.readFileSync(name, 'utf8'));
    }
  }
  sources.forEach(dir => walk(path.join(root, dir)));
  ['package.json', 'deployment.json', 'firebase.json'].forEach(n => JSON.parse(fs.readFileSync(path.join(root, n), 'utf8')));
  const read = n => fs.readFileSync(path.join(root, 'sales-app', n), 'utf8');
  const expectedBackend = ['Sales.gs','SalesStorage.gs','SalesV1.gs','SalesSync.gs','SalesBulkStore.gs','SalesBulkSync.gs','SalesDelta.gs','SalesWorker.gs','SalesLean.gs','SalesFields.gs','SalesBusiness.gs','SalesCommunication.gs','SalesDelete.gs','SalesAuth.gs','SalesAuthorization.gs','SalesPermissions.js'].map(read).join('\n');
  const expectedHtml = read('Sales.template.html').replace('<!--DEMO_STYLES-->', '<style>' + read('Sales.styles.css') + '</style>').replace('// V1_FUNCTIONS', ['SalesPermissions.js','SalesV1.js','SalesProjects.js','SalesLazy.js','SalesBusiness.js','SalesCommunication.js','SalesDelete.js','SalesAuth.js'].map(read).join('\n'));
  for (const [name, expected] of [['SalesBackend.gs', expectedBackend], ['Sales.html', expectedHtml]]) {
    if (canonical(name, fs.readFileSync(path.join(app, name), 'utf8')) !== canonical(name, expected)) throw Error(`${name} veraltet. Zuerst npm run build ausführen und Änderungen prüfen/committen.`);
  }
  appsScriptSyntax(expectedBackend, 'SalesBackend.gs');
  htmlServiceCommentSafe(expectedHtml, 'Sales.html');
  const ignore = fs.readFileSync(path.join(app, '.claspignore'), 'utf8').split(/\r?\n/).filter(Boolean);
  const expectedIgnore = ['**/**', ...appFiles.map(n => '!' + n)].sort();
  if (JSON.stringify([...ignore].sort()) !== JSON.stringify(expectedIgnore)) throw Error('.claspignore muss genau die sieben freigegebenen Dateien zulassen.');
  git('diff', '--check');
  checkTrackedFiles();
  console.log('PASS Syntax, JSON, generierte Dateien, Uploadliste und Git-Zugangsdatenprüfung');
}
// HtmlService strips comments with its own scanner before serving the page. A double slash inside code
// (for example in a regular expression or URL string) can be taken as a comment and cut the rest of the
// line, which breaks the whole page (r34.1: "Failed to execute 'write' on 'Document'"). Allow // only as a
// real comment: at the start of a line or after whitespace that follows a statement end.
function htmlServiceCommentSafe(html, name) {
  const bad = [];
  html.replace(/\r/g, '').split('\n').forEach((line, i) => {
    for (let at = line.indexOf('//'); at >= 0; at = line.indexOf('//', at + 2)) {
      const before = line.slice(0, at);
      if (/^\s*$/.test(before) || /[;{}),\]]\s+$/.test(before)) continue;
      bad.push(`Zeile ${i + 1}: ${line.slice(Math.max(0, at - 40), at + 20)}`);
    }
  });
  if (bad.length) throw Error(`${name}: doppelter Schrägstrich im Code wird von HtmlService als Kommentar abgeschnitten. Umschreiben (z. B. 'https:/'+'/' oder split('/')):\n` + bad.slice(0, 10).join('\n'));
}
function tests() {
  const env = {...process.env};
  const bundled = path.join(process.env.USERPROFILE || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  if (!env.NODE_PATH && fs.existsSync(path.join(bundled, 'playwright'))) env.NODE_PATH = bundled;
  if (!env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    const edge = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles].filter(Boolean).map(p => path.join(p, 'Microsoft/Edge/Application/msedge.exe')).find(p => fs.existsSync(p));
    if (edge) env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = edge;
  }
  const files = ['scripts/test-release.cjs', 'hq-benchmark/test-benchmark.cjs', 'hq-benchmark/test-revenue.cjs', 'hq-benchmark/test-revenue-ui.cjs', 'firebase-pilot/test-pilot.cjs', 'sales-app/test-sales.cjs', 'sales-app/test-sales-v1.cjs', 'sales-app/test-sales-sync.cjs', 'sales-app/test-sales-bulk.cjs', 'sales-app/test-sales-delta.cjs', 'sales-app/test-lean.cjs', 'sales-app/test-history-browser.cjs', 'sales-app/test-v1-browser.cjs', 'sales-app/test-worker-browser.cjs'];
  files.push('sales-app/test-lean-browser.cjs','sales-app/test-performance.cjs');
  files.push('sales-app/test-business.cjs','sales-app/test-business-browser.cjs');
  files.push('sales-app/test-customer-form-browser.cjs');
  files.push('sales-app/test-communication.cjs','sales-app/test-communication-browser.cjs');
  files.push('sales-app/test-delete.cjs','sales-app/test-delete-browser.cjs');
  files.push('sales-app/test-auth.cjs','sales-app/test-auth-browser.cjs');
  // Synthetic Firestore read/write model: keeps the documented consumption figures under regression test.
  files.push('scripts/audit-firestore.cjs','scripts/test-htmlservice.cjs');
  for (const name of files) {
    console.log(`Prüfe ${name}`);
    const output = run(process.execPath, [path.join(root, name)], {env});
    console.log(output.split(/\r?\n/).slice(-2).join('\n'));
  }
}
if (require.main === module) {
  try { check(); if (process.argv.includes('--tests')) tests(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = {check, tests, appsScriptSyntax};
