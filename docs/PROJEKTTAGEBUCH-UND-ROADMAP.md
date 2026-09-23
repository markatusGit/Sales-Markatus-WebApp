# Projekttagebuch und Roadmap – Magazinvertrieb Markatus

Zuletzt aktualisiert: 23. September 2026.

## Zweck und Pflege

Dieses Dokument bewahrt den Arbeitsstand über längere Chats und mehrere Sitzungen hinweg. Neue Wünsche nach größeren Gesprächsabschnitten ergänzen; erledigte Punkte mit Ergebnis vermerken; Änderungen an Entscheidungen nachvollziehbar festhalten. Explizite Nutzerwünsche, Vorschläge und offene Entscheidungen auseinanderhalten. Bestehende Wünsche nicht kommentarlos streichen. Zugangsdaten und echte Kundeninhalte gehören nicht hierher.

Die Pflege erfolgt während der gemeinsamen Projektarbeit, besonders bei neuen Roadmap-Wünschen, wichtigen Entscheidungen und zum Abschluss größerer Schritte. Es ist keine zeitgesteuerte Hintergrundaufgabe eingerichtet.

## 1. Projekt in wenigen Sätzen

Die Agentur hat ungefähr 30 Mitarbeiter und verkauft Film-, Social-Media-, Marketing-, Online- und Werbetechnikleistungen. Hinzu kommen iTV Coburg und werbefinanzierte Magazine. helloHQ wird für Kunden, Rechnungen, Zeiterfassung und weitere kaufmännische Abläufe genutzt; awork für Projekte und Aufgaben.

Die geplante Sales-App soll für Vertriebler eine einfache, schnelle gemeinsame Arbeitsoberfläche schaffen. Kunden, Ansprechpartner, Gesprächsverlauf, Ausgaben und Verkäufe müssen miteinander verknüpft sein. Zunächst konzentrieren wir uns auf Magazine. Google Apps Script ist die bevorzugte Ausgangsbasis wegen Kosten und vorhandener Script-Erfahrung; die endgültige Datenhaltung ist noch nicht entschieden.

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

### Wichtige Funktionen für den ersten nutzbaren Stand

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
| Erweiterte Live-Testansicht für Kunden und Netto-Umsatz | [Revenue.gs](../hq-benchmark/Revenue.gs) und aktualisierte [Index.html](../hq-benchmark/Index.html) | Im echten HQ-Test wurde ein fehlender Belegstatus gemeldet; aktuelle Korrektur muss erneut in Google bereitgestellt und mit echten Belegen abgeglichen werden |
| Lokale Prüfungen des Testmoduls | Elf Benchmark- und zehn Umsatztests mit nachgebildeten Google-Diensten bestanden; Syntax und Manifest geprüft | Korrektur für fehlende Belegdaten und Feldzuordnung noch nicht real in HQ bestätigt |
| Verständliche Einrichtungshilfe | [START-HIER.md](START-HIER.md) | Erster HQ-Test eingerichtet; neue automatische Umsatzansicht muss noch als Version bereitgestellt werden |

## 6. Offene Entscheidungen und benötigte Angaben

1. API v2 ist als Ausgangspunkt bestätigt. Gültigen v2-Token direkt in Apps Script hinterlegen und den vorbereiteten Firmenabruf zunächst mit einer Anfrage prüfen. Nur bei Unklarheiten zur Anmeldung das vorhandene Script ohne Geheimnisse heranziehen.
2. Ein repräsentatives Magazinprojekt, zugehörige Rechnungspositionen und eine bisherige Excel-Liste untersuchen. Die im Konzept angenommene Zuordnung pro Ausgabe praktisch bestätigen.
3. Erster HQ-Lesetest ist ausgeführt. Als Nächstes repräsentative Kontakt-, Projekt- und Rechnungsabfragen sowie echte App-Abläufe messen. Noch keine Datenbankentscheidung.
4. Danach Architektur und realistische Zusatzkosten entscheiden: unmittelbare HQ-Lesezugriffe, Datenkopie oder Mischform.
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
