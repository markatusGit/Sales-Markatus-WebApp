# Änderungsprotokoll

Neue Veröffentlichungen verwenden Git-Tags im Format `vMAJOR.MINOR.PATCH`. Frühere r-Versionen bleiben unverändert im [Projekttagebuch](docs/PROJEKTTAGEBUCH-UND-ROADMAP.md) dokumentiert.

## [Unveröffentlicht]

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
