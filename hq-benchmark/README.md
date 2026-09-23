# HQ-Testmodul für Google Apps Script

Neu dabei? Die [Schritt-für-Schritt-Anleitung ohne vorausgesetzte Programmierkenntnisse](../docs/START-HIER.md) erklärt jeden Einrichtungsschritt und den Unterschied zur Sales-Vorschau.

Das ursprüngliche kleine Testwerkzeug wurde am 23.09.2026 gegen HQ v2 ausgeführt. Die neue Umsatzansicht ist lokal vorbereitet, aber noch nicht im echten Mandanten geprüft. Beide Teile führen ausschließlich GET-Anfragen an `https://api.hellohq.io` aus. Sie schreiben weder Kunden noch Buchungen oder Rechnungen und versenden keine E-Mails.

## Wie wir es elegant verwenden

Der klickbare Sales-Entwurf zeigt den Einstieg unter **Verwaltung → HQ-Test vorbereiten**. Diese Vorschau hat absichtlich keine echte HQ-Verbindung. Das vorliegende Modul läuft als eigene interne Apps-Script-WebApp mit derselben dunklen/hellen Gestaltung. Später kann diese Seite als Admin-Bereich in die echte App übernommen werden. Der Browser ruft dabei nur freigegebene Apps-Script-Funktionen auf; der HQ-Token bleibt serverseitig.

## Einmalige Einrichtung

1. Im internen Workspace-Konto ein separates Apps-Script-Projekt anlegen, z. B. „Magazinvertrieb – HQ-Test“.
2. Inhalt von `Code.gs` übernehmen; zusätzlich eine Script-Datei `Revenue.gs` mit dem Inhalt aus `Revenue.gs` erstellen. Eine HTML-Datei mit dem Namen `Index` erstellen und den Inhalt von `Index.html` einfügen. Manifestanzeige aktivieren und `appsscript.json` übernehmen.
3. Unter **Projekteinstellungen → Skripteigenschaften** folgende Werte setzen. Zugangsdaten nicht in eine HTML-Datei oder dieses Repository schreiben.

| Schlüssel | Inhalt |
| --- | --- |
| `HQ_API_TOKEN` | Gültiger Bearer-Token der vorhandenen HQ-Anbindung für die getestete API-Version |
| `HQ_BENCH_ALLOWED_EMAILS` | Eigene freigeschaltete interne Google-Adresse; mehrere Adressen mit Komma trennen |
| `HQ_BENCH_CASES` | JSON-Liste ausdrücklich geprüfter Lesepfade: siehe unten |

4. Zunächst nur für dich bereitstellen. Ausführung als bereitstellender Nutzer; Zugriff so eng wie möglich beschränken. Falls die Workspace-Identität leer zurückkommt, nicht die Sicherheitsprüfung entfernen: Bereitstellung und Kontokontext prüfen. Bei geänderter Ausführungsidentität Apps-Script-Kontingente und Freigaben erneut prüfen.
5. In der Oberfläche mit **1 Request, Parallelität 1, 30 Requests/Minute** beginnen. HTTP-Status und Rückgabezahl verifizieren, bevor größere Läufe starten. Erst danach 10–30 Einzelmessungen und begrenzte Paralleltests ausführen.

Der Nutzer verwendet überwiegend API v2; sie ist die Grundlage für den Test. Für den ursprünglichen Firmenabruf den vollständigen Inhalt von [cases-v2.json](cases-v2.json) als `HQ_BENCH_CASES` hinterlegen. Dieser kleine Abruf wurde am 23.09.2026 gegen den persönlichen Mandanten geprüft. Ein Firmenabruf ist noch keine nach Kundentyp gefilterte Kundenliste.

## Neue Live-Ansicht: Kunden und Netto-Umsatz

Für eine bestehende Apps-Script-Bereitstellung `Revenue.gs` als neue Script-Datei anlegen, `Index.html` vollständig durch die neue Fassung ersetzen und **eine neue Version bereitstellen**. Die einzige Änderung an `Code.gs` ist ein aktualisierter Kommentar; der bisherige Lesetest bleibt verfügbar.

Die neue Ansicht nutzt fest `/v2/Companies` und `/v2/Documents`. Die öffentliche v2-Anleitung beschreibt die Felder für Belegart, Status, Rechnungsdatum, Firmenbezug und Netto-Betrag nicht vollständig. Die im echten HQ-Test bestätigten Feldpfade und beobachteten Typ-/Statuswerte sind für diesen Mandanten vorbelegt. Der Nutzer wählt nur den Zeitraum und startet **Vertriebsansicht frisch laden**. **HQ-Felder erneut prüfen** bleibt optional und liest eine kleine Probe, falls die HQ-Struktur sich ändert. Die technische Zuordnung bleibt eingeklappt und kann bei Bedarf geprüft werden. Insbesondere Einzelpreise und Positionsfelder werden nicht als Netto-Gesamtbetrag vorgeschlagen. Die echte Feld-Diagnose zeigte `documentType` und `documentStatusEntity.documentStatusType` als Belegfelder sowie `date` und `netValue`. Die automatische Erkennung bevorzugt Belegfelder vor ähnlich benannten Feldern aus Projekt oder Adresse. Wenn die erneute Prüfung entscheidende Felder oder die Bedeutung numerischer Belegarten nicht erkennt, bleibt der Start gesperrt und eine **Diagnose ohne Kundendaten** kann heruntergeladen werden. Diese JSON-Datei enthält Feldpfade, Datentypen und Auswahlwerte aus ausdrücklich erlaubten Belegart-, Belegstatus-, Währungs- und Firmentypfeldern, keine Kundennamen, Einzelbeträge oder Tokens. Frei beschreibbare Projektstatus-Werte werden nicht mehr aufgenommen. Sie kann zur Korrektur an Codex gegeben werden.

Der automatische Vorschlag ist **vorläufig**. Vor einer fachlichen Nutzung die Werte mit einer bekannten Rechnung und Gutschrift in HQ vergleichen. Ohne erkannten Kundentyp können andere Firmenarten erscheinen; ohne Währungsfeld wird EUR nicht geprüft. Für den reinen Geschwindigkeitstest ist eine solche vorläufige Auswertung brauchbar, solange die Einschränkungen sichtbar bleiben.

**Vertriebsansicht frisch laden** liest alle Seiten dieser beiden Sammlungen ohne App-Cache. Die bisherige Messung mit 500 Einträgen und zwei Sekunden künstlicher Pause je Abruf brauchte 38,8 Sekunden; allein die Pausen zwischen 19 Abfragen erklärten etwa 36 Sekunden. Der neue Test nutzt bis zu 1000 Einträge je Seite und startet die nächste Abfrage unmittelbar nach der vorherigen Antwort. Die HQ-v2-Dokumentation erlaubt bis zu 1000 Einträge pro Seite; 429 und andere Fehler stoppen den Lauf. Maximal 25 Seiten je Sammlung bleiben zulässig. Wird die Grenze erreicht oder schlägt ein Abruf fehl, zeigt die Oberfläche keine Ergebnisliste. Rechnungen zählen positiv, Gutschriften negativ; nur ausgewählte Statuswerte und Belege im gewählten Datumsbereich zählen. Fehlen bei einzelnen Belegen benötigte Angaben, werden sie ausgelassen und gezählt. Die Seite kennzeichnet den Umsatz dann deutlich als unvollständig. Ein Beleg außerhalb des Zeitraums braucht keinen Status für diesen Lauf.

Nach dem ersten Laden werden Name, Mindest-/Höchstumsatz, Sortierung und Seitenwechsel aus der geladenen Kundenliste im Browser bedient. Pro Seite werden höchstens 100 Zeilen aufgebaut. Die angezeigte Bedienzeit misst Filtern, Sortieren und Tabellenaufbau in JavaScript; sie umfasst nicht die Bildschirmzeichnung durch den Browser. Das Messprotokoll enthält Erstabruf und bis zu 100 Bedienaktionen mit Dauer und Trefferzahl, aber keine Suchtexte, Kundennamen oder Einzelbeträge. Ein anderer Zeitraum startet in dieser direkten HQ-Variante erneut den vollständigen Abruf. Kontakte, Buchungen und Kundendetails sind noch nicht Teil dieses Szenarios. Der Test ist keine Messung einer eigenen Datenbank.

**Test an zwei PCs:** Dieselbe bereitgestellte URL mit dem freigeschalteten Google-Konto auf beiden Rechnern öffnen. Bei zwei unterschiedlichen Konten beide Adressen in `HQ_BENCH_ALLOWED_EMAILS` aufnehmen und den Bereitstellungszugriff passend auf interne Nutzer erweitern. An beiden PCs automatisch einrichten, denselben Zeitraum wählen und dann möglichst gleichzeitig **Vertriebsansicht frisch laden** klicken. Beide Läufe dürfen gleichzeitig laufen; anders als der ursprüngliche rohe Benchmark verwendet die neue Ansicht kein globales Test-Lock. Danach auf beiden PCs nach einem Namen suchen, einen Mindestumsatz eintragen, sortieren und eine Seite weiterblättern. Jeweils anschließend das Messprotokoll herunterladen. Die gemessenen Gesamtzeiten, HQ-Abfragen, Fehler und Bedienzeiten vergleichen. Die Seite nur für berechtigte interne Nutzer freigeben: HQ-v2-Tokens können je nach Tokentyp Zugang zu vielen Finanzdaten geben.

Erweiterbares Beispiel für `HQ_BENCH_CASES` mit zwei Listengrößen, für spätere Vergleiche:

```json
[
  {"id":"companies_small","label":"Firmen – erste 20 Datensätze","path":"/v2/Companies?top=20"},
  {"id":"companies_page","label":"Firmen – 50 Datensätze","path":"/v2/Companies?top=50"}
]
```

V1 bleibt nur bei nachgewiesenem Bedarf einzelner Daten eine Option; dafür gelten andere Pfade und Parameter. Echte Kontakt-, Projekt- und Rechnungsabfragen werden anschließend anhand eurer Daten ergänzt. Filter URL-kodieren. Das Beispiel ist keine Garantie, dass es alle erforderlichen Beziehungen eurer HQ-Instanz abdeckt. [HQ-Dokumentation](https://developer.hellohq.io/)

## Was der erste Test misst

- Ein Szenario je Lauf, maximal 60 Requests.
- Parallelität 1, 3, 5 oder 10; maximal 60 angebotene Requests/Minute. Andere HQ-Integrationen sind darin nicht enthalten.
- Einzelmessungen: Dauer eines UrlFetch-Aufrufs einschließlich Netzwerk und Apps Script. Keine isolierte interne HQ-Rechenzeit.
- Parallelmessungen: Dauer des gesamten `fetchAll`-Batches. Daraus werden ausdrücklich keine erfundenen Einzelrequest-Latenzen abgeleitet. Rest-Batches anderer Größe werden in Median/p95 nicht mit vollständigen Batches vermischt.
- HTTP-Status, Übertragungsumfang, grob erkannte Datensatzanzahl, Fehler und JSON-Messprotokoll. Keine Response-Inhalte oder Tokens im Bericht.
- Median/p95 aus vollständigen beantworteten Batches; HTTP-Fehler bleiben darin enthalten. Transportfehler werden als unbekannte Requestausgänge separat ausgewiesen und fließen in Fehlerrate und maximale beobachtete Batchdauer ein.

Ein kleines Testmodul liefert noch keinen belastbaren p95-Wert aus Hunderten Messungen und keinen Mehrbenutzertest der späteren Anwendung. Weitere Läufe können anhand derselben Konfiguration verglichen werden. Identische Wiederholungen können von internen HQ-Caches profitieren; kalten HQ-Cache kann das Modul nicht erzwingen. Datenverarbeitung, Browserdarstellung und gemischte Nutzeraktionen folgen gemäß `docs/HQ-API-TESTPLAN.md`.

## Begrenzungen und Abbruch

Ein globales Script-Lock lässt nur einen Testlauf dieses Projekts gleichzeitig zu. Zwischen Batches wird die Rate begrenzt. Abbruch bei 429, Authentisierungs-/Abfragefehlern, Weiterleitungen, wiederholten Serverfehlern oder auffälliger Fehlerrate. Weiterleitungen werden nicht verfolgt, damit kein Authorization-Header an ein anderes Ziel weitergereicht wird.

Der Stoppbutton beendet den Lauf zwischen Batches; einen bereits laufenden HTTP-Aufruf kann Apps Script nicht durch diesen Button unterbrechen. Nach rund 210 Sekunden werden keine neuen Batches gestartet. Der Apps-Script-Laufzeitdeckel gilt zusätzlich. Bei Abbruch der Laufzeit kann ein vollständiger Bericht fehlen; kein automatischer erneuter Start. Token-Ablauf/Refresh ist im ersten Testmodul nicht automatisiert; vorhandenen gültigen Token verwenden, bei 401 stoppen und separat erneuern.

Die Benutzerfreigabe wird bei jedem serverseitigen Aufruf geprüft. Ein leeres Nutzer-E-Mail-Feld führt zur Ablehnung. Eine Workspace-Domain allein schaltet niemanden in diesem Modul frei. Hilfsfunktionen enden auf `_` und sind nicht als Browser-RPC vorgesehen. Der Benchmark ist ein Werkzeug für den Administrator, kein allgemeiner öffentlicher API-Proxy.

## Stand der Prüfung

JavaScript-Syntax und Manifest wurden lokal geprüft. Die elf Tests des ursprünglichen Benchmarks und elf Tests der Umsatzansicht mit nachgebildeten Apps-Script-Diensten sind bestanden, unter anderem Zugriffsprüfung, GET-only, Seitennavigation, Rechnung/Gutschrift, automatische Feldvorschläge, fehlende Belegdaten, verwechslungsanfällige Projekt-/Adressfelder und die neue Seitengröße ohne künstliche Pause. Ein zusätzlicher Browserlogiktest mit 3050 nachgebildeten Kunden prüft 100 Zeilen je Seite, lokale Filter ohne HQ-Aufruf, Zeitraumwechsel und ein Messprotokoll ohne Suchtexte. Die frühere Umsatzansicht wurde gegen HQ mit 3174 Firmen und 5779 Belegen ausgeführt. Die neue, schnellere Variante muss erneut live und an zwei PCs gemessen werden. Der Umsatzbetrag muss vor fachlicher Nutzung mit bekannten HQ-Belegen abgeglichen werden.
