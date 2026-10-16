# Firebase-Zugriffe und Performance – Untersuchung vom 16.10.2026

Geprüfter Appstand: `2026-10-06-r19.1`, Git-Basis `v0.19.1`, bestehende Google-Version 30. Auftrag: Auslöser, Zeitabstände und Umfang aller wesentlichen Firebase-Lese-/Schreibwege auflisten und die Ursachen von Kontingentverbrauch und Wartezeiten erklären. In diesem Schritt keine produktive Appänderung und keine Google-Veröffentlichung.

## Ergebnis

Die App lädt für kleine Bedienaktionen zu viel. Der größte laufende Verbraucher ist der vollständige Minutenabruf auf „Mein Tag“. Eine normale Kundenöffnung liest ebenfalls das gesamte Firmenverzeichnis, bevor sie die einzelne Akte liefert. Viele Speicheraktionen lösen zusätzlich einen vollständigen Startabruf aus. Das erklärt die gemeldeten Wartezeiten sehr plausibel; die konkreten 5–10 Sekunden wurden in dieser Untersuchung nicht live vermessen.

Daneben verursachen der Sync unnötige Statusschreibvorgänge, die Aufbereitung ganzer Zuordnungsgruppen zusätzliche Reads und liegengebliebene Importjournale/Teilpakete wachsenden Speicher. Lesen, Schreiben und belegter Speicher sind getrennte Probleme.

## Methode und Bedeutung der Zahlen

- Ausschließlich lokaler Code und künstliche Daten; keine echten Firebase-/HQ-Aufrufe, Zugangsdaten oder Kundeninhalte verwendet.
- `scripts/audit-firestore.cjs` führt die tatsächlichen Backend-, Speicher-, Join- und Workerfunktionen gegen einen gezählten künstlichen Transport aus. Die bestehenden Fixture-Kurzwege für Einzelabruf, Listen und Speicherung werden dabei durch die echten Funktionen ersetzt.
- Vergleichsmodell für die Haupttabelle: 3.189 Firmenverzeichnis-Dokumente, 23 Ausgaben, vollständig gespeicherte Kundenakten, zunächst keine Jobs/Entwürfe und keine aufgeteilten Dokumente. Die Bestandsgrößen stammen aus dem dokumentierten Projektstand; eine heutige Live-Bestandszählung wurde nicht durchgeführt.
- Ein Read meint hier eine modellierte Dokument-Leseoperation einschließlich eines konservativen Mindestansatzes bei leeren Abfragen und fehlenden Einzelobjekten. Ein Request meint eine HTTP-Anfrage. Eine Anfrage kann viele Dokumente lesen oder schreiben.
- Reads/Writes sind keine bestätigte Google-Abrechnung. Wiederholungen nach Fehlern, weitere Teilpakete, abweichende Bestände und zusätzliche Regelprüfungen können Werte verändern. Abgewiesene Schutzproben werden als Requests separat gezählt, nicht als erfolgreich gelesene Dokumente.
- Kontakte innerhalb eines Firmendokuments sind keine eigenen Dokumentreads. Ein zusätzlich geladenes Teilpaket ist hingegen ein eigener Read. Ein einzelner Schreibvorgang auf ein großes logisches Objekt kann mehrere Dokumentwrites erzeugen.

Offizielle Grundlage: [Firestore-Abrechnung](https://firebase.google.com/docs/firestore/pricing) und [Kontingente](https://firebase.google.com/docs/firestore/quotas), am 16.10.2026 geprüft. Für die kostenlose Standard-Datenbank gelten 50.000 Dokumentreads, 20.000 Writes und 20.000 Deletes pro Tag sowie 1 GiB Speicher. Ein Commit mit 100 Dokumentänderungen bleibt 100 Writes. Leere Queries haben einen Mindestansatz. Das Tageskontingent gilt gemeinsam, nicht pro Mitarbeiter.

## 1. Hauptansichten und Zeitsteuerung

| Aktion / Zeitpunkt | Tatsächlicher Datenweg | Reads im Modell | Writes | Firebase-Requests |
| --- | --- | ---: | ---: | ---: |
| App öffnen / Browserseite neu laden | Gesamten Startzustand aus Firebase laden | 3.221 | 0 | 42 |
| „Frisch aus Firebase laden“ | Derselbe vollständige Startabruf | 3.221 | 0 | 42 |
| „Mein Tag“ bleibt geöffnet | Derselbe vollständige Startabruf **alle 60 Sekunden** | 3.221 je Abruf | 0 | 42 je Abruf |
| Geladenen Bestandskunden anklicken | Entwürfe prüfen, komplettes Verzeichnis lesen, eine Akte und Jobs lesen | 3.193 | 0 | 36 |
| Denselben Kunden erneut öffnen | Keine Wiederverwendung der zuvor geladenen Akte | erneut 3.193 | 0 | erneut 36 |
| „Firmendetails aus Firebase“ erneut laden | Derselbe Aktenweg | 3.193 | 0 | 36 |
| Menü wechseln: Mein Tag, Kunden, Ansprechpartner, Magazinverkauf, Buchungshistorie, Verwaltung, Wiedervorlagen | Bereits geladener Browserzustand | 0 durch den Wechsel | 0 | 0 |
| Magazin oder Ausgabe wechseln | Auswahl aus bereits geladenen Ausgaben | 0 | 0 | 0 |
| Namen/Ort/Branche/Betreuer/Historienfilter ändern | Filter und Darstellung im Browser | 0 | 0 | 0 |
| Helle/dunkle Ansicht | Nur Browserdarstellung; Farbschema lokal speichern | 0 | 0 | 0 |
| „Ohne Firmenzuordnung ansehen“ | Zwei Metadokumente lesen | 2 plus eventuelle Teilpakete | 0 | 2 plus Teilpakete |
| Ansicht Datenabgleich bei laufendem Hintergrundjob | Statusabfrage **alle 5 Sekunden** | mindestens 1 je Abfrage | 0 | mindestens 1 |
| Datenabgleich erkennt Abschluss | Zusätzlich einmal den vollständigen Startzustand laden | zusätzlich 3.221 | 0 | zusätzlich 42 |

Der 60-Sekunden-Timer läuft nur bei `view === 'home'`, vorhandenen Startdaten und `!busy`. Er prüft nicht, ob der Browsertab sichtbar ist. Browser können Hintergrundtimer drosseln; daraus werden keine exakten realen Minutenmengen abgeleitet. Der Timer startet ab Laden des Hauptskripts, nicht erst nach Wechsel zu „Mein Tag“. Er setzt auf anderen Ansichten aus und kann nach Rückkehr beim nächsten Tick wieder abrufen.

Der 5-Sekunden-Timer liest nur bei Ansicht Datenabgleich, Engine 2, laufendem und nicht pausiertem Lauf, ohne aktuelle Bedienaktion und ohne bereits offene Statusabfrage. Auch er prüft die Sichtbarkeit des Browsertabs nicht. Er importiert selbst keine HQ-Daten. Bei Pause/Abschluss bzw. anderer Ansicht entfällt dieser Statusabruf. Sein Statusdokument enthält intern den ganzen gespeicherten Lauf; wird es in Teilpakete aufgeteilt, sind mehrere Reads nötig.

Mehrere Tabs und mehrere Personen führen dieselben Abrufe jeweils erneut aus. Es gibt keinen gemeinsamen Daten-Cache und keinen Firestore-Echtzeitlistener in der Haupt-App.

Quellen: `Sales.template.html` Zeilen 194, 200–229, 232–234; `SalesV1.js` Funktionen `v1Change`, `pollSalesSync`, `v1Click`.

## 2. Was ein vollständiger Abruf tatsächlich liest

`getSalesV1State()` ruft zuerst `getSalesState()` auf und erweitert diesen Zustand:

| Daten | Umfang je vollständigem Abruf |
| --- | --- |
| Feste frühere Standardausgabe `sales_editions/coburger-70` | Ein Einzelabruf, zusätzlich zu den Ausgaben unten; auch bei inzwischen anderer Auswahl |
| `sales_meta/catalog` | Ein Einzelabruf der Auswahllisten |
| `sales_drafts` | Alle Entwürfe |
| `sales_jobs` | Alle Aufträge, einschließlich abgeschlossener |
| Zusätzliche Draft-Prüfung für Anlageaufträge | Je `createCompany`-Auftrag nochmals ein Einzelabruf des zugehörigen Entwurfs in `salesJobSummary_()` |
| `sales_editions` | Alle Ausgaben mit Belegen, Summen und weiteren gespeicherten Inhalten |
| `sales_directory` | Alle Firmeneinträge einschließlich eingebetteter Ansprechpartner |
| `sales_meta/directory` | Alter Sammelindex; wird zusätzlich gelesen, auch wenn Einzelverzeichnisse vorhanden sind |
| `sales_meta/preferences`, `import`, `sync`, `unassignedsummary` | Vier weitere Einzelabrufe |

Das sind bei 3.189 Firmen und 23 Ausgaben insgesamt **3.221** modellierte Reads. Der Code liest Listen in Seiten zu 100 Dokumenten, nacheinander. Allein das Firmenverzeichnis braucht im Modell 32 HTTP-Anfragen. Zusammen mit den anderen Listen/Einzelabrufen sind es 42 Firebase-Requests.

Allgemein ohne Teilpakete: `N + E + max(D,1) + max(J,1) + G + 7`, mit N Verzeichnisdokumenten, E Ausgaben (bei leerer Ausgabenliste Mindestansatz 1), D Entwürfen, J Jobs und G Anlagejobs. Alte Sammelseiten im Verzeichnis zählen ebenfalls zu N. Bei zehn Entwürfen und zehn Anlageaufträgen sind es im Modell bereits 3.249 Reads und 52 Firebase-Requests.

Die serverseitige Antwort enthält Firmendaten sowohl in `companies` als auch in `directory`. Dazu kommen Kontakte und sämtliche Ausgaben. Im künstlichen Modell mit einem Kontakt pro Firma betrug die Antwort ungefähr 1,65 MB. Das ist ein Beispiel für die doppelte Übertragung, keine Messung eures echten Antwortvolumens. Alle Rohhistorien werden beim Appstart nicht separat gelesen; sie gehören in die jeweilige Kundenakte.

Quellen: `Sales.gs` Funktionen `getSalesState`, `salesJobSummary_`, `salesList_`; `SalesV1.gs` Funktionen `getSalesV1State`, `salesV1Index_`.

## 3. Warum das Öffnen eines Kunden so teuer ist

Für einen normalen, vollständig gespeicherten Bestandskunden läuft Folgendes:

1. Alle Testentwürfe lesen, um Sonderfälle zu erkennen.
2. Mit `salesV1Known_()` die Zugehörigkeit prüfen; dafür das gesamte Firmenverzeichnis und den alten Metadatenindex lesen.
3. Erst danach `sales_companies/<ID>` lesen.
4. Alle Jobs lesen, um lokale Kommunikationsaufträge zur Historie hinzuzufügen.

Im Modell sind das `3.189 + 1 + 1 + 1 + 1 = 3.193` Reads und 36 Firebase-Requests. Ein vorhandenes Browserverzeichnis wird hierbei nicht verwendet. Der direkte Klick startet keine HQ-Abfrage und schreibt nichts. Die Firma könnte mit einer gezielten Bestands-/Berechtigungsprüfung und einem Aktenabruf wesentlich günstiger geöffnet werden.

Ist die Firma nicht im Verzeichnis, wird zusätzlich die gesamte Ausgabenliste geprüft. Ist die Akte groß, werden zusätzliche Teile einzeln nacheinander gelesen. Testfirmen mit `draft_` verwenden einen anderen, kleineren Pfad; das darf nicht auf alle Kunden verallgemeinert werden.

Quellen: `SalesV1.gs` Zeilen 2–23; `Sales.gs` Funktionen `getSalesCompany`, `salesVisibleHistories_`; `SalesStorage.gs`.

## 4. Speichern und besondere Klicks

Die Tabelle enthält jeweils den gesamten normalen Oberflächenablauf einschließlich der anschließenden automatischen Nachladeaktionen. Ausnahmen und technische Fehler können den Ablauf früher beenden.

| Aktion | Reads im beschriebenen Modell | Writes | Zusätzliche Wirkung |
| --- | ---: | ---: | --- |
| Ziel/Termine einer Ausgabe speichern | 3.222 | 1 | Ein Ausgabedokument lesen/schreiben, anschließend vollständigen Zustand laden |
| Google-E-Mail-Freigaben speichern | 3.221 | 0 in Firestore | Nur Script Properties geändert; trotzdem unnötiger Vollabruf danach |
| Technische HQ-Firmensuche abschicken | 3.221 | 0 | Eine HQ-Abfrage, danach unnötiger Vollabruf; normale Kundensuche in der Kundenliste bleibt lokal |
| Neue TEST-Firma samt Kontakt speichern | 3.226 | 2 | Entwurf und Anlagejob schreiben, lokale Detailansicht und Vollabruf; kein HQ-Schreiben beim Speichern |
| Kundendetails ausdrücklich aus HQ aktualisieren | 6.384 | 2 | Bestandsprüfung, Akte/Verzeichnis schreiben, Akte erneut öffnen; im künstlichen Fall 5 HQ-Leseabfragen |
| Kundenhistorie ausdrücklich aus HQ aktualisieren | 9.577 | 1 | Mehrfache Verzeichnisprüfung, Akte neu schreiben und erneut öffnen; im künstlichen Fall 2 HQ-Leseabfragen |
| Beleg „Zuordnung ungeklärt“ / wieder zuordnen | 3.222 | 1 | Ausgabe markieren und Vollabruf; Ausgabenverknüpfung erfolgt erst im gesonderten Lauf |
| Vorschau eines gespeicherten Jobs | 2, bei Anlagejob 3 | 0 | Job und Entwurf; zusätzlicher Entwurfsabruf bei Anlagejob-Zusammenfassung |
| Kommunikation speichern | Fallabhängig: Entwurf, Anlagejob, bei Telefon/Treffen/Besuch auch Akte; danach Detailabruf und Vollabruf | 1 Job | Kein unmittelbarer HQ-Schreibzugriff; zusätzlicher Vollabruf entspricht erneut mindestens dem gesamten aktuellen Startzustand |
| Branche/Homepage einer TEST-Firma speichern | Drei Basisreads plus vollständiger aktueller Zustand | 1 Job | Vor dem Formular kommt bereits eine Kundenöffnung hinzu |
| HQ-Auswahllisten aktualisieren | Vollständiger aktueller Zustand danach | 1 Katalogdokument | Zusätzlich HQ-Leseabfragen auch aller Firmen/Kontakte zur Ermittlung von Branchen/Anreden |
| HQ-Unternehmen in den Bestand aufnehmen | Ein Verzeichniseintrag, ggf. alter Sammelindex, danach Vollabruf | 1 Verzeichniseintrag | Eine HQ-Firma lesen; Sicherheitsproben zusätzlich |
| HQ-Zuordnung prüfen / Auftrag ausführen / abgleichen / Konflikt lösen / E-Mail- oder Markerauftrag | Abhängig von Jobtyp, Phase, Konflikt und Wiederaufnahme; danach häufig Vollabruf und teils Akte/Vorschau | Mehrere Status-/Job-/Entwurfs-/Aktenwrites möglich | Kein seriöser fixer Gesamtwert ohne konkreten Testfall; diese Wege sind auf eigene Testfirmen beschränkt |

Die hohen Werte der ausdrücklichen Kundensynchronisation beruhen auf wiederholten Bestandsprüfungen im selben Klickablauf. Bei echten Kunden mit Projekten kommen weitere HQ-Leseabfragen hinzu. Aufgeteilte Dokumente erhöhen Reads/Writes zusätzlich.

Bei „Auswahl speichern“ in der Magazinverwaltung wird **jedes angehakte Projekt** gespeichert, auch ein unverändert bereits ausgewähltes. Pro ausgewählter Ausgabe: Laufstatus lesen, komplette Ausgabenliste lesen, Ausgabe schreiben; bei „aktuelle Verkaufsausgabe“ zusätzlich Präferenz schreiben. Zusätzlich wird das HQ-Projekt geprüft. Bei K ausgewählten und E gespeicherten Ausgaben entstehen so ungefähr `K × (1 + E)` Reads und K Writes, plus Präferenzwrites, Abwahlen und abschließendem Vollabruf. Neu hinzukommende Ausgaben verändern E während der Schleife. Abwahlen lesen Ausgabe/Laufstatus und schreiben die Ausgabe.

Quellen: `Sales.template.html` Funktion `act` mit `reload:true` und Submit-Handler; `SalesProjects.js` Funktion `importSelectedV1Projects`; `SalesV1.gs` Funktionen `saveSalesEditionConfig`, `saveSalesV1EditionSettings`, `syncSalesV1Company`, `syncSalesV1History`, `setSalesDocumentExcluded`; `Sales.gs` Speicher-/Jobfunktionen.

## 5. HQ-Sync und Ausgabenlauf

Ein regulärer HQ-Abgleich startet nur durch den Nutzer. Der installierte Minuten-Trigger setzt einen solchen Lauf fort und entfernt sich bei Abschluss/Pause. Er führt pro Ausführung bis zu ungefähr drei Minuten Arbeit aus; er ist kein regelmäßiger neuer Vollimport und kein Nachtstart. Überlappende Ausführungen werden per Lock begrenzt. Ob außerhalb des dokumentierten Standes alte Trigger installiert wurden, wurde hier nicht live ausgelesen.

Seit r19 werden nach einem vorhandenen Erstimport Änderungen aller sechs HQ-Datenarten mit Zeitfiltern gelesen; es wird nicht bei jedem Sync der gesamte HQ-Bestand neu importiert. Mengenabweichungen lösen keinen automatischen Vollimport aus. Die Verbesserungen sind vorhanden, beseitigen aber folgende Firebase-Kosten nicht:

| Abschnitt | Firebase-Lesen | Firebase-Schreiben |
| --- | --- | --- |
| Sync starten | Letzten Lauf, Cachemetadaten, Altimport, Jobs | Laufstatus, ggf. Migration/Altimportstatus |
| Jede HQ-Seite | Vergleichsstände der gelieferten Rohdatensätze; Journal danach nochmals lesen | Neue/geänderte Rohdatensätze, Journal **auch bei leerer HQ-Seite**, Status mehrfach |
| Ergänzende Einzelprüfungen | Je Datenart bis zu zehn gespeicherte Rohdatensätze zum Vergleich | Auch ohne Änderung Statusfortschritt; bei Änderung zusätzlich Journal/Rohdaten |
| Projektaufbereitung | Alle Projekte, Belege und Pläne einer betroffenen Gruppe | Nur betroffene Projektansichten; zusätzlicher Status |
| Kundenaufbereitung | Firmen, Kontakte, Historien, Belege, Projekte einer betroffenen Gruppe, zusätzlich referenzierte Rohprojekte und Projektansichten | Betroffene Kundenakte und Verzeichniseintrag jeweils vollständig |
| Ausgabenverknüpfung | Ausgaben, Projekte, Belege betroffener Projektgruppen | Die jeweilige Ausgabe mit Belegliste vollständig |
| Abschluss | Ausgaben erneut; teilweise Metadaten und weitere Prüfstände | Gemeinsame Cache-/Zählstände und Laufstatus |
| Browser beobachtet Lauf | Alle fünf Sekunden Status, bei Abschluss Vollabruf | Keine Writes durch Beobachtung |

Die Gruppen werden über `ID modulo 64` gebildet. Bei einer Firmenänderung liest die Kundenaufbereitung die zugehörige Gruppe aus fünf Sammlungen vollständig und holt deren Projektbezüge, bevor sie unveränderte Firmen beim Aufbau überspringt. Eine Änderung bedeutet deshalb weiterhin viele Reads. Derselbe Projektbezug kann in unterschiedlichen Firmengruppen mehrfach gelesen werden. Projektaufbereitung liest entsprechend drei Sammlungen einer Gruppe.

**Zusätzliche Statuswrites:** Der Worker speichert vor jedem Verarbeitungsschritt einen Heartbeat und danach den Fortschritt. Einzelne Schritte speichern dazwischen nochmals den gesamten Lauf. Mit bis zu 60 Einzelprüfungen ergeben sich zahlreiche Writes, obwohl keine fachlichen Daten geändert sind. Die angezeigte Spalte „Neu aus HQ gelesen“ misst keine Firebase-Reads; `stats.writes` zählt bearbeitete App→HQ-Aufträge, nicht sämtliche Firestore-Writes.

Offline nachgezählte Beispiele; kleine künstliche Bestände, keine Hochrechnung auf euren gesamten Sync:

| Szenario | Reads im Modell | Writes | Davon Metadatenwrites |
| --- | ---: | ---: | ---: |
| Erstimport mit zwei Firmen und sehr kleinen weiteren Sammlungen | 943 | 640 | 620 |
| Danach unverändert erneut abgleichen | 34 | 48 | 42 |
| In diesem kleinen Bestand eine Firma geändert | 45 | 53 | 44 |
| Unveränderter Folgeabgleich mit je zehn Datensätzen in allen sechs HQ-Datenarten, also 60 Einzelprüfungen | 142 | 154 | 148 |

Diese Werte enthalten echte Worker-Checkpointschritte im Modell, jedoch keine parallel geöffneten Beobachtungsseiten. Der Erstimport verteilt selbst winzige Mengen auf 64 Projekt-/Firmengruppen und jeweils 65 Zuordnungsprüfungen für Kontakte/Historie; daher hoher fixer Aufwand. Ein reales, großes oder in Teile aufgeteiltes Statusdokument kann den Aufwand weiter erhöhen. Eine Datensatzänderung allein rechtfertigt keine pauschale „1 Read, 1 Write“-Annahme.

„Ausgaben aus Firebase verknüpfen“ verwendet vorhandene Rohdaten; es startet keine HQ-Abfragen. Es prüft zunächst alle Ausgaben auf neue/geänderte Zuordnungen, verarbeitet betroffene Projektgruppen und liest am Schluss die Ausgabenliste erneut für die Abnahme. Die Zahl der Reads hängt von Belegen je betroffener Gruppe und Teilpaketen ab; mindestens ein Write je tatsächlich verknüpfter Ausgabe plus Statuswrites. Ein Aufruf ohne vorgemerkte Ausgaben endet nach den Vorprüfungen mit einem Hinweis.

Quellen: `SalesWorker.gs`, `SalesBulkSync.gs`, `SalesBulkStore.gs`, `SalesDelta.gs`.

## 6. Zusätzliche Ursachen für Wartezeit und Speicherwachstum

| Befund | Auswirkung |
| --- | --- |
| Listen werden nacheinander in 100er-Seiten geladen | Mehrere Dutzend Netzwerkwartezeiten für eine kleine Aktion |
| Dienstkonto-Token wird pro Apps-Script-Ausführung neu angefordert | Zusätzlich ein OAuth-Netzwerkaufruf vor dem ersten Firebase-Zugriff; kein Firestore-Read. `salesContextCache_` spart nur innerhalb derselben Ausführung |
| Bedienaktion setzt global `busy` und baut die Ansicht neu auf | Menüpunkte werden während des Abrufs gesperrt; der Minutenabruf fühlt sich wie eine Unterbrechung an |
| Kunden-/Ansprechpartnerlisten ohne Begrenzung | Tausende HTML-Zeilen; mehr Browserarbeit auch bei 0 neuen Reads |
| Umsatzberechnung je angezeigtem Kunden durchsucht erneut die Belegliste | Im Magazinverkauf ungefähr Firmenzahl × Belegzahl Schleifenarbeit |
| Buchungshistorie bildet je Beleg erneut die gesamte Firmenliste | Zusätzliche vermeidbare Browserarbeit |
| Kundenakte liefert komplette Historie und Projekte | Keine Begrenzung auf die erste sichtbare Seite; große Akten langsamer |
| Vollabruf-Timeout nach 45 Sekunden bricht den Server nicht ab | Späte Antwort wird ignoriert; ein späterer Abruf kann zusätzliche Arbeit starten, während der alte Serverlauf noch läuft |
| Aufträge/Entwürfe bleiben in den vollständigen Listen | Mit weiterer Nutzung wachsen die Kosten von Start und Kundenöffnung |
| Große JSON-Objekte werden ab 650.000 Bytes aufgeteilt | Root plus `ceil(JSON-Zeichen / 100.000)` Teilpakete; einzeln nacheinander gelesen/geschrieben |
| Alte Generationen in `sales_chunks` werden im Appcode nicht aufgeräumt | Wiederholtes Speichern großer Objekte lässt unreferenzierte Teile liegen |
| `sales_imports`-Journale werden nicht aufgeräumt | Nach abgeschlossenen Läufen bleibt zusätzliches Importmaterial gespeichert |
| Rohdaten, Kundenakten, Verzeichnis, Projektansichten und Ausgaben enthalten teilweise dieselben Inhalte | Beabsichtigte Leseansichten brauchen Speicher und gezielte Aktualisierung; aktuell teils unnötige Doppelübertragung |

Teilpaketprüfung mit 710.000 Textzeichen: ein Schreiben erzeugte acht Teile plus Root, also neun Writes. Ein Lesen brauchte neun Reads. Nach erneutem Schreiben lagen 16 Teilpakete vor; acht gehörten zur alten Generation. Ein künstlich entsprechend vergrößertes Sync-Statusdokument benötigte auch für den kleinen Statusaufruf neun Reads. Die tatsächliche heutige Größe eures Statusdokuments wurde nicht aus Firebase gelesen.

Es wurde **keine automatische Löschung** vorgenommen. Eine spätere Bereinigung muss aktuelle Roots, laufende Importe, Wiederaufnahmejournale und noch benutzte Generationen schützen und eine angemessene Aufbewahrungszeit berücksichtigen.

## 7. Separater alter Firebase-Pilot

Die eigenständige Seite in `firebase-pilot/public` ist ein anderer Weg als das Apps-Script-Dashboard:

- Anmeldung bzw. „Frisch laden“ liest einmal `pilot/current` und danach K Snapshot-Datenblöcke: `1 + K` Datenreads, zusätzlich mögliche Freischaltungs-Regelreads für `pilot_access`.
- Filter, Zeitraum, Sortierung und Seitenwechsel laufen danach lokal; keine Writes durch diese Seite, kein regelmäßiger Nachladetimer.
- `syncFirebasePilot()` erzeugt einen vollständigen neuen Pilotsnapshot: ein Zeigerread, K neue Snapshotwrites und ein Zeigerwrite, ggf. Liste/Deletes des vorvorherigen Snapshots. Dies ist kein sparsamer Änderungsabgleich der Haupt-App.
- `installFirebasePilotNightlySync()` kann den alten Pilot um etwa 03:00 Uhr planen. Ob dieser alte Trigger derzeit installiert ist, ist nicht live geprüft; der dokumentierte Stand sagt keinen regelmäßigen Nachtlauf zu.
- Die 1-Sekunden-Timer in der HQ-Testoberfläche aktualisieren nur den Fortschrittstext; sie fragen Firebase nicht jede Sekunde ab.

Quellen: `firebase-pilot/public/app.mjs`, `firebase-pilot/firestore.rules`, `hq-benchmark/FirebaseSync.gs`, `hq-benchmark/Index.html`.

## 8. Größenordnung des Tagesverbrauchs

Im beschriebenen Firmen-/Ausgabenmodell, ohne weitere Nutzung und ohne zusätzliche Teile:

| Beispiel | Modellierte Reads |
| --- | ---: |
| 16 vollständige Abrufe | 51.536 |
| Eine Stunde „Mein Tag“ mit 60 Timerabrufen, ohne Erstabruf | 193.260 |
| 16 Kundenöffnungen | 51.088 |
| Zehn Personen öffnen die App einmal | 32.210 |
| Diese zehn Personen erhalten zusätzlich je einen Minutenabruf | zusammen 64.420 |
| Eine Stunde reine Statusbeobachtung bei 5-Sekunden-Abstand und einteiligem Status | 720 |

Damit ist der dokumentierte schnelle Kontingentverbrauch bereits ohne neue Buchungen oder HQ-Abgleich erklärbar. Ein aktiver einzelner „Mein Tag“-Tab kann das freie Lesebudget im Modell in ungefähr einer Viertelstunde verbrauchen. Das ist eine Szenariorechnung, keine Feststellung, wann das reale Kontingent heute endet.

## 9. Reihenfolge der Optimierung – Vorschlag, noch nicht umgesetzt

| Priorität | Änderung | Prüfkriterium |
| --- | --- | --- |
| 1 | Vollständigen Minutenabruf entfernen; allenfalls kleinen Änderungszeiger kontrolliert lesen, nur im sichtbaren Tab | Im Leerlauf kein Vollscan und keine blockierte Navigation; keine Writes nur für Anzeige |
| 1 | Kundenbestand direkt über Kennung prüfen; Akte und zugehörige offene Kommunikationsjobs gezielt holen | Keine komplette Verzeichnis-, Entwurfs- oder Jobliste bei normaler Kundenöffnung; Ziel wenige Reads plus tatsächliche Aktenseiten/Teile |
| 1 | Globale Nachladeaktionen nach Speichern ersetzen | Nur geänderte Ausgabe, Job, Entwurf bzw. Kunde aktualisiert; kein unerwarteter Startabruf |
| 2 | Startseite als kleine Übersicht/Summen aufbauen | Startkosten hängen nicht von sämtlichen Kunden/Kontakten/Belegen ab; Ziel höchstens etwa zehn kleine Dokumentreads vor den ersten Listenseiten |
| 2 | Kunden/Kontakte/Historien gezielt und seitenweise laden; geeignete Suchfelder außerhalb des JSON-Payloads bereitstellen | Begrenzte Ergebnismengen, Cursor, verständlicher Ladezustand; bisherige Such-/Historienfilter fachlich erhalten |
| 2 | Autorisierten Daten-Cache und gezielte Aktualisierung vorsehen | Wiederöffnung vermeidet gleiche Abrufe; Änderungen anderer Personen erkennbar, Freigaben weiter bei jedem Serveraufruf prüfen |
| 2 | Browserberechnungen einmal vorberechnen und Listen begrenzen | Keine Umsatz-Neuberechnung über alle Belege je Kundenzeile; keine mehrfach neu gebildete Firmenliste pro Beleg |
| 3 | Kompakten Sync-Status vom großen Wiederaufnahmezustand trennen | Statusbeobachtung liest ein kleines Dokument; Checkpoints bleiben nach Abbruch zuverlässig |
| 3 | Leere Seitenjournale vermeiden; Checkpoint-/Heartbeatwrites begrenzen, mehrere Prüfungen sinnvoll bündeln | Fachlich unveränderter Sync erzeugt deutlich weniger Writes; verlorene Antworten/rechtegeprüfte Wiederaufnahme weiter getestet |
| 3 | Nur benötigte Rohdaten/Bezüge bei geänderten Kunden aufbereiten | Weniger Reads als gesamte Zuordnungsgruppe; vollständige Zuordnungen und Mengenprüfung erhalten |
| 3 | Aufbewahrung für abgeschlossene Journale/alte Teile und Jobs einführen | Kontrollierter Speicherzuwachs; kein Löschen laufender oder noch referenzierter Generationen |
| 4 | Verbrauch pro Aktion ohne Kundeninhalte sichtbar zählen und zehn Personen samt Schreibkonflikten prüfen | Belastbares Tagesbudget und echte Laufzeiten erst nach Messung freigeben |

Erfolgskriterien sind vorgeschlagene Ziele, keine bereits erreichten Messwerte. Eine Teamfreigabe oder ein Tarifwechsel wurde damit nicht eingerichtet. Der größte kurzfristige Nutzen liegt in den ersten drei Änderungen; sie adressieren unmittelbar die beiden gemeldeten Wartezeiten und den größten bekannten Leseverbrauch.

## Reproduzieren und weiterer Arbeitsstand

- Im Projektordner `node scripts/audit-firestore.cjs` ausführen; erwartet werden erfolgreich geprüfte Modellzahlen. Bei einer Assertion-Abweichung zuerst den Code-/Modellstand prüfen.
- Das lokale Protokoll `output/firestore-audit-2026-10-16.json` öffnen, wenn die Aufschlüsselung je Sammlung benötigt wird. Es enthält ausschließlich künstliche Mengen und bleibt vom Git-Upload ausgeschlossen.

Keine Aktion im produktiven Dashboard ist für diese Untersuchung erforderlich. Das Messskript und dieser Bericht werden mit Projektüberblick, Changelog und Tagebuch nach GitHub gesichert. Google-Version, Script Properties, Trigger und Bereitstellungseinstellungen bleiben unverändert. Die Umsetzung der Optimierungen ist der nächste App-Arbeitsschritt; dieser Bericht setzt sie nicht bereits um.
