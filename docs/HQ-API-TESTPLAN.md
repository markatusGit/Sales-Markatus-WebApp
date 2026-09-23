# HQ-API – Geschwindigkeitstest und Architekturentscheidung

Stand 23.09.2026 · Erster begrenzter HQ-v2-Firmenabruf ausgeführt; weitere Szenarien in Vorbereitung

## 1. Ziel

Prüfen, ob die gewünschten Vertriebsansichten mit bedarfsgerechten HQ-Leseabfragen schnell genug funktionieren oder ob eine vorbereitete Datenkopie sinnvoll ist. Die Geschwindigkeit der HQ-Oberfläche ist dafür kein Messwert. Separat messen: HQ-Antwort, Verarbeitung in Apps Script und die vollständige Wartezeit im Browser. Ein Lasttest bis zum Ausfall des produktiven HQ ist nicht vorgesehen.

Ausgangspunkt: 500–1.000 Firmen, bis zu etwa 10.000 Ansprechpartner, drei Jahre Historie, vier Magazine und langfristig zehn gleichzeitig aktive Nutzer. Rechnungs-/Positionsmengen und tatsächliche Payloadgrößen werden vorab gezählt. Für einen reproduzierbaren Vergleich feste Testdatensatz-IDs festhalten, ohne vertrauliche Inhalte in Messprotokolle zu schreiben.

## 2. Voraussetzungen und Datenprüfung

1. Vorhandene HQ-Skripte beziehungsweise deren Anbindungsart nutzen, wenn geeignet. API-Version, Authentisierung und tatsächlich verfügbare Endpunkte prüfen. Keinen Token in Chat, Browsercode oder Git eintragen; Einrichtung in serverseitiger Konfiguration.
2. Kleine erfolgreiche Leseabfrage gegen Firmen, Ansprechpartner, Projekte, Rechnungen/Dokumente und Positionen. v1/v2 können unterschiedliche Entitäten und Belegprozesse anbieten; Endpunktnamen nicht aus Beispielen als garantiert übernehmen.
3. Ein echtes Magazinprojekt einer Ausgabe sowie die Verknüpfung Projekt → Beleg → Position → Rechnungsempfänger prüfen. Auch archivierte Projekte, Stornos/Gutschriften und Belege mit mehreren Positionen betrachten. HQ-Rechnungsempfänger ist nicht automatisch ein persönlich zugeordneter Ansprechpartner.
4. Fähigkeiten protokollieren: serverseitige Filter und Sortierung, Projektbezug, Pagination, Feldselektion soweit verfügbar, stabile IDs, Änderungszeitpunkte, Belegstatus und Berechtigungen. Fehlende Änderungsabfrage bedeutet einen anderen Nachtabgleich, nicht automatisch Projektabbruch.
5. Während dieses Schritts nur lesen. Für spätere Schreibtests getrennte eindeutig bezeichnete Testdatensätze in einer Testumgebung vorsehen; diese gehören nicht zum ersten Geschwindigkeitslauf.

## 3. Repräsentative Szenarien

| ID | Nutzeraktion | Zu erfassende Arbeit |
| --- | --- | --- |
| S1 | App starten / erste Kundenliste | Erste 50 Zeilen plus benötigte Zusammenfassungen; kein Download aller Details vor erster Anzeige |
| S2 | Firma oder Ansprechpartner suchen | Teilstring, Umlaute, Treffer und Nulltreffer; verschiedene Begriffe, damit nicht nur derselbe Cacheeintrag getestet wird |
| S3 | Kunde öffnen | Stammdaten, 1–10 Personen, relevante Rechnungen/Positionen aus drei Jahren; App-Aktivitäten hinzumischen |
| S4 | Ausgabe öffnen | Zu einem Projekt gehörige Buchungen/Rechnungspositionen mit Kunden; bei großen Ausgaben mehrere Seiten |
| S5 | Nächste Kunden für Ausgabe ermitteln | Frühe Buchungen, fehlende Zielausgabenbuchung, letzte Aktivität, Kontaktpause, Betreuer und Wiedervorlagen zusammenführen |
| S6 | Buchungen filtern | Magazin/Ausgabe plus Zeitraum, Format, Verkäufer soweit bekannt und Preisbereich; häufige gespeicherte Ansichten |
| S7 | Erstimport / Nachtabgleich simulieren | Alle relevanten Seiten lesen, Umfang/Dauer/Requests messen; Änderungsabruf und vollständigen Kontrollabruf vergleichen, ohne HQ zu verändern |

S5 ist besonders entscheidend: Mehrere schnelle Einzelabfragen können zusammen eine langsame Arbeitsliste ergeben. In einem HQ-Leseversuch stammen fehlende Aktivitäten/Buchungen aus eindeutig markierten lokalen Testdaten; es wird nicht behauptet, HQ enthalte diese neuen App-Daten bereits.

## 4. Messverfahren

**Stufe 1 – Funktionsprüfung:** Ein Nutzer, kleine Ergebnisse und feste Referenzfälle. Rückgabemengen und Verknüpfungen gegen sichtbare HQ-Belege prüfen. Erst korrekte Ergebnisse benchmarken.

**Stufe 2 – Einzelabfragen:** Kalter App-Cache und warmer App-Cache getrennt. Ein kalter App-Cache bedeutet nicht, dass interne HQ-Caches kontrolliert wurden. Kleine/normale/große Kundenfälle verwenden. Mindestens 30 Messungen pro zentralem Szenario für eine erste Orientierung; für eine belastbarere p95-Auswertung mindestens 100. Geringe Stichproben kennzeichnen.

**Stufe 3 – Vollständiger Browserablauf:** Zeit vom Klick bis zur nutzbaren Ansicht, Requestanzahl, Datenumfang, Serververarbeitung und Fehlerquote messen. Suche entprellen; keine HQ-Abfrage pro Tastendruck. Nicht zehn Browser nur idle öffnen, sondern tatsächliche typische Aktionen ausführen.

**Stufe 4 – Mehrbenutzerlauf:** 1, 3, 5 und 10 gleichzeitig aktive Sitzungen, mit menschlichen Denkpausen von etwa 3–10 Sekunden und gemischten Szenarien. Je Stufe zunächst drei Minuten, anschließend bei Bedarf bis mindestens 100 Messungen je wichtigem Szenario. Nutzermischung: 30 % Suche/Liste, 25 % Kundendetails, 25 % Ausgabenliste, 20 % kombinierte Filter. App-eigene Schreibvorgänge nur im isolierten Testbestand.

Sicherer Ausgangsrahmen: ein globaler Requestbegrenzer, zunächst maximal 30 HQ-Requests pro Minute, nach störungsfreiem Basistest maximal 120/Minute; Gesamtbudget zunächst 2.000 Requests und maximal 30 Minuten je Testlauf. Diese Werte sind bewusst konservative Testvorgaben und keine gemessenen Kapazitäten. Überschreitet schon der reale zehnköpfige Arbeitsablauf diesen Rahmen, zunächst die Anzahl nötiger HQ-Abfragen reduzieren oder die Datenkopie prüfen. Ein durch den Testbegrenzer wartender Request wird gesondert ausgewiesen, damit dies nicht als HQ-Latenz gilt.

HQ dokumentiert derzeit 1.000 Requests/Minute. Dieses Maximum wird nicht ausgereizt; bestehende Integrationen laufen gegebenenfalls parallel. Bei HTTP 429 den Lastlauf stoppen, Angaben zur Wiederholung berücksichtigen und die Last reduzieren. Bei 401/403 nicht mit Last weitermachen. Abbruch auch bei drei aufeinanderfolgenden 5xx/Timeouts oder über 5 % Fehlern in den letzten 20 Requests. Danach diagnostische Einzelabfragen statt weiterer Last. [HQ-Dokumentation](https://developer.hellohq.io/)

## 5. Messprotokoll

Pro Versuch: Lauf-ID, Datum/Uhrzeit, Szenario, Implementationsvariante, Cachezustand, Nutzerzahl, Datensatzgrößenklasse, Antwortstatus, HQ-Latenz, Warteschlangenzeit, Verarbeitung, Browser-Gesamtzeit, Requestanzahl, Antwortbytes und Ergebnisanzahl. Keine Tokens, E-Mail-Inhalte oder vollständigen Kundenantworten im Performanceprotokoll.

Auswertung je Szenario und Nutzerstufe: Anzahl Messungen, Median, p95, Maximum, Fehlerquote, Timeouts und 429. Zusätzlich tägliche Hochrechnung für API-Aufrufe und Datenbankoperationen einschließlich Nachtabgleich. Zeitlimits, abgebrochene und fehlgeschlagene Versuche nicht aus der Ergebnisstatistik entfernen.

## 6. Vorgeschlagene Zielwerte

Dies sind überprüfbare Entwurfsziele, keine zugesicherten oder bereits gemessenen Leistungswerte.

| Vorgang | Ziel bei zehn aktiven Nutzern |
| --- | --- |
| Erste nutzbare Startansicht | p95 ≤ 3 Sekunden, ohne Google-Anmeldung |
| Suche, Listenwechsel, gespeicherter Filter | p95 ≤ 1 Sekunde nach auslösendem Request; UI-Reaktion sofort |
| Kundendetail oder Ausgabenliste | p95 ≤ 2 Sekunden |
| Kontakt/Buchung im App-Speicher sichern | p95 ≤ 2 Sekunden; eindeutige Bestätigung, keine Dublette |
| Datenkorrektheit | Alle festgelegten Referenzfälle korrekt, keine falsch zugeordneten Verkäufe |
| Fehler | Kein Datenverlust und keine unaufgeklärten Dubletten; technische Fehlerrate unter 1 %, bei kleinen Stichproben jeder Fehler einzeln prüfen |
| Nachtabgleich | Vollständig innerhalb des Nachtfensters oder korrekt fortsetzbar; konsistenter bestätigter Endstand |

Apps Script begrenzt Ausführungen unter anderem auf sechs Minuten. Importdauer, einzelne Fortsetzungsportionen und tägliche Triggerlaufzeit sind daher getrennt zu messen. [Google-Kontingente](https://developers.google.com/apps-script/guides/services/quotas)

## 7. Entscheidung nach dem ersten HQ-Test

1. **Direkte Lesevariante weiterverfolgen**, wenn alle wichtigen Ansichten einschließlich S5 mit begrenztem kurzem Cache die Ziele erfüllen, Zugriffe korrekt beschränkt sind und der Nacht-Schreibabgleich samt lokalen Änderungen überschaubar bleibt.
2. **Vorbereitete HQ-Datenkopie testen**, wenn verschachtelte Abfragen, das Mischen der App-Daten oder die HQ-Latenz wichtige Ansichten ausbremsen. Dieselben Szenarien und Datenmengen gegen einen kleinen Prototyp der Kandidatendatenbank messen. Keine Leistungsbehauptung allein aufgrund der Datenbankwahl.
3. **Apps Script selbst überprüfen**, wenn dessen Serveraufrufe/Verarbeitung und nicht HQ den Großteil der Wartezeit verursachen. Dann hilft allein ein HQ-Spiegel möglicherweise nicht; alternative Auslieferung beziehungsweise Backend testen.
4. Die günstigste betreibbare Variante wählen, die Korrektheit, Rechte, Geschwindigkeit, Wiederherstellung und geplante Erweiterungen erfüllt. Ein kleiner Unterschied beim Median rechtfertigt keinen erheblichen Wartungsaufwand.

Ergebnisartefakt: kompakte Vergleichstabelle mit gemessenen Werten, bestätigter Datenabdeckung, API-/Datenbankbedarf, Kostenannahmen und begründeter Empfehlung. Die Implementationsentscheidung wird erst dann festgeschrieben.

## 8. Aktueller Stand (23.09.2026)

- Der erste reale HQ-v2-Firmenabruf wurde ausgeführt: vier Läufe, insgesamt 90 erfolgreiche Antworten auf `/v2/Companies?top=20`. Die Einordnung steht im Projekttagebuch. Das ist noch kein vollständiger Belastungs- oder Mehrbenutzertest.
- Eine zusätzliche Live-Ansicht für Firmen und Netto-Rechnungsumsatz liegt unter `hq-benchmark/` bereit. Sie wurde lokal mit nachgebildeten HQ-Antworten geprüft, aber noch nicht gegen reale Belegfelder bereitgestellt. Feldzuordnung und fachliche Umsatzdefinition sind mit einem bekannten HQ-Beleg samt Gutschrift zu bestätigen.
- Der rohe Benchmark begrenzt einen Lauf auf 60 Requests und höchstens 60 Requests/Minute. Die neue Live-Ansicht begrenzt jeden Lauf auf höchstens eine HQ-Anfrage je zwei Sekunden und 25 Seiten zu je 500 Datensätzen pro Sammlung. Bei zwei PCs können beide Läufe gleichzeitig erfolgen.
- Danach echte Magazinprojekte, Ansprechpartner und Rechnungspositionen als zusammenhängenden Ablauf prüfen. Architektur und Datenhaltung bleiben offen.
