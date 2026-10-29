// -----------------------------------------------------------------------------
// Scene actions (manifest `scene_actions`, Gladys 5.1+).
//
// - is_open: the watched services (all of them, or the ones picked) as a
//   sentence ready for a message or a speaker ("Mairie - Toulouse : ouvert
//   jusqu'à 18:00."), plus numbers for a "Continue only if" step.
//
// A scene action does not receive the user's language: the sentence follows
// the `language` of the configuration. Outputs are numbers, never booleans:
// the core's "Continue only if" compares with ===.
// -----------------------------------------------------------------------------

import { TEXT, say } from './messages.js';

export class SceneError extends Error {}

const chosenIds = (value) =>
  (Array.isArray(value) ? value : value ? [value] : []).map(String).filter(Boolean);

export const SCENE_ACTIONS = {
  async is_open(service, { fields }) {
    const language = service.config.language;
    // Asked right at start: the first reading, not "unknown".
    await service.firstReading();
    const watched = service.watched();
    if (watched.length === 0) {
      throw new SceneError(say(TEXT, language, 'noService'));
    }
    const asked = chosenIds(fields?.services);
    const chosen = asked.length > 0 ? watched.filter((w) => asked.includes(w.deviceId)) : watched;
    if (chosen.length === 0) {
      throw new SceneError(say(TEXT, language, 'gone'));
    }
    const sentences = [];
    let open = 0;
    let count = 0;
    for (const watchedService of chosen) {
      const found = service.lookup(watchedService.deviceId);
      if (!found?.entry) {
        continue;
      }
      count += 1;
      sentences.push(service.sentence(found.entry, watchedService.name, language));
      if (service.view(found.entry, language).open) {
        open += 1;
      }
    }
    return { sentence: sentences.join(' '), open_count: open, services_count: count };
  },
};
