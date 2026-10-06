# Sales Markatus manuell nach Google Apps Script übertragen

Stand: 06.10.2026 · **2026-10-06-r19.1**. Korrektur für „is not a function“ beim Button **Ausgaben aus Firebase verknüpfen**. Die Auswertung nutzt jetzt den bestehenden Serverzugang mit ausdrücklich getrenntem Ausgabenmodus. Lokal vorbereitet und synthetisch geprüft; Bereitstellung und Live-Abnahme stehen aus.

**Austauschdateien:** [SalesBackend.gs](../hq-benchmark/SalesBackend.gs) und [Sales.html](../hq-benchmark/Sales.html). Beide vollständig ersetzen. Bei deiner bereits eingerichteten r18-Version ist keine zusätzliche Google-Freigabe nötig. Abschnitt 2a nur bei fehlender Hintergrundfreigabe verwenden. Kein automatischer Upload durch Codex. Alte vollständige Firebase-Daten bleiben lesbar; nichts löschen.

**Für bereits gespeicherte „Bestehende Zuordnungen“:** Nur Abschnitte 1, 2 und 3 ausführen, danach direkt Abschnitt 6. Die Projekte nicht erneut suchen oder zuordnen. Für diese Korrektur sind keine neuen/geänderten Skripteigenschaften, Berechtigungen oder Zugriffseinstellungen erforderlich. Bei einer Meldung über fehlende Serverunterstützung oder eine nicht verfügbare Serverfunktion keinen normalen HQ-Sync als Ersatz starten, sondern den genauen technischen Text melden.

## 1. Backend ersetzen

1. Die lokale Datei **hq-benchmark/SalesBackend.gs** in einem Texteditor öffnen.
2. Mit **Strg+A** den gesamten Inhalt markieren.
3. Mit **Strg+C** kopieren.
4. Das bestehende Projekt **Magazinvertrieb – HQ-Test** im [Apps-Script-Editor](https://script.google.com/home/projects/1QWMae8m5upOmPusbq2bS_IkIqRm8fVZHnjo-7U7ea6K0RglzOR4y7ZkJ/edit) öffnen.
5. Links **SalesBackend.gs** auswählen.
6. Mit **Strg+A** den gesamten bisherigen Inhalt markieren.
7. Mit **Strg+V** vollständig ersetzen.
8. Mit **Strg+S** speichern.

## 2. Oberfläche ersetzen

1. Die lokale Datei **hq-benchmark/Sales.html** über **Rechtsklick → Öffnen mit → Editor** als Quelltext öffnen.
2. Mit **Strg+A** den gesamten Inhalt markieren.
3. Mit **Strg+C** kopieren.
4. Im Apps-Script-Editor links **Sales.html** auswählen.
5. Mit **Strg+A** den gesamten bisherigen Inhalt markieren.
6. Mit **Strg+V** vollständig ersetzen.
7. Mit **Strg+S** speichern.

## 2a. Hintergrundfortsetzung einmalig freigeben

Der Code benötigt die Google-Berechtigung `https://www.googleapis.com/auth/script.scriptapp`. Sie kann in deiner Google-Datei bereits vorhanden sein. Die lokale appsscript.json nicht vollständig übertragen: Sie enthält weitere lokale Einstellungen, die nicht Teil dieser Übergabe sind.

1. Im Apps-Script-Editor das Projekt als **info@markatus.de** öffnen, wie bei deiner bisherigen Bereitstellung.
2. Links auf **Projekteinstellungen** klicken.
3. **Manifestdatei „appsscript.json“ im Editor anzeigen** aktivieren, falls noch nicht aktiviert.
4. Links zum **Editor** zurückkehren.
5. **appsscript.json** öffnen.
6. Im vorhandenen Abschnitt **oauthScopes** nach `https://www.googleapis.com/auth/script.scriptapp` suchen.
7. Falls der Eintrag fehlt, diese eine Zeichenfolge als zusätzlichen Eintrag in die vorhandene Liste aufnehmen; bestehende Einträge behalten. Zwischen zwei Einträgen steht ein Komma, hinter dem letzten keines. Falls es gar keinen Abschnitt oauthScopes gibt, diesen Schritt auslassen: Google ermittelt Berechtigungen dann automatisch.
8. Mit **Strg+S** speichern. Erwartung: Kein roter Syntaxfehler. Bei einem Fehler nicht bereitstellen; Fehlermeldung ohne Zugangsdaten mitteilen.
9. Links **SalesBackend.gs** öffnen.
10. Oben im Funktionsmenü **setupSalesSyncWorker** auswählen.
11. Auf **Ausführen** klicken.
12. Falls Google **Berechtigungen überprüfen** anzeigt, darauf klicken.
13. Das Konto **info@markatus.de** auswählen.
14. Die angeforderten Berechtigungen für dein eigenes Script bestätigen.
15. Das **Ausführungsprotokoll** prüfen. Erwartung: **Ausführung abgeschlossen**. Bei **Zugriff nicht freigegeben** oder einer anderen Fehlermeldung hier stoppen und den technischen Text mitteilen; keine E-Mail-Freigaben auf Verdacht verändern.

Damit ist die Fortsetzung freigegeben, aber noch kein Import gestartet. Die internen Skripteigenschaften **SALES_SYNC_EXECUTOR** und **SALES_SYNC_ADMIN** werden dabei automatisch angelegt. **SALES_SYNC_TRIGGER** und **SALES_SYNC_PAUSE** verwaltet anschließend der Code. Diese vier Eigenschaften nicht von Hand ausfüllen. Bestehende HQ-/Firebase-Zugangsdaten, SALES_ADMIN_EMAIL und SALES_ALLOWED_EMAILS bleiben unverändert. Keine geänderten Firestore-Regeln, keine Änderung der Web-App-Zugriffsgruppe und kein Nachtplan erforderlich.

## 3. Bestehende Bereitstellung aktualisieren

1. **Bereitstellen → Bereitstellungen verwalten** öffnen.
2. Die bisherige Web-App auswählen.
3. Auf das **Stiftsymbol** klicken.
4. Unter **Version** den Eintrag **Neue Version** auswählen.
5. Auf **Bereitstellen** klicken.
6. Die bisherige Web-App-Adresse mit **/exec** als info@markatus.de öffnen.
7. Die Seite neu laden.
8. Oben **2026-10-06-r19.1** prüfen. Bei einer anderen Kennung oder unterschiedlichen Dateiständen zuerst die beiden Dateiersetzungen und die ausgewählte Bereitstellung kontrollieren; noch keinen Schreibtest starten.

Nur Speichern aktualisiert die /exec-App nicht. Die zusätzlichen lokalen Quellmodule sind bereits in den beiden Austauschdateien enthalten und werden nicht zusätzlich in Google angelegt.

## 4. Deinen abgeschlossenen Erstimport übernehmen

Der gemeldete Stand „152 von 152 … Mit offenen Punkten beendet“ wird als bestehende Ausgangsbasis übernommen. Die alte Warnung zur Vollständigkeitsprüfung startet keinen erneuten Gesamtimport. Nichts in Firebase löschen. Die bisherige Warnung bleibt sichtbar, bis ein neuer Lauf einen neuen Bericht erzeugt; sie ist kein Hinweis auf einen fehlgeschlagenen Dateiaustausch.

1. Die zwei Dateien nach Abschnitt 1 und 2 ersetzen.
2. Die bestehende Bereitstellung nach Abschnitt 3 auf **Neue Version** setzen.
3. Die Web-App neu öffnen.
4. Die Kennung **2026-10-06-r19.1** prüfen. Bei Abweichung zuerst die Bereitstellung korrigieren.
5. **Kunden** öffnen. Erwartung: Bisherige Firmen sind weiterhin vorhanden, auch ohne Magazinbuchung. Bei fehlenden Firmen den Stand melden und nichts löschen.

Keine neuen oder geänderten Skripteigenschaften, Scopes, Firestore-Regeln oder Bereitstellungseinstellungen gegenüber r18. Die vorhandene Hintergrundfreigabe bleibt bestehen. **SalesDelta.gs** ist bereits in **SalesBackend.gs** enthalten und wird nicht separat in Google angelegt. **FirebaseSync.gs** und **Code.gs** müssen nicht ersetzt werden.

## 5. Bamberger, Lichtenfelser und Kronacher auswählen

1. **Verwaltung** öffnen.
2. Zum Abschnitt **Magazine und Ausgaben** scrollen.
3. Im Feld **HQ-Projekt suchen (Name oder Projektnummer)** den Namen **Bamberger** eingeben.
4. **Projekte in HQ suchen** anklicken. Erwartung: Passende Projekte mit Häkchen erscheinen. Bei leerer Liste einen anderen Namensteil probieren; bei Fehler den technischen Text melden.
5. Eine gewünschte Ausgabe anhaken.
6. Den vorgeschlagenen **Magazinnamen** prüfen.
7. Die vorgeschlagene **Ausgabennummer** prüfen.
8. Schritte 5 bis 7 für jede weitere gewünschte Ausgabe dieser Trefferliste wiederholen.
9. **Auswahl speichern** anklicken. Erwartung: Zuordnungen sind in Firebase gespeichert; noch kein Gesamt-Sync gestartet.
10. Schritte 3 bis 9 für **Lichtenfelser** wiederholen.
11. Schritte 3 bis 9 für **Kronacher** wiederholen.

Die Suche und die Prüfung des ausgewählten Projekts lesen HQ. Die anschließende Auswertung im nächsten Abschnitt arbeitet ausschließlich mit bereits gespeicherten Firebase-Daten.

## 6. Nur die zusätzlichen Ausgaben verknüpfen

1. **Ausgaben aus Firebase verknüpfen** anklicken. Erwartung: Die App wechselt zu **Datenabgleich** und zeigt denselben Text als Laufart; kein HQ-Import und keine App→HQ-Schreibaufträge werden gestartet.
2. Auf einen neueren Zeitstempel warten. Google führt diesen Lauf wie bisher im Hintergrund aus; der PC kann anschließend ausgeschaltet werden.
3. Nach Abschluss **Magazinverkauf** öffnen.
4. Unter **Magazin** eines der hinzugefügten Magazine auswählen.
5. Unter **Ausgabe** eine der hinzugefügten Ausgaben auswählen.
6. Die zugeordneten Kunden und Summen stichprobenartig mit HQ vergleichen. Erwartung: Zuordnung aus dem letzten gespeicherten HQ-Stand; keine Live-Neuladung.
7. Falls **HQ-Projektzuordnung … nicht geliefert** erscheint, den Text und Abschnitt melden. Das konkrete Projekt fehlt im Cache oder wurde umbenannt; nichts löschen und keinen neuen Erstimport anlegen.
8. Falls **Bestandsprüfung** oder **Ausgabenprüfung** als Hinweis erscheint, den betroffenen technischen Text melden. Eine bestehende Mengenwarnung wird durch reines Verknüpfen nicht als behoben dargestellt.

Bereits verknüpfte unveränderte Ausgaben werden übersprungen. Bei **Keine neuen oder geänderten Ausgabenzuordnungen vorhanden** ist kein erneuter Lauf nötig. Ausgaben derselben Datenbankgruppe teilen einen Belegabruf. Trotzdem zählen einzelne gelesene Dokumente gegen das Firebase-Kontingent; keine feste Obergrenze für einen unbekannten Echtbestand zugesagt.

## 7. Später Änderungen mit HQ abgleichen

1. **Datenabgleich** öffnen.
2. **HQ synchronisieren** einmal anklicken. Erwartung: Laufart **Änderungsabgleich**, niemals aufgrund des Alters oder einer Mengenwarnung ein neuer Gesamtimport.
3. Die Zeilen unter **Datenart** prüfen. Erwartung: **Änderungen seit letztem Abgleich** für alle sechs Datenarten; unveränderte Bestände können 0 neue Zeilen melden.
4. Bei **HQ hat den Änderungsfilter abgelehnt** den technischen Text melden. Der Lauf pausiert, statt ungefragt alles zu lesen. Frühere Änderungsmarken bleiben erhalten.
5. Bei **Firestore HTTP 429** den Lauf angehalten lassen und den aktuellen Abschnitt melden; nicht mehrfach fortsetzen.
6. Nach Abschluss Hinweise unter **Bestandsprüfung** lesen. Dort werden gespeicherte Zahl und HQ-Zahl je betroffener Datenart genannt; kein Gesamtimport wird eingeplant.

Alle Kunden und Ansprechpartner bleiben unabhängig von Magazinen in Firebase. Neue oder geänderte Firmen und Ansprechpartner kommen beim Änderungsabgleich hinzu. App-Aufträge werden weiterhin zuerst Firma, danach Ansprechpartner und weitere freigegebene Änderungen übertragen. Unklare Schreibausgänge bleiben gesperrt; echte Bestandskunden, Rechnungen und Projekte bleiben HQ-seitig schreibgeschützt.

Zusätzlich werden pro Lauf höchstens zehn bekannte Datensätze je Datenart reihum einzeln geprüft. So können Änderungen an Kontaktadressen oder Planungen ohne aktualisierten Eltern-Zeitstempel nach und nach erkannt werden. Das ist keine sofortige oder lückenlose Erkennung solcher Änderungen: Bei 4.000 Kontakten braucht eine vollständige Runde 400 gestartete Läufe. HQ-Löschungen erscheinen als Prüfhinweis, sobald sie in einer Einzelprüfung auffallen; Firebase-Daten werden nicht automatisch gelöscht. Eine reine Mengenprüfung erkennt Löschen plus Neuanlage gleicher Anzahl nicht zuverlässig. Ein verlässlicher Ereignis-/Löschkanal von HQ bleibt für zeitnahe vollständige Erkennung offen.

## 8. Weiterhin offen

- Die genaue Ursache der bisherigen Mengenabweichung ist noch nicht geklärt; die neue Version verhindert den daraus ausgelösten Neuimport und zeigt künftig die betroffene Datenart.
- Die neuen Datums-/Adressfilter müssen am echten Mandanten geprüft werden. Die Implementierung ist lokal mit künstlichen Daten getestet.
- Ein regelmäßiger Nachtstart ist nicht eingerichtet. Google setzt nur einen von dir gestarteten Lauf fort.
- Sicherung/Aufbewahrung alter Importjournale und eine Budgetanzeige bleiben weitere Arbeitsschritte.
