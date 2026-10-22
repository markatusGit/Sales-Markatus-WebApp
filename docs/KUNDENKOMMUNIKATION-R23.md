# Kundenkommunikation direkt in der Kundenakte – r23

Stand: 22.10.2026. Beauftragter Umfang: einfache Erfassung, Kontaktanlage und Historie; keine Wiedervorlagen, kein E-Mail-Versand und keine automatische Hintergrundaktualisierung.

## Bedienung

Links bleiben Allgemein, Ansprechpartner, Adressen und Projekte. Rechts bleiben Erfassung und Speicherbuttons stehen. Kundendaten und die Historie darunter lassen sich unabhängig scrollen. Auf schmalen Bildschirmen wechseln die Reiter „Kundendaten“ und „Kommunikation“ zwischen beiden Bereichen.

- Einen Kunden öffnen; rechts das Fenster „Kommunikation“ mit dem richtigen Kundennamen erwarten. Bei einer anderen Ansicht zunächst die angezeigte Appkennung melden.
- Im Feld „Ansprechpartner“ die gewünschte Person auswählen; ausschließlich Kontakte dieser Firma erwarten. Bei einer falschen Firmenzuordnung nicht speichern und die Abweichung melden.
- Bei Bedarf „Datum / Uhrzeit“ ändern; die manuell eingestellte Zeit bleibt stehen. Ohne Änderung wird die aktuelle Zeit verwendet.
- Im Feld „Gespräch / Notiz“ den Gesprächsinhalt eingeben; ein gesonderter Betreff und eine Kontaktart sind nicht nötig.
- „Speichern“ anklicken; den neuen Eintrag oben in der nach Kontaktzeitpunkt sortierten Historie erwarten. Ein absichtlich zurückdatierter Eintrag steht an der passenden älteren Stelle. Bei einem Fehler bleibt die Eingabe erhalten.
- Für einen erfolglosen Kontaktversuch „Nicht erreicht“ anklicken; ein entsprechend markierter Eintrag mit Ansprechpartner und Zeitpunkt wird gespeichert. Ein Zusatztext ist optional.

Der Autor ist immer das angemeldete Konto; es gibt dafür kein Eingabefeld. Die Vorauswahl verwendet den letzten gültigen Ansprechpartner aus der geladenen Team-Kommunikation nach tatsächlichem Kontaktzeitpunkt. Dokumentversand und importierte Aufgaben gelten nicht als Gespräch. Fehlt ein passender Eintrag, wird ein einziger vorhandener Ansprechpartner ausgewählt; bei mehreren muss eine Auswahl getroffen werden. Bewusstes Neuladen berücksichtigt den neuen Teamstand. Es gibt keine verdeckte Aktualisierung im Hintergrund.

## Ansprechpartner ergänzen

- Im Ansprechpartner-Dropdown „+ Neuen Ansprechpartner anlegen“ auswählen; ein kleines Fenster für genau diese Firma erwarten.
- „Vorname“ ausfüllen.
- „Nachname“ ausfüllen.
- Bei Bedarf „Position“, „E-Mail“, „Mobiltelefon“ oder „Festnetztelefon“ ausfüllen; diese Angaben sind optional.
- „Anlegen“ anklicken; den neuen Kontakt links und als aktuelle Auswahl rechts erwarten. Die angefangene Notiz bleibt erhalten. Bei einem Fehler den Hinweis im Fenster beachten.

„Abbrechen“ schließt das Fenster ohne Anlage. Der Notizentwurf bleibt erhalten. Gleiche Vor-/Nachnamen in den geladenen Firmendaten werden als mögliche Dublette abgewiesen. Namensgleichheit wird niemals zur automatischen Übernahme einer unklaren HQ-Anlage verwendet.

## Speichern und HQ-Abgleich

Neue Ansprechpartner und Kommunikation werden mit ihrem Übertragungsauftrag gemeinsam atomar in Firebase gespeichert und unmittelbar in derselben Ansicht ergänzt. Erst der bewusste gemeinsame HQ-Abgleich überträgt sie. Zuerst werden neue Firmen vollständig bestätigt, dann weitere Ansprechpartner, dann die davon abhängige Kommunikation. Fehlende HQ-IDs halten abhängige Aufträge zurück; sie verhindern nicht die lokale Erfassung.

Ein unterbrochener Speichervorgang wird mit derselben Kennung wiederholt. Wurde die Antwort nach erfolgreichem Speichern verloren, sind die Eingaben bis zur Bestätigung gesperrt; erneutes Anklicken prüft denselben Auftrag. Auch ein abgebrochenes Kontaktfenster behält einen unbestätigten Anlageauftrag in dieser Sitzung. Entwürfe bestehen nur während der laufenden Browserseite, nicht nach deren Schließen oder vollständigem Neuladen.

Eine verlorene HQ-Kontaktanlageantwort ohne ID bleibt gesperrt. Der Administrator prüft den Kontakt ausdrücklich in HQ und ordnet erst dann im Auftrag die passende ID zu. Firmenbindung und eingegebene Werte werden lesend verglichen. Kein automatischer zweiter POST, keine automatische Zuordnung nach Name. Mit gespeicherter HQ-ID ist eine reine Rückprüfung möglich. Projekte und Rechnungen bleiben lesbar.

## Datenzugriffe und Aufbau

`sales-app/SalesCommunication.js` enthält Oberfläche und sitzungsbezogene Entwürfe, `SalesCommunication.gs` den kundenbezogenen Speicher und die neuen Auftragsarten. Sie werden in die beiden vorhandenen Apps-Script-Dateien eingebaut, nicht als zusätzliche Google-Dateien hochgeladen. Das bisherige separate Kommunikationsformular entfällt; alte HQ-Kommunikationsarten bleiben lesbar und bestehende Aufträge kompatibel.

Die zusätzliche Sammlung `sales_communication` hält Kontakte und Kommunikation getrennt vom importierten HQ-Snapshot. Ein gezielter zusätzlicher Dokumentabruf beim Öffnen einer vollständigen Kundenakte ergänzt die lokalen Daten; bei großen Datensätzen gelten die vorhandenen Teilpakete. Kein kundenübergreifender Scan. Tippen, Auswahl, Uhr und Scrollen benötigen keine Serveraufrufe. Eine normale Erfassung benötigt im synthetischen Modell drei gezielte Reads und zwei Writes, eine bestätigte identische Wiederholung zwei Reads und keine Writes. Nach dem Speichern werden keine Kundenlisten oder ganzen Historien nachgeladen. Der lokale Eintrag wird mit später importierter HQ-Historie über seine Übertragungskennung zusammengeführt.

## Prüfung und Einrichtung

Backendprüfungen decken Authentifizierung, fremde Ziele, lokale Kunden ohne HQ-ID, Pflichtfelder, Dubletten, verlorene Antworten, unterbrochene Spiegelung und geordnete HQ-Übertragung ab. Browserprüfungen verwenden ausschließlich künstliche Daten und prüfen feststehende Erfassung, getrennte Scrollbereiche, Team-Vorauswahl, Datum, Popup, Kundenwechsel, kleine Bildschirme und erhaltene Entwürfe. Die bestehende Formatierungs-/HTML-Schutzprüfung bleibt bestehen.

Keine neuen/geänderten Script Properties, OAuth-Scopes, Firestore-Endnutzerregeln, Ausführungsidentität oder Zugriffsgruppe vorgesehen. Der serverseitige Zugriff verwendet die bestehende Dienstkonto-Konfiguration. Kein Nachtlauf, kein E-Mail-Versand und keine Datenbereinigung. Veröffentlichung und GitHub-Nachweis werden im Projektüberblick, Tagebuch und `deployment.json` getrennt festgehalten. Technische Tests und Codegleichheit ersetzen keine fachliche Live-Abnahme mit einem bewusst ausgewählten Kunden.
