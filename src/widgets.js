// -----------------------------------------------------------------------------
// Dashboard widget (manifest `widgets`, Gladys 5.1+).
//
// - services: the watched services, one status row each ("Mairie -
//   Toulouse" / "ouvert jusqu'à 18:00"), green when open, orange in the last
//   half-hour, red when closed, grey without hours. The hours can be hidden.
//   A place with a real-time waiting time shows it ("ouvert · 12 min
//   d'attente"): green under the threshold of the short_wait trigger, orange
//   above, red when closed, grey without live data.
//
// Budget of the core: 8 components, 2 texts, 1 status (10 rows).
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { clip } from './devices.js';
import { TEXT, say } from './messages.js';
import { CLOSING_SOON_MINUTES, WIDGET_KEY } from './service.js';

export const MAX_ROWS = 10;
const MAX_LABEL = 40;
// The minute clock: a row is never more than a minute behind.
const TTL_SECONDS = 60;

/** The color of a row. */
export function serviceColor(service, entry) {
  if (!entry) {
    return WIDGET_COLORS.NEUTRAL;
  }
  const view = service.view(entry);
  if (!view.known) {
    return WIDGET_COLORS.NEUTRAL;
  }
  if (!view.open) {
    return WIDGET_COLORS.DANGER;
  }
  return view.minutesLeft !== null && view.minutesLeft <= CLOSING_SOON_MINUTES
    ? WIDGET_COLORS.WARNING
    : WIDGET_COLORS.SUCCESS;
}

/** The color of a waiting-time row. */
export function waitColor(place, threshold) {
  if (!place?.live) {
    return WIDGET_COLORS.NEUTRAL;
  }
  if (!place.open) {
    return WIDGET_COLORS.DANGER;
  }
  return place.wait !== null && place.wait >= threshold
    ? WIDGET_COLORS.WARNING
    : WIDGET_COLORS.SUCCESS;
}

/** The status row of a device added: a service of the directory or a place. */
function rowOf(service, watched, language, hours) {
  if (watched.placeId) {
    const place = service.places.get(watched.placeId) ?? null;
    return {
      label: clip(watched.name || place?.name, MAX_LABEL),
      value: clip(service.waitText(place, language), 40),
      color: waitColor(place, service.config.waitThreshold),
    };
  }
  const entry = service.lookup(watched.deviceId)?.entry ?? null;
  return {
    // The name given in Gladys, not the directory's.
    label: clip(watched.name || entry?.record?.nom, MAX_LABEL),
    value: clip(service.shortText(entry, language, { hours }), 40),
    color: serviceColor(service, entry),
  };
}

async function servicesContent(service, { settings, language }) {
  await service.firstReading();
  const watched = service.everyWatched();
  const chosen = Array.isArray(settings?.services) ? settings.services.map(String) : [];
  const hours = settings?.show_hours !== false;
  const entries =
    chosen.length > 0
      ? chosen.map((id) => watched.find((entry) => entry.deviceId === id)).filter(Boolean)
      : watched;
  if (entries.length === 0) {
    const key = chosen.length > 0 ? 'gone' : 'pickService';
    return {
      ttl_seconds: TTL_SECONDS,
      components: [{ type: 'text', text: say(TEXT, language, key) }],
    };
  }
  return {
    ttl_seconds: TTL_SECONDS,
    components: [
      {
        type: 'status',
        items: entries
          .slice(0, MAX_ROWS)
          .map((watched) => rowOf(service, watched, language, hours)),
      },
    ],
  };
}

export const WIDGETS = {
  [WIDGET_KEY]: { get: servicesContent },
};
