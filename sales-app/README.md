# Sales Markatus – Apps-Script-App

Stand: 02.10.2026 · **2026-10-02-r18** lokal implementiert. Bereitstellung und Prüfung am echten HQ-Bestand übernimmt der Nutzer. Vollständiger Erstimport noch offen.

## r18: Sammelimport, Änderungsabgleich und Hintergrundfortsetzung

Sechs HQ-Datenarten werden in gemeinsamen Seiten à 200 gelesen. Benötigte Felder werden in Firebase zwischengespeichert und anhand Firmen-/Projektkennungen zugeordnet; keine HQ-Einzelabfrage je Firma. Firestore batchGet/commit und 64 Zuordnungsgruppen reduzieren Einzelzugriffe. Große Nutzdaten behalten unveränderliche Teile. Kundenakten werden erst nach vollständig gelesenen Datenarten und erfolgreicher Aufbereitung veröffentlicht. Der Gesamtbestand wird gruppenweise aktualisiert, nicht als globale Transaktion.

Historien, Dokumente und Projekte erhalten getrennte updatedOn-Marken, mit zwei Minuten Überlappung und id-Fortsetzung statt verschiebbarer Seitenoffsets. Marken werden erst nach Verarbeitung und Mengenprüfung fortgeschrieben. Firmen und Kontakte werden wegen verschachtelter Adressen, Planumsätze wegen Schätzungen weiterhin gesammelt gelesen. Identische Inhalte lösen keine erneute Kundenveröffentlichung aus. Fehlendes Änderungsdatum oder abgelehnter Datumsfilter führt für die Datenart zur vollständigen Sammelprüfung. Beim nächsten manuellen Start nach sieben Tagen erfolgt ein Kontroll-Vollabgleich, ebenso nach Mengenabweichungen. Löschungen in Delta-Daten können bis dahin unentdeckt bleiben; Mengenprüfung allein erkennt Löschen plus Neuanlage gleicher Anzahl nicht. Gelöschte Firmen bleiben zur fachlichen Klärung in der bisherigen App-Ansicht erhalten.

Ein temporärer Apps-Script-Minuten-Trigger setzt ausschließlich den manuell gestarteten Lauf fort. Worker arbeiten etwa drei Minuten, prüfen Trigger-ID/Ausführungskonto/Adminfreigabe und speichern Abschnitte. Das ist kein Nachtplan. Pause kann auch bei belegtem Script-Lock angefordert werden. Bei Abschluss, Pause oder behandeltem Fehler wird der Trigger entfernt. Firmen- und Ansprechpartneranlage erfolgen in getrennten Trigger-Ausführungen. Unklare Schreibausgänge bleiben gesperrt. Browser-Schritt-RPCs treiben den neuen Lauf nicht an; die Oberfläche pollt nur den Firebase-Status.

Ein r16/r17-Lauf behält ID und Schreibhinweise. Ausstehende Leseaufgaben werden durch eine neue gemeinsame Lesebasis ersetzt; alte vollständige Akten bleiben nutzbar. Bereits durchlaufene Schreibaufgaben werden nicht erneut eingeplant. Vorbereitete Seiten werden vor Cache-Writes dauerhaft protokolliert; bei verlorenen Antworten wird dieselbe Seite mit denselben Zählern wiederholt.

Neue Quellen: SalesBulkStore.gs, SalesBulkSync.gs und SalesWorker.gs; alle werden in SalesBackend.gs eingebaut. Neue private Sammlungen: sales_rawcompanies, sales_rawcontacts, sales_rawhistories, sales_rawprojects, sales_rawdocuments, sales_rawplans, sales_projectviews. Nur benötigte Felder speichern, keine Rechnungspositionen oder Bankdaten ohne Verwendungszweck. Anonyme Zugriffe auf die neuen Sammlungen werden vor Verarbeitung geprüft.

**Einrichtung:** Beide Austauschdateien ersetzen, Scope `https://www.googleapis.com/auth/script.scriptapp` prüfen, einmal `setupSalesSyncWorker` im Editor ausführen, anschließend Neue Version bereitstellen. Interne Eigenschaften SALES_SYNC_EXECUTOR, SALES_SYNC_ADMIN, SALES_SYNC_TRIGGER und SALES_SYNC_PAUSE werden automatisch angelegt. Keine weiteren Zugangsdaten oder geänderten Firestore-Regeln. Details: [manuelle Anleitung](MANUELL-UEBERTRAGEN.md).

**Grenzen:** Eine Firebase-Gruppe ist auf 25.000 Datensätze pro Datenart begrenzt; darüber expliziter Stopp statt abgeschnittener Daten. Große Gruppen werden im Speicher zusammengeführt. Google-Kontingente, Firebase-Kosten und Browsergröße bleiben praktische Grenzen. Kein globaler HQ-Schnappschuss: spätere Änderungen werden im folgenden Lauf aufgeholt. Importjournale/alte Teile bleiben gespeichert; Bereinigung und Backupstrategie vor Teamfreigabe offen. Keine echte Laufzeit zugesagt.

**Zusätzliche Prüfung:** `node sales-app/test-sales-bulk.cjs` sowie `node sales-app/test-worker-browser.cjs`. Synthetischer Bestand mit 3.202 Firmen: 17 gemeinsame Firmenseiten plus Mengenabfrage, keine HQ-Einzelabfrage pro Firma. Abbruch, verlorene Firebase-Antwort, Kontaktwechsel, Adressänderung ohne Eltern-Zeitstempel, Delta, Löschung, Filterfehler, Triggerrechte und Verarbeitung bei geschlossenem Testbrowser geprüft. Kein echter HQ-/Firebase-Zugriff durch Codex.

Referenzen: [HQ-v2-Filter und Seitennavigation](https://developer.hellohq.io/), [Google installierbare Trigger](https://developers.google.com/apps-script/guides/triggers/installable), [Firestore commit](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/commit), [batchGet](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/batchGet), [runQuery](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/runQuery).

Die folgenden r16/r17-Abschnitte dokumentieren die bisherige Umsetzung. Angaben zum alten Einzelabruf, Browserbetrieb und vollständigen Neuladen wurden durch r18 oben ersetzt; Oberflächenfunktionen und TEST-Schreibgrenzen bleiben bestehen.

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
