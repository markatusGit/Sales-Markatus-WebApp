# Magazinvertrieb für Markatus

Aktueller Projektstand und Arbeitsablauf: [PROJEKTUEBERBLICK.md](PROJEKTUEBERBLICK.md) · [CHANGELOG.md](CHANGELOG.md) · [Geprüft veröffentlichen](docs/VEROEFFENTLICHEN.md). Seit 16.10.2026 sind clasp-Upload und Aktualisierung der bestehenden Bereitstellung beauftragt; ältere manuelle Übergabehinweise sind historisch.

Die tatsächliche App läuft unter der bestehenden [Dashboard-Adresse](https://script.google.com/a/macros/markatus.de/s/AKfycbxlNLBoZvy6SgSHHEFviByTN9bL07nb7kLzlUWaAcCs0Jmrc96lIrAyGNxUrwtevDWrFw/exec). Eine lokale Demo oder ein lokaler Vorschauserver gehören seit dem Auftrag vom 18.10.2026 nicht mehr zum Arbeitsablauf.

- [Produktive Kundenpflege und Erklärung T05/T07/T08](docs/KUNDENPFLEGE-R22.md)
- [Bestandsaufnahme und noch offene Produktivbausteine](docs/LIVE-BETRIEB-UND-TESTRESTE.md)
- [Fortlaufendes Projekttagebuch und Roadmap](docs/PROJEKTTAGEBUCH-UND-ROADMAP.md)
- [Konzept, Features, Abläufe und Roadmap](docs/VERTRIEBSKONZEPT.md)
- [HQ-API-Testplan und Entscheidungskriterien](docs/HQ-API-TESTPLAN.md)
- [Vorbereitetes HQ-Testmodul und Einrichtung](hq-benchmark/README.md)
- [Firebase-Pilot mit HQ-Abgleich und Testseite](firebase-pilot/README.md)
- [Produkt- und Preisreferenz aus den Mediadaten](docs/produktkatalog.json)

Bearbeitbare Quellen und synthetische Tests liegen in `sales-app/`; `npm run build` erzeugt die Apps-Script-Dateien in `hq-benchmark/`. `npm test` prüft Syntax, Logik, Ladeverhalten und die Oberfläche mit künstlichen Daten. Der dauerhaft beauftragte Veröffentlichungsablauf aktualisiert dieselbe Google-Bereitstellung und sichert den Stand mit Git-Tag auf GitHub.

`hq-benchmark/` und `firebase-pilot/` enthalten weiterhin technische Diagnosewerkzeuge und gemeinsam benötigte Funktionen (T08). Zugangsdaten bleiben in Script Properties bzw. lokalen Anmeldedateien. Fachliche Live-Abnahme, Teamzugang und weitere Vertriebsfunktionen bleiben im Projektüberblick ausdrücklich als offen erhalten.
