# Benutzerzugang und Rechte – r26

Stand: 23.10.2026, in Arbeit. Privater Einrichtungsstand r26/v0.26.0 als Google-Version 37 veröffentlicht und mit Editor/GitHub-Tag verglichen. Neuer Login noch nicht aktiviert.

**Korrektur r26.1 in Vorbereitung:** Nutzer meldet „Anmeldung abgebrochen“ beim Google-Pop-up. Google wird jetzt im vorhandenen Anmeldefenster direkt weitergeleitet. Fenster unter `https://sales-markatus.firebaseapp.com/auth/`, identisch zur Firebase-Auth-Domain, ohne zusätzlichen Google-Popup und ohne Abhängigkeit von fremdem Browser-Speicher. Nur Anfragekontext wird höchstens fünf Minuten in Session Storage aufbewahrt und nach Rückkehr entfernt. Firebase nutzt weiterhin inMemoryPersistence; keine eigene Speicherung von Zugangstokens. Der lokale Browsertest durchläuft die Weiterleitung einschließlich Neuladen. Echte Google-Bestätigung weiterhin nötig. Die frühere web.app-Adresse ist historisch.

## Auftrag

Einzelne E-Mail-Adressen einladen, einschließlich Gmail und anderer Domains. Google-Anmeldung oder persönliches Passwort; bestätigte E-Mail vor jedem Geschäftsdatenzugriff. Freigegebene Benutzer teilen denselben Kundenbestand. Basis: Mein Tag und Kunden einschließlich Ansprechpartner/Kommunikation lesen. Weitere Bereiche und Hinzufügen/Ändern einzeln per Häkchen; Löschen bleibt gesperrt. Benutzerverwaltung nur durch den bisherigen Administrator. Einladungslink manuell weitergeben, 48 Stunden gültig, einmalig und an die exakte bestätigte E-Mail gebunden. Neue Einladung ersetzt eine ältere offene Einladung derselben Adresse.

## Kostenloser Betrieb

Der Nutzer beauftragt ausdrücklich die Einrichtung ohne Abrechnungskonto. Projekt `sales-markatus` bleibt Spark. Cloud Run/Cloud Functions werden nicht eingerichtet. Das statische Anmeldefenster unter `https://sales-markatus.web.app/auth/` nutzt Firebase Authentication; Apps Script prüft die Identität und verarbeitet Geschäftsdaten. `sales.markatus.de` bleibt eine Weiterleitung. Unter 50.000 Nutzern ist keine Garantie für alle kostenlosen Kontingente: Firestore, Hosting, Authentifizierungs-E-Mails und Apps Script haben eigene Grenzen. Bei Erschöpfung können Funktionen ausfallen; kein automatisches kostenpflichtiges Upgrade.

## Schutz

- Öffentliches HTML enthält keine Geschäftsdaten. Ein zentraler Server-Gateway erlaubt nur ausdrücklich registrierte Aktionen mit passenden Rechten. Alte direkte Serveraufrufe sind im neuen Modus gesperrt.
- Google validiert das genaue ID-Token über `accounts:lookup`. Erst danach prüft Apps Script Projekt, Aussteller, Ablauf, E-Mail-Bestätigung, UID, Sperre und Widerrufszeit. Bloßes Dekodieren authentifiziert niemanden.
- Jeder Aufruf liest die aktuelle Benutzerfreigabe. Rechteänderungen/Sperren widerrufen vorhandene App-Sitzungen. Atomare Geschäftsdaten-Schreibvorgänge prüfen zusätzlich die aktuelle Freigaberevision.
- Browser-Sitzungskennung nur im Arbeitsspeicher. ID-/Refresh-Tokens ausschließlich in geschützten serverseitigen Sitzungsdokumenten; keine Tokens in URLs, Browserpersistenz oder Logs.
- Exakte Ursprungsfreigabe, Fensterquelle, Zufallszustand, PKCE und fünf Minuten Gültigkeit schützen die Übergabe aus dem separaten Anmeldefenster. Keine Wildcard für Nachrichten.
- Finanz-/Projektinformationen werden auch aus Kundenakten und anderen Serverantworten entfernt, wenn die Bereichsfreigabe fehlt. Leserechte erlauben keine Schreibaktion, Hinzufügen keine Änderung vorhandener Daten.
- Vor jedem HQ-Schreibzugriff werden aktuelle Rechte des ursprünglichen Autors geprüft. Nicht eindeutig zuordenbare alte Aufträge bleiben für die Administratorprüfung gesperrt. Bestehende Trigger-/Ausführungskontoprüfung schützt private Hintergrundfortsetzungen.

Sammlungen: `sales_authusers`, `sales_authsessions`, `sales_authattempts`, `sales_authinvites`, `sales_authemails`, `sales_authaudit`. Die neue Firestore-Regel verweigert alle direkten Browserzugriffe, einschließlich früherer pilot_access-Freigaben. Der alte Firebase-Browserpilot erhält damit keine Lesedaten mehr; die aktuelle Apps-Script-App nutzt ihren geschützten Serverzugang. Dienstkontozugang bleibt serverseitig. Abgelaufene Dokumente sind wirkungslos; begrenzte Aufbewahrungs-/Bereinigungsroutine noch offen. Keine automatische Löschung oder Nachtplanung.

## Rechte und Grenzen

Zusätzlich zur festen Lesebasis: Magazinverkauf, globales Ansprechpartnerverzeichnis, Finanzen, Kundenprojekte, Datenabgleich lesen/ausführen, fachliche Verwaltung lesen/ändern, Firmen und Ansprechpartner hinzufügen/ändern sowie Kommunikation hinzufügen. Technische Konfliktentscheidungen bleiben beim Administrator. Ziele und Termine verwenden bisher ein gemeinsames Formular und benötigen zum Ändern zusätzlich Finanzfreigabe. Löschen und nicht implementierte Funktionen werden nicht freigeschaltet.

Eigene optionale App-Zwei-Faktor-Verwaltung ist in dieser Spark-Variante noch nicht umgesetzt. Die Zwei-Faktor-Prüfung eines Google-Kontos bleibt Teil der Google-Anmeldung. Keine SMS-Anmeldung. Wiedervorlagen bleiben zurückgestellt.

## Einrichtung

Geprüften Code zunächst auf derselben bestehenden privaten Bereitstellung veröffentlichen. In Verwaltung bereitet der bisherige Administrator die öffentliche Web-Konfiguration und den exakten App-Ursprung vor. Danach bestätigt er dasselbe Konto über Firebase; nur dadurch kann seine UID gebunden werden. Keine Administratorvergabe an den ersten Besucher. Aktivierung und Öffnung des Google-Zugriffs für externe Passwortbenutzer folgen erst nach Einrichtung/Tests. Keine neue Ersatzbereitstellung.

Neue Script Properties: `SALES_FIREBASE_WEB_API_KEY` (öffentliche Web-Konfiguration), `SALES_AUTH_ORIGIN`, `SALES_AUTH_ALLOWED_ORIGINS`, `SALES_APP_URL`, `SALES_AUTH_OWNER_UID`, zuletzt `SALES_AUTH_MODE=firebase`. Code-Upload legt diese Eigenschaften nicht an. Bestehende HQ-/Dienstkontozugangsdaten bleiben unverändert und werden nicht ausgegeben. Keine zusätzlichen OAuth-Scopes geplant. Ausführung bleibt `USER_DEPLOYING`, bestehende Dashboard-Adresse erhalten. Die Änderung von `MYSELF` ist gesondert zu dokumentieren.

## Prüfstand

13 neue Backendprüfungen bestanden: manipulierte Identitäten, fehlende E-Mail-Bestätigung, Widerruf/Sperre, direkte Altaufrufe, Methoden/Rechte, verschachtelte Finanzfelder, Antwortfilter, PKCE/Zustand/Wiederholung, Einladungen, geschützter Administrator, Revisionsschutz und HQ-Autorenrechte. Neuer synthetischer Browsertest mit tatsächlichem Anmeldefenstercode und künstlichen Firebase-Antworten bestätigt null Geschäftsdatenabrufe vor Login, Nachrichtenprüfung, lesende Kundenansicht und leere Ansicht nach Logout. Alle 22 Projektsuiten erfolgreich; zusätzlich Benutzerverwaltungsansicht im synthetischen Browser geprüft. Echte Google-/Passwort-/Einladungsprüfung noch offen. Firebase-E-Mail/Passwort aktiviert, Mindestlänge zwölf Zeichen serverseitig erzwungen, E-Mail-Ausforschungsschutz eingeschaltet. Kein Abrechnungskonto.

Referenzen: [Firebase-Tarife](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [Auth REST](https://firebase.google.com/docs/reference/rest/auth), [Passwortauthentifizierung](https://firebase.google.com/docs/auth/web/password-auth).
