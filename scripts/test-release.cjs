const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {canonical, digest, hashes, same, checkSettings, checkRemoteBaseline, appFiles} = require('./release-lib.cjs');
const {tagValid, trackedHashes} = require('./release.cjs');
let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS ' + name); }
test('Windows-Zeilenenden ändern den Codefingerabdruck nicht', () => assert.equal(digest('Code.gs', 'a\r\nb\r\n'), digest('Code.gs', 'a\nb\n')));
test('Inhaltsänderungen werden erkannt', () => assert.notEqual(digest('Code.gs', 'a\n'), digest('Code.gs', 'b\n')));
test('Manifestvergleich ignoriert Einrückung und Reihenfolge der Objektschlüssel', () => assert.equal(canonical('a.json', '{"b":2,"a":1}'), canonical('a.json', '{ "a": 1, "b": 2 }')));
test('Zusätzliche oder fehlende Google-Dateien werden abgewiesen', () => { assert.throws(() => same({a: '1', extra: '2'}, {a: '1'}, 'Google'), /extra/); assert.throws(() => same({}, {a: '1'}, 'Google'), /a/); });
test('Zugriff und Ausführungsidentität dürfen nicht nebenbei geändert werden', () => { const webapp = {executeAs: 'USER_DEPLOYING', access: 'MYSELF'}; checkSettings({webapp}, {webapp: {access: 'MYSELF', executeAs: 'USER_DEPLOYING'}}); assert.throws(() => checkSettings({webapp}, {webapp: {...webapp, access: 'ANYONE'}})); });
test('Nur expliziter Firebase-Übergang erlaubt anonyme Loginseite ohne Identitätswechsel',()=>{
 const prior={webapp:{executeAs:'USER_DEPLOYING',access:'MYSELF'}},next={webapp:{executeAs:'USER_DEPLOYING',access:'ANYONE_ANONYMOUS'}},transition={status:'approved',from:'MYSELF',to:'ANYONE_ANONYMOUS',executeAs:'USER_DEPLOYING',authMode:'firebase'};
 checkSettings(next,prior,transition);assert.throws(()=>checkSettings(next,prior));
 for(const change of [{status:'applied'},{authMode:'legacy'},{executeAs:'USER_ACCESSING'},{from:'ANYONE'}])assert.throws(()=>checkSettings(next,prior,{...transition,...change}));
 assert.throws(()=>checkSettings({webapp:{...next.webapp,executeAs:'USER_ACCESSING'}},prior,transition));
});
test('Ungeeignete und als Argument missbrauchbare Tags werden abgewiesen', () => { tagValid('v0.10.0'); for (const value of ['--force', 'v1', 'v1.0.0;echo', '', null]) assert.throws(() => tagValid(value)); });
test('Nachträgliche Google-Änderungen werden vor dem Überschreiben erkannt', () => { const config = {appsScriptVersion: 30, files: {code: 'old'}}; checkRemoteBaseline(config, {versionNumber: 30}, {code: 'old'}); assert.throws(() => checkRemoteBaseline(config, {versionNumber: 31}, {code: 'old'})); assert.throws(() => checkRemoteBaseline(config, {versionNumber: 30}, {code: 'new'})); });
test('Git-Fingerabdrücke erhalten Zeilenumbrüche und erfassen alle sieben Dateien', () => assert.deepEqual(Object.keys(trackedHashes('HEAD')), appFiles));
test('Sicherungen beziehen zusätzliche Remote-Dateien ein und ignorieren clasp-Konfiguration', () => {
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'markatus-release-test-'));
 try { fs.writeFileSync(path.join(dir, '.clasp.json'), '{}'); fs.writeFileSync(path.join(dir, 'Extra.gs'), 'test\n'); assert.deepEqual(Object.keys(hashes(dir)), ['Extra.gs']); }
 finally { fs.rmSync(dir, {recursive: true}); }
});
console.log(`${count} Release-Prüfungen bestanden.`);
