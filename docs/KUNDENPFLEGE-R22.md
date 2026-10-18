# Kundenpflege für echte Daten – r22

Stand: 18.10.2026. Beauftragter Umfang: T01, T02, T03, T04, T06 und T09. T04 wurde ausdrücklich auf **Firmen, Adressen und Ansprechpartner** eingegrenzt. HQ-Projekte und Rechnungen bleiben lesbar. T05, T07 und T08 werden erläutert; daraus entstehen keine zusätzlichen Lösch- oder Rechteaufträge.

## Umsetzung

| Punkt | Verhalten |
| --- | --- |
| T01 | Normale Firmennamen ohne TEST-Pflicht und ohne vorbelegtes TEST-Präfix. Erster Ansprechpartner mit Vor-/Nachname bleibt Pflicht. |
| T02 | Keine fachliche Testkategorie oder testOnly-Voraussetzung mehr. Lokale Kennungen vor der HQ-Anlage bleiben technisch nötig; vorhandene IDs bleiben kompatibel. Bestehende Kunden-/HQ-Projektnamen werden nicht pauschal umbenannt. |
| T03 | Notiz, E-Mail-Dokumentation, Anruf, Meeting und Besuch auch für importierte Bestandskunden. Speichern zunächst in Firebase, mit Autor und eindeutiger Übertragungskennung. E-Mails werden dokumentiert, nicht versendet. Kontakte müssen zum Kunden gehören. |
| T04 | Bearbeitungsdialoge für Firmenstammdaten, Firmenarten/Kundennummern, vorhandene Firmenadressen und vorhandene Ansprechpartner. Nur geänderte Felder werden vorgemerkt und unmittelbar angezeigt. |
| T06 | Keine neuen [Sales-Test …]-Beschreibungen. Bei verlorener POST-Antwort ohne gespeicherte HQ-ID bleibt der Auftrag gesperrt. Ein Administrator kann die manuell in HQ geprüfte ID nach Feld- und Kontaktprüfung zuordnen. Kein automatisches Übernehmen gleichnamiger Firmen und kein automatischer zweiter POST. Kompatibilität für ältere markierte/offene Aufträge bleibt; keine pauschale Datenbereinigung. |
| T09 | Lokale Demo, HTML-Wegweiser und Vorschauprogramm aus der aktiven Ablage entfernt; Wiederherstellungskopie nur im ignorierten lokalen .release-Verzeichnis. README verweist auf die tatsächliche App. Synthetische Tests bleiben. |

Übertragung beim bewusst gestarteten gemeinsamen HQ-Sync. Vor dem Schreiben werden Ziel und geänderte Felder erneut aus HQ gelesen. Gleichzeitige abweichende HQ-Änderungen ergeben einen Konflikt mit Auswahl HQ/App. Unbeteiligte aktuelle HQ-Felder und offene lokale Eingaben bei einem dazwischenliegenden Import bleiben erhalten. Ein weiterer Bearbeitungsauftrag für dasselbe Objekt wird erst nach Abschluss/Klärung des offenen Auftrags angenommen.

## Schreibbare Felder und Grenzen

Grundlage ist das öffentliche [HQ-v2-Schema](https://api.hellohq.io/swagger/v2/swagger.json), geprüft am 18.10.2026. `SalesFields.gs` enthält nur öffentliche Metadaten, keine Kundendaten.

- **Firma:** Name, Branche, Beschreibung, Homepage, IBAN/BIC, Umsatzsteuer-ID, Debitor-/Kreditornummer, Leitweg-ID/E-Rechnungsart und die im CompanyPut-Schema unterstützten Finanz-/Dokumentvorgaben sowie vorhandene eigene HQ-Felder.
- **Firmenarten:** bekannte HQ-Firmenarten und Nummern über den separaten UpdateCompanyTypes-Endpunkt.
- **Vorhandene Adresse:** Firmenzusatz, Anschrift, Beschreibung, Zusatzinformationen, Telefon, E-Mail, Fax, Website und Standard-Dokumentart.
- **Vorhandener Ansprechpartner:** Vor-/Nachname, Position, Anrede/Ansprache, Telefon, E-Mail, Sprache, Geburtstag, Notiz, Kontaktadresse und vorhandene eigene HQ-Felder.

IDs/Zeitstempel bleiben unveränderbar. Verantwortlicher HQ-Nutzer und Unternehmensbereich sind bei der Neuanlage auswählbar; für die nachträgliche Änderung dieser Beziehungen bietet das geprüfte v2-Schema keinen entsprechenden Schreibendpunkt. Sie bleiben lesbar. Neue Zusatzfelddefinitionen, zusätzliche Firmenadressen und weitere Ansprechpartner **anlegen** sind ein eigener offener Ausbau. Hier werden vorhandene Objekte bearbeitet.

Kontakt-E-Mail-/Kontaktadressänderungen benötigen eine eindeutig diesem Kontakt gehörende Adresse. Geteilte Adressen werden nicht automatisch geändert. Eine unvollständige Kontaktadresse muss vor dem Mitschreiben vervollständigt werden. Unveränderte Kontaktadressen werden bei reinen Namens-/Telefonänderungen nicht erneut gesendet und anschließend auf Erhalt geprüft.

## T05: Ansprechpartner als Pflichtfeld

Der **erste Ansprechpartner bleibt Pflicht**, wie bestätigt. Firma und Kontakt sind getrennte HQ-Objekte: Erst wird die Firma angelegt und deren ID bestätigt, danach der zugehörige Kontakt. Das verhindert falsche Zuordnungen.

Der weitere Teil von T05 war die zusätzliche Neuanlage von Ansprechpartnern bei einer vorhandenen Firma. Dieser allgemeine Anlageweg fehlt weiterhin. Vorhandene Ansprechpartner werden jetzt durch T04 bearbeitbar. Eine bloße Firmenänderung benötigt keinen neuen Ansprechpartner.

## T07: Diagnose und Wiederherstellung

„Homepage in HQ prüfen“ vergleicht App-Eingabe und HQ-Ausgabe. Die E-Mail-Prüfung klärt, ob HQ die E-Mail am Kontakt oder an dessen Adresse liefert. Die Auftragsübersicht zeigt offene, unklare oder widersprüchliche Übertragungen; konkrete Korrektur-/Bereinigungsaktionen prüfen das alte Ziel vor einem möglichen Schreiben.

Diese Funktionen laufen auf Klick, nicht dauerhaft. Prüfungen kosten gezielte HQ-GETs und gegebenenfalls Firebase-Reads; vorgemerkte/ausgeführte Korrekturen können schreiben. Auftrags-, Konflikt- und Fehlerbehandlung werden auch im echten Betrieb gebraucht. Die Diagnosehilfen bleiben vorerst bestehen; ihre spätere Vereinfachung ist ein eigener UI-Ausbau.

## T08: Ältere Messwerkzeuge

Das ist der Geschwindigkeits-/Anbindungstest hinter `?view=benchmark` und der frühere Firebase-Lesepilot. Damit wurden HQ-Abfragen, Datenbankübertragung und Ladezeiten untersucht. Der normale Dashboard-Aufruf öffnet die Sales-App und startet diese Tests nicht automatisch.

Die alten Dateien enthalten noch gemeinsame Funktionen für HQ-Zugang und Firebase-Transport. Ganze Dateien zu löschen könnte die tatsächliche App unterbrechen. T08 bleibt unverändert. Vor einer späteren Entfernung müssen diese Abhängigkeiten herausgelöst werden. Die lokale Demo aus T09 wurde unabhängig davon entfernt.

## Fachliche Bedienabnahme nach Veröffentlichung

Automatisierte Prüfungen verwenden ausschließlich synthetische Daten. Die echte Bedienabnahme bleibt gesondert:

- Die bestehende Dashboard-Adresse neu öffnen; „Stand 2026-10-18-r22“ erwarten. Bei anderer Kennung den angezeigten Stand melden.
- „Kunden“ öffnen; die gespeicherte Namensliste erwarten. Bei Fehler den Fehlertext melden.
- Einen bewusst ausgewählten Kunden öffnen; dessen richtige Akte erwarten. Bei falscher Zuordnung abbrechen.
- „Firmendaten bearbeiten“ öffnen; die aktuellen Daten dieser HQ-Firma erwarten. Bei Abweichung ohne Speichern zurückkehren.
- Eine fachlich freigegebene Feldänderung eingeben; alle übrigen Werte unverändert lassen.
- „Änderungen in Firebase speichern“ klicken; neuen Wert und offenen Auftrag erwarten. Bei Fehler zuerst die Auftragsübersicht prüfen.
- „Datenabgleich“ öffnen; den manuellen HQ-Sync erwarten. Bei gesperrtem Auftrag zuerst dessen Status prüfen.
- „HQ synchronisieren“ klicken; Verarbeitung des offenen Auftrags erwarten. Bei bereits laufendem Abgleich dessen vorhandene Fortsetzung verwenden.
- „Fortschritt aktualisieren“ klicken; Abschluss oder konkrete Fehlermeldung erwarten. Bei Konflikt „Aufträge und Konflikte ansehen“ öffnen.
- Den geänderten Wert in HQ prüfen; denselben freigegebenen Wert erwarten. Bei Abweichung keine zweite Anlage auslösen und den Status melden.

Keine neuen Script Properties, OAuth-Scopes oder Bereitstellungseinstellungen nötig. Ausführungskonto und Zugriffsgruppe bleiben erhalten. Teamzugang, fachliche Daten-/Umsatzabnahme, Datenwiederherstellung, Wiedervorlagen, Buchungserfassung und Redaktionsmeldung sind damit nicht automatisch erledigt.
