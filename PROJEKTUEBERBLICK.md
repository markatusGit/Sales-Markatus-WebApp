# Projektüberblick – Sales Markatus

Stand: 16.10.2026. Einstieg für neue Chats; ausführliche Historie und alle bisherigen Wünsche bleiben im [Projekttagebuch und in der Roadmap](docs/PROJEKTTAGEBUCH-UND-ROADMAP.md) erhalten.

## Auftrag und Produktstand

Interne Magazinvertriebs-App mit Google-Anmeldung, helloHQ und Firebase. Der zuletzt bestätigte Appstand heißt `2026-10-06-r19.1`. Ausgabenverknüpfung und Anzeige wurden vom Nutzer bestätigt. Die vollständige fachliche Prüfung von Bestand/Umsatz und der sparsame Betrieb mit zehn Personen sind offen. Die Erläuterung vom 07.10.2026 weist erhebliche unnötige Firestore-Lesezugriffe nach; deren Optimierung ist noch nicht implementiert.

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

- Die Entscheidungsliste D01–D22 in Abschnitt 10 des Analyseberichts bzw. der aktuellen Chatantwort lesen; sie trennt streichbare Vollabrufe, gezieltes Nachladen und Auswirkungen auf Aktualität/Bedienung.
- Die gewünschten Punkte anhand ihrer Kennungen auswählen; bei automatischer Aktualisierung, Kundenwiederöffnung, Suche und Fortschrittsanzeige die bevorzugte Variante nennen. Noch keine konkrete Auswahl oder Umsetzung beschlossen.
- Für diesen Diagnoseschritt keine App-Dateien übertragen und keinen zusätzlichen HQ-Sync als Test starten; der veröffentlichte Appstand bleibt unverändert.

Bedienfolge, Fehlerfälle und Login-Hilfe: [Veröffentlichungsanleitung](docs/VEROEFFENTLICHEN.md).
