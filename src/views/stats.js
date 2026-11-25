// Estadísticas de lectura.
import { h, fmtDuration, todayKey, escapeHtml } from '../ui.js';
import { getBooks, getDays } from '../db.js';
import { tagColor, getAppSettings, saveAppSettings } from '../store.js';
import { openBook } from './book.js';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export async function renderStats(root) {
  const [books, days, app] = await Promise.all([getBooks(), getDays(), getAppSettings()]);
  const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
  const now = new Date();
  const year = now.getFullYear();

  const totalSecs = days.reduce((n, d) => n + d.seconds, 0);
  const finished = books.filter((b) => b.status === 'leido');
  const finishedYear = finished.filter((b) => b.finishedAt && new Date(b.finishedAt).getFullYear() === year);
  const pagesMonth = days.filter((d) => d.date.startsWith(todayKey().slice(0, 7))).reduce((n, d) => n + d.pages, 0);

  // Racha: días seguidos con al menos 1 minuto de lectura
  let streak = 0;
  const cur = new Date();
  if (!(byDate[todayKey(cur)]?.seconds >= 60)) cur.setDate(cur.getDate() - 1);
  while (byDate[todayKey(cur)]?.seconds >= 60) { streak++; cur.setDate(cur.getDate() - 1); }
  let best = 0, run = 0;
  const sorted = days.filter((d) => d.seconds >= 60).map((d) => d.date).sort();
  for (let i = 0; i < sorted.length; i++) {
    const prev = i && new Date(sorted[i - 1]); const d = new Date(sorted[i]);
    run = prev && (d - prev) / 86400000 <= 1.01 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  const todayMin = Math.round((byDate[todayKey()]?.seconds || 0) / 60);

  root.append(h('header', { class: 'topbar' }, h('h1', { class: 'brand' }, 'Estadísticas')));
  const page = h('div', { class: 'page stats' });
  root.append(page);

  // Objetivo anual
  const goal = app.yearGoal || 24;
  const ratio = Math.min(1, finishedYear.length / goal);
  const ring = `<svg viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="${finishedYear.length} de ${goal} libros">
    <circle cx="60" cy="60" r="50" fill="none" stroke="var(--line)" stroke-width="10"/>
    <circle cx="60" cy="60" r="50" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round"
      stroke-dasharray="${(ratio * 314.16).toFixed(1)} 314.16" transform="rotate(-90 60 60)"/>
    <text x="60" y="58" text-anchor="middle" class="ring-num">${finishedYear.length}</text>
    <text x="60" y="78" text-anchor="middle" class="ring-sub">de ${goal}</text></svg>`;
  const goalInput = h('input', { type: 'number', min: 1, max: 365, value: goal, class: 'input num' });
  goalInput.addEventListener('change', () => { app.yearGoal = Math.max(1, +goalInput.value || 1); saveAppSettings(app); root.innerHTML = ''; renderStats(root); });
  page.append(h('section', { class: 'card goal-card' },
    h('div', { html: ring }),
    h('div', { class: 'stack small-gap' },
      h('h2', {}, `Reto ${year}`),
      h('p', { class: 'muted' }, finishedYear.length >= goal ? '¡Reto cumplido! 🎉' : `Te quedan ${goal - finishedYear.length} libros para tu objetivo.`),
      h('label', { class: 'row gap center' }, h('span', { class: 'small muted' }, 'Objetivo:'), goalInput, h('span', { class: 'small muted' }, 'libros')))));

  // Indicadores
  const tile = (label, value, sub) => h('div', { class: 'tile' }, h('span', { class: 'tile-label' }, label), h('strong', { class: 'tile-value' }, value), sub ? h('span', { class: 'tile-sub muted' }, sub) : null);
  page.append(h('section', { class: 'tiles' },
    tile('Hoy', fmtDuration(byDate[todayKey()]?.seconds || 0), todayMin >= app.dailyGoal ? '¡objetivo cumplido! ✨' : `objetivo ${app.dailyGoal} min`),
    tile('Racha', `${streak} día${streak === 1 ? '' : 's'}`, `mejor: ${best}`),
    tile('Tiempo total', fmtDuration(totalSecs)),
    tile('Páginas este mes', `~${pagesMonth}`),
    tile('Libros leídos', String(finished.length), `${books.length} en tu biblioteca`),
    tile('Valoración media', finished.filter((b) => b.rating).length ? (finished.filter((b) => b.rating).reduce((n, b) => n + b.rating, 0) / finished.filter((b) => b.rating).length).toFixed(1) + ' ★' : '—')));

  // Últimos 30 días
  const last = [];
  for (let i = 29; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); last.push({ date: todayKey(d), d, min: (byDate[todayKey(d)]?.seconds || 0) / 60 }); }
  page.append(h('section', { class: 'card' }, h('h3', {}, 'Minutos de lectura · últimos 30 días'),
    barChart(last.map((x) => ({ label: `${x.d.getDate()}`, full: x.d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }), value: Math.round(x.min) })), { unit: 'min', goal: app.dailyGoal, every: 5 })));

  // Libros terminados por mes
  const perMonth = MONTHS.map((m, i) => ({ label: m, full: `${m} ${year}`, value: finishedYear.filter((b) => new Date(b.finishedAt).getMonth() === i).length }));
  page.append(h('section', { class: 'card' }, h('h3', {}, `Libros terminados en ${year}`), barChart(perMonth, { unit: 'libros', every: 1, integer: true })));

  // Por # (tiempo de lectura; un libro con varios # suma en cada uno)
  const genreTime = new Map();
  for (const b of books) {
    if (!b.readSeconds) continue;
    for (const t of b.tags?.length ? b.tags.map((x) => '#' + x) : ['Sin #']) {
      const prev = genreTime.get(t) || { value: 0, color: t === 'Sin #' ? '#9a8f80' : await tagColor(t.slice(1)) };
      prev.value += b.readSeconds; genreTime.set(t, prev);
    }
  }
  const gArr = [...genreTime.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.value - a.value);
  const maxG = Math.max(1, ...gArr.map((g) => g.value));
  page.append(h('section', { class: 'card' }, h('h3', {}, 'Tiempo por #'),
    gArr.length ? h('div', { class: 'hbars' }, gArr.map((g) => h('div', { class: 'hbar', title: `${g.name}: ${fmtDuration(g.value)}` },
      h('span', { class: 'hbar-label' }, g.name),
      h('div', { class: 'hbar-track' }, h('div', { class: 'hbar-fill', style: { width: `${(g.value / maxG) * 100}%`, background: g.color } })),
      h('span', { class: 'hbar-val' }, fmtDuration(g.value))))) : h('p', { class: 'muted' }, 'Cuando leas, aquí verás con qué # pasas más tiempo.')));

  // Más leídos
  const top = books.filter((b) => b.readSeconds).sort((a, b) => b.readSeconds - a.readSeconds).slice(0, 5);
  if (top.length) {
    page.append(h('section', { class: 'card' }, h('h3', {}, 'Libros a los que más tiempo has dedicado'),
      h('div', { class: 'top-list' }, top.map((b, i) => h('button', { class: 'top-row', onclick: () => openBook(b.id) },
        h('span', { class: 'top-n' }, String(i + 1)),
        h('span', { class: 'top-t' }, h('strong', {}, b.title), h('span', { class: 'muted small' }, b.author || '')),
        h('span', { class: 'muted small' }, fmtDuration(b.readSeconds)))))));
  }

  // Autores favoritos
  const authors = new Map();
  for (const b of finished) if (b.author) authors.set(b.author, (authors.get(b.author) || 0) + 1);
  const favA = [...authors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (favA.length) page.append(h('section', { class: 'card' }, h('h3', {}, 'Autores que más has leído'),
    h('div', { class: 'chips' }, favA.map(([a, n]) => h('span', { class: 'chip on' }, `${a} · ${n}`)))));
}

// Gráfico de barras sencillo (una serie) con tooltip al pasar/tocar
function barChart(data, { unit, goal, every = 1, integer = false }) {
  const W = 640, H = 180, pl = 30, pb = 22, pt = 10;
  const max = Math.max(goal || 0, ...data.map((d) => d.value), integer ? 3 : 10);
  const step = (W - pl) / data.length;
  const bw = Math.max(3, step - 2);
  const y = (v) => H - pb - (v / max) * (H - pb - pt);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="bar-chart" role="img" aria-label="Gráfico de ${unit}">`;
  const ticks = integer ? [0, Math.ceil(max / 2), Math.ceil(max)] : [0, Math.round(max / 2), Math.round(max)];
  for (const t of ticks) s += `<line x1="${pl}" x2="${W}" y1="${y(t)}" y2="${y(t)}" class="grid-line"/><text x="${pl - 6}" y="${y(t) + 4}" text-anchor="end" class="axis">${t}</text>`;
  if (goal) s += `<line x1="${pl}" x2="${W}" y1="${y(goal)}" y2="${y(goal)}" class="goal-line"/>`;
  data.forEach((d, i) => {
    const x = pl + i * step + (step - bw) / 2;
    const top = y(d.value), hh = H - pb - top;
    if (d.value > 0) {
      const r = Math.min(4, bw / 2, hh);
      s += `<path class="bar" d="M${x},${H - pb} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${H - pb} Z"/>`;
    }
    s += `<rect class="hit" x="${pl + i * step}" y="${pt}" width="${step}" height="${H - pt - pb}" data-i="${i}"/>`;
    if (i % every === 0 || i === data.length - 1) s += `<text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle" class="axis">${escapeHtml(d.label)}</text>`;
  });
  s += '</svg>';
  const tip = h('div', { class: 'chart-tip' });
  const wrap = h('div', { class: 'chart-wrap', html: s });
  wrap.append(tip);
  const show = (e) => {
    const r = e.target.closest?.('.hit'); if (!r) return;
    const d = data[+r.dataset.i];
    tip.textContent = `${d.full}: ${d.value} ${unit}`;
    const box = r.getBoundingClientRect(), wb = wrap.getBoundingClientRect();
    tip.style.left = `${Math.min(wb.width - 120, Math.max(0, box.left - wb.left + box.width / 2 - 60))}px`;
    tip.classList.add('show');
    wrap.querySelectorAll('.hit.on').forEach((n) => n.classList.remove('on'));
    r.classList.add('on');
  };
  wrap.addEventListener('pointermove', show);
  wrap.addEventListener('pointerdown', show);
  wrap.addEventListener('pointerleave', () => tip.classList.remove('show'));
  return wrap;
}
