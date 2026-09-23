# Firebase-Pilot für die Vertriebsansicht

Dieser Pilot trennt den langsamen HQ-Gesamtabruf von der täglichen Bedienung:

1. `hq-benchmark/FirebaseSync.gs` liest HQ-Firmen und Belege und schreibt einen kompakten Datenstand nach Cloud Firestore. Erst nach allen Datenblöcken wird `pilot/current` auf den neuen Stand gesetzt.
2. `firebase-pilot/public/` ist eine kleine Firebase-Hosting-Seite. Nach Google-Anmeldung lädt sie den Datenstand frisch aus Firestore. Zeitraum, Name, Umsatzgrenzen, Sortierung und Seitenwechsel laufen danach lokal. Die Seite misst beide Schritte getrennt. Zwei PCs können gleichzeitig laden.

Enthalten sind nur HQ-Firmen-ID, Kundenname und täglicher Netto-Umsatz aus den bisher erkannten Rechnungen/Gutschriften. Belegdetails, Kontakte und Zugangsdaten werden nicht in Firestore abgelegt. Die Beleg-/Statuszuordnung ist der bisherige Teststand und **fachlich noch nicht mit bekannten Rechnungen und Gutschriften abgeglichen**.

## Einrichtung mit dem Nutzer

Die Reihenfolge und Bildschirmklicks stehen in [START-HIER.md](../docs/START-HIER.md#9-firebase-pilot-einrichten). Ohne Firebase-Projekt und Dienstkonto kann der Pilot lokal geprüft, aber noch nicht mit echten HQ-Daten geladen werden.

Konfiguration:

- Apps-Script-Skripteigenschaften: `FIREBASE_PROJECT_ID` und `FIREBASE_SERVICE_ACCOUNT_JSON` zusätzlich zum vorhandenen `HQ_API_TOKEN`.
- Web-Konfiguration: `public/config.example.js` nach `public/config.js` kopieren und die vier Werte aus den Firebase-Web-App-Einstellungen eintragen. `config.js` ist von Git ausgeschlossen; sie enthält keinen geheimen Schlüssel.
- Firestore-Regeln: `firebase-pilot/firestore.rules`. Browser lesen nur mit verifizierter Google-Anmeldung und einer UID in `pilot_access`; Browser dürfen nichts schreiben.
- Firebase CLI vom Repository-Stamm aus: `firebase login`, `firebase deploy --project PROJEKT_ID --only firestore:rules,hosting`.
- HQ-Abgleich im bestehenden Apps-Script-Projekt: `FirebaseSync.gs` hinzufügen, `appsscript.json` aktualisieren, einmal `syncFirebasePilot` ausführen. Nach erfolgreicher Prüfung optional einmal `installFirebasePilotNightlySync` ausführen.

Der Dienstkontoschlüssel gehört nur in Apps-Script-Skripteigenschaften. Nie in Chat, GitHub, Browser-Konfiguration oder Messprotokolle kopieren. Das Konto benötigt in Google Cloud die Rolle **Cloud Datastore User** für dieses Projekt.

Die bestehende HQ-Testseite enthält nun einen **Firebase-Vergleich**: nach Bereitstellung der Firestore-Regeln startet ein Button den einmaligen HQ-Abgleich, zeigt Dauer und Zähler und führt danach zur Firebase-Vertriebsansicht. Derselbe private `pilotSync_`-Ablauf kann später nachts per Trigger laufen. In der Testseite selbst wird keine Dienstkontoinformation ausgegeben.

Vor jedem Abgleich fragt das Script den aktiven Zeiger und einen Test-Datenblock **ohne Anmeldung** ab. Nur HTTP 401/403 gilt als gesperrt. Öffentlich lesbare, fehlende oder anders antwortende Pfade blockieren den HQ-Import. Zusätzlich die veröffentlichten Regeln in der Firebase-Konsole mit dem Regelsimulator prüfen; die automatische Probe ersetzt diese Prüfung nicht.

**Sicherheitsgrenze:** Aktuell bekommt jeder freigeschaltete Nutzer die gesamte Pilotliste mit Namen und Tagesumsätzen. Es gibt noch keine Rechte je Vertriebler oder Kunde und keine Telefonnummern im Datenbestand. Vor einer Erweiterung auf Kontaktdaten müssen diese Rechte und die benötigten Felder festgelegt werden. Firestore-Regeln begrenzen Browserzugriffe; das Dienstkonto mit IAM-Rolle kann sie umgehen und muss deshalb besonders geschützt sein.

Der HTML-Erstaufruf, die Firebase-Anmeldung und der Firestore-Abruf hängen von Netzwerk und Gerät ab. Die Seite misst „Bis zur Liste“ und „Firebase-Abruf“, kann aber vor dem echten Zwei-PC-Test keine Zielzeit garantieren. Ein Zeitraumwechsel ist nach dem Laden schnell, zeigt aber den zuletzt synchronisierten HQ-Stand.

Lokale Prüfungen: `node firebase-pilot/test-pilot.cjs` und die bisherigen drei `hq-benchmark/test-*.cjs` einzeln mit `node` ausführen.
