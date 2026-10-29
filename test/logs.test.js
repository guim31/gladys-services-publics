// -----------------------------------------------------------------------------
// What the integration writes to `docker logs`: at info, only the lifecycle
// (the start, the directory lost and back), never one line per reading nor
// per minute; a failure that repeats at every read is logged once, plus one
// line when it is over.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureLogs, create, createWorld, minutes, urlOf } from './helpers/world.js';

const strip = (line) => line.text.replace(/^\[[^\]]+\] /, '');

test('the start is one info line', async (t) => {
  const lines = captureLogs(t, 'info');
  const world = await createWorld();
  t.after(() => world.app.stop());
  assert.deepEqual(lines.map(strip), [
    '[INFO] [services-publics] Started: 2 commune(s), 10 type(s) of service, 0 service(s) added',
  ]);
});

test('a normal day writes nothing at info, one line per read at debug', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await create(world, 'Mairie - Fonsorbes');
  const lines = captureLogs(t, 'info');
  await minutes(world, 180);
  await world.service.refresh();
  assert.deepEqual(lines, []);
  const debug = captureLogs(t, 'debug');
  await world.service.refresh();
  assert.deepEqual(debug.map(strip), ['[DEBUG] [services-publics] 34 service(s) read']);
});

test('the directory down at every read: one warning, then one line at recovery', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await create(world, 'Mairie - Fonsorbes');
  const url = urlOf('toulouse-default-types.json');
  const saved = world.network.routes[url];
  const lines = captureLogs(t, 'info');
  world.network.routes[url] = new TypeError('fetch failed');
  for (let i = 0; i < 4; i += 1) {
    await world.service.refresh();
  }
  world.network.routes[url] = saved;
  await world.service.refresh();
  assert.deepEqual(lines.map(strip), [
    '[WARN] [services-publics] Directory unavailable: api-lannuaire.service-public.fr: fetch failed',
    '[INFO] [services-publics] Directory back',
  ]);
});
