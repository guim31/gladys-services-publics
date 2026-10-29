# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

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
