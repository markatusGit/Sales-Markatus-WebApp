# Apps-Script-Datenpilot

Stand: 26.09.2026, lokal vorbereitete Version `2026-09-26-r7`. Der Nutzer hat App-Start, 21 importierte Firmen mit Rechnungen der Ausgabe #70, einen Kundendetailimport sowie Homepage und kompakte Kontakt-Historie im Live-Test bestätigt. Der frühere Versuch, eine bereits in HQ angelegte Testfirma nachträglich zu vervollständigen, hat nicht wie erwartet funktioniert. Der nächste Test konzentriert sich deshalb auf **eine neue Firma mit direkt erfasstem Ansprechpartner**. Die Firmenanlage aus r6 wurde live bestätigt, der Ansprechpartner fehlt jedoch weiterhin; der gespeicherte Auftrag meldet HTTP 400. Die konkrete Ursache ist noch offen. r7 trennt die beiden Aufrufe ausdrücklich und ergänzt datensparsame Fehlerdiagnosen. Diese neue Version muss der Nutzer noch selbst nach Apps Script übertragen und live prüfen.

**Neuer Nutzerwunsch:** Ab jetzt nur lokale Dateien vorbereiten. Der Nutzer übernimmt Übertragung und Veröffentlichung selbst. Keine weiteren automatischen Uploads oder Bereitstellungsänderungen ohne erneuten ausdrücklichen Auftrag. Anleitung: [MANUELL-UEBERTRAGEN.md](MANUELL-UEBERTRAGEN.md).

## Nächster Schritt für den Nutzer

1. `SalesBackend.gs` und `Sales.html` anhand von [MANUELL-UEBERTRAGEN.md](MANUELL-UEBERTRAGEN.md) vollständig ersetzen und bei der vorhandenen Bereitstellung **Neue Version** wählen. Keine neuen Skripteigenschaften oder Bereitstellungsrechte nötig.
2. Die sichtbare Kennung `2026-09-26-r7` prüfen.
3. Eine neue Firma mit `TEST ` am Namensanfang und erfundenem Ansprechpartner in Firebase speichern. Sofortige Anzeige in **Kunden** und **Ansprechpartner** prüfen, bevor ein HQ-Schreibauftrag gestartet wird.
4. Auf der Firebase-Kundenkarte **1. Firma in HQ anlegen und bestätigen** starten. Die bestätigte Firma in HQ prüfen.
5. Nach einer bewussten Testpause **2. Ansprechpartner nach HQ übertragen** starten. In HQ genau einen Ansprechpartner bei dieser Firma prüfen. Bei unklarem Ausgang den technischen Status melden; keine neue Testfirma mit denselben Daten anlegen.

## Update nach der ersten eigenen Testfirma

- Oberfläche und Server melden dieselbe Release-Kennung; bei unterschiedlichen Ständen wird die normale Bedienung angehalten. Die Kennung steht sichtbar oben. Alte Firebase-Firmendetails werden als solche gekennzeichnet; ein erfolgreicher Detailimport liest automatisch aus Firebase zurück.
- Branchen und Anreden sind Auswahlfelder. Ihre Werte werden beim bewusst gestarteten Auswahllistenimport aus tatsächlich in HQ verwendeten Firmen- und Ansprechpartnerangaben gesammelt. Die HQ-v2-Modelle liefern diese Felder als freie Zeichenfolge ohne eigenen Katalog-Endpunkt, daher sind noch nie verwendete UI-Werte nicht automatisch verfügbar. Nur die unterschiedlichen Bezeichnungen werden in Firebase gespeichert. Kundenklassifizierung und Kundenherkunft sind bei der Neuanlage ausgeblendet.
- Homepage-Eingaben wie `test.de` und `www.test.de` werden serverseitig zu `https://...` ergänzt; das Browserformular nimmt sie ebenfalls an. Neue Testfirmen speichern denselben Wert im HQ-Firmenfeld und an der Standardadresse, danach wird beides zurückgelesen. Für die schon angelegte eigene Testfirma gibt es einen gezielten Prüfknopf und den bisherigen Änderungsauftrag, der jetzt auch die eindeutig identifizierte HQ-Standardadresse prüft und aktualisiert. Abweichende HQ-Werte erzeugen einen Konflikt; fehlende Adresszuordnung stoppt vor dem Schreiben. Verlorene Antworten werden anhand der HQ-ID zurückgeprüft, ohne eine zweite Firma anzulegen.
- Die technische Kennzeichnung in der Beschreibung war der Wiederaufnahmemarker für einen möglichen Abbruch beim Anlegen. Nach vollständig bestätigter Neuanlage wird sie aus der Beschreibung entfernt und der bereinigte Wert rückgelesen. Für die schon angelegte Testfirma kann nach einer reinen HQ-Prüfung ein separater Vorschauauftrag die Kennzeichnung entfernen. Ein bestehender anderer Beschreibungstext wird nicht überschrieben.
- Programmdateien und synthetische Tests lokal aktualisiert. Noch nicht bestätigt ist die Ausführung der zusätzlichen HQ-Adressschreibroute im echten Mandanten. Nur eigene Testfirmen sind Schreibziele. Der aktuelle bereitgestellte Code-Stand muss anhand der neuen sichtbaren Kennung geprüft werden.

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
- Manuell importierte Auswahllisten für HQ-Verantwortliche, Firmentypen, Unternehmensbereiche sowie beobachtete Branchen und Anreden; relevante eigene Felder bleiben für spätere Schritte verfügbar.
- Eigene Testfirma mit Standardadresse, Firmentyp (Interessent als Vorgabe), verantwortlichem HQ-Benutzer, ausdrücklich gewähltem HQ-Unternehmensbereich und erstem Ansprechpartner in Firebase erfassen. Für diesen Neuanlage-Test sind Vor- und Nachname des Kontakts Pflichtfelder. Beide sind sofort in Kunden- und Ansprechpartneransicht sichtbar, auch ohne HQ-ID.
- Adressherkunft mit den drei vereinbarten Auswahlen und Pflicht-Freitext bei Sonstige. Bis zur HQ-Feldentscheidung ausschließlich in Firebase speichern.
- Auftragsvorschau und zwei ausdrücklich getrennte Ausführungen: Schritt 1 sendet nur die Firma und bestätigt ihre Identität per Rücklesung. Schritt 2 ist erst mit gespeicherter Firmenbestätigung möglich, liest dieselbe Firmen-ID erneut und überträgt dann den Kontakt. Kein automatischer Übergang und keine automatische Wiederholung von Schreibversuchen. Der Zwischenstand liegt in Firebase und überlebt das Schließen der App. Zielprüfung ausschließlich über serverseitige Testfirmen-/Auftragszuordnung; frei übergebene Firmen-IDs schalten kein Bestandsunternehmen frei.
- Unklare Antworten sperren Wiederholungen. Ein eindeutiger Marker ermöglicht das reine Zurücklesen einer eventuell bereits erfolgten Firmen-/Kontaktanlage. Ein nicht eindeutig bestätigter Vorgang bleibt gesperrt und verlangt Prüfung.
- Neue Kontakthistorie für eine eigene Testfirma in Firebase erfassen und kontrolliert nach HQ übertragen.
- Erster Änderungs-/Konflikttest für Branche und Homepage der eigenen Testfirma. Vorherige Firebase-Werte und aktueller HQ-Stand werden verglichen. Entscheidung HQ/App; vor einer erneut freigegebenen App-Änderung nochmals vergleichen.
- Zielumsatz und drei Termine für die Pilotausgabe in Firebase ändern. Versionsvergleich verhindert das unbemerkte Überschreiben paralleler App-Änderungen. Dashboard lädt im Minutenabstand Firebase neu und zeigt letzten Änderungsvermerk.

## Bewusste Grenzen dieses ersten Testschritts

- Firma in HQ live bestätigt; Kontaktanlage weiterhin ohne Live-Erfolgsnachweis. Der HTTP-400-Grund ist nicht eindeutig bekannt. Leere optionale Kontaktwerte werden jetzt ausgelassen; künftige Fehler zeigen Endpunkt und erkannte Feldnamen ohne rohe Kundenwerte. r7 hat noch keinen automatischen Nachtlauf.
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
6. **In Firebase speichern**. Danach die getrennten Firmen- und Kontakt-Schritte gemäß der aktuellen manuellen Anleitung ausführen.
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

53 automatisierte Prüfungen mit vollständig nachgebildeten HQ-/Firebase-Diensten: Identität/Freigabe, Trennung reiner Datenbankabrufe, Schreibzielsperren, Pflichtangaben, Neuanlagereihenfolge, Wiederholung, verlorene Antworten und Markerzuordnung, Rückprüfung, Kontakt-Historie, Konflikte, Erhalt anderer HQ-Felder, Umsatzsonderfälle und parallele Terminänderungen. Zusätzlich Homepagequellen, eindeutige bzw. mehrdeutige Belegzuordnung, Plantermine/Fremdwährungen, abgeschlossene Projekte, gemeinsame Magazinprojekte, vollständiger Detailimport, Erhalt des bisherigen Firebase-Stands bei Planabrufproblemen, Branchen-/Anredeoptionen, Formularnormalisierung, Kennzeichnungsbereinigung, Homepageänderung in Firmen- und Adressfeld, Konflikte, verlorene Antworten, Versionsabgleich und sichere aufklappbare Darstellung geprüft. Bestehende Benchmark-, Umsatz-, Browserlogik- und Firebase-Pilottests wurden beim ursprünglichen Pilotstand ebenfalls erfolgreich ausgeführt.

Browserprüfung der lokalen Oberfläche ohne echte Kunden/Server: Startansicht, Testseite, Testfirmenformular, Auswahl Sonstige mit Freitext, Wechsel hell/dunkel und schmale Ansicht bei 390 Pixeln ohne seitlichen Überlauf. `preview.cjs` ist ausschließlich ein lokales Prüfwerkzeug und wird nicht hochgeladen. Es enthält keinerlei echte Kunden oder Zugangsdaten.

API-Grundlage: öffentliche [HQ-v2-OpenAPI-Beschreibung](https://developer.hellohq.io/swagger20.json), am 24.09.2026 gelesen. Dokumentierte Endpunkte und Modelle sind kein Nachweis für erfolgreiche Ausführung im Mandanten.
