# Sales Markatus manuell nach Google Apps Script übertragen

Stand: 25.09.2026. Ab jetzt erstellt Codex die Dateien lokal; der Nutzer überträgt und veröffentlicht sie selbst. Keine weiteren automatischen Uploads oder Bereitstellungsänderungen ohne erneuten ausdrücklichen Auftrag.

## Aktueller Stand

Der letzte automatische Upload war bereits erfolgreich. Die bestehende Web-App wurde auf **Version 8** aktualisiert. Dieses erste Übergabepaket enthält denselben Programmstand; du musst ihn daher jetzt nicht erneut übertragen. Der echte Start-/Datenwegtest ist noch offen. Spätere Pakete werden nach der folgenden Anleitung übernommen.

Die App ist ein erster Datenpilot, noch keine vollständige produktive Vertriebs-App. Neue HQ-Schreibtests sind auf selbst angelegte Testfirmen begrenzt; die echten Firmen der Pilotausgabe werden ausschließlich gelesen. Bisher wurde mit der neuen App noch kein echter HQ-Schreibtest durchgeführt.

## 1. Paket entpacken

Die ZIP-Datei auf dem PC entpacken. Die sieben Programmdateien liegen anschließend neben dieser Anleitung. Die ZIP-Datei selbst wird nicht in den Apps-Script-Editor hochgeladen: Du kopierst die Inhalte der einzelnen Dateien.

## 2. Bestehendes Projekt öffnen

Öffne das vorhandene Projekt **Magazinvertrieb – HQ-Test** im [Apps-Script-Editor](https://script.google.com/home/projects/1QWMae8m5upOmPusbq2bS_IkIqRm8fVZHnjo-7U7ea6K0RglzOR4y7ZkJ/edit).

Benutze dieses bestehende Projekt, damit die hinterlegten HQ-/Firebase-Einstellungen und die Web-App-Adresse erhalten bleiben. Die Script Properties mit Token und Dienstkontoschlüssel bleiben unverändert. Sie sind nicht Bestandteil des Pakets.

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

## 5. Erster Test

Öffne die [bestehende Sales-App](https://script.google.com/a/macros/markatus.de/s/AKfycbxlNLBoZvy6SgSHHEFviByTN9bL07nb7kLzlUWaAcCs0Jmrc96lIrAyGNxUrwtevDWrFw/exec) mit deinem freigegebenen Google-Konto.

1. Links **Daten-Testseite** öffnen.
2. **1 · Firebase abfragen** anklicken. Noch fehlende Ausgabedaten sind beim ersten Start erwartbar.
3. **2 · Ausgabe HQ → Firebase** starten und das Ende abwarten. Dieser Schritt liest HQ und speichert die Kopie in Firebase.
4. **3 · Erneut aus Firebase lesen** anklicken.
5. Bei einer Fehlermeldung den genauen Meldungstext mitteilen. Keine Tokens, Schlüssel oder vollständigen Kundeninhalte senden.

Als Nächstes Firmendetails und Auswahllisten lesen. Echte Schreibtests erst danach mit einer eigens angelegten Testfirma durchführen.

## Hinweise zum Zugang

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

Codex liefert jeweils ein aktualisiertes Paket und nennt die tatsächlich geänderten Dateien. Du ersetzt diese Dateien und veröffentlichst eine neue Version. Erfolgreicher Upload, erfolgreicher App-Start und erfolgreicher HQ-Datentest bleiben getrennte Prüfschritte.
