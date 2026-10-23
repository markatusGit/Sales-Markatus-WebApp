# Kundenansicht – Listen und Adressen in r24

Stand: 23.10.2026. Ergänzung zur [Kundenkommunikation r23](KUNDENKOMMUNIKATION-R23.md).

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
