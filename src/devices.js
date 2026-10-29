// -----------------------------------------------------------------------------
// The Gladys device of a public service and its states:
//
//   open     input/binary   1 = open now (no state when the directory has no hours)
//   hours    text/text      today's hours, "Closed today", "Public holiday…"
//   next     text/text      next opening ("tomorrow at 08:30")
//   comment  text/text      the directory's comments, as they are
//
// Read-only, no polling: the integration computes open or closed every minute
// on its own timer (src/service.js), Gladys never polls (`should_poll: false`).
// Every service has the four features, whatever its hours, so that hours
// published later do not change the structure of the device.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as C,
  DEVICE_FEATURE_TYPES as T,
} from '@gladysassistant/integration-sdk';
import { NAMES } from './messages.js';

export const SERVICE_TYPE = 'service';
export const FEATURE_KEYS = ['open', 'hours', 'next', 'comment'];
export const MAX_DEVICE_NAME = 100;
export const MAX_TEXT = 500;

/** Shortens a text to `max` characters, with an ellipsis. */
export function clip(text, max) {
  const value = String(text ?? '');
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

/**
 * A shorter name for the long official ones: "Caisse d'allocations
 * familiales (Caf) de Haute-Garonne - accueil de Toulouse - Empalot" becomes
 * "Caf de Haute-Garonne - accueil de Toulouse - Empalot". The words before an
 * acronym in brackets are replaced by it; the place, which tells two agencies
 * apart, is kept.
 */
export function shortName(name) {
  return String(name ?? '')
    .replace(/^[^()]{12,}? \(([A-Z][A-Za-z]{1,9})\)/, '$1')
    .replace(
      /^Mission locale pour l'insertion professionnelle et sociale des jeunes \(16-25 ans\)/i,
      'Mission locale',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/** The external ids of a service, from the directory's id (a UUID, stable). */
export const idsOf = (gladys, serviceId) => gladys.externalIds(SERVICE_TYPE, serviceId);

/**
 * The device of a service.
 * @param {object} gladys
 * @param {object} record a directory record
 * @param {{ commune: string, type: string, language: string }} options
 */
export function buildServiceDevice(gladys, record, { commune, type, language }) {
  const ids = idsOf(gladys, record.id);
  const names = NAMES[language] ?? NAMES.en;
  const text = { category: C.TEXT, type: T.TEXT.TEXT, min: 0, max: 0 };
  const definitions = {
    open: { category: C.INPUT, type: T.SENSOR.BINARY, min: 0, max: 1 },
    hours: text,
    next: text,
    comment: text,
  };
  return {
    name: clip(shortName(record.nom) || record.id, MAX_DEVICE_NAME),
    external_id: ids.device,
    should_poll: false,
    params: [
      { name: 'service_id', value: record.id },
      { name: 'commune', value: commune },
      { name: 'type', value: type },
    ],
    features: FEATURE_KEYS.map((key) => ({
      name: names[key],
      external_id: ids.feature(key),
      ...definitions[key],
      read_only: true,
      has_feedback: false,
    })),
  };
}

/**
 * The states of a service device from its view (src/service.js): the open
 * state only when the hours are known, texts never empty.
 */
export function serviceStates(gladys, serviceId, view) {
  const ids = idsOf(gladys, serviceId);
  const states = [];
  if (view.known) {
    states.push({ device_feature_external_id: ids.feature('open'), state: view.open ? 1 : 0 });
  }
  for (const key of ['hours', 'next', 'comment']) {
    states.push({ device_feature_external_id: ids.feature(key), text: clip(view[key], MAX_TEXT) });
  }
  return states;
}
