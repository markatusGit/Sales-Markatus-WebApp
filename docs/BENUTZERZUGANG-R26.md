# Benutzerzugang und Rechte – r27.1

**In Arbeit am 23.10.2026 – r27.1:** Anmeldung auf Google vereinfacht: keine E-Mail-/Passwortfelder, Registrierung, Bestätigungsmails oder Passwort-zurücksetzen in der App. Einladungen weiterhin exakt an die freigegebene E-Mail gebunden; jeder eingeladene Benutzer benötigt dafür ein Google-Konto, auch mit eigener Firmenadresse möglich. Ladekreis ab dem ersten HTML bis zum Abschluss der Google-Rückkehr und Serverprüfung, Formular währenddessen verborgen. Abbruch erlaubt erneuten Versuch, Serverablehnung schließt das Ladefenster und zeigt die Meldung in der App. Server akzeptiert nur google.com-Anmeldungen. Keine Änderung an Rollen/Freigaben, Datenbankregeln, Script Properties oder Apps-Script-Zugriffseinstellungen. Firebase-Passwortanbieter wird gesondert deaktiviert. Prüfung und Veröffentlichung folgen; keine echte neue Google-Liveanmeldung behauptet.

Die folgenden r26/r27-Einrichtungsangaben beschreiben den vorherigen Stand mit zusätzlichem Passwortanbieter. Für den aktuellen Einstieg gilt ausschließlich Google.

**Veröffentlicht am 23.10.2026:** r27/v0.27.0 als Google-Version 39 unter derselben App-Adresse. Quellcommit 060586c, Releasecommit d926dba. Alle 22 Suiten einschließlich 16 Sicherheitsfällen und erweitertem Browserablauf bestanden; Google-Version, Editor und GitHub-Tag verglichen. Bisheriger Administrator durch Nutzer und serverseitig bestätigt. Anonymer HTTP-Abruf liefert r27 mit aktiviertem Login und exakt freigegebener App-Herkunft; keine Google-Anmeldung für die Loginseite nötig. Datenbankproben für Benutzer/Sitzungen/Kunden/alten Pilot ergeben HTTP403, aktive Regeln entsprechen exakt dem server-only-Stand. Firebase-Abrechnung weiterhin deaktiviert. Öffentliche Google-Administratoranmeldung und Ansicht Benutzer und Rechte anschließend vom Nutzer mit funktioniert live bestätigt. Echte Passwort-Einladung/Teamrechte noch nicht live abgenommen; Browsersteuerung in Work deaktiviert.

Einrichtungshistorie: Zunächst privates r26/v0.26.0, Google-Version 37; anschließend Korrektur r26.1, Google-Version 38. Diese privaten Stände gingen der oben bestätigten Freischaltung voraus.

**Vorausgegangene Korrektur r26.1:** Nutzer meldet „Anmeldung abgebrochen“ beim Google-Pop-up. Google wird jetzt im vorhandenen Anmeldefenster direkt weitergeleitet. Fenster unter `https://sales-markatus.firebaseapp.com/auth/`, identisch zur Firebase-Auth-Domain, ohne zusätzlichen Google-Popup und ohne Abhängigkeit von fremdem Browser-Speicher. Nur Anfragekontext wird höchstens fünf Minuten in Session Storage aufbewahrt und nach Rückkehr entfernt. Firebase nutzt weiterhin inMemoryPersistence; keine eigene Speicherung von Zugangstokens. Der lokale Browsertest durchläuft die Weiterleitung einschließlich Neuladen. Google-Bestätigung anschließend durch den Nutzer erfolgreich und zusätzlich serverseitig geprüft. Die frühere web.app-Adresse ist historisch.

## Auftrag

Einzelne E-Mail-Adressen einladen, einschließlich Gmail und anderer Domains. Seit r27.1 ausschließlich Google-Anmeldung; bestätigte E-Mail vor jedem Geschäftsdatenzugriff. Freigegebene Benutzer teilen denselben Kundenbestand. Basis: Mein Tag und Kunden einschließlich Ansprechpartner/Kommunikation lesen. Weitere Bereiche und Hinzufügen/Ändern einzeln per Häkchen; Löschen bleibt gesperrt. Benutzerverwaltung nur durch den bisherigen Administrator. Einladungslink manuell weitergeben, 48 Stunden gültig, einmalig und an die exakte bestätigte E-Mail gebunden. Neue Einladung ersetzt eine ältere offene Einladung derselben Adresse.

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

Neue Script Properties: `SALES_FIREBASE_WEB_API_KEY` (öffentliche Web-Konfiguration), `SALES_AUTH_ORIGIN`, `SALES_AUTH_ALLOWED_ORIGINS`, `SALES_APP_URL`, `SALES_AUTH_OWNER_UID`; `SALES_AUTH_MODE=firebase` bleibt optional, da r27 Firebase im Code erzwingt. Code-Upload legt diese Eigenschaften nicht an. Bestehende HQ-/Dienstkontozugangsdaten bleiben unverändert und werden nicht ausgegeben. Keine zusätzlichen OAuth-Scopes geplant. Ausführung bleibt `USER_DEPLOYING`, bestehende Dashboard-Adresse erhalten. Die Änderung von `MYSELF` ist gesondert zu dokumentieren.

## Prüfstand

13 neue Backendprüfungen bestanden: manipulierte Identitäten, fehlende E-Mail-Bestätigung, Widerruf/Sperre, direkte Altaufrufe, Methoden/Rechte, verschachtelte Finanzfelder, Antwortfilter, PKCE/Zustand/Wiederholung, Einladungen, geschützter Administrator, Revisionsschutz und HQ-Autorenrechte. Neuer synthetischer Browsertest mit tatsächlichem Anmeldefenstercode und künstlichen Firebase-Antworten bestätigt null Geschäftsdatenabrufe vor Login, Nachrichtenprüfung, lesende Kundenansicht und leere Ansicht nach Logout. Alle 22 Projektsuiten erfolgreich; zusätzlich Benutzerverwaltungsansicht im synthetischen Browser geprüft. Echte Google-/Passwort-/Einladungsprüfung noch offen. Firebase-E-Mail/Passwort aktiviert, Mindestlänge zwölf Zeichen serverseitig erzwungen, E-Mail-Ausforschungsschutz eingeschaltet. Kein Abrechnungskonto.

Referenzen: [Firebase-Tarife](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [Auth REST](https://firebase.google.com/docs/reference/rest/auth), [Passwortauthentifizierung](https://firebase.google.com/docs/auth/web/password-auth).

## Aktivierung und Bedienung ab r27

Die bestehende Google-Bereitstellung steht auf `ANYONE_ANONYMOUS`, damit Passwortbenutzer ohne Google-Konto die Loginseite erreichen. Ausführung bleibt `USER_DEPLOYING`. Geschäftsdaten werden weiterhin erst nach gültiger Firebase-Anmeldung und expliziter Freigabe ausgeliefert. Der öffentliche Code erzwingt Firebase unabhängig von der optionalen Eigenschaft `SALES_AUTH_MODE`; diese Eigenschaft muss nicht manuell gesetzt werden und öffnet bei Fehlen keinen alten Zugang. `SALES_ALLOWED_EMAILS` ist keine Freigabeliste für die neue Benutzeranmeldung mehr. Sie bleibt nur für bestehende technische Triggerprüfungen erhalten.

Im bisherigen privaten Zugang eingerichtet: `SALES_FIREBASE_WEB_API_KEY`, `SALES_AUTH_ORIGIN=https://sales-markatus.firebaseapp.com`, `SALES_AUTH_ALLOWED_ORIGINS`, `SALES_APP_URL`. Die bestätigte Administratoranmeldung bindet `SALES_AUTH_OWNER_UID`. Keine neuen OAuth-Scopes oder Dienstkonto-/HQ-Zugangsdaten; Code-Upload ändert diese Eigenschaften nicht. Hosting-Weiterleitungsstand `c2005f8664bc98ca` geprüft, bisherige öffentliche Dateien unverändert. Alle direkten Firestore-Browserzugriffe sind gesperrt; die App arbeitet über ihren geschützten Serverzugang. Firebase bleibt ohne Abrechnungskonto.

Nach Veröffentlichung einen Benutzer freigeben:

- Die bestehende Sales-App-Adresse neu öffnen; die Loginseite erwarten. Bei Kundendaten ohne Anmeldung die Nutzung beenden und den Fehler melden.
- Auf „Anmelden / Einladung aktivieren“ klicken; das Firebase-Anmeldefenster erwarten. Bei blockiertem Fenster die Browsermeldung für diese App prüfen.
- Auf „Mit Google anmelden“ klicken und das gebundene Administratorkonto wählen; nach Rückkehr die angemeldete App erwarten. Bei Fehlermeldung deren Text ohne Zugangsdaten melden.
- „Verwaltung“ öffnen; „Benutzer und Rechte“ erwarten. Falls der Bereich fehlt, die angezeigte Konto-Adresse prüfen.
- In „E-Mail-Adresse“ die freizugebende Adresse eintragen.
- Die zusätzlichen Bereiche und Schreibaktionen anhaken; die festen Leserechte bleiben gesetzt.
- Auf „Einladungslink erstellen“ klicken; einen Link mit 48 Stunden Gültigkeit erwarten. Bei Fehler nichts weitergeben und die Meldung prüfen.
- Auf „Einladungslink kopieren“ klicken; der Link kann persönlich an die eingetragene Person weitergegeben werden. Falls Kopieren blockiert wird, den markierten Link mit Strg+C kopieren.

Der Empfänger öffnet seinen Einladungslink und meldet sich mit dem Google-Konto für exakt die eingeladene E-Mail-Adresse an. Ein eigenes App-Passwort gibt es seit r27.1 nicht mehr. Erst danach aktiviert die App die Einladung. Andere Adressen, ersetzte, abgelaufene oder bereits verwendete Einladungen werden abgewiesen.

Bestehende Freigabe ändern:

- Unter „Verwaltung“ auf „Benutzer laden“ klicken; bis zu 50 Konten erwarten. Bei weiteren Konten „Weitere Benutzer“ benutzen.
- Die gewünschte E-Mail-Adresse aufklappen.
- Die gewünschten Häkchen ändern oder „Zugang“ auf „Gesperrt“ stellen.
- Auf „Rechte speichern“ klicken; eine Bestätigung erwarten. Bei Konflikt „Benutzer laden“ erneut verwenden und den aktuellen Stand prüfen.

Rechteänderungen aktualisieren nur die betroffene Zeile und widerrufen vorhandene App-Sitzungen. Die betroffene Person muss sich erneut anmelden. Das Administratorkonto kann sich nicht selbst sperren. Vor dem Schließen der App kann über „Abmelden“ die Sitzung beendet werden.
