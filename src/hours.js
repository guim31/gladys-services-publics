// -----------------------------------------------------------------------------
// Opening hours of the directory (`plage_ouverture`) and what they mean at a
// given instant: open or closed, until when, next opening.
//
// The directory gives ranges of days ("Lundi" to "Vendredi") with one or two
// slots of hours each, and a free comment. Read as follows:
//
//   - "00:00" to "23:59" is the whole day (police stations open 24/7);
//   - an end at "00:00" after a later start is midnight;
//   - "00:00" to "00:00" holds no hours (the point-justice put theirs in the
//     comment: "1er mardi du mois de 13h à 16h"), nor does an end before its
//     start: such a slot is dropped, never guessed;
//   - comments are never interpreted ("sur rendez-vous", "fermé le …"): they
//     are shown as they are, by the comment feature.
//
// Public holidays: the directory does not say. A service that opens on
// Sundays is taken as open on holidays too, any other one as closed, and the
// texts say it is an assumption.
// -----------------------------------------------------------------------------

import { addDays, localTime, weekdayOf } from './clock.js';
import { isHoliday } from './holidays.js';

export const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
// How far the next opening is searched: two weeks cover any weekly schedule
// and a run of holidays.
export const SEARCH_DAYS = 14;
const DAY = 1440;

const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);

const fold = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/** "08:30:00" → 510, or null. */
export function minutesOf(value) {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(value ?? '').trim());
  if (!match) {
    return null;
  }
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes <= DAY ? minutes : null;
}

/** One slot of the directory as `{ from, to }` in minutes, or null when it holds no hours. */
export function slotOf(start, end) {
  const from = minutesOf(start);
  let to = minutesOf(end);
  if (from === null || to === null) {
    return null;
  }
  if (to === 23 * 60 + 59 || (to === 0 && from > 0)) {
    to = DAY;
  }
  return to > from ? { from, to } : null;
}

/** Sorted slots, the overlapping or touching ones merged. */
function merge(slots) {
  const sorted = [...slots].sort((a, b) => a.from - b.from);
  const merged = [];
  for (const slot of sorted) {
    const last = merged.at(-1);
    if (last && slot.from <= last.to) {
      last.to = Math.max(last.to, slot.to);
    } else {
      merged.push({ ...slot });
    }
  }
  return merged;
}

/** A JSON text or an already parsed value; [] for anything else. */
export function jsonList(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * The weekly schedule of a record: `week[0..6]` (Monday first), each a list
 * of slots; null when the directory gives no usable hours.
 * @param {unknown} plages the `plage_ouverture` field
 */
export function parseSchedule(plages) {
  const week = DAYS.map(() => []);
  let usable = false;
  for (const plage of jsonList(plages)) {
    const first = DAYS.indexOf(fold(plage?.nom_jour_debut));
    const lastIndex = DAYS.indexOf(fold(plage?.nom_jour_fin));
    if (first < 0) {
      continue;
    }
    const last = lastIndex < 0 ? first : lastIndex;
    const slots = [
      slotOf(plage.valeur_heure_debut_1, plage.valeur_heure_fin_1),
      slotOf(plage.valeur_heure_debut_2, plage.valeur_heure_fin_2),
    ].filter(Boolean);
    if (slots.length === 0) {
      continue;
    }
    usable = true;
    // A range may wrap around the week ("Samedi" to "Lundi").
    for (let offset = 0; offset <= (last - first + 7) % 7; offset += 1) {
      week[(first + offset) % 7].push(...slots);
    }
  }
  return usable ? week.map(merge) : null;
}

/** The comments of a record: the general one first, then the ones of the ranges, deduplicated. */
export function commentsOf(record) {
  const all = [
    record?.commentaire_plage_ouverture,
    ...jsonList(record?.plage_ouverture).map((plage) => plage?.commentaire),
  ]
    .map((text) => String(text ?? '').trim())
    .filter(Boolean);
  return [...new Set(all)];
}

/**
 * The opening of one calendar day.
 * @returns {{ slots: {from:number,to:number}[], holiday: boolean, holidayClosed: boolean }}
 */
export function dayOf(week, date, department) {
  const slots = week[weekdayOf(date)];
  const holiday = isHoliday(date, department);
  const opensOnSundays = week[6].length > 0;
  if (holiday && !opensOnSundays && slots.length > 0) {
    return { slots: [], holiday, holidayClosed: true };
  }
  return { slots, holiday, holidayClosed: false };
}

/**
 * When an open slot really ends: a slot to midnight followed by one from
 * midnight goes on. `{ date, minutes }`, or null for a service that never
 * closes within the search window (open 24/7).
 */
function closingAfter(week, date, slot, department) {
  let day = date;
  let end = slot.to;
  for (let i = 0; i < SEARCH_DAYS; i += 1) {
    if (end < DAY) {
      return { date: day, minutes: end };
    }
    const next = addDays(day, 1);
    const first = dayOf(week, next, department).slots[0];
    if (!first || first.from > 0) {
      return { date: next, minutes: 0 };
    }
    day = next;
    end = first.to;
  }
  return null;
}

/**
 * The state of a schedule at an instant, in the service's time zone.
 * @param {Array|null} week from parseSchedule
 * @param {number} ms
 * @param {{ zone: string, department: string }} place
 * @returns {{
 *   known: boolean, open: boolean, minutesLeft: number|null,
 *   closing: { date: string, minutes: number }|null,
 *   next: { date: string, minutes: number, days: number }|null,
 *   today: { date: string, slots: object[], holiday: boolean, holidayClosed: boolean },
 * }}
 */
export function statusAt(week, ms, { zone, department }) {
  const { date, minutes } = localTime(ms, zone);
  if (!week) {
    return {
      known: false,
      open: false,
      minutesLeft: null,
      closing: null,
      next: null,
      today: { date, slots: [], holiday: isHoliday(date, department), holidayClosed: false },
    };
  }
  const today = { date, ...dayOf(week, date, department) };
  const current = today.slots.find(({ from, to }) => minutes >= from && minutes < to) ?? null;
  const closing = current ? closingAfter(week, date, current, department) : null;
  const minutesLeft = closing
    ? daysBetween(date, closing.date) * DAY + closing.minutes - minutes
    : null;
  // The next opening: after the current slot when open, none for a service
  // that never closes.
  let next = null;
  if (!current || closing) {
    const start = closing ?? { date, minutes };
    for (let offset = 0; offset <= SEARCH_DAYS && !next; offset += 1) {
      const day = addDays(start.date, offset);
      const slot = dayOf(week, day, department).slots.find(
        ({ from }) => offset > 0 || from >= start.minutes,
      );
      if (slot) {
        next = { date: day, minutes: slot.from, days: daysBetween(date, day) };
      }
    }
  }
  return { known: true, open: Boolean(current), minutesLeft, closing, next, today };
}
