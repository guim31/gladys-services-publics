// -----------------------------------------------------------------------------
// Integration configuration: defaults (they mirror the `default` values of the
// manifest `config_schema`, see test/manifest.test.js) and normalization, so
// the rest of the code never deals with strings, blanks or `undefined`.
// -----------------------------------------------------------------------------

export const LANGUAGES = ['en', 'fr', 'de', 'es'];

// The types of service offered (`type_service_local` of the directory), in
// the order of the form. Values are stored by Gladys: never rename one.
export const SERVICE_TYPES = [
  'mairie',
  'prefecture',
  'sous_pref',
  'gendarmerie',
  'commissariat_police',
  'police_municipale',
  'caf',
  'cpam',
  'msa',
  'carsat',
  'cicas',
  'urssaf',
  'france_services',
  'france_travail',
  'mission_locale',
  'sip',
  'sie',
  'tresorerie',
  'centre_impots_fonciers',
  'ccas',
  'maison_handicapees',
  'cio',
];
export const DEFAULT_TYPES = [
  'mairie',
  'prefecture',
  'sous_pref',
  'gendarmerie',
  'commissariat_police',
  'caf',
  'cpam',
  'france_services',
  'france_travail',
  'sip',
];

// Hours between two downloads of the directory, in seconds: it changes a few
// times a year. Open or closed is computed every minute from the hours kept.
export const REFRESH_INTERVALS = ['21600', '43200', '86400'];
export const MAX_COMMUNES = 5;
// Real-time waiting times (src/attente.js): places chosen by name, and the
// threshold of the short_wait trigger, in whole minutes.
export const MAX_WAIT_PLACES = 10;
export const WAIT_THRESHOLD = { min: 1, max: 120 };

export const DEFAULT_CONFIG = {
  communes: '',
  service_types: DEFAULT_TYPES,
  refresh_interval: '43200',
  language: 'fr',
  wait_places: '',
  wait_threshold: 10,
};

/** "31555, Fonsorbes; 2A004" → ['31555', 'Fonsorbes', '2A004'], without duplicates. */
export function communesOf(value, max = MAX_COMMUNES) {
  const list = Array.isArray(value) ? value : String(value ?? '').split(/[,;\n]+/);
  const seen = new Set();
  const communes = [];
  for (const item of list) {
    const text = String(item ?? '')
      .trim()
      .replace(/\s+/g, ' ');
    const key = text.toLowerCase();
    if (text && !seen.has(key)) {
      seen.add(key);
      communes.push(text.slice(0, 80));
    }
  }
  return communes.slice(0, max);
}

/** The threshold in whole minutes, within its bounds; the default otherwise. */
function thresholdOf(value) {
  const text = String(value ?? '').trim();
  const number = Number(text.replace(',', '.'));
  if (text === '' || !Number.isFinite(number)) {
    return DEFAULT_CONFIG.wait_threshold;
  }
  return Math.min(WAIT_THRESHOLD.max, Math.max(WAIT_THRESHOLD.min, Math.round(number)));
}

/** The ticked types: an array from the form, tolerating a JSON or comma-separated string. */
function typesOf(value) {
  if (value === undefined || value === null) {
    return DEFAULT_TYPES;
  }
  let list = value;
  if (typeof value === 'string') {
    try {
      list = JSON.parse(value);
    } catch {
      list = value.split(',');
    }
  }
  if (!Array.isArray(list)) {
    return DEFAULT_TYPES;
  }
  const wanted = list.map((item) => String(item).trim());
  return SERVICE_TYPES.filter((type) => wanted.includes(type));
}

/**
 * @param {Record<string, unknown>} raw the configuration returned by the SDK
 */
export function normalizeConfig(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const interval = REFRESH_INTERVALS.includes(String(source.refresh_interval))
    ? String(source.refresh_interval)
    : DEFAULT_CONFIG.refresh_interval;
  return {
    communes: communesOf(source.communes),
    types: typesOf(source.service_types),
    language: LANGUAGES.includes(source.language) ? source.language : DEFAULT_CONFIG.language,
    refreshSeconds: Number(interval),
    waitPlaces: communesOf(source.wait_places, MAX_WAIT_PLACES),
    waitThreshold: thresholdOf(source.wait_threshold),
  };
}
