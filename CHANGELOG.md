# Änderungsprotokoll

Neue Veröffentlichungen verwenden Git-Tags im Format `vMAJOR.MINOR.PATCH`. Frühere r-Versionen bleiben unverändert im [Projekttagebuch](docs/PROJEKTTAGEBUCH-UND-ROADMAP.md) dokumentiert.

## [Unveröffentlicht]

Dokumentation vom 18.10.2026: Testbestandteile T01–T09 und Produktivlücken L01–L14 anhand r21-Quellen sortiert, bestehende echte Lesefunktionen von Test-Schreibwegen und reinen Konzept-/Demofunktionen getrennt. Prioritäten und Abnahmekriterien für Teamzugang, echte Kundenarbeit und vollständigen Verkaufsablauf festgehalten; V1-Plan mit aktuellem Einstieg versehen. Kein Appumbau, keine Bereinigung oder Rechteänderung.

Die anschließende Freigabe für T01/T02/T03/T04/T06/T09 ist im folgenden r22-Abschnitt dokumentiert. D17 und D21 bleiben erhalten; D22 umfasst weiterhin nur eine lesende Inventur.

## [v0.24.0] – 2026-10-23

- Ansprechpartner und Projekte in der Kundenakte bis zu drei Einträge wie bisher; ab vier Einträgen eigener Scrollbereich mit Platz für drei Karten und fest darüber angeordneter Suche.
- Sofortiges Filtern während der Eingabe: Ansprechpartner nach Name, Position, E-Mail oder Telefon; Projekte nach Name oder Nummer. Treffermenge und leere Ergebnisse sichtbar. Keine zusätzlichen Server-/Datenbankzugriffe.
- Firmenadressen an das Ende von Allgemein verschoben; vorhandene Adressbearbeitung erhalten. Such-/Scrollzustand und Kommunikation bleiben bei einer Neudarstellung in derselben Sitzung erhalten.
- Gemeinsamer Listenbaustein für beide Bereiche und beide Kundentypen. Browserprüfung um Grenzfälle 0–4, Schrumpfen einer gefilterten Liste, getrenntes Scrollen, Kundenwechsel und Handy-Suche ergänzt; bestehende Kommunikations- und Kundenpflegeprüfungen erhalten.
- Keine neuen Script Properties, OAuth-Scopes, Trigger oder Bereitstellungseinstellungen. Fachliche Live-Abnahme gesondert offen.

## [v0.23.0] – 2026-10-22

- Feste Kommunikationserfassung rechts in jeder Kundenakte; Kundendaten links und Historie rechts scrollen unabhängig. Auf schmalen Bildschirmen Reiter, gleichwertige helle/dunkle Darstellung.
- Eine Erfassung „Gespräch / Notiz“ mit Firmen-Ansprechpartner, automatischer/änderbarer Zeit, Speichern und „Nicht erreicht“. Team-Vorauswahl nach jüngstem gültigem Gespräch. Kein Pflichtbetreff, keine Kontaktartauswahl, keine Wiedervorlage und kein E-Mail-Versand.
- Zusätzliche Ansprechpartner im kleinen Fenster anlegen: Vor-/Nachname Pflicht, Position/E-Mail/Telefone optional. Sofort in Firebase und Kundenansicht verwendbar; bestehender HQ-Abgleich verarbeitet Firmen, Kontakte und abhängige Kommunikation in dieser Reihenfolge.
- Stabile Speicherkennungen, Erhalt von Entwürfen, Import-unabhängiger Kundenbestand, geprüfte Firmen-/Kontaktbindung und gesperrte unklare HQ-Anlagen. Verlorene Kontaktantwort ohne ID ausschließlich durch manuell geprüfte ID-Zuordnung auflösen. Keine automatische Namensübernahme oder zweite Anlage.
- Gezielte Änderungsantworten statt Gesamtneuabrufen. Im synthetischen Modell drei Reads/zwei Writes je normaler Erfassung, identische bestätigte Wiederholung ohne Writes. Ein zusätzlicher gezielter Kommunikationsabruf pro frisch geladener Kundenakte; keinerlei Datenbankaufrufe für Tippen, Auswahl, Scrollen oder Uhr.
- Alle 20 Prüfsuiten erfolgreich, einschließlich elf neuer Backendfälle und der neuen Browserprüfung; ergänzende visuelle Prüfung von Desktop, Handy und heller Ansicht. Als Google-Version 34 unter derselben Dashboard-Adresse veröffentlicht; release:verify bestätigt feste Version, Editor und GitHub-Tag/main. Quellcommit 04fcfb4, Releasecommit/Tag 5386e22, Zuordnung in deployment.json. Anleitung: docs/KUNDENKOMMUNIKATION-R23.md. Keine neuen Script Properties, Scopes oder Bereitstellungseinstellungen. Fachliche Live-Abnahme offen.

## [v0.22.0] – 2026-10-18

- T01/T02: normale Firmenanlage ohne TEST-Präfix und ohne Testkategorie. Technische lokale Kennungen und Altaufträge bleiben kompatibel; erster Ansprechpartner bleibt Pflicht. Keine pauschale Umbenennung bestehender Daten.
- T03: Kommunikation für gespeicherte Bestandskunden; serverseitige Firmen-/Kontaktbindung, Autor, eindeutige Übertragungskennung und Wiederholsicherheit. Kein E-Mail-Versand.
- T04: dokumentierte Firmen-, Firmenart-/Nummern-, Adress- und Ansprechpartnerpflege anhand des öffentlichen HQ-v2-Schemas. Geänderte Felder als Firebase-Auftrag speichern und als kleine Änderungsantwort anzeigen; keine komplette Aktennachladung. Aktuelle unbeteiligte HQ-Felder erhalten, Konflikte und unklare Ausgänge prüfen. Offene lokale Änderungen überleben HQ-Importe. Projekte/Rechnungen bleiben lesbar; nicht dokumentiert schreibbare Beziehungen bleiben geschützt.
- T06: neue Anlagen ohne sichtbaren Testmarker. Verlorene Firmen-POST-Antwort ohne ID sperrt den Auftrag bis zur ausdrücklich manuell geprüften HQ-ID-Zuordnung; keine automatische Namensübernahme und keine zweite Firmenanlage. Alte offene markierte Aufträge bleiben sicher verarbeitbar; keine pauschale Löschung/Bereinigung echter Daten.
- T09: nicht versionierte lokale Demo, HTML-Wegweiser und Vorschau aus aktiver Ablage entfernt; nur ignorierte lokale Wiederherstellungskopie. README auf tatsächliche App umgestellt. Automatisierte synthetische Tests bleiben erhalten.
- T05/T07/T08 mit Grenzen und Bedienabnahme in docs/KUNDENPFLEGE-R22.md erklärt. Zusätzliche Kontakt-/Adressanlage, neue Zusatzfelddefinitionen und weitere Vertriebs-/Teamfunktionen bleiben offen.
- 18 Syntax-/Logik-/Browser-Prüfsuiten einschließlich zwölf neuer Produktivprüfungen erfolgreich, ebenso in sauberer Veröffentlichungskopie; keine Live-Kundendaten für diese Tests verändert. Als Google-Version 33 unter derselben Dashboard-URL veröffentlicht; release:verify bestätigt feste Version, Editor und GitHub-Tag/main auf gleichen Code. Quellcommit 034c23e, Releasecommit 5e0f656, Zuordnung in deployment.json. Keine neuen/geänderten Script Properties, Scopes oder Bereitstellungseinstellungen. Fachliche Live-Abnahme bleibt offen.

## [v0.21.0] – 2026-10-17

- D07: gemeinsame kompakte Magazinfilter (Namen, Kundennummern/-typen, Ort, Branche und Betreuer) und vorzeichenrichtige Umsatzsummen je Kunde/Ausgabe. Historienfilter behalten Vollständigkeitsprüfung und importierte Ausgabenhistorie; keine vollständigen Akten oder Beleglisten für die Recherche. Einmaliger Aufbau beim ersten Bedarf, Pflege in bestehenden Schreibwegen.
- D08/D09: keine automatische Fortschrittsabfrage mehr. „Fortschritt aktualisieren“ liest einen kompakten Status; dieser wird serverseitig ungefähr alle 15 Sekunden sowie bei Start, Pause und Abschluss gepflegt. Dauerhafte Wiederaufnahmepunkte bleiben unabhängig erhalten. Kein Vollabruf nach Sync-Abschluss; betroffene Sitzungsspeicher werden für folgende bewusste Navigation verworfen.
- D11: E-Mail-Freigaben aus der bestätigten Speicherantwort anzeigen, ohne App-Nachabruf. Rechteprüfung und Speicherung in Script Properties unverändert.
- D14: Kundenhistorie gezielt über Kunden-ID aktualisieren, vorhandene Akte einmal verwenden und aktualisierte Akte direkt zurückgeben. Vollständige Historie dieses Kunden und nötige Belegzuordnung bleiben erhalten; unvollständige/fremde HQ-Antworten ersetzen keinen Bestand.
- D20: keine Journale ohne Datensatzänderung, keine redundante Zwischenspeicherung vor Projektansichts-Commit, Wiederverwendung bereits gelesener Dokumente/Partitionen je Abschnitt und deduplizierte Sammelabrufe. Journale vor tatsächlichen Datenänderungen sowie sichere Wiederaufnahme und HQ-Schreibgrenzen bleiben erhalten. Fehler einer kompakten Statusveröffentlichung nach bereits dauerhaftem Abschluss reparieren den Status ohne erneute Geschäftsverarbeitung.
- D17/D21 wie beschlossen erhalten: unzugeordnete Inhalte nur bei Bedarf; höchstens zehn rotierende Einzelprüfungen je sechs HQ-Datenarten. Kein Nachtlauf eingerichtet.
- D22: reine Inventurfunktion unter Verwaltung; höchstens 50 Dokumente pro ausdrücklichem Klick, Mengen/Bytes/Zeitspannen und technische Speicherverweise. Keine Geschäftsinhalte in der Antwort, keine automatische Abfrage, keine Löschfunktion. Der echte Bestandsdurchlauf und die Wahl einer Aufbewahrungsregel bleiben gesonderte Schritte.
- Synthetische Budgets nach Aufbau: Magazinfilter 2 Reads/0 Writes; Freigaben 0/0; einzelne Kundenhistorie im Modell 5/1 einschließlich Aktenantwort; kompakter Status 1/0. Unveränderter Folgeabgleich mit 60 Einzelprüfungen: 136 Reads/144 Writes gegenüber 142/154 in r20. Erstaufbau der Magazinprojektionen im Modell 3.217 Reads/2 Writes; große Listen können weitere Speicherteile benötigen. Keine Live-Abrechnung oder Sekundenmessung.
- Alle 16 Syntax-/Logik-/Browser-Prüfsuiten einschließlich elf neuer Backendprüfungen bestanden. Als Google-Version 32 unter derselben Dashboard-URL veröffentlicht; feste Google-Version, Google-Editor und GitHub-Tag/main per release:verify gleichgesetzt. Keine neuen/geänderten Script Properties, OAuth-Scopes, Zugriffsgruppe oder Ausführungsidentität. Nachweis in deployment.json und Projekttagebuch; echte fachliche Live-Abnahme und Inventurdurchlauf bleiben offen.

### Vorbereitende Erläuterungen

Dokumentation vom 17.10.2026: konkrete Lösungsvorschläge und Prioritäten für D07/D08/D09/D11/D14/D17/D20/D21/D22 ergänzt; keine Appänderung oder Bereinigung. Stille HQ-Prüfungen vorerst beibehalten empfohlen; geringe Häufigkeit bedeutet entsprechend langsame Bestandsabdeckung.

Dokumentation vom 17.10.2026: bestehende gemeinsame Namensliste, einmalige Aufbaukosten und Vor-/Nachteile einer künftigen Pflege beim Nachtabgleich erläutert. Kein Nachtlauf eingerichtet, keine Appänderung.

Keine weiteren Appänderungen außerhalb des unten beschriebenen r20-Umfangs veröffentlicht. Die zurückgestellten Entscheidungen bleiben offen.

## [v0.20.0] – 2026-10-16

### Gezieltes Laden auf ausdrücklichen Klick

- Freigegeben umgesetzt: D01–D06, D10, D12, D13, D15, D16, D18 und D19. Kein Mein-Tag-Timer, keine automatische Versionsprüfung und keine zeitgesteuerte Aktualisierung von Arbeitsdaten; angezeigte Daten bleiben bis zu einer Bedienaktion unverändert.
- Kleiner Appstart mit Ausgabenübersicht; Kundennamen, Magazinfilter, Kontakte, Aufträge und Formularkataloge erst beim Öffnen der betreffenden Ansicht. Bereits geladene Ansichten und Akten bleiben pro Browsersitzung im Speicher; ausdrückliches Aktualisieren lädt die aktuelle Ansicht neu.
- Direkte Bestandsprüfung einer Kunden-ID und gezieltes Laden ihrer Akte/Kommunikationsaufträge. Neue Eingaben und geänderte Ausgaben werden als bestätigte Einzeländerungen zurückgegeben. Keine globale Nachladung nach diesen freigegebenen Speicheraktionen.
- Kompakte serverseitige Projektionen für Kundennamen, Ausgabenübersicht, Testfirmenzuordnung und Kommunikationsaufträge. Einmaliger Aufbau aus bestehenden Daten beim ersten entsprechenden Klick; anschließende Pflege bei passenden Einzel-/Sammelschreibvorgängen. Keine Nutzdatenlöschung oder zusätzlichen Nachttrigger.
- D19 speichert unverändert angehakte Zuordnungen nicht erneut; neue/geänderte Zuordnungen behalten ihre serverseitige Eindeutigkeits- und Sync-Prüfung.

### Ausdrücklich erhalten / erläutert

- D07: Such-/Filterbedienung unverändert. Einfache Kundensuche verwendet Namen/IDs und läuft beim Tippen lokal. Bestehende vollständige Magazin-/Ansprechpartnerfilter werden bei Bedarf separat geladen.
- D08: Statusabfrage eines manuell gestarteten laufenden Syncs weiterhin alle fünf Sekunden in Datenabgleich. D09: vollständiger Abruf bei dessen Abschluss weiterhin vorhanden. D11: Freigabenspeicherung samt anschließendem vollständigem Abruf erhalten. D14: bisheriger HQ-Historienimport erhalten; gemeinsame Aktenöffnung profitiert vom neuen Lesepfad. D17 sowie Geschäfts-/Checkpoint-/Einzelprüfungs-/Bereinigungsregeln D20–D22 unverändert.

### Prüfung / Grenze

Im künstlichen Modell nach Aufbau: Start 2 Reads statt 3.221; Namensliste 1 Read und 0 pro Tastendruck; normale Akte 4 Reads plus zugehörige Jobs/Teile statt 3.193. Browsernachweis für null Leerlaufabrufe auf Mein Tag, Wiederöffnung aus Sitzungsspeicher und gezielte Speicherrückmeldungen. Einmaliger Modellaufbau: Ausgabenübersicht 26 Reads/1 Write, Namensliste 3.193 Reads/1 Write, kleine Kunden-Zuordnungsindizes 8 Reads/2 Writes. Zusätzliche Projektionen brauchen gezielte Pflegewrites. Keine Zusage echter Sekundenwerte oder heutiger Abrechnung. Keine neuen/geänderten Script Properties, Scopes, Zugriffsgruppen oder Ausführungsidentität. Nach allen 15 Prüfsuiten als Google-Version 31 bereitgestellt; Codegleichheit mit GitHub-Tag v0.20.0 bestätigt und in deployment.json zugeordnet. Live-Abnahme bleibt gesondert.

### Vorangegangene Untersuchung und Entscheidungen

- Entscheidungsliste D01–D22 für sparsamere Ladewege ergänzt; Nutzer entscheidet vor der Umsetzung. Auswirkungen auf Aktualität, vollständige Suche und sichere Wiederaufnahme ausdrücklich festgehalten.

- Firebase-Verbrauch und Performance des bestehenden r19.1-Stands vollständig untersucht; Auslöser, Zeitabstände, Reads/Writes, Sync- und Speicherprobleme in `docs/FIREBASE-VERBRAUCH-UND-PERFORMANCE.md` festgehalten.
- Reproduzierbare Offline-Zählung mit künstlichen Daten über `npm run audit:firestore` ergänzt. Keine Firebase-/HQ-Liveabfragen, keine produktive Appänderung und keine neue Google-Version.
- Nutzeranforderung bestätigt: bessere Grundperformance und wesentlich weniger Firebase-Zugriffe haben Vorrang. Die vorgeschlagene Optimierungsfolge ist noch nicht umgesetzt; Bestandsprüfung und Teamtest bleiben offen.

## [v0.19.1] – 2026-10-16

### Vorhandenen Google-Stand nachvollziehbar zugeordnet

- Bestehende Apps-Script-Version 30 mit Appkennung `2026-10-06-r19.1` als Git-Basis erfasst; keine erneute Google-Veröffentlichung.
- Bereits vorhandene lokale Einstieg-/Manifeständerungen mit Google abgeglichen und separat gesichert: Sales-App als Standardansicht, Benchmark über `?view=benchmark`, Ausführung als Bereitsteller und Zugriff Nur ich.
- Projektüberblick, Versionszuordnung, zentrale Prüfungen und Veröffentlichungs-/Vergleichsbefehle ergänzt.
- Zugangsdaten und lokale Sicherungen/Testausgaben vom Git-Upload ausgeschlossen.
- Nutzerauftrag für künftige `clasp`-Veröffentlichungen in den Projektregeln festgehalten.

### Prüfung und Grenzen

Codevergleich aller sieben Dateien mit Google-Version 30 und Editorstand erfolgreich. Alle 13 lokalen Prüfsuiten einschließlich Syntax-, Logik- und Browserprüfungen bestanden; neun Vergleichs-/Schutzprüfungen decken unter anderem nachträgliche Google-Änderungen ab. Abschlussnachweis im Projekttagebuch. Der schreibende Ablauf wird erstmals beim nächsten echten Apprelease verwendet. Bestehende Roadmap und noch ausstehende Live-Funktionstests bleiben erhalten. Keine Skripteigenschaften, Scopes oder Bereitstellungseinstellungen bei Google geändert.

Veröffentlichungsnachweis für v0.20.0: Google-Version 31; 2026-10-16T15:26:15.416Z. Details in deployment.json.

Veröffentlichungsnachweis für v0.21.0: Google-Version 32; 2026-10-17T21:25:58.165Z. Details in deployment.json.

Veröffentlichungsnachweis für v0.22.0: Google-Version 33; 2026-10-18T13:07:26.832Z. Details in deployment.json.

Veröffentlichungsnachweis für v0.23.0: Google-Version 34; 2026-10-22T20:18:08.329Z. Details in deployment.json.
