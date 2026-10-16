const fs = require('node:fs');
const path = require('node:path');
const {root, app, appFiles, digest, same, localHashes, run, git, clasp, claspJson, readConfig, remoteSnapshot, deployment, checkSettings, checkRemoteBaseline} = require('./release-lib.cjs');
const {check, tests} = require('./check.cjs');
const work = path.join(root, '.release');
const pendingPath = path.join(work, 'pending.json');
const metadataFiles = ['deployment.json', 'CHANGELOG.md', 'PROJEKTUEBERBLICK.md', 'docs/PROJEKTTAGEBUCH-UND-ROADMAP.md'];
function save(name, value) { fs.writeFileSync(name, JSON.stringify(value, null, 2) + '\n'); }
function append(name, value) { fs.appendFileSync(path.join(root, name), '\n' + value + '\n'); }
function tagValid(tag) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag || '')) throw Error('Git-Tag im Format v0.10.0 angeben.');
}
function clean() {
  if (git('status', '--porcelain')) throw Error('Noch lokale Änderungen vorhanden. Zugehörige Änderungen zuerst prüfen und gezielt committen; fremde Änderungen getrennt sichern.');
}
function trackedHashes(ref) {
  return Object.fromEntries(appFiles.map(name => [name, digest(name, run('git', ['show', `${ref}:hq-benchmark/${name}`], {raw: true}))]));
}
function syncBranch() {
  if (git('branch', '--show-current') !== 'main') throw Error('Veröffentlichung ist für den geprüften Branch main eingerichtet.');
  git('fetch', '--no-tags', 'origin', 'main');
  if (git('rev-list', '--count', 'HEAD..origin/main') !== '0') throw Error('origin/main enthält zusätzliche Commits. Zuerst Änderungen zusammenführen und erneut prüfen.');
}
function preflight(tag) {
  if (tag) tagValid(tag);
  if (fs.existsSync(pendingPath)) throw Error('Unvollständige Veröffentlichung vorhanden. .release/pending.json prüfen und release:recover verwenden; nicht erneut veröffentlichen.');
  const config = readConfig();
  clean(); syncBranch(); check(); tests();
  const cliVersion = clasp(['--version']);
  if (cliVersion !== '3.4.1') throw Error(`clasp ${cliVersion} statt geprüfter Version 3.4.1. Befehlsformat zuerst prüfen.`);
  const status = claspJson(['show-file-status']);
  same(Object.fromEntries(status.filesToPush.sort().map(n => [n, true])), Object.fromEntries(appFiles.map(n => [n, true])), 'clasp-Uploadliste');
  if (tag) {
    if (git('tag', '--list', tag) || git('ls-remote', '--tags', 'origin', `refs/tags/${tag}`)) throw Error(`Tag ${tag} existiert bereits.`);
    if (!fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8').includes(`## [${tag}]`)) throw Error(`CHANGELOG-Eintrag ## [${tag}] fehlt.`);
  }
  const active = deployment(config);
  const backup = remoteSnapshot(config, null, 'before-head');
  checkRemoteBaseline(config, active, backup.files);
  same(Object.fromEntries(Object.keys(backup.files).map(n => [n, true])), Object.fromEntries(appFiles.map(n => [n, true])), 'Google-Dateiliste vor Upload');
  const localManifest = JSON.parse(fs.readFileSync(path.join(app, 'appsscript.json'), 'utf8'));
  checkSettings(localManifest, JSON.parse(fs.readFileSync(path.join(backup.dir, 'appsscript.json'), 'utf8')));
  const deployed = remoteSnapshot(config, active.versionNumber, 'before-version');
  checkSettings(localManifest, JSON.parse(fs.readFileSync(path.join(deployed.dir, 'appsscript.json'), 'utf8')));
  same(localHashes(), trackedHashes('HEAD'), 'Lokale Dateien/Git');
  clean();
  console.log(`PASS Vorprüfung; bestehende Google-Version ${active.versionNumber}; keine Veröffentlichung ausgeführt.`);
  return {config, active, backup, sourceCommit: git('rev-parse', 'HEAD'), files: localHashes()};
}
function verify(options = {}) {
  const config = readConfig();
  if (!config.gitTag || !config.appsScriptVersion || !Object.keys(config.files || {}).length) throw Error('Noch keine mit Git-Tag zugeordnete Veröffentlichung.');
  tagValid(config.gitTag);
  const active = deployment(config);
  if (active.versionNumber !== config.appsScriptVersion) throw Error(`Google verwendet Version ${active.versionNumber} statt ${config.appsScriptVersion}.`);
  same(trackedHashes(config.gitTag), config.files, 'Git-Tag/Veröffentlichungsnachweis');
  same(trackedHashes(config.sourceCommit), config.files, 'Quellcommit/Veröffentlichungsnachweis');
  const snapshot = remoteSnapshot(config, config.appsScriptVersion, 'verify-version');
  same(snapshot.files, config.files, 'Google-Version/Git-Tag');
  const head = remoteSnapshot(config, null, 'verify-head');
  same(head.files, config.files, 'Google-Editor/Git-Tag');
  const tagCommit = git('rev-parse', `${config.gitTag}^{commit}`);
  const tagConfig = JSON.parse(run('git', ['show', `${config.gitTag}:deployment.json`], {raw: true}));
  same(tagConfig, config, 'Zuordnung im Git-Tag/lokal');
  if (!options.beforePush) {
    const remoteTag = git('ls-remote', '--tags', 'origin', `refs/tags/${config.gitTag}^{}`);
    if (remoteTag.split(/\s/)[0] !== tagCommit) throw Error('GitHub-Tag fehlt oder zeigt auf einen anderen Commit.');
    git('fetch', '--no-tags', 'origin', 'main');
    git('merge-base', '--is-ancestor', tagCommit, 'origin/main');
  }
  const evidence = {verifiedAt: new Date().toISOString(), gitTag: config.gitTag, tagCommit, appsScriptVersion: active.versionNumber, deploymentId: config.deploymentId, googleCodeEqual: true, githubTagVerified: !options.beforePush, files: config.files, liveFunctionTest: 'not-run'};
  save(path.join(work, 'verification.json'), evidence);
  console.log(`PASS Google-Version und Google-Editor = ${config.gitTag}; GitHub ${options.beforePush ? 'noch nicht geprüft' : 'Tag und main bestätigt'}. Live-Funktionstest gesondert durchführen.`);
}
function finalize(pending) {
  const config = readConfig();
  if (!pending.version || config.gitTag !== pending.tag || config.appsScriptVersion !== pending.version) throw Error('Lokalen Veröffentlichungsnachweis zuerst anhand pending.json vervollständigen.');
  same(localHashes(), pending.files, 'Quellcode nach Google-Veröffentlichung');
  const changes = git('diff', '--name-only', 'HEAD').split(/\r?\n/).filter(Boolean);
  if (changes.some(n => !metadataFiles.includes(n)) || git('ls-files', '--others', '--exclude-standard')) throw Error('Unerwartete Änderungen seit Veröffentlichung; vor Wiederaufnahme gezielt prüfen.');
  git('add', '--', ...metadataFiles);
  const staged = git('diff', '--cached', '--name-only').split(/\r?\n/).filter(Boolean);
  if (staged.some(n => !metadataFiles.includes(n))) throw Error('Fremde Dateien im Git-Index.');
  if (staged.length) git('commit', '-m', `Release ${pending.tag}: Apps Script ${pending.version}`);
  if (!git('tag', '--list', pending.tag)) git('tag', '-a', pending.tag, '-m', `${pending.tag}: Apps Script ${pending.version}`);
  if (git('rev-parse', `${pending.tag}^{commit}`) !== git('rev-parse', 'HEAD')) throw Error('Veröffentlichungs-Tag zeigt nicht auf HEAD; Wiederaufnahme manuell prüfen.');
  verify({beforePush: true});
  clean();
  git('push', '--atomic', 'origin', 'HEAD:refs/heads/main', `refs/tags/${pending.tag}`);
  verify();
  fs.renameSync(pendingPath, path.join(work, `completed-${pending.tag}.json`));
  console.log(`Veröffentlicht: ${pending.tag}; Apps Script ${pending.version}; bestehende Dashboard-URL unverändert.`);
}
function publish(tag) {
  tagValid(tag);
  const state = preflight(tag);
  const pending = {tag, sourceCommit: state.sourceCommit, files: state.files, previousVersion: state.active.versionNumber, backupDirectory: state.backup.dir, step: 'before-push'};
  save(pendingPath, pending);
  clasp(['push', '--force']);
  same(remoteSnapshot(state.config, null, 'after-push').files, state.files, 'Google-Editor nach Upload');
  pending.step = 'code-pushed'; save(pendingPath, pending);
  const created = claspJson(['create-version', `${tag} ${state.sourceCommit.slice(0, 12)}`]);
  if (!Number.isInteger(created.versionNumber)) throw Error('Google-Versionsnummer fehlt; keine Bereitstellung aktualisiert.');
  pending.version = created.versionNumber; pending.step = 'version-created'; save(pendingPath, pending);
  same(remoteSnapshot(state.config, pending.version, 'new-version').files, state.files, 'Neue Google-Version');
  claspJson(['create-deployment', '--deploymentId', state.config.deploymentId, '--versionNumber', String(pending.version), '--description', tag]);
  pending.step = 'deployment-updated'; save(pendingPath, pending);
  if (deployment(state.config).versionNumber !== pending.version) throw Error('Bestehende Bereitstellung verwendet die neue Version noch nicht.');
  const now = new Date().toISOString();
  save(path.join(root, 'deployment.json'), {...state.config, gitTag: tag, appsScriptVersion: pending.version, sourceCommit: state.sourceCommit, status: 'google-version-verified', files: state.files, googleCodeVerifiedAt: now, note: 'Codegleichheit der festen Google-Version geprüft. GitHub-Nachweis durch release:verify; Live-Funktionstest gesondert.'});
  const text = `Veröffentlichung ${tag}: Apps-Script-Version ${pending.version}, bestehende Bereitstellung beibehalten. Quellcommit ${state.sourceCommit}. Syntax-, Logik- und Browserprüfungen bestanden; Google-Codevergleich bestanden. GitHub-Sicherung/Tag werden anschließend ausgeführt und durch release:verify geprüft. Keine Skripteigenschaften oder Zugriffs-/Ausführungseinstellungen verändert. Live-Funktionstest offen. Zeitpunkt: ${now}.`;
  append('PROJEKTUEBERBLICK.md', text);
  append('docs/PROJEKTTAGEBUCH-UND-ROADMAP.md', `### Veröffentlichung ${tag}\n\n${text}`);
  append('CHANGELOG.md', `Veröffentlichungsnachweis für ${tag}: Google-Version ${pending.version}; ${now}. Details in deployment.json.`);
  pending.step = 'metadata-written'; save(pendingPath, pending);
  finalize(pending);
}
function main() {
  fs.mkdirSync(work, {recursive: true});
  const command = process.argv[2];
  if (command === 'verify') return verify();
  const lock = path.join(work, 'publish.lock');
  const fd = fs.openSync(lock, 'wx');
  try {
    if (command === 'preflight') preflight(process.argv[3]);
    else if (command === 'publish') publish(process.argv[3]);
    else if (command === 'recover') {
      const pending = JSON.parse(fs.readFileSync(pendingPath, 'utf8'));
      if (pending.step !== 'metadata-written') throw Error(`Unterbrochen bei ${pending.step}. Google-Stand und Sicherung zuerst lesend prüfen; keine automatische erneute Veröffentlichung.`);
      finalize(pending);
    } else throw Error('Erlaubt: preflight [vX.Y.Z], publish vX.Y.Z, verify, recover');
  } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}
if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); console.error('Kein Erfolg behauptet. Bei Teilveröffentlichung .release/pending.json prüfen; keine Version/kein Tag blind erneut erstellen.'); process.exitCode = 1; }
}
module.exports = {tagValid, trackedHashes};
