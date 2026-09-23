# Magazinvertrieb – Konzept und Pilot

Stand: 22. September 2026 · Konzeptversion 1 · Grundlage: gemeinsame Anforderungsrunde

Dieses Dokument beschreibt die geplante Anwendung. Der begleitende klickbare Entwurf verwendet ausschließlich erfundene Kunden, Kontakte und Buchungen. Es gibt noch keine Verbindung zu HQ, keine echten Nutzerkonten und keinen E-Mail-Versand. Die technische Architektur wird nach dem beschriebenen API-Test ausgewählt.

## 1. Ziel und festgelegter Rahmen

Vertriebler sollen schnell erkennen, wen sie für eine Ausgabe als Nächstes ansprechen sollten, was bereits besprochen wurde und was verbindlich gebucht ist. Das ersetzt verstreute Zettel und persönliche Listen durch eine gemeinsame, miteinander verknüpfte Arbeitsgrundlage.

| Thema | Vereinbarung |
| --- | --- |
| Magazine im Pilot | Coburger, Kronacher, Lichtenfelser und Bamberger |
| Aktuelle Nummern laut Nutzer | Coburger 72, Kronacher 3, Lichtenfelser 6, Bamberger 2. Diese Angaben sind der Ausgangspunkt, keine automatisch verifizierten Ausgabenstände. |
| Zurückgestellt | Knolle, Schoen.frau und andere Geschäftsbereiche |
| Datenumfang | Etwa 500–1.000 Firmen, 1–10 Ansprechpartner je Firma, zunächst drei Jahre Buchungshistorie |
| Nutzer | Pilot mit Administrator, 1–2 internen Vertrieblern und Chefredakteur; später insgesamt etwa 3–5 interne und 5–10 externe Vertriebler, bis zu zehn gleichzeitig aktive Nutzer |
| Login | Google-Konto; intern Google Workspace. Externe Konten und deren Detailrechte werden vor Erweiterung des Piloten festgelegt. |
| Kundenzugriff | Grundsätzlich alle Kunden auffindbar, auch später für Externe. Finanz- und Notizrechte sind noch nicht endgültig beschlossen. |
| Zuständigkeit | Freie Auswahl, zusätzlich feste Betreuer an Ansprechpartnern; Hinweis und optionaler Ausschluss aus Arbeitslisten, keine automatische Bearbeitungssperre |
| Abrechnung | Rechnungen weiterhin manuell in HQ; neue App-Buchungen erfordern weder ein HQ-Angebot noch eine HQ-Rechnung |
| Redaktion | Bewusster Versand per „An Redaktion melden“, mit Vorschau und nachvollziehbarem Meldestand |
| Preise | Listenpreise als Vorschlag, Sonderpreise frei änderbar und nachvollziehbar dokumentiert |
| Pakete | Einzelbuchungen je Ausgabe mit gemeinsamer Paketkennung und manuell zugeordneten Teilpreisen |
| HQ-Datenpflege | Vertriebler dürfen Firmen und Ansprechpartner anlegen und bestehende Stammdaten bearbeiten |
| Synchronisierung | Bei Datenhaltung in der App genügt nachts ein Abgleich. App-Änderungen an HQ-Stammdaten werden ebenfalls erst nachts übertragen. |
| App-interne Aktualität | Eigene Aktivitäten, Buchungen und Wiedervorlagen sind sofort gespeichert; andere Nutzer erhalten Aktualisierungen beim Laden und über eine einfache Aktualisierungsfunktion. Ziel für offene Ansichten: spätestens nach 30 Sekunden, abhängig vom späteren Stack. |
| Verwaltung | Nur der Administrator pflegt Magazine, Ausgaben, Termine, Preislisten und Zugänge |
| Geräte | Desktop als Schwerpunkt; mobil Kundendaten, Notizen und Wiedervorlagen |
| Design | Dunkle Hauptansicht in Schwarz/Gelb mit redaktionellem Charakter, vollwertige helle Variante und große, gut lesbare Bedienelemente |
| Startseite | Persönliche Arbeitsübersicht, keine Management-Kennzahlenwand |
| Betrieb | Möglichst geringe Zusatzkosten, keine Lösung in der Größenordnung von 200 € monatlich; Betreuung durch den Nutzer mit begrenzter Programmiererfahrung |

## 2. Funktionsübersicht

„Pilot“ bedeutet: Bestandteil der ersten alltagstauglichen Version. Die technische Umsetzung erfolgt in kleinen Abschnitten, aber die Kernabläufe werden zusammen getestet.

| Bereich | Pilot | Spätere Erweiterung |
| --- | --- | --- |
| Mein Tag | Fällige/überfällige Wiedervorlagen, zuletzt bearbeitete Kunden, zuletzt verwendete Arbeitsliste | Persönliche Ziele und Benachrichtigungseinstellungen |
| Kunden | Suche, Stammdaten, Ansprechpartner, Aktivitäten, Buchungen, neue Firma, Bearbeitung, HQ-Verknüpfung | Unternehmensgruppen, Filialstrukturen, umfangreiche Datenanreicherung |
| Ansprechpartner | Telefon, E-Mail, Funktion, Firma, fester Betreuer, persönliche Historie | Mehrere gleichzeitige Firmenzugehörigkeiten und weitere Kontaktkanäle |
| Magazinverkauf | Magazin/Ausgabe wählen, frühere Inserenten und Interessenten finden, priorisierte Arbeitsliste, begründete Reihenfolge | Fein einstellbarer numerischer Score und erweiterte Kampagnen |
| Filter | UND-verknüpfte Kriterien mit Mehrfachauswahl innerhalb eines Kriteriums, Suchtext, persönliche gespeicherte Ansichten | Freier verschachtelter UND/ODER-Editor, geteilte Teamansichten |
| Kontakte dokumentieren | Telefon, Gespräch, manuelle E-Mail-Notiz; Zeitpunkt, Ergebnis, optionale Notiz und Wiedervorlage | Automatische E-Mail-Historie, Kalender- und Telefonintegration |
| Wiedervorlagen | Verantwortlicher, Datum, Kontext, erledigen/verschieben, eigene und gemeinsame Liste | awork-Abgleich und Erinnerungsversand |
| Buchungen | Ohne Angebot erfassen, Produkt wählen, Sonderpreis, Ansprechpartner optional, Paketkennung, ändern/stornieren | HQ-Planumsätze, automatisierte Paketkalkulation |
| Redaktion | Buchungsliste je Ausgabe, Meldevorschau, bewusster Versand, Meldestatus je Buchungsstand | Produktionsstatus, Druckunterlagen, Übergabe nach awork |
| Historie aus HQ | Projekte je Ausgabe, zugehörige Rechnungen und Positionen, zunächst drei Jahre | Weitere Leistungsbereiche und längere Historie |
| Datenqualität | Dublettenhinweise, Prüfbereich für unklare Zuordnungen und Synchronisationskonflikte | Unterstütztes Zusammenführen und aufwendigere Bereinigung |
| Excel-Import | Einmaliger, wiederholbarer Import vorhandener Vertriebslisten mit Vorschau, Feldzuordnung und Fehlerbericht | Komfortabler universeller Import-Assistent für weitere Quellen |
| Rechte und Nachvollziehbarkeit | Freigeschaltete Google-Nutzer, Rollen, Änderungsprotokoll, serverseitige Prüfung | Individuelle externe Rechte, zusätzliche Geschäftsbereiche |
| Verwaltung/Betrieb | Magazine, Ausgaben, Termine, Produkte, Preise, Empfänger, Datenabgleich, Sicherung und Wiederherstellung | Automatisierte Betriebsberichte und umfassendere Verwaltung |
| Auswertungen | Operative Listen: offen, kontaktiert, gebucht, gemeldet, noch ohne Rechnungszuordnung | Mitarbeiteraktivitäten, Abschlüsse, Abschlussquoten und Zielerreichung ausdrücklich auf der Roadmap |

Zusätzlich sinnvolle Pilotfunktionen: Warnung vor kürzlich erfolgter Ansprache durch Kollegen; Kennzeichnung fehlender Kontaktdaten; Rückkehr zur unveränderten Arbeitsliste; sichtbarer Datenstand; Änderungshinweis nach bereits erfolgter Redaktionsmeldung; manuelle Klärung möglicher Doppelbuchungen von Sonderplatzierungen. Auf eine starre Seitenplanung wird zunächst verzichtet.

## 3. Aufbau der Oberfläche

### Navigation

Links stehen **Mein Tag**, **Magazinverkauf**, **Kunden**, **Ansprechpartner**, **Buchungen** und **Wiedervorlagen**. **Verwaltung** ist nur für den Administrator sichtbar. Eine globale Suche findet Kunden und Ansprechpartner. Darstellung und Schriftgröße sind persönliche Einstellungen.

| Ansicht | Wichtigster Inhalt | Hauptaktion |
| --- | --- | --- |
| Mein Tag | Fällige Kontakte, letzte Kunden, Einstieg in zuletzt bearbeitete Ausgabe | Nächste Wiedervorlage bearbeiten |
| Magazinverkauf | Ausgabe, Filter, Kundenliste, letzter Kontakt, bisherige Buchungen, begründete Priorität | Kunden öffnen und Kontakt erfassen |
| Kundendetail | Stammdaten, Ansprechpartner, chronologischer Verlauf, Buchungen mit Ausgabenbezug | Kontakt oder Buchung erfassen |
| Ansprechpartner | Zugehöriger Kunde, Kontaktdaten, Betreuer, direkt zugeordnete Aktivitäten und Buchungen | Telefon/E-Mail öffnen oder Kontakt notieren |
| Buchungen | Nach Ausgabe filterbare Liste, Produkt, Preis, Verkäufer, Meldestand, Rechnungszuordnung | Buchung erfassen oder an Redaktion melden |
| Wiedervorlagen | Eigene/alle, heute/überfällig/später, Kunde, Grund, Ausgabe | Erledigen oder verschieben |
| Verwaltung | Ausgaben, HQ-Projektzuordnung, Preise, Nutzer, Empfänger, offene Import-/Abgleichprobleme | Konfiguration oder Problem klären |

**Verknüpfungen:** Ein Firmenname öffnet immer den Kunden. Ein Personenname öffnet den Ansprechpartner mit Rücklink zur Firma. Ausgabennamen öffnen den zugehörigen Magazinverkauf. Buchungen zeigen ihren Ursprung: App-Eintrag oder HQ-Rechnungsposition. Zurücknavigation erhält Suchtext, Filter und Listenposition.

**Design:** Dunkles Anthrazit statt flächig reinem Schwarz, warmes Gelb für Markenakzente und Hauptaktionen, redaktionelle Überschriften. Fließtext in einer klaren serifenlosen Schrift, standardmäßig 16 px; zusätzliche größere Schriftstufe. Die helle Ansicht nutzt warme helle Flächen und dunkle Schrift. Gelb bleibt Akzent und wird nicht als schlecht lesbare Schrift auf Weiß verwendet. Status immer zusätzlich beschriften. Große Klickziele, Tastaturbedienung, sichtbarer Fokus, sinnvolle Formularbeschriftungen und Prüfung beider Themes bei 200 % Zoom. Auf Smartphones werden Tabellen zu kompakten Datensatzlisten.

### Drei wichtigste Abläufe

1. **Verkauf vorbereiten:** Magazin und Ausgabe auswählen → gespeicherte Ansicht laden → Vorschlagsgrund und letzte Kontakte prüfen → Kunde und passenden Ansprechpartner öffnen → Gespräch dokumentieren → Wiedervorlage setzen oder Buchung erfassen.
2. **Abschluss festhalten:** Kunde/Ausgabe wählen → Produkt aus Mediadaten wählen → Listenpreis prüfen → vereinbarten Nettopreis eintragen → optional Paketkennung und Ansprechpartner ergänzen → verbindlich speichern → Redaktion bei Bedarf über Vorschau informieren.
3. **Nachfassen:** Persönliche Wiedervorlage öffnen → bisherige Gespräche sehen → neuen Kontakt erfassen → Wiedervorlage erledigen oder neues Datum setzen. Eine Absage für eine Ausgabe löscht weder Kunden noch frühere Buchungen.

## 4. Arbeitslisten, Filter und Priorität

### Vorgeschlagene gespeicherte Ansichten

| Ansicht | Auswahlregel |
| --- | --- |
| Wiederbucher zuerst | Buchung in den letzten zwei erschienenen Ausgaben des ausgewählten Magazins; keine aktive Buchung in der Zielausgabe |
| Frühere Inserenten | Historische Buchung im Magazin, aber nicht in den letzten zwei erschienenen Ausgaben |
| Interesse wieder aufnehmen | Dokumentiertes Interesse oder Absage mit ausdrücklich späterem Kontaktwunsch, ohne aktuelle Buchung |
| Heute nachfassen | Fällige/überfällige Wiedervorlage für mich, optional auf Magazin/Ausgabe begrenzt |
| Antwort ausstehend | Letzter Kontakt erwartet Antwort, seit mindestens sieben Tagen keine dokumentierte Folgeaktivität; Zeitraum veränderbar |
| Mein Kontaktbestand | Ansprechpartner, bei denen ich als fester Betreuer hinterlegt bin |
| Noch nicht angesprochen | Keine dokumentierte Aktivität zur Zielausgabe, keine aktive Buchung; Zeitraum und Datenabdeckung sichtbar |
| Was ist gebucht? | Aktive Buchungen zur ausgewählten Ausgabe; optional Produkt, Verkäufer, Kunde und Preisbereich |
| Redaktion noch informieren | Aktuelle Buchungsversion noch nicht gemeldet oder nach letzter Meldung geändert |
| Ohne Rechnungszuordnung | App-Buchung ohne bestätigte Verbindung zu einer HQ-Rechnung; ausdrücklich keine Aussage, dass definitiv keine Rechnung existiert |
| Kontaktangaben fehlen | Kunde ohne erreichbaren Ansprechpartner oder ohne Telefon/E-Mail |
| Passend für weiteres Magazin | Buchung in Magazin A, keine bekannte Buchung in Magazin B; regionale Eignung wird vom Vertrieb geprüft |

Weitere kombinierbare Kriterien: Firma/Person als Suchtext, Ort/PLZ, Branche sofern gepflegt, Produkt/Format, Buchungszeitraum, ausgewählte frühere Ausgaben, Betreuer, letzter Kontakt, Kontakt durch einen bestimmten Vertriebler, Ergebnis, Wiedervorlagedatum, Paketkennung, Meldestatus. Fehlende Angaben erhalten den Filter „nicht gepflegt“ und werden nicht als „nein“ interpretiert. Persönliche Ansichten speichern Filter, Sortierung und sichtbare Spalten, keine eingefrorene Kundenliste.

**Vorschlag für die Reihenfolge im Pilot:** Zunächst fällige eigene Wiedervorlagen, dann jüngste Inserenten, frühere Inserenten, bekannte Interessenten und übrige Bestandskunden. Neukunden ohne bestehende Beziehung zuletzt. Innerhalb einer Gruppe: fälliges Datum, jüngste relevante Buchung, ältester relevanter Kontakt, schließlich Firmenname. Die Zahl „letzte zwei Ausgaben“ ist eine änderbare Voreinstellung. Keine undurchsichtige KI-Bewertung; der Grund steht an jeder Empfehlung.

Nicht als neue Ansprache vorschlagen: bereits zur Zielausgabe gebucht, Absage für genau diese Ausgabe, ausdrücklich untersagter Kontakt im betroffenen Kontext/Kanal oder noch laufende Kontaktpause. Solche Datensätze bleiben über allgemeine Suche und passende Filter auffindbar. Betreuer anderer Personen lassen sich ausblenden. Ein Kontakt mit einem anderen Ansprechpartner derselben Firma bleibt als Hinweis sichtbar; eine persönliche Sperre darf nicht automatisch auf die ganze Firma erweitert werden.

Der Pilotimport deckt nur drei Jahre ab. „Keine bekannte Buchung“ darf daher nicht als „hat noch nie gebucht“ bezeichnet werden. Aus Rechnungen allein folgt auch nicht, dass alle Kontakte oder Angebote erfasst sind.

## 5. Daten und fachliche Regeln

### Fachliche Objekte

| Objekt | Zweck und Mindestinhalt |
| --- | --- |
| Kunde | Lokale ID, HQ-ID wenn vorhanden, Name, Adresse, Kontaktdaten, Branche/Tags, Status, Änderungsstand |
| Ansprechpartner | Lokale/HQ-ID, Firma, Name, Funktion, Telefon, E-Mail, optional fester Betreuer, Kontaktwünsche |
| Magazin/Ausgabe | Titel, Nummer, optional manuell gepflegter Termin und Anzeigenschluss, Sonderthema, Status, explizit zugeordnetes HQ-Projekt |
| Produkt/Preisversion | Anzeigenleistung, Format, ggf. Platzierung, Preisgruppe, Nettolistenpreis, Version/Quelle |
| Vertriebsaktivität | Autor, tatsächlicher Kontaktzeitpunkt, Erfassungszeitpunkt, Kontaktart, Ergebnis, Notiz, Kunde, optionale Personen und Ausgabe(n) |
| Vertriebsvorgang | Kunde und Ausgabe als Kontext mit aktuellem Bearbeitungsstand; mehrere Aktivitäten und ggf. mehrere Buchungen möglich |
| Wiedervorlage | Verantwortlicher, Fälligkeitsdatum, Anlass, Kunde, optional Ansprechpartner/Ausgabe, offen/erledigt |
| Buchung | Kunde, Ausgabe, Produkt, Menge, Listenpreis als Momentaufnahme, vereinbarter Nettopreis, Buchungsdatum, Verkäufer, optionale Person, Paketkennung, Status und Version |
| Rechnungsbezug | HQ-Rechnung und Positions-ID, Projekt/Ausgabe, Kunde, Betrag und Belegstatus, optionale Zuordnung zu einer App-Buchung |
| Redaktionsmeldung | Buchung und Version, Empfänger, Vorschauinhalt, Auslöser, Versandstatus und Zeitpunkt |
| Persönliche Ansicht | Eigentümer, Name, Filter, Sortierung und Spalten |
| Abgleich/Protokoll | Ausgangsstand, lokale Änderung, HQ-Stand, Übertragungsstatus, technische Referenzen, nachvollziehbare Fehler/Konflikte |

Diese Liste ist das fachliche Modell, keine bereits festgelegte Datenbankstruktur oder neue öffentliche API. Beträge werden intern als ganzzahlige Centwerte gespeichert. Lokale IDs müssen auch vor dem ersten nächtlichen HQ-Abgleich funktionieren.

### Gespräche und Status

Kontaktarten: Telefonat, persönliches Gespräch, manuell dokumentierte E-Mail, sonstiger Kontakt. Ergebnisse: nicht erreicht, Rückmeldung offen, Interesse, angeboten, gebucht, Absage für diese Ausgabe, später erneut fragen, keine weitere Ansprache gewünscht. Autor und aktueller Zeitpunkt werden vorbelegt; zurückliegende Kontakte dürfen mit ihrem tatsächlichen Datum erfasst werden.

Ein Gespräch kann mehrere Ausgaben betreffen. Im Formular ist ein Hauptkontext vorausgewählt; weitere Bezüge sind ergänzbar. Verschiedene Ergebnisse je Ausgabe werden getrennt festgehalten. Ein allgemeines Gespräch muss nicht künstlich einer Ausgabe zugewiesen werden. Alte HQ-Rechnungen ohne Personenbezug werden als Unternehmenshistorie angezeigt, nicht willkürlich einem Ansprechpartner zugerechnet.

### Buchungen, Preise und Pakete

Pflicht bei verbindlicher Buchung: Kunde, Magazin/Ausgabe, Leistung, vereinbarter Preis, Buchungsdatum und Verkäufer. Ansprechpartner, Paketkennung und Notiz sind optional. Preisabweichung und Bearbeiter werden protokolliert; keine Rabattfreigabe im Pilot. Preis 0 € wird als bewusste kostenlose Leistung bestätigt, negative Verkaufspreise sind nicht zulässig; Korrekturen erfolgen über Storno/Änderung.

Die zwölf Kernleistungen und Preisgruppen sind in `produktkatalog.json` aus den Mediadaten übernommen. Bamberg hat andere Listenpreise als Coburg, Kronach und Lichtenfels. Maße sind technische Referenzangaben; Anzeigenformat und tatsächliche Platzierung werden nicht durch automatisches Auslesen von Rechnungstexten als sicher angenommen.

Gedruckte Regeln wie 10/15/20 % Rabatt ab 5/7/10 Schaltungen und Zusatzseiten in anderen Magazinen zu 600 € erscheinen zunächst als Preisreferenz. Sie werden nicht automatisch kombiniert: Vertragsjahr, anrechenbare Schaltungen und Ausnahmen sind noch nicht hinreichend definiert. Nutzungsrechte und frei vereinbarte Zusatzleistungen sind ergänzende manuelle Positionen; ein vollständiger Crossmedia-Konfigurator kommt später.

Paketbeispiel: drei Coburger-Ausgaben und eine Bamberger-Ausgabe ergeben vier Einzelbuchungen mit derselben Paketkennung. Jede Position trägt den vereinbarten Teilpreis; die Paketansicht summiert diese Beträge. Spätere Preislistenänderungen verändern historische Preise nicht.

Sonderplätze wie Rückseite erhalten einen Warnhinweis bei vorhandener aktiver Belegung derselben Ausgabe. Die Redaktion/Administration klärt die tatsächliche Verfügbarkeit. Stornieren statt endgültig löschen; ursprünglicher Stand bleibt nachvollziehbar.

### Rechnung und Buchung nicht doppelt zählen

Historische HQ-Rechnungspositionen und neu erfasste Buchungen sind zunächst unterschiedliche Quellen. Eine passende spätere Rechnung wird mit der vorhandenen Buchung verknüpft. Im gemeinsamen Verlauf erscheint dann ein Verkauf mit Abrechnungsbezug, kein zweiter Abschluss. Vorschläge nutzen Kunde, Ausgabe/Projekt, Leistung und Betrag; bei Mehrdeutigkeit entscheidet ein Mensch. Teilrechnungen, mehrere Positionen, Stornos und Gutschriften müssen vor einer automatischen Zuordnung gesondert geprüft werden. „Gebucht“, „an Redaktion gemeldet“ und „Rechnung zugeordnet“ sind getrennte Zustände.

### Redaktionsmeldung

Der Nutzer öffnet eine Vorschau mit Kunde, Ansprechpartner soweit vorhanden, Magazin, Ausgabe, Leistung/Format, Preis, Paketbezug, Notiz und Verkäufer. Empfänger werden je Magazin vom Administrator hinterlegt; derzeit ist nicht geklärt, ob alle Magazine denselben Empfänger haben. Versand erst nach Betätigung des Versandbuttons. Für den Pilot zunächst ein kontrolliertes Testpostfach verwenden.

Jede Meldung bezieht sich auf eine konkrete Buchungsversion. Nach Änderung oder Storno erscheint „Änderung noch nicht gemeldet“. Doppelklick darf keine zweite Meldung auslösen. Ein technischer Versandauftrag ist keine bestätigte Zustellung; unklarer Versandstatus wird vor erneutem Senden geprüft.

## 6. Datenanbindung und nächtlicher Abgleich

Eine eigene Datenbank ist eine plausible Lösung für schnelle kombinierte Filter. Die Entscheidung fällt aber anhand realistischer Messungen; eine langsame HQ-Oberfläche beweist keine langsame API.

### Datenverantwortung

| Daten | Führender Ursprung / Richtung |
| --- | --- |
| Bestehende Firmen und Ansprechpartner | HQ-Stammdaten plus protokollierte App-Änderungen; Abgleich in beide Richtungen |
| Neue Firmen/Personen aus der App | Sofort lokale ID; nachts Anlage in HQ und dauerhafte Zuordnung der HQ-ID |
| Rechnungen, Rechnungspositionen, Belegstatus | HQ → App; keine Rechnungserstellung durch den Pilot |
| Magazine, Ausgaben, Preislisten und HQ-Projektzuordnung | Administration in der App; vorhandene HQ-Projekte werden manuell zugeordnet |
| Gespräche, Wiedervorlagen, Betreuerzuordnungen, neue Buchungen | App; kein automatischer Export nach HQ im Pilot |
| Meldungen, Ansichten, Nutzerrechte | App |

**Ablauf bei eigener Datenhaltung:** Ein nächtliches Zeitfenster, z. B. 02–04 Uhr Europe/Berlin, statt eines exakt garantierten Triggerzeitpunkts. Zuerst HQ-Änderungen seit dem letzten erfolgreichen Stand lesen. Mit dem gespeicherten Ausgangsstand vergleichen. Änderungen an verschiedenen Feldern können zusammengeführt werden; widersprüchliche Änderungen am selben Feld gehen in eine Prüfwarteschlange. Danach freigegebene lokale Stammdatenänderungen nach HQ übertragen und Ergebnisse zurücklesen. Ein unbedingtes „neuester Zeitstempel gewinnt“ ist ausgeschlossen.

Neue Kunden werden vor ihren Ansprechpartnern übertragen. Ausstehende lokale Änderungen bleiben tagsüber für alle App-Nutzer sichtbar und werden beim Import nicht überschrieben. Der Abgleich arbeitet in fortsetzbaren Portionen mit Zwischenständen. Wiederholungen dürfen keine neuen Dubletten erzeugen. Bei unklarem Ausgang eines HQ-Schreibvorgangs wird zunächst anhand gespeicherter Referenzen geprüft, ob die Anlage bereits erfolgt ist; die API-Unterstützung dafür ist im technischen Vorversuch zu prüfen. Nicht sicher klärbare Fälle werden angehalten.

Archivierte/gelöschte HQ-Datensätze werden markiert, nicht automatisch neu angelegt. Fehlende Datensätze in einer unvollständigen Antwort sind kein Löschbeweis. Belegänderungen und verpasste Änderungsfenster werden regelmäßig durch einen vollständigen Abgleich der relevanten Historie geprüft. Der initiale Drei-Jahres-Import ist ein gesonderter Lauf. Der Pilot erhält Status „letzter vollständiger Abgleich“, ausstehende Änderungen, Fehler und Konflikte.

**Direkte HQ-Lesevariante:** Stammdaten und Rechnungen werden bedarfsgerecht gelesen und kurz zwischengespeichert. Auch diese Variante braucht einen dauerhaften App-Speicher für Buchungen, Aktivitäten, Ansichten und die ausdrücklich gewünschten nächtlichen Schreibvorgänge. Offene lokale Änderungen müssen über HQ-Leseergebnisse gelegt werden, damit neue oder bearbeitete Kunden tagsüber nicht verschwinden. „Direkt über HQ“ bedeutet daher nicht „ohne eigenen Speicher“.

### Kandidaten für die technische Entscheidung

| Kandidat | Vorteil | Zu prüfender Aufwand |
| --- | --- | --- |
| Apps Script + HQ-Leseabfragen + App-Speicher | Anschluss an vorhandene Skriptkenntnisse, wenig HQ-Datenkopien | Langsame Mehrfachabfragen, komplexe Filter über beide Quellen, lokale Änderungen vor Nachtabgleich |
| Apps Script + Firestore mit relevanter HQ-Datenkopie | HQ unabhängig von interaktiven Filtern, ein gemeinsamer App-Datenbestand | Zuverlässiger Synchronisierer, passende Such-/Indexstruktur und zusätzliche Cloud-Konfiguration |
| Firebase-basierte WebApp mit separatem Backend | Option, falls Apps Script selbst zum Engpass wird oder externe Anmeldung es rechtfertigt | Mehr Aufbau- und Betreuungsaufwand; erst nach Messergebnis priorisieren |

Arbeitsannahme: zuerst Apps Script als Bedien- und Integrationsschicht untersuchen. Für einen kleinen Pilot kann ein privates Google Sheet als begrenzter App-Speicher mit geprüft werden; es ist keine Zusage für die spätere Mehrbenutzerlösung. Falls komplexe Filter oder konkurrierende Schreibvorgänge problematisch werden, wird nicht durch immer mehr Tabellenbehelf weitergebaut. In diesem Fall ist Firestore mit gezielt vorbereiteten Kundenzusammenfassungen der nächste Kandidat.

Technische Fakten: HQ dokumentiert v1 und v2 mit unterschiedlichem Funktionsumfang sowie Filter, Pagination und ein Limit von 1.000 Requests/Minute. Welche Endpunkte und Berechtigungen eure Instanz tatsächlich bietet, muss geprüft werden. [HQ Developer Guide](https://developer.hellohq.io/)

Apps Script hat unter anderem sechs Minuten Laufzeit je Ausführung und 30 gleichzeitige Ausführungen pro Nutzer. Ein Abgleich braucht daher Fortsetzungspunkte; zehn Nutzer bedeuten nicht automatisch zehn getrennte Kontingente. [Apps-Script-Kontingente](https://developers.google.com/apps-script/guides/services/quotas)

Firestore Standard bietet ein kostenloses Kontingent, darunter 50.000 Dokumentlesevorgänge und 20.000 Schreibvorgänge pro Tag sowie 1 GiB Speicher. Das garantiert keinen kostenlosen Gesamtbetrieb: Backend, Sicherungen, Datenverkehr und Nutzung müssen separat gerechnet werden. [Firebase-Preise](https://firebase.google.com/pricing)

Firestore Standard hat Einschränkungen bei kombinierten Abfragen. Deshalb werden die konkreten Filter gegen ein geeignetes Datenmodell getestet; eine Firebase-Wahl allein löst Suche und Verknüpfungen nicht. Editionsunterschiede werden bei der Auswahl berücksichtigt. [Firestore-Abfragen](https://firebase.google.com/docs/firestore/query-data/queries)

### Schutz, Kosten und Betreuung

Pilotzugang nur für freigeschaltete interne Google-Konten. Jede Serverfunktion prüft Identität und Rolle; Angaben aus dem Browser gelten nicht als Identitätsnachweis. HQ-Zugangsdaten ausschließlich serverseitig, keine Tokens in Frontend, Logs oder Git. Bei Apps Script ist die tatsächliche Benutzeridentität für die gewählte Bereitstellung mit mehreren Konten zu testen. [Google Session](https://developers.google.com/apps-script/reference/base/session)

Bei Firestore werden Endnutzerrechte und Backendrechte getrennt geprüft. Serverseitige Zugriffe können Sicherheitsregeln umgehen und müssen über IAM sowie eigene Berechtigungsprüfungen beschränkt werden. [Firestore-Zugriffsregeln](https://firebase.google.com/docs/firestore/security/rules-conditions)

Für die Datenbank wird eine passende EU-Region vorgesehen; das ist allein noch keine Aussage über sämtliche Verarbeitung anderer Dienste. Es werden nur benötigte HQ-Daten übernommen, keine Arbeitszeiten, internen Kosten oder Margen. Backups, Wiederherstellung, Entzug von Nutzerzugängen und ein Verfahren für Archivierung/Löschung gehören vor Echtbetrieb zur Einrichtung. Externe Detailrechte und personenbezogene Vertriebsvergleiche werden vor deren Einführung beschlossen.

Planungsziel für Zusatzdienste: möglichst 0–30 € monatlich, ausdrücklich keine gemessene Kostenschätzung oder Garantie. Vor Einrichtung kostenpflichtiger Dienste werden tatsächliche Mengen, Region, Sicherungen und Zusatzdienste kalkuliert. Kostenwarnungen sind keine harte Ausgabensperre. Es wird kein Dienst in diesem Arbeitsschritt eingerichtet oder gebucht.

Die Betriebsansicht soll dem Administrator in verständlicher Sprache zeigen: Datenabgleich erfolgreich/fehlgeschlagen, offene Fälle, letzter Sicherungsstand und notwendige Aktion. Dazu kurze Anleitungen für Nutzerfreigabe, neue Ausgabe, Preisänderung, Fehlerbehebung, Sicherung/Wiederherstellung und Veröffentlichung einer neuen Version.

## 7. Excel-Übernahme und Datenqualität

Vor dem Bau des Importers eine repräsentative vorhandene Liste untersuchen; keine einheitliche Struktur voraussetzen. Firma/Ansprechpartner, Datum, Notiz, Magazin/Ausgabe, Kontaktstatus und Wiedervorlage als mögliche Felder zuordnen. Fehlende Felder bleiben als unbekannt gekennzeichnet. Historische Erfassungsquelle und ursprünglicher Vertriebsname bleiben erhalten, auch wenn diese Person noch keinen App-Zugang hat.

Import zunächst als Vorschau mit Treffern, möglichen Dubletten und unklaren Zeilen. Vorhandene HQ-ID hat Vorrang; Namen allein reichen nicht für automatisches Zusammenführen. Unklare Firmen, Personen oder Ausgaben werden manuell zugeordnet. Eine importierte freie Notiz wird nicht automatisch zu einer verbindlichen Buchung. Wiederholung derselben Datei erzeugt anhand Importkennung und Quellzeile keine doppelten Einträge. Nach Freigabe wird der Import protokolliert und kann als Importcharge korrigiert werden.

## 8. Umsetzung in Etappen und Roadmap

| Etappe | Ergebnis / Abschlusskriterium |
| --- | --- |
| 0 – Konzept und Entwurf | Dieses Konzept, Produktreferenz, interaktive dunkle/helle Ansichten und konkreter API-Testplan; Rückmeldung zu Abläufen und Lesbarkeit |
| 1 – Technischer Vorversuch | HQ-Datenmodell und Endpunkte mit eurer Instanz prüfen, Lese-Benchmark ausführen, Architektur und Kosten anhand der Ergebnisse entscheiden |
| 2 – Nutzbarer Kern | Interner Login, Kunden/Personen, eine reale Pilot-Ausgabe, Historie, Kontakte, Wiedervorlagen, Filter, gespeicherte Ansichten und Buchungserfassung |
| 3 – Alltagstauglicher Pilot | Drei-Jahres-Historie, Preislisten, Redaktionsmeldung, Excel-Erstimport, nächtlicher Abgleich, Konfliktanzeige, Sicherung und dokumentierter Betrieb |
| 4 – Erweiterter Vertrieb | Externe Konten nach Rechteentscheidung, mehr Nutzer und erneuter Test mit zehn gleichzeitigen Nutzern; Betreuung und Funktionen anhand echten Feedbacks verbessern |

Roadmap, zunächst ohne verbindliche Termine: **(1)** HQ-Planumsätze aus Buchungen nach API-Prüfung; **(2)** automatische Gmail-Historie mit bekannten Kontakten, Klärung mehrdeutiger Zuordnungen und Sichtbarkeit; **(3)** awork-Verbindung; **(4)** Mitarbeiterbezogene Aktivitäten, Abschlüsse, Abschlussquoten und Zielerreichung mit vorher vereinbarten Definitionen/Rechten; **(5)** Paket-/Rabattberechnung, Reservierungen und Produktionsabläufe; **(6)** Knolle, Schoen.frau, iTV und weitere Agenturleistungen; **(7)** feinere Priorisierung, Teamansichten und weitere Auswertungen. E-Mail-Versand an Redaktion und automatische Übernahme persönlicher Gmail-Nachrichten sind unterschiedliche Funktionen; nur Ersteres gehört in den Pilot.

## 9. Abnahme und noch benötigte Informationen

Der Pilot ist alltagstauglich, wenn ein Vertriebler eine Zielausgabe auswählt, einen passenden Kunden findet, die Historie versteht, einen Kontakt mit Wiedervorlage erfasst, eine Buchung zum Sonderpreis speichert und sie nach Vorschau an die Redaktion meldet. Kunde und Ansprechpartner sind in beide Richtungen erreichbar; Filter bleiben beim Zurückgehen erhalten. Dieselbe später zugeordnete HQ-Rechnung erzeugt keinen doppelten Verkauf.

Weitere Abnahmefälle: Kontaktpause und feste Betreuer; fehlende Kontaktdaten; Buchung ohne Ansprechpartner/Angebot; Preisänderung ohne Veränderung alter Buchungen; Paket mit vier Teilbuchungen; Änderung/Storno nach Redaktionsmeldung; doppelter Klick; wiederholter Excel-Import; neues Unternehmen mit Ansprechpartner vor HQ-ID; gleichzeitige Bearbeitung; widersprüchliche HQ-/App-Änderung; unterbrochener Nachtlauf; unberechtigter Nutzer; dunkle/helle/mobile Ansicht; Wiederherstellung einer Sicherung. Messbare Geschwindigkeitsziele stehen im separaten Testplan.

Vor realer Anbindung noch zu ermitteln: verwendete HQ-API-Version und Beispielprojekte/-rechnungen inklusive Positionen; vorhandener sicherer Zugang im Ausführungssystem; repräsentative Excel-Liste; Redaktions-Empfänger je Magazin; tatsächlich erste Pilot-Ausgabe und manuell bestätigte Termine; interne Pilotkonten und Freigabe der für sie sichtbaren Verkaufsbeträge. Diese Punkte sind keine weiteren Grundsatzfragen für den Entwurf. Sie werden bei Einrichtung beziehungsweise Datenprüfung konkretisiert.

Gestaltungsreferenzen: [das-magazin.de](https://www.das-magazin.de/) und bereitgestellte „Mediadaten 2026/27“, Stand 04/2026. Gedruckte Ausgabennummern/Termine werden nicht ungeprüft als aktueller Datenbestand übernommen. Preise sind Referenzwerte aus der PDF, keine automatisch gültigen Vertragskonditionen.
