# Sales Markatus manuell nach Google Apps Script übertragen

Stand: 28.09.2026 · **2026-09-28-r14**. Kommunikation mit passenden Feldern und der beauftragte V1-Ausbau (mehrere Ausgaben, manueller Leseimport, gemeinsame Übersichten und Filter) sind lokal vorbereitet. Der bisherige Kommunikationsweg nach HQ wurde vom Nutzer bestätigt. Der neue Umfang muss nach der Bereitstellung live geprüft werden.

**Austauschdateien:** [SalesBackend.gs](../hq-benchmark/SalesBackend.gs) und [Sales.html](../hq-benchmark/Sales.html). Nur diese beiden Dateien übertragen. Keine neuen/geänderten Skripteigenschaften, Manifestwerte, Firestore-Regeln oder Zugriffseinstellungen. Kein automatischer Upload durch Codex.

## 1. Backend ersetzen

1. Die lokale Datei **hq-benchmark/SalesBackend.gs** in einem Texteditor öffnen.
2. Mit **Strg+A** den gesamten Inhalt markieren.
3. Mit **Strg+C** kopieren.
4. Das bestehende Projekt **Magazinvertrieb – HQ-Test** im [Apps-Script-Editor](https://script.google.com/home/projects/1QWMae8m5upOmPusbq2bS_IkIqRm8fVZHnjo-7U7ea6K0RglzOR4y7ZkJ/edit) öffnen.
5. Links **SalesBackend.gs** auswählen.
6. Mit **Strg+A** den gesamten bisherigen Inhalt markieren.
7. Mit **Strg+V** vollständig ersetzen.
8. Mit **Strg+S** speichern.

## 2. Oberfläche ersetzen

1. Die lokale Datei **hq-benchmark/Sales.html** über **Rechtsklick → Öffnen mit → Editor** als Quelltext öffnen.
2. Mit **Strg+A** den gesamten Inhalt markieren.
3. Mit **Strg+C** kopieren.
4. Im Apps-Script-Editor links **Sales.html** auswählen.
5. Mit **Strg+A** den gesamten bisherigen Inhalt markieren.
6. Mit **Strg+V** vollständig ersetzen.
7. Mit **Strg+S** speichern.

## 3. Bestehende Bereitstellung aktualisieren

1. **Bereitstellen → Bereitstellungen verwalten** öffnen.
2. Die bisherige Web-App auswählen.
3. Auf das **Stiftsymbol** klicken.
4. Unter **Version** den Eintrag **Neue Version** auswählen.
5. Auf **Bereitstellen** klicken.
6. Die bisherige Web-App-Adresse mit **/exec** als info@markatus.de öffnen.
7. Die Seite neu laden.
8. Oben **2026-09-28-r14** prüfen. Bei einer anderen Kennung oder unterschiedlichen Dateiständen zuerst die beiden Dateiersetzungen und die ausgewählte Bereitstellung kontrollieren; noch keinen Schreibtest starten.

Nur Speichern aktualisiert die /exec-App nicht. Die lokalen Dateien SalesV1.gs und SalesV1.js sind bereits in den beiden Austauschdateien enthalten und werden nicht zusätzlich in Google angelegt.

## 4. Kontaktformular prüfen

1. **Kunden** öffnen.
2. Die bereits über die App angelegte eigene **TEST**-Firma öffnen.
3. **Kommunikation erfassen** anklicken. Erwartung: Das Formular öffnet sich; bei einer Sperre die Versionskennung und den angezeigten Erklärungstext mitteilen.
4. Unter **Kontaktart** nacheinander die fünf Arten auswählen. Erwartung: Nur die unten genannten Eingabefelder erscheinen; **Aufgabe** fehlt.

| Kontaktart | Sichtbare Eingabefelder |
| --- | --- |
| Notiz | Betreff, Datum und Uhrzeit, Notiz / Text |
| E-Mail | Empfänger, Betreff, Notiz / Text |
| Anruf | Kontakt (Ansprechpartner), Datum und Uhrzeit, Status (Erreicht / Nicht erreicht), Betreff, Notiz / Text |
| Meeting | Kontakt (Ansprechpartner), Datum und Uhrzeit, Betreff, Notiz / Text |
| Besuch | Kontakt (Ansprechpartner), Datum und Uhrzeit, Betreff, Notiz / Text |

E-Mail erfasst eine Kommunikation; es wird keine Nachricht versendet. Der Zeitpunkt wird beim Speichern gesetzt. Mehrere Empfänger können durch Komma getrennt werden. Bereits aus HQ importierte Aufgaben bleiben in der historischen Anzeige erhalten. Neue Aufgaben und die Übertragung alter offener Aufgaben sind deaktiviert; awork folgt später.

### Einen Anruf vollständig testen

1. Unter **Kontaktart** den Wert **Anruf** auswählen.
2. Unter **Kontakt (Ansprechpartner)** einen Ansprechpartner dieser Testfirma auswählen. Fehlt er, den bestehenden Anlageauftrag prüfen und keine zweite Person anlegen.
3. **Datum und Uhrzeit** eintragen.
4. Unter **Status** den Wert **Erreicht** auswählen.
5. Unter **Betreff** einen erfundenen Testbetreff eintragen.
6. Unter **Notiz / Text** einen erfundenen Testtext eintragen.
7. **In Firebase speichern** anklicken. Erwartung: Der Eintrag erscheint sofort auf der Kundenkarte mit offenem HQ-Abgleich.
8. Beim Eintrag **Übertragung ansehen** anklicken.
9. Die Vorschau mit den eingegebenen Werten vergleichen. Bei Abweichung nicht übertragen und den Fehler melden.
10. **Kommunikation nach HQ übertragen** anklicken. Erwartung: **Status: Bestätigt**; bei einer anderen Meldung den Abschnitt „Bei einer Abweichung“ verwenden.
11. In HQ die Kontakthistorie derselben Testfirma öffnen.
12. Den neuen Eintrag prüfen. Erwartung: Genau ein Anruf mit passendem Ansprechpartner, Zeitpunkt, Status und Text.
13. In der App **Zur Testfirma** anklicken.
14. **Historie aus HQ aktualisieren** anklicken. Erwartung: Weiterhin genau ein Eintrag.

- Einen E-Mail-Eintrag mit einer erfundenen Empfängeradresse nach demselben Speicher-/Vorschau-/Übertragungsablauf testen. Erwartung: Empfänger, Betreff und Text kommen als HQ-Historieneintrag an; keine E-Mail wird verschickt.
- Notiz, Meeting und Besuch jeweils mit eigenem Testbetreff nach diesem Ablauf testen. Erwartung: Passende Kontaktart und Werte, jeweils genau ein Eintrag nach dem erneuten Import.

## 5. Magazine und Ausgaben zuordnen

Die aktuelle Verkaufsausgabe wird von dir festgelegt. #70 wird nicht automatisch zur aktuellen Ausgabe erklärt. Bestehende Daten und Einstellungen bleiben erhalten.

1. **Verwaltung** öffnen.
2. Zum Abschnitt **Magazine und Ausgaben** scrollen.
3. Unter **HQ-Projekt suchen (Name oder Projektnummer)** die Projektnummer einer gewünschten Ausgabe eingeben.
4. **Projekte in HQ suchen** anklicken. Erwartung: Passende Treffer; bei fehlendem Treffer die Schreibweise prüfen oder mindestens drei Zeichen des Projektnamens versuchen.
5. Unter **HQ-Sammelprojekt** das richtige Projekt anhand von Nummer und Name auswählen.
6. Unter **Magazinname** den Magazinnamen eintragen. Für alle Ausgaben desselben Magazins dieselbe Schreibweise verwenden, beispielsweise **COBURGER** für die vorhandene Pilotausgabe.
7. Unter **Ausgabennummer** die zugehörige Ausgabennummer eintragen.
8. Nur bei der aktuellen Verkaufsausgabe **Als aktuelle Verkaufsausgabe verwenden** anhaken.
9. **Ausgabe zuordnen** anklicken. Erwartung: Die Zuordnung erscheint unter **Bestehende Zuordnungen**; HQ wird dabei nur gelesen.
10. Diesen Zuordnungsablauf für jede der fünf direkt vorhergehenden Ausgaben wiederholen. Erwartung: Jede Ausgabe ist genau ihrem eigenen HQ-Projekt zugeordnet; einen Konflikthinweis nicht durch eine zweite Zuordnung umgehen.

Weitere Magazine und ältere Ausgaben werden auf demselben Weg ergänzt. Ein fehlendes HQ-Projekt wird von der App nicht neu angelegt. Rechnungen und Projekte werden niemals nach HQ geschrieben.

### Ziele und Termine je Ausgabe

1. Oben unter **Magazin** das gewünschte Magazin auswählen.
2. Unter **Ausgabe** die gewünschte Ausgabe auswählen.
3. Im Abschnitt **Ziel und Termine** den **Zielumsatz netto (€)** eintragen.
4. **Anzeigenschluss** eintragen.
5. **Drucktermin** eintragen.
6. **Veröffentlichungsdatum** eintragen.
7. **Für alle in Firebase speichern** anklicken. Erwartung: Bestätigung; bei einem Änderungskonflikt neu laden und die inzwischen gespeicherten Werte zuerst prüfen.
8. **Mein Tag** öffnen. Erwartung: Ziel und Termine der gewählten Ausgabe sind sichtbar; Änderungen werden beim erneuten Firebase-Laden auch bei anderen zugelassenen Nutzern angezeigt.

## 6. Den gemeinsamen Datenimport starten

1. **Datenabgleich** öffnen.
2. **Daten aus HQ aktualisieren** anklicken.
3. Den Fortschritt beobachten. Erwartung: Ausgaben und danach Kundendetails werden geladen; die Zahl bekannter Abschnitte kann wachsen, sobald weitere Firmen gefunden werden.
4. Zum Unterbrechen **Nach diesem Abschnitt anhalten** anklicken. Erwartung: Der laufende Abschnitt wird fertiggestellt; danach erscheint **Import angehalten; später fortsetzbar.**
5. Zum Weiterarbeiten **Import fortsetzen** anklicken. Erwartung: Der gespeicherte Lauf geht weiter, ohne neue Firmen oder Rechnungen in HQ anzulegen.
6. Auf **Datenimport abgeschlossen.** warten. Bei **Mit Fehlern beendet** zuerst die angezeigten fehlgeschlagenen Abschnitte prüfen.
7. Bei einem vorübergehenden Fehler **Fehlgeschlagene Abschnitte erneut versuchen** anklicken. Bei wiederholt gleichem Fehler den technischen Text melden; fehlende Daten nicht als leere Historie werten.
8. **Kunden** öffnen. Erwartung: Firmen aus allen zugeordneten Ausgaben stehen gemeinsam in der Liste; dieselbe HQ-Firma erscheint nur einmal.
9. Einen bekannten Kunden öffnen. Erwartung: Stammdaten, Homepage, Kontakte, Kontakt-Historie und Projekte sind vorhanden.
10. **Ansprechpartner** öffnen. Erwartung: Die importierten Kontakte lassen sich nach Name, Firma oder E-Mail suchen.
11. **Buchungshistorie** öffnen.
12. Die gewünschte Ausgabe auswählen.
13. Einige Rechnungen und die zugehörigen Netto-Summen mit HQ vergleichen. Bei unklaren Beträgen oder Warnungen den technischen Hinweis melden; der Import ist keine automatische fachliche Abnahme.

Der Import läuft nur nach deinem Start und wird aus der geöffneten App abschnittsweise fortgesetzt. Nach dem Schließen kann der bereits gestartete Abschnitt noch fertig werden; anschließend lässt sich der Lauf beim nächsten Öffnen fortsetzen. Kein Nachtlauf und kein automatischer HQ-Schreibsammellauf. Bestehende Schreibaufträge bleiben einzeln unter **Datenabgleich → Offene Änderungen ansehen** erreichbar.

### Interessenten ohne Magazinrechnung aufnehmen

1. **Verwaltung** öffnen.
2. Zum Abschnitt **Kunden und Interessenten ohne Magazinrechnung aufnehmen** scrollen.
3. Unter **Unternehmen in HQ suchen** mindestens drei Zeichen des Unternehmensnamens eintragen.
4. **Unternehmen suchen** anklicken.
5. Beim gewünschten Treffer **In App-Bestand aufnehmen** anklicken. Erwartung: Aufnahmebestätigung; keine Änderung an HQ.
6. **Datenabgleich** öffnen.
7. **Daten aus HQ aktualisieren** anklicken. Läuft noch ein alter Import, diesen zuerst fortsetzen und abschließen; danach einen neuen starten.
8. Nach Abschluss **Kunden** öffnen. Erwartung: Auch der ausgewählte Interessent und seine importierten Details sind verfügbar.

### Rechnungen über mehrere Ausgaben

1. Unter **Buchungshistorie** die betroffene Ausgabe auswählen.
2. Beim betroffenen Beleg **Mehrere Ausgaben / Zuordnung ungeklärt** anklicken. Erwartung: Er ist aus der Summe ausgeschlossen und die Ausgabe vorläufig markiert.
3. **Datenabgleich** öffnen.
4. **Daten aus HQ aktualisieren** anklicken. Erwartung: Der Ausschluss bleibt erhalten; die Ausgabe ist wegen der ungeklärten Zuordnung weiterhin nicht vollständig auswertbar.

Eine automatische Erkennung oder Aufteilung solcher Rechnungen ist noch nicht implementiert. Nach fachlicher Klärung lässt sich über **Wieder dieser Ausgabe zuordnen** und einen neuen Import die volle Zuordnung herstellen. Das ändert ausschließlich Firebase.

## 7. Die Historienfilter prüfen

1. **Magazinverkauf** öffnen.
2. Unter **Magazin** das gewünschte Magazin auswählen.
3. Unter **Ausgabe** die aktuelle Verkaufsausgabe auswählen.
4. Unter **Historie** den Wert **Mindestens einmal in den letzten 5 Ausgaben** auswählen. Erwartung: Kunden mit positivem Netto-Rechnungsbetrag in mindestens einer der fünf unmittelbar vorherigen Ausgaben.
5. Bei **Noch nicht auswertbar** die im Hinweis genannten Ausgaben unter **Verwaltung** zuordnen und über **Datenabgleich** vollständig importieren. Der Hinweis bedeutet unbekannter Datenstand, nicht fehlende Buchung.
6. Unter **Historie** den Wert **Letzte Ausgabe nicht, früher schon** auswählen. Erwartung: Kunden ohne positiven Betrag in der unmittelbar vorherigen Ausgabe, aber mit positivem Betrag in einer älteren importierten Ausgabe. Die berücksichtigten älteren Ausgaben stehen im Hinweis.
7. Unter **Branche** eine Branche auswählen. Erwartung: Nur passende Firmen bleiben sichtbar.
8. Unter **Ort** einen Ort auswählen. Erwartung: Die Auswahl wird weiter eingeschränkt.
9. Unter **Betreuer** einen HQ-Betreuer auswählen. Erwartung: Die verbleibenden Firmen passen auch zu diesem Betreuer.
10. Zum Zurücksetzen in den drei letzten Filtern jeweils **Alle** auswählen.

„Vertreten“ wird derzeit aus Rechnungen abgeleitet: Netto-Rechnungen abzüglich Gutschriften müssen je Kunde/Ausgabe positiv sein. App-Buchungen ohne Rechnung sind noch nicht Teil dieser Auswertung. Für einen längeren historischen Zeitraum müssen die entsprechenden älteren Ausgaben zusätzlich importiert sein.

## Bei einer Abweichung

- Bei falscher Firma oder Zuordnung in einer Schreibvorschau nicht übertragen.
- Bei **Ausgang unklar** unter **Verwaltung → Technische Testseite öffnen** den Auftrag suchen.
- Dort einmal **Ergebnis nur in HQ prüfen** anklicken. Diese Aktion liest zurück und wiederholt den Schreibversuch nicht.
- Bei weiterhin offenem Auftrag Status und technischen Text mitteilen; keine Kundeninhalte oder Zugangsdaten mitsenden.
- Keinen zweiten Auftrag mit demselben Inhalt als Umgehung anlegen.
- Bei fehlgeschlagenem Leseimport den konkreten Abschnitt und technischen Text mitteilen. Vorige vollständig geladene Abschnittsdaten werden bei einem Abruffehler erhalten.
- Bei **Datenpaket zu groß** oder wiederholtem Zeitbudgetfehler denselben Lauf nicht endlos wiederholen; den Fehler melden. Sehr große Firmenbestände benötigen noch feinere Importportionen.

## Bestehende Einrichtung und offener Google-Zugang

Für r14 keine dieser Einstellungen erneut eintragen oder verändern:

| Skripteigenschaft | Vorhandener Zweck |
| --- | --- |
| SALES_ADMIN_EMAIL | App-Administrator, zuletzt info@markatus.de |
| SALES_ALLOWED_EMAILS | Ausdrücklich zugelassene Konten |
| FIREBASE_PROJECT_ID | Bestehendes Firebase-Projekt |
| FIREBASE_SERVICE_ACCOUNT_JSON | Geheimes Dienstkonto; beibehalten, nicht teilen |
| HQ_API_TOKEN | Geheimer HQ-Token; beibehalten, nicht teilen |

Weitere Benchmark-Einstellungen bleiben erhalten. Die letzte bestätigte Google-Bereitstellung verwendet **Ausführen als: Ich** und **Nur ich**. info@markatus.de kann sie laut Nutzer öffnen. Persönlicher Zugang für pp@markatus.de und weitere Google-Konten bleibt ein eigenes offenes Arbeitspaket. Die interne E-Mail-Freigabe allein öffnet die Google-Bereitstellung nicht.

Lokal geprüft: 101 bestehende/angepasste Logikprüfungen, 13 V1-Prüfungen und drei Browser-Integrationsprüfungen mit synthetischen Daten. Keine echten HQ-/Firebase-Zugriffe durch Codex. Bereitstellung und Live-Abnahme übernimmt der Nutzer.
