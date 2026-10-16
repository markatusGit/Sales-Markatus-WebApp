# Änderungsprotokoll

Neue Veröffentlichungen verwenden Git-Tags im Format `vMAJOR.MINOR.PATCH`. Frühere r-Versionen bleiben unverändert im [Projekttagebuch](docs/PROJEKTTAGEBUCH-UND-ROADMAP.md) dokumentiert.

## [Unveröffentlicht]

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
