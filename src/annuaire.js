// -----------------------------------------------------------------------------
// The two open APIs read, both without a key:
//
// - the directory of the French administration (Service-Public.fr, DILA),
//   on Opendatasoft Explore v2.1: the services of a commune and their hours;
// - geo.api.gouv.fr (DINUM): a commune name turned into its INSEE code.
//
// A service belongs to a commune when it stands there (`code_insee_commune`)
// or when the commune is in its area (`pivot[].code_insee_commune`: the
// gendarmerie of the next town, the CAF of the department…). Only the types of
// service the user ticked are kept. Only the needed fields are asked for (the
// records also name the heads of services: never downloaded).
//
// Checked live on 2026-10-29 (test/fixtures/api holds those answers).
// -----------------------------------------------------------------------------

import { HttpError, getJson } from './http.js';
import { jsonList } from './hours.js';

export const ANNUAIRE =
  'https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/records';
export const GEO = 'https://geo.api.gouv.fr/communes';

export const FIELDS = [
  'id',
  'nom',
  'pivot',
  'code_insee_commune',
  'plage_ouverture',
  'commentaire_plage_ouverture',
  'adresse',
  'telephone',
  'url_service_public',
];
const MAX_BODY_BYTES = 5e6;
// Opendatasoft caps `limit` at 100. Toulouse has 247 services of all types,
// fewer than 60 of the types offered: three pages are plenty.
const PAGE = 100;
const MAX_PAGES = 5;
// Services read by id at once (a short `where`).
const ID_BATCH = 20;

/** An INSEE commune code: five characters, Corsica included (2A, 2B). */
export const isInseeCode = (value) => /^(\d{5}|2[AB]\d{3})$/i.test(String(value ?? '').trim());

const fold = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();

/** A string literal of the Opendatasoft query language. */
const literal = (value) => `"${String(value).replace(/["\\]/g, (char) => `\\${char}`)}"`;

/**
 * The commune of a code or a name: `{ code, name, department }`.
 * A name matching several communes gives the most populated one: the status
 * action shows which, and the INSEE code settles it.
 */
export async function resolveCommune(fetch, query) {
  const text = String(query ?? '').trim();
  if (isInseeCode(text)) {
    const code = text.toUpperCase();
    const url = `${GEO}/${code}?${new URLSearchParams({ fields: 'nom,code,codeDepartement' })}`;
    const commune = await getJson(fetch, url, { maxBytes: 1e5 });
    if (!commune?.code) {
      throw new HttpError(`unknown commune ${code}`);
    }
    return { code: commune.code, name: commune.nom ?? code, department: commune.codeDepartement };
  }
  const params = new URLSearchParams({
    nom: text,
    fields: 'nom,code,codeDepartement,population',
    boost: 'population',
    limit: '10',
  });
  const found = await getJson(fetch, `${GEO}?${params}`, { maxBytes: 1e6 });
  const list = Array.isArray(found) ? found : [];
  const exact = list.filter((commune) => fold(commune.nom) === fold(text));
  const pick = [...(exact.length > 0 ? exact : list)].sort(
    (a, b) => (b.population ?? 0) - (a.population ?? 0),
  )[0];
  if (!pick?.code) {
    throw new HttpError(`no commune named "${text}"`);
  }
  return {
    code: pick.code,
    name: pick.nom,
    department: pick.codeDepartement,
    ambiguous: exact.length > 1,
  };
}

/** Every record of a query, page after page. */
async function records(fetch, where) {
  const all = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = new URLSearchParams({
      select: FIELDS.join(','),
      where,
      order_by: 'id',
      limit: String(PAGE),
      offset: String(page * PAGE),
    });
    const data = await getJson(fetch, `${ANNUAIRE}?${params}`, { maxBytes: MAX_BODY_BYTES });
    if (!Array.isArray(data?.results)) {
      throw new HttpError('api-lannuaire.service-public.fr: unexpected answer');
    }
    all.push(...data.results);
    if (data.results.length < PAGE || all.length >= Number(data.total_count ?? 0)) {
      break;
    }
  }
  return all;
}

/** The `pivot` of a record: `[{ type, codes }]`. */
export const pivotOf = (record) =>
  jsonList(record?.pivot).map((entry) => ({
    type: String(entry?.type_service_local ?? ''),
    codes: Array.isArray(entry?.code_insee_commune) ? entry.code_insee_commune.map(String) : [],
  }));

/** The first type of the record among the wanted ones, or null. */
export function typeOf(record, types, commune = null) {
  for (const { type, codes } of pivotOf(record)) {
    if (!types.includes(type)) {
      continue;
    }
    if (!commune || record.code_insee_commune === commune || codes.includes(commune)) {
      return type;
    }
  }
  return null;
}

/**
 * The services of the wanted types standing in a commune or covering it.
 * @param {string} commune INSEE code
 * @param {string[]} types `type_service_local` values
 */
export async function servicesOf(fetch, commune, types) {
  if (types.length === 0) {
    return [];
  }
  const code = literal(commune);
  const typeClause = types.map((type) => `pivot like ${literal(`*"${type}"*`)}`).join(' OR ');
  const where = `(code_insee_commune=${code} OR pivot like ${literal(`*"${commune}"*`)}) AND (${typeClause})`;
  const list = await records(fetch, where);
  // The `like` is a substring match: the exact pivot decides.
  return list.filter((record) => typeOf(record, types, commune));
}

/** Records by id (the services added to Gladys), in batches. */
export async function servicesById(fetch, ids) {
  const found = [];
  for (let i = 0; i < ids.length; i += ID_BATCH) {
    const batch = ids.slice(i, i + ID_BATCH);
    found.push(...(await records(fetch, batch.map((id) => `id=${literal(id)}`).join(' OR '))));
  }
  return found;
}
