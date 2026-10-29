// -----------------------------------------------------------------------------
// Real-time waiting times of the town halls that publish them, without a key.
//
// One source today: Strasbourg (data.strasbourg.eu, Opendatasoft v2.1), its
// administrative centre and its district town halls. Checked live on
// 2026-10-29; no other French city, prefecture or CAF publishes a live feed
// in open data at that date. A new city is one more entry of WAIT_SOURCES.
//
// The feed gives, per place: `sigid` (stable id), `name`, `realtimestatus`
// (OPEN/CLOSED), `averagewaitingtime` (minutes, null when closed) and
// `updatedate` (local time of the city, no offset).
// -----------------------------------------------------------------------------

import { localTime } from './clock.js';
import { getJson } from './http.js';

export const WAIT_SOURCES = [
  {
    id: 'strasbourg',
    city: 'Strasbourg',
    zone: 'Europe/Paris',
    records:
      'https://data.strasbourg.eu/api/explore/v2.1/catalog/datasets/duree-dattente-aux-mairies-en-temps-reel/records',
  },
];

// A place whose last update is older than this is not live any more: no
// value rather than a stale one.
export const STALE_MS = 30 * 60 * 1000;
const MAX_BODY_BYTES = 1e6;

export const urlOfSource = (source) =>
  `${source.records}?${new URLSearchParams({
    select: 'sigid,name,realtimestatus,averagewaitingtime,updatedate',
    limit: '100',
  })}`;

export const fold = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();

/** "2026-10-29 21:18:22", wall-clock time in `zone`, as an instant (null if unreadable). */
export function instantOf(text, zone) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(text ?? ''));
  if (!m) {
    return null;
  }
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0));
  const local = localTime(asUtc, zone);
  const offset = Date.parse(`${local.date}T00:00:00Z`) + local.minutes * 60000 - asUtc;
  // The seconds are lost by localTime: the offset is whole minutes.
  return asUtc - Math.round(offset / 60000) * 60000;
}

/**
 * The places of a source at `now`: `{ id, source, city, name, live, open, wait }`.
 * `live` false (stale or unreadable): open and wait null. `wait` only when open.
 */
export function placesOf(source, document, now) {
  const places = [];
  for (const record of Array.isArray(document?.results) ? document.results : []) {
    const sigid = String(record?.sigid ?? '').trim();
    if (!/^[\w-]{1,40}$/.test(sigid)) {
      continue;
    }
    const updated = instantOf(record.updatedate, source.zone);
    const status = String(record.realtimestatus ?? '').toUpperCase();
    const live =
      updated !== null && now - updated <= STALE_MS && (status === 'OPEN' || status === 'CLOSED');
    const open = live ? status === 'OPEN' : null;
    const minutes = Number(record.averagewaitingtime);
    const wait =
      open && record.averagewaitingtime !== null && Number.isFinite(minutes) && minutes >= 0
        ? Math.round(minutes)
        : null;
    places.push({
      id: `${source.id}-${sigid}`,
      source: source.id,
      city: source.city,
      name: String(record.name ?? '').trim() || sigid,
      live,
      open,
      wait,
    });
  }
  return places;
}

/** Every place of every source: `{ places, failure }` (the places of the sources read). */
export async function readPlaces(fetch, now) {
  const places = [];
  let failure = null;
  for (const source of WAIT_SOURCES) {
    try {
      const document = await getJson(fetch, urlOfSource(source), { maxBytes: MAX_BODY_BYTES });
      places.push(...placesOf(source, document, now));
    } catch (err) {
      failure ??= err;
    }
  }
  return { places, failure };
}

/**
 * Does a query of the configuration pick a place: part of its name, or the
 * name of its city (every place of it).
 */
export function matches(query, place) {
  const wanted = fold(query);
  if (wanted.length < 3) {
    return false;
  }
  return wanted === fold(place.city) || fold(place.name).includes(wanted);
}
