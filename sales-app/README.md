# Sales Markatus – Apps-Script-App

Stand: 28.09.2026 · **2026-09-28-r14** lokal vorbereitet. Der Nutzer hat den bisherigen Lese- und Schreibweg der Kontakthistorie bestätigt. Der beauftragte V1-Ausbau der Chat-Punkte 1–3 ist jetzt implementiert; seine Bereitstellung und Live-Abnahme sind offen. Die gesamte V1 einschließlich Teamzugang, Buchungen und Wiedervorlagen ist damit noch nicht fertig.

## Aktuelle Funktionen

- Kommunikation: Notiz, E-Mail, Anruf, Meeting, Besuch mit passenden Eingabefeldern. Nur Anrufe haben Erreicht/Nicht erreicht; Anruf/Meeting/Besuch wählen einen Ansprechpartner dieser Firma. E-Mail dokumentiert Empfänger und Inhalt ohne Versand; Datum beim Speichern. Neue Aufgaben sind entfernt, historische HQ-Aufgaben bleiben sichtbar; awork ist zurückgestellt.
- Mehrere Magazine/Ausgaben über bewusste HQ-Projektsuche und bestätigte Zuordnung in der Verwaltung. Je Ausgabe Zielumsatz und Termine mit Versionsprüfung. Keine fest eingebaute neue aktuelle Verkaufsausgabe.
- Manueller HQ-Leseimport mit gespeichertem Fortschritt, Fortsetzung und Wiederholung fehlgeschlagener Abschnitte. Je Schritt eine Belegseite oder eine Firma einschließlich aller Kontakte, Historie und Projekte/Planumsätze. Keine HQ-Schreibaufrufe im V1-Import.
- Zentraler Kunden-/Interessentenbestand nach HQ-ID; auch gezielt ausgewählte Interessenten ohne Magazinrechnung. Gemeinsame Ansprechpartnerübersicht.
- Magazin-/Ausgabenwahl und kombinierbare Historien-, Branchen-, Orts- und Betreuerfilter. Fehlende Ausgaben werden als unbekannte Abdeckung angezeigt. Frühere Historie wird ausdrücklich auf die importierten Ausgaben begrenzt.
- Rechnungen/Gutschriften mit Netto-Beträgen. Belege über mehrere Ausgaben lassen sich in Firebase als ungeklärt ausschließen. Keine automatische Erkennung/Verteilung und keine Projekt-/Rechnungsschreibwege.
- Technische Einzeltests über Verwaltung; regulärer Datenabgleich in der Hauptnavigation. HQ-Schreibaufträge weiterhin einzeln mit Vorschau.

## Bestehende bestätigte Wege erhalten

Firma und erster Ansprechpartner werden zuerst in Firebase erfasst und sind dort sofort sichtbar. Der HQ-Abgleich erfolgt in zwei getrennten Schritten: Firma erstellen und bestätigen, dann Kontakt zur gespeicherten Firmen-ID erstellen und prüfen. Kontakt-E-Mail wird bei Bedarf in der zugehörigen HQ-Kontaktadresse ergänzt. Kein blindes Wiederholen unklarer Schreibversuche. Die Homepage berücksichtigt das Firmenfeld und passende Adressfelder; Eingaben wie test.de werden normalisiert. Der technische Wiederaufnahmemarker wird nach bestätigter Neuanlage bereinigt.

Kommunikation lässt sich bei einer eigenen Testfirma mit HQ-Firmen-ID direkt in Firebase erfassen. Erst beim separaten Schreibschritt werden Firma, ursprüngliche Personenbindung und gegebenenfalls der ausgewählte zusätzliche Ansprechpartner aus HQ zurückgeprüft. Echte Bestandskunden bleiben als Schreibziele gesperrt. Ein importierter Firmenname mit TEST genügt nicht zur Freigabe.

Kontakt-Historie einschließlich Rechnungsversand bleibt übersichtlich und aufklappbar. Texte werden aus erlaubten HTML-Elementen neu aufgebaut; Skripte, Ereignisattribute, eingebettete Inhalte und externe Bilder werden entfernt. Rechnungszuordnung erfolgt nur anhand eindeutiger vollständiger Rechnungsnummern desselben Kunden. Unsichere Zuordnungen werden angezeigt. Projekte zeigen Abschlussdatum oder Planumsätze mit Terminen, getrennt von fakturierten Summen.

## Grenzen und nächste Abnahme

- Live-Abnahme r14 nach [MANUELL-UEBERTRAGEN.md](MANUELL-UEBERTRAGEN.md). Nur die beiden erzeugten Dateien SalesBackend.gs und Sales.html ersetzen; keine neuen Eigenschaften oder Bereitstellungsrechte.
- Regelmäßige Aktualisierung des Dashboards liest Firebase, nicht HQ. HQ-Import nur nach bewusster Aktion. Kein Nachtlauf; kein Sammelschreiben offener HQ-Aufträge.
- „Vertreten“ heißt in den Historienfiltern positiver Netto-Rechnungsbetrag nach Gutschriften. Buchungen ohne Rechnung werden später angebunden.
- Bereitstellung zuletzt „Nur ich“. Der Google-Zugang für weitere Konten und Rollen bleiben offen; die App-Allowlist allein ersetzt diese Einrichtung nicht.
- Echte Kunden bearbeiten, neue Buchungen, Wiedervorlagen, Redaktionsübergabe, Gmail und awork bleiben eigene Roadmap-Schritte. Adressherkunft vorerst nur Firebase.
- Pro JSON-Datensatz gilt das bestehende Limit von 750 KB. Directory und Ausgabensnapshot sind noch jeweils ein Dokument. Sehr große Datenmengen benötigen eine weitere Aufteilung; ein Fehler wird angezeigt. Ein Firmendetailabschnitt hat das bisherige Zeitbudget von 210 Sekunden und ist nicht innerhalb einer Firma fortsetzbar. Ausgabeimporte sind seitenweise fortsetzbar (bis 50 Seiten à 200 Belege).
- Importseiten bleiben vorerst als Staging-Daten gespeichert; eine Aufbewahrungs-/Bereinigungsstrategie ist noch offen. Kein unbegrenzter Vollbestandsbetrieb zugesagt.
- GitHub sichert den Code, nicht Firebase-Daten. Datensicherung/Wiederherstellung für den Teambetrieb bleibt offen.

## Quellen und Build

- Sales.gs: bestehende Pilot-, Identitäts-, Firebase- und TEST-Schreibfunktionen.
- SalesV1.gs: ausdrücklich freigegebener V1-Leseumfang, Konfiguration, Importfortschritt und zentrale Übersichten.
- Sales.template.html, SalesV1.js und Sales.styles.css: Oberfläche und Gestaltung ohne Demodatensätze.
- build.cjs: erzeugt hq-benchmark/SalesBackend.gs aus beiden Serverquellen und hq-benchmark/Sales.html aus Template, V1-Oberfläche und CSS. Keine Abhängigkeit von der unversionierten Offline-Demo.

```powershell
node sales-app/build.cjs
node sales-app/test-sales.cjs
node sales-app/test-sales-v1.cjs
```

Browserprüfungen verwenden vorhandenes Playwright und eine Chromium/Edge-Installation. NODE_PATH kann auf dessen vorhandene Module zeigen; PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH wählt die ausführbare Datei. Keine Installation und kein Live-Zugang sind erforderlich.

```powershell
node sales-app/test-history-browser.cjs
node sales-app/test-v1-browser.cjs
```

101 Logikprüfungen, 13 V1-Prüfungen und drei Browser-Integrationsprüfungen mit ausschließlich synthetischen Daten bestanden. Geprüft: Zielschutz und Identität, Firmen-/Kontaktanlage, verlorene Antworten, Feldauswahl, Mail-Empfänger, Kontaktzugehörigkeit, Rich-Text-Sicherheit, eindeutige Projektzuordnung, Importseiten/Fortsetzung, unveränderter alter Snapshot bei Abruffehler, Fehlerwiederholung, Kundendeduplizierung, reine HQ-GET-Aufrufe, unbekannte Historienabdeckung und tatsächliche UI-Bedienung. Kein Nachweis der neuen Funktionen im echten Mandanten.

Firestore serverseitig über bestehendes Dienstkonto: sales_editions, sales_companies, sales_meta (Katalog, Directory, aktuelle Ausgabe und Importlauf), sales_imports (Importseiten), sales_drafts, sales_jobs. Bestehende Regeln sperren diese Sammlungen für Browserzugriff; keine Regeländerung. Browser-Lokalspeicher enthält nur das Farbschema.

HQ-Schema: [öffentliche v2-OpenAPI-Beschreibung](https://developer.hellohq.io/swagger20.json). Für diese Änderung wurde insbesondere das dokumentierte Empfängerfeld recipientEmailAddress in der lokal vorhandenen Schemafassung geprüft. Das ersetzt keinen Live-Test. Das alte Benchmark-Frontend bleibt über ?view=benchmark erreichbar.
