# Vom Datenpilot zum produktiven Magazinvertrieb

Stand: 18.10.2026. Geprüfte Quellenbasis: r21 / v0.21.0 / Apps-Script-Version 32. Bestandsaufnahme und Vorschlag für die nächsten Bauabschnitte; keine Freigabe zusätzlicher HQ-Schreibwege oder Änderung von Zugriffsrechten. Kein neuer Live-Datenabruf für diesen Bericht.

**Spätere Entscheidung vom 18.10.2026:** T01/T02/T03/T04/T06/T09 wurden anschließend ausdrücklich beauftragt; T04 auf Firmen, Adressen und Ansprechpartner eingegrenzt. Umsetzung r22 und Erklärung T05/T07/T08 in [KUNDENPFLEGE-R22.md](KUNDENPFLEGE-R22.md), aktueller Veröffentlichungsstand im [Projektüberblick](../PROJEKTUEBERBLICK.md). Die folgende Tabelle ist die erhaltene Bestandsaufnahme vor diesem Auftrag. Erster Ansprechpartner bleibt Pflicht; zusätzliche Kontakt-/Adressanlage und die übrigen Produktivlücken bleiben offen. T07/T08 weiterhin erhalten.

## 1. Was „mit echten Daten live“ hier bedeutet

Die veröffentlichte App liest bereits echte HQ-Daten aus Firebase. Sie ist keine Oberfläche mit ersatzweise erfundenen Kunden. Der produktive Vertriebsablauf ist trotzdem noch unvollständig: Schreibziele sind an selbst angelegte TEST-Firmen gebunden, Teamzugang ist nicht nachgewiesen, Wiedervorlagen/Buchungserfassung/Redaktionsmeldung fehlen.

Es sind drei unterschiedliche Freigaben zu unterscheiden:

| Stufe | Was damit möglich wäre | Heutiger Stand |
| --- | --- | --- |
| A – Echte Daten ansehen | Firmen, Kontakte, Historie und Rechnungsumsätze recherchieren | Technisch vorhanden; echte Vollständigkeit, aktuelle Ausgaben und fachliche Summen noch abnehmen. Teamzugriff gesondert einrichten/prüfen. |
| B – Im Vertrieb damit arbeiten | Für echte Kunden Kontakte dokumentieren, nachfassen, Stammdaten pflegen und neue Firmen erfassen | Wesentliche Schreibgrundlagen als TEST-Pilot vorhanden; produktive Zielzuordnung und Wiedervorlagen fehlen. |
| C – Vollständiger Verkaufsablauf | Anzeigen buchen, gebuchte und fakturierte Umsätze unterscheiden, Redaktion informieren | Als Konzept/Demo beschrieben, in der veröffentlichten App noch zu bauen. |

Die aktuelle Google-Konfiguration enthält USER_DEPLOYING und MYSELF. Eine App-interne E-Mail-Freigabe allein macht die Bereitstellung noch nicht für weitere Google-Konten erreichbar. Der letzte Codevergleich ist vom 17.10.2026; heute wurden weder Einstellungen noch echte Benutzerzugänge bei Google geprüft.

## 2. Bereits nutzbare Grundlagen behalten

| Bereich | Vorhanden | Noch nachzuweisen / Grenze |
| --- | --- | --- |
| Echte Lesedaten | Kunden-/Kontakt-/Historien-/Projektansichten, HQ-Rechnungen und Gutschriften über Firebase | Keine neue fachliche Bestandsabnahme durch die jüngsten Code-/Browsertests. |
| Magazine/Ausgaben | Bewusste Projektzuordnung, Auswahl der aktuellen Verkaufsausgabe, vorhandene Ausgaben aus Firebase verknüpfen | Die vier geplanten Magazine und der gewünschte historische Zeitraum sind nicht automatisch vollständig eingerichtet. Alte Nummern aus dem Konzept nicht als aktuelle Ausgaben übernehmen. |
| Performance r20/r21 | Bedarfsladen, gemeinsame Namens-/Filterlisten, lokales Filtern, Aktenzwischenspeicher, keine Browser-Intervallabfragen | Modellwerte ersetzen keine Messung mit realen Daten und mehreren Nutzern. Erstaufbau neuer Projektionen kostet einmalige Reads. |
| HQ-Abgleich | Manueller Start, serverseitige Fortsetzung, Änderungsmarken, Fortschritt auf Klick, Pause/Wiederaufnahme | Kein regelmäßiger Nachtlauf. Schreibaufträge bleiben auf TEST-Ziele begrenzt. |
| Sicherheit beim Speichern | Eingabeprüfung, serverseitige Berechtigung, Bestands-/ID-Prüfung, Revisions-/Konfliktbehandlung, Prüfung unklarer HQ-Ausgänge | Für produktive Zielobjekte und feinere Rollen ergänzen; diese Prüfungen nicht als Testreste löschen. |
| Entwicklung/Betrieb | Lokale Quellen, synthetische Tests, Build, clasp-Veröffentlichung, GitHub/Tags/Dateifingerabdrücke | GitHub sichert Code und Dokumentation; Datenbanksicherung/-wiederherstellung ist damit nicht nachgewiesen. |

## 3. T01–T09: Was tatsächlich nur aus dem Testbetrieb stammt

| Kennung | Konkreter Testbestandteil | Umgang beim Ausbau |
| --- | --- | --- |
| T01 | Firmenname muss mit TEST beginnen; Formular heißt Eigene Testfirma anlegen | Neues produktives Anlageformular und passenden Serverpfad bauen. TEST-Regel nur für klar getrennte Tests beibehalten. Nicht allein die Beschriftung ändern. |
| T02 | testOnly, draft_-IDs und eigener Anlageauftrag begrenzen HQ-Schreiben, Historienerfassung und Kundenänderungen | Produktive lokale IDs/HQ-IDs und zulässige Zielobjekte unabhängig von einem Testanlageauftrag prüfen. Vorhandene Testaufträge weiterhin eindeutig erkennen. Lokale IDs vor HQ-Anlage bleiben auch produktiv nötig. |
| T03 | Kommunikation erfassen ist bei normalen Bestandskunden deaktiviert | Erfassung für berechtigte echte Kunden ermöglichen. Kontaktpersonen müssen weiterhin zur Firma gehören; Autoren und Ausgabenbezug nachvollziehbar speichern. |
| T04 | Änderung testen kann nur Branche/Homepage eigener Testfirmen ändern | Geprüfte Feldlisten und Konfliktvergleich für produktive Firmen-/Adress-/Ansprechpartnerpflege ergänzen. Nicht pauschal beliebige HQ-Felder freigeben. |
| T05 | Erster Ansprechpartner ist für den Anlagetest zwingend; weitere Kontakte werden importiert, nicht allgemein angelegt/bearbeitet | Produktive Pflichtfelder festlegen und die Anlage/Bearbeitung weiterer Ansprechpartner bei vorhandenen Firmen bauen. Firma/Kontakt-Abhängigkeit im HQ-Abgleich erhalten. |
| T06 | [Sales-Test …] in HQ-Beschreibungen sowie Testmarkierung entfernen | Der Marker dient auch zur Wiedererkennung eines unklaren Anlageausgangs. Vor produktiver Ablösung eine verlässliche eindeutige Zuordnung/Wiederholsicherheit vorsehen; nicht ersatzlos entfernen. Keine alten HQ-Beschreibungen jetzt automatisch bereinigen. |
| T07 | Aufträge und Testfirmen, Homepage-/E-Mail-Prüfungen, technische HQ-Zuordnungs- und Bereinigungsaktionen | Testdiagnose aus dem Vertriebsalltag in einen geschützten Diagnosebereich verlagern. Allgemeine Auftrags-, Konflikt- und Fehleransicht produktiv behalten. Alte offene/unklare Aufträge nicht löschen. |
| T08 | Separater Benchmark hinter view=benchmark und alter Firebase-Lesepilot | Haupt-App ist der Standardaufruf. Werkzeuge aus normaler Nutzung heraushalten; Abhängigkeiten vor Archivierung prüfen. Derzeit nutzt die App gemeinsame Hilfsfunktionen aus diesen Dateien, daher nicht einfach die kompletten Google-Dateien entfernen. |
| T09 | Lokale HTML-Demo, lokale Vorschau, alte Wegweiser und künstliche Daten in automatisierten Tests | Demo klar getrennt von der echten Web-App halten. Sie gehören nicht zu den sieben clasp-Uploaddateien. Synthetische Tests ausdrücklich behalten. Vorhandene nicht versionierte Demos werden in diesem Auftrag nicht verändert oder hochgeladen. |

Testfirmen können bereits in Firebase und HQ existieren. Ihr Bestand und ihre offenen Aufträge wurden hier nicht live inventarisiert. Technische Altdateien aus D22 und fachliche Testkunden sind unterschiedliche Bereinigungsfälle; keine pauschale Löschliste daraus ableiten.

## 4. L01–L14: Was für den produktiven Ablauf fehlt

| Kennung | Fehlender bzw. unbestätigter Baustein | Konkretes Ergebnis des Ausbaus |
| --- | --- | --- |
| L01 | Persönlicher interner Teamzugang und Rollen | Bestehende Bereitstellung für die vorgesehenen internen Google-Konten passend einrichten und mit zweitem Konto testen. Administration, Vertrieb und Redaktion serverseitig unterscheiden. Bereitsteller, App-Administrator, App-Autor und HQ-Verantwortlichen getrennt behandeln. Externe erst später. |
| L02 | Produktive Zielprüfung und Warteschlange | Ein zulässiger Kunde benötigt keinen TEST-Anlageauftrag. Neue/alte Kunden und Kontakte erhalten geprüfte Zuordnungen; wiederholte Starts, unklare Ausgänge und Konflikte bleiben abgesichert. Alte Testaufträge und neue produktive Aufträge sauber auseinanderhalten. |
| L03 | Echte Firmen und Ansprechpartner erfassen/pflegen | Namen ohne TEST-Präfix, bestätigte Pflichtfelder, Dublettenhinweise, Anlage weiterer Kontakte sowie festgelegte Stammdaten-/Adressfelder. Speichern zuerst in Firebase; ausstehende Änderungen in der App sichtbar, anschließend kontrolliert nach HQ. |
| L04 | Aktivitäten für alle berechtigten Kunden | Notiz, E-Mail-Dokumentation, Anruf, Meeting/Besuch auch für Bestandskunden; Autor, tatsächlicher Kontaktzeitpunkt, zugehörige Person und optional Magazin/Ausgabe. Fachliche Ergebnisse wie Interesse, Rückmeldung offen und Absage ergänzen. Bei lokal neuem Kunden schon erfassen können; HQ-Übertragung gegebenenfalls bis zur bestätigten Firmen-ID warten lassen. |
| L05 | Wiedervorlagen und echtes Mein Tag | Termin, Verantwortlicher, Kunde/Person/Ausgabe, erledigen/verschieben sowie heute/überfällig/später. Mein Tag zeigt tatsächlich fällige Arbeit. Die jetzige Wiedervorlagenseite ist ein Platzhalter; importierte HQ-Aufgaben mit Termin ersetzen diese Verwaltung nicht. |
| L06 | Saubere Übernahme von App-Änderungen und Autoren | Feldzuständigkeit zwischen App und HQ festlegen; ausstehende App-Eingaben bei Import erhalten. Konflikte gezielt lösen und Änderungen mit Bearbeiter nachvollziehen. App-Autor ist bereits teilweise protokolliert, eine vollständige App-/HQ-Autorenregel fehlt. Neu erfasste Aufgabe bleibt entsprechend letzter Entscheidung ausgeschlossen; awork später. |
| L07 | Fachlich geprüfter echter Datenbestand | Gewünschte aktuelle Ausgabe und historische Ausgaben je Magazin prüfen; Firmen/Kontakte/Historien, Rechnungen, Gutschriften und Netto-Summen gegen HQ abnehmen. Fehlende/unklare Daten weiter als unbekannt kennzeichnen. Rechnungen über mehrere Ausgaben bis zur geklärten Aufteilung ausdrücklich gesondert behandeln. |
| L08 | Echte Buchungserfassung | Kunde, Ausgabe, Produkt/Format, vereinbarter Nettopreis, Verkäufer, Datum, optionale Person und Paketkennung; ändern/stornieren und Änderungsversionen. Die heutige Buchungshistorie zeigt HQ-Belege, keine neuen Verkaufsabschlüsse aus der App. |
| L09 | Produkt-/Preisverwaltung und Umsatzabgrenzung | Vorhandenen Produktkatalog als Referenz fachlich freigeben, in den produktiven Ablauf integrieren, Sonderpreise und einfache Paketpositionen speichern. Historische Preisstände erhalten. Gebuchte und fakturierte Umsätze getrennt führen und App-Buchungen kontrolliert mit HQ-Belegen verknüpfen, damit kein doppelter Umsatz entsteht. |
| L10 | Redaktionsübergabe | Buchungsliste je Ausgabe, Vorschau, festgelegte Empfänger, bewusster Versand und Meldestatus pro Buchungsversion; spätere Änderung/Storno kennzeichnen. Aktuell gibt es keinen produktiven Redaktionsversand. Die manuelle E-Mail-Dokumentation verschickt absichtlich keine Nachricht und darf so bleiben. |
| L11 | Arbeitslisten und Vertriebsstatus | Letzter Kontakt, Kontakt-/Ausgabenstatus, Wiedervorlage, eigene Ansichten und Rückkehr zur Arbeitsliste. Bestehende Rechnungs-/Ort-/Branchen-/Betreuerfilter behalten. Keine neue automatische Browseraktualisierung einführen; ausdrückliches Aktualisieren bleibt die bestätigte Regel. |
| L12 | Betriebsabnahme und Datenwiederherstellung | Vor produktivem Schreiben Datenbackup und Wiederherstellung festlegen/erproben. Rechte mit erlaubtem und unerlaubtem Konto, parallele Bearbeitung, Wiederholung, Abbruch und Fehler mit realistischem Datenumfang testen; Reads/Writes/Laufzeiten im Blick behalten. Synthetische Tests und erfolgreiche Bereitstellung sind keine fachliche Live-Abnahme. |
| L13 | Nachtabgleich, falls für den Betriebsablauf gewünscht | Bestehenden manuellen, fortsetzbaren Abgleich später zuverlässig planen, mit Ausführungskonto, Status/Fehlerbehandlung und Begrenzung überschneidender Läufe. Für einen internen Start ist ein bewusster manueller Abgleich möglich; ein Nachtlauf ist kein bereits eingerichteter Bestandteil und wird durch diesen Sortierauftrag nicht angelegt. |
| L14 | Alltagstaugliche Oberfläche und Dokumentation | Testtexte/Diagnoseaktionen ersetzen oder verlagern; vorhandene Rollen und Schreibmöglichkeiten ehrlich anzeigen. Aktive Ausgaben bereits dynamisch auswählbar; historische COBURGER-70-Fallbacks nicht mit einer aktuellen ausschließlichen Beschränkung verwechseln. Aktuelle Anleitungen von alten manuellen Dateiübergaben trennen. |

L01/L02/L06/L12 bilden die Grundlage vor allgemeinen produktiven HQ-Schreibwegen. L03/L04/L05 ergeben danach einen ersten Arbeitsstand für Kundenpflege und Nachfassen. Für den ursprünglich gewünschten vollständigen Magazinverkauf gehören zusätzlich L08/L09/L10 sowie die nötigen Arbeitslisten aus L11 dazu.

## 5. Empfohlene Reihenfolge mit prüfbaren Ergebnissen

| Abschnitt | Umfang | Ergebnis vor dem nächsten Abschnitt |
| --- | --- | --- |
| 1 – Verlässliche Basis | L01, L07, Betriebsgrundlage aus L12 | Zwei interne Konten lesen den richtigen freigegebenen Bestand; unerlaubtes Konto bleibt gesperrt. Gewählte Pilot-Ausgabe und Stichprobensummen fachlich bestätigt; Wiederherstellungsweg festgelegt. |
| 2 – Echte Kundenarbeit | L02–L06 | Echter Bestandskunde erhält Kontaktprotokoll/Wiedervorlage; neue Firma ist ohne TEST-Zwang in Firebase nutzbar. Kontrollierter HQ-Abgleich ohne Dubletten und ohne Verlust offener Eingaben. Stammdatenfelder schrittweise nach Prüfung freigeben. |
| 3 – Verkauf bis Redaktion | L08–L11, passende Teile aus L14 | Eine Buchung mit Sonderpreis wird gespeichert, geändert/storniert und nach Vorschau an die konfigurierte Redaktion gemeldet; Rechnung später ohne Doppelzählung zugeordnet. |
| 4 – Kleines Team live erproben | Abschluss L12, laufende Pflege L14 | Eine echte Ausgabe durchgehend Kunde → Kontakt → Wiedervorlage → Buchung → Redaktion → HQ-Abgleich bearbeiten; Konflikt-/Wiederaufnahmefälle und Kontingentverbrauch prüfen. |
| 5 – Erweiterung nach Bedarf | L13 und spätere Roadmap | Nachtabgleich, weitere Magazine/Historie, Excel-Übernahme und zusätzliche Integrationen anhand des freigegebenen Kernbetriebs ergänzen. |

Das ist eine Priorisierung, kein neuer Implementierungsauftrag. Nicht alle Punkte müssen gleichzeitig veröffentlicht werden. Für eine zunächst reine Recherchefreigabe ist der Umfang kleiner als für den vollständigen Vertriebsablauf.

## 6. Wünsche, die erhalten bleiben und den ersten internen Start nicht alle blockieren

Alle R01–R13 und N01–N10 bleiben im [Projekttagebuch](PROJEKTTAGEBUCH-UND-ROADMAP.md) erhalten. Für die Planung gilt:

- **Spätere Integration:** HQ-Planumsätze (R01), automatische Gmail-Historie (R03), awork (R04). HQ-Rechnungen/Projekte weiterhin lesen; keine neue Rechnungs-/Projekt-Schreibfreigabe daraus ableiten.
- **Spätere Erweiterung der Nutzer/Bereiche:** externe Vertriebler und deren Rechte (R06), Knolle/Schoen.frau (R07), iTV/weitere Agenturleistungen (R08).
- **Spätere Komfort-/Auswertungsfunktionen:** umfangreichere Rabatt-/Paketberechnung (R09), Reservierungen/Produktion (R10), vertiefte Teamansichten/Scoring (R11), Mitarbeiterkennzahlen (R05) und N01–N10. Einfacher Paketbezug bleibt bereits Teil der geplanten Kernbuchung.
- **Bereits beim Kern berücksichtigen:** Nachvollziehbare Redaktionsübergabe als Grundlage für R02, App-Nutzer ohne zwingendes eigenes HQ-Konto als Zuordnungsfrage aus R12; spätere Ausbaustufen dieser Wünsche bleiben erhalten.
- **Datenfälle gesondert behandeln:** Mehrfachausgabenrechnungen R13; eine ungeklärte Aufteilung darf nicht als korrekte Summe erscheinen. Excel-Übernahme nur bei vorhandenen zu übernehmenden Vertriebslisten; gewünschte Dreijahreshistorie schrittweise fachlich abnehmen.

Die ältere Konzepterwartung einer automatischen Aktualisierung binnen 30 Sekunden ist durch die ausdrückliche Entscheidung vom 16./17.10.2026 ersetzt: offene Ansichten bleiben bis zur Bedienaktion unverändert. Ebenso ersetzen die aktuellen clasp-Anleitungen die früheren manuellen Dateiübergaben.

## 7. Quellen und Arbeitsstand

Codeprüfung insbesondere in [Sales.gs](../sales-app/Sales.gs) (TEST-Präfix, testOnly, Marker, Schreibpfade, Historie und zwei Änderungsfelder), [Sales.template.html](../sales-app/Sales.template.html) (deaktivierte Kommunikation, Testformulare, Wiedervorlagenplatzhalter), [SalesV1.js](../sales-app/SalesV1.js) (Recherche/Buchungshistorie), [SalesLean.gs](../sales-app/SalesLean.gs), [SalesWorker.gs](../sales-app/SalesWorker.gs), [Code.gs](../hq-benchmark/Code.gs) und [appsscript.json](../hq-benchmark/appsscript.json). Preisreferenz: [produktkatalog.json](produktkatalog.json); fachlicher Zielumfang: [VERTRIEBSKONZEPT.md](VERTRIEBSKONZEPT.md) und spätere Tagebuchentscheidungen.

Dieser Schritt sortiert und dokumentiert. Es wurden keine Appfunktionen gelöscht/freigeschaltet, keine Testkunden oder technischen Bestände bereinigt, keine E-Mails verschickt, keine Live-Kundendaten abgerufen und keine Script Properties, Bereitstellungsrechte oder Trigger geändert. Keine neue Google-Version. Vorhandene fremde/unversionierte Demo-/Dokumentationsdateien bleiben erhalten und werden nicht ungeprüft mitcommittet.
