# Projektüberblick – Sales Markatus

Stand: 23.10.2026. Einstieg für neue Chats; ausführliche Historie und alle bisherigen Wünsche bleiben im [Projekttagebuch und in der Roadmap](docs/PROJEKTTAGEBUCH-UND-ROADMAP.md) erhalten.

## Auftrag und Produktstand

**Veröffentlicht am 23.10.2026 – r24/v0.24.0/Google-Version 35:** Ansprechpartner und Projekte links zeigen bis zu drei Karten ohne zusätzliche Bedienung. Ab vier Einträgen gibt es einen eigenen Scrollbereich für drei Karten und eine sofortige Suche im geladenen Bestand. Firmenadressen stehen unten in Allgemein. Gemeinsamer Listenbaustein, keine zusätzlichen Datenbankabrufe; Suchzustand, Listenpositionen und Kommunikationsentwürfe bleiben während der Sitzung erhalten. Alle 20 Prüfsuiten lokal und in sauberer Veröffentlichungskopie erfolgreich, einschließlich Grenzfällen 0–4, Filterrücknahme beim Schrumpfen und Handybedienung; Darstellung visuell geprüft. Quellcommit a075d91, Releasecommit/GitHub-Tag a7390e9. Bestehende Dashboard-Adresse erhalten; release:verify bestätigt feste Google-Version, Editor und GitHub-Tag/main mit gleichem Code. Originalprojekt auf den Veröffentlichungsnachweis übernommen. Keine neuen Script Properties, Scopes oder Bereitstellungseinstellungen. Fachliche Live-Abnahme offen. Bedienung: [KUNDENANSICHT-R24.md](docs/KUNDENANSICHT-R24.md).

**Veröffentlicht am 22.10.2026 – r23/v0.23.0/Google-Version 34:** Feste Kommunikationserfassung rechts in jeder Kundenakte, links die bisherigen Kundendaten; getrennte Scrollbereiche und mobile Reiter. Gespräch/Notiz mit Firmen-Ansprechpartner, Vorauswahl nach letztem gültigem Teamgespräch, veränderbarer aktueller Zeit und „Nicht erreicht“. Zusätzliche Kontaktanlage im Popup mit Vor-/Nachname als Pflichtangaben; direkt in Firebase nutzbar, kontrollierter HQ-Abgleich mit abhängigen Notizen. Atomare Speicherung, wiederholsichere Aufträge und erhaltene Entwürfe; keine Wiedervorlagen oder E-Mail-Anbindung. Alle 20 Prüfsuiten auch in sauberer Veröffentlichungskopie erfolgreich, darunter elf neue Backendfälle und die neue Browserprüfung; Desktop/Handy/helle Ansicht visuell geprüft. Quellcommit 04fcfb4, Releasecommit/GitHub-Tag 5386e22. Bestehende Dashboard-Adresse erhalten; release:verify bestätigt feste Google-Version, Editor und GitHub-Tag/main auf gleichen Code. Originalprojekt auf den Veröffentlichungsnachweis übernommen. Keine neuen Script Properties, Scopes oder Bereitstellungseinstellungen. Fachliche Live-Abnahme offen. Bedienung: [KUNDENKOMMUNIKATION-R23.md](docs/KUNDENKOMMUNIKATION-R23.md).

**Veröffentlicht am 18.10.2026 – r22/v0.22.0/Google-Version 33:** T01/T02/T03/T04/T06/T09 umgesetzt. Normale Firmennamen, keine fachliche Testkategorie, Kommunikation für Bestandskunden und dokumentierte Firmen-/Adress-/Ansprechpartnerpflege einschließlich Firmenarten. Nutzer hat den HQ-Schreibumfang ausdrücklich auf Firmen, Adressen und Ansprechpartner begrenzt; Projekte/Rechnungen bleiben lesbar. Neue Anlageaufträge ohne Testmarker, sichere Verarbeitung älterer Aufträge und manuelle geprüfte ID-Zuordnung bei verlorener Anlageantwort. Lokale Demo/Vorschau aus aktiver Ablage entfernt; synthetische Tests erhalten. T05 erster Ansprechpartner bleibt Pflicht; zusätzliche Kontaktanlage offen. T07/T08 vorerst erhalten, erklärt in [KUNDENPFLEGE-R22.md](docs/KUNDENPFLEGE-R22.md). Alle 18 Prüfsuiten einschließlich zwölf neuer Produktivprüfungen erfolgreich, auch in sauberer Veröffentlichungskopie. Quellcommit 034c23e, Releasecommit/GitHub-Tag 5e0f656. Bestehende Dashboard-URL erhalten; release:verify bestätigt feste Google-Version, Editor und GitHub-Tag/main mit gleichem Code. Originalprojekt auf den Release-Nachweis übernommen. Keine neuen Script Properties, Scopes oder Bereitstellungseinstellungen. Fachliche Live-Abnahme weiterhin offen.

Die folgenden Bestandsaufnahmen beschreiben den vorangegangenen Stand und bleiben als Entscheidungsverlauf erhalten.

**Bestandsaufnahme vom 18.10.2026:** Testbestandteile T01–T09, fehlende/unbestätigte Produktivbausteine L01–L14 und empfohlene Reihenfolge in [LIVE-BETRIEB-UND-TESTRESTE.md](docs/LIVE-BETRIEB-UND-TESTRESTE.md) sortiert. Echte Lesedaten sind bereits angebunden; produktive Kommunikation/Stammdatenpflege hängen noch an TEST-Firmen, Google-Zugriff steht auf MYSELF, Wiedervorlagen/Buchungserfassung/Redaktionsmeldung fehlen. Unterscheidung zwischen Recherchefreigabe, echter Kundenarbeit und vollständigem Verkaufsablauf. Reine Analyse, keine weitere Funktionsfreigabe oder neue Google-Version; R01–R13/N01–N10 erhalten.

**Aktueller Stand vom 17.10.2026:** Nutzer hat den Vorschlag aus Abschnitt 13 der Verbrauchsanalyse zur Umsetzung freigegeben: D07/D08/D09/D11/D14/D20 optimieren; D17 und D21 zunächst erhalten; D22 als Inventur vorbereiten, keine Löschung oder Nachtplanung. r21 (2026-10-17-r21, Git-Tag v0.21.0) nach allen 16 erfolgreichen Prüfsuiten als Google-Version 32 unter derselben Dashboard-URL veröffentlicht. Feste Google-Version, Google-Editor und GitHub-Tag/main auf gleichen Code geprüft. Quellcommit dc34481, Releasecommit 446750d; Zuordnung in deployment.json. Keine neuen/geänderten Script Properties oder Bereitstellungseinstellungen. Echte Bedienabnahme und Inventurdurchlauf bleiben offen; aktuell kein Browser für eine Liveprüfung verbunden. Frühere Vermerke „zurückgestellt/nicht freigegeben“ sind für den jetzt bestätigten Umfang historisch.

Interne Magazinvertriebs-App mit Google-Anmeldung, helloHQ und Firebase. Nutzer hat am 16.10.2026 die ausgewählten Ladeoptimierungen ausdrücklich beauftragt. r20 (`2026-10-16-r20`, Git-Tag `v0.20.0`) ist nach 15 erfolgreichen Prüfsuiten als Google-Version 31 unter derselben Dashboard-URL veröffentlicht. Feste Google-Version, Editorstand und GitHub-Tag erfolgreich auf Codegleichheit geprüft; Originalprojekt anschließend per Fast-Forward auf denselben Stand gebracht. Die zuvor vom Nutzer bestätigte Ausgabenverknüpfung bleibt erhalten. Echte r20-Bedienabnahme, vollständige fachliche Bestands-/Umsatzabnahme und Zehn-Personen-Test sind weiter offen.

## Neuer dauerhafter Auftrag vom 16.10.2026

- Code, Tests und Dokumentation lokal im Projektordner behalten.
- Diesen Überblick, `CHANGELOG.md` und das ausführliche Projekttagebuch fortführen.
- Vor Veröffentlichungen bauen und passende Syntax-, Logik- und Browserprüfungen ausführen.
- Mit `clasp push` hochladen und ausschließlich die vorhandene Bereitstellung aktualisieren.
- Code und Dokumentation gezielt nach GitHub sichern und veröffentlichte Stände taggen.
- Git-Tag, Apps-Script-Version und Bereitstellungs-ID in `deployment.json` zuordnen und den Codevergleich abschließen.
- API-Schlüssel in Script Properties belassen; Tokens, Anmeldedateien, echte Daten und lokale Ausgaben ausschließen.

Dieser Auftrag ersetzt den früheren manuellen Apps-Script-Upload durch den Nutzer. Reine Dokumentationsänderungen lösen keine Google-Veröffentlichung aus.

## Ablage und Zuständigkeiten

| Ablage | Zweck |
| --- | --- |
| `sales-app/` | Bearbeitbare Appquellen, Build und Appprüfungen |
| `hq-benchmark/` | Genau sieben nach Google übertragbare Dateien; Uploadliste in `.claspignore` |
| `firebase-pilot/` | Bestehender Firebase-Pilot, Regeln und dessen Tests; kein automatischer Firebase-Deploy |
| `scripts/` | Gemeinsame Prüfung, Veröffentlichung, Codevergleich und Tests des Ablaufs |
| `deployment.json` | Nicht geheime Projekt-/Bereitstellungszuordnung und veröffentlichter Codefingerabdruck |
| `CHANGELOG.md` | Änderungen je Git-Version; ältere r-Stände im Tagebuch |
| `docs/` | Anleitung, Fachkonzept, Entscheidungen, vollständige Roadmap |
| `.release/` | Ignorierte lokale Google-Sicherungen und Prüf-/Wiederaufnahmeprotokolle |

## Entscheidungen und Nachweise

- GitHub-Remote: `markatusGit/Sales-Markatus-WebApp`, Branch `main`.
- Nutzer hat die bestehende Dashboard-URL am 16.10.2026 bestätigt; feste Zuordnung in `deployment.json`.
- Bestehende Google-Version 30 und Google-Editor wurden lesend heruntergeladen. Alle sieben lokalen Apps-Script-Dateien stimmen überein. Zeilenenden und JSON-Formatierung werden beim Vergleich vereinheitlicht; tatsächliche Codeänderungen werden erkannt.
- Vorhandene Ausführung: `USER_DEPLOYING`; Zugriff: `MYSELF` (Nur ich). Das belegt keinen Teamzugang. App-Administrator, Bereitsteller und weitere Nutzer sind getrennte Rollen.
- Der bereits bei Google veröffentlichte Stand wird als erste nachvollziehbare Git-Basis `v0.19.1` erfasst. Die Nummer greift die bisherige Kennung r19.1 auf. Dabei entsteht keine neue Google-Version.
- Neue Releases benötigen einen vorbereiteten Changelog-Eintrag und einen eindeutigen Tag, beispielsweise anschließend `v0.19.2`. Automatisches Hochzählen gibt es nicht.
- Kein automatischer Nachtlauf und keine neue Hintergrundautomation eingerichtet.

## Erledigt in diesem Arbeitsschritt

Lokalen Veröffentlichungsablauf, feste Bereitstellungszuordnung, Prüfskript und Zugangsdaten-Ausschlüsse angelegt. Syntax, generierte Dateien und alle 13 Prüfsuiten einschließlich drei Browserdateien bestanden; neun Vergleichs-/Schutzprüfungen decken unter anderem nachträgliche Google-Änderungen ab. Die beiden bereits lokal vorhandenen Änderungen an `Code.gs` und `appsscript.json` sind separat mit der bestehenden Google-Version abgeglichen; sie bilden deren tatsächlichen Stand ab und wurden als Quellbasis im Commit `8ad78e7` gesichert. Weitere fremde lokale Änderungen bleiben getrennt.

Der neue schreibende Veröffentlichungsablauf wird bei der ersten tatsächlichen Appänderung zum ersten Mal gegen Google ausgeführt. Seine Schutz-/Vergleichsfunktionen werden lokal getestet; eine erfolgreiche Einrichtung ist keine Live-Abnahme der App.

**Abschluss bestätigt:** Einrichtung im Commit `9db8886` einschließlich Git-Tag `v0.19.1` erfolgreich nach GitHub übertragen. `release:verify` hat danach die feste Google-Version 30, den Google-Editor und den GitHub-Tag vollständig gleichgesetzt und die Zugehörigkeit zu `origin/main` bestätigt. Alle neun Vergleichs-/Schutzprüfungen bestanden. Google-Code/Bereitstellung unverändert; keine weitere Einrichtung durch den Nutzer nötig. Dieser Abschlussvermerk wird zusätzlich nach GitHub gesichert.

## Offene Punkte und spätere Wünsche

**Priorität vom 16.10.2026:** Nutzer meldet wiederkehrende Wartezeiten auf „Mein Tag“, 5–10 Sekunden beim Öffnen von Kunden und schnelle Überschreitung der Firebase-Tageslimits. Die detaillierte [Firebase-Verbrauchs- und Performanceanalyse](docs/FIREBASE-VERBRAUCH-UND-PERFORMANCE.md) ordnet sämtliche wesentlichen Bedien-/Timer-/Syncwege zu. Offline-Modell mit 3.189 Firmen/23 Ausgaben: Vollabruf 3.221 Reads, Kundenöffnung 3.193 Reads; „Mein Tag“ ruft alle 60 Sekunden vollständig ab. Weitere Befunde: Vollabrufe nach Speichern, Job-/Entwurfs-Gesamtlisten, wiederholte Verzeichnisprüfung, viele Sync-Statuswrites und keine Bereinigung alter App-Teilpakete/Importjournale. Alles mit künstlichen Daten nachgezählt; keine heutige Live-Abrechnung oder bestätigte Laufzeitmessung. Der verbindliche Wunsch ist bessere Grundperformance und geringerer Verbrauch. Vorgeschlagene erste Umsetzung: Minuten-Vollabruf beseitigen, Kundenakte gezielt lesen, nach Speichern nur Betroffenes nachladen; noch keine Appänderung umgesetzt.

- Ergebnis des nächsten HQ-Änderungsabgleichs und verbliebene Bestandsdifferenzen klären.
- Umsatz-/Kundenbestand anhand begrenzter Stichproben fachlich abnehmen.
- Firestore-Zugriffe für Start, Minutenabruf und Kundenöffnung reduzieren; zehn Personen einschließlich Schreibkonflikten prüfen.
- Danach persönlichen Google-Zugang, Wiedervorlagen/Stammdatenbearbeitung, Buchungen/Redaktionsübergabe und Teamtest fortsetzen.
- Alle Wünsche R01–R13 und N01–N10 sowie spätere Ergänzungen im Tagebuch erhalten; Gmail, awork, weitere Leistungen und Nachtlauf bleiben zurückgestellt.
- Sonstige vorgefundene lokale Änderungen und unversionierte Demos gehören nicht ungeprüft in eine Veröffentlichung. Sie bleiben lokal erhalten und müssen vor dem nächsten Apprelease getrennt eingeordnet werden.

## Nächster Schritt für den Nutzer

- Für r21 nach bestätigter Veröffentlichung die Bedienprüfung aus Abschnitt „r21 prüfen“ in docs/VEROEFFENTLICHEN.md verwenden; keine manuelle Dateiersetzung. Die folgenden r20-Schritte beschreiben die vorherige Veröffentlichung.
- Nach bestätigter Veröffentlichung die bestehende Dashboard-URL neu öffnen; Kennung 2026-10-16-r20 erwarten. Bei Abweichung die Kennung mitteilen.
- Kunden einmal öffnen; der erste Namensindex-Aufbau kann einmalig länger dauern und ungefähr einen Verzeichnisabruf kosten. Bei einem Kontingentfehler den Fehlertext melden, nicht wiederholt starten.
- Eine Kundenakte öffnen und über Zur Kundenliste dieselbe Akte erneut öffnen; Wiederöffnung ohne erneuten Ladeaufruf erwarten.
- Die Akte über Aus Firebase neu laden ausdrücklich aktualisieren; nur diese Akte wird neu gelesen.
- Über die zurückgestellten Punkte D08/D09/D11/D14/D17/D20–D22 nach der Erklärung im aktuellen Chat entscheiden; sie sind nicht pauschal mitoptimiert.

### Bestätigte Auswahl und Umsetzung vom 16.10.2026

Freigegeben: D01–D06, D10, D12, D13, D15, D16, D18, D19. D02 ausdrücklich ohne jeden Timer oder Änderungsstand für Arbeitsdaten; D05 ohne automatische Gültigkeits-/Versionsprüfung. Daten ändern sich durch bewusste Aktionen. Zurückgestellt: D07 in der Bedienung, D08/D09/D11/D14/D17/D20/D21/D22. D08 bleibt als ausdrückliche Ausnahme der Fortschritt eines manuell gestarteten Syncs; D09 bleibt dessen vollständiger Abschlussabruf. Namen/IDs reichen für die einfache Kundensuche, nicht für die bestehenden vollständigen Magazinfilter. Details und aktuelle Modellmengen stehen in Abschnitt 11 der Verbrauchsanalyse. Alle alten Aussagen „noch nicht ausgewählt/umgesetzt“ weiter oben bzw. im Tagebuch sind historische Zwischenstände, durch diese Auswahl abgelöst.

**Konzeptfrage vom 17.10.2026:** Eine gemeinsame Liste aus Kundennamen und IDs ist in r20 bereits vorhanden; rund 3.193 Modellreads betreffen den einmaligen Aufbau, danach normalerweise ein Read je Serverabruf. Vorschlag des Nutzers: Pflege beim künftigen nächtlichen HQ-Abgleich. Ein regelmäßiger Nachtlauf der Haupt-App ist weiterhin nicht eingerichtet oder mit dieser Frage beauftragt. Vor-/Nachteile und Abgrenzung zu D07/D20 in Abschnitt 12 der Verbrauchsanalyse festgehalten; keine Appänderung oder Live-Nutzdatenprüfung.

Bedienfolge, Fehlerfälle und Login-Hilfe: [Veröffentlichungsanleitung](docs/VEROEFFENTLICHEN.md).

**Lösungsvorschlag vom 17.10.2026:** Abschnitt 13 der Verbrauchsanalyse konkretisiert D07/D08/D09/D11/D14/D17/D20/D21/D22. Empfehlung: kompakte Magazinfilter, manuelle kleine Sync-Statusabfrage, keine Vollabrufe nach Sync/Freigaben; danach gezielter Historienimport und interne Sync-Optimierung mit sicherer Wiederaufnahme. Rotierende stille HQ-Prüfungen zunächst behalten; unzugeordnete Inhalte nur bei großer Menge aufteilen und technische Altbestände erst nach Inventur/Aufbewahrungsregel bereinigen. Vorschläge zur Auswahl, noch keine Umsetzung oder zusätzliche Freigabe; keine neuen Trigger.

Veröffentlichung v0.20.0: Apps-Script-Version 31, bestehende Bereitstellung beibehalten. Quellcommit d7c2ec5959f82bccbc832aeb45a3871898d4b0bb. Syntax-, Logik- und Browserprüfungen bestanden; Google-Codevergleich bestanden. GitHub-Sicherung/Tag werden anschließend ausgeführt und durch release:verify geprüft. Keine Skripteigenschaften oder Zugriffs-/Ausführungseinstellungen verändert. Live-Funktionstest offen. Zeitpunkt: 2026-10-16T15:26:15.416Z.

Veröffentlichung v0.21.0: Apps-Script-Version 32, bestehende Bereitstellung beibehalten. Quellcommit dc344812e003d8d8a5f0a08e2a3550b813beabc0. Syntax-, Logik- und Browserprüfungen bestanden; Google-Codevergleich bestanden. GitHub-Sicherung/Tag werden anschließend ausgeführt und durch release:verify geprüft. Keine Skripteigenschaften oder Zugriffs-/Ausführungseinstellungen verändert. Live-Funktionstest offen. Zeitpunkt: 2026-10-17T21:25:58.165Z.

Veröffentlichung v0.22.0: Apps-Script-Version 33, bestehende Bereitstellung beibehalten. Quellcommit 034c23e1e3e62e644a45810897699eb1c9ac1ddd. Syntax-, Logik- und Browserprüfungen bestanden; Google-Codevergleich bestanden. GitHub-Sicherung/Tag werden anschließend ausgeführt und durch release:verify geprüft. Keine Skripteigenschaften oder Zugriffs-/Ausführungseinstellungen verändert. Live-Funktionstest offen. Zeitpunkt: 2026-10-18T13:07:26.832Z.

Veröffentlichung v0.23.0: Apps-Script-Version 34, bestehende Bereitstellung beibehalten. Quellcommit 04fcfb4d882904eed0229cafafc628b241ade4a7. Syntax-, Logik- und Browserprüfungen bestanden; Google-Codevergleich bestanden. GitHub-Sicherung/Tag werden anschließend ausgeführt und durch release:verify geprüft. Keine Skripteigenschaften oder Zugriffs-/Ausführungseinstellungen verändert. Live-Funktionstest offen. Zeitpunkt: 2026-10-22T20:18:08.329Z.

Veröffentlichung v0.24.0: Apps-Script-Version 35, bestehende Bereitstellung beibehalten. Quellcommit a075d91637f2bdbab986ae0cf422058cd3ee740f. Syntax-, Logik- und Browserprüfungen bestanden; Google-Codevergleich bestanden. Die unmittelbare Bereitstellungskontrolle zeigte noch Version 34; eine spätere lesende Abfrage bestätigt Version 35. Wiederaufnahme nach erneutem Vergleich von fester Version, Editor, Quellen und Einstellungen; kein weiterer Upload und keine weitere Version. GitHub-Sicherung/Tag werden anschließend ausgeführt und durch release:verify geprüft. Keine Skripteigenschaften oder Zugriffs-/Ausführungseinstellungen verändert. Live-Funktionstest offen. Zeitpunkt: 2026-10-23T07:48:41.309Z.
