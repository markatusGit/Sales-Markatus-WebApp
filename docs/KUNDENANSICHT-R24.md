# Kundenansicht – Listen und Adressen in r24

Stand: 23.10.2026, ergänzt um r25. Ergänzung zur [Kundenkommunikation r23](KUNDENKOMMUNIKATION-R23.md).

Ansprechpartner und Projekte links verwenden dieselbe Listenbedienung: Bei höchstens drei Einträgen bleiben alle Karten sichtbar. Ab vier Einträgen erscheint oben eine Suchleiste; darunter passen die ersten drei Karten in einen eigenen Scrollbereich. Die Suchleiste bleibt beim Scrollen innerhalb der Liste stehen. Die rechte Kommunikationserfassung bleibt unabhängig davon bedienbar. Firmenadressen stehen unten im Bereich „Allgemein“ und lassen sich wie bisher bearbeiten.

Die Suche filtert bei jedem Buchstaben, ohne Groß-/Kleinschreibung oder Akzente zu unterscheiden. Ansprechpartner werden nach Name, Position, E-Mail und Telefonnummer durchsucht, Projekte nach Name und Projektnummer. Die Trefferzahl und ein Hinweis bei fehlenden Treffern werden angezeigt. Es werden ausschließlich bereits geladene Daten gefiltert; Tippen und Scrollen lösen keine Server-/Datenbankabfragen aus. Filter und Listenpositionen bleiben bei einer Neudarstellung innerhalb der laufenden Sitzung erhalten. Bei höchstens drei verbleibenden Gesamteinträgen wird ein zuvor gesetzter Filter entfernt, damit keine unsichtbare Suche Einträge ausblendet.

## Bedienabnahme nach Veröffentlichung

- Die bisherige Dashboard-Adresse neu öffnen; oben „Stand 2026-10-23-r24“ erwarten. Bei abweichender Kennung diese im Chat melden.
- Einen Kunden mit mindestens vier Ansprechpartnern öffnen; über der Ansprechpartnerliste eine Suchleiste und darunter drei Karten erwarten. Bei abweichender Darstellung die Bildschirmbreite und Appkennung melden.
- Innerhalb der Ansprechpartnerliste nach unten scrollen; weitere Kontakte erwarten, während Suchleiste und rechte Erfassung stehen bleiben. Bei Abweichung den betroffenen Bereich melden.
- Einen Teil eines vorhandenen Namens in „Ansprechpartner suchen“ eingeben; nur passende Kontakte und die Trefferzahl erwarten. Bei falschem Ergebnis die Art der Suche ohne Kundeninhalte melden.
- Den Suchtext löschen; wieder alle geladenen Ansprechpartner in der scrollbaren Liste erwarten. Bei fehlenden Kontakten den technischen Hinweis melden.
- Bei einem Kunden mit mindestens vier Projekten einen Teil der Projektnummer in „Projekte suchen“ eingeben; nur passende Projekte erwarten. Bei Abweichung den Fehler ohne Kundendaten melden.
- Einen Kunden mit höchstens drei Ansprechpartnern öffnen; alle Kontakte ohne zusätzliche Suchleiste erwarten. Bei Abweichung die Anzahl melden.
- In „Allgemein“ nach unten scrollen; dort „Firmenadressen“ einschließlich vorhandener Bearbeitungsbuttons erwarten. Bei fehlenden Adressen den Hinweistext melden.

## Prüfung und Einrichtung

Synthetische Browserprüfungen decken beide Listen mit 0, 1, 2, 3 und 4 Einträgen ab, dazu längere Projektlisten, Livefilter, keine Treffer, Filterlöschung, Schrumpfen einer gefilterten Liste, unabhängiges Scrollen, neue Kontakte, unveränderte Entwürfe sowie mobile Reiter und Suche. Bestehende Kunden-/Adressbearbeitung und Kommunikation werden weiter geprüft. Desktop-, Handy- und helle Darstellung anhand künstlicher Daten geprüft. Keine echten Kundendaten zu Testzwecken verändert.

Keine neuen/geänderten Script Properties, OAuth-Scopes, Zugriffs-/Ausführungseinstellungen oder Firebase-Regeln. Keine Datenmigration und kein neuer Hintergrundlauf. Veröffentlichung und technischer Codevergleich werden getrennt im Projektüberblick und Tagebuch dokumentiert; sie ersetzen keine fachliche Live-Abnahme.

## Ergänzung r25: Kontakthistorie durchsuchen

Die rechte Historie hat ein Suchfeld „Kontakthistorie durchsuchen …“ neben dem vorhandenen Typfilter. Kopf und Suche bleiben beim Scrollen durch die Historie stehen. Die Suche berücksichtigt die vollständigen geladenen Texte, auch hinter eingeklappten Details, dazu angezeigte Ansprechpartner, Datum und Dokument-/Projektangaben. Groß-/Kleinschreibung und Akzente werden wie bei den linken Listen ignoriert. Zusätzliche sichtbare Beschriftungen über allen drei Suchfeldern entfallen; die Feldnamen bleiben für Hilfstechniken vorhanden.

Die Suche und der Typfilter werden gemeinsam angewendet. Nur bereits geladene Einträge werden durchsucht; es gibt keine zusätzliche HQ-/Firebase-Abfrage und keinen vollständigen Neuaufbau der Akte beim Tippen oder Typwechsel. Suchtext bleibt für jeden Kunden während der Sitzung erhalten. Neue gespeicherte Einträge erscheinen, wenn sie zur aktiven Suche passen; zum Anzeigen aller Einträge Suchtext leeren und „Alle Einträge“ wählen.

- Die bisherige Dashboard-Adresse neu öffnen; oben „Stand 2026-10-23-r25“ erwarten. Bei anderer Kennung diese im Chat melden.
- Einen Kunden öffnen; rechts unter „Kontakt-Historie“ ein Suchfeld ohne zusätzliche Beschriftung darüber erwarten. Bei fehlendem Feld die Appkennung melden.
- Ein Wort aus einem geladenen Historieneintrag eingeben; ausschließlich passende Einträge und die Trefferzahl erwarten. Bei falschem Ergebnis die Suchart ohne Kundeninhalte melden.
- Im Filter neben der Suche „Kommunikation“ auswählen; nur passende Kommunikationseinträge erwarten. Bei Abweichung die Filterauswahl melden.
- Den Suchtext leeren; alle Einträge des gewählten Typs erwarten. Bei abweichendem Ergebnis den technischen Hinweis melden.
- „Alle Einträge“ auswählen; wieder die vollständige geladene Historie erwarten. Bei Abweichung die angezeigte Trefferzahl melden.

Zusätzliche Browserprüfungen bestätigen Suche in eingeklappten Volltexten und Dokumentdetails, keine Abfragen beim Filtern, kundengetrennte Suchtexte, unveränderte Notizentwürfe, neue passende Einträge, feststehende Suche sowie mobile und helle Darstellung. Fachliche Live-Abnahme bleibt gesondert offen; keine Einrichtung oder Datenmigration erforderlich.
