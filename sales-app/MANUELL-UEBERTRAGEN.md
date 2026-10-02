# Sales Markatus manuell nach Google Apps Script übertragen

Stand: 02.10.2026 · **2026-10-02-r17**. Neu: beschleunigte erste Firmenerfassung, sichtbare Firmen-/Seitenzähler und dauerhaft bestätigtes Anhalten. Der gemeinsame HQ-Sync aus r16 bleibt erhalten. Lokal vorbereitet und synthetisch geprüft; die Live-Abnahme steht aus.

**Austauschdateien:** [SalesBackend.gs](../hq-benchmark/SalesBackend.gs) und [Sales.html](../hq-benchmark/Sales.html). Beide vollständig ersetzen. Keine neuen/geänderten Skripteigenschaften, Manifestwerte, Firestore-Regeln oder Zugriffseinstellungen. Kein automatischer Upload durch Codex. Alte Firebase-Daten bleiben lesbar; nichts löschen oder manuell migrieren.

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
8. Oben **2026-10-02-r17** prüfen. Bei einer anderen Kennung oder unterschiedlichen Dateiständen zuerst die beiden Dateiersetzungen und die ausgewählte Bereitstellung kontrollieren; noch keinen Schreibtest starten.

Nur Speichern aktualisiert die /exec-App nicht. Die zusätzlichen lokalen Quellmodule sind bereits in den beiden Austauschdateien enthalten und werden nicht zusätzlich in Google angelegt.

## Deinen bereits angehaltenen r16-Lauf fortsetzen

Nach dem Dateiaustausch und der neuen Bereitstellung zuerst diesen Abschnitt verwenden. Die weiteren Abschnitte beschreiben allgemeine Abläufe; Ausgaben nicht erneut zuordnen und keinen neuen Lauf anlegen.

1. Alle noch geöffneten alten Web-App-Tabs schließen. Erwartung: Kein alter Browser setzt den Lauf weiter fort; ein bereits gestarteter Serverabschnitt kann noch enden.
2. Die Web-App neu öffnen.
3. Oben **2026-10-02-r17** prüfen. Bei anderer Kennung zuerst die Bereitstellung kontrollieren.
4. **Datenabgleich** öffnen.
5. Die neue Zeile **… von … Firmen erfasst** ablesen. Erwartung: Der bisher gespeicherte Firmenstand und die Seitenzahl werden angezeigt; die Tabelle vollständiger Kundenakten darf zunächst noch 0 zeigen.
6. Den Status prüfen. Beim alten r16-Lauf darf **Hier nicht aktiv · gespeicherter Lauf fortsetzbar** stehen: r16 hatte keine dauerhaft gespeicherte Pause. Das ist kein Verlust des Fortschritts und behauptet keinen globalen Serverstillstand.
7. **HQ-Sync fortsetzen** einmal anklicken. Erwartung: Derselbe Lauf arbeitet ab seiner gespeicherten Seite weiter. Falls stattdessen nur **HQ synchronisieren** erscheint, vor dem Klicken den Status mitteilen.
8. Die neue Firmenzahl beobachten. Erwartung: Sie steigt nach jeder erfolgreich gespeicherten Seite um bis zu 50; anschließend folgt **Firmenerfassung abgeschlossen** und der Import der Kundenakten.
9. Wenn die Zahl über mehrere Minuten unverändert bleibt, **Nach diesem Abschnitt anhalten** anklicken. Erwartung: Zunächst **Anhalten angefordert · laufender Abschnitt endet noch**, danach **Angehalten · Fortschritt gespeichert**.
10. Bei ausbleibender Anhaltebestätigung den aktuellen Abschnitt, Firmen-/Seitenzähler, Zeitpunkt und technischen Text mitteilen. Keinen zweiten Lauf oder Ersatzauftrag anlegen.

Die vorhandenen Schreibfehler bleiben erhalten. Bei Fortsetzung ab der Firmenerfassung werden die schon durchlaufenen Schreibabschnitte nicht wiederholt. Daher kann der Lauf am Ende trotz erfolgreichem Leseimport weiterhin **Mit offenen Punkten beendet** melden. Geladene Zahlen und Ausgabenprüfung getrennt von den alten Schreibfehlern beurteilen; diese werden anschließend einzeln geklärt. Der folgende Detailimport umfasst weiterhin viele Abschnitte; keine feste Gesamtdauer zugesagt.

## 4. Vorhandene App-Aufträge ansehen

Der neue Button verarbeitet zuerst bereits gespeicherte, ausführbare App-Aufträge nach HQ und lädt anschließend die HQ-Daten nach Firebase. Die Schreibwege bleiben vorerst auf selbst über die App angelegte TEST-Firmen beschränkt. Echte Bestandskunden, Projekte und Rechnungen bleiben in HQ schreibgeschützt. Ein TEST-Name allein schaltet keinen importierten Kunden frei.

1. **Datenabgleich** öffnen.
2. **Aufträge und Konflikte ansehen** anklicken.
3. Die vorhandenen **Synchronisationsaufträge** durchsehen. Erwartung: Alte Bestätigungen bleiben erhalten; offene Testaufträge werden angezeigt.
4. Bei einem offenen Auftrag **Auftrag ansehen** anklicken. Erwartung: Die gespeicherten Werte und das Ziel sind sichtbar.
5. Bei **Ausgang unklar** nach dem Abschnitt „Bei einer Abweichung“ vorgehen. Solche Aufträge werden beim HQ-Sync nicht blind wiederholt.

## 5. Magazine und Ausgaben auswählen

Alle Unternehmen, Ansprechpartner und Historieneinträge werden unabhängig von dieser Auswahl importiert. Die Häkchen bestimmen, welche HQ-Sammelprojekte zusätzlich als Magazinausgaben ausgewertet und aktualisiert werden. Bisher zugeordnete Ausgaben bleiben zunächst ausgewählt.

1. **Verwaltung** öffnen.
2. Zum Abschnitt **Magazine und Ausgaben** scrollen.
3. Unter **HQ-Projekt suchen (Name oder Projektnummer)** beispielsweise **Coburger** eingeben.
4. **Projekte in HQ suchen** anklicken. Erwartung: Trefferzahl, Projektnummern, Namen und Häkchen. Bei Fehler den technischen Text direkt darunter mitteilen; bei leerer Liste einen anderen Namensteil mit mindestens drei Zeichen suchen.
5. Bei jeder gewünschten Ausgabe das Häkchen setzen. Erwartung: Ihre Zuordnungsfelder klappen auf.
6. Bei einer nicht gewünschten, bisher ausgewählten Ausgabe das Häkchen entfernen. Erwartung: Sie wird nach dem Speichern nicht mehr aktualisiert; bereits importierte Daten werden nicht gelöscht.
7. Bei jeder neu angehakten Ausgabe den **Magazinname** prüfen. Falsche Vorschläge korrigieren; für alle Ausgaben eines Magazins dieselbe Schreibweise verwenden.
8. Bei jeder neu angehakten Ausgabe die **Ausgabennummer** prüfen. Fehlende oder falsche Vorschläge korrigieren.
9. Optional bei genau einer Ausgabe **Als aktuelle Verkaufsausgabe verwenden** anhaken.
10. **Auswahl für HQ-Sync speichern** anklicken. Erwartung: **Auswahl in Firebase gespeichert. Unter Datenabgleich den HQ-Sync starten.** Hier startet noch kein Import.
11. Für ein weiteres Magazin dessen Namen im Suchfeld eingeben.
12. Den Auswahlablauf für dieses Magazin wiederholen. Die gespeicherte Auswahl anderer Suchergebnisse bleibt erhalten.

- Bei einem Zuordnungskonflikt den Text mitteilen. Bereits gespeicherte Zuordnungen bleiben erhalten; denselben Projektbezug erneut zu speichern erzeugt keine zweite Ausgabe.
- Bei einem laufenden HQ-Sync diesen zunächst nach Abschnitt 6 abschließen. Währenddessen lässt sich die Ausgabenauswahl nicht ändern.
- Bei einem Hinweis auf unvollständige Suchergebnisse die Suche eingrenzen. Bis zu 10.000 Treffer werden automatisch nachgeladen; höchstens 200 Häkchen gleichzeitig speichern.

## 6. Den gesamten HQ-Sync starten

1. **Datenabgleich** öffnen.
2. **HQ synchronisieren** anklicken. Erwartung: Zuerst offene Testaufträge, danach der Leseimport aller Unternehmen, Ansprechpartner und Historien sowie der ausgewählten Ausgaben.
3. Den **Aktuellen Abschnitt** beobachten. Während der ersten Erfassung wächst zusätzlich **… von … Firmen erfasst** nach jeder gespeicherten Seite. Erwartung: Firmen werden in Stammdaten, Ansprechpartner, Belege, Projekte, Kontakthistorie und weitere Teilschritte aufgeteilt; die Zahl bekannter Abschnitte kann wachsen.
4. Die App während des Laufs geöffnet lassen. Auch ein größerer Erstimport darf längere Zeit benötigen; Fortschritt wird nach Abschnitten gespeichert.
5. Falls du unterbrechen möchtest, **Nach diesem Abschnitt anhalten** anklicken. Erwartung: Der laufende Abschnitt endet, danach erscheinen **HQ-Sync angehalten; später fortsetzbar.** und **Angehalten · Fortschritt gespeichert**. Die Pause bleibt beim erneuten Öffnen gespeichert.
6. Zum Fortsetzen **HQ-Sync fortsetzen** anklicken. Erwartung: Derselbe gespeicherte Lauf geht weiter, auch nach Schließen und erneutem Öffnen der App.
7. Am Ende den Status prüfen. Erwartung: **HQ-Sync abgeschlossen.** und **Abgeschlossen · Zahlen geprüft**. Bei **Mit offenen Punkten beendet** die Hinweise nach dem nächsten Abschnitt prüfen.
8. In der Tabelle die drei Zeilen **Unternehmen**, **Ansprechpartner** und **Historieneinträge** vergleichen. Erwartung: Die vollständig geladenen Anzahlen entsprechen jeweils der HQ-Gesamtzahl. Kontakte/Historie ohne bekannte Firmenzuordnung sind in diesen Anzahlen enthalten.
9. Unter **Vollständigkeit je Ausgabe** jede ausgewählte Ausgabe prüfen. Erwartung: **Ausgabe geladen**, gleich viele geladene und erwartete Firmen und keine offene Belegzuordnung.
10. Bei nicht zugeordneten Kontakten oder Historieneinträgen **Ohne Firmenzuordnung ansehen** anklicken. Erwartung: Diese Daten bleiben sichtbar, werden aber keiner beliebigen Firma zugewiesen.

Ein älterer Import mit Fehlermeldung wird vom neuen Gesamtabgleich abgelöst; erfolgreich gespeicherte Daten bleiben erhalten. Eine Zahl hinter „HQ-Unternehmen“ ist eine Firmenkennung und keine Anzahl. Ob alle Unternehmen vorhanden sind, ergibt sich erst aus den Abschlusszahlen und der Ausgabenprüfung.

Während eines laufenden Abgleichs neu erfasste App-Aufträge werden beim nächsten neuen HQ-Sync berücksichtigt. Kein Nachtlauf. Der Lauf setzt sich nur über die geöffnete App fort. Ein abgeschlossener Lauf mit Fehlern wird beim nächsten Start vollständig neu gelesen; bestätigte Schreibaufträge werden dabei nicht nochmals ausgeführt.

## 7. Kunden und Magazinverkauf prüfen

1. **Kunden** öffnen. Erwartung: Eine einfache Kundenliste mit Namenssuche, ohne Magazin- oder Historienfilter.
2. Unter **Nach Namen suchen** einen bekannten Firmennamen eingeben. Erwartung: Nur dazu passende Namen bleiben sichtbar.
3. Die gewünschte Firma anklicken. Erwartung: Stammdaten, Homepage, Ansprechpartner, Kontakt-Historie und Projekte sind vorhanden.
4. Einige Felder mit derselben Firma in HQ vergleichen. Bei einer Abweichung den betroffenen Feldnamen und die Versionskennung mitteilen; keine echten Kundeninhalte senden.
5. Einen Rechnungsversand in der Kontakt-Historie aufklappen. Erwartung: Oben die kurze Zusammenfassung; ausführlicher Text formatiert und erst beim Aufklappen sichtbar.
6. **Ansprechpartner** öffnen. Erwartung: Kontakte aller vollständig geladenen Firmen sind gemeinsam durchsuchbar.
7. **Magazinverkauf** öffnen.
8. Unter **Magazin** das gewünschte Magazin auswählen.
9. Unter **Ausgabe** die Verkaufsausgabe auswählen.
10. Unter **Historie** den Wert **Mindestens einmal in den letzten 5 Ausgaben** auswählen. Erwartung: Kunden mit positivem Netto-Rechnungsbetrag in einer der fünf unmittelbar vorherigen Ausgaben.
11. Bei **Noch nicht auswertbar** die genannten Ausgaben nach Abschnitt 5 auswählen und mit Abschnitt 6 laden. Fehlende Daten bedeuten unbekannte Teilnahme, nicht keine Buchung.
12. Unter **Historie** den Wert **Letzte Ausgabe nicht, früher schon** auswählen. Erwartung: Kein positiver Betrag in der vorherigen Ausgabe, aber in einer älteren importierten Ausgabe.
13. **Buchungshistorie** öffnen.
14. Die gewünschte Ausgabe auswählen.
15. Einige Belege und Netto-Summen mit HQ vergleichen. Warnungen oder fachliche Abweichungen mitteilen; gleiche Datensatzanzahlen allein bestätigen keine fachlich richtigen Beträge.

Die bisherigen Historien-, Branchen-, Orts- und Betreuerfilter bleiben als Ausgangspunkt erhalten. Neue vorgefertigte Vertriebsansichten und genaue Filterregeln werden gemeinsam festgelegt. Neue App-Buchungen ohne HQ-Rechnung folgen später.

## 8. Neue Firma mit Ansprechpartner über denselben Button testen

1. **Verwaltung** öffnen.
2. **Technische Testseite öffnen** anklicken.
3. **Testfirma anlegen** anklicken.
4. Das Formular mit erfundenen Firmendaten ausfüllen. Der Name muss mit **TEST** beginnen; Standard ist **Interessent**.
5. Im selben Formular die Daten des ersten Ansprechpartners eintragen.
6. **In Firebase speichern** anklicken. Erwartung: Firma und Kontakt sind sofort in der App sichtbar; HQ wurde noch nicht verändert.
7. **Datenabgleich** öffnen.
8. **HQ synchronisieren** anklicken. Erwartung: Firma anlegen und zurückprüfen; danach in einem getrennten Aufruf den Ansprechpartner derselben Firmen-ID zuordnen.
9. Nach Abschluss in HQ die neue Testfirma öffnen.
10. Ihren Ansprechpartner einschließlich E-Mail prüfen. Erwartung: Genau eine Person an der richtigen Firma. Bei Abweichung keinen zweiten Auftrag anlegen, sondern den gespeicherten Auftrag nach dem Fehlerabschnitt prüfen.

## 9. Kommunikation über denselben HQ-Sync testen

1. Unter **Kunden** eine bereits über die App angelegte eigene Testfirma mit bestätigter HQ-Firmen-ID öffnen.
2. **Kommunikation erfassen** anklicken. Erwartung: Das Formular öffnet sich; bei einer Sperre den Erklärungstext mitteilen.
3. Unter **Kontaktart** eine der fünf Arten auswählen. Erwartung: Nur passende Felder; keine neue Aufgabe.

| Kontaktart | Sichtbare Felder |
| --- | --- |
| Notiz | Betreff, Datum und Uhrzeit, Notiz / Text |
| E-Mail | Empfänger, Betreff, Notiz / Text |
| Anruf | Kontakt, Datum und Uhrzeit, Status, Betreff, Notiz / Text |
| Meeting / Besuch | Kontakt, Datum und Uhrzeit, Betreff, Notiz / Text |

4. Die angezeigten Felder mit erfundenen Testdaten ausfüllen.
5. **In Firebase speichern** anklicken. Erwartung: Sofort sichtbarer Eintrag mit offenem HQ-Abgleich.
6. **Datenabgleich** öffnen.
7. **HQ synchronisieren** anklicken. Erwartung: Eintrag nach HQ übertragen, anschließend beim Lesen zurückgeprüft; kein zweiter Eintrag.
8. Nach Abschluss dieselbe Testfirma in HQ öffnen.
9. Den Eintrag mit den eingegebenen Testwerten vergleichen. Bei Abweichung Status und technischen Text des Auftrags mitteilen.

E-Mail dokumentiert eine Kommunikation, verschickt aber keine Nachricht. Alte HQ-Aufgaben bleiben lesbar; awork folgt später. Gespräche an echten Bestandskunden werden mit der späteren Stammdaten-/Vertriebsfreigabe ergänzt.

## Ziele, Termine und unklare Belege

1. In **Verwaltung** das gewünschte **Magazin** auswählen.
2. Unter **Ausgabe** die gewünschte Ausgabe auswählen.
3. **Zielumsatz netto (€)** eintragen.
4. **Anzeigenschluss** eintragen.
5. **Drucktermin** eintragen.
6. **Veröffentlichungsdatum** eintragen.
7. **Für alle in Firebase speichern** anklicken. Erwartung: Bestätigung; bei Versionskonflikt zuerst neu laden.
8. **Mein Tag** öffnen. Erwartung: Aktuelle Ziele und Termine; andere zugelassene Nutzer sehen sie beim nächsten Firebase-Laden.

- Einen Beleg über mehrere Ausgaben unter **Buchungshistorie** mit **Mehrere Ausgaben / Zuordnung ungeklärt** markieren. Erwartung: Aus der Summe ausgeschlossen; keine Änderung in HQ.
- Anschließend einen neuen **HQ-Sync** starten. Erwartung: Der Ausschluss bleibt erhalten; die fachliche Belegprüfung bleibt offen.
- Nach fachlicher Klärung **Wieder dieser Ausgabe zuordnen** verwenden. Erwartung: Beim nächsten Sync wieder vollständig dieser Ausgabe zugeordnet; keine automatische Aufteilung auf mehrere Ausgaben.

## Bei einer Abweichung

- Bei **Mit offenen Punkten beendet** den genauen Abschnitt und den technischen Text ablesen.
- Bei einem vorübergehenden Lesefehler erneut **HQ synchronisieren** anklicken. Erwartung: Neuer vollständiger Leselauf; vorherige vollständige Kundenakten bleiben bis zur erfolgreichen Ersetzung erhalten.
- Bei wiederholtem gleichen Fehler den technischen Text mitteilen. Nicht endlos wiederholen; keine Kundendaten oder Zugangsdaten senden.
- Bei **Ausgang unklar** unter **Datenabgleich → Aufträge und Konflikte ansehen** den Auftrag suchen.
- Dort **Ergebnis nur in HQ prüfen** anklicken. Erwartung: Rückprüfung ohne erneute Anlage.
- Bei weiterhin offenem Ausgang Status und technischen Text mitteilen; keinen zweiten Auftrag als Umgehung anlegen.
- Bei **Konflikt** die angezeigten App-/HQ-Werte vergleichen.
- Entweder **HQ-Werte behalten** oder **App-Werte verwenden** anklicken. Erwartung: Entscheidung gespeichert; App-Werte werden erst im folgenden HQ-Sync unter erneuter Konfliktprüfung übertragen.
- Bei fehlenden Abschlusszahlen oder Firmenkennungen den Lauf als unvollständig behandeln. Vorhandene Ausgabebelege allein belegen noch keinen vollständigen Firmenimport.

## Bestehende Einrichtung und nächster Ausbau

Für r17 keine dieser Einstellungen erneut eintragen oder verändern:

| Skripteigenschaft | Vorhandener Zweck |
| --- | --- |
| SALES_ADMIN_EMAIL | App-Administrator, zuletzt info@markatus.de |
| SALES_ALLOWED_EMAILS | Ausdrücklich zugelassene Konten |
| FIREBASE_PROJECT_ID | Bestehendes Firebase-Projekt |
| FIREBASE_SERVICE_ACCOUNT_JSON | Geheimes Dienstkonto; beibehalten, nicht teilen |
| HQ_API_TOKEN | Geheimer HQ-Token; beibehalten, nicht teilen |

Weitere Benchmark-Einstellungen bleiben erhalten. Bereitstellung zuletzt **Ausführen als: Ich**, **Nur ich**. Der persönliche Google-Zugang für weitere erlaubte Konten bleibt offen; die interne E-Mail-Liste allein öffnet keine Google-Bereitstellung.

Danach gemäß Nutzerplanung: **4. Persönlicher Google-Zugang → 5. Gespräche, Wiedervorlagen und Stammdatenbearbeitung → 6. Buchungen und Redaktionsübergabe → 7. Eine aktuelle Ausgabe im kleinen Team testen.**

Lokal geprüft: 101 bestehende Logikprüfungen, 15 V1-Prüfungen, 17 Speicher-/Gesamtabgleichprüfungen und drei Browser-Integrationsprüfungen mit synthetischen Daten. Keine echten HQ-/Firebase-Zugriffe durch Codex. Der komplette reale Bestand ist erst nach deinem Lauf und der anschließenden Prüfung bestätigt.
