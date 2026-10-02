# Weg zur ersten nutzbaren Sales-App

Stand: 02.10.2026 · **2026-10-02-r17 lokal implementiert und synthetisch geprüft**. Nutzer bestätigt den bisherigen Schreibweg und teilweise den Ausgabeimport, meldet aber einen zu großen Firmendatensatz. Vollständigkeit des echten Bestands bleibt offen. Neue verbindliche Folge: alle Daten korrekt in Firebase, gemeinsamer manueller HQ-Sync und getrennte Kunden-/Magazinansichten; danach Schritte 4–7 unten. Nachtlauf zurückgestellt.

**Nachtrag r17:** Erste Firmenerfassung auf seitenweises Speichern beschleunigt; Firmen-/Seitenzahl sichtbar und bestätigte Pause dauerhaft gespeichert. Angehaltenen r16-Lauf nach Dateiaustausch mit HQ-Sync fortsetzen weiterführen, keine neue Auswahl und kein Neustart nötig. Alte Schreibfehler bleiben separat offen. Live-Gesamtabnahme weiterhin ausstehend.

**Aktueller Nachtrag r18 (02.10.2026):** Nach Nutzerauftrag lokal umgesetzt: gemeinsamer seitenweiser Erstimport, Firebase-Zuordnung statt Detailabruf je Firma, getrennte Änderungsmarken für Historie/Belege/Projekte und serverseitige Fortsetzung nach manuellem Start. Firmen/Kontaktadressen/Planumsätze werden gesammelt vollständig geprüft; identische Inhalte lösen keine erneute Veröffentlichung aus. Vollständiger Kontrollabgleich beim nächsten manuellen Start nach sieben Tagen oder Mengenabweichungen; keine sofortige garantierte Löschungserkennung. Alte vollständige Akten und Schreibhinweise bleiben erhalten; alter Leseplan wird auf Sammelimport umgestellt. Browser muss nach eingerichtetem Start nicht offen bleiben. Kein Nachtplan. Neue Google-Freigabe über setupSalesSyncWorker und script.scriptapp erforderlich. Synthetische Prüfungen vorhanden; reale Dauer, Feldvergleich, Gesamtabnahme und Bereitstellung weiterhin offen. Anschließend weiter mit Schritten 4–7.

## Ziel und bisheriger Stand

Die V1 soll den Alltag vom Finden eines Kunden über Kontakt, Wiedervorlage und Buchung bis zur Redaktionsübergabe abbilden. Sie liest aus Firebase; neue Eingaben sind dort sofort nutzbar. Der Nutzer hat einen gemeinsamen manuellen Abgleich beauftragt: App → HQ und danach HQ → Firebase über denselben Button.

Bereits live positiv gemeldet sind Pilotausgabe, Firmen-/Kontaktanlage einschließlich E-Mail und der Kommunikationsabgleich. r16 liest alle Unternehmen, Ansprechpartner und die API-verfügbare Kontakthistorie sowie bewusst ausgewählte Magazinausgaben. Die aktuelle Verkaufsausgabe wird in der Verwaltung ausgewählt, nicht geraten. Nur eigene Testfirmen bleiben HQ-Schreibziele. Nicht alle Felder, Summen und Fehlerfälle sind fachlich abgenommen; die gesamte V1 ist noch nicht fertig.

**Neue Kommunikationsentscheidung:** Aufgabe entfällt bei neuer Erfassung und Übertragung; spätere awork-Anbindung bleibt vorgemerkt. Historische HQ-Aufgaben bleiben lesbar. Notiz, E-Mail, Anruf, Meeting und Besuch zeigen jeweils nur die gewünschten Felder. E-Mail ist ein Historieneintrag mit Empfänger ohne Versand, Anruf hat erreicht/nicht erreicht.

## Empfohlene Bauabschnitte

### 1. Mehrere Ausgaben und einen brauchbaren Datenbestand anbinden

**r16-Status:** Lokal umgesetzt: alle Firmen, Kontakte und Historien seitenweise importieren, auch ohne Magazinrechnung; große Daten aufteilen; alte vollständige Firmenakten bei Abruffehler erhalten. Vollständigkeitszahlen gegen HQ sowie fehlende Firmen je Ausgabe anzeigen. Nicht zugeordnete Kontakte/Historie separat erhalten. Realer Gesamtlauf und fachlicher Vergleich stehen aus; Grenzen in sales-app/README.md.

- Mit dem Coburger beginnen: eine aktuelle Verkaufsausgabe und mindestens fünf vollständig importierte vorherige Ausgaben; danach die anderen vereinbarten Magazine ergänzen.
- Magazine, Ausgaben und jeweilige HQ-Sammelprojekte ausdrücklich zuordnen. Alte Angaben zu aktuellen Ausgabennummern nicht ungeprüft übernehmen.
- Kunden zentral über HQ-IDs speichern; pro Ausgabe Rechnungsbelege mit Beleg-ID, Firmen-ID, Datum und Nettobetrag verknüpfen. Je Kunde/Ausgabe daraus die Historie ableiten. Gleicher Kunde in mehreren Ausgaben bleibt ein Kunde.
- Ansprechpartner, Stammdaten, Kontakt-Historie und Projektübersicht gesammelt importieren, damit nicht jeder Kunde einzeln angeklickt werden muss. Auch alle Interessenten ohne frühere Rechnung aufnehmen; nicht auf Inserenten beschränken.
- Umgesetzter Button: **HQ synchronisieren**. Fortschritt, letzter erfolgreicher Stand, fehlgeschlagene Abschnitte und Fortsetzung sichtbar machen. Größere Läufe in fortsetzbare Portionen aufteilen.
- Wiederholter Import erzeugt keine Dubletten und überschreibt keine offenen App-Änderungen. Ein abgebrochener Import darf keine scheinbar vollständige leere Historie erzeugen.
- Rechnungen/Gutschriften und Netto-Summen an bekannten HQ-Belegen vergleichen. Mehrere Ausgaben auf einer Rechnung bleiben zunächst ungeklärt markiert und außerhalb eindeutig zugeordneter Summen; keine ungeprüfte Verteilung.

**Ergebnis:** Die App hat einen nachvollziehbaren echten Datenbestand für Kunden und Ausgaben.

### 2. Gemeinsamen manuellen HQ-Sync verwenden

**r16-Status:** Lokal umgesetzt. Gespeicherte eigene Testaufträge zuerst nach HQ: Firma bestätigen, danach Ansprechpartner in getrennten Aufrufen, dann weitere erlaubte Änderungen. Anschließend alle HQ-Daten lesen. Ausgaben bewusst per Häkchen auswählen. Fortschritt innerhalb von Kundenakten speichern, anhalten und fortsetzen. Unklare Schreibausgänge/Konflikte nicht blind wiederholen. Nur ein regulärer Sync-Start. Neue Eingaben während eines Laufs beim nächsten neuen Sync; Nachtlauf offen.

### 3. Bestehende Oberfläche mit diesen Daten fertigstellen

**r16-Status:** Kunden nur Namensliste und Namenssuche. Magazinverkauf mit Magazin-/Ausgabenwahl getrennt; bisherige Filter vorläufig erhalten. Neue vorgefertigte Ansichten und genaue Filterregeln noch mit dem Nutzer definieren. Lokal im Browser synthetisch geprüft. Die fünf vorherigen Ausgaben beziehen sich auf die gewählte Verkaufsausgabe; fehlende oder ungeklärte Abdeckung wird kenntlich gemacht. Positive Netto-Rechnungssummen nach Gutschriften dienen als bisherige Teilnahme. Aktuelle App-Buchungen ohne Rechnung sind noch nicht enthalten.

- Magazin/Ausgabe auswählbar machen und die feste Beschränkung auf Ausgabe #70 entfernen.
- Alle importierten Ansprechpartner in der gemeinsamen Ansprechpartneransicht auffindbar machen.
- Erste Filter umsetzen: in der letzten Ausgabe nicht vertreten, davor aber bekannt; mindestens einmal in den letzten fünf Ausgaben; Branche, Ort und Betreuer.
- Historienfilter immer auf das gewählte Magazin und den dokumentierten Importzeitraum beziehen. Fehlende Ausgabe bedeutet unbekannt, nicht keine Buchung. Für frühere Inserenten jenseits der fünf Ausgaben muss auch ältere Historie importiert sein; später den vereinbarten Dreijahresbestand vervollständigen.
- Kundenkarte, Historie und Projektansicht auf Vollständigkeit prüfen; technische Einzeltests in den Verwaltungsbereich verlagern.

**Ergebnis:** Schon vor Freigabe produktiver HQ-Schreibwege lässt sich sinnvoll mit echten Kundendaten arbeiten.

### 4. Persönlichen Google-Zugang für das Pilotteam ermöglichen

- Anmeldung mit ausdrücklich erlaubten Google-Adressen umsetzen und mit einem zweiten Konto testen. Die aktuelle Bereitstellung nur für das Bereitstellerkonto genügt nicht.
- Kleine Rollenbasis vorsehen: Administration, Vertrieb, Redaktion; redaktionelle Pflege von Ausgabenzielen und Terminen gemäß späterer Nutzerpräzisierung berücksichtigen.
- Aktionen und Verantwortlichkeiten einem App-Nutzer zuordnen; HQ-Verantwortlichen vorerst getrennt auswählen. Kein eigenes HQ-Konto pro App-Nutzer voraussetzen.
- Unzulässige Konten und Aktionen serverseitig sperren.

**Ergebnis:** Ein kleines internes Team kann denselben Bestand mit persönlicher Anmeldung nutzen. Externe Freigabe bleibt ein eigener späterer Schritt.

### 5. Gespräche, Wiedervorlagen und Stammdatenbearbeitung ergänzen

- Gespräch/Telefonat/Notiz mit Kunde, optionalem Ansprechpartner, Ausgabe, Ergebnis und Datum in Firebase erfassen.
- Wiedervorlage mit Verantwortlichem und Termin speichern, verschieben und erledigen; auf **Mein Tag** anzeigen.
- Firmen und Ansprechpartner anlegen sowie die vereinbarten Stammdaten bearbeiten. Dublettenhinweise und Kunden-/Interessentenstatus einbeziehen.
- Gemeinsamen Button **HQ synchronisieren** beibehalten. Zusätzliche produktive Schreibwege gezielt prüfen und in die Warteschlange integrieren; Firma vor Ansprechpartner verarbeiten, bestätigte HQ-IDs speichern und Rückprüfung durchführen. Aus einem manuellen Start dürfen mehrere voneinander abhängige, getrennte Schritte entstehen.
- Bekannte Konflikte anzeigen und entscheiden lassen; unbekannte Schreibausgänge nicht blind wiederholen. Bearbeitung bestehender echter Firmen erst nach gezieltem Test der neuen Bearbeitungswege freigeben; bisherige TEST-Sperre nicht pauschal entfernen.
- Historienübertragung mit eindeutiger Zuordnung prüfen. Wiedervorlagen und Adressherkunft vorerst App-Daten, keine erfundenen HQ-Felder.

**Ergebnis:** Kundenansprache und Nachfassen laufen in der App, unabhängig vom Zeitpunkt des HQ-Abgleichs.

### 6. Buchungen und Redaktionsübergabe fertigstellen

- Buchung mit Kunde, Ausgabe, Produkt/Format, vereinbartem Nettopreis, Verkäufer und optionalem Ansprechpartner erfassen; Änderung und Storno vorsehen.
- Sonderpreise und einfache Paketkennung erhalten. Preise aus Mediadaten vor Verwendung auf Aktualität prüfen.
- Zielumsatz, Anzeigenschluss, Drucktermin und Veröffentlichung je Ausgabe pflegen; Änderungen für beteiligte Vertriebler sichtbar machen.
- Gebuchten und fakturierten Umsatz getrennt anzeigen. Eine spätere HQ-Rechnung mit der App-Buchung verknüpfen, damit derselbe Verkauf nicht doppelt zählt. Unklare Zuordnung manuell klären.
- Redaktion eine Buchungsliste sowie Vorschau und bewussten Versand anbieten; Empfänger vor Nutzung konfigurieren, Meldestatus und spätere Änderungen kennzeichnen.
- Rechnungen weiterhin in HQ erstellen. Keine Projekt-/Rechnungsschreibwege in dieser V1; HQ-Planumsatzerzeugung bleibt auf der späteren Roadmap.

**Ergebnis:** Ein tatsächlicher Verkauf lässt sich vollständig festhalten und an die Redaktion übergeben.

### 7. Eine aktuelle Ausgabe im kleinen Team testen

- Mit wenigen freigegebenen internen Nutzern eine aktuelle Ausgabe bearbeiten; bestehende Testdaten als solche erkennbar halten.
- Den gesamten Ablauf Kunde finden → Kontakt dokumentieren → Wiedervorlage → Buchung → Redaktion → manueller HQ-Abgleich durchspielen.
- Zwei gleichzeitige Nutzer, Sichtbarkeit von Änderungen, wiederholten Import, Abbruch/Fortsetzung und doppelte Schreibstarts prüfen.
- Datensicherung und Wiederherstellung für Firebase festlegen und erproben; GitHub sichert den Code, nicht den laufenden Kundenbestand.
- Danach die weiteren Pilotmagazine und den Dreijahresbestand schrittweise freigeben. Vorhandene Vertriebslisten bei Bedarf mit dem geplanten Excel-Import übernehmen; Bedarf zuerst klären.

**Ergebnis:** Eine abgegrenzte V1, deren zentrale Alltagsabläufe live bestätigt sind. Nachtlauf, externe Nutzer, Gmail-/awork-Anbindung und größere Auswertungen folgen später; bestehende Roadmap-Wünsche bleiben erhalten.

## Unmittelbarer nächster Schritt

Die [Anleitung für r17](../sales-app/MANUELL-UEBERTRAGEN.md) enthält Menüwege, Erwartungen und Fehlerfälle.

- SalesBackend.gs vollständig in der gleichnamigen Google-Datei ersetzen.
- Sales.html vollständig in der gleichnamigen Google-Datei ersetzen.
- Unter Bereitstellen → Bereitstellungen verwalten die bestehende Web-App auf Neue Version setzen.
- In der Web-App 2026-10-02-r17 prüfen; bei Abweichung zuerst Dateistände korrigieren.
- Unter Datenabgleich → Aufträge und Konflikte ansehen offene Testaufträge prüfen.
- Unter Verwaltung gewünschte Magazinausgaben per Projektsuche anhaken.
- Auswahl für HQ-Sync speichern anklicken; startet keinen Import.
- Beim bestehenden angehaltenen Lauf unter Datenabgleich HQ-Sync fortsetzen anklicken; den aktuellen Wiederaufnahmeabschnitt der Anleitung verwenden.
- Danach Abschlusszahlen gegen HQ und Vollständigkeit je Ausgabe prüfen.
- Kunden, Kontakte, Historie und Belegbeträge stichprobenartig mit HQ vergleichen.
- Bei Fehlern nach Anleitung Abschnitt und technischen Text mitteilen.

Danach gemäß Nutzerauftrag Schritte 4–7. Bestandskundenbearbeitung bis zum gezielten Ausbau geschützt. Weitere Magazine lassen sich bereits auswählen. Frühere Wünsche wie Dreijahreshistorie, Mediadaten, Sonderpreise/Pakete, Excel-Import, Gmail, awork, externe Nutzer und größere Auswertungen bleiben erhalten.
