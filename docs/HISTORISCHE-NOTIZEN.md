# Historische Notizen (zusammengefasst am 24.11.2026)

Diese Datei fasst frühere lose Notizen zusammen, die bisher nicht eingecheckt im Ordner `docs` lagen. Auf Wunsch des Nutzers vom 24.11.2026 stehen sie jetzt in einer Datei, damit der Arbeitsordner für Veröffentlichungen sauber bleibt. Die Inhalte sind historisch und ersetzen weder `PROJEKTUEBERBLICK.md` noch das Projekttagebuch. Maßgeblich bleibt der aktuelle Code. Unveränderte Originale liegen außerhalb des Repositorys im Ordner `Sicherung-Doku-2026-11-24` neben `MeineWebApp`.

## 0. Frühere lokale Ergänzung zu START-HIER.md (Stand 25.09.2026)

Eine lokale, nicht eingecheckte Fassung von `docs/START-HIER.md` enthielt zusätzlich diesen inzwischen überholten Hinweis (manuelle Übergabe; ersetzt durch den Veröffentlichungsablauf vom 16.10.2026):

> **Neu: manuelle Übergabe der Apps-Script-Dateien.** Der erste Sales-Datenpilot wurde inzwischen als Version 8 unter der bestehenden App-Adresse bereitgestellt; die neuen Datenwege sind noch live zu prüfen. Künftige Dateien überträgt der Nutzer selbst. Die passende aktuelle Anleitung steht in [MANUELL-UEBERTRAGEN.md](../sales-app/MANUELL-UEBERTRAGEN.md). Die folgenden Abschnitte bewahren die früheren Einrichtungsschritte.

## 1. App-Übersicht – frühere Demo und nächste Schritte (Stand 23./24.09.2026)

Stand: 23. September 2026. Grundlage ist der tatsächlich geprüfte Code von `Sales-Markatus-Demo.html`, nicht allein das Fachkonzept. Die interaktive Übersicht in der zugehörigen Codex-Unterhaltung zeigt Klickwege, Verknüpfungen und Roadmap im dunklen/hellen Stil der App.

**Zum jederzeitigen Öffnen auf dem PC:** [Sales-Markatus-Uebersicht.html](../Sales-Markatus-Uebersicht.html) per Doppelklick im Browser öffnen. Die einzelne Datei enthält alle Inhalte und funktioniert ohne Internet oder Server. Diese Übersicht erklärt die App; die separate Präsentationsdemo dient zum Durchspielen der Eingabeabläufe.

**Erweiterung vom 24.09.2026 – Roadmap selbst planen:** Unter „Roadmap“ stehen nun alle 24 vorgegebenen Punkte in einer gemeinsamen Liste: R01–R11 sowie N01–N13. Rechts an jedem Punkt lassen sich Priorität (höchste, hoch, mittel, niedrig oder noch nicht priorisiert) und geplantes Update (1–5, später oder offen) wählen. Eine Prioritätsänderung sortiert die gesamte Liste sofort; bei Gleichstand bleibt die ursprüngliche Reihenfolge erhalten. Die Update-Auswahl ist davon unabhängig. Alle Punkte starten ohne vorgegebene Priorisierung.

Unter der Liste lassen sich eigene Punkte mit Titel, optionaler Beschreibung, Priorität und Update erfassen. Eigene Punkte können aufgeklappt, bearbeitet und nach Bestätigung entfernt werden. Darstellung, offene Details, eigene Punkte und Planung werden nach Möglichkeit lokal im jeweiligen Browser gespeichert; die ursprüngliche HTML-Datei wird dadurch nicht überschrieben. Ist Browserspeicherung blockiert, erscheint ein Hinweis.

**Zum Sichern oder Weitergeben:** „HTML mit Planung speichern“ erstellt eine neue einzelne HTML-Datei, in der die aktuellen eigenen Punkte, Prioritäten und Updates enthalten sind. Diese Kopie lässt sich auch in einem anderen Browser oder auf einem anderen PC öffnen. Ein bloßes Kopieren der ursprünglichen HTML übernimmt hingegen keine nur im Browser gespeicherten Änderungen.

### Was in der Demo schon bedienbar ist

| Einstieg | Was sichtbar ist | Wichtige Klickwege |
| --- | --- | --- |
| Mein Tag | Fällige Wiedervorlagen, vier Magazine, offene Redaktionsmeldungen, Beispielkunden unter „Zuletzt bearbeitet“ | Kunde öffnen, Kontakt erfassen, Magazin-Arbeitsliste öffnen, Buchungen oder Wiedervorlagen aufrufen |
| Magazinverkauf | Vier Magazine mit festen Zielausgaben, vier Arbeitslisten, Ansprachegrund, bisherige Ausgabe, letzter Kontakt, Betreuer | Kunde öffnen, Buchung erfassen, andere Betreuer ausblenden, eine Ansicht merken/laden |
| Kunden | Firmenliste; Suche auch über Ort, Branche, Personenname und E-Mail | Kundenkarte öffnen, neue Firma anlegen |
| Kundenkarte | Überblick mit Adresse und Ansprechpartnern, Kontakthistorie, Buchungen | Person öffnen, Gespräch oder Buchung erfassen, zwischen den drei Bereichen wechseln |
| Ansprechpartner | Personenliste, Funktion, Firma, fester Betreuer | Personenkarte und Firma öffnen |
| Personenkarte | Telefonnummer, E-Mail, Betreuer, persönlich zugeordnete Gespräche und Buchungen | Gespräch erfassen, zum Unternehmen zurückkehren |
| Kontakt erfassen | Art, Ergebnis, Datum, Person, Kontext, Notiz und optionales Wiedervorlagedatum | Lokal speichern; anschließend erscheint der Kontakt in der Kundenhistorie |
| Buchung erfassen | Kunde, optionale Person, Magazin/Ausgabe, zwölf Leistungen, Listenpreis, tatsächlicher Nettopreis, Datum, Paketbezeichnung und Notiz | Auch ohne Angebot speichern; Sonderpreis möglich |
| Buchungen | Gesamtübersicht mit Magazinfiltern, nächsten Ausgaben, offenen Redaktionsmeldungen, Herkunft und Preis | Firma öffnen, Buchung erfassen, Redaktionsvorschau öffnen |
| Redaktion | Vorschau des Buchungsstands mit Beispiel-Empfänger und Meldestatus | Versand simulieren, zur Buchungsliste zurückkehren |
| Wiedervorlagen | Offene Termine für heute und später, Firma, Kontext und Beispielergebnis | Firma öffnen, Gespräch erfassen, erledigen |
| Verwaltung | Lokal speicherbare Erscheinungstermine sowie Vorschau/Erklärung zum HQ-Abgleich | Termine speichern, HQ-Test-Infoseite öffnen |

Zusätzlich vorhanden: dunkle/helle Ansicht, größere Schrift, mobile Anordnung, lokale Speicherung und Rücksetzen der Demo.

### Wie die Bereiche zusammenhängen

- **Firma ↔ Ansprechpartner:** Eine Firma hat mehrere Personen; jede Personenkarte verlinkt zurück zur Firma.
- **Gespräch → Historie:** Neue Notizen erscheinen beim Kunden und bei zugeordneter Person auch dort.
- **Gespräch → Wiedervorlage → Mein Tag:** Ein gesetztes Folgedatum erscheint in der offenen Liste und bei Fälligkeit auf der Startseite.
- **Buchung → Kunde + optionale Person + Magazin/Ausgabe:** Derselbe Abschluss ist aus mehreren Ansichten erreichbar.
- **Buchung → Arbeitsliste:** Zur Zielausgabe gebuchte Kunden fallen aus den Ansprachelisten heraus; über „Alle Kunden“ bleiben sie erreichbar.
- **Buchung → Redaktionsvorschau → Meldestatus:** Simulierter Versand setzt den lokalen Status auf gemeldet und entfernt den Eintrag aus dem Filter „Redaktion noch informieren“.

Ein typischer Weg: Magazinverkauf → Kunde öffnen → Vorgeschichte lesen → Gespräch dokumentieren → Wiedervorlage oder Buchung → Redaktionsvorschau. Die kurzen Wege sind bereits nachvollziehbar; eine bewiesene Zeitersparnis oder vollständige Alltagstauglichkeit ergibt sich daraus noch nicht.

### Grenzen der Demo

Die Demo enthält sechs vorgegebene Firmen und sieben Ansprechpartner. Alle Inhalte einschließlich der mit „HQ-Rechnung“ beschrifteten Historie sind erfunden. Es gibt hier keinen echten Login, keinen HQ-Zugriff, keinen E-Mail-Versand und keinen gemeinsamen Datenbestand zwischen Geräten. Änderungen werden nur im jeweiligen Browser gespeichert; nach Neuladen bleiben höchstens zwölf neue Aktivitäten und 15 Buchungen erhalten.

„Heute“ ist fest auf den 22.09.2026 gesetzt. „Zuletzt bearbeitet“ und einige Angaben wie letzter Kontakt bzw. Ergebnis sind Beispielwerte. Neue Gesprächsergebnisse aktualisieren noch nicht zuverlässig die Arbeitslisten oder eine Kontaktsperre. Telefonnummer und E-Mail sind reine Textangaben. Firmenneuanlage ist möglich, bestehende Firmen und Personen bearbeiten oder Personen anlegen noch nicht. Buchungsänderungen/-storno, freie Filterkombinationen, direkte Terminverschiebung, echte Rollen, vollständige Paketkalkulation und durchgängige Terminlogik fehlen. Die Verwaltungsbeschriftung „Nur für Administratoren“ ist keine Zugriffskontrolle.

**Separater technischer Stand:** Der Firebase-Lesepilot mit echten HQ-Daten und Google-Anmeldung wurde bereits ausgeführt; der erste Listenaufbau dauerte in einem einzelnen Browser rund 1,35 Sekunden. Er ist noch nicht mit der gesamten Sales-Demo verbunden. Zwei-PC-Test und fachlicher Rechnungs-/Gutschriftenabgleich sind weiterhin offen. Maßgeblich ist der jüngste Tagebucheintrag, da ältere Statuszeilen vor diesem Test entstanden sind.

### Bestehende Roadmap

Die vollständige, weiterhin gültige Liste R01–R11 steht in [PROJEKTTAGEBUCH-UND-ROADMAP.md](PROJEKTTAGEBUCH-UND-ROADMAP.md). Der Wegweiser übernimmt alle elf Punkte samt Herkunft; bisherige Konzeptvorschläge werden nicht als beschlossene Nutzerwünsche ausgegeben.

Vor dem späteren Ausbau ist der interne Pilot fertigzustellen: gemeinsame Speicherung und Nutzerrechte; vollständige Kunden-/Personenpflege, Excel-Import und Historie; zuverlässige Status-/Kontaktpausenlogik und Filter; Buchungsänderung und Storno; echte Redaktionsmeldungen; HQ-Rechnungszuordnung ohne Doppelzählung; Ausgaben-/Preisverwaltung, Konfliktklärung, Änderungsprotokoll und Sicherung. Rechnungen bleiben manuell in HQ. Die vorgeschlagene Reihenfolge ist keine verbindliche Terminplanung.

### Neue Vorschläge vom 23.09.2026

Diese Ideen wurden für die Übersicht entwickelt. Sie sind **nicht beauftragt oder implementiert**:

| ID | Idee | Nutzen |
| --- | --- | --- |
| N01 | Letzte Buchung als Vorlage für die nächste Ausgabe übernehmen; Kunde, Kontakt und Format vorbelegen, Preis und Ausgabe vor Speichern prüfen | Wiederkehrende Schaltungen schneller vorbereiten |
| N02 | Zeitlich begrenzte Urlaubsübergabe ausgewählter Wiedervorlagen mit Gesprächskontext, ohne die dauerhafte Betreuerzuordnung zu ändern | Nachfassen während Abwesenheiten absichern |
| N03 | Freigegebene Mediadaten und vorbereiteten Mailtext direkt an der Ausgabe anbieten; Versand bewusst auslösen | Richtige Unterlagen ohne Dateisuche griffbereit haben |

Empfehlung: erst den gemeinsamen Kernablauf im Pilot zuverlässig machen, anschließend N01 mit Stammkunden testen. Die Nutzerentscheidung dazu steht aus.

## 2. Echtdaten-Pilot: Apps Script, Firebase und HQ (Anforderungsaufnahme 24.09.2026)

Stand: 24.09.2026. Anforderungsaufnahme vor Umsetzung. Die folgenden Nutzerwünsche sind noch keine implementierten Funktionen. Zugangsdaten und echte Kundeninhalte werden hier nicht festgehalten.

### Bestätigte Entscheidungen vom 24.09.2026

Diese Antworten ersetzen die offenen fachlichen Fragen weiter unten; diese bleiben als Gesprächshistorie erhalten.

- Zugang ausschließlich für ausdrücklich freigegebene E-Mail-Adressen, leicht erweiterbar. Ein erster Administrator wurde benannt; die konkrete Adresse steht nur in der App-Konfiguration, nicht hier.
- Eine separate Testfirma muss noch angelegt werden, möglichst über die App. Firmen der gewählten COBURGER-Ausgabe #70 sind ausschließlich Lese-Testdaten. HQ-Schreibtests dürfen nur selbst angelegte Testfirmen betreffen.
- Rechnungen und Projektdaten werden ausschließlich gelesen und niemals nach HQ geschrieben.
- Umsatzdefinition bestätigt: netto, ausgestellte auch unbezahlte Rechnungen, Gutschriften/Stornos korrekt berücksichtigen, keine Entwürfe. Kostenlose Schaltungen und vollständig gutgeschriebene tatsächliche Teilnahmen sind nach vorläufiger Einschätzung des Nutzers nicht vorhanden; keine endgültige Aussage über alle historischen Daten.
- Rechnungsempfänger vorläufig als Inserent behandeln. Rechnungen über mehrere Ausgaben existieren, ihre Aufteilung ist ausdrücklich für später zurückgestellt. Aktuelle Auswertungen weisen diese Grenze aus.
- Konflikte zwischen HQ und App anzeigen und vom Nutzer entscheiden lassen.
- Ausgabeziele und Termine zunächst ausschließlich in App/Firebase.
- Verantwortlichen HQ-Benutzer zunächst manuell auswählen. Später werden App-Nutzer ohne HQ-Konto benötigt; deren Zuordnung bleibt als offene Roadmap-Anforderung erhalten.
- Alle übrigen vorgeschlagenen Vorgehensweisen wurden grundsätzlich akzeptiert. Technische API-Zuordnungen und echte Ergebnisse bleiben zu prüfen.

### Verbindlich gewünschter nächster Ausbau

Die lokale `Sales-Markatus-Demo.html` soll mit ihrer bestehenden Gestaltung und Bedienung als Google-Apps-Script-Web-App mit echten Daten laufen. Fake-Daten müssen aus der angebundenen App einschließlich Kennzahlen, Beispielnutzern und lokal wiederhergestellten Demo-Datensätzen entfernt werden. Fehlende Daten werden als leer, noch nicht geladen oder unvollständig kenntlich gemacht. Keine ersatzweise Anzeige erfundener Werte.

Firebase/Cloud Firestore ist für diesen Ausbau die gemeinsame Datenbank. Apps Script stellt die App und die serverseitige HQ-Anbindung bereit. Der bereits vorhandene Firebase-Lesepilot ist eine Grundlage, aber noch nicht das benötigte fachliche Datenmodell.

#### Testseite und Datenweg

1. Der Nutzer stellt in der integrierten Testseite eine Anfrage.
2. Die App fragt Firebase ab; noch nicht importierte Daten dürfen fehlen.
3. Ein bewusst gestarteter HQ→Firebase-Transfer lädt die benötigten Daten. Er entspricht dem späteren Nachtlauf.
4. Die App liest anschließend erneut aus Firebase und zeigt das Ergebnis.

Auch der Rückweg wird getestet: App→Firebase→bewusst gestarteter Abgleich→HQ. Die sofortige Testausführung ersetzt nur die nächtliche Wartezeit; Firebase bleibt Teil des Weges. Ein normaler Datenabruf soll fehlende Daten nicht heimlich direkt aus HQ anzeigen.

### Gewünschte Daten

| Bereich | Gewünschte Inhalte und Regeln |
| --- | --- |
| Unternehmen | Unternehmensname, Kundennummer, Branche, verantwortlicher HQ-Benutzer, Homepage, Beschreibung |
| Adressen | Standardadresse bevorzugen; Rechnungsadresse als mögliche Alternative. Beide Typen und ihre HQ-IDs getrennt erhalten, damit spätere Änderungen das richtige Adressobjekt treffen. Verhalten ohne Standardadresse noch fachlich bestätigen. |
| Bestehende eigene HQ-Felder | Kundenklassifizierung und Kundenherkunft |
| Neues Feld Adressherkunft | In der App jetzt vorsehen; in HQ später anlegen. Auswahl: Wirtschaftsclub Bamberg, Logan Five, Sonstige. Bei Sonstige ein Freitextfeld anzeigen. HQ-Feldtyp und spätere Speicherung noch abstimmen; Kundenherkunft bleibt ein separates Feld. |
| Kundenart | Kunde oder Interessent; bei Neuanlage standardmäßig Interessent. HQ-Zuordnung und mögliche Mehrfachtypen prüfen. |
| Alle Ansprechpartner je Unternehmen | Vorname, Nachname, Position, Anrede, E-Mail, Mobiltelefon, Festnetztelefon |
| Kontakt-Historie | Vorhandene HQ-Historie übernehmen; künftig in der App erfasste Kontakteinträge zurück nach HQ synchronisieren. Exakte HQ-Entität, Typen, Autor und Zeitbezug noch untersuchen. |
| Projektübersicht je Unternehmen | Projektnummer, Projektname, Projektstatus, Gesamtumsatz aus zugehörigen Rechnungen. Kleine Übersicht über bisherige Zusammenarbeit. |
| Magazin-Historie | Je Magazin und Ausgabe die zugeordneten Unternehmen samt Rechnungsbeträgen; Quelle sind Rechnungen in Sammelprojekten. Zunächst genau ein vom Nutzer benanntes Pilotprojekt. Historische Quellenkennungen später in geschützter App-Konfiguration verwalten, nicht in Projektdokumentation. |
| Ausgabe | Nachträglich änderbarer Zielumsatz, Anzeigenschluss, Drucktermin und Veröffentlichungsdatum; Redaktion muss diese Angaben ändern können. Zieländerung soll auf den Dashboards aller zugehörigen Vertriebler sichtbar werden. |
| Nutzer | Anmeldung mit persönlichem Google-Konto; zunächst gemeinsamer App-Zugriff, später Verwaltung von Sicht- und Bearbeitungsrechten. Zulässige Pilotkonten und Kontoarten noch festlegen. |
| Magazinverkauf | Später vielfältige Filter. Explizit gewünscht: früher vertreten, aber in der letzten Ausgabe nicht; mindestens einmal in den letzten fünf Ausgaben vertreten. Bezugsausgabe und Definition von vertreten noch klären. |

Die genannten HQ-Daten sollen grundsätzlich les- und schreibbar werden. Der genaue Schreibumfang für Projekte und insbesondere Rechnungen/abgeleitete Umsätze ist offen: Bisher sollen Rechnungen weiterhin manuell in HQ entstehen. Summen sind berechnete Werte und kein eigenständig zu überschreibendes HQ-Feld. Diese Spannung vor Finanz-Schreibfunktionen klären.

Neue Unternehmen sollen mit Adresse und Ansprechpartnern vollständig in der App angelegt werden können. Falls HQ zuerst ein Unternehmen verlangt, bleibt die Anlage in Firebase gespeichert; der Abgleich legt zuerst das Unternehmen an, speichert dessen HQ-ID und übermittelt anschließend abhängige Ansprechpartner/Adressen. Die genaue Reihenfolge und Pflichtfelder sind an der API zu prüfen, noch nicht bestätigt.

### Vorschlag für Datenstruktur und Abgleich – noch nicht beschlossen

- Eigene Datensätze für Unternehmen, Ansprechpartner, Adressen, Kontakthistorie, Projekte, Magazine, Ausgaben und Belege. Stabile App-IDs und separate HQ-IDs samt eindeutigem Mandanten-/Subsystembezug verwenden.
- Eine Ausgabe wird ausdrücklich mit ihrem HQ-Sammelprojekt verknüpft. Keine dauerhafte Zuordnung allein über Projektnamen oder Kundennamen.
- Belege einzeln mit HQ-Beleg-ID, Empfänger-Unternehmens-ID, Projekt-/Ausgabenbezug, Datum, Typ, Status, Währung und Betrag speichern. Nur benötigte Informationen übernehmen.
- Daraus pro Unternehmen und Ausgabe eine Zusammenfassung bilden: Nettoumsatz, Beleganzahl, zugrunde liegende Beleg-IDs und fachlich definierter Teilnahmestatus. Mehrere Rechnungen derselben Firma zusammenfassen, Quellen behalten. Storno/Gutschrift anhand bestätigter HQ-Semantik behandeln; keine doppelte Kürzung oder Doppelzählung bei erneutem Import.
- Rechnungsempfänger ist laut Nutzer die erste Zuordnungsquelle. Abweichender tatsächlicher Inserent, Sammelrechnungen und projektübergreifende Positionen müssen bei Bedarf gesondert zugeordnet werden.
- App-Buchungen getrennt von fakturierten Umsätzen führen und mit späteren Belegen abgleichen. Rechnung und App-Buchung dürfen denselben Verkauf nicht doppelt zählen.
- Vollständigkeit des Imports je Ausgabe speichern. Fehlende Daten bedeuten nicht, dass ein Unternehmen dort nicht vertreten war. Historische Filter erst bei ausreichender Datenabdeckung als verlässlich ausweisen.
- Ausgabeziele/Termine zunächst in Firebase verwalten. Zieländerung mit altem/neuem Wert, Zeitpunkt und Bearbeiter dokumentieren; beteiligte Nutzer erhalten aktuelle Werte und sichtbaren Änderungshinweis. Ob diese Angaben zusätzlich in HQ landen sollen, ist offen.
- Änderungen aus der App zunächst gemeinsam in Firebase speichern und einen nachvollziehbaren Synchronisationsauftrag erzeugen. Status beispielsweise offen, in Bearbeitung, synchronisiert, Konflikt oder Fehler.
- Vor HQ-Änderungen den letzten gemeinsam bestätigten Stand mit dem aktuellen HQ-Stand vergleichen. Überschneidende Änderungen am selben Feld zur Entscheidung zurückhalten; offene App-Änderungen nicht beim Import überschreiben. Dies ist die vorgeschlagene Konfliktregel, noch keine Nutzerentscheidung.
- Abhängige Anlagen schrittweise abarbeiten. Erneute Ausführung darf keine doppelten Firmen, Kontakte oder Historieneinträge erzeugen. Bei unklarer Antwort nach einem Schreibaufruf zuerst in HQ prüfen, bevor eine Anlage erneut versucht wird.

### Vorgeschlagener sicherer Schreibtest

Der Nutzer verlangt ausdrücklich besondere Sorgfalt bei Zielobjekten und Feldzuordnungen. Vorgeschlagen:

1. Lesetest und Zuordnungstabelle: App-Feld, HQ-Objekt, HQ-Feld, Typ, erlaubte Werte, Lese-/Schreibfähigkeit und Pflichtfelder prüfen. HQ v2 bleibt Ausgangspunkt; keine Schreibfähigkeit aus erfolgreichem Lesen ableiten.
2. Vorschau ohne HQ-Schreibaufruf: Zielunternehmen/ID, Zielkontakt/ID, alte und neue Werte sowie Abhängigkeiten sichtbar darstellen. Dies prüft den geplanten Auftrag, noch nicht seine Annahme durch HQ.
3. Erster echter Schreibtest ausschließlich mit ausdrücklich dafür bestimmten Testobjekten oder einem Testmandanten. HQ-Schreibfunktionen zunächst auf diese Ziele begrenzen; keine Lösch-, Rechnungs- oder Massenänderungen als Teil dieses Tests.
4. Nach der Übertragung dasselbe Objekt aus HQ zurücklesen und Feldwerte sowie Verknüpfungen vergleichen; anschließend den bestätigten Stand in Firebase und App anzeigen.
5. Wiederholung, Unterbrechung nach Firmenanlage, fehlende Kontaktanlage, unklare API-Antwort und konkurrierende Änderung prüfen. Erst danach den entsprechenden Schreibpfad ausweiten.

### Offene fachliche Fragen an den Nutzer

1. Pilotzugang: ausschließlich eigene Google-Workspace-Firmenkonten oder bereits private/externe Google-Konten? Vorschlag: zunächst nur explizit freigeschaltete Pilotkonten, noch keine differenzierten Vertriebsrollen.
2. HQ-Testumgebung: eigener Testmandant vorhanden? Andernfalls klar gekennzeichnete Testfirma mit Testkontakt für echte Schreibversuche vorsehen. Keine Erlaubnis zur Erstellung oder Änderung echter Testobjekte aus diesem Dokument ableiten.
3. Schreibumfang: zunächst Unternehmen, Adressen, Ansprechpartner und Kontakt-Historie zurückschreiben; Projekte und Rechnungen nur lesen? Oder ausdrücklich auch Projekt-/Finanzdaten bearbeiten?
4. Umsätze: netto nach Gutschriften/Stornos, ausgestellte Rechnungen auch unbezahlt, Entwürfe ausgeschlossen? Bedeutung der HQ-Statuswerte und Vorzeichen an Beispielen bestätigen.
5. Magazin-Historie: Ist Rechnungsempfänger stets Inserent und jede Rechnung genau einer Ausgabe zugeordnet? Gibt es Agentur-Rechnungsempfänger, Pakete über mehrere Ausgaben, Null-Euro-Schaltungen oder vollständig gutgeschriebene Buchungen? Wann gilt eine Firma als vertreten?
6. Änderungen: Konflikte zwischen App und HQ sichtbar zur Entscheidung zurückhalten statt eine Seite automatisch gewinnen lassen?
7. Ausgabeangaben: Ziele und Termine zunächst nur in der App/Firebase oder auch in HQ? Zieländerung als aktualisierte Kennzahl plus sichtbarer Hinweis auf dem Dashboard?
8. Neuanlage: verantwortlichen HQ-Benutzer manuell wählen oder Google-Nutzer einem HQ-Benutzer zuordnen? Kundennummer durch HQ vergeben lassen, falls HQ dies unterstützt?

### Was der Nutzer vorbereiten muss

- Google-Kontoarten und erste Pilotpersonen festlegen; Kontofreischaltungen in der geschützten Konfiguration pflegen.
- Bestehendes Apps-Script-Testprojekt und Firebase-Projekt weiterverwenden; laut Tagebuch bereits eingerichtet und mit einem echten Leseabgleich geprüft. Nicht neu aufsetzen. Aktuellen Bereitstellungsstand beim Bau prüfen.
- Eine geeignete HQ-Testumgebung bzw. klar getrennte Testobjekte bestimmen und die Ergebnisse später direkt in HQ kontrollieren.
- Einige repräsentative Unternehmen in HQ auswählen: mit Ansprechpartnern/eigenen Feldern, mit unterschiedlichen Adresstypen und ein Interessent. IDs/Beziehungen in der Testseite verwenden, keine echten Inhalte in Projektdokumentation speichern.
- Das benannte Magazinprojekt als erste Datenquelle bereithalten. Für die späteren Fünf-Ausgaben-Filter werden entsprechend weitere vollständig importierte Ausgaben benötigt.
- HQ-Feld Adressherkunft erst nach Prüfung geeigneter Feldtypen anlegen. Vorschlag: Auswahl und zusätzlicher Freitext für Sonstige; alternativ ein Textfeld in HQ und strukturierte Auswahl in Firebase. Entscheidung offen.
- Für die erste aktiv geplante Ausgabe Zielumsatz und die drei Termine bereitstellen; historische Ausgabe und aktive Vertriebsplanung nicht verwechseln.
- Tokens und Dienstkontoschlüssel ausschließlich in geschützten Einstellungen belassen, nicht im Chat oder in Dokumenten übermitteln.

### Geprüfter Ausgangsstand und Quellen

Lokale Demo und Firebase-Pilot sind getrennt. Die aktuellen lokalen Firestore-Regeln erlauben freigeschalteten Google-Nutzern ausschließlich das Lesen der Pilotblöcke und verbieten Browser-Schreibzugriffe. Für den Ausbau müssen Datenmodell und autorisierte Schreibwege gezielt ergänzt werden.

Die öffentlichen Dokumentationen wurden am 24.09.2026 gelesen. Konkrete HQ-Schreibendpunkte und sämtliche benötigten Feldzuordnungen sind noch nicht verifiziert. Apps-Script-Nutzeridentität hängt von Bereitstellungsart und Kontokontext ab; die bisherige Einzelkonto-Prüfung ist kein Nachweis für externe Google-Nutzer.

- [HQ Developer Guide](https://developer.hellohq.io/)
- [Apps-Script-Web-Apps](https://developers.google.com/apps-script/guides/web)
- [Apps-Script-Nutzeridentität](https://developers.google.com/apps-script/reference/base/session)

Nächster Schritt: Fachliche Antworten aufnehmen, dann die bestehende HTML-Oberfläche an Apps Script anbinden und die integrierte Testseite zunächst für kontrolliertes HQ→Firebase→App-Lesen aufbauen. Schreibvorschau vorbereiten; echte Schreibversuche erst mit festgelegter Testumgebung und bestätigten Zuordnungen.

## 3. Claude-Code-Prüfauftrag (Übergabe vom 17.11.2026)

Ursprünglich `docs/CLAUDE-CODE-PRUEFAUFTRAG.txt`. Die E-Mail-Adresse des Administrators wurde hier ersetzt.

```text
CLAUDE CODE – EINRICHTUNG UND PRÜFAUFTRAG FÜR SALES MARKATUS
Stand der Übergabe: 17.11.2026

AUFTRAG DES NUTZERS
Ich verwende dich auf demselben Windows-PC wie die bisherige Entwicklung.
Richte die nötigen lokalen Werkzeuge und Zugänge für eine gründliche Prüfung
meiner Sales-Anwendung ein. Ich melde mich bei Google, Firebase, GitHub, HQ und
in der Sales-App bei Bedarf selbst an. Prüfe anschließend die gesamte Anwendung.

Dieser Auftrag erlaubt Einrichtung einer separaten lokalen Audit-Arbeitskopie,
lokale synthetische Tests und zweckgebundene lesende Live-Prüfungen. Er erlaubt
keine fachlichen Änderungen an der Produktivanwendung oder ihren Daten.
Bitte richte nur tatsächlich benötigte Zugänge ein, keine pauschalen Vollzugriffe.

1. ARBEITSVERZEICHNIS UND VORRANG DIESES AUFTRAGS

Originalprojekt, zunächst ausschließlich lesen:
P:\Meine Ablage\Codex Sync\Projekte\Sales-Markatus\MeineWebApp

Vorgeschlagene eigene Arbeitskopie:
C:\Users\mmp\Claude-Audits\Sales-Markatus

Falls der Zielordner bereits existiert, dessen Inhalt prüfen und einen neuen
Ordner mit Zeitstempel verwenden. Nichts überschreiben oder löschen.
Keine vollständige Kopie des Originalordners mitsamt ignorierten Dateien anlegen.
Stattdessen einen frischen Clone des Repositorys erstellen:
https://github.com/markatusGit/Sales-Markatus-WebApp.git

Die normale Entwicklung hat dauerhafte Commit-, GitHub-Push- und
Veröffentlichungsaufträge in AGENTS.md. Für DIESEN Prüfauftrag gilt ausdrücklich:
- Originaldateien und produktive Konfiguration nicht ändern.
- Keine Anwendungskorrekturen durchführen, auch nicht bei gefundenen Fehlern.
- Keine Commits, Pushes, Pull Requests, Tags oder Veröffentlichungen erzeugen.
- Keine Synchronisation oder anderen Produktiv-Schreibvorgänge starten.
- Technische Audit-Artefakte, eine eigene CLAUDE.md mit diesen Auditgrenzen und
  den Bericht darfst du in deiner separaten Arbeitskopie erstellen.
- Build und Tests dürfen dort generierte Dateien und Testausgaben erzeugen.
- Alle übrigen Datenschutz-, Dokumentations- und Verständlichkeitsregeln aus
  AGENTS.md bleiben als Kontext relevant.
Ein späterer ausdrücklicher Reparaturauftrag ist eine getrennte Entscheidung.

2. ZUERST LOKAL LESEN UND DEN IST-STAND FESTSTELLEN

Im Originalprojekt diese Einstiegspunkte lesen:
P:\Meine Ablage\Codex Sync\Projekte\Sales-Markatus\MeineWebApp\AGENTS.md
P:\Meine Ablage\Codex Sync\Projekte\Sales-Markatus\MeineWebApp\PROJEKTUEBERBLICK.md
P:\Meine Ablage\Codex Sync\Projekte\Sales-Markatus\MeineWebApp\CHANGELOG.md
P:\Meine Ablage\Codex Sync\Projekte\Sales-Markatus\MeineWebApp\docs\PROJEKTTAGEBUCH-UND-ROADMAP.md
P:\Meine Ablage\Codex Sync\Projekte\Sales-Markatus\MeineWebApp\docs\VEROEFFENTLICHEN.md
P:\Meine Ablage\Codex Sync\Projekte\Sales-Markatus\MeineWebApp\docs\BENUTZERZUGANG-R26.md
P:\Meine Ablage\Codex Sync\Projekte\Sales-Markatus\MeineWebApp\package.json
P:\Meine Ablage\Codex Sync\Projekte\Sales-Markatus\MeineWebApp\deployment.json
P:\Meine Ablage\Codex Sync\Projekte\Sales-Markatus\MeineWebApp\firebase.json

Danach Quellcode, Tests und unterstützende Skripte in der Auditkopie vollständig
inventarisieren. Die folgenden relativen Pfade beziehen sich auf ihren Repo-Root:
- sales-app: maßgebliche Appquellen, Backend, Oberfläche und Regressionstests.
- hq-benchmark: Apps-Script-Projekt, generierte Sales-Dateien sowie gemeinsame
  HQ-/Firebase-Funktionen; auch ältere Oberflächen und Auswertungen vorhanden.
- firebase-pilot: Hosting, tatsächliches Anmeldefenster unter public/auth,
  Firestore-Regeln und historische Pilotbestandteile.
- scripts: Buildprüfung, synthetische Speicherprüfung und Releasewerkzeuge.
- docs: Architektur, Entscheidungen, Einrichtung, Historie und Roadmap.
- frontend: falls vorhanden als Bestandteil inventarisieren und seine tatsächliche
  Rolle anhand der Aufrufkette feststellen; nicht ungeprüft als Live-App behandeln.

Historische Dokumente und Bezeichnungen wie Pilot/Test können veraltet sein.
Den produktiven Einstieg und tatsächlichen Datenfluss im Code nachvollziehen.
Nicht aus älteren Einrichtungstexten einen neuen Installationsbedarf ableiten.

Zuletzt bestätigter Code: v0.28.4, Apps-Script-Version 47, Appkennung
2026-11-17-r28.4. deployment.json und den aktuellen Git-Stand selbst prüfen.
Der Stand kann seit Erstellung dieser Anleitung fortgeschrieben worden sein.
Ein lange offener Browser-Tab kann eine ältere UI-Kennung zeigen.

Originalzustand mit git status --short nur lesen. Zum Übergabezeitpunkt gibt es
fremde lokale Änderungen an docs/START-HIER.md und die unversionierten Dateien
docs/APP-UEBERSICHT.md und docs/ECHTDATEN-PILOT.md. Als zusätzliche, teils
historische Notizen lesen; nicht als bestätigten Releasecode einordnen und nicht
ändern, hinzufügen oder bereinigen. Eine vorhandene packed-refs.lock im Original
nicht löschen; den GitHub-Clone für die eigentliche Arbeit verwenden.

3. VORHANDENE LOKALE WERKZEUGE PRÜFEN

Windows / PowerShell. Bereits gefunden:
- Node: C:\Program Files\nodejs\node.exe
- npm: C:\Program Files\nodejs\npm.ps1
- Git: C:\Program Files\Git\cmd\git.exe
- clasp: C:\Users\mmp\AppData\Roaming\npm\clasp.ps1
- Firebase: C:\Users\mmp\AppData\Roaming\npm\firebase.ps1

Versionen über die jeweiligen --version-Befehle feststellen. Das Projekt verlangt
Node >=20; vorhandene Installation verwenden, keine unnötigen Neuinstallationen.
Bei PowerShell-Skriptsperren vorhandene .cmd-Launcher prüfen, keine systemweite
Ausführungsrichtlinie herabsetzen.

Vorhandene Playwright-Abhängigkeiten:
C:\Users\mmp\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules

Vorhandener Testbrowser:
C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe

scripts/check.cjs findet diese Umgebung bereits automatisch. Bei Bedarf nur für
den aktuellen PowerShell-Prozess setzen:
$env:NODE_PATH = 'C:\Users\mmp\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

Zugriff auf diese Bibliotheksdateien überträgt keine Codex-Werkzeuge, Browser-
Sitzungen oder Cloud-Anmeldungen an Claude. Keine Codex-Anmeldedaten auslesen.

Im eigenen Audit-Clone nach Sichtung der Skripte ausführen:
- npm run build
- npm run check
- npm test
- npm run audit:firestore

Die vorhandenen Fach-/Browser-/Speichertests verwenden synthetische Daten.
Ihre Ergebnisse selbst auswerten; ältere PASS-Vermerke sind kein neuer Nachweis.
Ein Testlauf kostet keine HQ-/Firestore-Produktivzugriffe, sofern die vorhandenen
Tests unverändert als synthetische Tests ausgeführt werden.

4. CLAUDE-BERECHTIGUNGEN UND BROWSERANBINDUNG

Zunächst Plan-/Lesemodus für die Analyse verwenden. Für Arbeitskopie, Build,
Tests und Bericht nur die nötigen lokalen Schreib-/Shellrechte erlauben lassen.
Keinen Modus verwenden, der sämtliche Berechtigungsprüfungen umgeht.
Mit /permissions die tatsächlich verfügbaren Regeln und Verzeichnisse prüfen.
Eine Anweisung im Chat ist keine technische Zugriffssperre.

Du hast nicht automatisch Zugriff auf den eingebauten Codex-Browser oder dessen
Computerwerkzeuge. Für Live-Bedienprüfungen deine eigene unterstützte Verbindung
verwenden. Laut aktueller offizieller Claude-Dokumentation ist dies unter Windows
zum Beispiel Claude Code mit der Erweiterung Claude in Chrome in Chrome/Edge.
Eine eventuell vorhandene passende Verbindung zunächst erkennen und prüfen.

Falls sie fehlt:
- Native Windows-Sitzung verwenden, nicht WSL für diese Browserintegration.
- Offizielle Anleitung öffnen: https://code.claude.com/docs/en/chrome
- Mich durch die Installation/Anmeldung der offiziellen Browsererweiterung führen.
- Claude Code mit direktem Claude-Login anmelden; für diese Integration genügt
  ein reiner API-Key-Login laut Dokumentation nicht.
- Bei CLI-Nutzung die Verbindung über claude --chrome und /chrome prüfen.
- Nur die benötigten Prüfseiten freigeben lassen.
- Keine unbekannten Browser-Erweiterungen oder zufälligen MCP-Server installieren.

Diese Angaben anhand der aktuellen offiziellen Dokumentation verifizieren.
Bei einer Loginseite, Passwortabfrage, Zwei-Faktor-Abfrage oder einem CAPTCHA
übernimmst du nicht meine Zugangsdaten: Ich erledige die Anmeldung selbst.
Danach den sichtbaren erfolgreichen Zugang prüfen und mit dem Audit fortfahren.
Falls ein Pop-up technisch nicht steuerbar ist, mich darin anmelden lassen;
nicht deshalb Authentifizierungsverfahren oder Sicherheitsregeln umbauen.

5. GITHUB – CODE LESEN, NICHT VERÖFFENTLICHEN

Repository:
https://github.com/markatusGit/Sales-Markatus-WebApp

Vorhandene Git-Anmeldung über normale Git-/Credential-Manager-Funktionen nutzen.
Keine Anmeldedateien oder Tokenwerte anzeigen. Wenn der Clone Zugriff verweigert,
mich über den normalen GitHub-Anmeldedialog anmelden lassen.
Schreibrechte sind für diesen Auftrag nicht erforderlich. Bestehende Schreibrechte
sind keine Erlaubnis zum Pushen. In der Auditkopie Remote und Branch kontrollieren.

6. GOOGLE APPS SCRIPT – CODE, BEREITSTELLUNG UND AUSFÜHRUNGEN LESEN

Editor:
https://script.google.com/home/projects/1QWMae8m5upOmPusbq2bS_IkIqRm8fVZHnjo-7U7ea6K0RglzOR4y7ZkJ/edit

Projekt-ID:
1QWMae8m5upOmPusbq2bS_IkIqRm8fVZHnjo-7U7ea6K0RglzOR4y7ZkJ

Die bestätigte Bereitstellungs-ID und Dashboard-Adresse aus deployment.json
verwenden. Keine neue Bereitstellung erzeugen. Ausführungskonto, App-Administrator
und sonstige Benutzer nicht gleichsetzen. Fehlende Rechte konkret benennen.

Zunächst vorhandene clasp-Anmeldung mit einem lesenden Projektbefehl prüfen,
zum Beispiel list-deployments mit explizitem --project auf die .clasp.json im
hq-benchmark-Verzeichnis deiner Auditkopie. Die .clasp.json enthält die nicht
geheime Projektzuordnung. Keine vorhandenen OAuth-Anmeldedateien öffnen/ausgeben.

Falls eine eigene Anmeldung nötig ist, die vorhandene Standardanmeldung nicht
abmelden oder überschreiben. clasp --help prüfen: die installierte Version
unterstützt --auth für eine getrennte lokale Anmeldedatei. Einen separaten,
nicht versionierten Credentialpfad außerhalb des Audit-Repositories verwenden,
zum Beispiel C:\Users\mmp\Claude-Audits\sales-markatus-clasp-auth.json.
Die normale clasp-login-Browseranmeldung starte ich selbst. Den gewählten
Credentialpfad anschließend konsistent bei lesenden clasp-Aufrufen verwenden.

npm run release:verify ist ein erlaubter lesender Cloud-Codevergleich; er lädt
Code-Snapshots in lokale Audit-Artefakte und führt Git-Fetch aus. Er benötigt
die passende CLI-Anmeldung. Bei getrenntem clasp-Authpfad gegebenenfalls die
von clasp dokumentierte Prozessvariable clasp_config_auth setzen, damit die
Unterprozesse denselben Zugang nutzen. Keine dauerhaften globalen Änderungen.

Projektausführungen und Trigger im Browser lesen. Keine Trigger anlegen,
löschen, starten oder Funktionen per clasp run ausführen. Script Properties nur
anhand ihrer Namen, Verwendung und erforderlichen Konfiguration prüfen.
Keine geheimen Werte oder ganzen Properties-Listen in Chat/Logs/Bericht ausgeben.
Fehlende Diagnoseinformationen gegebenenfalls als bereinigten Auszug anfordern.

7. FIREBASE / GOOGLE CLOUD – ZUSTAND UND KONTINGENTE LESEN

Firebase-Projekt: sales-markatus
Google-Projektnummer: 539269099884
Firebase-Konsole: https://console.firebase.google.com/project/sales-markatus/overview
Google-Cloud-Konsole: https://console.cloud.google.com/home/dashboard?project=sales-markatus

Im verbundenen Browser öffnen und mich erforderlichenfalls selbst anmelden lassen.
Lesend prüfen: aktive Firestore-Regeln, Auth-Anbieter und Einstellungen,
Hosting/Sicherheitsheader, Dienstkonto-/IAM-Rollen soweit sichtbar,
Ausführungs-/Fehlermetriken und Firestore-Kontingentverbrauch.
Keine Owner-/Editorrechte als Abkürzung vergeben oder neue Schlüssel erzeugen.
Wenn Zugriff fehlt, die konkrete benötigte Leseberechtigung benennen.

Bei CLI-Bedarf vorhandene Firebase-Anmeldung über firebase login:list prüfen.
Projektbezogene Befehle ausdrücklich auf --project sales-markatus begrenzen.
Wenn eine zusätzliche Anmeldung nötig ist, zunächst die offiziellen login-/
Mehrkontenoptionen prüfen und mich anmelden lassen. Keine bestehende fremde
Anmeldung abmelden und keine gespeicherten Refresh-/Access-Tokens auslesen.
Für Konsole und CLI sind Anmeldungen getrennt zu prüfen.

Spark/kostenloser Betrieb ist ausdrücklich gewünscht. Keine Abrechnung verknüpfen,
keinen Tarifwechsel und keine Cloud-Functions-/Cloud-Run-Einrichtung vornehmen.
Firestore hat eigene Tageskontingente; 50.000 Nutzer sind keine Freigrenze für
Datenbankzugriffe. HQ-Worker besitzen ein internes Pacific-Tagesbudget von
20.000 dokumentbezogenen Lese- und 12.000 Schreibvorgängen. Das ist kein
verfügbares Restkontingent für dein Audit. Auch Audit-Lesezugriffe sparsam halten.

Keine Vollscans, Datenbankexporte oder unbeschränkten Abfragen. Live-Proben
auf konkrete technische Fragen und kleine bekannte Datensätze begrenzen.
Keine Kundendatenbestände, Auth-Sitzungsdokumente oder Tokens herunterladen.
Zugriffsregeln nicht für den Browser öffnen. Öffentliche Firebase-Web-Konfiguration
und .clasp.json nicht pauschal als geheime Zugangsschlüssel bewerten; tatsächliche
Berechtigungen und Schutzgrenzen prüfen.

8. PRODUKTIVE SALES-APP – MANUELLE ANMELDUNG UND LESENDE BEDIENUNG

Aktuelle feste App-Adresse:
https://script.google.com/a/macros/markatus.de/s/AKfycbxlNLBoZvy6SgSHHEFviByTN9bL07nb7kLzlUWaAcCs0Jmrc96lIrAyGNxUrwtevDWrFw/exec

Anmelde-Hosting:
https://sales-markatus.firebaseapp.com/auth/

Die Anmeldung immer aus der Sales-App über Anmelden / Einladung aktivieren
beginnen. Die Auth-Seite nicht isoliert öffnen; sie benötigt den gesicherten
Übergabekontext der App. Ich wähle bei der Google-Anmeldung das freigegebene
Konto selbst; bisher bestätigter App-Administrator ist [bestätigtes Administratorkonto].
Google und E-Mail/Passwort sind weiterhin vorgesehen, nicht auf Google-only ändern.

Lesend prüfen: sichtbare Bereiche, Kundenansicht, Ansprechpartner-/Projekt-/
Historiensuche, unabhängiges Scrollen und vorhandene Verwaltungsanzeigen.
Speichern, Nicht erreicht und Kontaktanlage nicht mit echten Datensätzen testen.
Schreib-/Rollen-/Widerrufstests zunächst über synthetische Tests oder eine separat
freigegebene Testumgebung durchführen. Keine Testkonten/Einladungen/Rechteänderungen
in Produktion anlegen, bevor ich einen solchen gesonderten Testauftrag erteile.

Für vorhandene Altaufträge ist HQ-Stand nur lesen die vorgesehene reine Prüfung.
Nicht mit Ergebnis nur in HQ prüfen / HQ-Ausgang nur prüfen verwechseln:
Die dahinterliegenden Reconcile-Funktionen können Auftragszustände ändern.
Für diesen Audit keine runSalesJob-, reconcileSalesJob-, bind- oder resolve-
Aufrufe, keine Bereinigungen, Mailaktionen oder Syncstarts ausführen.

9. HQ – DOKUMENTATION UND BEGRENZTE GET-PRÜFUNGEN

Offizielle API-Dokumentation: https://developer.hellohq.io/
Öffentliche Spezifikation: https://developer.hellohq.io/swagger20.json
API-Basis: https://api.hellohq.io/v2/

Die konkrete Mandanten-/Loginadresse aus der bestehenden Konfiguration oder von
mir erfragen; nicht aus ähnlich benannten Diensten erraten. Einen vorhandenen
Browserzugang kann ich selbst anmelden. Keine Google-Anmeldung als HQ-API-Zugang
interpretieren; diese Zugänge sind voneinander unabhängig.

Für die erste technische API-Prüfung Dokumentation, Quellcode und anonymisierte
Beispiele verwenden. Reale Rückprüfungen möglichst über die vorhandene
serverseitige App-Funktion HQ-Stand nur lesen durchführen.
Der produktive HQ_API_TOKEN bleibt in Apps-Script-Properties; nicht auslesen,
kopieren, anzeigen oder in lokale Skripte/Anweisungen übernehmen.
Wenn darüber hinaus API-Zugriff nötig ist, mich um einen getrennten, tatsächlich
auf Lesen beschränkten Zugang bitten, soweit HQ dies unterstützt. Ist das nicht
möglich, eine Testumgebung oder gezielte über die App ausgeführte Leseprüfung
verwenden. Kein uneingeschränkter Produktionstoken als Standardlösung.

10. AKTUELL BEKANNTE OFFENE PUNKTE EINORDNEN

Letzter live bestätigter Abgleich: 17.11.2026, 09:29 Europe/Berlin,
173/173 Abschnitte, completedWithErrors/Mit offenen Punkten beendet.
21 Hinweise sind bewusst nicht automatisch bereinigt:
- 17 Meldungen betreffen 13 alte Schreibaufträge.
- 3 gespeicherte Firmen-IDs liefern HTTP404.
- 3 andere Firmen sind nach korrigierter Prüfung passend; 2 zugehörige Kontakte
  passen, bei einem Auftrag fehlt eine bestätigte Kontakt-ID.
- 6 alte Historienaufträge bleiben wegen nicht bestätigter syncId offen.
- 1 E-Mail-Zielzustand ist noch nicht bestätigt.
- Zusätzlich 3 Bestandsabweichungen zwischen Firebase und HQ sowie eine offene
  Belegprüfung für BAMBERGER #1.
Die Auftragszustände sind absichtlich unverändert. Keine automatischen
Wiederholungen, Zuordnungen oder Löschungen zur Beseitigung der Hinweise.

Weitere Roadmap-Wünsche aus dem Projekttagebuch erhalten. Beispielsweise eine
persistente Tagesanmeldung oder Wiedervorlagen nicht als bereits implementiert
annehmen. Acht Stunden Serverfrist und RAM-Sitzung anhand des Codes prüfen.

11. PRÜFUMFANG UND ERGEBNIS

Prüfe insbesondere:
- Architektur und tatsächlichen Datenfluss Apps Script / Firebase / HQ / Browser.
- Authentifizierung, Tokenprüfung, Einladungen, Sitzungsende und Parallelität.
- Serverseitige Bereichs-/Lese-/Hinzufüge-/Ändern-Rechte und Autorenzuordnung.
- Direkte Alt-RPCs, Antwortfilter, gespeicherte ACL-Revisionsprüfungen und Regeln.
- Doppelklicks, verlorene Antworten, uncertain-Aufträge und idempotente Verarbeitung.
- HQ-Feldverträge, Datums-/Änderungsfilter, Cursor, Journal, Wiederaufnahme und
  Schutz vor falschen Firmen-, Kontakt-, Projekt- oder Ausgabenzuordnungen.
- Vollständigkeit, fehlende/verschobene Datensätze, Summen und Datenverlustrisiken.
- Datenbankzugriffe, Payload-Teilpakete, Indizes, Caches, Budgets und Trigger.
- XSS/HTML-Verarbeitung, Hostingheader, Browsernachrichten, Eingabevalidierung.
- Bedienbarkeit auf Desktop/Handy, Suchen, Scrollbereiche und erhaltene Entwürfe.
- Testaussagekraft, Wartbarkeit, unnötige Komplexität und Release-Nachweis.

Zuerst eine kurze Zugriffsmatrix liefern: lokal, GitHub, Apps Script, Firebase/
Cloud, Sales-App und HQ jeweils verfügbar / Anmeldung nötig / nicht prüfbar.
Für fehlende Anmeldungen konkrete, kurze Schritte nennen; pro Stichpunkt eine
Handlung, erwartetes Ergebnis und bei Fehlern das weitere Vorgehen. Während ich
mich anmelde, mit unabhängigen lokalen Prüfungen weiterarbeiten.

Am Ende einen unabhängigen priorisierten Bericht erstellen:
- bestätigte Fehler mit Datei/Zeile, nachvollziehbarem Beleg und Auswirkung;
- Sicherheitsrisiken, Datenverlustrisiken und Betriebs-/Kontingentprobleme;
- konkrete Korrekturvorschläge mit grober Aufwandsbewertung;
- bestandene Tests, tatsächlich ausgeführte Live-Prüfungen und deren Grenzen;
- separat offene Verdachtsfälle und nicht prüfbare Bereiche.
Keine Probleme erfinden, bloße Stilpräferenzen nicht als Fehler verkaufen und
historische Dokumentation nicht mit dem laufenden Code verwechseln.
Bericht nur lokal in der Auditkopie, ohne Kundeninhalte oder Zugangsdaten speichern.
Keine Korrekturen oder Veröffentlichungen ohne anschließenden eigenen Auftrag.

Offizielle Claude-Quellen für die Einrichtung:
https://code.claude.com/docs/en/permissions
https://code.claude.com/docs/en/chrome
```
