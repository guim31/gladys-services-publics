// -----------------------------------------------------------------------------
// The integration end to end, against the SDK's fake Gladys and the real
// answers of the directory captured on 2026-10-29 (Toulouse, and Fonsorbes,
// a commune of 12,000 people whose gendarmerie stands in Saint-Lys).
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRIGGERS } from '../src/service.js';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import {
  MINUTE,
  action,
  at,
  create,
  createFetch,
  createWorld,
  featureId,
  minutes,
  paris,
  urlOf,
} from './helpers/world.js';

const lastState = (world, device, key) => {
  const id = featureId(device, key);
  const found = world.fake.states.filter((s) => s.device_feature_external_id === id).at(-1);
  return found ? (found.text ?? found.state) : undefined;
};
const widget = async (world, key, options) =>
  (await world.fake.widgetGet(key, options)).data.content;
const fired = (world) => world.fake.sceneEvents.map((event) => event.key);

test('the services of the communes are offered, the ones covering them included', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const names = world.fake.discoveredDevices.map((device) => device.name);
  assert.equal(names.length, 32 + 2);
  assert.ok(names.includes('Mairie - Toulouse'));
  assert.ok(names.includes('Mairie - Fonsorbes'));
  // Not in Fonsorbes, but its area covers it.
  assert.ok(names.includes('Brigade de gendarmerie - Saint-Lys'));
  // Long official names shortened, the place kept.
  assert.ok(names.includes('CPAM de Haute-Garonne - accueil de Toulouse - Centre'));
  // A type not ticked by default.
  assert.ok(!names.some((name) => name.startsWith('Mission locale')));
  const mairie = world.fake.discoveredDevices.find((d) => d.name === 'Mairie - Fonsorbes');
  assert.equal(mairie.should_poll, false);
  assert.deepEqual(mairie.params, [
    { name: 'service_id', value: '22ba4633-afab-45e7-aa6d-d8036e90f744' },
    { name: 'commune', value: '31187' },
    { name: 'type', value: 'mairie' },
  ]);
});

test('a commune given by its name or its INSEE code, and the status action', async (t) => {
  const world = await createWorld({ config: { communes: '31555; Fonsorbes', language: 'en' } });
  t.after(() => world.app.stop());
  assert.equal(world.fake.discoveredDevices.length, 34);
  const message = await action(world, 'status');
  assert.match(message.fr, /■ Toulouse \(31555\) : 32 services trouvés/);
  assert.match(message.fr, /■ Fonsorbes \(31187\) : 2 services trouvés/);
  assert.match(message.en, /0 services added to Gladys/);
});

test('an unknown commune is said in the status, the others still work', async (t) => {
  const world = await createWorld({ config: { communes: 'Toulouse, Nowhere-sur-Mer' } });
  t.after(() => world.app.stop());
  assert.equal(world.fake.discoveredDevices.length, 32);
  const message = await action(world, 'status');
  assert.match(message.en, /■ Nowhere-sur-Mer: not found \(geo\.api\.gouv\.fr: HTTP 404\)/);
});

test('the states of a service added: open now, hours, next opening, comment', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const mairie = await create(world, 'Mairie - Fonsorbes');
  // Thursday 10:00, published right at the creation.
  assert.equal(lastState(world, mairie, 'open'), 1);
  assert.equal(lastState(world, mairie, 'hours'), '08:30–12:00, 13:30–18:00');
  assert.equal(lastState(world, mairie, 'next'), "aujourd'hui à 13:30");
  assert.equal(lastState(world, mairie, 'comment'), 'Aucun commentaire');

  const cpam = await create(world, 'CPAM de Haute-Garonne - accueil de Toulouse - Centre');
  assert.match(lastState(world, cpam, 'comment'), /sur rendez-vous/);

  const gendarmerie = await create(world, 'Saint-Lys');
  // No hours in the directory: no open state, never a guess.
  assert.equal(lastState(world, gendarmerie, 'open'), undefined);
  assert.equal(lastState(world, gendarmerie, 'hours'), "Horaires absents de l'annuaire");
  assert.equal(lastState(world, gendarmerie, 'next'), 'inconnue');

  // The evening: closed, opens tomorrow.
  await at(world, paris('2026-10-29 19:00'));
  assert.equal(lastState(world, mairie, 'open'), 0);
  assert.equal(lastState(world, mairie, 'next'), 'demain à 08:30');
});

test('a public holiday: the town hall assumed closed, the 24/7 police station open', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const mairie = await create(world, (d) => d.name === 'Mairie - Toulouse');
  const police = await create(world, (d) => d.name === 'Commissariat de police de Toulouse');
  await at(world, paris('2026-11-11 10:00'));
  assert.equal(lastState(world, mairie, 'open'), 0);
  assert.equal(lastState(world, mairie, 'hours'), 'Jour férié : fermé a priori');
  assert.equal(lastState(world, mairie, 'next'), 'demain à 08:30');
  assert.equal(lastState(world, police, 'open'), 1);
  assert.equal(lastState(world, police, 'hours'), 'ouvert 24 h/24 (jour férié)');
  const { data } = await world.fake.sceneAction('is_open', { services: [mairie.external_id] });
  assert.equal(
    data.outputs.sentence,
    "Mairie - Toulouse : jour férié, fermé a priori (l'annuaire ne précise rien), ouvre demain à 08:30.",
  );
});

test('triggers: last half-hour, closing, opening; none at start nor after a gap', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const mairie = await create(world, 'Mairie - Fonsorbes');
  await at(world, paris('2026-10-29 11:25'));
  assert.deepEqual(fired(world), []);
  await minutes(world, 5);
  assert.deepEqual(fired(world), [TRIGGERS.CLOSING_SOON]);
  assert.deepEqual(world.fake.sceneEvents[0].data, {
    service: mairie.external_id,
    service_name: 'Mairie - Fonsorbes',
    closes_at: '12:00',
    minutes_left: 30,
    next_opening: "aujourd'hui à 13:30",
  });
  await minutes(world, 30);
  assert.deepEqual(fired(world), [TRIGGERS.CLOSING_SOON, TRIGGERS.CLOSED]);
  assert.equal(world.fake.sceneEvents[1].data.next_opening, "aujourd'hui à 13:30");
  await minutes(world, 90);
  assert.deepEqual(fired(world), [TRIGGERS.CLOSING_SOON, TRIGGERS.CLOSED, TRIGGERS.OPENED]);
  assert.equal(world.fake.sceneEvents[2].data.closes_at, '18:00');
  // The host slept from 17:00 to 19:00: the closing is no longer news.
  await at(world, paris('2026-10-29 17:00'));
  await at(world, paris('2026-10-29 19:00'));
  assert.equal(world.fake.sceneEvents.length, 3);
});

test('the clock publishes only the changes', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await create(world, 'Mairie - Fonsorbes');
  const before = world.fake.states.length;
  const requests = world.network.calls.length;
  await minutes(world, 30);
  assert.equal(world.fake.states.length, before);
  assert.equal(world.network.calls.length, requests, 'no request on the minute clock');
});

test('a service added keeps working when its commune leaves the configuration', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const gendarmerie = await create(world, 'Saint-Lys');
  const mairie = await create(world, (d) => d.name === 'Mairie - Toulouse');
  await world.fake.configUpdated({ communes: '' });
  await world.service.refresh();
  assert.deepEqual(world.fake.discoveredDevices, []);
  assert.ok(world.network.calls.some((c) => c.url === urlOf('by-id-saint-lys-toulouse.json')));
  world.fake.states.length = 0;
  world.gladys.forgetPublishedStates();
  await at(world, paris('2026-10-30 09:00'));
  assert.equal(lastState(world, mairie, 'open'), 1);
  assert.equal(lastState(world, gendarmerie, 'hours'), "Horaires absents de l'annuaire");
});

test('the directory down: the hours kept go on, the status says it', async (t) => {
  const network = createFetch();
  const world = await createWorld({ network });
  t.after(() => world.app.stop());
  const mairie = await create(world, 'Mairie - Fonsorbes');
  network.routes[urlOf('fonsorbes-default-types.json')] = 503;
  await world.service.refresh();
  world.clock.advance(MINUTE);
  await at(world, paris('2026-10-29 12:30'));
  assert.equal(lastState(world, mairie, 'open'), 0);
  const message = await action(world, 'status');
  assert.match(message.en, /Last error: api-lannuaire\.service-public\.fr: HTTP 503/);
  assert.equal(world.fake.discoveredDevices.length, 34, 'the services found stay offered');
});

test('the scene action: one sentence per service, numbers to compare', async (t) => {
  const world = await createWorld({ config: { communes: 'Toulouse, 31187', language: 'en' } });
  t.after(() => world.app.stop());
  const empty = await world.fake.sceneAction('is_open', {});
  assert.equal(empty.success, false);
  await create(world, 'Mairie - Fonsorbes');
  await create(world, (d) => d.name === 'Commissariat de police de Toulouse');
  await create(world, 'Saint-Lys');
  await at(world, paris('2026-10-29 12:15'));
  const { data } = await world.fake.sceneAction('is_open', {});
  assert.equal(
    data.outputs.sentence,
    'Mairie - Fonsorbes: closed, opens today at 13:30. Commissariat de police de Toulouse: open 24/7. Brigade de gendarmerie - Saint-Lys: no hours in the directory.',
  );
  assert.equal(data.outputs.open_count, 1);
  assert.equal(data.outputs.services_count, 3);
});

test('the widget: a row per service, colored, with the name given in Gladys', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const empty = await widget(world, 'services', { language: 'fr' });
  assert.match(empty.components[0].text, /onglet Découverte/);
  const mairie = await create(world, 'Mairie - Fonsorbes');
  await create(world, 'Saint-Lys');
  world.gladys.devices.find((d) => d.external_id === mairie.external_id).name = 'Ma mairie';
  await at(world, paris('2026-10-29 11:40'));
  let content = await widget(world, 'services', { language: 'fr' });
  assert.deepEqual(validateWidgetContent(content), []);
  assert.deepEqual(content.components[0].items, [
    { label: 'Ma mairie', value: 'ferme dans 20 min', color: 'warning' },
    {
      label: 'Brigade de gendarmerie - Saint-Lys',
      value: "Horaires absents de l'annuaire",
      color: 'neutral',
    },
  ]);
  await at(world, paris('2026-10-30 18:00'));
  content = await widget(world, 'services', {
    language: 'en',
    settings: { services: [mairie.external_id] },
  });
  assert.deepEqual(content.components[0].items, [
    { label: 'Ma mairie', value: 'closed · opens Mon 08:30', color: 'danger' },
  ]);
  content = await widget(world, 'services', {
    language: 'en',
    settings: { services: [mairie.external_id], show_hours: false },
  });
  assert.equal(content.components[0].items[0].value, 'closed');
});
