// -----------------------------------------------------------------------------
// Real-time waiting times, against the real feed of Strasbourg captured on
// 2026-10-29 at 21:20 (every place closed: the evening). The open cases are
// that capture with its status, wait and update time changed.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { WAIT_SOURCES, instantOf, matches, placesOf } from '../src/attente.js';
import { localTime } from '../src/clock.js';
import { normalizeConfig } from '../src/config.js';
import { TRIGGERS, WAIT_COOLDOWN_MS, WAIT_READ_MS } from '../src/service.js';
import {
  action,
  captureLogs,
  create,
  createWorld,
  featureId,
  fixtureJson,
  paris,
  setRecords,
  urlOf,
} from './helpers/world.js';

const FILE = 'strasbourg-attente.json';
const STRASBOURG = WAIT_SOURCES[0];
const CRONENBOURG = '464_SPC_40';
const CENTRE = '462_SPC_38';

const lastState = (world, device, key) => {
  const id = featureId(device, key);
  return world.fake.states.filter((s) => s.device_feature_external_id === id).at(-1)?.state;
};
const fired = (world) => world.fake.sceneEvents.filter((e) => e.key === TRIGGERS.SHORT_WAIT);

/** "2026-10-29 10:59:00", the feed's form of an instant (Paris time). */
function stamp(ms) {
  const { date, minutes } = localTime(ms, 'Europe/Paris');
  const pad = (n) => String(n).padStart(2, '0');
  return `${date} ${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00`;
}

/** The feed, updated a minute ago: `waits[sigid]` a number (open), or null (closed). */
function feed(world, waits) {
  setRecords(
    world,
    FILE,
    () => true,
    (record) => {
      const wait = waits[record.sigid];
      return {
        updatedate: stamp(world.clock.time - 60000),
        realtimestatus: wait === undefined || wait === null ? 'CLOSED' : 'OPEN',
        averagewaitingtime: wait ?? null,
      };
    },
  );
}

/** Two minutes later, a new reading of the feed. */
async function reading(world, waits) {
  world.clock.advance(WAIT_READ_MS);
  feed(world, waits);
  await world.service.waitCycle();
}

async function strasbourg(config = {}) {
  const world = await createWorld({
    config: { communes: '31187', wait_places: 'Cronenbourg, centre administratif', ...config },
  });
  world.clock.time = paris('2026-10-29 10:00');
  feed(world, { [CRONENBOURG]: 12, [CENTRE]: 25 });
  await world.service.waitCycle();
  return world;
}

test('the real capture: nine places, closed, no wait; stale the next morning', () => {
  const document = fixtureJson(FILE);
  const evening = placesOf(STRASBOURG, document, paris('2026-10-29 21:25'));
  assert.equal(evening.length, 9);
  for (const place of evening) {
    assert.equal(place.live, true, place.name);
    assert.equal(place.open, false);
    assert.equal(place.wait, null);
    assert.match(place.id, /^strasbourg-\d+_SPC_\d+$/);
  }
  const morning = placesOf(STRASBOURG, document, paris('2026-10-30 09:00'));
  assert.ok(morning.every((place) => !place.live && place.open === null && place.wait === null));
});

test('the update time is the local time of the city, summer and winter', () => {
  assert.equal(instantOf('2026-10-29 21:18:22', 'Europe/Paris'), Date.UTC(2026, 9, 29, 20, 18, 22));
  assert.equal(instantOf('2026-07-01 12:00:00', 'Europe/Paris'), Date.UTC(2026, 6, 1, 10, 0, 0));
  assert.equal(instantOf('2026-10-29 21:18:59', 'Europe/Paris'), Date.UTC(2026, 9, 29, 20, 18, 59));
  assert.equal(instantOf('soon', 'Europe/Paris'), null);
});

test('a place gone from the feed is no longer live', async (t) => {
  const world = await strasbourg();
  t.after(() => world.app.stop());
  const url = urlOf(FILE);
  const document = structuredClone(world.network.routes[url]);
  document.results = document.results.filter((record) => record.sigid !== CRONENBOURG);
  world.network.routes[url] = document;
  world.clock.advance(WAIT_READ_MS);
  await world.service.waitCycle();
  const place = world.service.places.get(`strasbourg-${CRONENBOURG}`);
  assert.deepEqual([place.live, place.open, place.wait], [false, null, null]);
  assert.equal(world.service.places.get(`strasbourg-${CENTRE}`).wait, 25);
});

test('places are picked by a part of their name, or all of them by the city', () => {
  const place = { name: 'Mairie de quartier Neuhof - Meinau', city: 'Strasbourg' };
  assert.ok(matches('neuhof', place));
  assert.ok(matches('Meinau', place));
  assert.ok(matches('STRASBOURG', place));
  assert.ok(!matches('Robertsau', place));
  // Too short to mean anything.
  assert.ok(!matches('ne', place));
  assert.deepEqual(normalizeConfig({ wait_threshold: '7,6' }).waitThreshold, 8);
  assert.deepEqual(normalizeConfig({ wait_threshold: 900 }).waitThreshold, 120);
  assert.deepEqual(normalizeConfig({}).waitPlaces, []);
});

test('no place wanted, no request to the feed', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await world.service.waitCycle();
  assert.ok(!world.network.calls.some((call) => call.url === urlOf(FILE)));
  assert.ok(!(await action(world, 'status')).en.includes('waiting time'));
});

test('the places chosen are offered as devices of their own', async (t) => {
  const world = await strasbourg();
  t.after(() => world.app.stop());
  const waits = world.fake.discoveredDevices.filter((d) => d.external_id.includes(':wait:'));
  assert.deepEqual(waits.map((d) => d.name).sort(), [
    'Centre administratif - Accueil et formalités administratives - Strasbourg',
    'Mairie de quartier Cronenbourg - Strasbourg',
  ]);
  const device = waits.find((d) => d.name.includes('Cronenbourg'));
  assert.equal(device.should_poll, false);
  assert.deepEqual(
    device.features.map((f) => [f.name, f.category, f.type, f.unit ?? null]),
    [
      ["Temps d'attente", 'duration', 'integer', 'minutes'],
      ['Ouvert (temps réel)', 'input', 'binary', null],
    ],
  );
  // The directory's devices are still offered, unchanged.
  assert.ok(world.fake.discoveredDevices.some((d) => d.name === 'Mairie - Fonsorbes'));
  const message = await action(world, 'status');
  assert.match(message.fr, /■ Cronenbourg : 1 lieu avec temps d'attente/);
  assert.match(message.en, /Waiting times read 0 min ago/);
});

test('states: open and the wait, no wait when closed, nothing when stale', async (t) => {
  const world = await strasbourg();
  t.after(() => world.app.stop());
  const device = await create(world, 'Cronenbourg');
  assert.equal(lastState(world, device, 'open'), 1);
  assert.equal(lastState(world, device, 'wait'), 12);

  await reading(world, { [CRONENBOURG]: 18 });
  assert.equal(lastState(world, device, 'wait'), 18);

  const count = world.fake.states.length;
  await reading(world, {});
  assert.equal(lastState(world, device, 'open'), 0);
  // Closed: no wait published, the last one is not turned into 0.
  assert.equal(
    world.fake.states.slice(count).filter((s) => s.device_feature_external_id.endsWith(':wait'))
      .length,
    0,
  );

  // The feed stopped updating: nothing published, never an old value.
  const before = world.fake.states.length;
  world.clock.advance(3600 * 1000);
  await world.service.waitCycle();
  assert.equal(world.fake.states.length, before);
});

test('short_wait: under the threshold once, not at opening, at most every 30 minutes', async (t) => {
  const world = await strasbourg({ wait_threshold: 10 });
  t.after(() => world.app.stop());
  const device = await create(world, 'Cronenbourg');
  await create(world, 'Centre administratif');

  // 12 → 8 at Cronenbourg; the centre stays at 25.
  await reading(world, { [CRONENBOURG]: 8, [CENTRE]: 25 });
  assert.equal(fired(world).length, 1);
  assert.deepEqual(fired(world)[0].data, {
    service: device.external_id,
    service_name: 'Mairie de quartier Cronenbourg - Strasbourg',
    wait_minutes: 8,
    threshold: 10,
  });
  // Swinging around the threshold: nothing within the cooldown.
  await reading(world, { [CRONENBOURG]: 11, [CENTRE]: 25 });
  await reading(world, { [CRONENBOURG]: 7, [CENTRE]: 25 });
  assert.equal(fired(world).length, 1);

  // Closed, then open again with a short wait: an opening, not news.
  await reading(world, { [CENTRE]: 25 });
  await reading(world, { [CRONENBOURG]: 3, [CENTRE]: 25 });
  assert.equal(fired(world).length, 1);

  // After the cooldown, a new crossing fires again.
  world.clock.advance(WAIT_COOLDOWN_MS);
  await reading(world, { [CRONENBOURG]: 15, [CENTRE]: 25 });
  await reading(world, { [CRONENBOURG]: 9, [CENTRE]: 25 });
  assert.equal(fired(world).length, 2);

  // Two readings too far apart (the feed was down): no trigger.
  await reading(world, { [CRONENBOURG]: 30, [CENTRE]: 25 });
  world.clock.advance(WAIT_COOLDOWN_MS);
  await reading(world, { [CRONENBOURG]: 2, [CENTRE]: 25 });
  assert.equal(fired(world).length, 2);
});

test('the widget and the scene action say the wait', async (t) => {
  const world = await strasbourg({ language: 'en', wait_threshold: 15 });
  t.after(() => world.app.stop());
  const mairie = await create(world, 'Mairie - Fonsorbes');
  const cronenbourg = await create(world, 'Cronenbourg');
  const centre = await create(world, 'Centre administratif');

  const content = (await world.fake.widgetGet('services', { language: 'fr', settings: {} })).data
    .content;
  assert.deepEqual(validateWidgetContent(content).errors ?? [], []);
  const rows = content.components[0].items;
  // In the order of Gladys; green under the threshold, orange above.
  assert.deepEqual(
    rows.map((row) => [row.label, row.value, row.color]),
    [
      ['Mairie - Fonsorbes', "ouvert jusqu'à 12:00", 'success'],
      ['Mairie de quartier Cronenbourg - Strasb…', "ouvert · 12 min d'attente", 'success'],
      ['Centre administratif - Accueil et forma…', "ouvert · 25 min d'attente", 'warning'],
    ],
  );

  const result = await world.fake.sceneAction('is_open', {
    services: [cronenbourg.external_id, centre.external_id, mairie.external_id],
  });
  assert.equal(result.success, true);
  assert.match(
    result.data.outputs.sentence,
    /Mairie de quartier Cronenbourg - Strasbourg: open, 12 min wait\./,
  );
  assert.equal(result.data.outputs.open_count, 3);
  assert.equal(result.data.outputs.services_count, 3);

  await reading(world, {});
  const closed = await world.fake.sceneAction('is_open', { services: [cronenbourg.external_id] });
  assert.equal(
    closed.data.outputs.sentence,
    'Mairie de quartier Cronenbourg - Strasbourg: closed (real time).',
  );
  assert.equal(closed.data.outputs.open_count, 0);
});

test('the feed down: one warning, no state, said in the status, one line at recovery', async (t) => {
  const world = await strasbourg();
  t.after(() => world.app.stop());
  const device = await create(world, 'Cronenbourg');
  const lines = captureLogs(t, 'info');
  const saved = world.network.routes[urlOf(FILE)];
  world.network.routes[urlOf(FILE)] = 503;
  const before = world.fake.states.length;
  for (let i = 0; i < 3; i += 1) {
    world.clock.advance(WAIT_READ_MS);
    await world.service.waitCycle();
  }
  assert.equal(world.fake.states.length, before);
  assert.match((await action(world, 'status')).en, /Waiting times unavailable: .*HTTP 503/);
  const row = (await world.fake.widgetGet('services', { language: 'en', settings: {} })).data
    .content.components[0].items[0];
  assert.deepEqual([row.value, row.color], ['no live data', 'neutral']);
  world.network.routes[urlOf(FILE)] = saved;
  await reading(world, { [CRONENBOURG]: 5 });
  assert.equal(lastState(world, device, 'wait'), 5);
  assert.deepEqual(
    lines.map((line) => line.text.replace(/^\[[^\]]+\] /, '')),
    [
      '[WARN] [services-publics] Waiting times unavailable: data.strasbourg.eu: HTTP 503',
      '[INFO] [services-publics] Waiting times back',
    ],
  );
});

test('a normal reading writes nothing at info', async (t) => {
  const world = await strasbourg();
  t.after(() => world.app.stop());
  await create(world, 'Cronenbourg');
  const lines = captureLogs(t, 'info');
  for (let i = 0; i < 5; i += 1) {
    await reading(world, { [CRONENBOURG]: 10 + i });
  }
  assert.deepEqual(lines, []);
});
