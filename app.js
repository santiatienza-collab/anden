// Datos en vivo de la landing: contador anual de alertas críticas y número de críticas activas ahora.
// Se leen de los ficheros que publica el repositorio de datos (GitHub Pages permite leerlos desde otra página).
const DATA = 'https://santiatienza-collab.github.io/anden-datos/api/v1/';
const $ = (s) => document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

async function getJson(name) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(DATA + name + '?x=' + Math.floor(Date.now() / 60000), { signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

/** Cuenta hacia arriba hasta el valor final (sin animación si el usuario prefiere menos movimiento). */
function countUp(el, to) {
  if (reduce || to === 0) { el.textContent = String(to); return; }
  const t0 = performance.now(), dur = 900;
  const step = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

async function loadCounter() {
  const box = $('#years'), msg = $('#years-msg');
  try {
    const c = await getJson('critical-counts.json');
    const since = new Date(c.since * 1000);
    const first = since.getFullYear(), last = new Date().getFullYear();
    const fragment = document.createDocumentFragment();
    for (let y = first; y <= last; y++) {
      const n = Number(c.years?.[String(y)] ?? 0);
      const d = document.createElement('div');
      d.className = 'year' + (y === last ? ' now' : '');
      d.innerHTML = '<span class="n" aria-label="' + n + ' alertas críticas en ' + y + '">0</span><span class="y">' + y + '</span>';
      fragment.append(d);
      setTimeout(() => countUp(d.querySelector('.n'), n), 150);
    }
    box.replaceChildren(fragment);
    $('#since').textContent = 'Contando desde el ' + since.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) + '.';
  } catch (e) {
    msg.textContent = 'El contador no está disponible ahora mismo. Inténtalo de nuevo en unos minutos.';
  }
}

async function loadLive() {
  try {
    const s = await getJson('safety.json');
    const n = (s.signals ?? []).filter((x) => x.severity === 'critical').length;
    if (!n) return;
    $('#live-badge-text').textContent = n === 1 ? '1 alerta crítica activa ahora' : n + ' alertas críticas activas ahora';
    $('#live-badge').hidden = false;
  } catch (_) { /* la insignia es opcional */ }
}

loadCounter();
loadLive();
