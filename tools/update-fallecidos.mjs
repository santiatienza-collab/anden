// Actualiza data/fallecidos.json con las víctimas mortales en accidentes ferroviarios en España que publica Eurostat
// (dataset tran_sf_railvi, a partir de los datos de la Agencia Ferroviaria de la UE, ERA). "Fallecido" = persona muerta en el
// acto o en los 30 días siguientes a un accidente; NO incluye suicidios. Se ejecuta a mano o desde el flujo mensual.
//
// Se conserva el campo "provisional" (notas escritas a mano para años aún sin datos; admite "total" o "minimo") y se retira solo cuando Eurostat ya publica ese año.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tran_sf_railvi?format=JSON&lang=EN&geo=ES&unit=NR';
const FILE = new URL('../data/fallecidos.json', import.meta.url);

const res = await fetch(API, { signal: AbortSignal.timeout(30_000) });
if (!res.ok) throw new Error(`Eurostat respondió HTTP ${res.status}`);
const j = await res.json();
const ids = j.id, size = j.size;
const at = (vals) => {
  let i = 0;
  for (let k = 0; k < ids.length; k++) {
    const pos = j.dimension[ids[k]].category.index[vals[ids[k]]];
    if (pos == null) return null;
    i = i * size[k] + pos;
  }
  const v = j.value[i];
  return v == null ? null : Number(v);
};
const base = { freq: 'A', unit: 'NR', accident: 'TOTAL', victim: 'KIL', geo: 'ES' };
const years = {};
for (const y of Object.keys(j.dimension.time.category.index)) {
  const total = at({ ...base, pers_cat: 'TOTAL', time: y });
  if (total == null) continue;
  const g = (pc) => at({ ...base, pers_cat: pc, time: y }) ?? 0;
  years[y] = { total, viajeros: g('PAS'), personal: g('EMP'), pasos_nivel: g('LV_USR'), no_autorizadas: g('UA_PER'), otros: g('OTH') + g('UNK') };
}
if (Object.keys(years).length < 10) throw new Error('Eurostat devolvió muy pocos años: no se actualiza');

let prev = {};
try { prev = JSON.parse(await readFile(FILE, 'utf8')); } catch { /* primera vez */ }
const provisional = Object.fromEntries(Object.entries(prev.provisional ?? {}).filter(([y]) => !(y in years)));

const out = {
  fuente: 'Eurostat, tran_sf_railvi (datos de la Agencia Ferroviaria de la UE, ERA)',
  enlace: 'https://ec.europa.eu/eurostat/databrowser/view/tran_sf_railvi/default/table',
  definicion: 'Personas fallecidas en el acto o en los 30 días siguientes a un accidente ferroviario, excluidos los suicidios.',
  actualizado_eurostat: j.updated ?? null,
  years,
  provisional,
};
const text = JSON.stringify(out, null, 2) + '\n';
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
if (text === (await readFile(FILE, 'utf8').catch(() => ''))) console.log('Sin cambios.');
else { await writeFile(FILE, text); console.log('Actualizado: ' + Object.keys(years).slice(-5).map((y) => `${y}=${years[y].total}`).join(' · ')); }
