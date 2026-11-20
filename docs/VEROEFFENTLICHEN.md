# Geprüft nach Google veröffentlichen und nach GitHub sichern

## r34.2: Startfehler behoben

- Die App neu laden (bei Bedarf Strg+F5); Kennung „2026-11-20-r34.2“ erwarten und keine rote Fehlermeldung.
- Danach die Schritte zu r34.1 und r34 verwenden.

## r34.1: Löschknopf und nicht übertragene Kunden

- Die App neu laden; Kennung „2026-11-20-r34.1“ erwarten.
- Einen Kunden öffnen; oben neben „Firmendaten bearbeiten“ den Knopf „Kunde löschen“ erwarten.
- Für einen noch nicht übertragenen App-Kunden: „Kunde löschen“ anklicken; den Hinweis „noch nicht an HQ übertragen“ erwarten.
- Grund eintragen und „Löschantrag stellen“ anklicken.
- Unter „Verwaltung“ → „Löschanträge anzeigen“ den Antrag mit „noch nicht in HQ“ erwarten.
- „Löschung freigeben“ und danach „Ja, endgültig löschen“ anklicken; den Status „Gelöscht“ erwarten. Der Kunde fehlt danach in der Kundenliste; in HQ passiert nichts.
- Für HQ-Kunden gilt weiter die Anleitung zu r34.

## r34: Kunden löschen live mit einer TEST-Firma prüfen

Keine Script Properties oder Bereitstellungseinstellungen zu ändern. Die Löschung in HQ ist bisher nur mit synthetischen Daten geprüft. Für den ersten echten Test ausschließlich eine eigene TEST-Firma ohne Projekte, Belege und Planumsätze verwenden.

- Die App neu laden; Kennung „2026-11-20-r34“ erwarten. Bei anderer Kennung diese melden.
- Unter „Kunden“ die eigene TEST-Firma öffnen.
- Auf „Kunde löschen“ klicken; ein Formular mit dem Pflichtfeld „Grund für die Löschung“ erwarten.
- Als Grund „Test Löschfunktion“ eintragen und „Löschantrag stellen“ anklicken; den Hinweis „Wartet auf Freigabe durch einen Admin“ erwarten. Bei „Löschen nicht möglich“ den genannten Grund melden.
- Links „Verwaltung“ öffnen.
- Bei „Löschanträge für Kunden“ auf „Löschanträge anzeigen“ klicken; den Antrag der TEST-Firma erwarten.
- „Löschung freigeben“ anklicken; die Rückfrage „Wirklich endgültig löschen?“ erwarten.
- „Ja, endgültig löschen“ anklicken; den Status „Freigegeben · wird beim nächsten HQ-Abgleich gelöscht“ erwarten.
- Unter „Datenabgleich“ den Abgleich mit „Synchronisieren“ starten und bis zum Ende laufen lassen.
- In HQ nach der TEST-Firma suchen; erwartet wird, dass Firma, Ansprechpartner und Kontakthistorie fehlen. Falls sie noch vorhanden ist, die Meldung des Abgleichs zum Löschauftrag melden.
- In der App unter „Kunden“ nach der TEST-Firma suchen; erwartet wird kein Treffer.
- Unter „Verwaltung“ → „Löschanträge anzeigen“ den Status „Gelöscht“ erwarten.

## r33: Firebase im normalen Betrieb

Die bisherigen r32-Hinweise zu HQ-Abfragen beim Formularöffnen und zum separaten Auswahllistenbutton sind aufgehoben. Anlage, Bearbeitung und Speichern verwenden Firebase; Listen werden im zentralen Datenabgleich aktualisiert. Nächtlicher Tagesstart ist noch nicht eingerichtet. Aktuell ausdrücklich über „Synchronisieren“ starten; der vorhandene Worker setzt diesen Lauf fort. Keine neuen Script Properties oder Bereitstellungseinstellungen nötig.

- Die App neu laden; Kennung „2026-11-18-r33“ erwarten. Bei anderer Kennung diese melden.
- „Firma hinzufügen“ öffnen; gespeicherte Auswahllisten ohne HQ-Lesehinweis erwarten. Bei einem Fehler den genauen Meldungstext nennen.
- Bei einem Kunden „Firmendaten bearbeiten“ öffnen; den in Firebase gespeicherten Stand erwarten. Bei abweichenden Daten nur den betroffenen Feldnamen melden.
- Eine tatsächlich gewünschte Änderung speichern; sofortige Firebase-Vormerkung ohne HQ-Übertragung erwarten. Bei einem Fehler bleibt die Eingabe erhalten; Meldung nennen.

Neue HQ-Auswahlwerte erscheinen erst nach einem abgeschlossenen zentralen Abgleich. Ein Fehler beim Lesen von Herkunftsoptionen erscheint dort als Hinweis; bisherige Optionen bleiben erhalten. Ein erfolgreicher Codevergleich ersetzt keine produktive Speicher-/HQ-Prüfung.

## r32: Gemeinsames Kundenformular prüfen

Keine Script Properties oder Bereitstellungseinstellungen zu ändern. Kundenanlage und „Firmendaten bearbeiten“ zeigen dieselben zehn Kundenfelder; die erste Ansprechpartneranlage bleibt zusätzlich im Anlageformular. Herkunft kann entsprechend dem tatsächlichen HQ-Feld mehrere Werte enthalten. „+ Neue Branche anlegen“ merkt einen Branchennamen vor; Übertragung nach HQ erfolgt zusammen mit dem Kunden über den bestehenden Datenabgleich. Kein eigener globaler HQ-Branchen-Endpunkt wird behauptet. Die folgenden fachlichen Schritte sind gesonderte Live-Abnahme, kein Teil des technischen Codevergleichs.

- Die App neu laden; „Stand 2026-11-18-r32“ erwarten. Bei anderer Kennung diese melden.
- „Firma hinzufügen“ öffnen; die vereinbarten Felder und darunter die bisherige Ansprechpartneranlage erwarten. Bei fehlenden HQ-Listen den genauen Meldungstext ohne Kundeninhalte nennen.
- Im Feld „HQ-Unternehmensbereich“ die Vorgabe „Markatus“ prüfen. Bei abweichender Vorgabe diese melden.
- Im Feld „Erstelldatum“ das heutige Datum prüfen. Bei abweichendem Datum dieses melden.
- „Kundenherkunft“ aufklappen; tatsächliche HQ-Auswahlwerte erwarten. Bei fehlenden Werten den Hinweistext melden.
- Im Feld „Branche“ den Eintrag „+ Neue Branche anlegen“ auswählen; ein kleines Eingabefenster erwarten. Bei fehlendem Fenster die Kennung melden.
- „Abbrechen“ anklicken; bisherige Formulareingaben erwarten. Bei fehlenden Eingaben den betroffenen Feldnamen melden.
- Einen vorhandenen Kunden öffnen.
- Oben auf „Firmendaten bearbeiten“ klicken; dieselben Kundenfelder mit bestehenden Werten erwarten. Bei Abweichungen nur Feldnamen und Meldungstext nennen.

Nur tatsächlich gewünschte Änderungen speichern. „HQ-Auswahllisten aktualisieren“ liest Metadaten und neue Branchenwerte; es startet keinen vollständigen Kundenimport und überträgt keine Kundenänderungen. Geprüfte Listen werden beim Öffnen 15 Minuten gemeinsam wiederverwendet. Echte HQ-Übertragung und Rückprüfung nach fachlicher Speicherung separat über den bestehenden Datenabgleich durchführen; unklare alte Anlageaufträge nicht erneut anlegen.

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

## r21 prüfen

Nach bestätigter Veröffentlichung ist keine manuelle Dateiersetzung nötig. Für die fachliche Bedienabnahme:

- Die bisherige Dashboard-URL neu öffnen; oben „Stand 2026-10-17-r21“ erwarten. Bei anderer Kennung diese im Chat melden.
- „Magazinverkauf“ öffnen; beim ersten Mal einmaligen Aufbau der kompakten Filterliste erwarten. Bei Kontingentfehler den Fehlertext melden und nicht wiederholt laden.
- Im Feld „Ort“ einen vorhandenen Ort auswählen; nur passende Firmen erwarten. Bei falschen Treffern die Filterauswahl ohne Kundendaten im Chat beschreiben.
- Im Feld „Historie“ den Wert „Mindestens einmal in den letzten 5 Ausgaben“ auswählen; passende Kunden oder einen ausdrücklichen Hinweis auf fehlende/unvollständige Ausgaben erwarten. Bei Abweichung den Hinweistext melden.
- „Datenabgleich“ öffnen; gespeicherten Fortschritt mit Zeitstempel erwarten. Es startet dadurch kein neuer HQ-Abgleich.
- „Fortschritt aktualisieren“ anklicken; ausschließlich eine neue Fortschrittsanzeige erwarten. Bei Fehler den technischen Text melden.
- Für die Inventur „Verwaltung“ öffnen; den Abschnitt „Technischer Speicherbestand“ erwarten. Bei fehlendem Abschnitt die angezeigte Appkennung melden.
- „Bestandsaufnahme starten“ anklicken; einen Teilstand für höchstens 50 gelesene Dokumente erwarten. Bei Fehler den technischen Text melden; nichts wird gelöscht.
- Für jede gewünschte Folgeseite einmal „Nächste Inventurseite lesen“ anklicken; die Mengen müssen fortgeschrieben werden, bis „Durchlauf vollständig“ erscheint. Bei Fehlern den Teilstand erhalten und den Fehlertext melden.

Die Inventur ist optional zur späteren Bereinigungsplanung, verbraucht selbst Lesezugriffe und ist keine Löschfreigabe. Eine Aufbewahrungsdauer wurde noch nicht festgelegt. Skripteigenschaften, Bereitstellungseinstellungen und Nachttrigger müssen für r21 nicht geändert werden.

## Kontrollierter Firebase-Zugangswechsel

Für den ausdrücklich beauftragten Benutzerlogin gibt es einen eng begrenzten Übergang von MYSELF zu ANYONE_ANONYMOUS auf derselben Bereitstellung bei unverändertem USER_DEPLOYING. Er benötigt in deployment.json einen konkreten genehmigten Übergang mit bestehender Bereitstellungs-ID, Ausgangsversion und Zeitpunkt der echten Administratorbestätigung. Der öffentliche Quellstand muss SALES_AUTH_REQUIRE_FIREBASE=true erzwingen. Ohne diese Angaben bricht die Vorprüfung ab. Die bisherigen Regeln zu fremden Änderungen, Tests, Fingerabdrücken und fester Bereitstellung bleiben bestehen. Private Einrichtungsstände benötigen keine Zugriffsänderung.

## r30: Kundenbearbeitung prüfen

Für diese Version sind keine Skripteigenschaften oder Bereitstellungseinstellungen zu ändern. Speicherung erfolgt zunächst in Firebase, HQ-Übertragung weiterhin über den vorhandenen Datenabgleich. Konten benötigen „Firmendaten und Adressen ändern“ bzw. „Ansprechpartner ändern“; Finanzfelder zusätzlich die Finanzfreigabe. Begonnene oder unklare Anlagen zuerst im vorhandenen Abgleich klären.

- Die bisherige App-Adresse neu laden; oben „Stand 2026-11-17-r30“ erwarten. Bei anderer Kennung diese im Chat melden.
- „Kunden“ öffnen.
- Den gewünschten Kunden öffnen.
- Unter „Allgemein“ auf „Firmendaten bearbeiten“ klicken; vorhandene und leere bearbeitbare Felder erwarten. Bei fehlender Schaltfläche die Kontofreigabe durch den Administrator prüfen lassen.
- Einen gewünschten bestehenden Wert ändern oder ein leeres Feld ausfüllen.
- „Änderungen in Firebase speichern“ anklicken; gespeicherte Kundendaten erwarten. Bei Fehler bleibt die Eingabe erhalten; die Meldung ohne Kundeninhalte mitteilen.
- Für eine Adresskorrektur auf „Adresse bearbeiten“ klicken.
- Für eine Kontaktkorrektur auf „Ansprechpartner bearbeiten“ klicken.

Ein reines Lese- oder Hinzufügen-Konto darf diese Bearbeitungsschaltflächen nicht sehen und serverseitig nichts ändern. Die Übertragung echter Änderungen nach HQ erfolgt erst über den bestehenden kontrollierten Abgleich; dafür keinen zusätzlichen Testkunden in HQ anlegen.

## r31: Bearbeitung und neue HQ-Felder prüfen

Keine Skripteigenschaften oder Bereitstellungseinstellungen zu ändern. Bereits begonnene/unklare Firmenanlagen behalten ihren ursprünglichen HQ-Auftrag; neue Änderungen warten getrennt in Firebase auf dessen Abschluss. Die bisherige r30-Aussage zur gesperrten Bearbeitung wird für diese reine Firebase-Vormerkung erweitert. Bestehende Rechte bleiben unverändert.

- Die App neu laden; „Stand 2026-11-18-r31“ erwarten. Bei anderer Kennung diese melden.
- „Kunden“ öffnen.
- Eine eigene Firma öffnen.
- Oben neben „Zur Kundenliste“ auf „Firmendaten bearbeiten“ klicken; den Stammdateneditor erwarten. Bei fehlendem Knopf Konto und angezeigten Anlagenstatus ohne Kundeninhalte melden.
- Ein gewünschtes vorhandenes Feld ändern.
- „Änderungen in Firebase speichern“ anklicken; bei offenem HQ-Ausgang ausdrücklich eine Vormerkung bis zur Klärung der ursprünglichen Anlage erwarten. Bei Fehler bleibt die Eingabe erhalten; technischen Text melden.
- Über einer kurzen Ansprechpartnerliste das Mausrad bewegen; die linke Kundenseite muss weiter scrollen. Bei Stillstand Anzahl der sichtbaren Kontakte nennen.
- „Zur Kundenliste“ anklicken.
- „Firma hinzufügen“ öffnen; „erstelldatum“ und „Kundenherkunft“ anhand der tatsächlichen HQ-Definition erwarten. Bei einem Hinweis auf fehlende HQ-Definition dessen Text melden, keinen Feldtyp erfinden.

Ein Datum oder mehrere Herkunftswerte sind optional. Bei Mehrfachwerten genau einen HQ-Wert pro Zeile eingeben. Ein vorhandener Erstelldatum-Wert wird nach Aktualisierung des betreffenden Kunden aus HQ auch in den Kundendetails angezeigt. Kein zusätzlicher Gesamtimport allein für diese Änderung.
