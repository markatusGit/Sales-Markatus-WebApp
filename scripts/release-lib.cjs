const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');

const root = path.resolve(__dirname, '..');
const app = path.join(root, 'hq-benchmark');
const appFiles = ['Code.gs', 'FirebaseSync.gs', 'Index.html', 'Revenue.gs', 'Sales.html', 'SalesBackend.gs', 'appsscript.json'].sort();
function canonical(name, value) {
  const sort = item => Array.isArray(item) ? item.map(sort) : item && typeof item === 'object' ? Object.fromEntries(Object.keys(item).sort().map(key => [key, sort(item[key])])) : item;
  return name.endsWith('.json') ? JSON.stringify(sort(JSON.parse(value))) : value.replace(/\r\n/g, '\n');
}
function digest(name, value) {
  return crypto.createHash('sha256').update(canonical(name, value)).digest('hex');
}
function hashes(dir) {
  const names = fs.readdirSync(dir).filter(n => /\.(gs|html|json)$/.test(n) && !n.startsWith('.')).sort();
  return Object.fromEntries(names.map(n => [n, digest(n, fs.readFileSync(path.join(dir, n), 'utf8'))]));
}
function same(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const names = [...new Set([...Object.keys(actual), ...Object.keys(expected)])];
    throw Error(`${label}: Abweichung bei ${names.filter(n => actual[n] !== expected[n]).join(', ')}`);
  }
}
function localHashes() {
  return Object.fromEntries(appFiles.map(n => [n, digest(n, fs.readFileSync(path.join(app, n), 'utf8'))]));
}
function run(exe, args, options = {}) {
  const result = spawnSync(exe, args, {cwd: root, encoding: 'utf8', windowsHide: true, timeout: 180000, maxBuffer: 16 * 1024 * 1024, ...options});
  if (result.error || result.status !== 0) throw Error(`${path.basename(exe)} ${args[0]} fehlgeschlagen:\n${result.error?.message || result.stderr || result.stdout}`);
  return options.raw ? result.stdout : result.stdout.trim();
}
function git(...args) { return run('git', args); }
function claspPath() {
  const candidates = [process.env.CLASP_CLI, path.join(root, 'node_modules/@google/clasp/build/src/index.js')];
  if (process.env.APPDATA) candidates.push(path.join(process.env.APPDATA, 'npm/node_modules/@google/clasp/build/src/index.js'));
  candidates.push(...(process.env.PATH || '').split(path.delimiter).map(p => path.join(p, 'node_modules/@google/clasp/build/src/index.js')));
  const found = candidates.find(p => p && fs.existsSync(p));
  if (!found) throw Error('clasp fehlt. @google/clasp 3.4.1 installieren oder CLASP_CLI auf dessen index.js setzen.');
  return found;
}
function clasp(args, cwd = app) { return run(process.execPath, [claspPath(), '--project', path.join(cwd, '.clasp.json'), '--ignore', path.join(cwd, '.claspignore'), ...args], {cwd}); }
function claspJson(args, cwd) { return JSON.parse(clasp(['--json', ...args], cwd)); }
function readConfig() {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'deployment.json'), 'utf8'));
  const project = JSON.parse(fs.readFileSync(path.join(app, '.clasp.json'), 'utf8'));
  if (config.scriptId !== project.scriptId) throw Error('deployment.json und .clasp.json verweisen auf unterschiedliche Projekte.');
  if (!config.dashboardConfirmedByUser || !config.deploymentId || !config.dashboardUrl?.endsWith(`/${config.deploymentId}/exec`)) throw Error('Bestätigte bestehende Dashboard-URL fehlt.');
  return config;
}
function remoteSnapshot(config, version, label) {
  const parent = path.join(root, '.release');
  fs.mkdirSync(parent, {recursive: true});
  const dir = fs.mkdtempSync(path.join(parent, `${label}-`));
  fs.writeFileSync(path.join(dir, '.clasp.json'), JSON.stringify({scriptId: config.scriptId, rootDir: '.', scriptExtensions: ['.gs'], htmlExtensions: ['.html'], jsonExtensions: ['.json'], skipSubdirectories: true}));
  fs.writeFileSync(path.join(dir, '.claspignore'), '');
  clasp(['pull', ...(version ? ['--versionNumber', String(version)] : [])], dir);
  return {dir, files: hashes(dir)};
}
function deployment(config) {
  const result = claspJson(['list-deployments']);
  const found = result.find(d => d.deploymentId === config.deploymentId);
  if (!Number.isInteger(found?.versionNumber)) throw Error('Die festgelegte Bereitstellung fehlt oder verwendet keine feste Version.');
  return found;
}
function checkSettings(local, remote) {
  if (canonical('settings.json', JSON.stringify(local.webapp || null)) !== canonical('settings.json', JSON.stringify(remote.webapp || null))) throw Error('Web-App-Zugriff/Ausführung unterscheiden sich. Bereitstellungseinstellungen zuerst ausdrücklich klären.');
}
function checkRemoteBaseline(config, active, files) {
  if (config.appsScriptVersion && active.versionNumber !== config.appsScriptVersion) throw Error('Google-Bereitstellung wurde außerhalb des dokumentierten Ablaufs verändert. Zuerst zuordnen.');
  if (Object.keys(config.files || {}).length) same(files, config.files, 'Google-Editor seit letzter zugeordneter Version');
}
function checkTrackedFiles() {
  const names = git('ls-files', '-z').split('\0').filter(Boolean);
  for (const name of names) {
    if (/(^|\/)(\.clasprc[^/]*|\.env(?:\..*)?|credentials[^/]*\.json|client_secret[^/]*\.json|[^/]*service-account[^/]*\.json)|\.(pem|key)$/i.test(name) && !name.endsWith('.env.example')) throw Error(`Lokale Zugangsdaten dürfen nicht versioniert sein: ${name}`);
    if (/^(tmp|output|\.release|secrets)\//.test(name)) throw Error(`Lokale Ausgabe darf nicht versioniert sein: ${name}`);
    const content = git('show', `:${name}`);
    if (/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(content)) throw Error(`Privater Schlüssel im Git-Index: ${name}`);
  }
}
module.exports = {root, app, appFiles, canonical, digest, hashes, same, localHashes, run, git, clasp, claspJson, readConfig, remoteSnapshot, deployment, checkSettings, checkRemoteBaseline, checkTrackedFiles};
