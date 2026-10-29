# Horaires des services publics

Die **Öffnungszeiten der Behörden deiner französischen Gemeinde** (Rathaus, Präfektur und
Unterpräfektur, Gendarmerie, Polizeikommissariat, CAF, CPAM, France services, France Travail,
Finanzämter…) aus dem **Verzeichnis der französischen Verwaltung** von Service-Public.fr (DILA).
**Kein Konto, kein Schlüssel.**

> Die Zeiten sind **unverbindlich**: es sind die, die das Verzeichnis veröffentlicht. Frag beim
> Dienst nach, bevor du hingehst, vor allem an einem Feiertag oder in den Schulferien.

Inoffizielle Integration, ohne Verbindung zur DILA oder zu den genannten Diensten. Getestet mit
den echten Antworten des Verzeichnisses (Toulouse und Fonsorbes, 29.10.2026), noch nicht in einer
echten Gladys-Instanz: Rückmeldungen sind willkommen.

## Was du bekommst

- Ein **Gerät pro Dienst**, den du hinzufügst: jetzt geöffnet oder nicht, heutige Zeiten, nächste
  Öffnung, der Hinweis des Verzeichnisses („sur rendez-vous“, „fermé le …“), unverändert angezeigt.
- Ein **Widget** „Öffentliche Dienste“: deine Dienste je in einer Zeile, grün wenn geöffnet, orange
  in der letzten halben Stunde, rot wenn geschlossen.
- Drei **Szenen-Auslöser**: ein Dienst öffnet, ein Dienst schließt, ein Dienst schließt in
  30 Minuten.
- Eine **Szenen-Aktion** „Ist es geöffnet?“: deine Dienste in einem Satz, mit der Schließzeit oder
  der nächsten Öffnung.

## Voraussetzungen

- Gladys Assistant **5.3.0** oder neuer.
- Internetzugang für Gladys: das Verzeichnis und geo.api.gouv.fr sind öffentliche APIs.
- Kein Konto, kein API-Schlüssel.

## Installation

1. Öffne in Gladys **Integrationen → Von GitHub installieren**.
2. Füge `https://github.com/guim31/gladys-services-publics` ein und bestätige.
3. Öffne die Integration nach der Installation, um sie einzurichten.

## Konfiguration

### Einstellungen

| Einstellung                     | Zweck                                                                                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gemeinden                       | INSEE-Codes oder Namen, durch Kommas getrennt (höchstens 5): `31555, Fonsorbes`.                                                                                                 |
| Diensttypen                     | Die angebotenen Typen. Standard: Rathaus, Präfektur, Unterpräfektur, Gendarmerie, Polizeikommissariat, CAF, CPAM, France services, France Travail, Finanzamt für Privatpersonen. |
| Abfrage des Verzeichnisses      | Alle 6 Stunden, alle 12 Stunden (Standard) oder einmal am Tag.                                                                                                                   |
| Sprache der Namen und Meldungen | Sprache der Funktionen, des Widgets und der Szenen-Aktion (standardmäßig Französisch).                                                                                           |

Ein Name, den mehrere Gemeinden tragen, meint die einwohnerstärkste: die Aktion **Status** sagt
es, und der INSEE-Code (auf der Seite der Gemeinde, etwa auf der Website des Insee) klärt es.

Eine Postleitzahl statt des INSEE-Codes wird ebenfalls erkannt, außer sie ist der INSEE-Code einer anderen Gemeinde: die Aktion **Status** zeigt die verwendete Gemeinde. Für **Paris, Lyon und Marseille**
werden auch die Dienste der Arrondissements gesucht.

### Dienste hinzufügen

1. Gib deine Gemeinden ein, kreuze die Diensttypen an, speichere.
2. Öffne den Tab **Entdecken** der Integration: die Dienste in diesen Gemeinden und die, deren
   Bereich sie abdeckt (etwa die Gendarmerie der Nachbarstadt), werden aufgelistet.
3. Füge die gewünschten zu Gladys hinzu.

Ein hinzugefügter Dienst bleibt verfolgt, auch wenn du seine Gemeinde später aus den
Einstellungen entfernst. Deine CAF oder CPAM ist in der nahen Großstadt? Füge diese Stadt zu den
Gemeinden hinzu.

### Prüfen

Die Aktion **Status** auf der Seite der Integration zeigt die gefundenen Gemeinden, die Zahl der
angebotenen Dienste, die letzte Abfrage des Verzeichnisses und den letzten Fehler.

## Geräte

Jeder hinzugefügte Dienst wird ein schreibgeschütztes Gerät mit vier Funktionen:

| Funktion               | Typ            | Inhalt                                                                               |
| ---------------------- | -------------- | ------------------------------------------------------------------------------------ |
| Jetzt geöffnet         | binär (1 = ja) | Jede Minute berechnet. Kein Wert, wenn das Verzeichnis keine Zeiten angibt.          |
| Heutige Öffnungszeiten | Text           | `08:30–12:00, 13:30–18:00`, „Heute geschlossen“, „Feiertag: vermutlich geschlossen“… |
| Nächste Öffnung        | Text           | „heute um 13:30“, „morgen um 08:30“, „Montag um 08:30“, „rund um die Uhr geöffnet“.  |
| Hinweis                | Text           | Die Bemerkungen des Verzeichnisses, unverändert (auf Französisch).                   |

Die Zeiten werden in der Zeitzone des Dienstes gelesen (Paris im Mutterland, Ortszeit in Übersee).

## Dashboard-Widget

Das Widget **Öffentliche Dienste** zeigt eine Zeile pro verfolgtem Dienst (höchstens 10), unter
dem Namen, den du ihm in Gladys gegeben hast: „geöffnet bis 18:00“, „schließt in 20 Min.“,
„geschlossen · öffnet Mo. 08:30“. Einstellungen: die angezeigten Dienste (leer: alle) und ob die
Uhrzeiten angezeigt werden.

## Szenen-Auslöser

| Auslöser                          | Variablen                                       |
| --------------------------------- | ----------------------------------------------- |
| Ein Dienst öffnet                 | Dienst, Schließzeit                             |
| Ein Dienst schließt               | Dienst, nächste Öffnung                         |
| Ein Dienst schließt in 30 Minuten | Dienst, Schließzeit, Minuten bis zur Schließung |

Jeder Auslöser lässt sich auf bestimmte Dienste beschränken. Die Auslöser folgen den Zeiten des
Verzeichnisses: beim Start und nach einer Unterbrechung von mehr als fünf Minuten wird nichts
ausgelöst.

## Szenen-Aktion

**Ist es geöffnet?** gibt einen Satz pro gewähltem Dienst zurück (leer: alle): „…: geöffnet bis
12:00.“, „…: geschlossen, öffnet morgen um 08:30.“. Ausgaben: `sentence`, `open_count` (geöffnete
Dienste) und `services_count`, nutzbar in „Nur fortfahren, wenn“.

## Szenen-Beispiele

- Jeden Morgen um 8 Uhr „Ist es geöffnet?“ für das Rathaus und die CAF per Telegram schicken.
- Wenn die CPAM in 30 Minuten schließt und jemand zu Hause ist, es über den Lautsprecher sagen.
- Ein Knopf „ich gehe zum Rathaus“: nur fortfahren, wenn `open_count` gleich 1 ist.

## Daten und Aktualisierung

- **Verzeichnis der Verwaltung** (Service-Public.fr, DILA), öffentliche Opendatasoft-API, ohne
  Schlüssel, unter der Licence Ouverte. Die Integration fragt nur die nötigen Felder ab (Name, Typ,
  Gemeinde, Zeiten, Hinweis, Adresse, Telefon, Link): nie die Namen der Verantwortlichen.
- **geo.api.gouv.fr** (DINUM) wandelt einen Gemeindenamen in den INSEE-Code um, einmal pro Start.
- Das Verzeichnis wird standardmäßig alle 12 Stunden gelesen: eine Anfrage pro Gemeinde (zwei oder
  drei für eine Großstadt), plus eine für die verfolgten Dienste außerhalb deiner Gemeinden.
  Geöffnet oder geschlossen wird dann jede Minute berechnet, ohne Anfrage.
- Nach einem Fehler folgt ein neuer Versuch nach 15 Minuten; die schon gelesenen Zeiten bleiben in
  Gebrauch.

## Fehlerbehebung

- **Kein Dienst in Entdecken**: sieh dir die Aktion Status an (Gemeinde nicht gefunden? kein Typ
  angekreuzt?). Manche kleinen Gemeinden haben nur ihr Rathaus im Verzeichnis.
- **„Keine Öffnungszeiten im Verzeichnis“**: der Dienst veröffentlicht keine Zeiten (viele
  Gendarmerie-Brigaden) oder nur im Hinweis. Der Zustand „geöffnet“ bleibt dann leer.
- **Die falsche Gemeinde**: gib ihren INSEE-Code statt ihres Namens ein.
- Ausführliche Protokolle: Variable `LOG_LEVEL=debug`.

## Einschränkungen

- **Feiertage**: das Verzeichnis sagt nichts dazu. Ein Dienst, der sonntags öffnet, gilt als
  geöffnet, jeder andere als geschlossen, und die Texte sagen es. Die Feiertage von
  Elsass-Mosel und der Überseedepartements werden berücksichtigt.
- **Hinweise werden nicht ausgewertet**: „fermé le 24 décembre“ oder „sur rendez-vous“ ändern den
  Zustand „geöffnet“ nicht, sie stehen im Hinweis.
- Zeitfenster ohne verwertbare Zeiten („00:00 bis 00:00“) werden ignoriert, nie erraten.
- Schulferien und außergewöhnliche Schließungen sind nur bekannt, wenn das Verzeichnis sie
  veröffentlicht.
- **Die Zeitfenster des Verzeichnisses addieren sich**: gibt es zwei für denselben Tag (offener
  Empfang und Termin, zum Beispiel), gilt der Dienst in beiden als geöffnet.
- In **Neukaledonien, Französisch-Polynesien und Wallis und Futuna** wird kein Feiertag angenommen
  (sie haben eigene); die lokale Zeitzone wird verwendet.

## Danksagung

- Daten: [Verzeichnis der Verwaltung](https://api-lannuaire.service-public.fr), Direction de
  l'information légale et administrative (DILA), Licence Ouverte 2.0.
- Gemeinden: [geo.api.gouv.fr](https://geo.api.gouv.fr), DINUM, Licence Ouverte 2.0.
- Feiertage: dieselben Regeln wie [gladys-holidays](https://github.com/guim31/gladys-holidays)
  (date-holidays), hier ohne Abhängigkeit neu geschrieben.
