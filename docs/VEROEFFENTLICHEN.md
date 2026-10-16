# Geprüft nach Google veröffentlichen und nach GitHub sichern

Stand: 16.10.2026. Dieser Ablauf ersetzt die älteren manuellen Kopieranleitungen. Der Nutzer hat Google-Veröffentlichungen per clasp dauerhaft beauftragt. Google-Version 30 ist bereits vorhanden; die erstmalige Git-Zuordnung `v0.19.1` stellt nichts neu bereit.

## Was eingerichtet ist

Node 24 und clasp 3.4.1 sind auf diesem PC vorhanden. Google-Lesezugriff und GitHub-Zugriff wurden geprüft. Die bestätigte bestehende Bereitstellung steht in `deployment.json`; die Projekt-ID in `hq-benchmark/.clasp.json` ist kein Token. Die Anmeldung liegt außerhalb des Repositorys. Zugangsdaten müssen nicht in den Chat kopiert werden.

`npm run release:publish -- v0.19.2` führt nach erfolgreicher Vorprüfung den Upload per `clasp push --force`, eine feste Google-Version und die Aktualisierung **derselben Bereitstellungs-ID** aus. `--force` beantwortet die Manifestübernahme; vorher müssen die Dateien geprüft und committet sein und Zugriffs-/Ausführungseinstellungen mit Google übereinstimmen. Es wird keine zusätzliche Bereitstellung als Ersatz angelegt. Google-Versionen und Git-Tags sind unterschiedliche Nummerierungen.

Das Skript sichert zuvor den Google-Editor und die aktive Version unter `.release/`. Es prüft nach dem Upload den Editor, danach die feste Version und abschließend den GitHub-Tag. Es vergleicht auch die Dateiliste, damit zusätzliche Google-Dateien nicht unbemerkt verloren gehen. Script Properties werden weder ausgelesen noch durch Code-Upload angelegt. Änderungen daran sind weiterhin gesondert einzurichten und zu dokumentieren.

## Befehle im Projektordner

| Befehl | Ergebnis |
| --- | --- |
| `npm run build` | Austauschdateien aus den lokalen Appquellen erzeugen |
| `npm run check` | Syntax, JSON, Quellgleichheit generierter Dateien, Uploadliste, Git-Index auf Schlüsseldateien/private Schlüssel prüfen |
| `npm test` | Zusätzlich bestehende Logik-/Browserprüfungen und Tests der Vergleichsfunktionen ausführen |
| `npm run release:preflight -- v0.19.2` | Vollständige lokale Prüfungen, Git-/Google-Zugriff, Tag, Changelog, Sicherung und Einstellungen prüfen; nichts nach Google schreiben |
| `npm run release:publish -- v0.19.2` | Geprüften Stand veröffentlichen, Versionsnachweis/Dokumentation committen, Tag und main gemeinsam ohne Force-Push sichern |
| `npm run release:verify` | Feste Google-Version und Editor mit dem Git-Tag vergleichen und dessen Existenz auf GitHub/main bestätigen |
| `npm run release:recover` | Ausschließlich bereits dokumentierte Veröffentlichung nach unterbrochener GitHub-Sicherung abschließen; keinen erneuten Google-Upload auslösen |

## Ablauf bei einer künftigen Appänderung

Codex übernimmt diese Arbeiten im Rahmen des nächsten Appauftrags. Falls du sie selbst ausführst, gilt:

- Im Projektordner ein Terminal öffnen.
- `npm run build` ausführen; erwartet wird die Erzeugung von `Sales.html` und `SalesBackend.gs`. Bei Fehlern Veröffentlichung stoppen und die Meldung mitteilen.
- `npm test` ausführen; erwartet wird ein erfolgreicher Abschluss ohne fehlgeschlagenen Test. Bei Fehlern erst korrigieren lassen.
- Die Änderungen in Code und Dokumentation prüfen; fremde Änderungen vor einer Veröffentlichung getrennt einordnen.
- Den neuen Abschnitt beispielsweise `## [v0.19.2]` in `CHANGELOG.md` mit den tatsächlich geänderten Funktionen und Prüfungen vorbereiten.
- Auftrag, Entscheidungen und offene Punkte in `PROJEKTUEBERBLICK.md` aktualisieren.
- Den Arbeitsschritt im Projekttagebuch ergänzen.
- Die zum Auftrag gehörenden Dateien gezielt committen; erwartet wird ein sauberer Arbeitsstand. Bei weiteren Änderungen nicht pauschal alles hinzufügen.
- `npm run release:preflight -- v0.19.2` ausführen; erwartet wird „PASS Vorprüfung“. Bei Abweichungen die Meldung klären.
- `npm run release:publish -- v0.19.2` ausführen; erwartet werden eine Google-Versionsnummer, derselbe Dashboard-Link und eine erfolgreiche GitHub-Bestätigung. Bei Abbruch den Abschnitt „Unterbrechungen“ verwenden.
- Die bekannte Dashboard-URL öffnen; erwartet wird die vorgesehene Appkennung. Bei abweichender Kennung den technischen Stand melden.
- Die konkret geänderte Funktion mit dem zuvor vereinbarten Testfall prüfen; erwartetes Ergebnis wird im jeweiligen Appauftrag benannt. Bei Abweichung den technischen Fehler ohne Kundeninhalte melden.
- Das Ergebnis der Live-Prüfung im Chat mitteilen; erst danach darf es als live geprüft dokumentiert werden.

## Anmeldung und Werkzeuge auf einem anderen PC

Diese Schritte sind auf dem jetzigen PC derzeit nicht nötig.

- Node.js ab Version 20 installieren, falls `node --version` nicht verfügbar ist.
- `npm install -g @google/clasp@3.4.1` ausführen, falls clasp fehlt.
- Im Terminal `clasp login` ausführen, falls der Google-Zugriff eine erneute Anmeldung verlangt.
- Im geöffneten Google-Fenster das Konto mit Bearbeitungs- und Bereitstellungsrechten für dieses Apps-Script-Projekt auswählen.
- Die angezeigte Berechtigungsfreigabe abschließen; erwartet wird eine erfolgreiche Anmeldung im Terminal. Bei fehlenden Rechten den Projektverantwortlichen einbeziehen.
- Falls clasp ausdrücklich eine deaktivierte Apps-Script-API meldet, [Apps-Script-Einstellungen](https://script.google.com/home/usersettings) öffnen.
- Dort „Google Apps Script API“ einschalten, wenn dieser Fehler vorliegt.
- `npm run release:preflight -- v0.19.2` erneut ausführen; bei weiterhin fehlendem Zugriff den Fehlertext melden.

Die vorhandene Codex-Laufzeit mit Playwright und installiertem Edge wird für Browserprüfungen automatisch gefunden. Auf einem anderen PC kann Playwright lokal mit `npm install --no-save --package-lock=false playwright` ergänzt werden; ohne Edge ist zusätzlich `npx playwright install chromium` nötig. Alternativ kann `NODE_PATH` auf eine vorhandene Playwright-Installation und `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` auf einen vorhandenen Browser zeigen. Die Prüfungen werden bei fehlenden Voraussetzungen nicht still übersprungen.

## Versionsnachweis und Grenzen

`deployment.json` enthält Tag, Google-Versionsnummer, bestehende Bereitstellungs-ID, Quellcommit und SHA-256-Werte der sieben Dateien. Der Tag zeigt auf den anschließenden Dokumentationscommit; sein Appcode ist identisch mit dem Quellcommit. Zeilenenden werden vereinheitlicht und JSON-Objektschlüssel sortiert; sonstige Codeänderungen und fehlende/zusätzliche Dateien werden erkannt.

Der Status `google-version-verified` bezeichnet den erfolgreichen Google-Codevergleich. Ob GitHub ebenfalls bestätigt wurde, ergibt sich aus dem Abschluss von `release:verify`; dessen letzter technischer Nachweis liegt lokal unter `.release/verification.json`. Ein solcher Lauf prüft keine HQ-/Firebase-Funktion und verändert keine echten Kundendaten. Es erfolgt kein Firebase-Hosting-/Regel-Deploy.

Google und GitHub lassen sich nicht als gemeinsame atomare Transaktion aktualisieren. Scheitert GitHub nach einer Google-Veröffentlichung, ist Google möglicherweise bereits aktualisiert. Dieser Zustand wird ausdrücklich gemeldet und bleibt über `.release/pending.json` nachvollziehbar.

## Unterbrechungen

- Bei Fehlern den ausgegebenen technischen Text sichern; keine Tokens oder echten Daten weitergeben.
- `.release/pending.json` öffnen, falls die Datei vorhanden ist; erwartet wird der letzte erreichte Schritt mit Google-Versionsnummer, soweit bereits erzeugt.
- Bei `metadata-written` den Befehl `npm run release:recover` ausführen; er wiederholt den Codevergleich und die GitHub-Sicherung ohne erneuten Google-Upload.
- Bei früheren Schritten den technischen Stand im Chat nennen; Editor/Bereitstellung und Sicherung müssen zuerst lesend abgeglichen werden.
- Bei einem Hinweis auf `publish.lock` prüfen lassen, ob noch ein Veröffentlichungslauf arbeitet; die Sperre nicht während eines laufenden Vorgangs entfernen.

Kein blindes erneutes Veröffentlichen, kein Löschen der bestehenden Bereitstellung und kein Force-Push. Bei fehlenden GitHub-Rechten bleibt der lokale Commit erhalten und GitHub wird als offen gemeldet.

Offizielle technische Referenz: [Google clasp – Befehle und Aktualisieren einer bestehenden Bereitstellung](https://github.com/google/clasp), [Google Apps Script API – Projektinhalt](https://developers.google.com/apps-script/api/reference/rest/v1/projects/getContent).
