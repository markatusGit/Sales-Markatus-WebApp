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

Für eine neue Unterhaltung zum Projekt genügt der Hinweis: „Bitte zuerst START-HIER.md und PROJEKTTAGEBUCH-UND-ROADMAP.md lesen.“

## 8. Neue Live-Ansicht für Kunden und Netto-Umsatz

Diese Erweiterung ist im lokalen Projekt vorbereitet. Sie muss noch in dein bereits eingerichtetes Google-Apps-Script-Testprojekt kopiert und dort als neue Version bereitgestellt werden. Der bisherige Geschwindigkeitstest bleibt auf derselben Seite.

1. Öffne dein Apps-Script-Projekt **Magazinvertrieb – HQ-Test**.
2. Öffne im Google-Projekt die Script-Datei `Revenue.gs` und ersetze ihren Inhalt durch die aktuelle [Revenue.gs](../hq-benchmark/Revenue.gs). Falls die Datei noch nicht existiert: Bei **Dateien** auf das Pluszeichen klicken, **Skript** wählen und sie `Revenue` nennen.
3. Öffne die vorhandene Datei `Index.html` im Apps-Script-Projekt. Ersetze ihren gesamten Inhalt durch den vollständigen Inhalt der neuen [Index.html](../hq-benchmark/Index.html).
4. Speichere. Öffne **Bereitstellen → Bereitstellungen verwalten**, bearbeite deine Web-App-Bereitstellung und wähle eine **neue Version**. Öffne danach deine vorhandene Web-App-URL erneut. Nur Speichern im Editor aktualisiert eine bestehende `/exec`-Bereitstellung nicht.
5. Unter dem bisherigen Test erscheint **Kunden und Netto-Umsatz live laden**. Klicke **Felder automatisch einrichten**. Die Seite liest eine kleine Probe aus HQ und füllt die technischen Felder selbst aus. Du musst keine Feldnamen, Beträge oder HQ-Adressen eintippen.
6. Wenn die Seite „Technische Felder automatisch ausgefüllt“ meldet, wähle nur **Von** und **Bis** und klicke **Live-Liste laden**. Das ist ein erster, ausdrücklich vorläufiger Umsatztest. Vergleiche das Ergebnis danach mit mindestens einer bekannten Rechnung und Gutschrift in HQ, bevor wir es fachlich verwenden. Bei zu vielen Seiten oder einem HQ-Abruffehler stoppt die Seite mit einer Meldung. Falls einzelne Belege im gewählten Zeitraum benötigte Angaben vermissen lassen, zeigt sie die Ladezeit und eine deutliche Warnung **Umsatz unvollständig** samt Anzahl der ausgelassenen Belege. Dann nur die Geschwindigkeit beurteilen; Umsatzwerte und Umsatzfilter sind noch nicht verlässlich.
7. Wenn die Seite entscheidende Felder nicht erkennt, klicke **Diagnose ohne Kundendaten herunterladen** und schicke mir diese JSON-Datei. Ich korrigiere die Zuordnung anhand der Feldnamen und möglichen Typ-/Statuswerte. Schicke keinen Token, keine Rechnung und keine Kundeninhalte.
8. Für den Vergleich an zwei PCs öffne dieselbe Web-App-URL auf beiden Geräten mit deinem freigeschalteten Google-Konto. Richte die Felder auf beiden automatisch ein, wähle denselben Zeitraum und klicke dann möglichst gleichzeitig **Live-Liste laden**. Lade auf beiden Rechnern das Messprotokoll herunter und gib mir die beiden JSON-Dateien. Die Protokolle enthalten keine Kundennamen oder Einzelbeträge.

Wenn eine zweite Person mit einem eigenen Google-Konto testen soll, muss ihre Adresse zuerst in `HQ_BENCH_ALLOWED_EMAILS` aufgenommen und der Web-App-Zugriff passend auf interne Nutzer erweitert werden. Diese Testseite zeigt echte Kunden- und Finanzdaten und gehört deshalb nicht in eine öffentliche Bereitstellung. Ein echter Versuch meldete bereits einen fehlenden Belegstatus; die fachliche Zuordnung ist noch nicht bestätigt. Nutze bei Problemen die herunterladbare Diagnose.

**Nach der Meldung „Belegstatus fehlt“:** Ersetze im Apps-Script-Projekt `Revenue.gs` und `Index.html` durch die aktuellen Dateien aus diesem Projekt und stelle wie in Schritt 4 eine neue Version bereit. Die Seite soll nun trotz einzelner Belege ohne Status die Ladezeit anzeigen und die Umsatzwerte als unvollständig kennzeichnen. Lade anschließend **Diagnose ohne Kundendaten herunterladen** und **Messprotokoll ohne Kundennamen herunterladen** herunter und schicke beide Dateien zur Prüfung der HQ-Feldzuordnung. Bitte keinen Token oder vollständige Belege schicken.

Die inzwischen ausgewertete HQ-Diagnose zeigte außerdem, dass die bisherige Automatik Projektstatus und Adress-Belegart verwechselte. In der aktuellen Fassung soll unter **Automatisch erkannte technische Zuordnung ansehen** als Belegart `documentType` und als Belegstatus `documentStatusEntity.documentStatusType` stehen. Prüfe diese beiden Angaben nach **Felder automatisch einrichten**, bevor du den neuen Live-Lauf startest. Falls andere Werte erscheinen, schicke die neue Diagnose zur Prüfung.
