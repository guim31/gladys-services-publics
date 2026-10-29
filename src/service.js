// -----------------------------------------------------------------------------
// The integration at runtime: the communes resolved, the services read from
// the directory, the devices offered in the Discover tab, the states of the
// services added to Gladys, and the scene triggers.
//
// Two paces:
// - the directory is read at the configured interval (6 to 24 hours: hours
//   change a few times a year), for the services of the configured communes
//   (Discover tab) and the ones added to Gladys (read by id, so a service
//   keeps working when its commune is removed from the configuration);
// - every minute, open or closed is computed from the hours kept, without
//   any request: states, triggers, widget.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { resolveCommune, servicesById, servicesOf, typeOf } from './annuaire.js';
import { hhmm, weekdayOf, zoneOfCommune } from './clock.js';
import { DEFAULT_CONFIG, SERVICE_TYPES, normalizeConfig } from './config.js';
import { SERVICE_TYPE, buildServiceDevice, clip, idsOf, serviceStates } from './devices.js';
import { departmentOf } from './holidays.js';
import { commentsOf, parseSchedule, statusAt } from './hours.js';
import { REPORTS, SHORT_WEEKDAYS, TEXT, WEEKDAYS, lines, render, say } from './messages.js';

const logger = createLogger({ name: 'services-publics' });

// Unchanged states (a closed service all weekend) are sent again this often,
// or the dashboard shows "no recent value" after 48 hours.
export const HEARTBEAT_MS = 6 * 3600 * 1000;
export const TICK_MS = 60 * 1000;
// Two evaluations further apart than this (the host slept, Gladys was down)
// fire no trigger: the change is no longer news.
export const MAX_GAP_MS = 5 * 60 * 1000;
// "Closing soon": the last half-hour.
export const CLOSING_SOON_MINUTES = 30;
// A failed read is tried again sooner than the configured interval.
export const RETRY_MS = 15 * 60 * 1000;

export const TRIGGERS = {
  OPENED: 'opened',
  CLOSED: 'closed',
  CLOSING_SOON: 'closing_soon',
};
export const WIDGET_KEY = 'services';

const LOCALES = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' };

/** A directory record ready for the clock: its hours parsed once. */
function entryOf(record, commune, type) {
  const code = String(record.code_insee_commune ?? commune);
  const department = departmentOf(code);
  const place = { department, zone: zoneOfCommune(code, department) };
  return {
    id: record.id,
    record,
    commune,
    type,
    week: parseSchedule(record.plage_ouverture),
    comments: commentsOf(record),
    place,
    // Triggers only compare two evaluations of the same hours.
    signature: JSON.stringify([record.plage_ouverture ?? null]),
  };
}

export class PublicServices {
  /**
   * @param {object} options
   * @param {object} options.gladys GladysIntegration (or the SDK's fake)
   * @param {typeof fetch} [options.fetch]
   * @param {() => number} [options.now]
   * @param {boolean} [options.timers] false in the tests: they call refresh() and tick()
   */
  constructor({ gladys, fetch = globalThis.fetch, now = Date.now, timers = true }) {
    this.gladys = gladys;
    this.fetch = fetch;
    this.now = now;
    this.useTimers = timers;
    this.config = normalizeConfig(DEFAULT_CONFIG);
    this.communes = new Map(); // query → { query, code, name, ambiguous, error, ids }
    this.entries = new Map(); // service id → entry
    this.views = new Map(); // device external id → last evaluation
    this.okAt = null;
    this.error = null;
    this.discoveredSignature = null;
    this.publishFailed = false;
    this.discoveryFailed = false;
    this.fireFailed = false;
    this.refreshTimer = null;
    this.tickTimer = null;
    this.stopped = false;
    this.refreshing = null;
    this.loading = Promise.resolve();
  }

  // --- lifecycle --------------------------------------------------------------

  async start(config) {
    this.config = config;
    logger.info(
      `Started: ${config.communes.length} commune(s), ${config.types.length} type(s) of service, ${this.watched().length} service(s) added`,
    );
    this.scheduleTicks();
    // The first reading in the background: the widget and the scene action
    // wait for it.
    this.loading = this.refresh({ discover: true });
  }

  /** Gladys restarted: everything again, the states included. */
  async resync(config) {
    this.config = config;
    this.gladys.forgetPublishedStates?.();
    await this.refresh({ discover: true });
  }

  async reconfigure(config) {
    const languageChanged = config.language !== this.config.language;
    const communesChanged =
      JSON.stringify(config.communes) !== JSON.stringify(this.config.communes);
    this.config = config;
    if (communesChanged) {
      this.communes.clear();
    }
    if (languageChanged) {
      // The texts follow the language.
      this.gladys.forgetPublishedStates?.();
    }
    await this.refresh({ discover: true });
  }

  async stop() {
    this.stopped = true;
    clearTimeout(this.refreshTimer);
    clearTimeout(this.tickTimer);
    await this.refreshing;
  }

  /** The next directory read: the configured interval, or sooner after a failure. */
  scheduleRefresh() {
    if (!this.useTimers || this.stopped) {
      return;
    }
    clearTimeout(this.refreshTimer);
    const delay = this.error ? RETRY_MS : this.config.refreshSeconds * 1000;
    this.refreshTimer = setTimeout(() => this.refresh(), delay);
    this.refreshTimer.unref?.();
  }

  /** The clock: one evaluation a few seconds after every minute. */
  scheduleTicks() {
    if (!this.useTimers || this.stopped) {
      return;
    }
    const delay = TICK_MS - (this.now() % TICK_MS) + 2000;
    this.tickTimer = setTimeout(async () => {
      try {
        await this.tick();
      } catch (err) {
        // Never let one bad evaluation stop the clock.
        logger.warn(`Evaluation failed: ${err.message}`);
      } finally {
        this.scheduleTicks();
      }
    }, delay);
    this.tickTimer.unref?.();
  }

  // --- devices ----------------------------------------------------------------

  /** The service id of a device created in Gladys, from its params or its external id. */
  serviceIdOf(device) {
    const param = device?.params?.find?.((p) => p.name === 'service_id')?.value;
    if (param) {
      return String(param);
    }
    const id = String(device?.external_id ?? '');
    const marker = `:${SERVICE_TYPE}:`;
    return id.includes(marker) ? id.slice(id.lastIndexOf(marker) + marker.length) : null;
  }

  /** The services added to Gladys: `{ deviceId, serviceId, name }[]`. */
  watched() {
    return (this.gladys.devices ?? [])
      .map((device) => ({
        deviceId: device.external_id,
        serviceId: this.serviceIdOf(device),
        name: device.name,
      }))
      .filter((entry) => entry.serviceId);
  }

  deviceIdOf(serviceId) {
    return idsOf(this.gladys, serviceId).device;
  }

  /** The entry of a device: `{ watched, entry }`, entry null when not read yet. */
  lookup(deviceId) {
    const watched = this.watched().find((w) => w.deviceId === deviceId);
    if (!watched) {
      return null;
    }
    return { watched, entry: this.entries.get(watched.serviceId) ?? null };
  }

  /** Waits for the first reading (at most `ms`), for a widget or a scene action asked at start. */
  async firstReading(ms = 10000) {
    let timer;
    await Promise.race([
      this.loading,
      new Promise((resolve) => {
        timer = setTimeout(resolve, ms);
      }),
    ]);
    clearTimeout(timer);
  }

  refreshWidget() {
    this.gladys.requestWidgetRefresh?.(WIDGET_KEY)?.catch?.(() => {});
  }

  /** A device was just added in Gladys: its states, all of them, now. */
  async onDeviceCreated(device) {
    const found = this.lookup(device?.external_id);
    if (found?.entry) {
      const view = this.view(found.entry);
      this.views.set(found.watched.deviceId, view);
      await this.publish(serviceStates(this.gladys, found.entry.id, view));
    } else if (found) {
      // Not read yet (added from an older discovery): read it now.
      await this.refresh();
    }
    this.refreshWidget();
  }

  async publishDiscovered({ force = false } = {}) {
    const devices = [];
    const seen = new Set();
    for (const commune of this.communes.values()) {
      for (const id of commune.ids ?? []) {
        const entry = this.entries.get(id);
        if (!entry || seen.has(id)) {
          continue;
        }
        seen.add(id);
        devices.push(
          buildServiceDevice(this.gladys, entry.record, {
            commune: entry.commune,
            type: entry.type,
            language: this.config.language,
          }),
        );
      }
    }
    const signature = JSON.stringify(devices.map((d) => [d.external_id, d.name, d.features]));
    if (!force && signature === this.discoveredSignature) {
      return;
    }
    try {
      await this.gladys.publishDiscoveredDevices(devices);
      this.discoveredSignature = signature;
      if (this.discoveryFailed) {
        this.discoveryFailed = false;
        logger.info('Discovered services published again');
      }
    } catch (err) {
      if (!this.discoveryFailed) {
        logger.warn(`Cannot publish the discovered services: ${err.message}`);
      }
      this.discoveryFailed = true;
    }
  }

  async publish(states) {
    if (states.length === 0) {
      return;
    }
    try {
      await this.gladys.publishChangedStates(states, { heartbeat: HEARTBEAT_MS });
      if (this.publishFailed) {
        this.publishFailed = false;
        logger.info('States published again');
      }
    } catch (err) {
      // Gladys restarting: said once, the next tick sends them again.
      if (!this.publishFailed) {
        logger.warn(`Cannot publish ${states.length} state(s): ${err.message}`);
      }
      this.publishFailed = true;
    }
  }

  // --- reading the directory ---------------------------------------------------

  /** One read of the directory; concurrent calls share it. */
  refresh({ discover = false } = {}) {
    if (!this.refreshing) {
      this.refreshing = this.readAll(discover)
        .catch((err) => logger.warn(`Refresh failed: ${err.message}`))
        .finally(() => {
          this.refreshing = null;
          this.scheduleRefresh();
        });
      return this.refreshing;
    }
    // A discovery asked during a read (communes just changed) reads again
    // right after it: the running one may not include them.
    return discover ? this.refreshing.then(() => this.refresh({ discover })) : this.refreshing;
  }

  async readAll(forceDiscovery) {
    let failure = null;
    for (const query of this.config.communes) {
      const commune = this.communes.get(query) ?? { query };
      this.communes.set(query, commune);
      try {
        if (!commune.code) {
          Object.assign(commune, await resolveCommune(this.fetch, query));
        }
        const records = await servicesOf(this.fetch, commune.code, this.config.types);
        commune.ids = records.map((record) => record.id);
        for (const record of records) {
          this.entries.set(
            record.id,
            entryOf(record, commune.code, typeOf(record, this.config.types, commune.code)),
          );
        }
        commune.error = null;
      } catch (err) {
        commune.error = err.message;
        failure ??= err;
      }
    }
    for (const query of [...this.communes.keys()]) {
      if (!this.config.communes.includes(query)) {
        this.communes.delete(query);
      }
    }
    // The services added to Gladys whose commune is no longer configured.
    const known = new Set([...this.communes.values()].flatMap((c) => c.ids ?? []));
    const missing = this.watched()
      .map((w) => w.serviceId)
      .filter((id) => !known.has(id));
    if (missing.length > 0) {
      try {
        for (const record of await servicesById(this.fetch, missing)) {
          const previous = this.entries.get(record.id);
          const type = typeOf(record, SERVICE_TYPES) ?? previous?.type ?? '';
          this.entries.set(
            record.id,
            entryOf(record, previous?.commune ?? record.code_insee_commune ?? '', type),
          );
        }
      } catch (err) {
        failure ??= err;
      }
    }
    this.noteRead(failure);
    await this.publishDiscovered({ force: forceDiscovery });
    await this.tick();
  }

  /** A failure is logged once, until a read works again. */
  noteRead(failure) {
    if (failure) {
      if (!this.error) {
        logger.warn(`Directory unavailable: ${failure.message}`);
      }
      this.error = failure.message;
      return;
    }
    if (this.error) {
      logger.info('Directory back');
    }
    this.error = null;
    this.okAt = this.now();
    logger.debug(`${this.entries.size} service(s) read`);
  }

  // --- the clock ----------------------------------------------------------------

  /** "tomorrow at 08:30" for a `next` of statusAt, in a language. */
  whenText(next, language) {
    const time = hhmm(next.minutes);
    if (next.days === 0) {
      return say(TEXT, language, 'today', { time });
    }
    if (next.days === 1) {
      return say(TEXT, language, 'tomorrow', { time });
    }
    if (next.days < 7) {
      return say(TEXT, language, 'weekday', {
        day: WEEKDAYS[language][weekdayOf(next.date)],
        time,
      });
    }
    const date = new Date(`${next.date}T00:00:00Z`).toLocaleDateString(LOCALES[language], {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
    return say(TEXT, language, 'date', { date, time });
  }

  /** "lun. 08:30", the widget form of a `next` (the time alone today). */
  shortWhen(next, language) {
    const time = hhmm(next.minutes);
    if (next.days === 0) {
      return time;
    }
    if (next.days < 7) {
      return `${SHORT_WEEKDAYS[language][weekdayOf(next.date)]} ${time}`;
    }
    const date = new Date(`${next.date}T00:00:00Z`).toLocaleDateString(LOCALES[language], {
      day: 'numeric',
      month: 'numeric',
      timeZone: 'UTC',
    });
    return `${date} ${time}`;
  }

  /** What a service is at the current minute, with its texts. */
  view(entry, language = this.config.language) {
    const status = statusAt(entry.week, this.now(), entry.place);
    const { today } = status;
    let hours;
    if (!status.known) {
      hours = say(TEXT, language, entry.comments.length > 0 ? 'hoursInComment' : 'noHours');
    } else if (today.holidayClosed) {
      hours = say(TEXT, language, 'holidayClosed');
    } else if (today.slots.length === 0) {
      hours = say(TEXT, language, 'closedToday');
    } else {
      const allDay =
        today.slots.length === 1 && today.slots[0].from === 0 && today.slots[0].to === 1440;
      hours = allDay
        ? say(TEXT, language, 'allDay')
        : today.slots.map(({ from, to }) => `${hhmm(from)}–${hhmm(to)}`).join(', ');
      if (today.holiday) {
        hours += ` (${say(TEXT, language, 'holiday')})`;
      }
    }
    let next;
    if (!status.known) {
      next = say(TEXT, language, 'unknown');
    } else if (status.open && !status.closing) {
      next = say(TEXT, language, 'allDay');
    } else {
      next = status.next ? this.whenText(status.next, language) : say(TEXT, language, 'noNext');
    }
    const comment = entry.comments.map((text) => text.replace(/\s*\n\s*/g, ' ')).join(' · ');
    return {
      ...status,
      signature: entry.signature,
      at: this.now(),
      hours,
      next,
      nextStatus: status.next,
      comment: comment || say(TEXT, language, 'noComment'),
    };
  }

  /** One evaluation of every service added: states, then triggers. */
  async tick() {
    const states = [];
    const events = [];
    const alive = new Set();
    for (const watched of this.watched()) {
      const entry = this.entries.get(watched.serviceId);
      if (!entry) {
        continue;
      }
      alive.add(watched.deviceId);
      const view = this.view(entry);
      states.push(...serviceStates(this.gladys, entry.id, view));
      events.push(...this.events(watched, this.views.get(watched.deviceId), view));
      this.views.set(watched.deviceId, view);
    }
    for (const deviceId of [...this.views.keys()]) {
      if (!alive.has(deviceId)) {
        this.views.delete(deviceId);
      }
    }
    await this.publish(states);
    for (const { key, data } of events) {
      await this.fire(key, data);
    }
    if (events.length > 0) {
      this.refreshWidget();
    }
  }

  /** The trigger events of a service between two evaluations. */
  events(watched, before, after) {
    if (
      !before ||
      !before.known ||
      !after.known ||
      before.signature !== after.signature ||
      after.at - before.at > MAX_GAP_MS
    ) {
      return [];
    }
    const language = this.config.language;
    const data = {
      service: watched.deviceId,
      service_name: watched.name ?? '',
      closes_at: after.closing ? hhmm(after.closing.minutes) : '',
      minutes_left: after.minutesLeft ?? 0,
      next_opening: after.nextStatus ? this.whenText(after.nextStatus, language) : '',
    };
    const events = [];
    if (!before.open && after.open) {
      events.push({ key: TRIGGERS.OPENED, data });
    }
    if (before.open && !after.open) {
      events.push({ key: TRIGGERS.CLOSED, data });
    }
    if (
      before.open &&
      after.open &&
      before.minutesLeft !== null &&
      after.minutesLeft !== null &&
      before.minutesLeft > CLOSING_SOON_MINUTES &&
      after.minutesLeft <= CLOSING_SOON_MINUTES
    ) {
      events.push({ key: TRIGGERS.CLOSING_SOON, data });
    }
    return events;
  }

  async fire(key, data) {
    try {
      await this.gladys.publishSceneEvent(key, data);
      if (this.fireFailed) {
        this.fireFailed = false;
        logger.info('Scene triggers fired again');
      }
    } catch (err) {
      if (!this.fireFailed) {
        logger.warn(`Cannot fire the ${key} trigger: ${err.message}`);
      }
      this.fireFailed = true;
    }
  }

  // --- texts ------------------------------------------------------------------

  /** "ouvert jusqu'à 12:00", "fermé · ouvre lun. 08:30"… for a widget row (40 characters). */
  shortText(entry, language, { hours = true } = {}) {
    if (!entry) {
      return '—';
    }
    const view = this.view(entry, language);
    if (!view.known) {
      return clip(say(TEXT, language, 'noHours'), 40);
    }
    if (view.open) {
      if (!view.closing) {
        return say(TEXT, language, 'allDay');
      }
      if (view.minutesLeft <= CLOSING_SOON_MINUTES) {
        return say(TEXT, language, 'closesIn', { minutes: view.minutesLeft });
      }
      return hours
        ? say(TEXT, language, 'openUntil', { time: hhmm(view.closing.minutes) })
        : say(TEXT, language, 'open');
    }
    if (!hours || !view.nextStatus) {
      return say(TEXT, language, 'closed');
    }
    const short = this.shortWhen(view.nextStatus, language);
    return say(TEXT, language, view.today.holidayClosed ? 'holidayRow' : 'opensAt', { short });
  }

  /** "Mairie - Toulouse : ouvert jusqu'à 18:00." */
  sentence(entry, name, language) {
    const view = this.view(entry, language);
    if (!view.known) {
      return say(TEXT, language, 'sentenceUnknown', { name });
    }
    if (view.open) {
      return view.closing
        ? say(TEXT, language, 'sentenceOpen', { name, time: hhmm(view.closing.minutes) })
        : say(TEXT, language, 'sentenceAlways', { name });
    }
    if (!view.nextStatus) {
      return say(TEXT, language, 'sentenceNoNext', { name });
    }
    const when = this.whenText(view.nextStatus, language);
    return say(TEXT, language, view.today.holidayClosed ? 'sentenceHoliday' : 'sentenceClosed', {
      name,
      when,
    });
  }

  // --- configuration action -----------------------------------------------------

  status() {
    const blocks = [];
    if (this.config.communes.length === 0) {
      blocks.push(render(REPORTS, 'noCommune'));
    }
    if (this.config.types.length === 0) {
      blocks.push(render(REPORTS, 'noType'));
    }
    for (const query of this.config.communes) {
      const commune = this.communes.get(query);
      if (commune?.code) {
        blocks.push(
          render(REPORTS, 'commune', {
            name: commune.name,
            code: commune.code,
            count: commune.ids?.length ?? 0,
          }),
          commune.ambiguous ? render(REPORTS, 'ambiguous') : null,
        );
      } else if (commune?.error) {
        blocks.push(render(REPORTS, 'communeError', { query, error: commune.error }));
      }
    }
    blocks.push(
      this.okAt === null
        ? render(REPORTS, 'waiting')
        : render(REPORTS, 'read', { age: Math.round((this.now() - this.okAt) / 60000) }),
      this.error ? render(REPORTS, 'error', { error: this.error }) : null,
      render(REPORTS, 'watched', { count: this.watched().length }),
    );
    return lines(...blocks);
  }
}
