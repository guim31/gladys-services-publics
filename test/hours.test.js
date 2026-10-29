// -----------------------------------------------------------------------------
// Hours of the directory, public holidays and time zones, without the SDK:
// the cases met in the capture of Toulouse (24/7 police stations, the
// point-justice with "00:00" to "00:00" and their hours in the comment).
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localTime } from '../src/clock.js';
import { departmentOf, easter, holidaysOf, isHoliday } from '../src/holidays.js';
import { commentsOf, parseSchedule, slotOf, statusAt } from '../src/hours.js';
import { paris } from './helpers/world.js';

const plage = (debut, fin, h1, h2, h3 = '', h4 = '', commentaire = '') => ({
  nom_jour_debut: debut,
  nom_jour_fin: fin,
  valeur_heure_debut_1: h1,
  valeur_heure_fin_1: h2,
  valeur_heure_debut_2: h3,
  valeur_heure_fin_2: h4,
  commentaire,
});
const TOULOUSE = { zone: 'Europe/Paris', department: '31' };
// Mairie - Fonsorbes, as in the capture.
const MAIRIE = JSON.stringify([
  plage('Lundi', 'Jeudi', '08:30:00', '12:00:00', '13:30:00', '18:00:00'),
  plage('Vendredi', 'Vendredi', '08:30:00', '12:00:00', '13:30:00', '17:30:00'),
]);

test('a slot: whole day, midnight end, and the slots that hold no hours', () => {
  assert.deepEqual(slotOf('08:30:00', '12:00:00'), { from: 510, to: 720 });
  assert.deepEqual(slotOf('00:00:00', '23:59:00'), { from: 0, to: 1440 });
  assert.deepEqual(slotOf('18:00:00', '00:00:00'), { from: 1080, to: 1440 });
  assert.equal(slotOf('00:00:00', '00:00:00'), null);
  assert.equal(slotOf('14:00:00', '09:00:00'), null);
  assert.equal(slotOf('', ''), null);
  assert.equal(slotOf('8h30', '12h'), null);
});

test('a schedule: ranges of days, two slots, a week wrap, and nothing guessed', () => {
  const week = parseSchedule(MAIRIE);
  assert.deepEqual(week[0], [
    { from: 510, to: 720 },
    { from: 810, to: 1080 },
  ]);
  assert.deepEqual(week[4][1], { from: 810, to: 1050 });
  assert.deepEqual(week[5], []);
  const wrap = parseSchedule([plage('Samedi', 'Lundi', '10:00:00', '12:00:00')]);
  assert.deepEqual(
    wrap.map((day) => day.length),
    [1, 0, 0, 0, 0, 1, 1],
  );
  // The point-justice of Toulouse: hours only in the comment.
  const comment = [
    plage('Lundi', 'Dimanche', '00:00:00', '00:00:00', '', '', 'Avocat - 1er mardi du mois'),
  ];
  assert.equal(parseSchedule(JSON.stringify(comment)), null);
  assert.equal(parseSchedule(null), null);
  assert.equal(parseSchedule('not json'), null);
});

test('the comments are kept as they are, the general one first, without duplicates', () => {
  const record = {
    commentaire_plage_ouverture: 'Uniquement sur rendez-vous.',
    plage_ouverture: JSON.stringify([
      plage('Lundi', 'Jeudi', '08:30:00', '12:00:00', '', '', 'Fermé le 24 décembre.'),
      plage('Vendredi', 'Vendredi', '08:30:00', '12:00:00', '', '', 'Fermé le 24 décembre.'),
    ]),
  };
  assert.deepEqual(commentsOf(record), ['Uniquement sur rendez-vous.', 'Fermé le 24 décembre.']);
});

test('open, closing and the next opening of a town hall over a day', () => {
  const week = parseSchedule(MAIRIE);
  // Thursday 2026-10-29.
  const morning = statusAt(week, paris('2026-10-29 07:00'), TOULOUSE);
  assert.equal(morning.open, false);
  assert.deepEqual(morning.next, { date: '2026-10-29', minutes: 510, days: 0 });
  const open = statusAt(week, paris('2026-10-29 11:45'), TOULOUSE);
  assert.equal(open.open, true);
  assert.equal(open.minutesLeft, 15);
  assert.deepEqual(open.closing, { date: '2026-10-29', minutes: 720 });
  assert.deepEqual(open.next, { date: '2026-10-29', minutes: 810, days: 0 });
  const evening = statusAt(week, paris('2026-10-29 18:00'), TOULOUSE);
  assert.equal(evening.open, false);
  assert.deepEqual(evening.next, { date: '2026-10-30', minutes: 510, days: 1 });
  // Friday evening: Monday morning.
  const weekend = statusAt(week, paris('2026-10-30 17:30'), TOULOUSE);
  assert.deepEqual(weekend.next, { date: '2026-11-02', minutes: 510, days: 3 });
});

test('a 24/7 service never closes, a public holiday closes the others (assumed)', () => {
  const always = parseSchedule([plage('Lundi', 'Dimanche', '00:00:00', '23:59:00')]);
  const now = statusAt(always, paris('2026-11-11 03:00'), TOULOUSE);
  assert.equal(now.open, true);
  assert.equal(now.closing, null);
  assert.equal(now.next, null);
  assert.equal(now.today.holiday, true);
  assert.equal(now.today.holidayClosed, false);

  // Wednesday 11 November 2026, Armistice Day.
  const mairie = statusAt(parseSchedule(MAIRIE), paris('2026-11-11 10:00'), TOULOUSE);
  assert.equal(mairie.open, false);
  assert.equal(mairie.today.holidayClosed, true);
  assert.deepEqual(mairie.next, { date: '2026-11-12', minutes: 510, days: 1 });
});

test('a schedule from midnight: open across days, closing found on the next day', () => {
  const week = parseSchedule([
    plage('Lundi', 'Lundi', '20:00:00', '00:00:00'),
    plage('Mardi', 'Mardi', '00:00:00', '02:00:00'),
  ]);
  const status = statusAt(week, paris('2026-11-02 23:00'), TOULOUSE);
  assert.equal(status.open, true);
  assert.deepEqual(status.closing, { date: '2026-11-03', minutes: 120 });
  assert.equal(status.minutesLeft, 180);
});

test('hours are read in the time zone of the service, summer time included', () => {
  const week = parseSchedule(MAIRIE);
  // 05:00 UTC: 09:00 in Réunion (UTC+4), 06:00 in Paris in winter.
  const at = Date.UTC(2026, 9, 29, 5, 0);
  assert.equal(statusAt(week, at, { zone: 'Indian/Reunion', department: '974' }).open, true);
  assert.equal(statusAt(week, at, TOULOUSE).open, false);
  // Summer: 06:45 UTC is 08:45 in Paris.
  assert.equal(statusAt(week, Date.UTC(2026, 5, 4, 6, 45), TOULOUSE).open, true);
  assert.deepEqual(localTime(Date.UTC(2026, 2, 29, 1, 0), 'Europe/Paris'), {
    date: '2026-03-29',
    minutes: 180,
  });
});

test('French public holidays: national, Alsace-Moselle, overseas', () => {
  assert.equal(easter(2026), '2026-04-05');
  assert.equal(easter(2027), '2027-03-28');
  const national = holidaysOf(2026, '31');
  assert.equal(national.size, 11);
  for (const day of ['2026-01-01', '2026-04-06', '2026-05-14', '2026-05-25', '2026-11-11']) {
    assert.ok(national.has(day), day);
  }
  assert.ok(!national.has('2026-04-03'));
  assert.ok(isHoliday('2026-04-03', '67'), 'Good Friday in Alsace');
  assert.ok(isHoliday('2026-12-26', '57'), "St Stephen's Day in Moselle");
  assert.ok(isHoliday('2026-12-20', '974'), 'abolition of slavery in Réunion');
  assert.ok(!isHoliday('2026-12-20', '31'));
  assert.equal(departmentOf('97411'), '974');
  assert.equal(departmentOf('2A004'), '2A');
  assert.equal(departmentOf('31555'), '31');
});

test('the Pacific collectivities: their own time zone, no metropolitan holiday assumed', async () => {
  const { zoneOfCommune } = await import('../src/clock.js');
  assert.equal(departmentOf('98818'), '988');
  assert.equal(zoneOfCommune('98818', '988'), 'Pacific/Noumea');
  assert.equal(zoneOfCommune('98735', '987'), 'Pacific/Tahiti');
  assert.equal(zoneOfCommune('98723', '987'), 'Pacific/Marquesas');
  assert.equal(holidaysOf(2026, '988').size, 0);
  // 21:00 UTC on Wednesday 28 October is 08:00 on Thursday in Nouméa (UTC+11).
  const week = parseSchedule([plage('Lundi', 'Vendredi', '07:30:00', '11:30:00')]);
  const status = statusAt(week, Date.UTC(2026, 9, 28, 21, 0), {
    zone: 'Pacific/Noumea',
    department: '988',
  });
  assert.equal(status.open, true);
  assert.equal(status.today.date, '2026-10-29');
});
