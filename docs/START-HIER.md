# Start hier: Vorschau ansehen und den HQ-Test vorbereiten

Stand: 23. September 2026. Diese Anleitung setzt keine Programmierkenntnisse voraus.

**Aktueller Hinweis:** Der erste kleine HQ-v2-Test wurde inzwischen erfolgreich ausgeführt. Für die neue Live-Ansicht mit Kunden und Netto-Umsatz siehe [Abschnitt 8](#8-neue-live-ansicht-für-kunden-und-netto-umsatz). Die Einrichtungsschritte unten beschreiben weiterhin den ursprünglichen Start.

## 1. Was du schon hast – und was noch eingerichtet werden muss

| Bestandteil | Was ist das? | Wo benutzt du ihn? | Aktueller Stand |
| --- | --- | --- | --- |
| Sales-Vorschau | Ein klickbares Modell der späteren Anwendung mit erfundenen Kunden | In der Codex-Unterhaltung oder über die lokale Vorschauadresse im Browser desselben PCs | Zum Ausprobieren vorhanden |
| HQ-Test | Ein separates kleines Programm, das Antwortzeiten und künftig den Kunden-/Umsatzablauf misst | Auf deiner Google-Apps-Script-Webseite | Ursprünglicher Firmenabruf ausgeführt; neue Umsatzansicht muss noch als neue Version bereitgestellt werden |
| Spätere Sales-App | Das gemeinsame Arbeitswerkzeug mit echten Daten und Google-Anmeldung | Geplant als normale Webseite für die freigeschalteten Vertriebler | Noch zu entwickeln |

Der Button „HQ-Test vorbereiten“ in der Sales-Vorschau erklärt bisher nur den geplanten Test. Dort startet noch keine echte Messung. Meine frühere Formulierung „fertig“ bezog sich auf Konzept, Entwurf und vorbereitete Dateien, nicht auf eine bereits einsatzbereite Sales-App.

## 2. Wo du die Vorschau ansehen kannst

In der bisherigen Codex-Antwort ist der klickbare Entwurf eingebettet. Dort kannst du die Navigation und Formulare ausprobieren.

Zusätzlich wurde für diese Arbeit ein lokaler Vorschau-Server gestartet. Seine zuletzt verwendete Adresse lautet:

[Lokale Sales-Vorschau öffnen](http://127.0.0.1:63094/)

Du kannst diese Adresse auch in Chrome oder Edge auf demselben Computer in die Adresszeile kopieren. „127.0.0.1“ bedeutet „dieser Computer“. Es ist keine öffentliche Internetadresse. Ein Kollege kann damit auf seinem eigenen Computer nicht deine Vorschau öffnen. Dein Smartphone erreicht sie unter dieser Adresse ebenfalls nicht.

Die Adresse funktioniert nur, solange das lokale Vorschauprogramm läuft. Nach einem Neustart oder dem Beenden des Programms kann sie nicht erreichbar sein. Dann kannst du im Chat schreiben: „Bitte die Sales-Vorschau wieder starten.“ Das ist noch kein dauerhaft veröffentlichter Link.

Zum Prüfen empfehle ich diese Reihenfolge:

1. **Mein Tag:** Ist sofort erkennbar, was heute ansteht?
2. **Magazinverkauf:** Magazin wählen und Filter ausprobieren.
3. **Kunden:** „Atelier am Markt“ öffnen, dann einen Ansprechpartner anklicken.
4. **Kontakt erfassen:** Eine erfundene Gesprächsnotiz mit Wiedervorlage speichern.
5. **Buchung erfassen:** Anzeigenformat auswählen und einen Sonderpreis ausprobieren.
6. **An Redaktion melden:** Die Vorschau der Buchungsmeldung ansehen. Ein eventuell angebotener simulierter Versand verschickt keine Mail.
7. **Hell/Dunkel und A+:** Gestaltung und größere Schrift vergleichen.

Benutze dafür nur Beispieldaten. Der Entwurf ist keine verlässliche Ablage für echte Verkaufsabschlüsse. Eingaben können je nach Vorschau gespeichert bleiben, gehören aber noch nicht in einen gemeinsamen produktiven Datenbestand.

## 3. Was du jetzt konkret tun solltest

Du hast bestätigt, dass deine bestehenden Anbindungen überwiegend **HQ API v2** verwenden. Damit ist die Grundlage für den ersten Test geklärt. Du musst nicht weiter nach der Versionsnummer suchen.

Das Testprojekt wurde inzwischen eingerichtet und der erste Firmenabruf gemessen. Dein nächster Schritt für die Erweiterung steht in **Abschnitt 8**. Die folgenden Abschnitte 4 und 5 bleiben als Anleitung für eine Neueinrichtung erhalten.

Für den ersten Versuch ist eine kleine Firmenliste mit maximal 20 Datensätzen vorbereitet: `/v2/Companies?top=20`. Das entspricht dem in der HQ-Dokumentation beschriebenen Firmenabruf mit Mengenbegrenzung. Ob dein Token den Abruf in eurem HQ erlaubt, prüfen wir mit genau einer Anfrage. „Firmen“ kann auch andere Unternehmensarten als Kunden enthalten; die gezielte Kundenauswahl folgt später. [HQ: API v2 und Pagination](https://developer.hellohq.io/)

Einen Zugangsschlüssel musst du nicht im Chat schicken. Verwende einen gültigen v2-Zugangstoken und hinterlege ihn direkt bei Google. HQ beschreibt die Token-Verwaltung unter **Admin → Einstellungen → API-Clients**. Falls dein bisheriges Script eine besondere Anmeldung verwendet, sehen wir uns nur den entsprechenden Codeausschnitt mit entfernten Geheimnissen an. [HQ: v2-Authentifizierung](https://developer.hellohq.io/)

## 4. Den HQ-Test einmalig bei Google einrichten

Die folgenden Schritte sind die vollständige Anleitung für danach. Du kannst sie nacheinander mit mir durchgehen; du musst sie nicht ohne Unterstützung am Stück erledigen.

### A. Ein eigenes Testprojekt anlegen

1. Öffne [Google Apps Script](https://script.google.com/).
2. Prüfe oben rechts, dass dein berufliches Google-Konto ausgewählt ist.
3. Klicke auf **Neues Projekt**.
4. Klicke oben auf den Projektnamen und nenne es **Magazinvertrieb – HQ-Test**.

Dieses neue Projekt ist unabhängig von deinen vorhandenen HQ- und awork-Scripten.

### B. Die drei vorbereiteten Dateien übernehmen

Die Dateien liegen auf deinem Computer in diesem Ordner:

`P:\Meine Ablage\Codex Sync\Projekte\Sales-Markatus\MeineWebApp\hq-benchmark`

Du kannst den Pfad in die Adresszeile des Windows-Explorers einfügen. Öffne die Dateien bei Bedarf über „Öffnen mit → Editor“, um ihren Text zu kopieren. Die HTML-Datei hierfür als Text öffnen, nicht als Webseite. Alternativ die Dateilinks in Codex öffnen und den vollständigen Inhalt kopieren.

**Datei 1: Code.gs – die eigentliche Testlogik**

1. Öffne die vorbereitete Datei [Code.gs](../hq-benchmark/Code.gs).
2. Kopiere ihren gesamten Text.
3. Klicke im neuen Google-Projekt links auf `Code.gs`.
4. Ersetze den vorhandenen Beispielcode vollständig durch den kopierten Text.

**Datei 2: Index.html – die Bedienoberfläche**

1. Klicke im Google-Projekt bei **Dateien** auf das Pluszeichen.
2. Wähle **HTML**.
3. Gib als Namen genau `Index` ein. Google ergänzt `.html`.
4. Ersetze den Beispielinhalt vollständig durch den Text aus [Index.html](../hq-benchmark/Index.html).

**Datei 3: appsscript.json – die Projekteinstellungen als Datei**

1. Öffne links die **Projekteinstellungen** über das Zahnrad.
2. Aktiviere die Option zum Anzeigen der Manifestdatei `appsscript.json` im Editor. Die Beschriftung kann je nach Sprache leicht abweichen.
3. Gehe zurück zum **Editor**.
4. Öffne links `appsscript.json`.
5. Ersetze ihren gesamten Inhalt durch den Inhalt der vorbereiteten Datei [appsscript.json](../hq-benchmark/appsscript.json).
6. Speichere das Projekt, beispielsweise mit **Strg+S**.

Die Manifestdatei beschreibt unter anderem die nötigen Berechtigungen. Du musst darin nichts selbst programmieren. [Google: Manifest anzeigen](https://developers.google.com/apps-script/concepts/manifests)

### C. Drei Einstellungen eintragen

Öffne **Projekteinstellungen → Skripteigenschaften**. Dort legst du jeweils ein Paar aus Name und Wert an. Der Name muss genau so geschrieben werden wie unten.

| Name der Eigenschaft | Was gehört in das Wertefeld? |
| --- | --- |
| `HQ_API_TOKEN` | Der gültige Zugangstoken deiner HQ-Anbindung. Nur den Token einsetzen, ohne ein vorangestelltes `Bearer `; das ergänzt das Programm selbst. |
| `HQ_BENCH_ALLOWED_EMAILS` | Die vollständige Google-E-Mail-Adresse, mit der du das Testprojekt betreibst und die Testseite öffnest. Zunächst nur deine eigene Adresse. |
| `HQ_BENCH_CASES` | Den vollständigen Text aus [cases-v2.json](../hq-benchmark/cases-v2.json) kopieren. Das bereitet eine Firmenliste mit maximal 20 Datensätzen vor. |

Speichere die Eigenschaften. Das sind Einstellungen des Google-Projekts, keine Felder in der Sales-Vorschau. Personen mit Bearbeitungszugriff auf das Script können auch seine Konfiguration erreichen; das Testprojekt deshalb zunächst allein betreiben. [Google: Skripteigenschaften verwalten](https://developers.google.com/apps-script/guides/properties)

Die Datei `cases-v2.json` wird nicht als zusätzliche Programmdatei in Apps Script angelegt. Kopiere nur ihren gesamten Text einschließlich der eckigen Klammern in das Wertefeld der Eigenschaft `HQ_BENCH_CASES`. Die Abfrage wurde am 23.09.2026 erfolgreich in eurem HQ ausgeführt.

### D. Daraus eine aufrufbare Testseite machen

1. Klicke oben rechts auf **Bereitstellen → Neue Bereitstellung**.
2. Wähle als Typ **Web-App**, gegebenenfalls über das Zahnrad im Dialog.
3. Beschreibung: **Erster HQ-Lesetest**.
4. Bei **Ausführen als** wähle **Ich** bzw. dein eigenes Konto.
5. Bei **Wer hat Zugriff?** wähle zunächst **Nur ich**. Falls diese Auswahl in eurem Konto fehlt, klären wir die verfügbare interne Einstellung, bevor wir die Seite öffnen.
6. Klicke auf **Bereitstellen**. Google kann dich zur Autorisierung des eigenen Scripts auffordern. Die vorgesehenen Funktionen brauchen deine Google-Identität und die Verbindung zu einem externen Dienst, hier HQ. Falls eine unerwartete Sperre oder andere Berechtigung auftaucht, halte den Wortlaut für die gemeinsame Prüfung fest.
7. Kopiere die angezeigte **Web-App-URL**. Sie sieht ungefähr wie `https://script.google.com/macros/s/…/exec` aus.
8. Öffne diese URL in einem neuen Browser-Tab mit demselben Google-Konto. Speichere sie als Lesezeichen **HQ-Geschwindigkeitstest**.

**Auf dieser neuen Google-Webseite führst du den echten HQ-Test durch.** Du musst dafür nicht die Funktion `runBenchmark` über den Ausführen-Button im Code-Editor starten. Die Eingaben und Buttons der Testseite übernehmen das. [Google: Web-App bereitstellen](https://developers.google.com/apps-script/guides/web)

## 5. Den ersten Test starten

Wenn die Testseite meldet, dass die Konfiguration vorhanden ist:

1. Wähle das von uns eingerichtete **Szenario**, zum Beispiel eine kleine Kundenliste.
2. Trage bei **Requests insgesamt** den Wert **1** ein. „Request“ bedeutet eine einzelne Anfrage an HQ.
3. Wähle bei **Parallelität** den Wert **1 · einzeln**. Es wird also nur eine Anfrage gleichzeitig gestellt.
4. Lasse die **Maximale angebotene Rate** auf **30 Requests / Minute**. Das ist eine Obergrenze; bei insgesamt einer Anfrage wird nicht eine Minute lang weitergetestet.
5. Klicke auf **Lesetest starten** und warte auf das Ergebnis.
6. Klicke anschließend auf **Messprotokoll herunterladen**. Die Datei enthält Messdaten zur gemeinsamen Auswertung, keine vollständigen Kundenantworten und keinen Token.

Den ersten Lauf werten wir aus, bevor wir die Last steigern. Ein erfolgreicher kleiner Firmenabruf beweist noch nicht, dass die spätere App mit allen Verknüpfungen schnell genug ist.

### Die wichtigsten Anzeigen verstehen

| Anzeige | Bedeutung |
| --- | --- |
| HTTP 200 | HQ hat die Anfrage erfolgreich beantwortet. Anschließend prüfen wir noch, ob die erwarteten Daten enthalten sind. |
| HTTP 401 oder 403 | Zugangstoken oder Berechtigung passt nicht. Nicht mit mehr Last weitermachen. |
| HTTP 404 bzw. anderer Abfragefehler | Unter anderem kann der Abfragepfad oder die API-Version nicht passen. Gemeinsam prüfen. |
| HTTP 429 | HQ begrenzt die Anfragen. Das Testmodul stoppt. |
| Millisekunden / ms | 1.000 ms entsprechen einer Sekunde. |
| Median | Die mittlere Antwortzeit: ungefähr die Hälfte der Messungen ist schneller, die andere langsamer. |
| p95 | Eine Kennzahl für langsamere Antworten. Bei einem oder wenigen Versuchen noch nicht aussagekräftig. |
| Parallelität 3, 5 oder 10 | Mehrere gleichzeitige Anfragen, noch keine Simulation von 3, 5 oder 10 vollständig arbeitenden Vertrieblern. |

Bei parallelen Anfragen misst das Modul die Dauer der ganzen Gruppe. Diese Zahl nicht als Dauer jeder einzelnen Anfrage interpretieren.

Falls „Kein freigeschalteter interner Google-Nutzer“ erscheint, prüfen wir Kontowahl, eingetragene E-Mail-Adresse und Bereitstellung. Die Zugriffskontrolle bleibt aktiv.

## 6. Was danach passiert

Wiederholte Einzelabrufe und vorsichtige Parallelabrufe wurden am 23.09.2026 gemessen. Als Nächstes testen wir den vollständigen Kunden-/Umsatzablauf und vergleichen zwei gleichzeitig aktive PCs. Erst nach repräsentativen Abläufen entscheiden wir, welche Daten direkt aus HQ gelesen werden und ob eine eigene Datenbank wie Firestore sinnvoll ist.

## 7. Wo Entscheidungen und Wünsche festgehalten werden

Das fortlaufende [Projekttagebuch und die Roadmap](PROJEKTTAGEBUCH-UND-ROADMAP.md) enthält den erreichten Stand, Entscheidungen, ausdrückliche Wünsche, Vorschläge und offene Fragen. Nach größeren Arbeitsschritten oder neuen Roadmap-Wünschen wird es aktualisiert. Es ist eine Arbeitszusammenfassung, kein vollständiges Wortprotokoll des Chats.

## 8. Neue Live-Ansicht für Kunden und Netto-Umsatz

Diese Erweiterung ist im lokalen Projekt vorbereitet. Sie muss noch in dein bereits eingerichtetes Google-Apps-Script-Testprojekt kopiert und dort als neue Version bereitgestellt werden. Der bisherige Geschwindigkeitstest bleibt auf derselben Seite.

1. Öffne dein Apps-Script-Projekt **Magazinvertrieb – HQ-Test**.
2. Öffne im Google-Projekt die Script-Datei `Revenue.gs` und ersetze ihren Inhalt durch die aktuelle [Revenue.gs](../hq-benchmark/Revenue.gs). Falls die Datei noch nicht existiert: Bei **Dateien** auf das Pluszeichen klicken, **Skript** wählen und sie `Revenue` nennen.
3. Öffne die vorhandene Datei `Index.html` im Apps-Script-Projekt. Ersetze ihren gesamten Inhalt durch den vollständigen Inhalt der neuen [Index.html](../hq-benchmark/Index.html).
4. Speichere. Öffne **Bereitstellen → Bereitstellungen verwalten**, bearbeite deine Web-App-Bereitstellung und wähle eine **neue Version**. Öffne danach deine vorhandene Web-App-URL erneut. Nur Speichern im Editor aktualisiert eine bestehende `/exec`-Bereitstellung nicht.
5. Unter dem bisherigen Test erscheint **Vertriebsablauf testen: Kunden und Netto-Umsatz**. Die aus dem echten HQ-Test bekannten Felder sind bereits eingetragen. Du musst keine Feldnamen, Beträge oder HQ-Adressen eintippen. **HQ-Felder erneut prüfen** ist nur nötig, wenn die Zuordnung nicht mehr passt oder du eine neue Diagnose brauchst.
6. Wähle **Von** und **Bis** und klicke **Vertriebsansicht frisch laden**. Miss die Zeit bis zur ersten Kundenliste. Suche danach nach einem Namen, setze einen Mindestumsatz, ändere die Sortierung und blättere eine Seite weiter. Die Seite zeigt für jede dieser Aktionen die Browser-Zeit getrennt vom HQ-Abruf. Ein neuer Zeitraum startet einen frischen Abruf. Das ist ein erster, ausdrücklich vorläufiger Umsatztest. Vergleiche den Betrag mit mindestens einer bekannten Rechnung und Gutschrift in HQ, bevor wir ihn fachlich verwenden. Bei zu vielen Seiten oder einem HQ-Abruffehler stoppt die Seite mit einer Meldung. Falls einzelne Belege im gewählten Zeitraum benötigte Angaben vermissen lassen, zeigt sie eine deutliche Warnung **Umsatz unvollständig** samt Anzahl der ausgelassenen Belege. Dann nur die Geschwindigkeit beurteilen; Umsatzwerte und Umsatzfilter sind noch nicht verlässlich.
7. Wenn die Seite entscheidende Felder nicht erkennt, klicke **Diagnose ohne Kundendaten herunterladen** und schicke mir diese JSON-Datei. Ich korrigiere die Zuordnung anhand der Feldnamen und möglichen Typ-/Statuswerte. Schicke keinen Token, keine Rechnung und keine Kundeninhalte.
8. Für den Vergleich an zwei PCs öffne dieselbe Web-App-URL auf beiden Geräten mit deinem freigeschalteten Google-Konto. Wähle auf beiden denselben Zeitraum und klicke möglichst gleichzeitig **Vertriebsansicht frisch laden**. Führe danach auf beiden Geräten dieselben Such-, Umsatzfilter-, Sortier- und Seitenwechselaktionen aus. Lade erst danach auf beiden Rechnern das Messprotokoll herunter und gib mir die beiden JSON-Dateien. Die Protokolle enthalten keine Suchtexte, Kundennamen oder Einzelbeträge.

Wenn eine zweite Person mit einem eigenen Google-Konto testen soll, muss ihre Adresse zuerst in `HQ_BENCH_ALLOWED_EMAILS` aufgenommen und der Web-App-Zugriff passend auf interne Nutzer erweitert werden. Diese Testseite zeigt echte Kunden- und Finanzdaten und gehört deshalb nicht in eine öffentliche Bereitstellung. Die Feldzuordnung wurde anhand einer echten HQ-Diagnose korrigiert und ein vollständiger Live-Lauf durchgeführt; die fachliche Umsatzsumme ist noch nicht mit bekannten Belegen bestätigt. Nutze bei Problemen die herunterladbare Diagnose.

**Nach der Meldung „Belegstatus fehlt“:** Ersetze im Apps-Script-Projekt `Revenue.gs` und `Index.html` durch die aktuellen Dateien aus diesem Projekt und stelle wie in Schritt 4 eine neue Version bereit. Die Seite soll nun trotz einzelner Belege ohne Status die Ladezeit anzeigen und die Umsatzwerte als unvollständig kennzeichnen. Lade anschließend **Diagnose ohne Kundendaten herunterladen** und **Messprotokoll ohne Kundennamen herunterladen** herunter und schicke beide Dateien zur Prüfung der HQ-Feldzuordnung. Bitte keinen Token oder vollständige Belege schicken.

Die inzwischen ausgewertete HQ-Diagnose zeigte außerdem, dass die frühere Automatik Projektstatus und Adress-Belegart verwechselte. In der aktuellen Fassung steht unter **Automatisch erkannte technische Zuordnung ansehen** als Belegart `documentType` und als Belegstatus `documentStatusEntity.documentStatusType`. Falls andere Werte erscheinen, klicke **HQ-Felder erneut prüfen** und schicke die neue Diagnose zur Prüfung.

## 9. Firebase-Pilot einrichten

Der Pilotcode ist vorbereitet. Für die erste echte Messung braucht er noch ein Firebase-Projekt unter deinem Google-Konto. Wir können die Schritte zusammen durchführen; sende **keinen HQ-Token und keinen Dienstkontoschlüssel** im Chat.

### A. Firebase-Projekt und Web-App

1. Öffne die [Firebase-Konsole](https://console.firebase.google.com/) mit deinem beruflichen Google-Konto und lege ein neues Projekt an, z. B. **Magazinvertrieb-Pilot**. Google Analytics ist für diesen Test nicht nötig. Starte möglichst mit dem kostenlosen **Spark-Tarif**.
2. Notiere die **Projekt-ID** aus **Projekteinstellungen → Allgemein**. Sie ist eine technische Kennung und darfst du mir nennen.
3. Klicke in der Projektübersicht auf **Web-App hinzufügen** (`</>`) und registriere eine Web-App, z. B. **Vertriebstest**. Kopiere die vier Werte `apiKey`, `authDomain`, `projectId` und `appId` aus der angezeigten Web-Konfiguration in eine Kopie von [config.example.js](../firebase-pilot/public/config.example.js), die du `config.js` nennst. Der Browser-API-Key ist eine Projektkennung, **kein Dienstkontoschlüssel**. Die Datei wird nicht auf GitHub gespeichert.
4. Öffne **Build → Firestore Database**, lege die Standard-Datenbank `(default)` an und wähle nach Möglichkeit **europe-west3 (Frankfurt)**. Wähle zu Beginn den gesperrten/Produktionsmodus; unsere Regeln werden danach gezielt veröffentlicht. Der Datenbankstandort lässt sich später nicht einfach umstellen.
5. Öffne **Authentication → Sign-in method**, aktiviere **Google**. Unter **Settings → Authorized domains** muss nach der Bereitstellung auch `PROJEKT_ID.web.app` stehen; ergänze die Domain, falls sie fehlt.

### B. Zugriff für den HQ-Abgleich

1. Öffne für dasselbe Projekt die [Google-Cloud-Konsole für Dienstkonten](https://console.cloud.google.com/iam-admin/serviceaccounts). Lege ein neues Dienstkonto namens **hq-firestore-sync** an.
2. Gib diesem Dienstkonto im Projekt die Rolle **Cloud Datastore User**. Es braucht weder Projektinhaber- noch Editor-Rechte.
3. Öffne das Dienstkonto → **Schlüssel → Schlüssel hinzufügen → Neuen Schlüssel erstellen → JSON**. Die heruntergeladene JSON-Datei enthält einen privaten Schlüssel. Bewahre sie nur lokal sicher auf.
4. Öffne dein bisheriges Apps-Script-Projekt **Magazinvertrieb – HQ-Test**. Füge den vollständigen Inhalt von [FirebaseSync.gs](../hq-benchmark/FirebaseSync.gs) als neue Scriptdatei mit Namen `FirebaseSync` ein. Ersetze auch [appsscript.json](../hq-benchmark/appsscript.json) mit der neuen Version.
5. Unter **Projekteinstellungen → Skripteigenschaften** füge `FIREBASE_PROJECT_ID` mit der Projekt-ID hinzu. Füge `FIREBASE_SERVICE_ACCOUNT_JSON` mit dem **gesamten Inhalt** der heruntergeladenen JSON-Datei hinzu. Der vorhandene `HQ_API_TOKEN` bleibt wie bisher. Den privaten JSON-Inhalt nirgendwo sonst einfügen oder an uns schicken.
6. Wähle im Apps-Script-Editor die Funktion `syncFirebasePilot` und klicke einmal **Ausführen**. Google kann erneut um Berechtigungen bitten. Im Ausführungsprotokoll soll **Abgeschlossen** stehen. Ein fehlgeschlagener Lauf schaltet keinen unvollständigen Datenstand frei.

### C. Testseite und interne Nutzer

1. Auf deinem PC muss die [Firebase CLI](https://firebase.google.com/docs/cli) verfügbar sein. Falls sie fehlt, können wir sie zusammen einrichten. Im Projektordner einmal `firebase login` ausführen.
2. Danach im Projektordner `firebase deploy --project DEINE_PROJEKT_ID --only firestore:rules,hosting` ausführen. Dies veröffentlicht die vorbereiteten Leseregeln und die Testseite unter `https://DEINE_PROJEKT_ID.web.app`.
3. Öffne die Testseite und klicke auf **Mit Google anmelden**. Zunächst erscheint erwartbar **Kein Zugriff**. Die Seite zeigt deine **Nutzer-ID (UID)** an; diese ID kannst du mir nennen.
4. In der Firebase-Konsole unter **Firestore Database → Daten** die Sammlung `pilot_access` erstellen und darin ein Dokument mit **genau dieser UID als Dokument-ID** anlegen. Ein beliebiges harmloses Feld, z. B. `enabled = true`, genügt. Diese Sammlung kann die Testseite weder lesen noch ändern; nur Projekt-Administratoren pflegen sie. Für einen zweiten Vertriebler dessen UID genauso eintragen. Dieselbe Google-Anmeldung an zwei PCs verwendet dieselbe UID.
5. Testseite auf beiden PCs frisch öffnen, denselben Zeitraum einstellen, jeweils **Frisch aus Firebase laden** klicken und das **Messprotokoll** herunterladen. Die Protokolle enthalten Zeiten und Zähler, keine Kundennamen oder Beträge. Wenn der Abgleich fachlich und technisch stimmt, im Apps-Script-Editor einmal `installFirebasePilotNightlySync` ausführen. Der tägliche Lauf ist ungefähr um 03:00 Uhr, nicht minutengenau.

**Kosten und Grenze:** Für einen kleinen Test kann der Spark-Tarif reichen; Firestore bietet derzeit 1 GiB Speicher, 50.000 Lese- und 20.000 Schreibvorgänge pro Tag ohne Berechnung. Hosting und Anmeldung haben eigene Grenzen. Der Pilot liest pro neuem Seitenaufruf einen Zeiger und mehrere Datenblöcke; die tatsächliche Zahl zeigt er an. Diese Werte und die aktuelle Preisliste vor einer breiten Nutzung nochmals prüfen. Firebase beschleunigt den Vertriebsabruf nur, wenn der HQ-Abgleich zuvor erfolgreich lief und der Datenstand aktuell genug ist. [Firestore-Kontingente](https://firebase.google.com/docs/firestore/quotas) · [Firebase-Preise](https://firebase.google.com/pricing)

Für eine neue Unterhaltung zum Projekt genügt der Hinweis: „Bitte zuerst START-HIER.md und PROJEKTTAGEBUCH-UND-ROADMAP.md lesen.“
