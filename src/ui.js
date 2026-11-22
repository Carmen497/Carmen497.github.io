// Utilidades de interfaz: creación de nodos, iconos, avisos, hojas y diálogos.

export function h(tag, props = {}, ...children) {
  const el = tag === 'svg' || props?.svg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false || k === 'svg') continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, sv);
        else el.style[sk] = sv;
      }
    }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const P = {
  back: '<path d="M15 18l-6-6 6-6"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  stats: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  room: '<path d="M12 3l9 5v8l-9 5-9-5V8z"/><path d="M12 13v8M12 13l9-5M12 13L3 8"/>',
  brush: '<path d="M18 2l4 4-10 10-4-4z"/><path d="M8 12c-3 0-5 2-5 5 0 2-1 3-1 3s5 1 7-1c1.5-1.5 2-3 2-4"/>',
  toc: '<path d="M4 6h16M4 12h10M4 18h13"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  font: '<path d="M4 20l6-16 6 16M6.5 14h7"/><path d="M17 20v-6a2.5 2.5 0 0 1 5 0v6M17 17h5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9z"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M4 4h16"/>',
  rotate: '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/>',
  move: '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  zoomin: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5M8 11h6M11 8v6"/>',
  zoomout: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5M8 11h6"/>',
};

export function icon(name, size = 22) {
  const span = document.createElement('span');
  span.className = 'ico';
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[name] || ''}</svg>`;
  return span;
}

export function btn(label, onClick, cls = '') {
  return h('button', { class: `btn ${cls}`, onclick: onClick, type: 'button' }, label);
}

export function iconBtn(name, onClick, title = '', cls = '') {
  const b = h('button', { class: `icon-btn ${cls}`, onclick: onClick, type: 'button', title, 'aria-label': title }, icon(name));
  return b;
}

// ---- Avisos ----
let toastTimer;
export function toast(msg, ms = 2600) {
  let t = document.getElementById('toast');
  if (!t) { t = h('div', { id: 'toast', role: 'status' }); document.body.append(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

// ---- Hojas inferiores ----
const sheetStack = [];
export function sheet(content, { title, tall = false, onClose, cls = '' } = {}) {
  const backdrop = h('div', { class: 'sheet-backdrop' });
  const panel = h('div', { class: `sheet ${tall ? 'tall' : ''} ${cls}`, role: 'dialog', 'aria-modal': 'true' });
  const head = h('div', { class: 'sheet-head' },
    h('div', { class: 'sheet-grip' }),
    title ? h('h2', { class: 'sheet-title' }, title) : null,
    iconBtn('close', () => close(), 'Cerrar', 'sheet-close'));
  const body = h('div', { class: 'sheet-body' }, content);
  panel.append(head, body);
  backdrop.append(panel);
  document.body.append(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('open'));
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

  // Deslizar hacia abajo desde la cabecera para cerrar
  let startY = null;
  head.addEventListener('pointerdown', (e) => { startY = e.clientY; head.setPointerCapture(e.pointerId); });
  head.addEventListener('pointermove', (e) => {
    if (startY == null) return;
    const dy = Math.max(0, e.clientY - startY);
    panel.style.transform = `translateY(${dy}px)`;
  });
  head.addEventListener('pointerup', (e) => {
    if (startY == null) return;
    const dy = e.clientY - startY; startY = null;
    panel.style.transform = '';
    if (dy > 90) close();
  });

  let closed = false;
  function close() {
    if (closed) return; closed = true;
    backdrop.classList.remove('open');
    const i = sheetStack.indexOf(api); if (i >= 0) sheetStack.splice(i, 1);
    setTimeout(() => backdrop.remove(), 250);
    onClose?.();
  }
  const api = { close, body, panel, setTitle: (t) => { const el = head.querySelector('.sheet-title'); if (el) el.textContent = t; } };
  sheetStack.push(api);
  return api;
}
export function closeTopSheet() {
  const s = sheetStack[sheetStack.length - 1];
  if (s) { s.close(); return true; }
  return false;
}
export function closeAllSheets() { [...sheetStack].reverse().forEach((s) => s.close()); }

// ---- Diálogos ----
export function confirmDialog(message, { ok = 'Aceptar', cancel = 'Cancelar', danger = false } = {}) {
  return new Promise((resolve) => {
    const s = sheet(h('div', { class: 'dialog' },
      h('p', {}, message),
      h('div', { class: 'row end gap' },
        // Primero se responde y luego se cierra (al cerrar se responde «no» si aún no se respondió)
        btn(cancel, () => { resolve(false); s.close(); }, 'ghost'),
        btn(ok, () => { resolve(true); s.close(); }, danger ? 'danger' : 'primary'))),
    { onClose: () => resolve(false) });
  });
}

export function promptDialog(message, value = '', { ok = 'Guardar', placeholder = '' } = {}) {
  return new Promise((resolve) => {
    const input = h('input', { class: 'input', value, placeholder });
    const done = () => { resolve(input.value.trim()); s.close(); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(); });
    const s = sheet(h('div', { class: 'dialog' },
      h('label', { class: 'label' }, message), input,
      h('div', { class: 'row end gap' },
        btn('Cancelar', () => { resolve(null); s.close(); }, 'ghost'),
        btn(ok, done, 'primary'))),
    { onClose: () => resolve(null) });
    setTimeout(() => input.focus(), 260);
  });
}

// ---- Estrellas ----
export function stars(value, onChange, size = 26) {
  const wrap = h('div', { class: 'stars', role: onChange ? 'slider' : 'img', 'aria-label': `${value || 0} de 5 estrellas` });
  const render = () => {
    wrap.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const full = value >= i, half = !full && value >= i - 0.5;
      const s = h('span', { class: `star ${full ? 'full' : half ? 'half' : ''}`, style: { fontSize: size + 'px' } }, '★');
      if (onChange) {
        s.addEventListener('click', (e) => {
          const r = s.getBoundingClientRect();
          const v = e.clientX - r.left < r.width / 2 ? i - 0.5 : i;
          value = value === v ? 0 : v;
          render(); onChange(value);
        });
      }
      wrap.append(s);
    }
  };
  render();
  return wrap;
}

export function fmtDuration(sec) {
  sec = Math.round(sec || 0);
  const hh = Math.floor(sec / 3600), mm = Math.floor((sec % 3600) / 60);
  if (hh) return `${hh} h ${mm} min`;
  if (mm) return `${mm} min`;
  return sec ? `${sec} s` : '0 min';
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function todayKey(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
