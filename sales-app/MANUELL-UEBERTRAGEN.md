# Sales Markatus manuell nach Google Apps Script übertragen

## Aktueller Schritt: Kontakthistorie in beide Richtungen testen – r11

Stand: 27.09.2026 · **2026-09-27-r11**. Die E-Mail-Übertragung ist vom Nutzer bestätigt. Vor dem vereinbarten Aufräumen und Ausbau der Ausgabenverwaltung, des manuellen Imports und der Magazinfilter folgt jetzt die Live-Prüfung der Kontakthistorie.

**Beide Dateien ersetzen: [SalesBackend.gs](../hq-benchmark/SalesBackend.gs) und [Sales.html](../hq-benchmark/Sales.html).** Keine neuen oder geänderten Skripteigenschaften, Manifestwerte oder Zugriffseinstellungen. Alle übrigen Apps-Script-Dateien bleiben für dieses Update unverändert.

Lokal sind 94 synthetische Prüfungen bestanden. Die Annahme der Historienfelder und ihre Darstellung im echten HQ-Mandanten sind erst durch den folgenden Nutzertest bestätigt. Es wurden von Codex keine echten HQ-/Firebase-Schreibtests durchgeführt.

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
8. Oben die Kennung **2026-09-27-r11** prüfen. Bei einer anderen Kennung zunächst die beiden Dateiersetzungen und die ausgewählte Bereitstellung kontrollieren; noch keinen Schreibtest starten.

Nur Speichern ohne neue Bereitstellungsversion aktualisiert die /exec-App nicht. Konto und bestehende Zugriffs-/Skripteinstellungen beibehalten.

## Den Button finden

Der Nutzer hat den Leseweg aus HQ erfolgreich getestet. r11 korrigiert den fehlenden Einstieg zum Schreibtest: Eigene Testfirmen führen jetzt sowohl über ihre lokale Kennung als auch über die HQ-ID zur gleichen Kundenkarte. **Kommunikation erfassen** steht oben auf der Kundenkarte und im Historienbereich.

1. In der App **Kunden** öffnen.
2. Die bereits angelegte eigene **TEST**-Firma auswählen.
3. Oben auf **Kommunikation erfassen** klicken. Erwartung: Das Formular öffnet sich.
4. Falls der Button deaktiviert ist, den Text daneben lesen.
5. Bei einer noch offenen Firmen-/Ansprechpartneranlage auf **Anlageauftrag öffnen** klicken.
6. Den dort angebotenen Prüfschritt ausführen. Erwartung: **Bestätigt**; bei **Ausgang unklar** zuerst nur das HQ-Ergebnis prüfen und bei anhaltendem Fehler den technischen Text mitteilen.
7. Nach erfolgreichem Abschluss dieselbe Kundenkarte erneut öffnen.

Bei echten Bestandskunden bleibt der Button mit einem erklärenden Hinweis deaktiviert. Für den vereinbarten Schreibtest **Zu den Testfirmen** anklicken und dort bei der eigenen Firma **Firmendetails** öffnen. Der Name TEST allein schaltet keine aus HQ importierte Firma frei; es muss die über die App angelegte Testfirma sein. Keine neue Firma nötig.

## Alle Kontaktarten

| Auswahl in der App | HQ-Kontaktart | Besonderheit |
| --- | --- | --- |
| Notiz | Note | Text und Kontaktzeitpunkt |
| E-Mail dokumentieren | Mail | Historieneintrag; kein Nachrichtenversand |
| Telefonat | Call | Anruf, mit erreicht/nicht erreicht |
| Meeting / Besprechung | Meeting | Besprechung |
| Besuch | Visit | Besuch |
| Aufgabe | Task | HQ-Verantwortlicher und optionaler Termin / nächster Kontakt |

Rechnungsversand bleibt eine gelesene HQ-Systemhistorie; die App erstellt keine Rechnung. Für Aufgaben werden die dokumentierten Felder responsibleUserIds und nextContactDate verwendet. Reached/NotReached bedeutet erreicht/nicht erreicht und wird nicht als Erledigungsstatus einer Aufgabe ausgegeben. Erledigen und automatischer Erinnerungsversand sind hier noch nicht angebunden.

## Test A: Bestehende HQ-Historie in der App ansehen (bereits positiv gemeldet)

1. In der Web-App links **Kunden** öffnen.
2. Eine bereits importierte Bestandsfirma aus Ausgabe #70 öffnen, bei der HQ sowohl Kommunikation als auch Rechnungsversand enthält. Diese Firma wird nur gelesen.
3. Falls noch keine Firmendetails vorliegen, **2 · Details HQ → Firebase** anklicken. Erwartung: Die Firmendetails erscheinen; bei Fehlermeldung deren technischen Text mitteilen und stoppen.
4. Zum Abschnitt **Kontakt-Historie** scrollen.
5. **Historie aus HQ aktualisieren** anklicken.
6. Die Abschlussmeldung abwarten. Erwartung: Eine Anzahl vollständig übertragener HQ-Historieneinträge und ein aktualisierter Zeitpunkt beim letzten vollständigen Historienimport.
7. Unter **Anzeige** den Wert **Alle Einträge** auswählen.
8. Die Einträge mit der Kontakthistorie derselben Firma in HQ vergleichen. Erwartung: Kein ausgelassener Eintrag; Inhalt und Datum stimmen. Die Reihenfolge ist neueste zuerst.
9. Unter **Anzeige** den Wert **Rechnungen / Dokumentversand** auswählen.
10. Einen eindeutig zuordenbaren Rechnungsversand prüfen. Erwartung: In der Übersicht stehen Projektname, Versanddatum und Netto-Rechnungsbetrag.
11. Bei diesem Eintrag **Versanddetails und E-Mail anzeigen** aufklappen. Erwartung: Betreff und vollständiger gespeicherter Text werden sichtbar.
12. Unter **Anzeige** den Wert **Kommunikation** auswählen.
13. Eine Notiz oder ein Telefonat prüfen. Erwartung: Betreff, Datum/Uhrzeit, Kontaktart und Inhalt sind sichtbar; lange Inhalte lassen sich aufklappen.
14. Bei einem längeren Eintrag **Vollständigen Inhalt anzeigen** aufklappen. Erwartung: Der gesamte gespeicherte Text ist vorhanden.

Bei fehlender oder mehrdeutiger Rechnungsnummer zeigt die App ausdrücklich die ungeklärte Zuordnung und keinen geratenen Betrag. Ein unbekannter Projektname bleibt ebenfalls erkennbar. Solche Fälle bitte melden; es ist kein Anlass, in HQ neue Rechnungen oder Projekte anzulegen. „Datum“ in der kompakten Versandübersicht ist der Kontakt-/Versandzeitpunkt; das Belegdatum steht in den Details.

## Test B: App → Firebase → HQ → App

Voraussetzung ist dieselbe eigene Testfirma mit vollständig bestätigter Firmen-/Kontaktanlage. Falls dort noch **Kontakt in HQ · Prüfung offen** steht, zuerst **2. Ansprechpartner prüfen und abschließen** ausführen und auf **In HQ bestätigt** warten. Bei Abweichung den technischen Auftragstext mitteilen; keine neue Firma anlegen.

1. In der App links **Kunden** öffnen.
2. Die eigene bestätigte **TEST**-Firma öffnen.
3. Im Abschnitt **Kontakt-Historie** auf **Kommunikation erfassen** klicken.
4. Als Betreff beispielsweise **TEST Historie 01** eintragen.
5. Datum und Uhrzeit prüfen; die Voreinstellung ist die aktuelle lokale Zeit.
6. Als Kontaktart **Telefonat** auswählen.
7. Als Ergebnis **Erreicht / dokumentiert** auswählen.
8. Als Zuordnung **Zum angelegten Ansprechpartner** auswählen.
9. Unter **Notiz** einen eindeutig erkennbaren erfundenen Testtext mit zwei Zeilen eingeben.
10. Auf **In Firebase speichern** klicken.
11. Den neuen Eintrag auf der Kundenkarte prüfen. Erwartung: Sofort sichtbar mit **In Firebase · HQ offen**; die App hat noch nicht nach HQ geschrieben.
12. Beim Eintrag **Übertragung ansehen** anklicken.
13. In der Vorschau Firma, Betreff, Datum, Kontaktart, Zuordnung und Text prüfen. Bei einer Abweichung nicht übertragen und den Fehler melden.
14. Auf **Kommunikation nach HQ übertragen** klicken.
15. Die Rückmeldung abwarten. Erwartung: **Status: Bestätigt**. Bei einer anderen Meldung nach dem Fehlerabschnitt unten vorgehen.
16. In HQ dieselbe Testfirma öffnen.
17. Ihre Kontakthistorie öffnen.
18. Den neuen Testeintrag prüfen. Erwartung: Genau ein Eintrag mit dem eingegebenen Text, passendem Zeitpunkt, Telefonat und richtig zugeordnetem Ansprechpartner.
19. In der App auf **Zur Testfirma** klicken.
20. Auf **Historie aus HQ aktualisieren** klicken.
21. Den Testeintrag erneut prüfen. Erwartung: Weiterhin genau ein Eintrag, jetzt mit bestätigtem HQ-Stand.

## Test C: E-Mail-Notiz und Gegenrichtung

1. Bei derselben Testfirma erneut **Kommunikation erfassen** öffnen.
2. Einen anderen Testbetreff eintragen, beispielsweise **TEST E-Mail-Notiz 02**.
3. Als Kontaktart **E-Mail dokumentieren** auswählen.
4. Einen längeren erfundenen Text eingeben.
5. **In Firebase speichern** anklicken.
6. **Übertragung ansehen** öffnen.
7. Die Vorschau prüfen.
8. **Kommunikation nach HQ übertragen** anklicken. Erwartung: **Bestätigt**; in HQ erscheint ein Historieneintrag der Art E-Mail. Es wird keine E-Mail versendet.
9. In HQ bei derselben Testfirma manuell eine neue Notiz mit einem anderen Testbetreff anlegen. Hierfür die gewohnte HQ-Oberfläche verwenden; deren aktuelle Menübezeichnung wurde nicht live geprüft.
10. In der App dieselbe Kundenkarte öffnen.
11. **Historie aus HQ aktualisieren** anklicken.
12. Die zusätzliche HQ-Notiz prüfen. Erwartung: Sie erscheint mit ihrem Inhalt und Datum in der App; die vorherigen Einträge bleiben jeweils einmal vorhanden.

## Test D: Aufgabe und übrige Kontaktarten

1. Bei derselben eigenen bestätigten Testfirma **Kommunikation erfassen** öffnen.
2. Einen eindeutigen Testbetreff eingeben, beispielsweise **TEST Aufgabe 03**.
3. Als **Kontaktart** den Eintrag **Aufgabe** auswählen. Erwartung: Die Aufgabenfelder erscheinen; erreicht/nicht erreicht wird ausgeblendet.
4. Unter **Verantwortlicher in HQ** den für den Test vorgesehenen Benutzer auswählen.
5. Optional unter **Termin / nächster Kontakt** Datum und Uhrzeit eintragen.
6. Einen erfundenen Aufgabentext eingeben.
7. **In Firebase speichern** anklicken. Erwartung: Die Aufgabe ist sofort auf der Kundenkarte sichtbar.
8. **Übertragung ansehen** anklicken.
9. Verantwortlichen und Termin in der Vorschau prüfen.
10. **Kommunikation nach HQ übertragen** anklicken.
11. Auf **Bestätigt** warten. Bei einem Fehler den technischen Auftragstext mitteilen und nicht neu anlegen.
12. In HQ bei derselben Firma den neuen Historieneintrag öffnen.
13. Kontaktart Aufgabe, Text, Verantwortlichen und gegebenenfalls Termin vergleichen.
14. In der App **Zur Testfirma** anklicken.
15. **Historie aus HQ aktualisieren** anklicken. Erwartung: Genau ein Aufgabeneintrag; Verantwortlicher und Termin bleiben erhalten.

Wenn die Verantwortlichenauswahl leer oder veraltet ist:

1. **Daten-Testseite** öffnen.
2. **Auswahllisten HQ → Firebase** anklicken.
3. Nach erfolgreichem Import zur eigenen Testfirma zurückkehren.
4. Die Aufgabe erneut vorbereiten, sofern noch kein Auftrag gespeichert wurde. Besteht schon ein Auftrag, seinen technischen Status prüfen und nicht doppelt erfassen.

Nach dem ersten erfolgreichen Telefonat und der Aufgabe die übrigen Arten mit je einem eigenen Testbetreff nach demselben Speicher-/Vorschau-/Übertragungsablauf testen: Notiz, E-Mail dokumentieren, Meeting / Besprechung, Besuch. Jeweils die Kontaktart und den Inhalt in HQ vergleichen und anschließend erneut in die App importieren. Jede Art soll genau einen passenden Eintrag erzeugen.

## Bei einer Abweichung

- Bei einer falschen Firma oder Zuordnung in der Vorschau nicht übertragen.
- Bei **Ausgang unklar** in der App **Daten-Testseite** öffnen.
- Unter **Synchronisationsaufträge** den betreffenden Kommunikationsauftrag suchen.
- Einmal **Ergebnis nur in HQ prüfen** anklicken. Diese Aktion liest nur zurück und wiederholt den Schreibversuch nicht.
- Falls der Auftrag weiterhin offen bleibt, den Status und technischen Text unter dem Auftrag mitteilen; keine Firmen-/Personennamen, IDs, Kommunikationsinhalte oder Zugangsdaten mitsenden.
- Keinen neuen Auftrag mit demselben Text als Umgehung anlegen.
- Bei fehlender Schaltfläche prüfen, ob die eigene Testfirma vollständig bestätigt ist und die App die Kennung **2026-09-27-r11** trägt.
- Bei fehlerhaftem Leseimport den eingeblendeten technischen Text mitteilen. Der vorige vollständig gespeicherte Stand bleibt erhalten.

Nach dem Test bitte kurz zurückmelden:

- Waren alle erwarteten HQ-Historieneinträge in der App sichtbar?
- Waren die Rechnungen übersichtlich und die Texte aufklappbar?
- Ist das Telefonat genau einmal bei der richtigen Firma und Person in HQ angekommen?
- Ist die E-Mail-Notiz als Historieneintrag angekommen?
- Hat der erneute Import keine Doppelanzeigen erzeugt?
- Ist die direkt in HQ angelegte Notiz in der App erschienen?

## Danach: vereinbarter Ausbau

Nach erfolgreichem Live-Historientest folgt das Aufräumen des bestehenden Piloten und dann die im Chat bestätigten Punkte 1–3: mehrere Ausgaben mit echten Daten, ein übersichtlicher manueller Datenabgleich sowie Magazin-/Kundenansichten mit Historienfiltern. Der automatische Nachtlauf bleibt zurückgestellt. Die Schreibtests dieser Lieferung gelten weiterhin nur für selbst angelegte Testfirmen; Bestandsfirmen sind reine Leseziele.

## Bestehende Einrichtung und weitere Google-Konten

Diese Übersicht dient zur Orientierung; für r11 müssen diese Werte nicht erneut eingetragen werden:

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
