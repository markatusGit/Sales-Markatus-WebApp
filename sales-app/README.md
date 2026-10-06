# Sales Markatus – Apps-Script-App

Stand: 06.10.2026 · **2026-10-06-r19** lokal vorbereitet. Der Nutzer hat den r18-Erstimport mit Mengenwarnung abgeschlossen. r19-Bereitstellung und Live-Prüfung stehen noch aus.

## r19: vorhandene Ausgangsbasis behalten

- Kein automatischer erneuter Vollimport nach sieben Tagen, Mengenabweichungen oder Filterfehlern. Ein Erstimport findet nur bei einer neuen Datenbank ohne Ausgangsbasis statt.
- Abgeschlossener r18-Lauf mit allen sechs gelesenen Datenarten wird bei fehlenden Metadaten anhand seiner gespeicherten Generationen und Startzeit übernommen. Keine rohen Datensätze werden dazu erneut geladen. Eine unvollständige Basis wird nicht als vollständig ausgegeben.
- Alle sechs Datenarten nutzen eigene Datumsfilter mit zwei Minuten Überlappung. Firmen zusätzlich mit Adress-Zeitstempeln. HQ-Filterablehnung/Filterverletzung pausiert ohne ungefilterten Ersatzabruf. Marken erst nach vollständig gelesenen und veröffentlichten Änderungen fortschreiben.
- Feste Cache-Generationen: Unveränderte Rohdaten bleiben unverändert. Nur betroffene Firmen und Projekte werden innerhalb ihrer Gruppen veröffentlicht. Gesamtzahlenabweichungen separat je Datenart melden; keine falsche Vollständigkeitszusage.
- Pro Datenart bis zu zehn bekannte Objekte reihum mit expand prüfen. Stille Adress-/Planänderungen werden damit verzögert, nicht garantiert im nächsten Lauf entdeckt. 404 bleibt Prüfhinweis, keine automatische Datenlöschung. Ein zeitnaher verlässlicher HQ-Ereignis-/Löschkanal ist noch offen.
- Kein erneuter Scan aller unzugeordneten Kontakte/Historien bei jedem Lauf. Nur betroffene Datensätze und vorhandene unzugeordnete Listen abgleichen. Eine neue Firma kann zuvor unzugeordnete Daten übernehmen.
- Alle Firmen/Kontakte sind unabhängig von Magazinen gespeichert; keine Filterung auf Rechnungskunden.

## Magazine aus dem Cache

**Auswahl speichern** hinterlegt zugeordnete Projekte. **Ausgaben aus Firebase verknüpfen** startet einen getrennten Hintergrundlauf ohne HQ-Abrufe/Schreibaufträge. Nur neue/markierte Ausgaben verarbeiten, Rechnungen je Projektgruppe einmal gemeinsam lesen. Kein Verändern der HQ-Änderungsmarken. Vorhandene Bestandswarnungen bleiben sichtbar. Neue HQ-Projekte müssen zunächst durch einen Änderungsabgleich in den Cache gelangen.

Synthetische Transportmessung: 60 Ausgaben mit 6.000 Rechnungen derselben Gruppe benötigen 6.060 Projekt-/Beleg-Dokumentreads, keine HQ-Aufrufe. Zusätzliche Metadaten, UI-Aufrufe und Speicherteile sind nicht enthalten. Keine Live-Verbrauchs- oder Laufzeitzusage.

## Übergabe und Grenzen

Nur **SalesBackend.gs** und **Sales.html** austauschen und neue Version bereitstellen. Neuer Quellbaustein **SalesDelta.gs** wird eingebaut, nicht separat hochgeladen. Gegenüber r18 keine neuen Skripteigenschaften, Berechtigungen, Regeln oder Zugriffsgruppen. Details und genaue Nutzeranleitung: [MANUELL-UEBERTRAGEN.md](MANUELL-UEBERTRAGEN.md).

Der temporäre Google-Trigger arbeitet weiter wie in r18; kein regelmäßiger Nachtstart. Unsichere App→HQ-Aufträge bleiben gesperrt, Firmen- und Kontaktanlage zeitlich getrennt und auf eigene TEST-Ziele begrenzt. Große Firebase-Gruppen bleiben auf 25.000 Datensätze je Datenart begrenzt. Importjournale/alte Speicherteile bleiben erhalten; Aufbewahrung, Backup und Kontingentanzeige sind offen. Unveränderte Abgleiche verbrauchen weiterhin Metadatenzugriffe und begrenzte Kontrollreads, keine pauschale Kostenfreiheit.

Tests: test-sales.cjs, test-sales-v1.cjs, test-sales-sync.cjs, test-sales-bulk.cjs, test-sales-delta.cjs sowie Browserprüfungen. [Offizielle HQ-Filterdokumentation](https://developer.hellohq.io/) und gespeichertes öffentliches HQ-Schema geprüft. Keine echten HQ-/Firebase-Mutationen durch Codex.

## Historische Implementierungsnotizen (durch r19 oben ersetzt)

Die nachfolgenden älteren Abschnitte dienen nur der Historie. Aussagen über vollständiges Neuladen oder alte Buttonnamen gelten nicht für r19.

## Korrektur r17

Live-Rückmeldung: lange Firmenerfassung, 0 vollständige Akten und keine erkennbare Seitenzahl; Anhalten war nur browserlokal. Die erste Erfassung schreibt jetzt eine vorläufige Übersichtsseite für je 50 Firmen unter sales_directory/discovery-<offset>, ohne einzelne Verzeichniseinträge oder die Legacy-Datei pro Firma zu lesen. Neue Seiten werden dedupliziert mit individuellen/alten Einträgen gelesen; vollständige Einträge einschließlich Kontakte und loadedAt haben Vorrang. Kein Löschen alter Daten. Am Ende der Erfassung kein erneutes Laden sämtlicher Rohseiten; doppelte IDs werden gegen die schon gespeicherten Firmenkennungen geprüft. Folgeaufträge werden mit einem Set ohne quadratische Suche ergänzt.

Bestehender r16-Lauf behält ID, Cursor, Revision, Seitenoffset, bisherige Firmen-IDs, Fehler und Aufgaben. Keine Migration nötig. Fortschritt zeigt erfasste Firmen, HQ-Gesamtzahl und Seiten getrennt von vollständigen Kundenakten. Pause wird unter demselben Lauf als paused gespeichert und blockiert weitere Schrittaufrufe; Fortsetzen hebt sie ausdrücklich auf und erhöht die Revision. Interner Zustand running bleibt für bestehende Konfigurationssperren erhalten. Oberfläche: Läuft in diesem Fenster / Anhalten angefordert / Angehalten. Nach bloßem Wiederöffnen eines alten oder nicht explizit pausierten Laufs: Hier nicht aktiv, ohne globalen Stillstand zu behaupten.

Nachweis mit 3.202 synthetischen Firmen: 65 Directory-Seitenwrites, keine individuellen Directory-/Legacy-Lesezugriffe während discovery; 196 kleine physische Writes einschließlich Rohseiten und Laufzustand im Test. Kein gemessener Live-Zeitfaktor. Alte Schreibfehler bleiben zur separaten Klärung erhalten. Späterer Detailimport und bisherige Grenzen bleiben bestehen.

## Datenabgleich

- **HQ synchronisieren** ist die gemeinsame reguläre Aktion. Firebase-Aufträge zuerst: Firmen anlegen und zurücklesen, anschließend Ansprechpartner in getrennten Aufrufen, danach weitere gespeicherte Änderungen. Anschließend HQ → Firebase lesen. Firmen- und Kontakt-ID bleiben serverseitig gebunden; bestätigte Aufträge werden nicht erneut angelegt.
- Bestehende TEST-Zielprüfung bleibt wirksam. Der Sammellauf nimmt nur gespeicherte Aufträge mit eigenem serverseitigem Testentwurf, TEST-Namen und erlaubter Auftragsart an. Zielbindung und exakte Schreibpfade prüft zusätzlich der bisherige zentrale Writer. Reale Importfirmen sowie Projekte/Rechnungen sind keine Schreibziele. Unklare/running/conflicted Aufträge werden angezeigt, nicht automatisch wiederholt; Rückprüfung und Konfliktentscheidung bleiben verfügbar.
- Alle über die HQ-API verfügbaren Unternehmen, Kontakte und Kontakthistorien werden unabhängig von Magazinbuchungen gelesen. Firmenimport in Abschnitten: Stammdaten, Kontakte, Belege, Projekte, Historie, einzelne Projektbelege/-Planumsätze und historische Textzuordnung. Listen seitenweise à 50, Ausgabenbelege wie bisher à 200.
- Nur bewusst zugeordnete, ausgewählte HQ-Projekte werden als Magazinausgaben ausgewertet. **Auswahl für HQ-Sync speichern** ändert Firebase-Konfiguration, startet keinen Import. Abwählen beendet künftige Aktualisierung, löscht keine historischen Daten. Bisherige Zuordnungen bleiben beim Umstieg ausgewählt; andere Suchergebnisse werden beim Speichern nicht abgewählt.
- Fortschritt und Seiten serverseitig gespeichert. **HQ-Sync fortsetzen** benutzt denselben Lauf; alte Revisionen führen keinen weiteren Abschnitt aus. Innerhalb einer Firma fortsetzbar. Fehler bleiben sichtbar; der nächste neue Lauf liest erneut vollständig.
- Abschlusszahlen vergleichen geladene Firmen/Kontakte/Historie mit HQ-Gesamtzahlen. Je Ausgabe: Belegstatus, erwartete Firmen und vollständig geladene Firmenkennungen. Unvollständigkeit gilt nicht als erfolgreicher Gesamtimport. Mengenprüfung ersetzt keinen fachlichen Beleg-/Feldvergleich.
- Globale Kontakt-/Historienlisten werden zusätzlich nach Datensätzen ohne importierbare Firmenzuordnung durchsucht. Diese bleiben separat in Firebase und über **Ohne Firmenzuordnung ansehen** sichtbar. Keine erfundene Zuordnung.
- Gewöhnliche Ansichten und neue Eingaben arbeiten mit Firebase. HQ-Zugriffe beim manuellen Sync, bei expliziter administrativer Suche oder diagnostischer Rückprüfung. Im Lauf neu angelegte Aufträge kommen beim nächsten neuen Sync dran. Kein Nachtlauf.

## Große Daten und Migration

Die alte Fehlermeldung nannte eine Firmenkennung, keine Anzahl. Sowohl eine komplette Kundenakte als auch das zentrale Verzeichnis konnten das Paketlimit erreichen; aus dem Fehler allein lässt sich das betroffene Paket nicht unterscheiden.

SalesStorage.gs liest alte Datensätze unverändert. Größere JSON-Werte bekommen unveränderliche Teilpakete in sales_chunks; der Wurzelverweis wird erst nach allen erfolgreichen Teilwrites ersetzt. Leser prüfen Quelle, Reihenfolge, Teile und Gesamtlänge. Teilwrite-Abbruch ersetzt keinen vorherigen vollständigen Snapshot. Maximal 2.000 Teile à 100.000 UTF-16-Codeeinheiten; keine Zusage unbegrenzter Datenmengen.

Vollständige Firmenübersichten liegen unter sales_directory pro HQ-ID; vorläufige Erfassungsseiten enthalten dort mehrere Firmen gemeinsam. Das alte sales_meta/directory wird lesend mit neuen Einträgen zusammengeführt; neuer Datensatz gewinnt. Keine manuelle Migration oder Löschung. Große Ausgaben und Importzustände werden ebenfalls aufgeteilt. Importseiten und alte/abgebrochene Teilgenerationen bleiben vorerst gespeichert. Aufbewahrung, Speicherbudget und Firebase-Backup vor Teamfreigabe festlegen.

## Oberfläche und vorhandene Funktionen

- **Kunden**: alphabetische Namensliste, Namenssuche und Kundenkarte. Keine Magazin-/Umsatz-/Historienfilter in dieser Liste.
- **Magazinverkauf**: Magazin und Ausgabe auswählen; bestehende Historien-/Branchen-/Orts-/Betreuerfilter vorerst erhalten. Zusätzliche vorgefertigte Ansichten und Filterregeln noch gemeinsam definieren.
- Gemeinsame Ansprechpartnerübersicht; Firma und erster Kontakt nach Anlage sofort in Firebase sichtbar.
- Je Ausgabe Zielumsatz, Anzeigenschluss, Drucktermin und Veröffentlichung mit Versionsprüfung und Dashboard-Hinweis.
- Kommunikation: Notiz, E-Mail, Anruf, Meeting, Besuch mit passenden Feldern. E-Mail erfasst Empfänger ohne Versand; Anruf mit Erreicht/Nicht erreicht. Neue Aufgaben entfernt, alte HQ-Aufgaben lesbar; awork später.
- Homepage normalisiert; Testmarkierung nach bestätigter Anlage bereinigt. Ansprechpartner-E-Mail über zugehörige HQ-Kontaktadresse übertragen und rückgeprüft.
- Historie sicher formatiert: Skripte, Ereignisattribute, eingebettete Inhalte und externe Bilder entfernt. Rechnungsversand kurz, Details aufklappbar; nur eindeutiger Belegbezug desselben Kunden wird zugeordnet.
- Projekte zeigen Abschlussdatum oder echte HQ-Planumsätze mit Terminen, getrennt von Rechnungsumsätzen. Nur Lesen.
- Historische Teilnahme: positive Netto-Rechnungen nach Gutschriften. Fehlende/unklare Ausgabe bedeutet unbekannte Abdeckung. Mehrfachausgabenbelege manuell als ungeklärt markierbar; automatische Aufteilung und App-Buchungen ohne Rechnung noch offen.

## Übergabe und Grenzen

Nur [SalesBackend.gs](../hq-benchmark/SalesBackend.gs) und [Sales.html](../hq-benchmark/Sales.html) vollständig ersetzen, dann bestehende Bereitstellung auf Neue Version setzen. [Anleitung](MANUELL-UEBERTRAGEN.md). Keine neuen/geänderten Eigenschaften, Manifestwerte, Firestore-Regeln oder Zugriffsrechte. Bereitsteller, App-Administrator und weitere Konten bleiben getrennt.

Gesamtimport noch nicht gegen den gesamten realen Mandanten geprüft. HQ-Token muss vollständiges Lesen erlauben. Finale Zusammenführung großer Firmen und Gesamtübersicht erfolgen weiterhin im Arbeitsspeicher; Laufzeit, Kontingente und Browsergröße bleiben praktische Grenzen. Ausgabe maximal 50 Seiten à 200 Belege; Firebase-Auflistung maximal 1.000 Seiten à 100 Dokumente, danach expliziter Fehler. Gelöschte HQ-Firmen werden nicht automatisch aus alten App-Daten gelöscht; Archivierungs-/Löschregeln offen. Abschlusszahlen beziehen sich ausdrücklich auf den aktuellen Lauf.

Bereitstellung zuletzt **Nur ich**. Nächste Nutzerfolge: 4 Google-Zugang, 5 Gespräche/Wiedervorlagen/Stammdatenbearbeitung, 6 Buchungen/Redaktionsübergabe, 7 Teamtest einer aktuellen Ausgabe. Adressherkunft vorerst Firebase; Gmail, awork, Nachtlauf, HQ-Planumsatzerzeugung und weitere Roadmap-Wünsche bleiben zurückgestellt.

## Quellen und Prüfung

- Sales.gs: Identität, Firebase und bestehende TEST-Schreibwege.
- SalesStorage.gs: abwärtskompatible Teilpakete.
- SalesV1.gs: Konfiguration, Übersichten, Ausgabenauswertung; alte Import-RPCs bleiben kompatibel, keine regulären UI-Aktionen mehr. Ein alter Lauf wird vom Gesamtsync abgelöst und kann parallel nicht neu gestartet werden.
- SalesSync.gs: gespeicherte Warteschlange, Gesamtimport, Zuordnungs-/Mengenprüfung.
- Sales.template.html, SalesV1.js, SalesProjects.js, Sales.styles.css: Oberfläche ohne Demodaten.
- build.cjs: beide Austauschdateien aus diesen Quellen, keine Abhängigkeit von Offline-Demos.

Prüfbefehle: node sales-app/build.cjs; node sales-app/test-sales.cjs; node sales-app/test-sales-v1.cjs; node sales-app/test-sales-sync.cjs. Browser: node sales-app/test-history-browser.cjs und node sales-app/test-v1-browser.cjs mit vorhandenem Playwright/Edge. NODE_PATH bei Bedarf auf vorhandene Module, PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH auf Edge setzen.

101 bestehende, 15 V1- und 17 Speicher-/Sync-Prüfungen sowie drei Browser-Integrationsprüfungen mit synthetischen Daten bestanden. Geprüft: große Unicode-Daten, mehrseitige Firmen/Kontakte/Historie, Teilwrite-Abbruch, alte vollständige Daten erhalten, Wiederaufnahme, Firmen-/Kontakt-Reihenfolge, verlorene Schreibantwort ohne doppeltes POST, TEST-Ziele, Rechte, Vollständigkeit, alte Directory-Migration und Sperre paralleler Altimporte. Keine echten HQ-/Firebase-Daten angefasst; kein Apps-Script-Upload durch Codex.

Dienstkonto verwendet sales_editions, sales_companies, sales_directory, sales_chunks, sales_meta, sales_imports, sales_drafts und sales_jobs. Bestehende Firestore-Regeln sperren direkten Browserzugriff; Privatheitsprüfung umfasst neue Sammlungen. Browser-Lokalspeicher enthält nur das Farbschema. GitHub sichert Code, keine Firebase-Daten.

HQ-Referenz: [v2-Schema](https://developer.hellohq.io/swagger20.json), lokal vorhandene Fassung für $filter/$top/$skip/orderby und DefaultAddress-/Estimations-Erweiterungen geprüft; [HQ-Guide](https://developer.hellohq.io/) für substringof. Kein Ersatz für Mandantenabnahme. Benchmark bleibt über ?view=benchmark erreichbar.
