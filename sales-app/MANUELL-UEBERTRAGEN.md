# Sales Markatus manuell nach Google Apps Script übertragen

## Aktueller Schritt: E-Mail-Lesetest r8.1

Der Ansprechpartner wurde mit r8 laut Nutzer erfolgreich in HQ angelegt. Seine E-Mail fehlt dort; der Auftrag steht auf **Kontakt in HQ · Prüfung offen**. Die Ursache ist noch nicht geklärt: Der Code sendet bereits das dokumentierte Feld eMail. Deshalb folgt zunächst ein gezielter Lesetest am vorhandenen Kontakt. Keine neue Firma und keinen zweiten Kontakt anlegen.

**Nur [SalesBackend.gs](../hq-benchmark/SalesBackend.gs) ersetzen. Sales.html bleibt unverändert.** Die Oberfläche zeigt weiter r8; die Diagnose selbst enthält die Kennung **Kontaktprüfung 2026-09-26-r8.1**. Keine neuen/geänderten Skripteigenschaften, Manifest- oder Zugriffseinstellungen.

1. Die lokale Datei SalesBackend.gs im Texteditor öffnen.
2. Den gesamten Inhalt mit **Strg+A**, danach **Strg+C** kopieren.
3. Im bestehenden Apps-Script-Projekt die Datei **SalesBackend.gs** öffnen.
4. Den gesamten bisherigen Inhalt mit **Strg+A**, danach **Strg+V** ersetzen.
5. Mit **Strg+S** speichern.
6. **Bereitstellen → Bereitstellungen verwalten** öffnen.
7. Die bestehende Web-App auswählen und das **Stiftsymbol** anklicken.
8. Unter **Version** den Eintrag **Neue Version** auswählen.
9. **Bereitstellen** anklicken.
10. Die bestehende /exec-Web-App neu laden.
11. Links **Daten-Testseite** öffnen.
12. Im Abschnitt **Schreiben · nur eigene Testfirmen** die bereits angelegte Testfirma suchen.
13. Bei genau dieser Firma **Homepage in HQ prüfen** anklicken. Die vorhandene Schaltfläche prüft jetzt zusätzlich den Ansprechpartner.
14. Im eingeblendeten Ergebnis den Eintrag **Ansprechpartner** suchen.
15. Den vollständigen Text ab **Kontaktprüfung 2026-09-26-r8.1** mitteilen. Dieser Text enthält keine Kontaktwerte oder IDs. Nicht die Homepagewerte oder den Firmennamen mitschicken.

Erwartet werden Aussagen wie **E-Mail in Firebase: vorhanden**, **HQ eMail: leer** und **Abweichende Kontaktfelder: eMail**. Der Test unterscheidet auch abweichende Schreibweisen des Feldnamens und das Feld **defaultAddress.email** der Kontaktadresse. Wenn eine Adresse verknüpft, aber nicht mitgeliefert ist, wird ein zusätzlicher reiner Leseabruf versucht. Ein fehlgeschlagener Abruf wird ausdrücklich gemeldet und nicht als leeres Feld ausgelegt.

Wenn die Kennung r8.1 fehlt, wurde noch die frühere Backend-Version ausgeführt; dann Dateiersetzung und neue Bereitstellung prüfen. Wenn die Prüfung einen anderen Fehler zeigt, diesen technischen Text mitteilen. Noch keine weiteren Schreibtests ausführen. Die E-Mail-Übertragung ist mit diesem Diagnoseschritt ausdrücklich noch nicht behoben.

## Vorherige r8-Übergabe als Referenz


Stand: 26.09.2026 · **2026-09-26-r8**. Dateien lokal vorbereitet; Übertragung und Bereitstellung übernimmt der Nutzer. Der HQ-Live-Test dieser Version steht noch aus. Frühere Updateanleitungen sind durch diese Anleitung ersetzt; der Verlauf bleibt im Projekttagebuch erhalten.

## Was sich ändert

Firma und Ansprechpartner werden weiterhin gemeinsam in Firebase gespeichert und sind sofort in der App sichtbar. Der HQ-Abgleich hat jetzt zwei ausdrücklich getrennte Aufrufe:

- **Schritt 1:** Firma anlegen, HQ-ID speichern, Firma zurücklesen und ihre Identität bestätigen. Danach hält die App an. Auch ein zweiter Klick auf Schritt 1 sendet keinen Ansprechpartner.
- **Schritt 2:** Die bestätigte Firma erneut über ihre gespeicherte ID lesen, den Ansprechpartner mit dieser ID anlegen und zurückprüfen. Danach die technische Firmenkennzeichnung entfernen und den bestätigten Stand in Firebase ablegen.

Beide Schritte können zeitlich getrennt und auch nach Schließen der App ausgeführt werden. Es gibt in r8 keine automatische Fortsetzung und noch keinen nächtlichen Hintergrundlauf. Ein unklarer Schreibausgang sperrt die Wiederholung.

**Konkrete r8-Korrektur:** Der Nutzer meldet jetzt HTTP 400 am Kontakt-POST mit den Feldhinweisen salutation und salutationForm. Der bisherige Code übertrug die Anrede, ließ aber die separate Ansprache weg. r8 speichert und sendet salutationForm als Formal, Informal oder Neutral, standardmäßig Formal. Das neue Auswahlfeld heißt **Ansprache**. Anrede und Ansprache werden getrennt behandelt und zurückgeprüft. Das ist eine gezielte Korrektur passend zur Fehlermeldung; die Annahme durch den echten HQ-Mandanten bleibt live zu bestätigen. Grundlage: [offizielle HQ-v2-Spezifikation](https://developer.hellohq.io/swagger20.json).

**Für den jetzt gemeldeten Fehler keine weitere Testfirma anlegen.** Die bestehende Firma und ihr Firebase-Kontakt können nach der unten beschriebenen Prüfung weiterverwendet werden. Nur der dokumentierte alte Kontakt-POST mit HTTP 400 und fehlender salutationForm erhält diesen Korrekturweg. Andere Fehler bleiben gesperrt.

## Die zwei Dateien ersetzen

1. Die lokale Datei [SalesBackend.gs](../hq-benchmark/SalesBackend.gs) in einem Texteditor öffnen.
2. Den gesamten Inhalt mit **Strg+A**, danach **Strg+C** kopieren.
3. Das bestehende Projekt **Magazinvertrieb – HQ-Test** im [Apps-Script-Editor](https://script.google.com/home/projects/1QWMae8m5upOmPusbq2bS_IkIqRm8fVZHnjo-7U7ea6K0RglzOR4y7ZkJ/edit) öffnen.
4. Links die bestehende Datei **SalesBackend.gs** auswählen.
5. Ihren bisherigen Inhalt mit **Strg+A**, danach **Strg+V** vollständig ersetzen.
6. Mit **Strg+S** speichern.
7. Die lokale Datei [Sales.html](../hq-benchmark/Sales.html) per **Rechtsklick → Öffnen mit → Editor** als Quelltext öffnen.
8. Den gesamten Inhalt mit **Strg+A**, danach **Strg+C** kopieren.
9. Im Apps-Script-Editor links die bestehende HTML-Datei **Sales.html** auswählen.
10. Ihren bisherigen Inhalt mit **Strg+A**, danach **Strg+V** vollständig ersetzen.
11. Mit **Strg+S** speichern.

Nur diese zwei Dateien ersetzen. Keine zusätzliche Datei Sales.gs anlegen. Code.gs, Revenue.gs, FirebaseSync.gs, Index.html und appsscript.json gehören zur bestehenden Installation und werden für dieses Update nicht ersetzt.

## Die bestehende Bereitstellung aktualisieren

1. Oben rechts **Bereitstellen → Bereitstellungen verwalten** öffnen.
2. Die bisher verwendete Web-App auswählen.
3. Auf das **Stiftsymbol** klicken.
4. Unter **Version** den Eintrag **Neue Version** auswählen.
5. Optional als Beschreibung **Sales r8 – Firma und Kontakt getrennt** eingeben.
6. Auf **Bereitstellen** klicken.
7. Die bisherige Web-App-Adresse mit dem Ende **/exec** öffnen und neu laden.
8. Oben in der App **Stand 2026-09-26-r8** prüfen. Bei einer anderen Kennung oder „Dateien haben unterschiedliche Stände“ zunächst beide Dateien und die ausgewählte Bereitstellung prüfen; noch keinen Schreibtest starten.

**Für r8 keine neuen/geänderten Skripteigenschaften, Manifestwerte oder Zugriffsrechte.** Die vorhandenen Einstellungen bleiben bestehen. Nur Speichern ohne neue Bereitstellungsversion aktualisiert die /exec-App nicht.

## Jetzt testen: den bestehenden fehlgeschlagenen Auftrag fortsetzen

1. Links **Kunden** öffnen.
2. Die bereits angelegte eigene Testfirma aus der aktuellen Fehlermeldung öffnen.
3. **HQ-Ausgang nur prüfen** anklicken. Alternativ steht unter **Daten-Testseite → Synchronisationsaufträge** beim selben Auftrag **Ergebnis nur in HQ prüfen**.
4. Die Meldung abwarten. Erwartung: **„HQ geprüft: Firma bestätigt, keine Kontakte vorhanden. Fehlende Ansprache in Firebase auf Formell ergänzt.“** Bei dieser Prüfung wird in HQ nichts geschrieben.
5. Wenn die Prüfung blockiert oder einen anderen Fehler meldet, diesen technischen Text mitteilen und nicht fortfahren. Die Freigabe erfordert die bekannte eigene HQ-Firma, unveränderte Testkennung und eine vollständig gelesene leere Kontaktliste.
6. Nach erfolgreicher Prüfung **2. Ansprechpartner nach HQ übertragen** anklicken. Die App prüft die Firma und die weiterhin leere Kontaktliste noch einmal und überträgt dann den Kontakt mit ergänzter Ansprache. Die Firma wird nicht erneut angelegt.
7. Die Meldung abwarten. Erwartung: **„In HQ bestätigt“** beziehungsweise **„Bestätigt“**.
8. In HQ dieselbe Firma neu laden.
9. Den Bereich **Kontakte** öffnen. Erwartung: Genau der eingegebene Ansprechpartner ist dieser Firma zugeordnet.
10. Falls erneut ein Fehler erscheint, unter **Daten-Testseite → Synchronisationsaufträge** den vollständigen technischen Text ablesen und mitteilen, ohne Firmenname, IDs oder Kontaktwerte. Keinen weiteren Anlageversuch starten.

Der Korrekturweg wird nicht für Timeouts, andere HTTP-Fehler, unbekannte frühere Ausgänge oder bereits vorhandene Ansprechpartner freigegeben. Auch ein zweiter Fehler mit bereits ergänzter Ansprache wird nicht automatisch erneut freigeschaltet. Ein vorhandener Kontakt wird weder gelöscht noch überschrieben.

## Späterer Neuanlagetest nach erfolgreicher Kontaktprüfung



1. Mit dem bereits funktionierenden Konto **info@markatus.de** die Web-App öffnen.
2. Links **Daten-Testseite** auswählen.
3. **Testfirma anlegen** anklicken. Fehlen Auswahllisten, vorher auf der Testseite **Auswahllisten HQ → Firebase** ausführen.
4. Einen neuen, eindeutigen Firmennamen mit **TEST ** am Anfang eintragen. Die alten unklaren Aufträge für diesen Test unverändert lassen.
5. Die erforderlichen Firmenfelder mit erfundenen Angaben ausfüllen.
6. Beim Ansprechpartner mindestens **Vorname** und **Nachname** mit erfundenen Werten ausfüllen. Weitere Kontaktfelder sind optional.
7. **In Firebase speichern** anklicken. Erwartung: Firma und Ansprechpartner stehen sofort auf der Kundenkarte; in HQ wurde noch nichts angelegt.
8. **1. Firma in HQ anlegen und bestätigen** anklicken.
9. Auf **„Schritt 1 abgeschlossen“** warten. Erwartung: **„Firma in HQ bestätigt · Kontakt offen“** und ein neuer Knopf für Schritt 2. Bei „Rückprüfung offen“ eine Minute warten und Schritt 1 erneut ausführen; eine Firma mit gespeicherter HQ-ID wird dabei nicht nochmals angelegt.
10. In HQ die neue Firma öffnen. Erwartung: Die Firma existiert, der Ansprechpartner ist noch nicht angelegt. Die technische Kennzeichnung in der Beschreibung bleibt bis zum vollständigen Abschluss vorübergehend bestehen.
11. Für diesen Test etwa eine Minute warten. Dies ist eine bewusste Testpause, keine vom Programm erzwungene Wartezeit.
12. In der App dieselbe Kundenkarte öffnen und **2. Ansprechpartner nach HQ übertragen** anklicken.
13. Auf das Ergebnis warten. Erwartung: **„In HQ bestätigt“** beziehungsweise **„Bestätigt“**.
14. In HQ dieselbe Firma neu laden und den Bereich **Kontakte** öffnen. Erwartung: Genau ein Ansprechpartner mit den eingegebenen Werten bei genau dieser Firma.
15. Die Firmenbeschreibung in HQ prüfen. Nach vollständig bestätigtem Abschluss darf die technische Kennzeichnung nicht mehr enthalten sein.

Bei Abweichung:

- Bei **„Kontakt in HQ · Prüfung offen“** eine Minute warten und **2. Ansprechpartner prüfen und abschließen** anklicken. Der bekannte Kontakt wird zurückgelesen, nicht nochmals angelegt.
- Bei **„HQ-Ausgang prüfen“ / „Ausgang unklar“** keine weitere Anlage starten.
- Auf **Daten-Testseite → Synchronisationsaufträge** den Status und den vollständigen technischen Text unter dem Auftrag ablesen.
- Nur diesen Status und technischen Text mitteilen; keine Firmennamen, IDs, Zugangsdaten oder Kontaktwerte mitsenden. Die neue Meldung nennt beispielsweise **POST /v2/ContactPersons: HTTP 400** und gegebenenfalls die von HQ genannten Feldnamen.

## Bestehende Einrichtung und weitere Google-Konten

Diese Übersicht dient zur Orientierung; für r8 müssen diese Werte nicht erneut eingetragen werden:

| Skripteigenschaft | Vorhandene Konfiguration / Zweck |
| --- | --- |
| SALES_ADMIN_EMAIL | info@markatus.de – App-Administrator |
| SALES_ALLOWED_EMAILS | info@markatus.de,pp@markatus.de beziehungsweise die inzwischen ausdrücklich freigegebenen Adressen |
| FIREBASE_PROJECT_ID | Bestehendes Projekt sales-markatus beibehalten |
| FIREBASE_SERVICE_ACCOUNT_JSON | Bestehenden geheimen Dienstkontowert beibehalten, nicht teilen |
| HQ_API_TOKEN | Bestehenden geheimen HQ-Token beibehalten, nicht teilen |

Weitere vorhandene Benchmark-Einstellungen bleiben ebenfalls bestehen. Der Bereitsteller, der App-Administrator und erlaubte weitere Nutzer sind unterschiedliche Rollen. Die letzte bestätigte Google-Bereitstellung verwendet **Ausführen als: Ich** und **Nur ich**. Mit info@markatus.de funktioniert der Zugriff laut Nutzer. Der Zugang mit pp@markatus.de und ein regulärer Google-Login für weitere Nutzer bleiben ein eigenes offenes Arbeitspaket; die interne E-Mail-Freigabe allein öffnet die Google-Bereitstellung nicht.

## Arbeitsablauf für kommende Änderungen

Codex bereitet die Dateien lokal vor, nennt exakt die geänderten Dateien und nötige Einstellungen, pflegt das Projekttagebuch und sichert die geprüften Änderungen auf GitHub. Der Nutzer ersetzt die Dateien in Apps Script und stellt eine neue Version bereit. Lokale Prüfung, GitHub-Sicherung, Google-Bereitstellung und tatsächlicher HQ-Live-Test sind getrennte Schritte.
