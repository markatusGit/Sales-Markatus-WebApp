# Sales Markatus manuell nach Google Apps Script übertragen

Stand: 25.09.2026. Ab jetzt erstellt Codex die Dateien lokal; der Nutzer überträgt und veröffentlicht sie selbst. Keine weiteren automatischen Uploads oder Bereitstellungsänderungen ohne erneuten ausdrücklichen Auftrag.

## Aktueller Stand

Die bereitgestellte **Version 8** wurde inzwischen vom Nutzer getestet: App-Start, 21 Firmen mit Rechnungen und ein Kundendetailimport funktionieren. Das neue Detailupdate ist lokal vorbereitet und noch manuell zu übernehmen. Aktuelle Dateien stehen im Projektordner `hq-benchmark`; das frühere ZIP enthält noch den alten Stand.

Die App ist ein erster Datenpilot, noch keine vollständige produktive Vertriebs-App. Neue HQ-Schreibtests sind auf selbst angelegte Testfirmen begrenzt; die echten Firmen der Pilotausgabe werden ausschließlich gelesen. Bisher wurde mit der neuen App noch kein echter HQ-Schreibtest durchgeführt.

## 1. Lokale Dateien öffnen

Für dieses Update direkt die zwei unten genannten Dateien aus `hq-benchmark` verwenden. Ein ZIP ist nicht erforderlich. Die Tabelle in Abschnitt 3 beschreibt zusätzlich alle sieben Dateien für eine vollständige Übertragung; bei diesem Update bleiben die anderen fünf Dateien unverändert.

## 2. Bestehendes Projekt öffnen

Öffne das vorhandene Projekt **Magazinvertrieb – HQ-Test** im [Apps-Script-Editor](https://script.google.com/home/projects/1QWMae8m5upOmPusbq2bS_IkIqRm8fVZHnjo-7U7ea6K0RglzOR4y7ZkJ/edit).

Benutze dieses bestehende Projekt, damit die hinterlegten HQ-/Firebase-Einstellungen und die Web-App-Adresse erhalten bleiben. Die Script Properties mit Token und Dienstkontoschlüssel bleiben unverändert. Sie sind nicht Bestandteil des Pakets.

## Update vom 25.09.2026: Kundendetails nach dem ersten Live-Test

**Für dieses Update nur zwei Dateien ersetzen:** `hq-benchmark/SalesBackend.gs` → `SalesBackend.gs` und `hq-benchmark/Sales.html` → `Sales.html`. Jeweils den gesamten Inhalt übernehmen und die vorhandene Bereitstellung auf **Neue Version** setzen (Schritte unten). Keine neuen oder geänderten Skripteigenschaften, keine Änderung des Manifests oder des Bereitstellungszugriffs erforderlich. Der Zugang mit weiteren Konten ist durch dieses Update noch nicht gelöst.

Danach mit dem funktionierenden Bereitstellerkonto:

1. Den bereits geprüften Kunden öffnen.
2. **2 · Details HQ → Firebase** starten und Erfolgsmeldung abwarten; danach **3 · Erneut aus Firebase lesen**. Nur Neuladen ohne erneuten HQ-Import ergänzt die neuen Felder nicht.
3. Homepage vergleichen. Der Import verwendet zuerst die Homepage der Firma, dann die Website der Standardadresse und ersatzweise eine eindeutige Website der Rechnungsadresse. Die verwendete Adressquelle wird angezeigt. Falls weiterhin nichts erscheint, ist die tatsächliche HQ-Antwort noch zu untersuchen; der Adress-Fallback allein ist kein bestätigter Fix für den betroffenen Kunden.
4. In der Kontakt-Historie einen Rechnungsversand prüfen: Projektname, Versanddatum und Nettobetrag sollen kompakt erscheinen. **Versanddetails und E-Mail anzeigen** klappt Betreff, Belegdatum und vollständigen Text auf. Normale Gesprächsnotizen bleiben lesbar. Die Zuordnung nutzt eindeutige Rechnungsnummern desselben Kunden; bei fehlender oder mehrdeutiger Nummer erscheint ein Hinweis statt eines geratenen Betrags. Gemeinsame Magazinprojekte werden über die Beleg-/Historienbezüge berücksichtigt.
5. Unter Projekte einen abgeschlossenen und einen offenen Eintrag vergleichen. Abgeschlossene Projekte zeigen das tatsächliche Abschlussdatum, offene Projekte die **Planumsätze aus HQ**, keine Angebote. Plantermine stammen aus den HQ-Schätzungen (`Estimations`); bereits mit Belegen verknüpfte oder anders eingestufte Einträge sind separat aufklappbar. Planungsbeginn und Wiederholungsintervall ersetzen keine fehlenden Plantermine. Fakturierte Umsätze bleiben getrennt. Fehlt eine Quelle, steht das ausdrücklich dabei.
6. Wenn der neue Planumsatzabruf scheitert, bleibt der vorherige komplette Firebase-Stand erhalten. Den genauen Fehlertext mitteilen. Erst nach erfolgreichem Vergleich die eigene Testfirma anlegen.

Der Ausgabeimport mit 21 Unternehmen wurde vom Nutzer bereits bestätigt. Er muss für diese Detailprüfung nicht wiederholt werden. Die neuen Änderungen sind lokal mit synthetischen Daten geprüft; die Prüfung in eurem HQ erfolgt mit diesem Ablauf.

## 3. Dateien übernehmen

| Lokale Datei | Datei im Apps-Script-Editor | Typ |
| --- | --- | --- |
| `Code.gs` | `Code.gs` | Skript |
| `Revenue.gs` | `Revenue.gs` | Skript |
| `FirebaseSync.gs` | `FirebaseSync.gs` | Skript |
| `SalesBackend.gs` | `SalesBackend.gs` | Skript |
| `Index.html` | `Index.html` | HTML |
| `Sales.html` | `Sales.html` | HTML |
| `appsscript.json` | `appsscript.json` | Manifest |

Für jede Datei:

1. Die lokale Datei mit einem Texteditor öffnen, zum Beispiel Windows Editor. Bei HTML-Dateien **Rechtsklick → Öffnen mit → Editor** benutzen, damit du den Quelltext und nicht die Webseite siehst.
2. Den gesamten Inhalt mit **Strg+A**, **Strg+C** kopieren.
3. Die gleichnamige Datei im Apps-Script-Editor öffnen und ihren gesamten bisherigen Inhalt durch den kopierten Text ersetzen.
4. Fehlt eine Datei, neben **Dateien** auf **+** klicken und **Skript** oder **HTML** gemäß Tabelle wählen. Beim Namen nur `SalesBackend` beziehungsweise `Sales` eingeben; die Erweiterung ergänzt Google.

`SalesBackend.gs` und `Sales.html` müssen unterschiedliche Basisnamen behalten. Eine zusätzliche Skriptdatei namens `Sales.gs` gehört nicht zu diesem Paket. Bereits vorhandene Dateien ersetzen, keine zweiten Kopien mit Namen wie „Code2“ anlegen.

Falls `appsscript.json` nicht sichtbar ist: links **Projekteinstellungen** öffnen und **Manifestdatei „appsscript.json“ im Editor anzeigen** aktivieren. Danach zum Editor zurückkehren und den Inhalt übernehmen.

**Speichern** bzw. **Strg+S**. Keine einzelne Funktion über den Ausführen-Knopf starten; die Tests werden über die Web-App bedient.

## 4. Bestehende Web-App aktualisieren

1. Oben rechts **Bereitstellen → Bereitstellungen verwalten** öffnen.
2. Die vorhandene Web-App auswählen und auf das **Stiftsymbol** zum Bearbeiten klicken.
3. Unter **Version** ausdrücklich **Neue Version** auswählen.
4. Eine kurze Beschreibung eintragen, zum Beispiel „Sales-Datenpilot aktualisiert“.
5. **Ausführen als: Ich** und den derzeitigen Zugriff **Nur ich** beibehalten.
6. Auf **Bereitstellen** klicken und anschließend die bisherige Web-App-Adresse neu öffnen oder neu laden.

Nur das Speichern der Programmdateien aktualisiert eine bestehende `/exec`-Web-App nicht. Die vorhandene Bereitstellung bearbeiten, damit dieselbe Adresse erhalten bleibt.

## 5. Skripteigenschaften vollständig prüfen

**Diese Übersicht fehlte in der ursprünglichen Übergabe.** Die beiden `SALES_`-Eigenschaften werden vom Code gelesen, aber beim Datei-Upload nicht automatisch angelegt. Der zunächst eingebaute Standardwert passte nicht zum tatsächlichen Bereitstellerkonto. Ihr Fehlen ist damit eine ausgelassene Einrichtung und kein Beleg für gelöschte Einstellungen.

Unter **Projekteinstellungen → Skripteigenschaften** sind für die neue App diese fünf Einträge vorgesehen:

| Eigenschaft | Was jetzt zu tun ist | Zweck |
| --- | --- | --- |
| `SALES_ADMIN_EMAIL` | Neu anlegen: `info@markatus.de` | App-Administrator passend zum Bereitstellerkonto |
| `SALES_ALLOWED_EMAILS` | Neu anlegen: `info@markatus.de,pp@markatus.de` | Ausdrücklich erlaubte App-Konten; Googles zusätzliche Bereitstellungsfreigabe bleibt erforderlich |
| `FIREBASE_PROJECT_ID` | Bestehenden Wert `sales-markatus` beibehalten | Datenbankprojekt |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Vorhandenen geheimen Wert beibehalten, nicht teilen oder hier ersetzen | Serverseitiger Datenbankzugriff |
| `HQ_API_TOKEN` | Vorhandenen geheimen Wert beibehalten, nicht teilen oder hier ersetzen | HQ-Abrufe und begrenzte Testaufträge |

Falls die beiden neuen Eigenschaften inzwischen angelegt wurden, keine doppelten Einträge erstellen; nur ihre Werte prüfen. Der jetzige Inhalt der entfernten Skripteigenschaften wurde nicht ausgelesen. Der erfolgreiche ältere Firebase-Pilot ist ein Hinweis auf eine frühere funktionierende Einrichtung, keine neue Prüfung ihrer heutigen Werte.

Für die **alte Benchmark-Seite** kommen `HQ_BENCH_ALLOWED_EMAILS` (bisherige freigegebene Benchmark-Nutzer) und `HQ_BENCH_CASES` (bestehende Testszenarien) hinzu. Diese alten Einstellungen vorerst beibehalten; sie steuern nicht den Zugang zur neuen Sales-Startseite. `HQ_BENCH_ACTIVE_RUN` ist ein interner vorübergehender Laufstatus und wird nicht von Hand angelegt.

Die Google-Bereitstellung bleibt vorerst **Ausführen als: Ich** und **Zugriff: Nur ich**. Zunächst mit dem tatsächlichen Bereitstellerkonto testen. Die Aufnahme des zweiten Kontos in `SALES_ALLOWED_EMAILS` allein öffnet die Google-Bereitstellung nicht für dieses Konto.

## 6. Erster Test

Öffne die [bestehende Sales-App](https://script.google.com/a/macros/markatus.de/s/AKfycbxlNLBoZvy6SgSHHEFviByTN9bL07nb7kLzlUWaAcCs0Jmrc96lIrAyGNxUrwtevDWrFw/exec) mit deinem freigegebenen Google-Konto.

1. Links **Daten-Testseite** öffnen.
2. **1 · Firebase abfragen** anklicken. Noch fehlende Ausgabedaten sind beim ersten Start erwartbar.
3. **2 · Ausgabe HQ → Firebase** starten und das Ende abwarten. Dieser Schritt liest HQ und speichert die Kopie in Firebase.
4. **3 · Erneut aus Firebase lesen** anklicken.
5. Bei einer Fehlermeldung den genauen Meldungstext mitteilen. Keine Tokens, Schlüssel oder vollständigen Kundeninhalte senden.

**Erwartetes Ergebnis:** Nach Schritt 4 zeigt die Testseite einen Importzeitpunkt und die Zahl der Unternehmen. Unter Kunden und Buchungshistorie sollen Daten der Ausgabe #70 erscheinen. Ein leerer Firebase-Stand vor dem ersten Import ist erwartbar; eine technische Fehlermeldung ist es nicht. Der erfolgreiche App-Start allein bestätigt noch keinen erfolgreichen Datenimport.

### Danach: Eine Firma genauer prüfen

1. Unter **Kunden** eine Firma der Ausgabe #70 öffnen.
2. **1 · Firebase abfragen** anklicken. Ansprechpartner, Kontakt-Historie und Projekte können noch fehlen, da diese separat importiert werden.
3. **2 · Details HQ → Firebase** anklicken und die Rückmeldung abwarten.
4. **3 · Erneut aus Firebase lesen** anklicken.
5. Direkt mit HQ vergleichen: Firmenname/Kundennummer, Standardadresse (ersatzweise Rechnungsadresse), eigene Felder, Ansprechpartner, Kontakt-Historie und direkt zugeordnete Projekte. Fehlende Daten oder falsche Zuordnungen festhalten. Projektumsätze und Ausgabeumsatz anhand bekannter Belege einschließlich Gutschriften prüfen; angezeigte Hinweise auf vorläufige Summen beachten.

### Danach: Auswahllisten und Ausgabe-Einstellungen

Auf der **Daten-Testseite** zuerst **Auswahllisten HQ → Firebase**, danach **Firebase erneut abfragen** anklicken. Benutzer, Firmenarten und Unternehmensbereiche sollen geladen sein. Auch dieser Schritt liest HQ nur.

Unter **Verwaltung** können Zielumsatz und Termine der Pilotausgabe gespeichert werden. Diese Änderung betrifft ausschließlich Firebase. Anschließend unter **Mein Tag** frisch aus Firebase laden und die Werte prüfen. Für die historische Ausgabe nachvollziehbare Werte verwenden; versehentliche Testwerte wieder korrigieren. Der Test mit mehreren angemeldeten Nutzern wartet auf die Mehrnutzer-Anmeldung.

### Erst nach erfolgreichen Lesetests: Eigene Testfirma

**Testfirma anlegen** öffnen, einen Namen beginnend mit `TEST` und ausschließlich erfundene Testdaten verwenden, den Verantwortlichen und Unternehmensbereich bewusst auswählen. Standard ist **Interessent**. Optional einen erfundenen Ansprechpartner mit erfassen. Mit **In Firebase speichern** entsteht zunächst ein Entwurf mit Übertragungsauftrag; in HQ wird dabei noch keine Firma angelegt.

Über **Auftrag ansehen** die Werte prüfen. Erst **Jetzt nach HQ übertragen und prüfen** erzeugt echte Einträge in HQ: zunächst die Testfirma, anschließend gegebenenfalls den zugehörigen Ansprechpartner. Danach die bestätigte HQ-ID und die Zuordnung in HQ prüfen. Bei **Ausgang unklar** keine zweite Testanlage starten, sondern **Ergebnis nur in HQ prüfen** verwenden und die Meldung auswerten. Firmen aus Ausgabe #70 bleiben reine Leseziele.

Kontakt-Historie und Änderungen von Branche/Homepage an dieser eigenen Testfirma sind nach erfolgreicher Anlage weitere Tests. Vollständige Bearbeitung aller Stammdaten, weitere Ausgaben und ausgabenübergreifende Filter sind noch nicht fertig.

## Hinweise zum Zugang

**Bestätigter Stand vom 25.09.2026:** Der Nutzer kann die App mit `info@markatus.de` öffnen. Mit `pp@markatus.de` erscheint auch in einem nur mit diesem Konto angemeldeten Inkognito-Fenster weiterhin die Google-Fehlerseite. Der letzte bestätigte Bereitstellungszugriff „Nur ich“ schließt dieses zweite Konto weiterhin aus. Der genaue Fehlertext allein erlaubt keine zusätzliche Diagnose.

**Noch offen:** Reguläre Google-Anmeldung für ausdrücklich freigegebene App-Nutzer, ohne Zugriff auf den Skripteditor und unabhängig von einem HQ-Konto. Die bestehende App verwendet die Apps-Script-Sitzung und eine E-Mail-Freigabeliste; ein eigener Google-Login ist noch nicht eingebaut. Firebase Authentication mit Google ist ein möglicher Baustein, dessen Einbindung einschließlich serverseitiger Identitätsprüfung noch geplant und getestet werden muss. Ein Login-Knopf allein löst die vorgeschaltete Google-Bereitstellungssperre nicht. Keine Hosting-Umstellung oder Erweiterung des Bereitstellungszugriffs vorgenommen.

**Korrektur vom 25.09.2026:** Laut Nutzer läuft das Apps-Script-Projekt unter `info@markatus.de`; `pp@markatus.de` ist ein anderes Testkonto. Der ursprüngliche Code setzte ohne Konfiguration fälschlich das Testkonto als einzigen App-Administrator voraus. Zusammen mit der Google-Bereitstellung „Nur ich“ führte dies zu widersprüchlichen Zugangshürden.

Für den ersten Zugang mit dem Bereitstellerkonto ist kein Dateiaustausch erforderlich:

1. Das bestehende Apps-Script-Projekt mit `info@markatus.de` öffnen.
2. **Projekteinstellungen → Skripteigenschaften → Skripteigenschaften bearbeiten** öffnen.
3. `SALES_ADMIN_EMAIL` auf `info@markatus.de` setzen.
4. `SALES_ALLOWED_EMAILS` auf `info@markatus.de,pp@markatus.de` setzen. Existieren diese beiden Eigenschaften bereits, ihre Werte gezielt bearbeiten. Andere Eigenschaften, insbesondere HQ-/Firebase-Zugangsdaten, unverändert lassen.
5. Eigenschaften speichern. Diese Werte liest die bereits bereitgestellte App bei jedem Serveraufruf; dafür ist keine neue Codeversion nötig.
6. Die Web-App in einem separaten Browserprofil oder privaten Fenster öffnen, in dem ausschließlich `info@markatus.de` angemeldet ist.

Das Bereitstellerkonto ist damit als App-Administrator konfiguriert; das Testkonto steht als normaler Nutzer auf der internen Liste. **Die zusätzliche Google-Zugangshürde für das Testkonto wird dadurch nicht aufgehoben.** Die Bereitstellung bleibt „Nur ich“, bis die Erweiterung gesondert freigegeben und eingerichtet ist. Der Screenshot des Nutzers zeigt eine Google-Drive-Fehlerseite; er beweist allein keine eindeutige Ursache. Gleichzeitige Google-Anmeldungen können ebenfalls zu Apps-Script-Zugriffsproblemen führen ([Google-Hinweise](https://developers.google.com/apps-script/guides/support/troubleshooting#issues_with_multiple_google_accounts)).

Die App enthält eine Verwaltung ausdrücklich freigegebener E-Mail-Adressen. Bei der aktuellen Google-Bereitstellung **Nur ich** kann trotzdem zunächst nur der Bereitsteller zugreifen. Die Google-Freigabe für weitere Nutzer wird gesondert eingerichtet; allein das Eintragen einer Adresse in der App reicht dafür noch nicht.

Für manuelles Kopieren im Editor ist keine Bereitstellung über die lokale Kommandozeile nötig. Die bereits aktivierte Apps Script API muss für diesen manuellen Ablauf nicht erneut eingerichtet werden.

## Künftige Updates

Codex nennt die tatsächlich geänderten Dateien im Projektordner und separat neue/geänderte Skripteigenschaften sowie nötige Bereitstellungseinstellungen. ZIP-Pakete gibt es nur auf Wunsch. Du ersetzt die genannten Dateien und veröffentlichst bei Codeänderungen eine neue Version. Bei ausschließlich geänderten Skripteigenschaften genügt deren Speicherung. Erfolgreicher Upload, vollständige Einrichtung, erfolgreicher App-Start und erfolgreicher HQ-Datentest bleiben getrennte Prüfschritte.
