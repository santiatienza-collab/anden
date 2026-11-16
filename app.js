// Víctimas mortales por año: se leen de data/fallecidos.json, que se actualiza solo desde Eurostat (ver .github/workflows).
const $ = (s) => document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function countUp(el, to) {
  if (reduce || to === 0) { el.textContent = String(to); return; }
  const t0 = performance.now(), dur = 900;
  const step = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

async function loadVictims() {
  const box = $('#years');
  try {
    const r = await fetch('data/fallecidos.json?x=' + Math.floor(Date.now() / 3600000));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const last = new Date().getFullYear();
    const frag = document.createDocumentFragment();
    for (let y = last - 4; y <= last; y++) {
      const known = d.years?.[y], prov = d.provisional?.[y];
      const el = document.createElement('div');
      if (known) {
        el.className = 'year';
        el.innerHTML = '<span class="n" aria-label="' + known.total + ' fallecidos en ' + y + '">0</span><span class="y">' + y + '</span><span class="t">según Eurostat</span>';
        setTimeout(() => countUp(el.querySelector('.n'), known.total), 150);
      } else if (prov?.total != null || prov?.minimo != null) {
        el.className = 'year prov';
        el.innerHTML = '<span class="n">' + (prov.total != null ? prov.total : '+' + prov.minimo) + '</span><span class="y">' + y + '</span><span class="t">cifra provisional</span>';
      } else {
        el.className = 'year pending';
        el.innerHTML = '<span class="n">Sin datos</span><span class="y">' + y + '</span><span class="t">aún no publicados</span>';
      }
      frag.append(el);
    }
    box.replaceChildren(frag);
    const known = Object.keys(d.years ?? {}).map(Number).sort((a, b) => a - b);
    const ly = known[known.length - 1], v = d.years?.[ly];
    if (v) {
      const parts = [];
      const add = (n, s, p) => { if (n) parts.push(n + ' ' + (n === 1 ? s : p)); };
      add(v.viajeros, 'viajero', 'viajeros'); add(v.personal, 'trabajador ferroviario', 'trabajadores ferroviarios');
      add(v.pasos_nivel, 'persona en pasos a nivel', 'personas en pasos a nivel'); add(v.no_autorizadas, 'persona no autorizada en la vía', 'personas no autorizadas en la vía'); add(v.otros, 'otra persona', 'otras personas');
      $('#years-detail').textContent = 'Último año con datos de Eurostat (' + ly + '): ' + v.total + ' fallecidos — ' + parts.join(', ') + '.';
    }
    const provTexts = Object.entries(d.provisional ?? {}).filter(([y]) => !d.years?.[y] && Number(y) > last - 5).sort().map(([y, p]) => y + ': ' + p.texto);
    $('#years-note').innerHTML = esc(d.definicion ?? '') + ' Datos de <a href="' + esc(d.enlace ?? '#') + '">' + esc(d.fuente ?? 'Eurostat') + '</a>; se publican con cerca de un año de retraso.' +
      (provTexts.length ? '<br><br>' + provTexts.map(esc).join('<br>') : '');
  } catch (e) {
    $('#years-msg').textContent = 'Las cifras no están disponibles ahora mismo. Inténtalo de nuevo en unos minutos.';
  }
}
loadVictims();
