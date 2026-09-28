# Weg zur ersten nutzbaren Sales-App

Stand: 28.09.2026. Der Nutzer hat den bisherigen Historien-Lese- und Schreibweg nach HQ bestätigt. Aufräumen und die Chat-Punkte 1–3 (mehrere Ausgaben, manueller Datenabgleich, Magazin-/Kundenansichten und Filter) sind mit **2026-09-28-r14 lokal implementiert und synthetisch geprüft**; Bereitstellung und Live-Abnahme sind offen. Diese drei Chat-Punkte entsprechen unten den Bauabschnitten 1 und 2. Bauabschnitt 3 ist der spätere Google-Zugang und wurde noch nicht umgesetzt. Keine pauschale Freigabe produktiver HQ-Schreibzugriffe.

**Nachtrag r15:** Der Nutzer konnte r14 wegen der Projektsuche noch nicht weiter prüfen. Suche lokal auf dokumentiertes substringof korrigiert; sichtbare Fehler, Trefferliste mit Häkchen, mehrseitige Treffer und Import der bewusst ausgewählten Ausgaben ergänzt. Die folgenden V1-Lese-/Filterschritte sind weiterhin nicht live abgenommen.

## Ziel und bisheriger Stand

Die V1 soll den Alltag vom Finden eines Kunden über Kontakt, Wiedervorlage und Buchung bis zur Redaktionsübergabe abbilden. Sie liest aus Firebase; neue Eingaben sind dort sofort nutzbar. Der Nutzer erwägt zunächst einen manuellen Abgleich statt eines Nachtlaufs. Empfehlung: Dies für die erste V1 übernehmen, mit getrennten Aktionen für Lesen aus HQ und Schreiben nach HQ.

Bereits live positiv gemeldet sind Pilotausgabe, Firmen-/Kontaktanlage einschließlich E-Mail und der Kommunikationsabgleich. r14 erweitert den Leseumfang auf bewusst zugeordnete Ausgaben und gezielt aufgenommene Interessenten. Die aktuelle Verkaufsausgabe wird in der Verwaltung ausgewählt, nicht geraten. Nur eigene Testfirmen bleiben HQ-Schreibziele. Nicht alle Felder, Summen und Fehlerfälle sind fachlich abgenommen; die gesamte V1 ist noch nicht fertig.

**Neue Kommunikationsentscheidung:** Aufgabe entfällt bei neuer Erfassung und Übertragung; spätere awork-Anbindung bleibt vorgemerkt. Historische HQ-Aufgaben bleiben lesbar. Notiz, E-Mail, Anruf, Meeting und Besuch zeigen jeweils nur die gewünschten Felder. E-Mail ist ein Historieneintrag mit Empfänger ohne Versand, Anruf hat erreicht/nicht erreicht.

## Empfohlene Bauabschnitte

### 1. Mehrere Ausgaben und einen brauchbaren Datenbestand anbinden

**r14-Status:** Lokal umgesetzt. Der manuelle Import speichert Fortschritt je Belegseite oder Firma und kann angehalten, fortgesetzt und abschnittsweise nach Fehlern wiederholt werden. Zentrale Kunden-/Kontaktübersichten und gezielte Aufnahme vorhandener Interessenten sind vorhanden. Live-Belegvergleich steht aus. Sehr große Firmen/Directory-Daten benötigen ggf. feinere Aufteilung; siehe sales-app/README.md. Mehrfachausgabenbelege werden bewusst manuell markiert, nicht automatisch erkannt.

- Mit dem Coburger beginnen: eine aktuelle Verkaufsausgabe und mindestens fünf vollständig importierte vorherige Ausgaben; danach die anderen vereinbarten Magazine ergänzen.
- Magazine, Ausgaben und jeweilige HQ-Sammelprojekte ausdrücklich zuordnen. Alte Angaben zu aktuellen Ausgabennummern nicht ungeprüft übernehmen.
- Kunden zentral über HQ-IDs speichern; pro Ausgabe Rechnungsbelege mit Beleg-ID, Firmen-ID, Datum und Nettobetrag verknüpfen. Je Kunde/Ausgabe daraus die Historie ableiten. Gleicher Kunde in mehreren Ausgaben bleibt ein Kunde.
- Ansprechpartner, Stammdaten, Kontakt-Historie und Projektübersicht gesammelt importieren, damit nicht jeder Kunde einzeln angeklickt werden muss. Auch Interessenten ohne frühere Rechnung gezielt aufnehmen; nicht auf Inserenten beschränken.
- Vorgeschlagener Button: **Daten aus HQ aktualisieren**. Fortschritt, letzter erfolgreicher Stand, fehlgeschlagene Abschnitte und Fortsetzung sichtbar machen. Größere Läufe in fortsetzbare Portionen aufteilen.
- Wiederholter Import erzeugt keine Dubletten und überschreibt keine offenen App-Änderungen. Ein abgebrochener Import darf keine scheinbar vollständige leere Historie erzeugen.
- Rechnungen/Gutschriften und Netto-Summen an bekannten HQ-Belegen vergleichen. Mehrere Ausgaben auf einer Rechnung bleiben zunächst ungeklärt markiert und außerhalb eindeutig zugeordneter Summen; keine ungeprüfte Verteilung.

**Ergebnis:** Die App hat einen nachvollziehbaren echten Datenbestand für Kunden und Ausgaben.

### 2. Bestehende Oberfläche mit diesen Daten fertigstellen

**r14-Status:** Lokal umgesetzt und im Browser mit synthetischen Daten geprüft. Die fünf vorherigen Ausgaben beziehen sich auf die gewählte Verkaufsausgabe; fehlende oder ungeklärte Abdeckung wird kenntlich gemacht. Positive Netto-Rechnungssummen nach Gutschriften dienen als bisherige Teilnahme. Aktuelle App-Buchungen ohne Rechnung sind noch nicht enthalten.

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

Die kleinschrittige [Anleitung für r15](../sales-app/MANUELL-UEBERTRAGEN.md) enthält alle Menüwege, Erwartungen und Fehlerfälle.

- SalesBackend.gs vollständig in der gleichnamigen Google-Datei ersetzen.
- Sales.html vollständig in der gleichnamigen Google-Datei ersetzen.
- Unter Bereitstellen → Bereitstellungen verwalten die bestehende Web-App auf Neue Version setzen.
- In der Web-App die Kennung 2026-09-28-r15 prüfen; bei Abweichung erst die Dateistände korrigieren.
- Bei der vorhandenen eigenen Testfirma die fünf Kontaktarten nach Anleitung prüfen.
- Unter Verwaltung die aktuelle Verkaufsausgabe ihrem HQ-Projekt zuordnen.
- Dort die fünf unmittelbar vorherigen Ausgaben ihren HQ-Projekten zuordnen.
- Unter Datenabgleich den Button Daten aus HQ aktualisieren verwenden; Fehlerabschnitte nach Anleitung prüfen.
- Nach Abschluss Kunden, Ansprechpartner und Belegbeträge mit HQ vergleichen.
- Unter Magazinverkauf die beiden Historienfilter nach Anleitung testen.

Danach Bauabschnitt 3 (Google-Zugang/Team) und anschließend Vertriebsablauf, Buchungen und Redaktion weiterführen. Der Nachtlauf bleibt zurückgestellt. Ein HQ-Schreibsammellauf gehört nicht zu r14; bestehende Einzelvorschauen und TEST-Zielsperren bleiben erhalten. Zusätzliche Magazine lassen sich bereits über dieselbe Verwaltung konfigurieren.
