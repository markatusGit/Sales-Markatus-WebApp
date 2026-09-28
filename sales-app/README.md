# Sales Markatus – Apps-Script-App

Stand: 28.09.2026 · **2026-09-28-r16** lokal implementiert und synthetisch geprüft. Der Nutzer bestätigt den bisherigen Firmen-/Kontakt-/Kommunikationsweg. Beim r15-Ausgabeimport trat das 750-KB-Paketlimit auf; Vollständigkeit des realen Bestands ist noch nicht bestätigt. r16 erweitert auf den ausdrücklich beauftragten Gesamtimport und einen gemeinsamen manuellen HQ-Sync. Live-Abnahme und Bereitstellung übernimmt der Nutzer.

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

Die Firmenübersicht liegt jetzt unter sales_directory pro HQ-ID. Das alte sales_meta/directory wird lesend mit neuen Einträgen zusammengeführt; neuer Datensatz gewinnt. Keine manuelle Migration oder Löschung. Große Ausgaben und Importzustände werden ebenfalls aufgeteilt. Importseiten und alte/abgebrochene Teilgenerationen bleiben vorerst gespeichert. Aufbewahrung, Speicherbudget und Firebase-Backup vor Teamfreigabe festlegen.

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

101 bestehende, 15 V1- und 12 Speicher-/Sync-Prüfungen sowie drei Browser-Integrationsprüfungen mit synthetischen Daten bestanden. Geprüft: große Unicode-Daten, mehrseitige Firmen/Kontakte/Historie, Teilwrite-Abbruch, alte vollständige Daten erhalten, Wiederaufnahme, Firmen-/Kontakt-Reihenfolge, verlorene Schreibantwort ohne doppeltes POST, TEST-Ziele, Rechte, Vollständigkeit, alte Directory-Migration und Sperre paralleler Altimporte. Keine echten HQ-/Firebase-Daten angefasst; kein Apps-Script-Upload durch Codex.

Dienstkonto verwendet sales_editions, sales_companies, sales_directory, sales_chunks, sales_meta, sales_imports, sales_drafts und sales_jobs. Bestehende Firestore-Regeln sperren direkten Browserzugriff; Privatheitsprüfung umfasst neue Sammlungen. Browser-Lokalspeicher enthält nur das Farbschema. GitHub sichert Code, keine Firebase-Daten.

HQ-Referenz: [v2-Schema](https://developer.hellohq.io/swagger20.json), lokal vorhandene Fassung für $filter/$top/$skip/orderby und DefaultAddress-/Estimations-Erweiterungen geprüft; [HQ-Guide](https://developer.hellohq.io/) für substringof. Kein Ersatz für Mandantenabnahme. Benchmark bleibt über ?view=benchmark erreichbar.
