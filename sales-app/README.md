# Apps-Script-Datenpilot

Stand: 25.09.2026. Version 8 wurde bereitgestellt. Der Nutzer hat den App-Start mit dem Bereitstellerkonto, 21 importierte Firmen mit Rechnungen der Ausgabe #70 und einen Kundendetailimport bestätigt. Kein HQ-Schreibtest erfolgt. Das neue Detailupdate liegt lokal bereit und muss vom Nutzer als neue Version übernommen und geprüft werden.

**Neuer Nutzerwunsch:** Ab jetzt nur lokale Dateien vorbereiten. Der Nutzer übernimmt Übertragung und Veröffentlichung selbst. Keine weiteren automatischen Uploads oder Bereitstellungsänderungen ohne erneuten ausdrücklichen Auftrag. Anleitung: [MANUELL-UEBERTRAGEN.md](MANUELL-UEBERTRAGEN.md).

## Nächster Schritt für den Nutzer

1. `SalesBackend.gs` und `Sales.html` anhand von [MANUELL-UEBERTRAGEN.md](MANUELL-UEBERTRAGEN.md) vollständig ersetzen und eine neue Version der vorhandenen Bereitstellung veröffentlichen. Keine neuen Skripteigenschaften oder Bereitstellungsrechte nötig.
2. Den bereits geprüften Kunden öffnen, Details erneut HQ → Firebase importieren und danach Firebase erneut lesen. Homepage, kompakte Versandhistorie, tatsächlichen Projektabschluss und Planumsätze mit HQ vergleichen.
3. Erst danach eine eigene Testfirma anlegen. Keine Zugangsdaten in den Chat schreiben.

## Detailupdate nach erstem Live-Test

- Homepageanzeige berücksichtigt zusätzlich die Website der Standardadresse, ersatzweise eine eindeutige Rechnungsadress-Website. Das originale Firmenfeld bleibt für Schreibvergleiche separat erhalten. Ein tatsächlicher fehlender HQ-Wert wird nicht erfunden.
- Dokumentversand in der Kontakt-Historie zeigt Projekt, Versanddatum und Netto-Rechnungsbetrag, den E-Mail-Text aufklappbar und als escaped Text. Normale Notizen bleiben sichtbar. Die API liefert hier keine direkte Rechnungs-ID: Zuordnung nur anhand einer eindeutigen vollständigen Rechnungsnummer bei demselben Kunden und gegebenenfalls Projekt; Mehrdeutigkeit bleibt sichtbar. Projekt-/Betragsvergleiche allein werden nicht als Zuordnung verwendet.
- Projekte zeigen `actualFinishDate` bzw. offene Planumsätze aus `PlannedRevenues` mit `Estimations`. Offene Projektionen (`documentId=0`, Status Planned/Deferred) sind von belegverknüpften und unbekannt eingestuften Einträgen getrennt. Kein Zusammenzählen von wiederkehrendem Planbetrag und einzelnen Terminen, keine Vermischung mit fakturiertem Umsatz, keine erfundenen Termine. Ohne Terminaufteilung werden Planbetrag und Planungsbeginn ausdrücklich als solche angezeigt. Nicht als offen bestätigte Planstatus stehen aufklappbar separat.
- Auch der erweiterte Import schreibt nur nach komplett erfolgreichem Abruf in Firebase. Das Projektziel wird bei Planumsätzen kontrolliert. Keine HQ-Schreibrechte erweitert. Noch offen ist der Live-Nachweis der Feldbefüllung und der Nummernzuordnung im Mandanten.

Die Erweiterung der Bereitstellungszugriffsart auf die Firmendomäne wurde von der automatischen Freigabeprüfung abgelehnt. Der lokale Manifeststand behält deshalb die vorherige Einstellung `MYSELF`/„Nur ich“ bei. Die zusätzliche serverseitige E-Mail-Freigabe ist implementiert. **Weitere eingetragene E-Mail-Adressen erhalten unter „Nur ich“ noch keinen praktischen Zugang.** Eine passende Google-Bereitstellungsfreigabe muss beim Mehrnutzerstart ausdrücklich geklärt werden. Externe Google-Konten brauchen außerdem einen geprüften Identitätsweg; sie sind durch den internen Einzelkontotest nicht abgedeckt.

## Was im Code vorhanden ist

- Apps-Script-Startseite mit Gestaltung aus der bestehenden Demo, ohne deren Beispieldaten, künstliche Kennzahlen oder Demo-Lokalspeicher. Die bisherige Offline-Demo bleibt als separate historische Datei erhalten.
- Startansicht, Kundenübersicht, Kundendetails, Magazinansicht, HQ-Beleghistorie, integrierte Daten-Testseite und Verwaltung.
- Explizite Google-E-Mail-Freigabe bei jedem öffentlichen neuen Serveraufruf; separate Administratorprüfung für HQ-Abgleich und Freigabeliste. Erster Administrator ist gemäß Nutzervorgabe in der Konfiguration voreingestellt.
- Testweg Firebase lesen → bewusster HQ-Import → Firebase erneut lesen. Keine heimlichen direkten HQ-Lesezugriffe beim Öffnen der Kundendaten.
- Import einer genau identifizierten Pilotausgabe mit Unternehmen und einzelnen Rechnungen/Gutschriften. Name und Projektnummer müssen zusammen passen, falsche Filterergebnisse werden verworfen. Firmen sind dauerhaft nur lesbare Ziele dieses Imports.
- Je Firma eigener Detailimport mit Standard-/Rechnungsadresse, eigenen Feldern, Ansprechpartnern, Kontakt-Historie sowie direkt zugeordneten Projekten und deren Netto-Umsatz. Details werden erst nach abgeschlossenem Abruf in Firebase ersetzt.
- Umsatzprüfung mit Warnungen bei unbekannten Statuswerten, fehlenden Angaben, anderer Währung und potenzieller doppelter Stornokürzung. Eine technische Vollständigkeitsanzeige ersetzt keinen Vergleich mit bekannten HQ-Belegen.
- Manuell importierte Auswahllisten für HQ-Verantwortliche, Firmentypen, Unternehmensbereiche und relevante eigene Felder.
- Eigene Testfirma mit Standardadresse, Firmentyp (Interessent als Vorgabe), verantwortlichem HQ-Benutzer, ausdrücklich gewähltem HQ-Unternehmensbereich, eigenen Feldern und optionalem erstem Ansprechpartner in Firebase erfassen.
- Adressherkunft mit den drei vereinbarten Auswahlen und Pflicht-Freitext bei Sonstige. Bis zur HQ-Feldentscheidung ausschließlich in Firebase speichern.
- Auftragsvorschau und bewusste Ausführung. Firma zuerst anlegen, zurücklesen, zurückgegebene ID sichern, danach Ansprechpartner anlegen und zurücklesen. Zielprüfung ausschließlich über serverseitige Testfirmen-/Auftragszuordnung; ein frei übergebener Firmenname oder eine HQ-ID schaltet kein Bestandsunternehmen frei.
- Unklare Antworten sperren Wiederholungen. Ein eindeutiger Marker ermöglicht das reine Zurücklesen einer eventuell bereits erfolgten Firmen-/Kontaktanlage. Ein nicht eindeutig bestätigter Vorgang bleibt gesperrt und verlangt Prüfung.
- Neue Kontakthistorie für eine eigene Testfirma in Firebase erfassen und kontrolliert nach HQ übertragen.
- Erster Änderungs-/Konflikttest für Branche und Homepage der eigenen Testfirma. Vorherige Firebase-Werte und aktueller HQ-Stand werden verglichen. Entscheidung HQ/App; vor einer erneut freigegebenen App-Änderung nochmals vergleichen.
- Zielumsatz und drei Termine für die Pilotausgabe in Firebase ändern. Versionsvergleich verhindert das unbemerkte Überschreiben paralleler App-Änderungen. Dashboard lädt im Minutenabstand Firebase neu und zeigt letzten Änderungsvermerk.

## Bewusste Grenzen dieses ersten Testschritts

- Keine echte HQ-Schreibprüfung erfolgt. Keine Testfirma in HQ wurde durch diese Arbeit bereits angelegt.
- Keine Projekt-/Rechnungsschreibwege. Rechnungen über mehrere Ausgaben werden noch nicht aufgeteilt; Beträge bleiben bis zum fachlichen Belegvergleich vorläufig.
- Bestehende Kunden aus dem Ausgabeimport sind als HQ-Schreibziele gesperrt. Freischaltung produktiver Stammdatenänderungen ist nicht Bestandteil dieses Schritts.
- Änderungen an weiteren Firmenfeldern, bestehenden Adressen und bestehenden Ansprechpartnern sind noch nicht als Bearbeitungsoberflächen angebunden; die vollständige Neuanlage und der begrenzte Änderungsweg dienen zunächst der Verifikation.
- Weitere Ausgaben, ausgabenübergreifende Filter, App-Buchungen, Wiedervorlagen, Redaktionsemails und differenzierte Rollen bleiben Arbeitspakete des vorgesehenen Piloten. Die neue Oberfläche kennzeichnet fehlende Daten/Funktionen, statt Demoaktionen als echte Speicherung auszugeben.
- Stammdaten-/Detailimporte sind manuelle begrenzte Läufe. Für den Vollbestand sind fortsetzbare Importportionen und der Nachtlauf noch auszubauen. Es wurde kein neuer nächtlicher Trigger eingerichtet.
- Der dokumentierte HQ-PUT-Endpunkt bietet hier keine geprüfte atomare Versionsbedingung: Der Vergleich erkennt vorher sichtbare Änderungen, aber kein garantiertes Sperren anderer HQ-Nutzer zwischen Lesen und Schreiben. Daher vorerst ausschließlich eigene Testfirmen.
- Die Google-Bereitstellung bleibt „Nur ich“. Weitere Konten und externe Identitäten sind noch nicht live geprüft.

## Erster Live-Test nach Bereitstellung

1. App öffnen → **Daten-Testseite** → **1 · Firebase abfragen**. Der alte Firebase-Umsatzpilot ersetzt den neuen Ausgabeimport nicht; ein leerer neuer Bestand ist erwartbar.
2. **2 · Ausgabe HQ → Firebase** starten. Danach **3 · Erneut aus Firebase lesen**. Unternehmen und Belege prüfen.
3. Einen Kunden öffnen → Firebase abfragen → Detailimport → erneut Firebase lesen. Angaben mit HQ vergleichen; diese Firma nicht ändern.
4. Auf der Testseite **Auswahllisten HQ → Firebase** starten und Firebase erneut laden.
5. **Testfirma anlegen**: einen eindeutig als Test gekennzeichneten Namen, Interessent, verantwortlichen HQ-Benutzer und korrekten Unternehmensbereich wählen. Standardadresse und Testkontakt erfassen. Keine echten Kundeninhalte in die Testfirma kopieren.
6. **In Firebase speichern**. Auftrag und Zielwerte prüfen. Erst **Jetzt nach HQ übertragen und prüfen** sendet die vorgesehene Anlage.
7. Bei „Ausgang unklar“ keinen neuen Auftrag anlegen. **Ergebnis nur in HQ prüfen** verwenden und danach den gefundenen Stand gemeinsam auswerten.
8. An der bestätigten Testfirma Kontakt-Historie und den begrenzten Änderungstest ausprobieren. Ein zweiter Klick auf einen bereits bestätigten Auftrag erzeugt keine zweite Anlage.

## Wartung

Quellen: `Sales.gs` für den neuen Serverteil und `Sales.template.html` für die Oberfläche. `build.cjs` übernimmt ausschließlich CSS aus der ursprünglichen Demo und erzeugt `hq-benchmark/SalesBackend.gs` und `hq-benchmark/Sales.html`. Beide Dateien haben absichtlich unterschiedliche Basisnamen; Apps Script erlaubt keine gleichnamige HTML- und Skriptdatei.

```powershell
node sales-app/build.cjs
node sales-app/test-sales.cjs
```

Bereitstellung aus `hq-benchmark` mit der dortigen `.clasp.json` und `.claspignore`. Nur die sieben explizit freigegebenen Apps-Script-Dateien werden hochgeladen. Das vorhandene Benchmark-Frontend bleibt nach Bereitstellung unter derselben Web-App-Adresse mit `?view=benchmark` erreichbar. Bestehende Script Properties für HQ/Firebase bleiben erhalten.

Firestore: neue getrennte Sammlungen `sales_editions`, `sales_companies`, `sales_meta`, `sales_drafts`, `sales_jobs`. Zugriff erfolgt serverseitig über das bereits konfigurierte Dienstkonto. Bestehende Browserregeln sperren diese Sammlungen vollständig; Regeln wurden nicht erweitert. Kundeninhalte werden nicht im Browser-Lokalspeicher abgelegt. Die App speichert dort nur das Farbschema.

Vorheriger Apps-Script-Code als lokale Sicherung: `tmp/apps-script-backup`. Kein Auslesen oder Speichern der geheimen Script Properties.

## Prüfung

27 automatisierte Prüfungen mit vollständig nachgebildeten HQ-/Firebase-Diensten: Identität/Freigabe, Trennung reiner Datenbankabrufe, Schreibzielsperren, Pflichtangaben, Neuanlagereihenfolge, Wiederholung, verlorene Antworten und Markerzuordnung, Rückprüfung, Kontakt-Historie, Konflikte, Erhalt anderer HQ-Felder, Umsatzsonderfälle und parallele Terminänderungen. Zusätzlich Homepagequellen, eindeutige bzw. mehrdeutige Belegzuordnung, Plantermine/Fremdwährungen, abgeschlossene Projekte, gemeinsame Magazinprojekte, vollständiger Detailimport, Erhalt des bisherigen Firebase-Stands bei Planabrufproblemen und sichere aufklappbare Darstellung geprüft. Bestehende Benchmark-, Umsatz-, Browserlogik- und Firebase-Pilottests wurden beim ursprünglichen Pilotstand ebenfalls erfolgreich ausgeführt.

Browserprüfung der lokalen Oberfläche ohne echte Kunden/Server: Startansicht, Testseite, Testfirmenformular, Auswahl Sonstige mit Freitext, Wechsel hell/dunkel und schmale Ansicht bei 390 Pixeln ohne seitlichen Überlauf. `preview.cjs` ist ausschließlich ein lokales Prüfwerkzeug und wird nicht hochgeladen. Es enthält keinerlei echte Kunden oder Zugangsdaten.

API-Grundlage: öffentliche [HQ-v2-OpenAPI-Beschreibung](https://developer.hellohq.io/swagger20.json), am 24.09.2026 gelesen. Dokumentierte Endpunkte und Modelle sind kein Nachweis für erfolgreiche Ausführung im Mandanten.
