# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

## [1.1.0] - 2026-10-29

### Added

- Real-time waiting times of the town halls that publish them (Strasbourg:
  administrative centre and district town halls), chosen by name: one device
  per place with the wait in minutes (no value when closed) and open now from
  the city's feed. Your directory devices do not change.
- Scene trigger "Short wait": the wait of an open place goes under a threshold
  set in the configuration, time to go.
- The widget and the "Is it open?" sentence show the wait of these places.

## [1.0.0] - 2026-10-29

### Added

- The opening hours of the French public services of your communes, from the
  directory of the administration (Service-Public.fr): town hall, prefecture,
  gendarmerie, police station, CAF, CPAM, France services, France Travail, tax
  offices and more, chosen by INSEE code or commune name.
- One device per service added: open now, today's hours, next opening and the
  directory's comment, computed every minute in the time zone of the service,
  public holidays included (assumed closed unless the service opens on
  Sundays).
- Scene triggers: a service opens, closes, or closes in 30 minutes.
- Scene action "Is it open?": the services in a sentence, with the number open.
- Dashboard widget: one row per service, open until when or next opening.
- Texts and documentation in English, French, German and Spanish.

[Unreleased]: https://github.com/guim31/gladys-services-publics/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/guim31/gladys-services-publics/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/guim31/gladys-services-publics/releases/tag/v1.0.0
