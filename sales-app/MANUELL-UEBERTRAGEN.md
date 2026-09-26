# Sales Markatus manuell nach Google Apps Script übertragen

## Aktueller Schritt: Kontakt-E-Mail ergänzen – r9

Stand: 26.09.2026 · **2026-09-26-r9**. Der Lesetest hat bestätigt: Die E-Mail ist in Firebase vorhanden, aber sowohl am HQ-Kontakt als auch an seiner verknüpften Kontaktadresse leer. Die neue Version ergänzt sie am vorhandenen Ansprechpartner mit Vorschau und Rückprüfung. Für diesen Test dieselbe Firma und denselben Kontakt verwenden.

Die Änderung ist lokal geprüft. Die tatsächliche Übernahme durch HQ ist erst nach dem unten beschriebenen Live-Test bestätigt. Grundlage der Schreibfelder und des PUT-Endpunkts ist die [offizielle HQ-v2-Spezifikation](https://developer.hellohq.io/swagger20.json).

**Diesmal beide Dateien ersetzen: [SalesBackend.gs](../hq-benchmark/SalesBackend.gs) und [Sales.html](../hq-benchmark/Sales.html).** Keine neuen oder geänderten Skripteigenschaften, Manifestwerte oder Zugriffsrechte. Die übrigen Apps-Script-Dateien gehören nicht zu diesem Update.

## Backend-Datei ersetzen

1. Die lokale Datei [SalesBackend.gs](../hq-benchmark/SalesBackend.gs) in einem Texteditor öffnen.
2. Mit **Strg+A** den gesamten Inhalt markieren.
3. Mit **Strg+C** den Inhalt kopieren.
4. Das bestehende Projekt **Magazinvertrieb – HQ-Test** im [Apps-Script-Editor](https://script.google.com/home/projects/1QWMae8m5upOmPusbq2bS_IkIqRm8fVZHnjo-7U7ea6K0RglzOR4y7ZkJ/edit) öffnen.
5. Links die bestehende Datei **SalesBackend.gs** auswählen.
6. Mit **Strg+A** den gesamten bisherigen Inhalt markieren.
7. Mit **Strg+V** den Inhalt vollständig ersetzen.
8. Mit **Strg+S** speichern.

## HTML-Datei ersetzen

1. Die lokale Datei [Sales.html](../hq-benchmark/Sales.html) über **Rechtsklick → Öffnen mit → Editor** als Quelltext öffnen.
2. Mit **Strg+A** den gesamten Inhalt markieren.
3. Mit **Strg+C** den Inhalt kopieren.
4. Im Apps-Script-Editor links die bestehende HTML-Datei **Sales.html** auswählen.
5. Mit **Strg+A** den gesamten bisherigen Inhalt markieren.
6. Mit **Strg+V** den Inhalt vollständig ersetzen.
7. Mit **Strg+S** speichern.

## Bestehende Bereitstellung aktualisieren

1. Oben rechts **Bereitstellen → Bereitstellungen verwalten** öffnen.
2. Die bisher verwendete Web-App auswählen.
3. Auf das **Stiftsymbol** klicken.
4. Unter **Version** den Eintrag **Neue Version** auswählen.
5. Auf **Bereitstellen** klicken.
6. Die bisherige Web-App-Adresse mit dem Ende **/exec** öffnen.
7. Die Seite neu laden.
8. Oben die Kennung **2026-09-26-r9** prüfen. Bei einer anderen Kennung zunächst die beiden Dateiersetzungen und die ausgewählte Bereitstellung kontrollieren; noch keinen Schreibtest starten.

Nur Speichern ohne neue Bereitstellungsversion aktualisiert die /exec-App nicht. Konto und bestehende Zugriffs-/Skripteinstellungen beibehalten.

## Den bereits vorhandenen Ansprechpartner korrigieren

1. Links **Kunden** öffnen.
2. Dieselbe eigene Testfirma öffnen, deren Ansprechpartner bereits in HQ existiert und dessen E-Mail fehlt.
3. Auf **Kontakt-E-Mail ergänzen** klicken. Erwartung: Eine Vorschau erscheint; HQ wurde bisher nur gelesen. Fehlt die Schaltfläche, den aktuellen Auftragstext gemäß dem Fehlerabschnitt unten mitteilen.
4. Den Namen des Ansprechpartners in der Vorschau prüfen. Er muss der bereits angelegten Person entsprechen.
5. Die angezeigte E-Mail prüfen. Sie muss der in Firebase eingegebenen Adresse entsprechen.
6. Die angezeigte Kontaktanschrift prüfen. Bei vollständig leerer HQ-Kontaktanschrift übernimmt die Vorschau die Pflichtangaben aus dem Firmenentwurf und weist darauf hin. Eine schon teilweise gefüllte Anschrift wird nicht automatisch mit Firmendaten gemischt.
7. Wenn die Vorschau stimmt, **E-Mail jetzt in HQ ergänzen** anklicken.
8. Das Ergebnis abwarten. Erwartung: **Status: Bestätigt** und **E-Mail und erhaltene Kontaktdaten in HQ bestätigt.** Bei einer anderen Meldung dem Fehlerabschnitt folgen.
9. Auf **Zur Testfirma** klicken.
10. Auf **2. Ansprechpartner prüfen und abschließen** klicken. Dieser Schritt liest den bekannten Kontakt zurück und schließt den ursprünglichen Anlageauftrag ab.
11. Das Ergebnis abwarten. Erwartung: **In HQ bestätigt**. Der technische Zusatz in der Firmenbeschreibung wird erst beim vollständigen Abschluss entfernt.
12. In HQ dieselbe Testfirma neu laden.
13. In HQ den Bereich **Kontakte** öffnen.
14. Den vorhandenen Ansprechpartner öffnen.
15. Die E-Mail kontrollieren. Erwartung: Die eingegebene Adresse steht an diesem Kontakt; es gibt keinen zusätzlichen Ansprechpartner.
16. Die Firmenbeschreibung prüfen. Erwartung: Der technische Zusatz **[Sales-Test …]** ist entfernt.
17. Das Testergebnis mitteilen: E-Mail vorhanden oder weiterhin leer; Abschluss bestätigt oder konkrete technische Fehlermeldung.

## Bei einer Abweichung

- Bei falschem Namen, falscher E-Mail oder unerwarteter Anschrift in der Vorschau keine Übertragung starten.
- In der App **Daten-Testseite** öffnen.
- Zum Abschnitt **Synchronisationsaufträge** gehen.
- Den neuesten Auftrag zur E-Mail-Ergänzung suchen. Der ältere Anlageauftrag derselben Firma bleibt bis Schritt 10 separat offen.
- Bei **Ausgang unklar** einmal **Ergebnis nur in HQ prüfen** anklicken. Das liest nur zurück und wiederholt den Schreibversuch nicht.
- Bei bestätigter E-Mail-Korrektur mit **Kunden → eigene Testfirma → 2. Ansprechpartner prüfen und abschließen** fortfahren.
- Falls der Auftrag weiter offen oder gesperrt bleibt, seinen Status und den vollständigen technischen Text mitteilen; Firmennamen, IDs, E-Mail-Adressen und Zugangsdaten weglassen.
- Bei einem Fehler vor Erstellung des Korrekturauftrags den oben eingeblendeten Fehlertext mitteilen.
- Keine neue Firma und keinen zweiten Ansprechpartner als Umgehung anlegen.

Die Korrektur stoppt unter anderem bei einer gemeinsam genutzten Kontakt-/Firmenadresse, nicht vollständig lesbaren Kontaktfeldern oder einer Änderung seit der Vorschau. Vorhandene andere E-Mail-Adressen werden nicht überschrieben. Nach einem unklaren Schreibausgang bleibt ein weiterer Schreibversuch gesperrt.

## Neuanlage nach erfolgreichem Korrekturtest

Neue Ansprechpartner mit E-Mail erhalten in r9 bereits im Kontakt-POST eine eigene Kontaktadresse mit der E-Mail und den Anschriftangaben der Firma. Die beiden getrennten Schritte bleiben bestehen; es gibt noch keinen automatischen Nachtlauf.

1. Nach erfolgreicher Prüfung des vorhandenen Kontakts **Daten-Testseite** öffnen.
2. **Testfirma anlegen** anklicken.
3. Die Firmenfelder mit erfundenen Testangaben ausfüllen; der Name muss mit **TEST ** beginnen.
4. Die Kontaktfelder einschließlich einer Test-E-Mail ausfüllen.
5. **In Firebase speichern** anklicken. Erwartung: Firma und Ansprechpartner sind sofort in der App sichtbar.
6. **1. Firma in HQ anlegen und bestätigen** anklicken.
7. Die Meldung **Firma in HQ bestätigt · Kontakt offen** abwarten. Bei Abweichung den technischen Auftragstext mitteilen.
8. **2. Ansprechpartner nach HQ übertragen** anklicken.
9. Die Meldung **In HQ bestätigt** abwarten. Bei Abweichung den technischen Auftragstext mitteilen.
10. In HQ den Ansprechpartner bei dieser neuen Testfirma öffnen.
11. Die E-Mail prüfen. Erwartung: Sie wurde bereits bei der Neuanlage übernommen; eine separate Ergänzung ist nicht erforderlich.

## Bestehende Einrichtung und weitere Google-Konten

Diese Übersicht dient zur Orientierung; für r9 müssen diese Werte nicht erneut eingetragen werden:

| Skripteigenschaft | Vorhandene Konfiguration / Zweck |
| --- | --- |
| SALES_ADMIN_EMAIL | info@markatus.de – App-Administrator |
| SALES_ALLOWED_EMAILS | info@markatus.de,pp@markatus.de beziehungsweise die inzwischen ausdrücklich freigegebenen Adressen |
| FIREBASE_PROJECT_ID | Bestehendes Projekt sales-markatus beibehalten |
| FIREBASE_SERVICE_ACCOUNT_JSON | Bestehenden geheimen Dienstkontowert beibehalten, nicht teilen |
| HQ_API_TOKEN | Bestehenden geheimen HQ-Token beibehalten, nicht teilen |

Weitere vorhandene Benchmark-Einstellungen bleiben ebenfalls bestehen. Der Bereitsteller, der App-Administrator und erlaubte weitere Nutzer sind unterschiedliche Rollen. Die letzte bestätigte Google-Bereitstellung verwendet **Ausführen als: Ich** und **Nur ich**. Mit info@markatus.de funktioniert der Zugriff laut Nutzer. Der Zugang mit pp@markatus.de und ein regulärer Google-Login für weitere Nutzer bleiben ein eigenes offenes Arbeitspaket; die interne E-Mail-Freigabe allein öffnet die Google-Bereitstellung nicht.

## Arbeitsablauf für kommende Änderungen

Codex bereitet die Dateien lokal vor, nennt exakt die geänderten Dateien und nötige Einstellungen, pflegt das Projekttagebuch und sichert die geprüften Änderungen auf GitHub. Der Nutzer ersetzt die Dateien in Apps Script und stellt eine neue Version bereit. Lokale Prüfung, GitHub-Sicherung, Google-Bereitstellung und tatsächlicher HQ-Live-Test sind getrennte Schritte.
