# Gladys Public services opening hours

External integration for [Gladys Assistant](https://gladysassistant.com): the
**opening hours of the French public services of your commune** (town hall,
prefecture, gendarmerie, police station, CAF, CPAM, France services, France
Travail, tax offices…) from the **directory of the French administration** of
Service-Public.fr (DILA). **No account, no key.**

Hours are indicative: they are the ones the directory publishes, check with the
service. Unofficial: not affiliated with the DILA nor with the services listed.
Tested against the real answers of the directory (2026-10-29), not yet on many
Gladys installations: feedback welcome.

User documentation: [English](docs/en.md) · [français](docs/fr.md) ·
[Deutsch](docs/de.md) · [español](docs/es.md).

## What you get in Gladys

- One read-only device per service you add: open now, today's hours, next
  opening, and the directory's comment shown as it is.
- A dashboard widget: one row per service, open until when or next opening.
- Scene triggers: a service opens, closes, or closes in 30 minutes.
- A scene action, "Is it open?": your services in a sentence ready to send.

## Requirements

- Gladys Assistant 5.3.0 or later, with Internet access.

## Installation

In Gladys, **Integrations → Install from GitHub**, then paste
`https://github.com/guim31/gladys-services-publics`. Type your communes (INSEE
codes or names) in the Configuration tab, tick the types of service, save, and
add your services from the Discover tab.

## How it works

| Source                                                       | Used for                                        |
| ------------------------------------------------------------ | ----------------------------------------------- |
| api-lannuaire.service-public.fr (DILA, Opendatasoft, no key) | services of a commune or covering it, and hours |
| geo.api.gouv.fr (DINUM, no key)                              | a commune name turned into its INSEE code       |

The directory is read every 6, 12 (default) or 24 hours: one request per
commune (a few for a big city) and one for the watched services outside them.
Open or closed is then computed every minute from the hours kept, in the time
zone of the service, without any request. Public holidays are computed offline
(national days, Alsace-Moselle, overseas departments).

## Limitations

- The directory says nothing about public holidays: a service that opens on
  Sundays is assumed open, any other one closed, and the texts say so.
- Comments ("sur rendez-vous", "fermé le …") are shown, never interpreted.
- Many gendarmerie brigades publish no hours: no open state then.

## Development

```bash
npm install
npm test               # node --test, no network access
npm run lint           # ESLint
npm run format:check   # Prettier, as the CI runs it
npx github:GladysAssistant/integration-store .   # store admission checks
```

See [CLAUDE.md](CLAUDE.md) for the architecture and the conventions. The test
fixtures (`test/fixtures/api`) are the real answers of the directory and of
geo.api.gouv.fr for Toulouse and Fonsorbes, captured on 2026-10-29.

## Credits

- Data: directory of the administration (Service-Public.fr), Direction de
  l'information légale et administrative, and geo.api.gouv.fr, DINUM, both
  under the Licence Ouverte 2.0 (Etalab).
- Public holidays: same rules as
  [gladys-holidays](https://github.com/guim31/gladys-holidays) (date-holidays).
- Structure shared with [gladys-piscines](https://github.com/guim31/gladys-piscines).
- Built from the official
  [integration template](https://github.com/GladysAssistant/integration-template-js).

## License

[Apache 2.0](LICENSE).
