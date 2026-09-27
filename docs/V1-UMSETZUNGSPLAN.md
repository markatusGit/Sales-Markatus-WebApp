# Weg zur ersten nutzbaren Sales-App

Stand: 27.09.2026. Der Nutzer hat die Reihenfolge inzwischen bestätigt: zuerst Kontakthistorie in beide Richtungen live testen, danach den bestehenden Piloten aufräumen und die Chat-Punkte 1–3 umsetzen (mehrere Ausgaben, manueller Datenabgleich, Magazin-/Kundenansichten und Filter). Diese drei Chat-Punkte sind unten in den Bauabschnitten 1 und 2 zusammengefasst; der hier nummerierte Bauabschnitt 3 ist der spätere Google-Zugang. Keine pauschale Freigabe produktiver HQ-Schreibzugriffe. Grundlage sind das Projekttagebuch, das Vertriebskonzept und der aktuelle Quellcode. Die E-Mail-Übertragung wurde vom Nutzer bestätigt; eine zusätzliche vollständige Neuanlage mit r9 ist nicht ausdrücklich bestätigt.

## Ziel und bisheriger Stand

Die V1 soll den Alltag vom Finden eines Kunden über Kontakt, Wiedervorlage und Buchung bis zur Redaktionsübergabe abbilden. Sie liest aus Firebase; neue Eingaben sind dort sofort nutzbar. Der Nutzer erwägt zunächst einen manuellen Abgleich statt eines Nachtlaufs. Empfehlung: Dies für die erste V1 übernehmen, mit getrennten Aktionen für Lesen aus HQ und Schreiben nach HQ.

Bereits vorhanden sind der Import einer Pilotausgabe, Kundendetails, Kontakt-/Projekthistorie und die Speicherung eigener Testfirmen mit Ansprechpartner. Der Nutzer bestätigt den Import der Pilotausgabe sowie erfolgreiche Firmen-/Kontaktanlage einschließlich E-Mail im bisherigen Testverlauf. Nicht alle Felder, Summen und Fehlerfälle sind dadurch fachlich abgenommen. Die Anwendung ist weiterhin auf eine feste Ausgabe und eigene Testfirmen als Schreibziele begrenzt. Eine allgemeine V1 ist noch nicht fertig.

## Empfohlene Bauabschnitte

### 1. Mehrere Ausgaben und einen brauchbaren Datenbestand anbinden

- Mit dem Coburger beginnen: eine aktuelle Verkaufsausgabe und mindestens fünf vollständig importierte vorherige Ausgaben; danach die anderen vereinbarten Magazine ergänzen.
- Magazine, Ausgaben und jeweilige HQ-Sammelprojekte ausdrücklich zuordnen. Alte Angaben zu aktuellen Ausgabennummern nicht ungeprüft übernehmen.
- Kunden zentral über HQ-IDs speichern; pro Ausgabe Rechnungsbelege mit Beleg-ID, Firmen-ID, Datum und Nettobetrag verknüpfen. Je Kunde/Ausgabe daraus die Historie ableiten. Gleicher Kunde in mehreren Ausgaben bleibt ein Kunde.
- Ansprechpartner, Stammdaten, Kontakt-Historie und Projektübersicht gesammelt importieren, damit nicht jeder Kunde einzeln angeklickt werden muss. Auch Interessenten ohne frühere Rechnung gezielt aufnehmen; nicht auf Inserenten beschränken.
- Vorgeschlagener Button: **Daten aus HQ aktualisieren**. Fortschritt, letzter erfolgreicher Stand, fehlgeschlagene Abschnitte und Fortsetzung sichtbar machen. Größere Läufe in fortsetzbare Portionen aufteilen.
- Wiederholter Import erzeugt keine Dubletten und überschreibt keine offenen App-Änderungen. Ein abgebrochener Import darf keine scheinbar vollständige leere Historie erzeugen.
- Rechnungen/Gutschriften und Netto-Summen an bekannten HQ-Belegen vergleichen. Mehrere Ausgaben auf einer Rechnung bleiben zunächst ungeklärt markiert und außerhalb eindeutig zugeordneter Summen; keine ungeprüfte Verteilung.

**Ergebnis:** Die App hat einen nachvollziehbaren echten Datenbestand für Kunden und Ausgaben.

### 2. Bestehende Oberfläche mit diesen Daten fertigstellen

- Magazin/Ausgabe auswählbar machen und die feste Beschränkung auf Ausgabe #70 entfernen.
- Alle importierten Ansprechpartner in der gemeinsamen Ansprechpartneransicht auffindbar machen.
- Erste Filter umsetzen: in der letzten Ausgabe nicht vertreten, davor aber bekannt; mindestens einmal in den letzten fünf Ausgaben; Branche, Ort und Betreuer.
- Historienfilter immer auf das gewählte Magazin und den dokumentierten Importzeitraum beziehen. Fehlende Ausgabe bedeutet unbekannt, nicht keine Buchung. Für frühere Inserenten jenseits der fünf Ausgaben muss auch ältere Historie importiert sein; später den vereinbarten Dreijahresbestand vervollständigen.
- Kundenkarte, Historie und Projektansicht auf Vollständigkeit prüfen; technische Einzeltests in den Verwaltungsbereich verlagern.

**Ergebnis:** Schon vor Freigabe produktiver HQ-Schreibwege lässt sich sinnvoll mit echten Kundendaten arbeiten.

### 3. Persönlichen Google-Zugang für das Pilotteam ermöglichen

- Anmeldung mit ausdrücklich erlaubten Google-Adressen umsetzen und mit einem zweiten Konto testen. Die aktuelle Bereitstellung nur für das Bereitstellerkonto genügt nicht.
- Kleine Rollenbasis vorsehen: Administration, Vertrieb, Redaktion; redaktionelle Pflege von Ausgabenzielen und Terminen gemäß späterer Nutzerpräzisierung berücksichtigen.
- Aktionen und Verantwortlichkeiten einem App-Nutzer zuordnen; HQ-Verantwortlichen vorerst getrennt auswählen. Kein eigenes HQ-Konto pro App-Nutzer voraussetzen.
- Unzulässige Konten und Aktionen serverseitig sperren.

**Ergebnis:** Ein kleines internes Team kann denselben Bestand mit persönlicher Anmeldung nutzen. Externe Freigabe bleibt ein eigener späterer Schritt.

### 4. Den täglichen Vertriebsablauf vervollständigen

- Gespräch/Telefonat/Notiz mit Kunde, optionalem Ansprechpartner, Ausgabe, Ergebnis und Datum in Firebase erfassen.
- Wiedervorlage mit Verantwortlichem und Termin speichern, verschieben und erledigen; auf **Mein Tag** anzeigen.
- Firmen und Ansprechpartner anlegen sowie die vereinbarten Stammdaten bearbeiten. Dublettenhinweise und Kunden-/Interessentenstatus einbeziehen.
- Vorgeschlagener Button: **Offene Änderungen nach HQ übertragen**. Änderungen zunächst anzeigen; Firma vor Ansprechpartner verarbeiten, bestätigte HQ-IDs speichern und Rückprüfung durchführen. Aus einem manuellen Start dürfen mehrere voneinander abhängige, getrennte Schritte entstehen.
- Bekannte Konflikte anzeigen und entscheiden lassen; unbekannte Schreibausgänge nicht blind wiederholen. Bearbeitung bestehender echter Firmen erst nach gezieltem Test der neuen Bearbeitungswege freigeben; bisherige TEST-Sperre nicht pauschal entfernen.
- Historienübertragung mit eindeutiger Zuordnung prüfen. Wiedervorlagen und Adressherkunft vorerst App-Daten, keine erfundenen HQ-Felder.

**Ergebnis:** Kundenansprache und Nachfassen laufen in der App, unabhängig vom Zeitpunkt des HQ-Abgleichs.

### 5. Neue Buchungen und Ausgabensteuerung ergänzen

- Buchung mit Kunde, Ausgabe, Produkt/Format, vereinbartem Nettopreis, Verkäufer und optionalem Ansprechpartner erfassen; Änderung und Storno vorsehen.
- Sonderpreise und einfache Paketkennung erhalten. Preise aus Mediadaten vor Verwendung auf Aktualität prüfen.
- Zielumsatz, Anzeigenschluss, Drucktermin und Veröffentlichung je Ausgabe pflegen; Änderungen für beteiligte Vertriebler sichtbar machen.
- Gebuchten und fakturierten Umsatz getrennt anzeigen. Eine spätere HQ-Rechnung mit der App-Buchung verknüpfen, damit derselbe Verkauf nicht doppelt zählt. Unklare Zuordnung manuell klären.
- Redaktion eine Buchungsliste sowie Vorschau und bewussten Versand anbieten; Empfänger vor Nutzung konfigurieren, Meldestatus und spätere Änderungen kennzeichnen.
- Rechnungen weiterhin in HQ erstellen. Keine Projekt-/Rechnungsschreibwege in dieser V1; HQ-Planumsatzerzeugung bleibt auf der späteren Roadmap.

**Ergebnis:** Ein tatsächlicher Verkauf lässt sich vollständig festhalten und an die Redaktion übergeben.

### 6. Einen kleinen Alltagspiloten abnehmen

- Mit wenigen freigegebenen internen Nutzern eine aktuelle Ausgabe bearbeiten; bestehende Testdaten als solche erkennbar halten.
- Den gesamten Ablauf Kunde finden → Kontakt dokumentieren → Wiedervorlage → Buchung → Redaktion → manueller HQ-Abgleich durchspielen.
- Zwei gleichzeitige Nutzer, Sichtbarkeit von Änderungen, wiederholten Import, Abbruch/Fortsetzung und doppelte Schreibstarts prüfen.
- Datensicherung und Wiederherstellung für Firebase festlegen und erproben; GitHub sichert den Code, nicht den laufenden Kundenbestand.
- Danach die weiteren Pilotmagazine und den Dreijahresbestand schrittweise freigeben. Vorhandene Vertriebslisten bei Bedarf mit dem geplanten Excel-Import übernehmen; Bedarf zuerst klären.

**Ergebnis:** Eine abgegrenzte V1, deren zentrale Alltagsabläufe live bestätigt sind. Nachtlauf, externe Nutzer, Gmail-/awork-Anbindung und größere Auswertungen folgen später; bestehende Roadmap-Wünsche bleiben erhalten.

## Unmittelbarer nächster Schritt

Zuerst den vorbereiteten Historientest r11 nach [MANUELL-UEBERTRAGEN.md](../sales-app/MANUELL-UEBERTRAGEN.md) durchführen: bestehende HQ-Historie samt Rechnungsversand lesen, eigene Kommunikation bei einer Testfirma über Firebase nach HQ schreiben, erneut importieren und auf Doppelanzeigen prüfen. r11 ist lokal implementiert und geprüft. Den HQ-Leseweg hat der Nutzer positiv gemeldet; für den Schreibtest sind der Kommunikationsbutton korrigiert und Aufgaben ergänzt. Der Live-Schreibnachweis steht aus. Danach wie beauftragt aufräumen und Bauabschnitt 1 und anschließend 2 umsetzen. Zugang für weitere Konten vor dem Teamtest ergänzen. Die folgenden Ausgabenangaben werden erst für den anschließenden Ausbau benötigt:

- Die aktuell zu verkaufende Coburger-Ausgabe nennen.
- Ihre HQ-Projektnummer nennen, falls das Sammelprojekt schon angelegt ist.
- Die einzubeziehenden vorherigen Coburger-Ausgaben nennen; für den Fünf-Ausgaben-Filter mindestens fünf.
- Die jeweiligen HQ-Projektnummern nennen, soweit vorhanden. Fehlende Zuordnungen können im nächsten Ausbau über eine reine HQ-Projektsuche angeboten und vom Nutzer bestätigt werden; keine geheimen Schlüssel nötig.

Danach lässt sich der nächste Ausbau konkret auf diese Ausgaben zuschneiden. Die Konfiguration soll weitere Magazine/Ausgaben ohne neue fest eingebaute Projektkennungen ermöglichen.
