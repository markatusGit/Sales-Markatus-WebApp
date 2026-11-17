# Änderungsprotokoll

Neue Veröffentlichungen verwenden Git-Tags im Format `vMAJOR.MINOR.PATCH`. Frühere r-Versionen bleiben unverändert im [Projekttagebuch](docs/PROJEKTTAGEBUCH-UND-ROADMAP.md) dokumentiert.

## [Unveröffentlicht]

## [v0.29.1]

- **F-15 Bereinigung ohne TTL-Richtlinie (Spark):** Nach einer erfolgreichen Anmeldung löscht der Server höchstens alle 10 Minuten bis zu je 20 Anmeldeversuche und Sitzungen, deren Feld `ttl` (Ablauf plus 1 bzw. 7 Tage Karenz) überschritten ist. Löschung nur mit unveränderter `updateTime`; Fehler beeinträchtigen die Anmeldung nie. Dokumente aus der Zeit vor r29 ohne `ttl` werden nicht erfasst. Appkennung `2026-11-17-r29.1`; 1 neuer Test, alle 23 Prüfdateien bestanden. Keine neuen Script Properties oder Bereitstellungseinstellungen.

- Nach v0.29.0 (ohne neue Google-Version): F-11 Firebase-Hosting liefert nur noch `/auth/` (Anmeldedateien byte-gleich, alte Pilotseite HTTP 404). F-14 `localhost` aus den autorisierten Domains entfernt. F-15 TTL-Richtlinien im Spark-Tarif nicht verfügbar (Firestore verlangt Abrechnung); keine Abrechnung aktiviert, TTL-Konfiguration per Revert zurückgenommen, Feld `ttl` bleibt vorbereitet.

## [v0.29.0]

Korrekturen aus dem unabhängigen Claude-Code-Prüfbericht vom 17.11.2026 (Befunde F-1 bis F-15; Bericht liegt nur lokal in der Auditkopie). Appkennung `2026-11-17-r29`. Alle 23 Prüfdateien bestanden, darunter 12 neue Regressionstests (synthetische Daten).

- **F-1 Auftrag bleibt nicht mehr auf `running` hängen:** Ein durch Kontingent, Tagesbudget oder Laufzeitgrenze unterbrochener Auftrag wird beim nächsten Zugriff unter der globalen Sperre nach denselben Regeln wie ein abgefangener Fehler eingeordnet (ohne gespeicherte Schreibmarke zurück in den letzten sicheren Schritt, sonst `uncertain` mit Zuordnungsmöglichkeit). Vor jeder HQ-Schreibaufgabe prüft der Worker eine Budgetreserve (400 Lese-/80 Schreibvorgänge); Budget- und Kontingentfehler einer Schreibaufgabe halten den Lauf an, statt die Aufgabe als erledigt zu verbuchen.
- **F-4 Kein `uncertain` ohne Schreibversuch:** Firmenanlage aus `pending` kehrt bei Fehlern vor dem POST nach `pending` zurück. Die Schreibmarke gilt erst, wenn sie gespeichert ist; scheitert das Speichern, wird HQ nicht kontaktiert.
- **F-5:** „Kundendetails aktualisieren“ behält offene App-Stammdatenänderungen (`pendingChanges`) wie der Sammelabgleich.
- **F-6:** Firmenanlage mit Anfragekennung: Wiederholung nach verlorener Antwort liefert den gespeicherten Entwurf statt einer zweiten Anlage.
- **F-12:** Bestätigte Stammdatenänderung bleibt `synced`, auch wenn die lokale Akte fehlt.
- **F-2/F-3 Kontingentschutz gegen anonyme Aufrufe:** Dienstkonto-Token wird ca. 50 Minuten im Script-Cache gehalten. Unbekannte Sitzungen werden je Minute gezählt und über dem Grenzwert ohne Firestore-Lesevorgang abgewiesen; bestätigte Sitzungen bleiben unberührt. Login-Drossel prüft zuerst den Cache; unvollständige oder nicht ausgestellte Anmeldeabschlüsse verbrauchen weder Firestore noch das gemeinsame Anmeldelimit.
- **F-7:** Speicheraktionen warten bis zu 30 s auf die globale Sperre; der Worker gibt sie zwischen Abschnitten kurz frei.
- **F-8:** Recht „Datenabgleich ausführen“ startet den Ausgabenabgleich nicht mehr (nur Administrator).
- **F-9:** Einzelne Geschäftsschreibvorgänge angemeldeter Nutzer prüfen die aktuelle Freigaberevision (Worker unverändert).
- **F-10:** Synthetischer Firestore-Verbrauchsaudit auf den seit r23 gültigen Wert (5 Lesevorgänge je Akte) korrigiert und in `npm test` aufgenommen.
- **F-11 (vorbereitet):** `firebase.json` liefert die alte Pilotseite nicht mehr aus; wirksam erst nach gesondertem Hosting-Deploy.
- **F-13:** `exceptionLogging` auf `STACKDRIVER`, damit Fehler im Hintergrund unter Ausführungen nachvollziehbar sind.
- **F-15 (Code):** Anmeldeversuche und Sitzungen erhalten ein Firestore-Feld `ttl`; automatische Löschung erst nach Einrichtung der TTL-Richtlinie in der Konsole.
- Keine neuen Script Properties, keine Änderung an Zugriff/Ausführungsidentität der Bereitstellung. F-14 (`localhost` als autorisierte Domain) ist eine Konsoleneinstellung und nicht Teil dieses Codes.

## [v0.28.4]

- Google47 veröffentlicht und mit Editor/GitHub verglichen; alle22 Suiten bestanden. Bestehender Abgleich am17.11. live von162/173 bis173/173 abgeschlossen.21 offene Hinweise ausdrücklich erhalten, keine fehlerfreie Datenabnahme behauptet.
- Echte lesende Prüfungen bestätigen die korrigierte Unternehmensbereich-Zuordnung;13 Altaufträge unverändert. Sechs Historienaufträge weiterhin wegen syncId unbestätigt, drei Firmen-IDs HTTP404, ein E-Mail-Zielzustand offen.

- Unternehmensbereiche entsprechend HQ-SubsystemBase ohne eingebettete ID bestätigen: begrenzte frische Metadatenliste, nur vollständige und eindeutige Zuordnung. Doppelte Namen/abweichende Attribute bleiben gesperrt. Kein erneuter Firmen-POST.
- Bei gleicher Projekt-ID, Projektnummer, Magazin und Ausgabe nur führende Nullen im abschließenden Ausgabe-Titel tolerieren; wirkliche Zuordnungsänderungen weiterhin blockieren. Aktualisierten Titel nach erfolgreicher Verknüpfung speichern.
- Reine Altauftragsprüfung nennt nicht bestätigte Historienfelder und prüft auch den gespeicherten E-Mail-Zielzustand. Keine Entsperrung/Statusänderung. HTTP429 bei anonymer Schutzprüfung als Kontingentfehler behandeln; öffentliche Daten bleiben abgewiesen.
- Keine neuen Script Properties oder Bereitstellungseinstellungen; bestehender Tagesbudgetschutz bleibt erhalten.

## [v0.28.3]

- Als Google46 veröffentlicht, alle 22 Suiten und Google/Editor/GitHub-Abgleich erfolgreich. Am 17.11. Kontingenterneuerung und 14 gesperrte anonyme Datenpfade live bestätigt; alter Lauf 154/173 weiterhin angehalten. Echte Wiederanmeldung/Abschluss offen.

- Live nachgewiesenes ausgeschöpftes Firestore-Lesekontingent: Login zeigt verständliche Speicher-/Kontingentmeldung und bleibt bei nicht prüfbarer Freigabe gesperrt.
- HQ-Trigger bei tatsächlichem HTTP429 oder lokalem Tagesbudget unabhängig von Firestore stoppen. Auch Kontingentfehler während anfänglicher Authentifizierung und Statuslesung abfangen. Checkpoint/Wasserzeichen unangetastet.
- Autorisierter HQ-Worker erhält ein Pacific-Tagesbudget von 20.000 dokumentbezogenen Lese- und 12.000 Schreibvorgängen. Transport reserviert vor Abruf, verrechnet tatsächliche Query-Ergebnisse und zählt fehlende Lookups sowie Commit-Verifikationen. Kein neuer Idle-Abruf.
- Neue interne Script Properties SALES_SYNC_BUDGET und SALES_SYNC_HOLD werden automatisch gepflegt; keine manuelle Einrichtung oder zusätzlichen Scopes/Anbieter/Zugriffsrechte. Kontingentpause in Status sichtbar, Fortsetzung nach Tageswechsel ausschließlich manuell.

## [v0.28.2]

- Als Google45 veröffentlicht; alle 22 Suiten, 25 Auth-/Rechtefälle und Browserlogin bei belegter Geschäftssperre bestanden. Google/Editor/GitHub bestätigt. Echte Wiederanmeldung noch offen.

- Anmeldung und Tokenverlängerung vom langen HQ-Script-Lock getrennt; Schutz über atomare Firestore-Versionsbedingungen erhalten. Globale Anmeldequote bleibt 30/min und wird ohne Geschäftssperre atomar gespeichert.
- Nebenläufige Verlängerung übernimmt nur bestätigte aktive Sitzungen; verbrauchte Anmeldeanfragen, geänderte Rechte und Logout können nicht überschrieben werden. Browser prüft Login/Wiederanmeldung bei dauerhaft blockiertem Geschäftslock.
- Keine neuen Script Properties oder Bereitstellungseinstellungen. Veröffentlichung und echter Login noch offen.

## [v0.28.1]

- Google44 und GitHub-Tag/main bestätigt; alle 22 Suiten bestanden. Vorhandenen Lauf live fortgesetzt; tatsächlicher Abschluss noch offen.

- HQ-Filterzeit auf volle UTC-Sekunden begrenzt: echter Gegenversuch bestätigt die Ursache des HTTP400. Grenzsekunde sicher überlappend lesen und validieren; pausierten Lauf ohne Vollimport oder erneute alte Schreibaufträge fortsetzen.
- HQ-Firmenarten aus GET-id in Rückprüfung, Projektion und Typeneditor normalisieren; ungültige/widersprüchliche IDs abweisen.
- Auftragsübersicht mit gespeicherten HQ-Firmen repariert; neuer Administrator-Lesetest verändert weder Aufträge noch Sperren. Gezielte Regressionen ergänzt.
- Keine neuen Script Properties oder Bereitstellungseinstellungen. Vollständige Veröffentlichung/Live-Prüfung noch offen.

## [v0.28.0]

- Diagnosestufe für den ausdrücklich beauftragten HQ-Sync-Fix: Nur bei manuell abgefragter Unternehmens-Filterpause und nur für Administratoren maximal sieben gefilterte GET-Probes mit je top=1. Fehlertext begrenzt und Zugangsdaten entfernt, Ergebnis 30 Minuten im Script Cache. Keine HQ-/Firebase-Schreibvorgänge, keine Cursor-/Triggeränderung oder unfiltrierter Ersatzabruf. Normale Statusabfrage bleibt unverändert schlank.
- Abschnittszähler nennt bearbeitete statt vermeintlich erfolgreiche Abschnitte. Diagnose wird nur der angezeigten Antwort angefügt, nicht als neuer Lauf-/Auftragsfehler gespeichert. Filterkorrektur folgt nach echter Diagnose.
- 19 Delta-/Wiederaufnahmefälle, 20 Auth-/Rechtefälle und elf Performancefälle erfolgreich; neue Diagnosefälle bestätigen GET-only, Begrenzung, Caching, Redaktion und unveränderten Datenbestand. Vollständige Releaseprüfung folgt. Keine neuen Script Properties oder Bereitstellungseinstellungen.

- Dokumentation 16.11.2026: HQ-Abgleich zunächst 0/32, danach laut Nutzer 19/32 mit 18 Meldungen und Filterpause. Blockierender abgelehnter Änderungsfilter und getrennte unsichere Schreibaufträge eingeordnet. Missverständliche Erfolgszählung als offener Punkt erfasst. Konkrete Filterursache/Korrektur noch offen; kein Code-/Trigger-/Konfigurationswechsel.

## [v0.27.3]

- Als Google-Version 42 unter derselben Adresse veröffentlicht. Alle 22 Suiten und erweiterte Ablauf-/Wiederanmeldungsfälle bestanden, Google/Editor/GitHub verglichen. Echte Langzeit-Bedienprobe noch offen.

- Abgelaufene Sitzung öffnet beim nächsten Zugriff die Anmeldung. Google-Fehlerhüllen werden für AUTH_REQUIRED/AUTH_DENIED normalisiert; angemeldete Datenansicht und Sitzungscaches werden verlassen. Automatisches Pop-up mit direkt bedienbarer Schaltfläche Erneut anmelden als Rückfall.
- Acht-Stunden-Serverfrist in der bestehenden Loginantwort mitgegeben; lokale Prüfung vor dem nächsten Geschäfts-RPC, ohne Timer, Hintergrundabfragen oder Browserpersistenz. Keine automatische Wiederholung fehlgeschlagener Lese-/Schreibaktionen.
- Parallele Fehler erzeugen nur eine Anmeldung; verspätete Antworten alter Sitzungen werden verworfen. Manuelles Abmelden bleibt ohne automatische Wiederanmeldung. Browser prüft tatsächliche Fehlerhülle, lokalen/serverseitigen Ablauf, erneuten Login, Pop-up-Blockierung, parallele Fehler und späte Antworten. Keine neuen Einstellungen; Tagesanmeldung weiterhin separat offen.

## [v0.27.2]

- Veröffentlicht als Google-Version 41; alle 22 Suiten, 19 Auth-/Rechtefälle und erweiterter Browser bestanden. Google/Editor/GitHub abgeglichen. Fachliche Live-Abnahme offen.

- Erneuter Login mit altem Einladungslink nutzt bei aktivierten Konten ausschließlich aktuelle Rechte. Keine zweite Aktivierung, kein Zurücksetzen geänderter Rechte und kein Entsperren gesperrter Konten. Einladung nach Erfolg aus der aktuellen Tab-Adresse entfernen.
- Versionsprüfung im vorhandenen Anmeldedialog, ohne zusätzliche Geschäftsdaten- oder Datenbankabrufe. Veraltete Oberfläche erhält einen Link zur aktuellen Version derselben Bereitstellung. Wechsel während der Google-Anmeldung ebenfalls abgefangen; manuelle Ersetzungsanleitung im normalen Benutzerzugang entfällt.
- 19 Auth-/Rechtefälle einschließlich Wiederanmeldung nach Rechteänderung, Sperre, Versionswechsel und Token-Erneuerung nach einer Stunde; Browser prüft alten Einladungslink, URL-Bereinigung und Wechsel vor/während Login. Tagesanmeldung mit Wiederherstellung nach Reload noch nicht umgesetzt; Serverfrist acht Stunden/RAM-only unverändert. Keine neuen Einstellungen.

## [v0.27.1]

- Ladeanzeige schon im initialen HTML und während Google-Rückkehr sowie Serverprüfung; kein kurz sichtbares Anmeldeformular. Bei Abbruch erneuter Versuch; bei Serverfehler schließt das Ladefenster und die App zeigt die Fehlermeldung. Reduzierte Bewegung und zugänglicher Ladestatus berücksichtigt.
- Synthetischer Browser prüft verzögerte Rückkehr, verborgene Bedienelemente bis zur Serverantwort, Abbruch/Wiederholung und Serverablehnung. E-Mail-/Passwortanmeldung einschließlich Einladung/Verifizierung unverändert erhalten. Nutzer bestätigt ausdrücklich, E-Mail/Passwort zusätzlich zu behalten; keine Google-only-Umstellung. Keine Anbieter-, Rechte-, Script-Property- oder Apps-Script-Einstellungsänderung.

## [v0.27.0]

- Freischaltungsstand für eingeladene Benutzer nach erfolgreicher Bestätigung des bisherigen Administrators. Bestehende Bereitstellung erhält eine öffentlich erreichbare Loginseite; Geschäftsdaten ausschließlich über Firebase und den serverseitigen Rechte-Gateway. Ausführung bleibt USER_DEPLOYING.
- Firebase-Modus im öffentlichen Code zwingend, auch ohne optionale Modus-Eigenschaft. Alte E-Mail-Liste eröffnet keinen alternativen Zugang. Serverseitige Finanz-/Projektfilter und getrennte Lese-/Hinzufügen-/Ändern-Rechte.
- Rechteänderungen liefern nur den geänderten Benutzer zurück, ohne erneuten Listenabruf. Bestehende technische Administratoraktionen im Gateway erhalten. 16 Sicherheitsprüfungen und erweiterte Browserprüfung sowie alle 22 Release-Suiten erfolgreich. Als Google-Version 39 veröffentlicht und mit GitHub-Tag verglichen; anonymer Loginseiten-Abruf und geschlossene Datenbankregeln bestätigt. Öffentliche Google-Administratoranmeldung und Benutzerverwaltung vom Nutzer live bestätigt; echte Passwort-Einladung/Teamrechte noch nicht live abgenommen.

## [v0.26.1]

- Privater Korrekturstand: Google-Anmeldung als direkte Weiterleitung im vorhandenen Anmeldefenster auf `sales-markatus.firebaseapp.com`. Nutzer meldete beim zusätzlichen Google-Pop-up einen Abbruch. Nur kurzlebiger Anfragekontext in Session Storage, keine eigene Tokenpersistenz; Firebase im Arbeitsspeichermodus.
- Logout leert zusätzliche Such-/Formular-/Verwaltungszustände; abgelaufene Anmeldeversuche neu startbar. Administratorbindung und Aktivierung zusätzlich geprüft.
- Öffentlicher Zugang bleibt zurückgehalten. Veröffentlichungswerkzeug erlaubt künftig ausschließlich den dokumentierten Übergang auf derselben Bereitstellung nach bestätigtem Administrator und mit zwingendem Firebase-Modus.

## [v0.26.0]

- Privat als Google-Version 37 veröffentlicht: eingeladene Firebase-Benutzer und serverseitige Bereichs-/Schreibrechte auf Apps Script ohne Abrechnungskonto. Geschützte Administratorbindung, 48-Stunden-Einladungen, widerrufbare Sitzungen und Rechteprüfung vor HQ-Schreibvorgängen. Aktivierung/Live-Abnahme noch offen.
- Neue Authentifizierungs-/Autorisierungs- und Browserprüfungen. Noch nicht aktiviert oder live abgenommen; Stand und Grenzen in `docs/BENUTZERZUGANG-R26.md`.

Dokumentation vom 18.10.2026: Testbestandteile T01–T09 und Produktivlücken L01–L14 anhand r21-Quellen sortiert, bestehende echte Lesefunktionen von Test-Schreibwegen und reinen Konzept-/Demofunktionen getrennt. Prioritäten und Abnahmekriterien für Teamzugang, echte Kundenarbeit und vollständigen Verkaufsablauf festgehalten; V1-Plan mit aktuellem Einstieg versehen. Kein Appumbau, keine Bereinigung oder Rechteänderung.

Die anschließende Freigabe für T01/T02/T03/T04/T06/T09 ist im folgenden r22-Abschnitt dokumentiert. D17 und D21 bleiben erhalten; D22 umfasst weiterhin nur eine lesende Inventur.

## [v0.25.0] – 2026-10-23

- Suchfeld oberhalb der rechten Kontakthistorie; filtert bei jeder Eingabe im geladenen Bestand, einschließlich vollständiger eingeklappter Inhalte, Ansprechpartner und Dokumentangaben. Mit bestehendem Typfilter kombinierbar, Trefferzahl und Leermeldung sichtbar.
- Historienkopf und Suche bleiben beim Scrollen stehen. Suchtext bleibt je Kunde während der Sitzung erhalten, auch bei Neudarstellung und neuen Einträgen. Tippen und Typfilterwechsel ohne Serverzugriff und ohne erneutes Rendern der gesamten Kundenakte.
- Zusätzliche sichtbare Beschriftungen über Ansprechpartner-, Projekt- und Historiensuche entfernt. Platzhalter und zugängliche Feldnamen bleiben erhalten; Historienfilter kompakt neben der Suche.
- Synthetische Browserprüfungen für volle eingeklappte Inhalte, Akzente/Großschreibung, kombinierte Filter, keine Treffer, Suchrücknahme, Kundenwechsel, neue Notizen, Notizentwürfe und Handybedienung ergänzt. Keine neuen Script Properties, Scopes oder Bereitstellungseinstellungen; echte Live-Abnahme gesondert offen.

## [v0.24.0] – 2026-10-23

- Ansprechpartner und Projekte in der Kundenakte bis zu drei Einträge wie bisher; ab vier Einträgen eigener Scrollbereich mit Platz für drei Karten und fest darüber angeordneter Suche.
- Sofortiges Filtern während der Eingabe: Ansprechpartner nach Name, Position, E-Mail oder Telefon; Projekte nach Name oder Nummer. Treffermenge und leere Ergebnisse sichtbar. Keine zusätzlichen Server-/Datenbankzugriffe.
- Firmenadressen an das Ende von Allgemein verschoben; vorhandene Adressbearbeitung erhalten. Such-/Scrollzustand und Kommunikation bleiben bei einer Neudarstellung in derselben Sitzung erhalten.
- Gemeinsamer Listenbaustein für beide Bereiche und beide Kundentypen. Browserprüfung um Grenzfälle 0–4, Schrumpfen einer gefilterten Liste, getrenntes Scrollen, Kundenwechsel und Handy-Suche ergänzt; bestehende Kommunikations- und Kundenpflegeprüfungen erhalten.
- Keine neuen Script Properties, OAuth-Scopes, Trigger oder Bereitstellungseinstellungen. Fachliche Live-Abnahme gesondert offen.

## [v0.23.0] – 2026-10-22

- Feste Kommunikationserfassung rechts in jeder Kundenakte; Kundendaten links und Historie rechts scrollen unabhängig. Auf schmalen Bildschirmen Reiter, gleichwertige helle/dunkle Darstellung.
- Eine Erfassung „Gespräch / Notiz“ mit Firmen-Ansprechpartner, automatischer/änderbarer Zeit, Speichern und „Nicht erreicht“. Team-Vorauswahl nach jüngstem gültigem Gespräch. Kein Pflichtbetreff, keine Kontaktartauswahl, keine Wiedervorlage und kein E-Mail-Versand.
- Zusätzliche Ansprechpartner im kleinen Fenster anlegen: Vor-/Nachname Pflicht, Position/E-Mail/Telefone optional. Sofort in Firebase und Kundenansicht verwendbar; bestehender HQ-Abgleich verarbeitet Firmen, Kontakte und abhängige Kommunikation in dieser Reihenfolge.
- Stabile Speicherkennungen, Erhalt von Entwürfen, Import-unabhängiger Kundenbestand, geprüfte Firmen-/Kontaktbindung und gesperrte unklare HQ-Anlagen. Verlorene Kontaktantwort ohne ID ausschließlich durch manuell geprüfte ID-Zuordnung auflösen. Keine automatische Namensübernahme oder zweite Anlage.
- Gezielte Änderungsantworten statt Gesamtneuabrufen. Im synthetischen Modell drei Reads/zwei Writes je normaler Erfassung, identische bestätigte Wiederholung ohne Writes. Ein zusätzlicher gezielter Kommunikationsabruf pro frisch geladener Kundenakte; keinerlei Datenbankaufrufe für Tippen, Auswahl, Scrollen oder Uhr.
- Alle 20 Prüfsuiten erfolgreich, einschließlich elf neuer Backendfälle und der neuen Browserprüfung; ergänzende visuelle Prüfung von Desktop, Handy und heller Ansicht. Als Google-Version 34 unter derselben Dashboard-Adresse veröffentlicht; release:verify bestätigt feste Version, Editor und GitHub-Tag/main. Quellcommit 04fcfb4, Releasecommit/Tag 5386e22, Zuordnung in deployment.json. Anleitung: docs/KUNDENKOMMUNIKATION-R23.md. Keine neuen Script Properties, Scopes oder Bereitstellungseinstellungen. Fachliche Live-Abnahme offen.

## [v0.22.0] – 2026-10-18

- T01/T02: normale Firmenanlage ohne TEST-Präfix und ohne Testkategorie. Technische lokale Kennungen und Altaufträge bleiben kompatibel; erster Ansprechpartner bleibt Pflicht. Keine pauschale Umbenennung bestehender Daten.
- T03: Kommunikation für gespeicherte Bestandskunden; serverseitige Firmen-/Kontaktbindung, Autor, eindeutige Übertragungskennung und Wiederholsicherheit. Kein E-Mail-Versand.
- T04: dokumentierte Firmen-, Firmenart-/Nummern-, Adress- und Ansprechpartnerpflege anhand des öffentlichen HQ-v2-Schemas. Geänderte Felder als Firebase-Auftrag speichern und als kleine Änderungsantwort anzeigen; keine komplette Aktennachladung. Aktuelle unbeteiligte HQ-Felder erhalten, Konflikte und unklare Ausgänge prüfen. Offene lokale Änderungen überleben HQ-Importe. Projekte/Rechnungen bleiben lesbar; nicht dokumentiert schreibbare Beziehungen bleiben geschützt.
- T06: neue Anlagen ohne sichtbaren Testmarker. Verlorene Firmen-POST-Antwort ohne ID sperrt den Auftrag bis zur ausdrücklich manuell geprüften HQ-ID-Zuordnung; keine automatische Namensübernahme und keine zweite Firmenanlage. Alte offene markierte Aufträge bleiben sicher verarbeitbar; keine pauschale Löschung/Bereinigung echter Daten.
- T09: nicht versionierte lokale Demo, HTML-Wegweiser und Vorschau aus aktiver Ablage entfernt; nur ignorierte lokale Wiederherstellungskopie. README auf tatsächliche App umgestellt. Automatisierte synthetische Tests bleiben erhalten.
- T05/T07/T08 mit Grenzen und Bedienabnahme in docs/KUNDENPFLEGE-R22.md erklärt. Zusätzliche Kontakt-/Adressanlage, neue Zusatzfelddefinitionen und weitere Vertriebs-/Teamfunktionen bleiben offen.
- 18 Syntax-/Logik-/Browser-Prüfsuiten einschließlich zwölf neuer Produktivprüfungen erfolgreich, ebenso in sauberer Veröffentlichungskopie; keine Live-Kundendaten für diese Tests verändert. Als Google-Version 33 unter derselben Dashboard-URL veröffentlicht; release:verify bestätigt feste Version, Editor und GitHub-Tag/main auf gleichen Code. Quellcommit 034c23e, Releasecommit 5e0f656, Zuordnung in deployment.json. Keine neuen/geänderten Script Properties, Scopes oder Bereitstellungseinstellungen. Fachliche Live-Abnahme bleibt offen.

## [v0.21.0] – 2026-10-17

- D07: gemeinsame kompakte Magazinfilter (Namen, Kundennummern/-typen, Ort, Branche und Betreuer) und vorzeichenrichtige Umsatzsummen je Kunde/Ausgabe. Historienfilter behalten Vollständigkeitsprüfung und importierte Ausgabenhistorie; keine vollständigen Akten oder Beleglisten für die Recherche. Einmaliger Aufbau beim ersten Bedarf, Pflege in bestehenden Schreibwegen.
- D08/D09: keine automatische Fortschrittsabfrage mehr. „Fortschritt aktualisieren“ liest einen kompakten Status; dieser wird serverseitig ungefähr alle 15 Sekunden sowie bei Start, Pause und Abschluss gepflegt. Dauerhafte Wiederaufnahmepunkte bleiben unabhängig erhalten. Kein Vollabruf nach Sync-Abschluss; betroffene Sitzungsspeicher werden für folgende bewusste Navigation verworfen.
- D11: E-Mail-Freigaben aus der bestätigten Speicherantwort anzeigen, ohne App-Nachabruf. Rechteprüfung und Speicherung in Script Properties unverändert.
- D14: Kundenhistorie gezielt über Kunden-ID aktualisieren, vorhandene Akte einmal verwenden und aktualisierte Akte direkt zurückgeben. Vollständige Historie dieses Kunden und nötige Belegzuordnung bleiben erhalten; unvollständige/fremde HQ-Antworten ersetzen keinen Bestand.
- D20: keine Journale ohne Datensatzänderung, keine redundante Zwischenspeicherung vor Projektansichts-Commit, Wiederverwendung bereits gelesener Dokumente/Partitionen je Abschnitt und deduplizierte Sammelabrufe. Journale vor tatsächlichen Datenänderungen sowie sichere Wiederaufnahme und HQ-Schreibgrenzen bleiben erhalten. Fehler einer kompakten Statusveröffentlichung nach bereits dauerhaftem Abschluss reparieren den Status ohne erneute Geschäftsverarbeitung.
- D17/D21 wie beschlossen erhalten: unzugeordnete Inhalte nur bei Bedarf; höchstens zehn rotierende Einzelprüfungen je sechs HQ-Datenarten. Kein Nachtlauf eingerichtet.
- D22: reine Inventurfunktion unter Verwaltung; höchstens 50 Dokumente pro ausdrücklichem Klick, Mengen/Bytes/Zeitspannen und technische Speicherverweise. Keine Geschäftsinhalte in der Antwort, keine automatische Abfrage, keine Löschfunktion. Der echte Bestandsdurchlauf und die Wahl einer Aufbewahrungsregel bleiben gesonderte Schritte.
- Synthetische Budgets nach Aufbau: Magazinfilter 2 Reads/0 Writes; Freigaben 0/0; einzelne Kundenhistorie im Modell 5/1 einschließlich Aktenantwort; kompakter Status 1/0. Unveränderter Folgeabgleich mit 60 Einzelprüfungen: 136 Reads/144 Writes gegenüber 142/154 in r20. Erstaufbau der Magazinprojektionen im Modell 3.217 Reads/2 Writes; große Listen können weitere Speicherteile benötigen. Keine Live-Abrechnung oder Sekundenmessung.
- Alle 16 Syntax-/Logik-/Browser-Prüfsuiten einschließlich elf neuer Backendprüfungen bestanden. Als Google-Version 32 unter derselben Dashboard-URL veröffentlicht; feste Google-Version, Google-Editor und GitHub-Tag/main per release:verify gleichgesetzt. Keine neuen/geänderten Script Properties, OAuth-Scopes, Zugriffsgruppe oder Ausführungsidentität. Nachweis in deployment.json und Projekttagebuch; echte fachliche Live-Abnahme und Inventurdurchlauf bleiben offen.

### Vorbereitende Erläuterungen

Dokumentation vom 17.10.2026: konkrete Lösungsvorschläge und Prioritäten für D07/D08/D09/D11/D14/D17/D20/D21/D22 ergänzt; keine Appänderung oder Bereinigung. Stille HQ-Prüfungen vorerst beibehalten empfohlen; geringe Häufigkeit bedeutet entsprechend langsame Bestandsabdeckung.

Dokumentation vom 17.10.2026: bestehende gemeinsame Namensliste, einmalige Aufbaukosten und Vor-/Nachteile einer künftigen Pflege beim Nachtabgleich erläutert. Kein Nachtlauf eingerichtet, keine Appänderung.

Keine weiteren Appänderungen außerhalb des unten beschriebenen r20-Umfangs veröffentlicht. Die zurückgestellten Entscheidungen bleiben offen.

## [v0.20.0] – 2026-10-16

### Gezieltes Laden auf ausdrücklichen Klick

- Freigegeben umgesetzt: D01–D06, D10, D12, D13, D15, D16, D18 und D19. Kein Mein-Tag-Timer, keine automatische Versionsprüfung und keine zeitgesteuerte Aktualisierung von Arbeitsdaten; angezeigte Daten bleiben bis zu einer Bedienaktion unverändert.
- Kleiner Appstart mit Ausgabenübersicht; Kundennamen, Magazinfilter, Kontakte, Aufträge und Formularkataloge erst beim Öffnen der betreffenden Ansicht. Bereits geladene Ansichten und Akten bleiben pro Browsersitzung im Speicher; ausdrückliches Aktualisieren lädt die aktuelle Ansicht neu.
- Direkte Bestandsprüfung einer Kunden-ID und gezieltes Laden ihrer Akte/Kommunikationsaufträge. Neue Eingaben und geänderte Ausgaben werden als bestätigte Einzeländerungen zurückgegeben. Keine globale Nachladung nach diesen freigegebenen Speicheraktionen.
- Kompakte serverseitige Projektionen für Kundennamen, Ausgabenübersicht, Testfirmenzuordnung und Kommunikationsaufträge. Einmaliger Aufbau aus bestehenden Daten beim ersten entsprechenden Klick; anschließende Pflege bei passenden Einzel-/Sammelschreibvorgängen. Keine Nutzdatenlöschung oder zusätzlichen Nachttrigger.
- D19 speichert unverändert angehakte Zuordnungen nicht erneut; neue/geänderte Zuordnungen behalten ihre serverseitige Eindeutigkeits- und Sync-Prüfung.

### Ausdrücklich erhalten / erläutert

- D07: Such-/Filterbedienung unverändert. Einfache Kundensuche verwendet Namen/IDs und läuft beim Tippen lokal. Bestehende vollständige Magazin-/Ansprechpartnerfilter werden bei Bedarf separat geladen.
- D08: Statusabfrage eines manuell gestarteten laufenden Syncs weiterhin alle fünf Sekunden in Datenabgleich. D09: vollständiger Abruf bei dessen Abschluss weiterhin vorhanden. D11: Freigabenspeicherung samt anschließendem vollständigem Abruf erhalten. D14: bisheriger HQ-Historienimport erhalten; gemeinsame Aktenöffnung profitiert vom neuen Lesepfad. D17 sowie Geschäfts-/Checkpoint-/Einzelprüfungs-/Bereinigungsregeln D20–D22 unverändert.

### Prüfung / Grenze

Im künstlichen Modell nach Aufbau: Start 2 Reads statt 3.221; Namensliste 1 Read und 0 pro Tastendruck; normale Akte 4 Reads plus zugehörige Jobs/Teile statt 3.193. Browsernachweis für null Leerlaufabrufe auf Mein Tag, Wiederöffnung aus Sitzungsspeicher und gezielte Speicherrückmeldungen. Einmaliger Modellaufbau: Ausgabenübersicht 26 Reads/1 Write, Namensliste 3.193 Reads/1 Write, kleine Kunden-Zuordnungsindizes 8 Reads/2 Writes. Zusätzliche Projektionen brauchen gezielte Pflegewrites. Keine Zusage echter Sekundenwerte oder heutiger Abrechnung. Keine neuen/geänderten Script Properties, Scopes, Zugriffsgruppen oder Ausführungsidentität. Nach allen 15 Prüfsuiten als Google-Version 31 bereitgestellt; Codegleichheit mit GitHub-Tag v0.20.0 bestätigt und in deployment.json zugeordnet. Live-Abnahme bleibt gesondert.

### Vorangegangene Untersuchung und Entscheidungen

- Entscheidungsliste D01–D22 für sparsamere Ladewege ergänzt; Nutzer entscheidet vor der Umsetzung. Auswirkungen auf Aktualität, vollständige Suche und sichere Wiederaufnahme ausdrücklich festgehalten.

- Firebase-Verbrauch und Performance des bestehenden r19.1-Stands vollständig untersucht; Auslöser, Zeitabstände, Reads/Writes, Sync- und Speicherprobleme in `docs/FIREBASE-VERBRAUCH-UND-PERFORMANCE.md` festgehalten.
- Reproduzierbare Offline-Zählung mit künstlichen Daten über `npm run audit:firestore` ergänzt. Keine Firebase-/HQ-Liveabfragen, keine produktive Appänderung und keine neue Google-Version.
- Nutzeranforderung bestätigt: bessere Grundperformance und wesentlich weniger Firebase-Zugriffe haben Vorrang. Die vorgeschlagene Optimierungsfolge ist noch nicht umgesetzt; Bestandsprüfung und Teamtest bleiben offen.

## [v0.19.1] – 2026-10-16

### Vorhandenen Google-Stand nachvollziehbar zugeordnet

- Bestehende Apps-Script-Version 30 mit Appkennung `2026-10-06-r19.1` als Git-Basis erfasst; keine erneute Google-Veröffentlichung.
- Bereits vorhandene lokale Einstieg-/Manifeständerungen mit Google abgeglichen und separat gesichert: Sales-App als Standardansicht, Benchmark über `?view=benchmark`, Ausführung als Bereitsteller und Zugriff Nur ich.
- Projektüberblick, Versionszuordnung, zentrale Prüfungen und Veröffentlichungs-/Vergleichsbefehle ergänzt.
- Zugangsdaten und lokale Sicherungen/Testausgaben vom Git-Upload ausgeschlossen.
- Nutzerauftrag für künftige `clasp`-Veröffentlichungen in den Projektregeln festgehalten.

### Prüfung und Grenzen

Codevergleich aller sieben Dateien mit Google-Version 30 und Editorstand erfolgreich. Alle 13 lokalen Prüfsuiten einschließlich Syntax-, Logik- und Browserprüfungen bestanden; neun Vergleichs-/Schutzprüfungen decken unter anderem nachträgliche Google-Änderungen ab. Abschlussnachweis im Projekttagebuch. Der schreibende Ablauf wird erstmals beim nächsten echten Apprelease verwendet. Bestehende Roadmap und noch ausstehende Live-Funktionstests bleiben erhalten. Keine Skripteigenschaften, Scopes oder Bereitstellungseinstellungen bei Google geändert.

Veröffentlichungsnachweis für v0.20.0: Google-Version 31; 2026-10-16T15:26:15.416Z. Details in deployment.json.

Veröffentlichungsnachweis für v0.21.0: Google-Version 32; 2026-10-17T21:25:58.165Z. Details in deployment.json.

Veröffentlichungsnachweis für v0.22.0: Google-Version 33; 2026-10-18T13:07:26.832Z. Details in deployment.json.

Veröffentlichungsnachweis für v0.23.0: Google-Version 34; 2026-10-22T20:18:08.329Z. Details in deployment.json.

Veröffentlichungsnachweis für v0.24.0: Google-Version 35; 2026-10-23T07:48:41.309Z. Details in deployment.json.

Veröffentlichungsnachweis für v0.25.0: Google-Version 36; 2026-10-23T08:14:48.233Z. Details in deployment.json.

Veröffentlichungsnachweis für v0.26.0: Google-Version 37; 2026-10-23T13:28:48.310Z. Details in deployment.json.

Veröffentlichungsnachweis für v0.26.1: Google-Version 38; 2026-10-23T13:54:32.486Z. Details in deployment.json.

Veröffentlichungsnachweis für v0.27.0: Google-Version 39; 2026-10-23T14:13:03.162Z. Details in deployment.json.

Veröffentlichungsnachweis für v0.27.1: Google-Version 40; 2026-10-23T14:57:36.280Z. Details in deployment.json.

Veröffentlichungsnachweis für v0.27.2: Google-Version 41; 2026-10-23T16:42:58.552Z. Details in deployment.json.

Veröffentlichungsnachweis für v0.27.3: Google-Version 42; 2026-10-27T09:10:54.273Z. Details in deployment.json.

Veröffentlichungsnachweis für v0.28.0: Google-Version 43; 2026-11-16T11:21:30.610Z. Details in deployment.json.

Veröffentlichungsnachweis für v0.28.1: Google-Version 44; 2026-11-16T14:47:08.109Z. Details in deployment.json.


Veröffentlichung v0.28.2: Apps-Script-Version 45, bestehende Bereitstellung beibehalten. Quellcommit bfede8abf29d01a7c37b8b6212d45d1b8b7c9b44. Alle 22 Prüfsuiten einschließlich 25 Auth-/Rechtefällen und Browserlogin mit blockiertem Geschäftslock bestanden. Nach verzögerter Google-Versionsanzeige feste Version45 und Editor lesend mit denselben Quelldateien verglichen; kein erneuter Upload und keine weitere Version erzeugt. Keine neuen Script Properties oder Zugriffs-/Ausführungseinstellungen. Echte erneute Benutzeranmeldung und HQ-Laufabschluss weiterhin offen. Zeitpunkt: 2026-11-16T15:09:51.599Z.

Veröffentlichungsnachweis für v0.28.3: Google-Version 46; 2026-11-16T15:27:06.964Z. Details in deployment.json.

Veröffentlichungsnachweis für v0.28.4: Google-Version 47; 2026-11-17T08:25:03.328Z. Details in deployment.json.

Veröffentlichungsnachweis für v0.29.0: Google-Version 48; 2026-11-17T11:59:13.272Z. Details in deployment.json.

Veröffentlichungsnachweis für v0.29.1: Google-Version 49; 2026-11-17T12:47:15.779Z. Details in deployment.json.
