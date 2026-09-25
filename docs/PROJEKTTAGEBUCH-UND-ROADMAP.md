# Projekttagebuch und Roadmap – Magazinvertrieb Markatus

Zuletzt aktualisiert: 25. September 2026.

## Zweck und Pflege

Dieses Dokument bewahrt den Arbeitsstand über längere Chats und mehrere Sitzungen hinweg. Neue Wünsche nach größeren Gesprächsabschnitten ergänzen; erledigte Punkte mit Ergebnis vermerken; Änderungen an Entscheidungen nachvollziehbar festhalten. Explizite Nutzerwünsche, Vorschläge und offene Entscheidungen auseinanderhalten. Bestehende Wünsche nicht kommentarlos streichen. Zugangsdaten und echte Kundeninhalte gehören nicht hierher.

Die Pflege erfolgt während der gemeinsamen Projektarbeit, besonders bei neuen Roadmap-Wünschen, wichtigen Entscheidungen und zum Abschluss größerer Schritte. Es ist keine zeitgesteuerte Hintergrundaufgabe eingerichtet.

**Verbindlicher Arbeitsablauf seit 25.09.2026:** Codex pflegt fertige Dateien lokal und nennt die konkret zu ersetzenden Dateien; der Nutzer überträgt sie selbst nach Apps Script. ZIP-Pakete sind optional, kein notwendiger Übergabeweg. Nach abgeschlossenen Arbeitsschritten sichert Codex die zugehörigen geprüften Änderungen einschließlich Dokumentation per Commit und Push im konfigurierten GitHub-Repository. Jeder abgeschlossene Arbeitsschritt wird hier mit Ergebnis, Prüfung, offenen Punkten und nächstem Schritt dokumentiert. Die vollständigen Regeln stehen am Anfang von [AGENTS.md](../AGENTS.md) und gelten für neue Chats ohne erneute Aufforderung.

## 1. Projekt in wenigen Sätzen

Die Agentur hat ungefähr 30 Mitarbeiter und verkauft Film-, Social-Media-, Marketing-, Online- und Werbetechnikleistungen. Hinzu kommen iTV Coburg und werbefinanzierte Magazine. helloHQ wird für Kunden, Rechnungen, Zeiterfassung und weitere kaufmännische Abläufe genutzt; awork für Projekte und Aufgaben.

Die geplante Sales-App soll für Vertriebler eine einfache, schnelle gemeinsame Arbeitsoberfläche schaffen. Kunden, Ansprechpartner, Gesprächsverlauf, Ausgaben und Verkäufe müssen miteinander verknüpft sein. Zunächst konzentrieren wir uns auf Magazine. Seit der Anforderungsrunde vom 24.09.2026 ist für den nächsten Ausbau eine Google-Apps-Script-Web-App mit Firebase/Cloud Firestore als gemeinsamer Datenbank und HQ-Abgleich ausdrücklich gewünscht. Frühere Architekturvermerke weiter unten dokumentieren den damaligen Entscheidungsstand.

## 2. Ausdrücklich genannte Rahmenbedingungen

| Thema | Festgehaltener Wunsch / Angabe |
| --- | --- |
| Zuerst relevante Magazine | Coburger (aktuell 72), Kronacher (3), Lichtenfelser (6), Bamberger (2); Angaben aus der Anforderungsrunde |
| Später | Knolle (aktuell 16), Schoen.frau; weitere Agenturleistungen zunächst zurückgestellt |
| Datenmenge | Etwa 500–1.000 Kunden, 1–10 Ansprechpartner je Kunde, zunächst drei Jahre Buchungshistorie |
| Nutzer | Intern etwa 3–5 Vertriebler; perspektivisch extern weitere 5–10; langfristig etwa zehn gleichzeitig aktive Nutzer |
| Einstieg | Kleiner Pilot, schnell erste nutzbare Version, anschließend laufende Weiterentwicklung |
| Bedienung | Einfach, übersichtlich, intuitiv, schnell, gut miteinander verknüpft und erweiterbar |
| Gestaltung | Hauptansicht dunkel, an Mediadaten und das-magazin.de orientiert; gleichwertige helle Ansicht für bessere persönliche Lesbarkeit |
| Konten | Persönlicher Zugang über Google; Aktivitäten und gespeicherte Ansichten einer Person zuordnen |
| Preise und Termine | Mediadaten als auswählbare Referenz; Sonderpreise möglich; Ausgabetermine manuell pflegen |
| Verkaufsnachweis | Auch ohne vorheriges Angebot festhalten, was an wen wann zu welchem Preis verkauft wurde |
| Rechnungen | Weiterhin manuell in HQ erstellen |
| Redaktion | Für den Anfang eine E-Mail-Meldung über die erfasste Buchung vorsehen; bisher führt der Chefredakteur eine eigene Liste |
| Abgleich | Bei eigener Datenbank reicht ein nächtlicher HQ-Abgleich grundsätzlich aus |
| Budget und Betreuung | Kosten möglichst niedrig; kein Budget in der Größenordnung 200 €/Monat. Nutzer betreut technisch, leitet eigentlich den Filmbereich und hat begrenzte Programmierkenntnisse. |
| Dokumentation | Ausführliche Laienanleitung und wiederkehrende Zusammenfassungen, insbesondere Roadmap-Wünsche, dauerhaft ablegen |
| HQ-API-Version | Nutzer verwendet nach eigener Aussage fast alles über API v2. Erster Test auf v2; keine pauschale Aussage, dass sämtliche später benötigten Daten dort bereits geprüft sind. |

## 3. Aktueller Konzeptstand

Das ausführliche Fachkonzept ist in [VERTRIEBSKONZEPT.md](VERTRIEBSKONZEPT.md) beschrieben. Die folgenden Punkte sind der dort dokumentierte Arbeitsstand; sie sind noch keine implementierten Produktfunktionen:

- Navigation: Mein Tag, Magazinverkauf, Kunden, Ansprechpartner, Buchungen, Wiedervorlagen und Verwaltung.
- Ein Magazin und eine Ausgabe bilden den Arbeitskontext: Wer ist ein guter nächster Kontakt, wer wurde bereits angesprochen, wer hat gebucht?
- Manuelle Kontakterfassung mit Art, Ergebnis, Datum, Notiz und Wiedervorlage.
- Persönliche Filteransichten; sichtbare Betreuerzuordnung bei Ansprechpartnern.
- Buchungen ohne vorheriges Angebot, mit tatsächlichem Nettopreis und optionalem Paketbezug.
- Redaktionsmeldung mit Vorschau und nachvollziehbarem Meldestatus; Änderung/Storno gesondert berücksichtigen.
- Kunden und Ansprechpartner in der App erfassen bzw. ändern und an HQ übermitteln.
- Bei einer Datenkopie: Herkunft, offene Änderungen und Konflikte sichtbar halten. Kein unkontrolliertes gegenseitiges Überschreiben.
- App-Buchung und spätere HQ-Rechnung miteinander verknüpfen, damit derselbe Verkauf nicht doppelt zählt.
- Interner Pilot vor externer Freigabe. Konkrete externe Rechte noch festlegen.

Hinweis zur Herkunft: Ein Teil der früheren Antworten bestand aus Buchstaben wie „A“, „B“ oder „C“. Die zugehörigen Fragen sind im aktuell sichtbaren Gespräch nicht vollständig enthalten. Das vorhandene Fachkonzept hält die frühere Auswertung fest. Aus einzelnen Buchstaben werden hier keine zusätzlichen Zusagen oder neuen Rechte abgeleitet. Bei widersprüchlichen Erinnerungen hat die erneute Klarstellung des Nutzers Vorrang.

## 4. Roadmap – Wünsche bleiben erhalten

Keine der folgenden späteren Funktionen erhält durch diesen Eintrag bereits einen verbindlichen Termin.

| ID | Funktion | Herkunft und Status | Nächster Klärungspunkt |
| --- | --- | --- | --- |
| R01 | HQ-Planumsatz direkt aus einer Buchung vorbereiten/anlegen | Ausdrücklicher späterer Nutzerwunsch; noch nicht umgesetzt | Passende HQ-Funktion und notwendige Inhalte prüfen |
| R02 | Weitere Abläufe nach dem Verkauf und Redaktionsübergabe ausbauen | Nutzer möchte über die erste E-Mail hinausgehende Schritte auf der Roadmap behalten | Bisherige Liste des Chefredakteurs und gewünschte Folgeschritte ansehen |
| R03 | Automatische Gmail-Kontakthistorie | Im bestehenden Konzept als späterer Wunsch dokumentiert | Erlaubte Postfächer, Sichtbarkeit und Zuordnung klären; persönliche Nachrichten nicht blind übernehmen |
| R04 | awork-Anbindung | Als spätere Integration im Konzept dokumentiert | Konkrete Aufgaben und Auslöser definieren |
| R05 | Auswertungen pro Vertriebler: Aktivitäten, Abschlüsse, Quoten und Ziele | Im Konzept als spätere Erweiterung festgehalten; genaue Bedeutung früherer Buchstabenantwort bei Bedarf bestätigen | Kennzahlen und Sichtbarkeit gemeinsam definieren |
| R06 | Externe Vertriebler mit eigenem Google-Zugang | Ausdrückliche langfristige Nutzergruppe | Konten, Rechte und Sichtbarkeit von Preisen/Verkäufen festlegen |
| R07 | Knolle und Schoen.frau aufnehmen | Ausdrücklich zurückgestellt, nicht gestrichen | Zeitpunkt und Besonderheiten, insbesondere Onlineangebote, klären |
| R08 | iTV Coburg und weitere Agenturleistungen aufnehmen | Ursprünglicher Gesamtumfang; Magazine ausdrücklich zuerst | Produkt- und Verkaufsabläufe je Bereich beschreiben |
| R09 | Erweiterte Paket- und Rabattberechnung | Konzeptvorschlag für später | Regeln über mehrere Ausgaben/Magazine verbindlich definieren |
| R10 | Reservierungen und Produktionsabläufe | Konzeptvorschlag, noch nicht gesondert beauftragt | Tatsächlichen Bedarf mit Vertrieb und Redaktion bewerten |
| R11 | Erweiterte Teamansichten, Priorisierung und Auswertungen | Konzeptvorschlag, noch nicht gesondert beauftragt | Pilotfeedback abwarten |
| R12 | App-Nutzer ohne eigenes HQ-Konto | Am 24.09.2026 ausdrücklich als spätere Nutzergruppe bestätigt | Verantwortlichen HQ-Benutzer zunächst auswählen; spätere Zuordnungs- und Autorenregel klären |
| R13 | Rechnungen über mehrere Magazinausgaben aufteilen | Am 24.09.2026 als real vorkommend bestätigt, für den aktuellen Test ausdrücklich zurückgestellt | Rechnungspositionen oder fachliche Zuordnung je Ausgabe prüfen; keine ungeprüfte anteilige Verteilung |

### Ergänzende Ideen vom 23.09.2026 – noch nicht beauftragt

Auf Wunsch des Nutzers nach einer einfachen visuellen Übersicht wurden zusätzlich drei mögliche Alltagshilfen vorgeschlagen. Diese ergänzen die bestehende Roadmap; R01–R11 bleiben erhalten. Es handelt sich um neue Vorschläge des Assistenten, nicht um bestätigte Produktentscheidungen:

- **N01 – Buchungsvorlage für Wiederbucher:** Kunde, Kontakt und Format aus der letzten Buchung übernehmen; neue Ausgabe und Preis vor dem Speichern prüfen.
- **N02 – Urlaubsübergabe:** Ausgewählte Wiedervorlagen samt Gesprächskontext vorübergehend an eine Vertretung übergeben, ohne den festen Betreuer dauerhaft zu ändern.
- **N03 – Mediadaten griffbereit:** Zur Ausgabe passende freigegebene Unterlagen und vorbereiteten Mailtext anbieten; der Vertriebler entscheidet über den Versand.

Beschreibung von aktuellem Demoumfang und Grenzen: [APP-UEBERSICHT.md](APP-UEBERSICHT.md). Empfohlene Reihenfolge: zunächst verlässlicher interner Pilot, danach beispielsweise N01. Keine Termin- oder Umsetzungszusage.

### Weitere Vorschläge vom 24.09.2026 – Ideensammlung, nicht beauftragt

Der Nutzer bittet um zusätzliche Zukunftsideen als einfache Liste direkt in der Unterhaltung. Die folgenden Vorschläge sind weder beschlossen noch implementiert; die HTML-Übersicht wird für diese Ideensammlung nicht verändert. N01–N03 und R01–R11 bleiben bestehen.

- **N04 – Kompakte Gesprächsvorbereitung:** Letzte Schaltung, vereinbarter Preis, letzte Gesprächsnotiz und offener nächster Schritt zusammen vor dem Kontakt zeigen. Ergänzt die geplante Kundenkarte.
- **N05 – Telefonmodus:** Eine ausgewählte Arbeitsliste nacheinander abarbeiten, Gesprächsergebnis festhalten und direkt zum nächsten Kunden wechseln.
- **N06 – Nächsten Schritt anbieten:** Nach einem Gespräch einfache Auswahl wie Rückruf, Unterlagen vorbereiten oder Entscheidung nachfassen; mit passender Wiedervorlage. Keine unbeauftragten automatischen Nachrichten.
- **N07 – Fristenampel:** Zur Ausgabe anzeigen, wie lange bis zum Anzeigenschluss bleibt und welche Gespräche oder Buchungsentscheidungen noch offen sind. Konkretisiert die geplante Terminverwaltung.
- **N08 – Themenbezogene Kundenlisten:** Sonderthemen einer Ausgabe mit gepflegten Branchen/Interessen verbinden, zum Beispiel Bauen und Wohnen mit passenden Firmen. Vorschläge durch Vertrieb prüfen lassen; Erweiterung von R11.
- **N09 – Saisonale Wiederansprache:** Kunden vor passenden wiederkehrenden Anlässen wie Weihnachtsgeschäft oder Frühjahr auf Grundlage bisheriger Buchungen zur erneuten Ansprache vorschlagen. Ergänzt N01, löst keine automatische Buchung aus.
- **N10 – Eigene Sprachnotiz nach einem Termin:** Vom Vertriebler eingesprochene Zusammenfassung in einen bearbeitbaren Notizentwurf umwandeln und vor Speicherung prüfen; keine Aufzeichnung des Kundengesprächs.
- **Konkretisierung R11 – Weitere Magazinpotenziale:** Sichtbare Vorschläge für passende zusätzliche Magazine, begründet durch Region/Branche und bisherige Buchungen; fachliche Prüfung durch Vertrieb. Bereits im Fachkonzept angelegt.
- **Konkretisierung R05 – Absagegründe auswerten:** Freiwillig gepflegte Gründe wie Preis, Zeitpunkt oder Format zusammenfassen, um Produktangebot und Ansprache zu verbessern.
- **Konkretisierung R02/R10 – Unterlagenstatus:** Pro Buchung kenntlich machen, ob Anzeigenmotiv, Text, Bilder und Freigabe vorliegen; vermeidet Rückfragen zwischen Vertrieb und Redaktion.

Empfehlung des Assistenten für die spätere Priorisierung nach dem verlässlichen Kernpilot: N04, N05 und N07. Keine Zusage zu Reihenfolge oder Termin durch den Nutzer.

### Wichtige Funktionen für den ersten nutzbaren Stand – Pilotumfang

Kunden-/Personenansicht, Buchungshistorie, Magazin-/Ausgabenfilter, Kontaktprotokolle, Wiedervorlagen, persönliche Ansichten, Sonderpreise, einfache Paketzusammengehörigkeit, Redaktionsmeldung, Google-Anmeldung und verlässliche Datenanbindung bleiben Bestandteil der Pilotplanung. Excel-Übernahme, Konfliktbehandlung und Sicherung sind im Konzept als Vorbereitung auf den Alltag enthalten. Die Reihenfolge wird beim Bau anhand eines kleinen realen Piloten konkretisiert.

### Filter, die im Konzept erhalten bleiben sollen

- Für eine Zielausgabe als Nächstes ansprechen.
- In der vorherigen oder ausgewählten früheren Ausgabe gebucht.
- Früherer Inserent, aktuell noch nicht gebucht.
- Interesse, Rückmeldung offen, nicht erreicht, Absage für diese Ausgabe.
- Fällige/überfällige Wiedervorlage, Kontaktpause und keine weitere Ansprache.
- Letzter Kontakt, Kontakt durch bestimmten Vertriebler, fester Betreuer.
- Branche/Ort, fehlende Kontaktdaten, Magazin/Ausgabe, Buchungszeitraum, Paket und Redaktionsmeldestatus.

Das sind fachliche Anforderungen und Vorschläge aus dem Konzept; nicht jeder Filter ist bereits im klickbaren Entwurf bedienbar.

## 5. Was tatsächlich erledigt ist

| Ergebnis | Nachweis / Ablage | Grenze |
| --- | --- | --- |
| Konzept mit Features, Datenmodell und Ausbauplan | [VERTRIEBSKONZEPT.md](VERTRIEBSKONZEPT.md) | Noch keine produktive Implementierung |
| Produktreferenz aus bereitgestellten Mediadaten | [produktkatalog.json](produktkatalog.json) | Historische Referenzpreise, kein automatischer Vertragsabschluss |
| Klickbarer dunkler/heller Entwurf | In der Codex-Unterhaltung; zuletzt lokale Adresse http://127.0.0.1:63094/ | Nur erfundene Beispieldaten, kein echter Login/HQ-/Mailzugang; lokaler Server muss laufen |
| Ablaufprüfungen des Entwurfs | Kundennavigation, Kontakterfassung, Sonderpreis-Buchung, Redaktionsvorschau, helle/mobile Ansicht geprüft | Keine Abnahme einer produktiven Anwendung |
| Begrenztes HQ-Lesetestmodul | [hq-benchmark](../hq-benchmark/README.md) | Am 23.09.2026 gegen HQ ausgeführt; bisher nur derselbe kleine Firmenabruf, keine vollständigen App-Abläufe |
| Erste echte HQ-v2-Messungen | Vier vom Nutzer bereitgestellte Messprotokolle vom 23.09.2026 zu `/v2/Companies?top=20` | 90 erfolgreiche HTTP-200-Antworten; nur kleine Stichprobe und wiederholte identische Abfrage |
| Erweiterte Live-Testansicht für Kunden und Netto-Umsatz | [Revenue.gs](../hq-benchmark/Revenue.gs) und aktualisierte [Index.html](../hq-benchmark/Index.html) | Erster vollständiger HQ-Lauf durchgeführt; neue Vertriebsablauf-Version muss bereitgestellt und gemessen werden; Umsatz weiterhin fachlich abzugleichen |
| Lokale Prüfungen des Testmoduls | Elf Benchmark-, elf Umsatz- und ein Browserlogiktest mit nachgebildeten Diensten/Daten bestanden; Syntax und Manifest geprüft | Neue Vertriebsablauf-Version noch nicht real in HQ oder an zwei PCs gemessen |
| Verständliche Einrichtungshilfe | [START-HIER.md](START-HIER.md) | Erster HQ-Test eingerichtet; neue automatische Umsatzansicht muss noch als Version bereitgestellt werden |
| Firebase-Vergleichspilot im Code | [firebase-pilot](../firebase-pilot/README.md) und [FirebaseSync.gs](../hq-benchmark/FirebaseSync.gs) | Firebase-Projekt, erster echter Abgleich und Zwei-PC-Messung stehen noch aus |

## 6. Offene Entscheidungen und benötigte Angaben

1. API v2 ist als Ausgangspunkt bestätigt. Gültigen v2-Token direkt in Apps Script hinterlegen und den vorbereiteten Firmenabruf zunächst mit einer Anfrage prüfen. Nur bei Unklarheiten zur Anmeldung das vorhandene Script ohne Geheimnisse heranziehen.
2. Ein repräsentatives Magazinprojekt, zugehörige Rechnungspositionen und eine bisherige Excel-Liste untersuchen. Die im Konzept angenommene Zuordnung pro Ausgabe praktisch bestätigen.
3. Der direkte Kunden-/Umsatzablauf wurde gemessen. Als Nächstes den Firebase-Pilot live messen; Kontakt-, Projekt- und Rechnungsdetails bleiben zusätzliche offene Pfade.
4. Seit 24.09.2026 ist Firebase auch für den nächsten Ausbau der Apps-Script-App ausdrücklich gewählt. Zusatzkosten, Kontenanmeldung, sichere Schreibwege und Zwei-PC-Verhalten müssen für den erweiterten Umfang geprüft werden.
5. Reale Pilot-Ausgabe, Termine, interne Nutzer und Redaktions-Empfänger festlegen.
6. Vor externem Start klären, welche Kunden, Kontaktnotizen und finanziellen Angaben externe Nutzer sehen dürfen.
7. Praktisch bestätigen, welche Stammdatenänderungen bis zum Nachtlauf warten dürfen; für neue App-Aktivitäten und Buchungen gemeinsame zeitnahe Sichtbarkeit vorsehen.

## 7. Kurzes Arbeitsprotokoll

### 22.09.2026 – Konzept und technischer Vorversuch vorbereitet

Anforderungsrunde in Fachkonzept, Produktreferenz, Testplan und interaktiven Entwurf überführt. HQ-Testmodul mit begrenzten reinen Leseabfragen erstellt und lokal geprüft. Noch kein Zugriff auf den persönlichen HQ-Mandanten, kein Echtversand, keine Cloud-Datenbank und kein laufendes Produktivsystem.

### 22.09.2026 – Erklärung und dauerhafte Dokumentation ergänzt

Nutzer braucht eine ausführlichere Erklärung, wo die Vorschau läuft und wo er den HQ-Test tatsächlich durchführt. Neue Einstiegsanleitung trennt die lokale Vorschau von der später bei Google bereitgestellten Testseite. Dieses Tagebuch sichert Wünsche, Status und offene Punkte. Pflegehinweis im Projekt verankert, damit Folgearbeiten die Dokumentation fortführen.

### 22.09.2026 – API v2 als Grundlage bestätigt

Nutzer: „Ich hole mir fast alles immer mit der API v2.“ Einstieg auf v2 festgelegt. Öffentliche HQ-Dokumentation zu Authentifizierung und Mengenbegrenzung geprüft; `hq-benchmark/cases-v2.json` für `/v2/Companies?top=20` vorbereitet. Einstiegsanleitung angepasst: keine erneute Suche nach der Version nötig. Token, tatsächliche Berechtigungen und Antworten bleiben bis zum ersten echten Abruf ungeprüft.

**Nächste konkrete Aktion:** Eigenes Apps-Script-Projekt „Magazinvertrieb – HQ-Test“ anlegen, drei Programmdateien übernehmen und Eigenschaften gemäß START-HIER.md eintragen. Danach zunächst eine einzelne Anfrage. Die Sales-Vorschau kann unabhängig davon ausprobiert werden.

### 23.09.2026 – Erster echter HQ-v2-Lesetest ausgewertet

Der Nutzer hat vier JSON-Messprotokolle des eingerichteten HQ-Tests bereitgestellt. Alle Läufe fragten wiederholt `/v2/Companies?top=20` ab. Insgesamt 90 Anfragen, alle HTTP 200, keine bekannten HTTP- oder Transportfehler. Jede Antwort enthielt 20 erkannte Datensätze und etwa 54,8 KB. Die zehn seriellen Einzelabrufe bei 30 angebotenen Requests/Minute dauerten 234–596 ms; Median 240 ms. Die ersten zehn parallelen Abrufe bei 30 bzw. 60 angebotenen Requests/Minute dauerten als gesamter Batch 532 bzw. 540 ms. Beim längeren Lauf mit 60 Requests, Parallelität 10 und 60 angebotenen Requests/Minute lagen die sechs Batchzeiten bei 698–2230 ms, Median laut Testbericht 793 ms; ein Batch dauerte 2,23 s. Die Gesamtdauer dieses Laufs betrug rund 51 s, wesentlich durch die eingestellte Rate geprägt.

Einordnung: Für diesen kleinen, wiederholt identischen Leseabruf wirkt die Verbindung HQ–Apps Script schnell und blieb auch bei begrenzter Parallelität stabil. Die Messzeit umfasst UrlFetch und Netzwerk, nicht nur die HQ-Verarbeitung. Parallele Batchzeiten sind keine Einzelrequestzeiten. Die Stichprobe ist für belastbare p95-Werte und Aussagen zur späteren App mit verknüpften Kunden-, Kontakt-, Projekt- und Rechnungsdaten zu klein. Identische Wiederholungen können von Caches profitieren. Architektur und Datenhaltung bleiben offen.

**Nächste konkrete Aktion:** Einen echten, repräsentativen Magazinfall mit den benötigten HQ-Beziehungen auswählen und die zugehörigen Lesepfade sowie den kompletten App-Ablauf testen.

### 23.09.2026 – Nutzerwunsch: echte Kunden-/Umsatzliste als Geschwindigkeitstest

**Ausdrücklicher Wunsch:** In der bestehenden HQ-Testoberfläche alle Kundennamen aus HQ laden, nach Gesamtumsatz in einem wählbaren Zeitraum filtern und den Ablauf gleichzeitig an zwei PCs testen. Auf Nachfrage hat der Nutzer „Umsatz“ als **netto fakturierte Rechnungen einschließlich Gutschriften/Stornos** präzisiert, nicht als Projekt- oder Angebotswert.

**Implementiert, noch nicht real bereitgestellt:** Eine zusätzliche Live-Ansicht liest Firmen und Belege über die festen HQ-v2-Endpunkte `/v2/Companies` und `/v2/Documents` seitenweise, ordnet sie über auswählbare Felder zu und berechnet die ausgewählten Rechnungstypen positiv und Gutschriften negativ. Zeitraum, Namenssuche, Mindest-/Höchstumsatz und Sortierung sind vorhanden. Der Browser zeigt Gesamtzeit; ein herunterladbares Performanceprotokoll enthält keine Kundeninhalte. Für diese Ansicht gibt es kein globales Test-Lock, damit zwei PCs gleichzeitig messen können. Pro Lauf gilt ein Abstand von mindestens zwei Sekunden zwischen HQ-Anfragen. Unvollständige Abrufe und unklare Beträge werden nicht als fertige Umsatzliste dargestellt. Sechs lokale Tests mit nachgebildeten HQ-Antworten bestanden; bisheriger Benchmark bleibt unverändert und seine elf Tests bestehen weiter.

**Offene fachliche Prüfung:** Die öffentliche HQ-v2-Anleitung dokumentiert Filter/Pagination und den Documents-Endpunkt, aber nicht alle benötigten Belegfelder und Statuswerte. Deshalb hat die Oberfläche eine Feldprüfung und verlangt die Auswahl der tatsächlich gültigen Rechnungs-, Gutschrift- und Statuswerte. Die Zuordnung muss mit einem bekannten HQ-Beleg samt Gutschrift abgeglichen werden; insbesondere Storno-/Korrekturbelege und die Netto-Betragsbasis. Ohne Kundentypfilter werden alle Firmenarten gezeigt. Ohne Währungsfeld wird EUR nicht geprüft. Eine Grenze von 25 Seiten zu je 500 Datensätzen pro Sammlung verhindert unbegrenzte Abrufe; falls sie erreicht wird, ist die Liste nicht vollständig und wird nicht angezeigt. Die echte Bereitstellung und der gleichzeitige Zwei-PC-Lauf stehen noch aus. [Einrichtungsschritte](START-HIER.md#8-neue-live-ansicht-für-kunden-und-netto-umsatz).

### 23.09.2026 – Einmaliger GitHub-Abgleich abgeschlossen

Der Nutzer hat ausdrücklich darum gebeten, den aktuellen Projektstand auf das bereits eingerichtete GitHub-Repository hochzuladen. Dies ist ein einmaliger Auftrag; daraus folgt noch keine automatische Veröffentlichung aller künftigen Änderungen. Vor dem Hochladen wurden die Projektdateien auf Zugangsdaten geprüft, die lokalen Tests bestanden und eine `.gitignore` für lokale Geheimnisse und Messprotokolle ergänzt. Der Projektstand wurde mit Commit `af4e404` nach `origin/main` gepusht; dieser Tagebucheintrag wird in einem anschließenden kleinen Dokumentations-Commit ergänzt.

### 23.09.2026 – Umsatztest vereinfacht: automatische Feldvorschläge

**Nutzerkorrektur:** Der Nutzer kann und soll die technischen HQ-Feldnamen für Firmen, Belege und Netto-Beträge nicht selbst bestimmen müssen. Gewünscht ist eine erste funktionsfähige Annahme, die wir anhand der echten HQ-Antworten nachbessern. Der Nutzer bietet nötigenfalls Nachforschungen in HQ an, möchte aber zunächst eine von uns vorbereitete Version.

**Umgesetzt:** Die Testoberfläche liest eine kleine Firmen- und Belegprobe, schlägt Feldpfade und Belegart-/Statuswerte vor und füllt das technische Formular selbst. Sichtbar bleiben im Normalfall Zeitraum und Startbutton; technische Details sind einklappbar. Bei unklaren Kernfeldern oder rein numerischen Belegartcodes wird kein scheinbar sicherer Umsatz berechnet. Stattdessen ist eine Diagnose mit Feldnamen, Datentypen und möglichen Typ-/Statuswerten herunterladbar, ohne Kundennamen, Beträge oder Token. Einzelpreise/Positionsfelder werden nicht als Netto-Gesamtbetrag vorgeschlagen. Acht lokale Umsatztests bestanden. Die automatische Zuordnung ist eine vorläufige Annahme; sie muss mit mindestens einer echten Rechnung und Gutschrift abgeglichen werden. Google-Bereitstellung und realer Zwei-PC-Test stehen aus.

### 23.09.2026 – Erster echter Umsatzversuch: fehlender Belegstatus

**Beobachtung des Nutzers:** Die bereitgestellte Live-Testseite meldete „Belegstatus fehlt. Feldzuordnung prüfen.“ Damit ist der Abruf bis zur Belegverarbeitung gekommen; die Laufzeit einer vollständigen Liste und die fachlich korrekte Feldzuordnung sind noch nicht bestätigt. Eine Diagnose mit Feldpfaden und Statuswerten ist angefragt, aber bislang nicht ausgewertet.

**Lokal korrigiert:** Belege außerhalb des gewählten Zeitraums werden vor der Statusprüfung ausgesondert. Fehlende oder ungeeignete Angaben bei einzelnen relevanten Belegen brechen den Geschwindigkeitstest nicht mehr ab, sondern werden gezählt und ausgelassen. Die Oberfläche markiert den so berechneten Umsatz samt Umsatzfilter deutlich als unvollständig; das Messprotokoll enthält die Zähler. Abruffehler und unvollständige Seitennavigation stoppen weiterhin den Lauf. Neun Umsatztests mit simulierten HQ-Antworten bestanden. Die Korrektur braucht eine neue Apps-Script-Version und einen echten Wiederholungstest. Anschließend Diagnose und Messprotokoll ohne Kundeninhalte zur präzisen Feldzuordnung prüfen.

### 23.09.2026 – Echte HQ-Felddiagnose ausgewertet

**Beobachtung:** Der Nutzer stellte die heruntergeladene Felddiagnose bereit. Die Automatik hatte ein Projektfeld für den Belegstatus und ein Adressfeld für die Belegart ausgewählt. Die Diagnose zeigt stattdessen die Belegfelder `documentType` und `documentStatusEntity.documentStatusType`; für Datum und Netto-Betrag wurden `date` und `netValue` vorgeschlagen. Die tatsächlichen Beträge und vollständige Belege waren nicht Teil der Diagnose. Statuswerte in der Stichprobe umfassen Entwurf, angenommen, bezahlt, versendet und abgelehnt; ihre fachliche Behandlung bleibt bis zum Abgleich mit HQ-Belegen vorläufig.

**Lokal korrigiert:** Die automatische Zuordnung berücksichtigt für Belegart und Belegstatus nur dazu passende Belegfelder und schließt gleichnamige Projekt-/Adressfelder aus. Abgelehnte Belegstatus werden nicht als zählend vorgeschlagen. Diagnose-Downloads enthalten keine frei beschreibbaren Projektstatus-Werte mehr; die bisherige Diagnose konnte einen solchen internen Text enthalten. Die korrigierte Auswahl wurde direkt mit den Feldmetadaten des echten HQ-Downloads geprüft. Zehn Umsatztests und elf bisherige Benchmark-Tests bestanden. Die neue Fassung muss in Apps Script bereitgestellt und erneut live getestet werden; erst dann lässt sich die Umsatzsumme mit einer bekannten Rechnung und Gutschrift abgleichen.

### 23.09.2026 – Erster vollständiger Live-Lauf und Geschwindigkeitsbewertung

**Gemessener Stand:** Der Nutzer hat die korrigierte Testseite für den Zeitraum 01.01.2025 bis 23.09.2026 ausgeführt. Sie lud 3174 Firmen und 5779 Belege mit 19 HQ-Abfragen; die Ergebnisliste enthielt 3025 Kunden und 3486 zählende Belege. Serverzeit 37,1 s, Browser-Gesamtzeit 38,8 s. Die neue Felddiagnose bestätigt `documentType`, `documentStatusEntity.documentStatusType`, `date` und `netValue` als automatische Vorschläge. Eine Warnung über ausgelassene Pflichtfelder erschien nicht. Der berechnete Umsatz bleibt bis zum Abgleich mit bekannten Rechnungen und Gutschriften fachlich vorläufig. Echte Kundennamen und Finanzsummen werden hier nicht gespeichert.

**Einordnung:** Die Testimplementierung wartet mindestens zwei Sekunden zwischen Starts einzelner HQ-Abfragen. Bei 19 Abfragen entstehen dadurch mindestens etwa 36 Sekunden allein durch diese vorsichtige Begrenzung. Die Messung belegt die Wartezeit der aktuellen Testoberfläche, nicht eine entsprechend lange HQ-Verarbeitungszeit. Nach dem Laden reagieren Namens- und Umsatzfilter lokal im Browser ohne erneute HQ-Abfrage; ein neuer Zeitraum lädt in der aktuellen Testversion wieder alles frisch. Ein produktiver Vertriebseinstieg mit 38,8 s wäre nicht akzeptabel.

**Vorschlag, noch keine Architekturentscheidung:** Zuerst eine Vergleichsmessung mit dokumentierter Wartezeit, 1000 statt 500 Einträgen je HQ-Seite und gezielten HQ-v2-Filtern prüfen; das einzelne Messprotokoll mit Requestzeiten ist dafür angefragt. Danach bei Bedarf einen synchronisierten, für Kunden- und Umsatzfilter indizierten Datenbestand bewerten. Eine eigene Datenbank könnte die tägliche Arbeit deutlich beschleunigen, braucht aber einen belastbaren HQ-Abgleich und Regeln für Datenaktualität, Rechte und fachlich korrekte Gutschriften/Stornos. Die Nutzerpräferenz für niedrige laufende Kosten und grundsätzlich ausreichenden nächtlichen HQ-Abgleich bleibt bestehen.

### 23.09.2026 – Nutzerwunsch: den Arbeitsablauf eines Vertrieblers messen

**Ausdrücklicher Wunsch:** Der Nutzer möchte den Versuch näher an der späteren täglichen Bedienung ausrichten. Die 38,8 s der bisherigen vollständigen Liste sind für Vertriebler nicht akzeptabel; Erstaufruf und Filterbedienung müssen getrennt sichtbar werden.

**Implementiert, erneuter HQ-Lauf noch ausstehend:** Die direkte HQ-Variante liest bis zu 1000 statt 500 Datensätze je Seite und wartet nicht mehr künstlich zwei Sekunden zwischen den Abfragen. Die zuletzt im echten HQ-Test erkannten Feldpfade und beobachteten Typ-/Statuswerte sind vorbelegt; die Feldprüfung ist optional. Der erste Listenaufruf und ein Zeitraumwechsel bleiben frische HQ-Abrufe. Nach dem Laden werden Suche, Umsatzfilter, Sortierung und Seitenwechsel lokal aus den vorhandenen Kundendaten bedient. Maximal 100 Trefferzeilen je Seite werden aufgebaut. Die Oberfläche zeigt die Dauer von Filterung, Sortierung und Tabellenaufbau getrennt an und schreibt bis zu 100 Bedienzeiten und Trefferzahlen ohne Suchtexte oder Kundendaten in das Messprotokoll. Gleichzeitige Läufe an zwei PCs bleiben möglich. Die 11 bisherigen Benchmark- und 11 Umsatztests einschließlich neuer Seitengröße und der gemeldeten Datenmengen bestehen. Ein zusätzlicher Browserlogiktest mit 3050 nachgebildeten Kunden prüft 100 Zeilen je Seite, lokale Filter ohne HQ-Aufruf, den frischen Abruf bei Zeitraumwechsel und das Messprotokoll ohne Suchtexte.

**Grenze und offene Entscheidung:** Dies misst die Kunden-/Umsatzliste über direktes HQ plus eine bereits geladene Browserliste. Kontakte, Buchungen, Kundendetails, serverseitige HQ-Datumsfilter und eine eigene Datenbank sind damit noch nicht gemessen. Die direkte Variante darf nicht als endgültige App-Architektur gelten. Nach dem neuen Einzel- und Zwei-PC-Lauf entscheiden wir anhand von Erstaufruf, Zeitraumwechsel und Bedienzeiten, ob weitere HQ-Optimierung genügt oder ein synchronisierter Datenbestand erforderlich ist.

### 23.09.2026 – Zwei Vertriebsablauf-Protokolle ausgewertet

**Gemessen:** Der Nutzer stellte zwei vollständige Messprotokolle bereit. Der erste Lauf dauerte 39,3 s im Browser und 37,1 s im Server bei 19 Abfragen. Seine Servermetriken zeigen noch die frühere 500er-Seitengröße mit künstlichem Abstand; er ist kein Wiederholungslauf der optimierten Serverfassung. Der zweite Lauf nutzte nachweislich 1000er-Seiten ohne künstliche Pause: 10 Abfragen, 22,8 s Serverzeit und 25,1 s bis zur Ansicht im Browser. Beide Läufe luden 3174 Firmen und 5779 Belege mit insgesamt rund 54 MiB HQ-Antwortdaten. Beim neuen Lauf summieren sich die gemessenen Abrufzeiten auf 9,8 s; die HQ-Seitenphasen dauerten zusammen 22,7 s. Etwa 12,9 s innerhalb dieser Phasen werden vom bisherigen Protokoll nicht weiter aufgeschlüsselt und dürfen nicht pauschal HQ oder Apps Script zugeschrieben werden. Die anschließende Browser-/Übertragungsdifferenz betrug rund 2,3 s. Die gemessenen Seitenwechsel der bereits geladenen Liste dauerten rund 4–18 ms ohne neue HQ-Abfrage. Suche, Umsatzfilter und Sortierung wurden in diesen beiden Protokollen nicht betätigt. Die zwei Starts lagen zeitlich auseinander und belegen keinen gleichzeitigen Zwei-PC-Betrieb. Keine echten Kundennamen oder Finanzsummen werden hier gespeichert.

**Bewertung und Vorschlag:** Ein frischer Gesamtabruf bei jeder geöffneten Vertriebsansicht oder jedem Zeitraumwechsel ist mit 25 s auch ohne künstliche Pause für den Alltag zu langsam. Die Messung belegt die Latenz dieses vollständigen direkten HQ-Abrufs, nicht eine 25-s-Grenze für jede denkbare HQ-Abfrage oder eine spätere Datenbank. Für den Pilot wird ein synchronisierter, indizierter Lesebestand mit vorberechneten bzw. schnell aggregierbaren Kundenumsätzen nun als bevorzugte Architektur zur Prüfung empfohlen; die vom Nutzer grundsätzlich akzeptierte nächtliche HQ-Aktualisierung passt dazu. Zeitpunkt des letzten Abgleichs, Berechtigungen und fachlicher Belegabgleich bleiben zu klären. Eine gezielte HQ-Serverfilterung kann zusätzlich geprüft werden, ersetzt aber ohne Messung und fachliche Prüfung keine Entscheidung über Datenhaltung. Noch keine verbindliche Architekturentscheidung oder produktive Datenbank umgesetzt.

### 23.09.2026 – Firebase-Pilot für schnellen Vertriebseinstieg vorbereitet

**Ausdrücklicher Wunsch und Entscheidung für den Piloten:** Der Nutzer möchte den schnellen, synchronisierten Vertriebsabruf jetzt bauen und fragt nach Firebase sowie seinen Einrichtungsschritten. Es gibt nach seiner Auskunft noch kein Firebase-Projekt. Firebase Hosting, Authentication und Cloud Firestore werden für diesen Vergleichspiloten eingesetzt; damit ist noch keine endgültige Entscheidung für die gesamte spätere Sales-App getroffen.

**Implementiert, noch nicht live:** `hq-benchmark/FirebaseSync.gs` liest die Firmen und Belege aus HQ v2, berechnet pro Kunde und Tag den Netto-Umsatz aus den bisher erkannten Rechnungen und Gutschriften und schreibt kompakte Datenblöcke nach Firestore. Ein Versionszeiger wird erst nach vollständig geschriebenen Blöcken umgestellt. Ein manueller Abgleich und ein optionaler täglicher Apps-Script-Trigger sind vorbereitet. Die separate Firebase-Testseite verlangt Google-Anmeldung und eine in Firestore hinterlegte Nutzer-ID. Sie lädt den synchronisierten Stand, misst Listenaufbau und Firestore-Lesezeit und filtert Zeitraum, Name und Umsatz lokal. Ein Zwei-PC-Test und ein Protokoll ohne Kundennamen/Beträge sind vorbereitet. Zugriffsregeln verweigern Browser-Schreibzugriffe und sperren unbekannte Nutzer. Zugangsdaten bleiben in Apps-Script-Eigenschaften und werden nicht ins Repository übernommen.

**Prüfung und Grenzen:** Lokale Tests prüfen Tagesumsätze samt Gutschrift, Zeitraumfilter, vollständige Veröffentlichung und Abbruch bei HQ-Fehlern. Die bisherigen HQ-Tests bestehen weiter. Für echte Messungen muss der Nutzer ein Firebase-Projekt, Firestore, Google-Anmeldung, ein Dienstkonto und die Freischaltung seiner Nutzer-ID einrichten; die Anleitung steht in `docs/START-HIER.md`, Abschnitt 9. Die bisherige Zuordnung von HQ-Belegart, Status und `netValue` bleibt bis zum Vergleich mit bekannten Rechnungen und Gutschriften vorläufig. Die tatsächliche Firebase-Ladezeit, gleichzeitige Nutzung, Kosten und Eignung für weitere App-Daten sind noch nicht gemessen. Der Datenstand wird erst nach einem erfolgreichen Abgleich aktuell; neue Aktivitäten aus der späteren App brauchen weiterhin eine zeitnahe gemeinsame Speicherung.

### 23.09.2026 – Projekt-ID, Sicherheit und durchgehender Firebase-Testablauf

**Angabe des Nutzers:** `sales-markatus` ist die von ihm genannte mögliche Firebase-Projekt-ID. Ihr Format ist gültig; ob sie im tatsächlich angelegten Projekt unter „Projekteinstellungen → Allgemein“ steht, ist noch nicht verifiziert. Keine Zugangsdaten wurden übermittelt.

**Ausdrücklicher Wunsch:** Der Test soll zuerst den vollständigen HQ-Abgleich aus der vorhandenen Testoberfläche starten und danach die Ladezeit aus der Datenbank messen. Außerdem fragt der Nutzer nach der Sicherheit für Kundennamen, Abrechnungssummen und künftige Telefonnummern.

**Lokal umgesetzt, noch nicht bereitgestellt:** Die bestehende Apps-Script-Testoberfläche hat nun einen Firebase-Bereich mit Startknopf für `syncFirebasePilot`, Abgleichdauer, Zählern und Link zur Firebase-Vertriebsseite. Die Konfigurationsprüfung zeigt nur, welche Eigenschaften fehlen; Schlüsselwerte bleiben serverseitig. Der nächtliche Trigger nutzt denselben Abgleich. Vor jedem Abgleich prüft das Script ohne Anmeldung, dass der Zeiger und ein Test-Datenblock nicht öffentlich lesbar sind; eine offene oder unklare Antwort stoppt den Import. Tests für diese Abfolge und die bisherigen Funktionen bestehen. Die Anleitung verlangt außerdem die Veröffentlichung und Prüfung der gesperrten Firestore-Regeln **vor** dem ersten echten HQ-Abgleich.

**Sicherheitsgrenze:** Der aktuelle Pilot speichert Namen, HQ-IDs und Tagesumsätze, keine Telefonnummern oder Kontaktdaten. Alle per UID freigeschalteten Nutzer können alle Pilotkunden sehen. Firestore-Verschlüsselung und Zugriffsregeln schützen gespeicherte Daten, ersetzen aber keine Rollen je Nutzer, sorgfältige Verwaltung des Dienstkontos und datenschutzrechtliche Prüfung. Für die spätere Übernahme von Telefonnummern sind Berechtigungen je Nutzer/Kunde und Datensparsamkeit noch zu entwerfen. Die tatsächlichen Firebase-Regeln und der Zwei-PC-Test sind mangels eingerichteten Projekts noch nicht live geprüft.

### 23.09.2026 – Firebase-Schritt 9C: Regeln und Testseite veröffentlicht

Die korrigierte lokale `firebase-pilot/public/config.js` enthält eine vollständige Firebase-Web-App-Konfiguration für `sales-markatus`; sie bleibt durch `.gitignore` außerhalb des Repositorys. Die Firebase-CLI sieht dieses Projekt. Die Standard-Firestore-Datenbank ist im Modus `FIRESTORE_NATIVE` in `europe-west3` vorhanden. Mit `firebase deploy --project sales-markatus --only firestore:rules,hosting` wurden die Pilot-Zugriffsregeln erfolgreich kompiliert und zusammen mit der Testseite veröffentlicht. Die Seite ist unter `https://sales-markatus.web.app` erreichbar. Startseite und Konfigurationsdatei antworten mit HTTP 200, ein anonymer REST-Leseversuch auf `pilot/current` mit HTTP 403. Es wurden noch keine HQ-Kundendaten synchronisiert. Offen sind die Prüfung der veröffentlichten Regeln in der Konsole, die Google-Anmeldung, Freischaltung der Test-UID, der erste HQ-Abgleich und die Zwei-PC-Messung. Der frühere Vermerk, die Projekt-ID sei unbestätigt und die Regeln seien nicht live, ist damit überholt.

**Rückmeldung des Nutzers:** Die veröffentlichte Testseite zeigt nach der Anmeldung „Noch kein HQ-Abgleich vorhanden. Zuerst syncFirebasePilot ausführen.“ Damit ist der Lesezugriff dieses Testkontos auf den Piloten offenbar freigeschaltet; der Versionszeiger `pilot/current` fehlt noch. Der nächste Arbeitsschritt ist die Prüfung der Apps-Script-Einrichtung und der erste HQ-Abgleich. Falls das Dienstkonto im früher erwähnten separaten Google-Cloud-Projekt `hq-firestore-sync` statt in `sales-markatus` angelegt wurde, akzeptiert der aktuelle Sync-Code es nicht: `project_id` des Dienstkontos muss `sales-markatus` sein. Der Nutzer soll keine Schlüsseldatei übermitteln.

**Weitere Rückmeldung:** Die bisherige HQ-Test-Web-App zeigt noch die alte Oberfläche. Die lokale neue Fassung von `Index.html` und `FirebaseSync.gs` ist dort offenbar noch nicht als neue Apps-Script-Version bereitgestellt. Die bestehende Web-App-Bereitstellung soll bearbeitet und mit einer neuen Version aktualisiert werden; eine zweite separate Bereitstellung ist nicht nötig.

**Aktueller Stand:** Die aktualisierte HQ-Testseite zeigt nun den Firebase-Bereich und meldet „Konfiguration vorhanden“. Damit sind die drei erforderlichen Apps-Script-Eigenschaften vorhanden; ihre inhaltliche Gültigkeit und die Dienstkonto-Berechtigung prüft erst der Start des Abgleichs. Der Nutzer kann den einmaligen manuellen HQ-Abgleich jetzt über „1 · HQ nach Firebase synchronisieren“ auslösen. Der Code prüft zuvor, dass Pilotdaten anonym nicht lesbar sind, und veröffentlicht den neuen Datenstand erst nach dem vollständigen Schreiben.

### 23.09.2026 – Erster echter Firebase-Vertriebstest

**Gemessen:** Der Nutzer hat den HQ-Abgleich erfolgreich durchgeführt und das inhaltsarme Performanceprotokoll der Firebase-Vertriebsseite bereitgestellt. Der Datenstand wurde am 23.09.2026 um 15:50:44 lokaler Zeit erzeugt und enthält 3026 Kunden sowie 4326 zählende Belege in zwei Datenblöcken; `incomplete` ist `false`. Das Protokoll enthält zwei frische Firebase-Abrufe: Beim ersten Seitenstart 1354 ms bis zur Liste, davon 611 ms Datenabruf und rund 5 ms Tabellenaufbau; beim manuellen erneuten Abruf 614 ms bis zur Liste, davon 608 ms Datenabruf und rund 5 ms Tabellenaufbau. 43 protokollierte Filtervorgänge dauerten 1,9–8,1 ms, Median 4,1 ms; bei 24 Vorgängen änderte sich die Trefferzahl. Diese Messung zeigt einen einzelnen Browser; ein gleichzeitiger Zwei-PC-Test und die Dauer des HQ-Synchronisationslaufs liegen noch nicht vor.

**Einordnung:** Gegenüber dem zuletzt gemessenen direkten HQ-Erstabruf von 25,1 s war der erste Firebase-Listenaufbau in diesem Test etwa 19-mal schneller. Die Messungen sind fachlich nicht identisch: Der Firebase-Sync zählt alle berücksichtigten Belege des geladenen HQ-Bestands, während die frühere Zahl von 3486 zählenden Belegen aus einem gewählten Zeitraum stammte. Die Differenz bei der Kundenzahl (3026 statt 3025) ist aus dem inhaltsarmen Protokoll allein nicht erklärbar. Für eine fachliche Freigabe müssen derselbe Zeitraum und bekannte Rechnungen/Gutschriften verglichen werden. Die Aktualität hängt vom nächsten erfolgreichen HQ-Abgleich ab; der Pilot lädt alle Kundenblöcke in den Browser und filtert danach lokal.

### 23.09.2026 – Visueller App-Wegweiser und Roadmap-Übersicht

**Nutzerwunsch:** Eine einfache Übersicht im gleichen Stil wie die App erstellen: vorhandene Fake-Daten-Funktionen, Klickmöglichkeiten, sichtbare Inhalte und Verknüpfungen erklären; alle bisherigen Roadmap-Punkte sowie zusätzliche sinnvolle Ideen aufführen.

**Erstellt:** Interaktiver Wegweiser in der Codex-Unterhaltung mit „Klickwege“, „Verknüpfungen“ und „Roadmap“, sieben Navigationseinstiegen, den zugehörigen Detail-/Formularansichten und dunkler/heller Darstellung. Grundlage ist der geprüfte Code der vorhandenen `Sales-Markatus-Demo.html`. Eine dauerhafte textliche Übersicht liegt in [APP-UEBERSICHT.md](APP-UEBERSICHT.md). Die elf bisherigen Roadmap-Punkte sind vollständig übernommen; N01–N03 sind ausdrücklich neue, noch nicht beauftragte Vorschläge. Bestehende Projektdateien der Demo wurden nicht verändert.

**Abgrenzung:** Die klickbare Demo speichert nur lokal; der separate bereits gemessene Firebase-Lesepilot ist noch nicht mit dem vollständigen Vertriebsablauf verbunden. Platzhalter für Tagesdatum, zuletzt bearbeitete Kunden, Statusfortschreibung, Rechte und HQ-Zuordnung werden nicht als fertige Produktfunktionen dargestellt. Keine echten Kundeninhalte wurden in die Übersicht übernommen.

**Prüfung:** Kontakt- und Buchungsweg, Verknüpfungsauswahl, 14 Roadmap-/Ideeneinträge und Theme-Wechsel im Testbrowser geprüft, keine JavaScript-Laufzeitfehler. Alle drei Bereiche bei vier Fensterbreiten von 336 bis 1040 Pixeln ohne seitlichen Inhaltsüberlauf geprüft; Ansichten zusätzlich visuell kontrolliert.

**Nächster Schritt:** Den Wegweiser gemeinsam zur fachlichen Priorisierung nutzen; danach den internen Pilot mit gemeinsamem Datenbestand und verlässlicher Statuslogik weiterführen. Die neuen Ideen sind bis zur Entscheidung lediglich Vorschläge.

### 23.09.2026 – Wegweiser als einzelne Offline-HTML exportiert

**Nutzerwunsch und Fehlerhinweis:** Die vollständige Übersicht soll als einzelne HTML jederzeit per Doppelklick vom PC aus geöffnet werden können. Der Nutzer meldet, dass die aufklappbaren Einträge unter Roadmap-Punkt 3 in der eingebetteten Übersicht nicht aufgehen. Die frühere Prüfung hatte den Klick ausgeführt, den sichtbaren geöffneten Inhalt jedoch nicht ausdrücklich geprüft.

**Umgesetzt:** [Sales-Markatus-Uebersicht.html](../Sales-Markatus-Uebersicht.html) im Projektordner erstellt. Alle Inhalte, Gestaltung und Bedienlogik sind eingebettet; keine Internetverbindung, Zusatzdateien oder laufender Server erforderlich. Die exportierte Fassung verwendet native HTML-Aufklappelemente und ist unabhängig von Codex-Zustandsereignissen, die eine Ansicht neu aufbauen können. Offene Roadmap-Punkte werden im lokalen Zustand erhalten und nach Bereichswechsel sowie nach Möglichkeit nach Neuladen wiederhergestellt. Die konkrete Ursache des gemeldeten Fehlers in der Codex-Einbettung ist damit nicht abschließend nachgewiesen; die ausgelieferte Browserdatei wurde direkt geprüft. Die ursprüngliche Inline-Fassung bleibt unverändert.

**Geprüft:** Fertige Datei direkt über einen lokalen Dateipfad in Edge mit abgeschaltetem Netzwerk geöffnet. Alle 14 Roadmap-/Ideenpunkte einzeln auf- und zugeklappt und Sichtbarkeit der Inhalte geprüft; Enter und Leertaste, Erhalt nach Bereichswechsel/Neuladen, heller Modus, schmale Darstellung und Kunden-/Buchungsklickweg geprüft. Keine JavaScript-Fehler oder Netzwerkanfragen.

**Nächste Aktion für den Nutzer:** `Sales-Markatus-Uebersicht.html` im Projektordner per Doppelklick öffnen oder an einen gewünschten Ort auf dem PC kopieren.

### 24.09.2026 – Lokale Roadmap um eigene Punkte und Priorisierung erweitert

**Ausdrücklicher Nutzerauftrag:** Alle zehn zuletzt vorgeschlagenen Zukunftsideen in die lokale HTML-Roadmap aufnehmen; darunter eigene Roadmap-Punkte erfassen können; jedem Punkt eine Priorität zuweisen und automatisch von höchster zu niedrigster Priorität sortieren, um Updates zu planen.

**Implementiert in `Sales-Markatus-Uebersicht.html`:** Eine gemeinsame Liste aller 24 bisherigen und neuen Punkte. N04–N10 behalten ihre dokumentierten Bedeutungen. Die drei bisherigen Konkretisierungen erhalten zusätzlich eigene Kennungen: **N11** weitere Magazinpotenziale (R11), **N12** Absagegründe (R05), **N13** Unterlagenstatus (R02/R10). Damit sind alle zehn Vorschläge einzeln priorisierbar, ohne die übergeordneten R-Punkte zu entfernen. Herkunft und Konzeptstatus bleiben sichtbar; die Aufnahme ist keine Beauftragung ihrer Umsetzung in der Sales-App.

Jeder Eintrag erhält „Priorität“ mit höchster/hoher/mittlerer/niedriger bzw. noch offener Einstufung sowie „Geplantes Update“ (1–5, später, offen). Alle starten unpriorisiert. Änderungen sortieren sofort über die gesamte Liste hinweg; bei gleicher Priorität bleibt die ursprüngliche Reihenfolge erhalten. Die Update-Zuordnung beeinflusst die Prioritätssortierung nicht. Stand und Pilotvoraussetzungen bleiben separat aufklappbar erhalten.

Eigene Punkte können unterhalb der Liste mit Titel, optionaler Beschreibung und beiden Einstufungen angelegt sowie später bearbeitet oder nach Bestätigung entfernt werden. Änderungen bleiben lokal im Browser. „HTML mit Planung speichern“ exportiert zusätzlich eine eigenständige HTML-Kopie einschließlich eigener Punkte, Prioritäten und Update-Zuordnungen für Sicherung/Weitergabe. Die Ursprungsdatei wird durch Browserbedienung nicht automatisch verändert. Blockierte Browserspeicherung wird sichtbar gemeldet.

**Verifikation:** Alle 24 Aufklappelemente, globale Sofortsortierung samt Gleichständen, Update-Zuordnung, Erhalt offener Details und laufender Formulareingaben beim Sortieren, Anlage/Bearbeitung/Löschung eigener Punkte, Pflichtfeldprüfung, Textausgabe ohne HTML-Ausführung, Wiederherstellung nach Neuladen und Übernahme alter gespeicherter Ansichten geprüft. Export in einem frischen Offline-Browser geöffnet: eigene Einträge und Planung vollständig vorhanden. Speicherfehler und Breiten 320/360/760/1280 Pixel geprüft, keine JavaScript-Fehler oder externen Netzwerkanfragen. Getestete Fassung identisch in die lokale Zieldatei übernommen.

**Nächste Aktion:** Lokale HTML neu laden, „Roadmap“ öffnen und erste Prioritäten setzen. Zum Mitnehmen der Planung den HTML-Export verwenden.

### 24.09.2026 – Anforderungen für Apps-Script-App mit echten Daten aufgenommen

**Ausdrücklicher Nutzerwunsch:** Die lokale HTML-App mit bestehender Gestaltung als Apps-Script-Web-App betreiben, Fake-Daten entfernen und Firebase als gemeinsame Datenbank verwenden. Eine integrierte Testseite soll zuerst Firebase abfragen, danach einen gezielten HQ-Import auslösen und anschließend wieder Firebase lesen. Ebenso App→Firebase→HQ testen; manuelle Testläufe ersetzen später die nächtliche Ausführung. Der Nutzer fragt vor Umsetzung nach offenen Fragen und eigenen Vorbereitungsschritten.

**Vollständig dokumentierter Umfang:** [ECHTDATEN-PILOT.md](ECHTDATEN-PILOT.md) enthält Unternehmensfelder, beide Adresstypen, eigene Felder, Adressherkunft mit Sonstige-Freitext, Kunden-/Interessentenstatus (Standard Interessent), sämtliche Ansprechpartner, bidirektionale Kontakt-Historie, Projekt-/Umsatzübersicht, Magazin-Historie aus Sammelprojektrechnungen, änderbare Ausgabeziele/Termine, Google-Anmeldung und historische Magazinfilter. Neue Firmen mit abhängigen Ansprechpartnern müssen zuverlässig und ohne Dubletten synchronisierbar werden. Besondere Sorgfalt bei jedem HQ-Schreibziel ist ausdrücklich gefordert. Bestehende Roadmap-Wünsche bleiben erhalten.

**Vorschläge, noch nicht entschieden:** Einzelbelege als nachvollziehbare Quelle plus Zusammenfassung je Firma/Ausgabe; getrennte Adress- und HQ-IDs; Synchronisationsaufträge mit Wiederaufnahme; Konflikte sichtbar zurückhalten; zunächst Schreibvorschau, dann begrenzte Testobjekte mit Rücklesen aus HQ. Ziele/Termine zunächst in Firebase. Rechnungen weiterhin nur lesen ist ein Vorschlag zur Klärung, keine stillschweigende Einschränkung des allgemein formulierten Schreibwunsches.

**Offen:** Kontoarten und Pilotzugang, HQ-Testumgebung, Finanz-/Projekt-Schreibumfang, Umsatz-/Teilnahmedefinition, Sonderfälle bei Rechnungsempfängern, Konfliktregel, HQ-Ziel für Ausgabedaten und Benutzer-/Nummernzuordnung. HQ-API v2 bleibt Ausgangspunkt; Schreibfähigkeit, Pflichtfelder und Kontakthistorien-Zuordnung sind noch nicht geprüft.

**Tatsächlich erledigt:** Bestehende Dokumentation, lokale Demo und Pilot-Zugriffsregeln geprüft; aktuelle offizielle HQ-/Apps-Script-Dokumentation gelesen; Anforderungen und Vorbereitungen dauerhaft festgehalten. In diesem Schritt keine App-Funktionen implementiert, keine Bereitstellung und keine HQ- oder Firebase-Datenänderung ausgeführt.

**Nächste Aktion:** Fachliche Fragen beantworten; anschließend Apps-Script-Anbindung und integrierten Lese-Testpfad bauen. Echte Schreibtests erst mit festgelegten Testobjekten und geprüften Feldzuordnungen.

### 24.09.2026 – Fachliche Antworten bestätigt und erster App-Datenpilot implementiert

**Bestätigte Entscheidungen:** Nur ausdrücklich freigegebene E-Mail-Adressen; selbst anzulegende Testfirmen für HQ-Schreibtests; Firmen der gewählten COBURGER-Ausgabe ausschließlich lesen. Rechnungen und Projekte bleiben reine Lesequellen. Umsatz netto aus ausgestellten auch unbezahlten Rechnungen, ohne Entwürfe, Gutschriften/Stornos berücksichtigen. Rechnungsempfänger zunächst als Inserent behandeln. Rechnungen über mehrere Ausgaben existieren, ihre Aufteilung ist ausdrücklich zurückgestellt. Konflikte anzeigen und entscheiden lassen. Ausgabeziele/Termine nur in App/Firebase. HQ-Verantwortlichen manuell wählen. Spätere App-Nutzer ohne HQ-Konto als zusätzliche offene Roadmap-Anforderung erhalten. Übrige Vorschläge grundsätzlich akzeptiert. Die Antworten sind in [ECHTDATEN-PILOT.md](ECHTDATEN-PILOT.md) als vorrangiger Entscheidungsstand ergänzt.

**Lokal implementiert:** [sales-app](../sales-app/README.md) enthält die neue Oberfläche im bisherigen Stil ohne Demo-Kundendaten und den Serverteil. Neue getrennte Firebase-Sammlungen für Ausgabe, Firmendetails, Auswahllisten, Testfirmen und Übertragungsaufträge. Integrierter manueller Datenweg Firebase→HQ-Import→erneuter Firebase-Abruf; begrenzter Ausgabeimport und separate Firmendetails mit Kontakten, Historie und Projektumsatz. Eigene Testfirma einschließlich Standardadresse, Verantwortlichem, Firmentyp und erstem Kontakt zunächst in Firebase erfassen, dann kontrolliert in HQ anlegen und zurücklesen. Eindeutige Zielzuordnung, Vorschau, Sperre bei unklarem Ausgang, Markerprüfung und Wiederaufnahme. Kontakt-Historie und erster Änderungstest für Branche/Homepage eigener Testfirmen. Konfliktentscheidung und Versionsschutz für Ausgabeziele/Termine. E-Mail-Freigaben über Verwaltung. Details und Grenzen stehen im Modul-README.

**Verifikation:** 20 neue automatisierte Prüfungen sowie bestehende Benchmark-/Umsatz-/Firebase-Tests erfolgreich. Oberfläche lokal im Browser, Sonstige-Freitext, Themewechsel und schmale Darstellung geprüft. Keine echten Kundendaten für diese Prüfungen verwendet. Öffentliche HQ-v2-Schemata zu Firmen, Adressen, Kontakten und Kontakt-Historie geprüft. Der aktuelle Code des bestehenden Apps-Script-Projekts wurde lokal gesichert; dessen HQ-/Firebase-Module stimmen mit dem lokalen Ausgangsstand überein.

**Bereitstellungsstand und Blocker:** Bestehendes Projekt und bisherige Web-App-Bereitstellung identifiziert. Erster Upload an einer Dateinamenskollision gescheitert; Quell-/Ausgabename danach korrigiert (`SalesBackend.gs` versus `Sales.html`). Weiterer Upload von Google abgewiesen: Apps Script API im Benutzerkonto nicht aktiviert. Deshalb noch keine erfolgreiche Veröffentlichung der neuen App, kein echter Ausgabe-/Detailimport und kein HQ-Schreibtest. Der Browser-Livetest wartet zusätzlich auf die persönliche Google-Anmeldung im Codex-Browser. Keine geheimen Script Properties ausgelesen oder dokumentiert.

**Zugriff:** Die automatische Freigabeprüfung lehnte die geplante Erweiterung der Google-Bereitstellung auf die Firmendomäne ab. Sicherere Alternative umgesetzt: Manifest behält `MYSELF`/„Nur ich“ bei. Die serverseitige E-Mail-Liste beschränkt den App-Zugriff zusätzlich, ersetzt aber die Google-Bereitstellungsfreigabe nicht. Weitere Nutzer können unter dem unveränderten Bereitstellungszugriff noch nicht praktisch zugreifen. Mehrnutzerfreigabe später ausdrücklich klären; keine Umgehung der Ablehnung.

**Noch nicht implementiert bzw. nicht abgenommen:** Vollständige Bearbeitung aller Stammdaten-/Adress-/Kontaktfelder, weitere Ausgaben, Historienfilter über mehrere Ausgaben, produktive App-Buchungen/Wiedervorlagen, externe Google-Identitäten, durchgängige Rollen und fortsetzbarer Nachtimport. Diese Anforderungen bleiben erhalten. Der neue Stand ist ein erster Daten-/Schreibtestpilot, keine fertige produktive Vertriebs-App. Keine neuen automatischen Nachtläufe eingerichtet.

**Nächste Nutzeraktion:** Apps Script API in den Google-Benutzereinstellungen aktivieren und im Codex-Browser mit dem freigegebenen Konto anmelden. Danach bestehenden App-Code hochladen, gleiche Web-App-Adresse auf neue Version setzen und zuerst ausschließlich Lesetests an der gewählten Ausgabe durchführen. Eigene Testfirmen erst nach Prüfung der echten Auswahllisten und Zielzuordnung erstellen.

### 25.09.2026 – Bereitstellung bestätigt und auf manuelle Dateiübergabe umgestellt

**Tatsächlich erfolgt nach der Rückmeldung „aktiviert“:** Die sieben Apps-Script-Dateien wurden erfolgreich in das bestehende Projekt hochgeladen. Die vorhandene Web-App-Bereitstellung wurde erfolgreich auf Version 8 aktualisiert. Der frühere API-Aktivierungsblocker ist damit erledigt; App-Adresse und Bereitstellungszugriff „Nur ich“ blieben erhalten. Der anschließende Browserzugriff auf die Google-Anmeldung wurde von der automatischen Prüfung wegen fehlender Workspace-Credits nicht ausgeführt. Dies war ein Fehler der Freigabeprüfung, keine Feststellung, dass die Aktion unsicher sei. App-Start, Ausgabeimport, Detailimport und HQ-Schreibtest sind daher weiterhin nicht live bestätigt.

**Neue ausdrückliche Arbeitsweise:** Der Nutzer möchte die Dateien selbst nach Apps Script übertragen. Codex erzeugt und prüft künftig lokale Dateien und liefert eine verständliche Anleitung, ohne selbst hochzuladen oder Bereitstellungen zu ändern. Ein neuer ausdrücklicher Auftrag wäre nötig, um diese Arbeitsweise wieder zu ändern. Vorgabe in AGENTS.md festgehalten.

**Übergabe:** Sieben unveränderte Programmdateien des bereits hochgeladenen Stands werden als Ordner und ZIP unter `output/apps-script/` mit [MANUELL-UEBERTRAGEN.md](../sales-app/MANUELL-UEBERTRAGEN.md) bereitgestellt. Keine Geheimnisse, Kundeninhalte oder lokale CLI-Anmeldedaten enthalten. Der Nutzer muss denselben Stand nicht nochmals übertragen; das Paket dient als vollständige lokale Übergabe und Grundlage kommender manueller Updates.

**Nächste Aktion:** Bestehende Web-App öffnen und den ersten Firebase-/HQ-Lesetest über die Daten-Testseite durchführen. Künftige Änderungen manuell anhand der Anleitung übernehmen und anschließend eine neue Version der vorhandenen Bereitstellung veröffentlichen.

### 25.09.2026 – Drei dauerhafte Arbeitsregeln für alle Folgechats verankert

**Ausdrücklicher Nutzerauftrag:** (1) Fertige Dateien im Projektordner pflegen und genau benennen, welche der Nutzer selbst in Apps Script ersetzt; (2) anschließend die zugehörigen Änderungen nach GitHub hochladen; (3) alles Erledigte im Projekttagebuch festhalten. Diese Regeln sollen jedem neuen Chat sofort bekannt sein.

**Umgesetzt:** Die drei Regeln stehen nun prominent am Anfang von `AGENTS.md` und zusätzlich im Zweck-/Pflegeabschnitt dieses Tagebuchs. Die Apps-Script-Übertragung bleibt manuell; ZIP-Dateien werden nur auf Wunsch benötigt. Der GitHub-Abgleich ist dauerhaft beauftragt und umfasst gezielte Commits mit Dokumentation, ohne Geheimnisse/Kundeninhalte oder ungeprüfte fremde Änderungen. Fehlgeschlagene Uploads müssen als offen gemeldet werden. Jeder abgeschlossene Arbeitsschritt erhält eine nachvollziehbare Tagebuchnotiz; lokale Umsetzung, GitHub-Sicherung, Google-Bereitstellung und Live-Prüfung bleiben getrennt.

**Prüfung und Übergabe:** Bestehenden GitHub-Remote und aktiven Branch geprüft. Für diesen Arbeitsschritt werden ausschließlich `AGENTS.md` und das Projekttagebuch versioniert; übrige bereits vorhandene App-/Dokumentänderungen bleiben im Arbeitsordner erhalten. Keine Apps-Script-Bereitstellung und keine HQ-/Firebase-Datenänderung vorgenommen.

**Nächster Schritt:** Bei den folgenden Änderungen automatisch nach diesem Ablauf arbeiten. Der erste echte Datenwegtest der bereits bereitgestellten Version 8 bleibt offen.

**GitHub-Ergebnis dieses Schritts:** Die beiden Dokumentationsdateien wurden lokal im Commit `82bf3fa` versioniert. Der anschließende Push zu `origin/main` wurde von der automatischen Freigabeprüfung abgelehnt: Für das konkrete Ziel `https://github.com/markatusGit/Sales-Markatus-WebApp` und die Übertragung dieser Projektdokumentation sei die ausdrückliche Bestätigung noch nicht nachgewiesen. Kein Push erfolgt. Bestätigung des Nutzers für dieses Ziel und die Dateien `AGENTS.md` sowie `docs/PROJEKTTAGEBUCH-UND-ROADMAP.md` einholen; nicht durch einen anderen Übertragungsweg umgehen. Der allgemeine dauerhafte GitHub-Arbeitsauftrag bleibt festgehalten.

### 25.09.2026 – Unterschiedliche Bereitsteller- und Testkonten als Zugangsproblem erkannt

**Neue Nutzerinformation:** Das Apps-Script-Projekt läuft unter `info@markatus.de`; das zuvor als erster App-Nutzer genannte `pp@markatus.de` ist ein anderes Konto. Mit dem Bereitstellerkonto meldet die App fehlenden Zugriff, mit dem Testkonto erscheint eine Google-Drive-Fehlerseite. Der Screenshot allein beweist die Ursache der Google-Fehlerseite nicht.

**Diagnose:** Im Code ist ohne Script Properties ausschließlich das bisherige Testkonto als Administrator/freigegeben voreingestellt, während die letzte bestätigte Google-Bereitstellung auf „Nur ich“ steht. App-interne Freigabe und Google-Bereitstellungszugang passen dadurch nicht zusammen. Die frühere Annahme, erster App-Nutzer und Bereitsteller seien dasselbe Konto, war falsch.

**Vorbereitete Lösung ohne Codeänderung:** Vorhandene Konfiguration nutzen: `SALES_ADMIN_EMAIL` mit dem Bereitstellerkonto und `SALES_ALLOWED_EMAILS` mit den beiden ausdrücklich benannten Konten setzen. Die konkrete Schrittfolge steht in [MANUELL-UEBERTRAGEN.md](../sales-app/MANUELL-UEBERTRAGEN.md). Diese Properties werden bei jedem Aufruf gelesen; kein Dateiaustausch und keine neue Version nötig. Zunächst mit ausschließlich dem Bereitstellerkonto im Browser anmelden. Das zweite Konto bleibt durch Googles „Nur ich“ gesperrt; eine Erweiterung wurde nicht durchgeführt oder als erledigt behauptet.

**Prüfung:** Konfiguration lokal gegen den tatsächlichen ausgelieferten Servercode mit nachgebildetem Session-/Properties-Dienst geprüft: Bereitsteller als Administrator erkannt, zweites Konto als normaler Nutzer erkannt, Administratoraktionen für dieses zweite Konto gesperrt, unbekannte und leere Identitäten abgewiesen. Keine Netzwerkaufrufe und keine Änderungen an Google-Einstellungen, Dateien der laufenden App, HQ oder Firebase. Offizielle Google-Dokumentation bestätigt getrennte Ausführungsidentität und mögliche Mehrkonto-Probleme. Anleitung und Diagnose lokal dokumentiert. GitHub-Upload bleibt wegen der zuvor nicht bestätigten Ziel-/Inhaltsfreigabe offen; kein erneuter Uploadversuch.

**Nächste Nutzeraktion:** Die beiden Script Properties im bestehenden Projekt eintragen und die App ausschließlich mit dem Bereitstellerkonto neu öffnen. Erst danach den Zugriff des zweiten Kontos gesondert einrichten und die echten Datenwege testen.

### 25.09.2026 – Fehlende Einrichtungsschritte in der Übergabe aufgearbeitet

**Nutzerrückmeldung:** Die beiden neuen `SALES_`-Skripteigenschaften waren im Google-Projekt bisher gar nicht vorhanden. Der Nutzer vermutet verlorene Informationen beim automatischen Übertragungsversuch.

**Festgestellt:** Der Code liest `SALES_ADMIN_EMAIL` und `SALES_ALLOWED_EMAILS` mit einem voreingestellten Ersatzwert; keine Einrichtung beim Datei-Upload legt diese Eigenschaften an. Der Ersatzwert beruhte auf der falschen Annahme zum Bereitstellerkonto. Die ursprüngliche Anleitung nannte nur Dateien und versäumte die zusätzlichen Konfigurationsschritte. Das war ein Fehler in Einrichtung und Übergabe. Es gibt daraus keinen Nachweis für gelöschte Code-Dateien, Skripteigenschaften oder Kundendaten. Die tatsächlichen entfernten Eigenschaften wurden nicht ausgelesen. Erfolgreicher Datei-Upload und Bereitstellung von Version 8 sind durch Werkzeugmeldungen belegt; vollständige Einrichtung und erfolgreicher Live-Betrieb sind weiterhin nicht bestätigt.

**Erledigt:** Alle Property-Lese-/Schreibstellen der vier ausgelieferten Serverdateien geprüft. Vollständige Liste der fünf für die neue Sales-App vorgesehenen Eigenschaften in der manuellen Anleitung ergänzt: zwei neue Zugangsparameter und drei bereits vom Firebase-/HQ-Piloten verwendete Parameter. Die zwei zusätzlichen alten Benchmark-Einstellungen und der automatisch verwaltete Laufstatus sind gesondert erklärt. Geheimwerte müssen nicht erneut übertragen werden. Übergaberegel in `AGENTS.md` ergänzt: künftig immer Dateien, Konfiguration und Bereitstellungseinstellungen getrennt aufführen und Bereitsteller, Administrator sowie Nutzer unterscheiden. Keine Programmdatei, Google-Konfiguration oder Cloud-Daten verändert.

**Nächster Schritt:** Zwei neue Zugangsparameter anlegen bzw. prüfen, bestehende HQ-/Firebase-Einstellungen beibehalten und die App mit dem Bereitstellerkonto neu öffnen. Danach erst den Leseweg prüfen. GitHub-Abgleich bleibt mangels der bereits angefragten konkreten Freigabe offen; kein erneuter Pushversuch.

### 25.09.2026 – App-Start mit Bereitsteller bestätigt; Testablauf konkretisiert

**Nutzerrückmeldung:** App-Zugang mit dem Bereitstellerkonto funktioniert jetzt. Das zweite freigegebene Konto erhält auch in einem separat angemeldeten Inkognito-Fenster weiterhin die Google-Fehlerseite. Damit ist nur der App-Start mit dem Bereitsteller bestätigt, noch kein Ausgabe-/Detailimport und kein HQ-Schreibtest. Der letzte bestätigte Bereitstellungszugriff „Nur ich“ sperrt weitere Konten unabhängig von der internen Freigabeliste.

**Bestätigter Wunsch / weiterhin offen:** Normale Nutzer sollen sich mit ihrem Google-Konto anmelden und nach ausdrücklicher E-Mail-Freigabe die App verwenden können, ohne Skripteditorzugriff oder eigenes HQ-Konto. Ein eigener Google-Login ist in der aktuellen Sales-App noch nicht integriert. Firebase Authentication mit Google ist ein möglicher technischer Baustein, kein bereits implementierter oder abgenommener Lösungsweg. Serverseitige Prüfung der Identität und Freigabe sowie ein erreichbarer Anmeldeeinstieg müssen zusammen eingerichtet werden; ein Login-Knopf hebt die Google-Bereitstellungssperre nicht auf. Apps Script bleibt die vereinbarte Plattform; keine Hosting-Umstellung oder Freigabeänderung ausgeführt.

**Erledigt:** Tatsächliche UI-Schaltflächen gegen die Anleitung geprüft. Manuelle Anleitung um erwartete Ergebnisse und gestufte Tests ergänzt: Ausgabe Firebase→HQ-Import→Firebase; einzelne Firmendetails; Auswahllisten; Ausgabeziele/Termine in Firebase; anschließend eigene Testfirma zunächst nur in Firebase, Vorschau und bewusste HQ-Übertragung. Grenzen und Verhalten bei unklarem Schreibausgang erklärt. Offizielle Google-Dokumentation zu Bereitstellungszugriff und Google-Anmeldung über Firebase geprüft. Nur Dokumentation geändert; keine Programmdateien, Cloud-Einstellungen oder echten Daten verändert. Keine neuen Code-Tests erforderlich.

**Nächste Nutzeraktion:** Mit dem funktionierenden Bereitstellerkonto die drei Ausgabe-Schritte auf der Daten-Testseite durchführen und Meldung sowie angezeigte Unternehmenszahl zurückmelden. Erst danach Details und eigene Testobjekte prüfen. Der Mehrnutzerzugang bleibt gesondert umzusetzen. GitHub-Upload bleibt wegen der früheren automatischen Ablehnung der Ziel-/Inhaltsfreigabe offen; kein erneuter Pushversuch.

### 25.09.2026 – Erster echter Leseweg bestätigt; Korrekturen an Kundendetails priorisiert

**Vom Nutzer live bestätigt:** Ausgabeimport hat 21 Firmen übertragen; Rechnungen der COBURGER-Ausgabe #70 sind in der App sichtbar. Anschließend wurde ein Kunde mit Detaildaten übertragen. Seine in HQ hinterlegte Homepage fehlt in der App. Noch keine eigene Testfirma angelegt und kein Schreibtest bestätigt. Keine Kundennamen oder Inhalte in dieser Dokumentation erfasst.

**Neue konkrete Anforderungen:** Rechnungsversand darf in der Kontakthistorie bleiben. In der Übersicht nur zugehörigen Projektnamen, Datum und Rechnungsbetrag anzeigen; vollständige Standard-E-Mail erst beim Aufklappen. Normale Gesprächsnotizen nicht pauschal als Rechnungsversand behandeln. Bei abgeschlossenen Projekten tatsächliches Abschlussdatum anzeigen; bei offenen Projekten geplante Umsätze einschließlich Zeitpunkt. Diese Anforderungen sind noch nicht implementiert.

**Lokal geprüft:** Aktueller Import liest Firmen-`homepage`, lässt aber das zusätzlich dokumentierte Adressfeld `website` weg. Das ist eine mögliche Ursache der fehlenden Homepage, noch kein Nachweis anhand der tatsächlichen Antwort des betroffenen Kunden. `ContactHistories.projectId` wird derzeit beim Speichern verworfen. Das gespeicherte öffentliche HQ-v2-Schema dokumentiert den Projektbezug, aber keine direkte Rechnungs-ID an der Kontakthistorie: Ein Projektbezug allein reicht bei mehreren Rechnungen nicht zur sicheren Betragszuordnung. Keine Beträge aus Mailtexten schätzen und keine Projektgesamtsumme als einzelne Rechnung ausgeben. Projekt-`actualFinishDate` und `plannedFinishDate` werden bisher ebenfalls nicht übernommen. `PlannedRevenues` dokumentiert unter anderem Projektbezug, Nettosumme, Rechnungsdatum, Status und Wiederholungsintervall; dieser Datenbereich wird bisher nicht gelesen. Schemafund ist kein Nachweis für Verfügbarkeit oder Befüllung im Mandanten.

**Offene fachliche Rückfrage:** Meint der Nutzer mit geplanten Umsätzen die HQ-Umsatz-/Abrechnungsplanung oder Angebote/Auftragsbestätigungen? Über die Rückfragefunktion gestellt, zum Zeitpunkt dieses Eintrags noch nicht beantwortet. Bei wiederkehrender Planung müssen Zeitraum, Status und bereits abgerechnete Anteile geprüft werden; geplante und bereits fakturierte Umsätze getrennt halten.

**Nächste Schritte:** Zuerst Lesekorrektur vorbereiten: Homepage-Quelle gezielt prüfen, Kontakthistorie mit verlässlicher Rechnungs-/Projektzuordnung und aufklappbarem Text, Projektabschluss sowie bestätigte Quelle für Umsatzplanung ergänzen. Falls eine Verknüpfung fehlt, als nicht zugeordnet anzeigen. Danach geänderte Dateien für manuelle Bereitstellung benennen und denselben Kunden erneut HQ→Firebase importieren und aus Firebase laden. Anschließend erst eigene Testfirma mit Ansprechpartner und kontrollierte Schreibtests. Reguläre Google-Anmeldung bleibt separat offen. In dieser Runde nur Diagnose, Testauswertung und Roadmap dokumentiert; keine Programmdatei, Bereitstellung oder Cloud-Daten geändert. GitHub-Upload wegen der dokumentierten automatischen Freigabeablehnung weiterhin offen; kein neuer Pushversuch.

### 25.09.2026 – Kundendetailupdate lokal umgesetzt

**Fachlich bestätigt:** Der Nutzer meint ausdrücklich die Planumsätze direkt aus dem HQ-Projekt, nicht Angebote oder Auftragsbestätigungen. Die vorherige Rückfrage ist damit beantwortet. Auftrag „fahre fort“ zur Umsetzung erhalten.

**Lokal implementiert:** Homepageanzeige aus Firmenfeld, alternativ Standardadress-Website, ersatzweise eindeutiger Rechnungsadress-Website einschließlich Quellenhinweis. Das originale Firmenfeld bleibt für spätere Schreib-/Konfliktprüfungen separat erhalten. Kontakthistorie bewahrt Projekt-ID; Dokumentversand erscheint mit Projekt, Versanddatum und Netto-Belegbetrag, die vollständige E-Mail erst aufklappbar. Normale Notizen bleiben sichtbar. HQ dokumentiert keine direkte Rechnungs-ID am Historieneintrag: Zuordnung anhand eindeutiger vollständiger Rechnungsnummern in Betreff oder ausdrücklich beschrifteter Referenz im Text, eingeschränkt auf denselben Kunden und gegebenenfalls dasselbe Projekt. Fehlende oder mehrdeutige Zuordnungen zeigen einen Hinweis statt eines geschätzten Betrags. Gemeinsame Magazinprojekte werden anhand dieser Bezüge nachgeladen, auch wenn sie nicht direkt dem Kunden zugeordnet sind.

**Projekte/Planumsätze:** Tatsächliches Abschlussdatum und geplanter Projektabschluss übernommen. Für offene direkt zugeordnete Projekte `PlannedRevenues` einschließlich `Estimations` als reine Lesequelle angebunden. Anzeige einzelner HQ-Plantermine mit Nettobetrag und Währung; Projektionen ohne Beleg (Status Planned/Deferred) von bereits belegverknüpften und anders eingestuften Einträgen getrennt. Keine Vermischung mit fakturiertem Projektumsatz und keine Addition von wiederkehrendem Gesamtplan und seinen Einzelterminen. Bei fehlender Terminaufteilung werden Planbetrag, Intervall und Planungsbeginn beschriftet angezeigt, kein Rechnungstermin erfunden. Datenquellen/Belegzuordnung müssen im Mandanten noch geprüft werden.

**Prüfung:** 27 lokale automatisierte Prüfungen erfolgreich. Neue Abdeckung für Homepage-Prioritäten, unveränderte Rohwerte, exakte/mehrdeutige/fremde Rechnungsnummern, Datumsvalidierung, Planprojektionen versus belegverknüpfte Einträge, Fremdwährungen, gemeinsame Projekte, abgeschlossene Projekte ohne unnötigen Planabruf, erweiterten Import und Erhalt des bisherigen Firebase-Stands bei Abruf-/Zuordnungsfehlern. HTML-/Skriptprüfung und aufklappbare, escaped Darstellung ebenfalls erfolgreich. Finale erzeugte Programmdateien geprüft. Keine Live-Abfragen von HQ, keine echten Kundendaten für Tests, keine Bereitstellung und keine Cloud-Datenänderungen durch Codex ausgeführt.

**Manuelle Übergabe / nächster Schritt:** Genau `hq-benchmark/SalesBackend.gs` und `hq-benchmark/Sales.html` vollständig ersetzen, neue Version der bestehenden Bereitstellung veröffentlichen. Keine neuen Skripteigenschaften, keine Manifest-/Zugriffsänderung. Danach beim bereits geprüften Kunden **Details HQ → Firebase** und **Erneut aus Firebase lesen** ausführen. Homepage, Versandbelegzuordnung und je ein abgeschlossenes/offenes Projekt vergleichen. Der alte ZIP-Stand wurde nicht erneuert und darf für dieses Update nicht verwendet werden. Anleitung und Modul-README entsprechend aktualisiert. Falls die Homepage weiter fehlt, konkrete HQ-Antwort gezielt untersuchen; der Adress-Fallback ist noch kein bestätigter Live-Fix. Eigene Testfirma und Google-Mehrnutzeranmeldung bleiben danach offen.

**Sicherung:** Zugehörige Programmdateien, Quellen, Prüfungen und Dokumentation werden gezielt lokal versioniert. Der GitHub-Upload bleibt aufgrund der zuvor dokumentierten automatischen Ablehnung zur Ziel-/Inhaltsfreigabe offen; kein erneuter Pushversuch.

### 25.09.2026 – Rückmeldung zur laufenden App und erster HQ-Schreibtest

**Vom Nutzer live beobachtet:** Nach der letzten manuellen Übertragung war in der Kundenansicht keine der erwarteten Änderungen sichtbar: Homepage weiterhin fehlend, Rechnungsversand und Projekte unverändert. Welche Apps-Script-Version tatsächlich an der `/exec`-Adresse lief, ist damit nicht bewiesen. Eine eigene Testfirma wurde danach in HQ angelegt und vom Nutzer grundsätzlich positiv geprüft. Homepage kam in HQ nicht sichtbar an; eine URL ohne Protokoll wurde vom Browserformular abgewiesen. Die sichtbare Firmenbeschreibung enthielt zusätzlich eine technische Kennzeichnung. Für Branche und Anrede wünscht der Nutzer HQ-Auswahlfelder. Kundenklassifizierung und Kundenherkunft sollen beim Anlegen vorerst verborgen bleiben. Keine echten Firmennamen, Mailtexte oder Test-IDs in die Dokumentation übernommen.

**Ursachen im lokalen Code:** Das Homepageformular verwendete den HTML-Typ `url`, der Eingaben wie `www.test.de` abweist. Das alte Anlageschema schrieb nur `Company.homepage`; HQ kennt außerdem `CompanyAddress.website`. Die technische Kennzeichnung wurde absichtlich in der Beschreibung angefügt, um nach einem verlorenen HQ-Ergebnis keine zweite Firma anzulegen, bisher aber nicht wieder entfernt. Der bisherige App-Code hatte weder eine sichtbare Release-Kennung noch einen Abgleich zwischen HTML und Server und lud nach dem Detailimport die Firebase-Kopie nicht automatisch erneut.

**Lokal implementiert:** Sichtbare Kennung `2026-09-25-r3` oben in der App und Sperrbildschirm bei unterschiedlichem HTML-/Serverstand; Hinweis bei älteren Firebase-Firmendetails und automatischer erneuter Firebase-Abruf nach einem erfolgreichen HQ-Detailimport. HQ-Katalogimport ergänzt um unterschiedliche tatsächlich verwendete Branchen und Anreden; Formular und begrenzter Änderungstest nutzen Dropdowns. Die beiden vorerst unerwünschten eigenen Felder sind im Anlageformular verborgen. Homepage ohne Schema wird zu `https://...` normalisiert. Neue Testfirmen schreiben die Homepage in Firmenfeld und Standardadresse, prüfen beide zurück und entfernen die technische Kennzeichnung aus der Beschreibung erst nach vollständiger Bestätigung. Für bereits bestätigte eigene Testfirmen: lesender Abgleich der Homepage-Felder, danach ein Vorschauauftrag für Homepageänderung in Firma und eindeutig identifizierter Standardadresse und ein separater Vorschauauftrag zur Entfernung der Kennzeichnung. Andere HQ-Werte lösen Konflikt oder Stopp vor dem Schreiben aus; verlorene Antworten werden über die bekannte HQ-ID zurückgelesen. Schreibziele bleiben auf eigene Testfirmen begrenzt.

**Nachweis und Grenze:** 38 synthetische App-Prüfungen bestanden, darunter Formularauswahl, URL-Normalisierung, Anlage, Adressänderung, Konfliktfall, verlorene Antworten, Kennzeichnungsbereinigung und Versionssperre. Bestehende elf Benchmark- und elf Umsatztests bestanden ebenfalls ohne Netzwerkzugriff. Die zwei Apps-Script-Ausgabedateien wurden danach aus den Quellen neu erzeugt. Es wurden keine HQ-, Firebase-, Apps-Script- oder GitHub-Änderungen durch Codex ausgeführt. Ob der echte HQ-Mandant den Adress-PUT und die gewünschte Homepagequelle genau so liefert, bleibt bis zum nächsten Nutzertest offen. Das vorherige Ausbleiben der Detailänderungen ist nur als Versions-/Abrufproblem eingegrenzt, noch nicht live eindeutig diagnostiziert.

**Nächste Nutzeraktion:** Nur `SalesBackend.gs` und `Sales.html` im bestehenden Apps-Script-Projekt vollständig ersetzen, vorhandene Bereitstellung mit **Neue Version** aktualisieren und die sichtbare Kennung kontrollieren. Danach denselben Bestandskunden per **Details HQ → Firebase** prüfen, Auswahllisten neu importieren und die bereits angelegte eigene Testfirma über **Homepage in HQ prüfen** untersuchen. Falls nötig, Homepage-Änderung und Kennzeichnungsbereinigung nur über ihre getrennten Vorschauaufträge durchführen. Keine neuen Skripteigenschaften, Manifest- oder Zugriffsänderungen. Manuelle Anleitung und Modul-README aktualisiert. GitHub-Upload bleibt wegen der früheren automatischen Ablehnung des konkreten Ziels/Inhalts offen; kein erneuter Pushversuch.

### 25.09.2026 – Dauerhaft stehende Firebase-Startanzeige eingegrenzt

**Nutzerrückmeldung:** Die Web-App zeigt nur die schwarze Startseite mit „Verbinde mit Firebase …“ und kommt auch nach langer Wartezeit nicht weiter. Diese Wortfolge stammt aus dem statischen HTML vor Ausführung des App-Skripts. In der lokalen Vorschau läuft der JavaScript-Teil dagegen an. Der genaue Fehler in der Google-Bereitstellung ist ohne deren Laufzeitmeldung noch nicht bestätigt.

**Lokal umgesetzt:** Startanzeige enthält nun die sichtbare Kennung `2026-09-25-r4` und einen konkreten Hinweis zu Datei und Bereitstellung. Ein kleines unabhängiges Skript ersetzt eine unveränderte Startanzeige nach acht Sekunden durch einen Fehlerhinweis, wenn das Hauptskript nicht anläuft. Für die ausschließlich lesende Firebase-Startabfrage gibt es nach 45 Sekunden ohne Antwort eine Fehlermeldung mit Wiederholungsmöglichkeit; spätere Antworten werden ignoriert. Backend-Kennung ebenfalls auf `r4` gesetzt, damit unterschiedliche HTML-/Serverstände gesperrt und erkennbar bleiben. Keine HQ- oder Firebase-Schreiblogik verändert.

**Prüfung und Grenzen:** 39 synthetische Sales-Prüfungen, elf Benchmark- und elf Umsatzprüfungen bestanden; Umsatz-UI-Prüfungen ebenfalls erfolgreich. Browser-Vorschau zeigte den vollständigen Startbildschirm und die Kennung `r4`; der Startwächter wurde mit einem künstlich fehlenden Hauptskript geprüft. Keine echten Google-, HQ- oder Firebase-Aufrufe und keine Apps-Script-Bereitstellung durch Codex. Ob Google die neue HTML-Datei vollständig ausliefert oder ein Serveraufruf hängt, muss der Nutzertest unterscheiden. Die lokale `node --test`-Teststartvariante wurde durch eine Sandbox-Sperre für Unterprozesse verhindert; direkter Node-Testlauf war erfolgreich.

**Nächste Nutzeraktion:** `hq-benchmark/SalesBackend.gs` und `hq-benchmark/Sales.html` vollständig in die gleichnamigen Google-Dateien übernehmen und bei der vorhandenen `/exec`-Bereitstellung **Neue Version** wählen. Anschließend den genauen sichtbaren Text prüfen und melden. Steht weiter die alte Wortfolge „Verbinde mit Firebase …“, ist die neue HTML-Version nicht aktiv. Meldet die App einen unbeantworteten Startabruf, in Apps Script unter **Ausführungen** den Status von `getSalesState` prüfen. Keine neuen Skripteigenschaften, Manifest- oder Zugriffsänderungen. Bis zum erfolgreichen Start keine weiteren HQ-Schreibtests. GitHub-Upload bleibt wegen der früheren automatischen Ablehnung des konkreten Ziels/Inhalts offen; kein erneuter Pushversuch.

### 25.09.2026 – Fehlermeldung des Startwächters und lokale Datei

**Neue Rückmeldung:** Der Nutzer sieht mit Kennung `r4` „App-Start fehlgeschlagen – Der JavaScript-Teil konnte nicht starten“. Die sichtbare Browseradresse im übermittelten Kontext ist eine lokale `file:///.../hq-benchmark/Sales.html`; noch nicht bestätigt ist, ob die zitierte Fehlermeldung genau aus diesem Tab oder aus der bereitgestellten Web-App stammt. Deshalb keine Firebase-Ursache behaupten.

**Eingrenzung:** Die unveränderte HTML-Datei wurde über einen lokalen Testserver geöffnet. Dort startet das Hauptskript und zeigt erwartungsgemäß, dass die Google-Apps-Script-Schnittstelle außerhalb der bereitgestellten Web-App fehlt. Der genaue Wortlaut „konnte nicht starten“ stammt aus dem sofortigen globalen Fehlerwächter und kann auch durch einen anderen Browserfehler ausgelöst werden. Eine lokale HTML-Datei ist kein gültiger Live-Test der Apps-Script-Verbindung. Keine Programmdatei, Bereitstellung oder Cloud-Daten geändert.

**Nächster Schritt:** Browseradresse der Seite mit der Meldung klären. Bei `file:///` die vorhandene `https://script.google.com/.../exec`-Adresse mit dem freigegebenen Konto öffnen; bei `/exec` den konkreten Browserfehler eingrenzen und den Startwächter gegebenenfalls korrigieren. GitHub-Upload bleibt wegen der früheren automatischen Ablehnung des konkreten Ziels/Inhalts offen.

### 25.09.2026 – Echte Web-App bestätigt; Syntaxfehler auf Homepage-Ausdruck eingegrenzt

**Korrektur zur vorherigen Diagnose:** Der Nutzer bestätigt ausdrücklich die veröffentlichte Web-App unter `/exec` mit dem freigegebenen Bereitstellerkonto. Die lokale Datei im Browserkontext war für diese Rückmeldung nicht maßgeblich. Die Annahme eines falschen Aufrufs war hier falsch. Die nachgereichte Konsole meldet `Uncaught SyntaxError: Invalid or unexpected token` an `userCodeAppPanel`, Zeile 86, Spalte 244. Die zusätzlich genannte iframe-Sandbox-Warnung ist eine getrennte Browsermeldung.

**Konkrete Fehlerstelle:** In der Hauptskriptfassung des tatsächlich übergebenen r4-HTML ist genau Zeile 86, Spalte 244 der Beginn der URL-Zeichenfolge in der Homepage-Ergänzung. Der lokale JavaScript-Parser akzeptiert diesen Code. Ein [primärer Reproduktionsbericht zur HtmlService-Verarbeitung](https://www.ebiyuu.com/post/2026/06/gas-preprocess-bug/) beschreibt, wie komplexe Template-Literale die Verarbeitung nachfolgender doppelter Schrägstriche als Kommentar auslösen können. Das passt zu Position und lokal erfolgreicher Prüfung; die tatsächlich von Google veränderte Quellzeile wurde noch nicht eingesehen.

**Lokal korrigiert:** Oberfläche `2026-09-25-r4.1`; Homepage-Normalisierung in eigene Funktion verlegt, Protokoll-Schrägstriche getrennt zusammengesetzt und im regulären Ausdruck als Zeichenklassen geschrieben. Damit bleibt das gewünschte Verhalten für reine Domains, `www` und vorhandene HTTP(S)-Adressen erhalten. Der unabhängige Startwächter zeigt künftig die ursprüngliche Fehlermeldung mit Zeile/Spalte über `textContent`; er ignoriert Ressourcenfehler ohne Meldung und überschreibt den ersten Fehler nicht durch seinen Zeitwächter. Die Oberfläche erwartet weiterhin Backend-Release `r4`, sodass nur HTML neu zu übertragen ist. Backend, HQ-/Firebase-Schreiblogik und Zugriff unverändert.

**Prüfung:** 41 lokale Sales-Prüfungen bestanden, einschließlich URL-Eingaben und Erhalt/HTML-sicherer Anzeige des ursprünglichen Startfehlers. Browser-Vorschau mit synthetischer Google-Schnittstelle zeigt das Dashboard mit `r4.1`. Ausgabedatei aus Quelle erzeugt; Backend-Datei nachweislich ohne Diff. Keine Google-Bereitstellung, HQ- oder Firebase-Änderung durch Codex. Erfolgreicher Start unter Google bleibt bis zur manuellen Übernahme und Nutzerrückmeldung offen.

**Übergabe / Sicherung:** Nur `hq-benchmark/Sales.html` vollständig im bestehenden Apps-Script-Projekt ersetzen, speichern und die vorhandene Bereitstellung auf **Neue Version** setzen. Danach `/exec` neu laden und `2026-09-25-r4.1` kontrollieren. Keine geänderten Skripteigenschaften, Manifest- oder Zugriffseinstellungen. Anleitung aktualisiert; zugehörige Änderungen werden gezielt lokal versioniert. GitHub bleibt wegen der zuvor dokumentierten automatischen Ablehnung des konkreten Ziels/Inhalts offen; die dazu bereits gestellte Bestätigungsfrage ist unbeantwortet.

### 25.09.2026 – Testfirmenanlage in überprüfbare Schritte aufgeteilt (lokal r5)

**Live-Rückmeldung:** Der Nutzer bestätigt, dass die App mit `r4.1` startet, die Homepage der eigenen Testfirma nun in HQ und App erscheint und die Bestandskunden-Kontakthistorie passend angezeigt wird. Beim jüngsten Testkunden fehlen in HQ noch der Ansprechpartner und die Entfernung der technischen Kennzeichnung aus der Beschreibung. Der gespeicherte Anlageauftrag zeigt „Fortsetzung vorbereitet“ und „Gefundene HQ-Anlage zugeordnet“: Die bereits angelegte Firma wurde gefunden, doch der Auftrag wurde danach nicht zu Ende geführt. Ob im gespeicherten Entwurf ein Ansprechpartner steht, ist noch nicht live bestätigt.

**Lokal implementiert:** Die Anlage läuft in getrennten, wiederaufnehmbaren Phasen. Phase 1 legt die eigene Testfirma an und speichert ihre HQ-ID. Phase 2 liest die Firma und ihre wichtigsten Felder zurück und legt erst dann den zum Entwurf gehörenden Ansprechpartner mit dieser Firmen-ID an. Phase 3 liest den Kontakt zurück, entfernt die technische Kennzeichnung aus der Firmenbeschreibung und speichert den bestätigten Stand in Firebase. Bei verzögerter HQ-Rücklesung bleibt die bereits bestätigte Phase erhalten, ohne die Firma oder den Kontakt erneut anzulegen. Bei unklarem Ausgang nach einem Schreibversuch bleibt die Wiederholung gesperrt und erfordert zunächst die vorhandene HQ-Abgleichfunktion. Die Rückprüfung der Standardadresse toleriert ein von HQ anders dargestelltes Beschreibungsfeld und kontrolliert weiterhin Anschrift und Website. Die Testseite zeigt den Status der Anlage und des Ansprechpartners; eine gesonderte Markerbereinigung ist erst nach abgeschlossenem Anlageauftrag verfügbar. HTML und Backend tragen gemeinsam `2026-09-25-r5` und erkennen gemischte Versionen.

**Prüfung und Grenze:** 43 lokale Sales-Prüfungen mit synthetischen Daten bestanden, darunter explizite Firma-/Kontakt-/Abschlussphasen, verzögerte Firmen- und Kontakt-Rücklesung, verlorene Antwort mit Wiederaufnahme ohne zweite Anlage sowie Beschreibung ohne Kennzeichnung nach Abschluss. Elf Benchmark-, elf Umsatz-, zwei Umsatz-UI- und sechs Firebase-Pilot-Prüfungen ebenfalls bestanden; keine Netzwerkaufrufe. Aus den Quellen wurden `hq-benchmark/SalesBackend.gs` und `hq-benchmark/Sales.html` neu erzeugt. Es gab durch Codex weder HQ-/Firebase-Schreibzugriffe noch Google-Upload oder Bereitstellung. Der echte Kontakt-Endpunkt und die Bereinigung müssen mit einer selbst angelegten Testfirma live bestätigt werden.

**Nächster Nutzerschritt:** Die beiden r5-Dateien gemäß `sales-app/MANUELL-UEBERTRAGEN.md` vollständig in die gleichnamigen Apps-Script-Dateien übernehmen, speichern und die bestehende Bereitstellung auf **Neue Version** setzen. Danach in der Vorschau des schon vorhandenen Auftrags prüfen, ob `contact` gefüllt ist. Bei gefülltem Kontakt den Status „Fortsetzung vorbereitet“ einmal starten, das Ergebnis „Ansprechpartner angelegt · Abschluss offen“ abwarten und anschließend „Ansprechpartner prüfen und abschließen“ ausführen. Erst „Bestätigt“ und die HQ-/App-Kontrolle gelten als Abschluss. Falls `contact` leer ist, wird für diese Firma eine separate Kontaktanlage benötigt; keine zweite Firma als Ersatz anlegen. Keine neuen Skripteigenschaften, Manifest- oder Zugriffsänderungen für r5.

**Roadmap danach:** Zuerst diesen Schreibweg und eine neue eigene Testfirma vollständig prüfen, danach Änderungen und Kontakthistorie Firebase → HQ nur an eigenen Testfirmen validieren. Der Zugang für freigegebene weitere Google-Konten bleibt offen. Danach kommen die belastbare nächtliche HQ-/Firebase-Synchronisation, Magazinausgaben mit redaktionellen Ziel-/Terminwerten und Benachrichtigung, Magazinverkaufsfilter, Rollen und die späteren Produktabläufe. Die genannten späteren Punkte sind Wünsche bzw. Planung, noch nicht mit r5 implementiert. GitHub-Sicherung wird getrennt vom lokalen Stand und von der Live-Bereitstellung dokumentiert.

**Sicherung:** Die sieben zu diesem Schritt gehörenden Dateien wurden im lokalen Commit `0750a07` versioniert und erfolgreich nach `origin/main` auf GitHub übertragen. Andere vorhandene Arbeitsdateien wurden nicht in den Commit aufgenommen. Dieser Sicherungsnachtrag wird separat versioniert. Der Google-Apps-Script-Stand bleibt bis zur manuellen Übernahme durch den Nutzer unverändert.
