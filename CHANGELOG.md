# Änderungsprotokoll

Neue Veröffentlichungen verwenden Git-Tags im Format `vMAJOR.MINOR.PATCH`. Frühere r-Versionen bleiben unverändert im [Projekttagebuch](docs/PROJEKTTAGEBUCH-UND-ROADMAP.md) dokumentiert.

## [Unveröffentlicht]

Keine neue Appfunktion in diesem Einrichtungsschritt. Die bekannten Aufgaben zu Verbrauch, Bestandsprüfung und Teamzugang bleiben offen.

## [v0.19.1] – 2026-10-16

### Vorhandenen Google-Stand nachvollziehbar zugeordnet

- Bestehende Apps-Script-Version 30 mit Appkennung `2026-10-06-r19.1` als Git-Basis erfasst; keine erneute Google-Veröffentlichung.
- Bereits vorhandene lokale Einstieg-/Manifeständerungen mit Google abgeglichen und separat gesichert: Sales-App als Standardansicht, Benchmark über `?view=benchmark`, Ausführung als Bereitsteller und Zugriff Nur ich.
- Projektüberblick, Versionszuordnung, zentrale Prüfungen und Veröffentlichungs-/Vergleichsbefehle ergänzt.
- Zugangsdaten und lokale Sicherungen/Testausgaben vom Git-Upload ausgeschlossen.
- Nutzerauftrag für künftige `clasp`-Veröffentlichungen in den Projektregeln festgehalten.

### Prüfung und Grenzen

Codevergleich aller sieben Dateien mit Google-Version 30 und Editorstand erfolgreich. Alle 13 lokalen Prüfsuiten einschließlich Syntax-, Logik- und Browserprüfungen bestanden; neun Vergleichs-/Schutzprüfungen decken unter anderem nachträgliche Google-Änderungen ab. Abschlussnachweis im Projekttagebuch. Der schreibende Ablauf wird erstmals beim nächsten echten Apprelease verwendet. Bestehende Roadmap und noch ausstehende Live-Funktionstests bleiben erhalten. Keine Skripteigenschaften, Scopes oder Bereitstellungseinstellungen bei Google geändert.
