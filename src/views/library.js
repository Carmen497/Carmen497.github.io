// Biblioteca: sala isométrica (con modo decorar) y vista de lista.
import { h, icon, iconBtn, btn, toast, sheet, promptDialog, confirmDialog, escapeHtml } from '../ui.js';
import { getBooks, putBook } from '../db.js';
import {
  getRoom, saveRoom, allTags, hasTag, tagKey, isStarted, getAppSettings, saveAppSettings, sortBooksForShelf, coverUrl, booksForShelves, LIST_GROUPS, LIST_SORTS,
} from '../store.js';
import {
  renderRoom, roomViewBox, screenToFloor, screenToWall, CATALOG, catalogOf, canPlace, canPlaceWall,
  footprint, itemPreview, FLOOR_OPTIONS, WALL_OPTIONS, WALL_STYLES, SEASONS, GROUPS, activeSeasons,
} from '../iso/room.js';
import { THEMES, themeById, applyTheme, restorePrevDecor, themeSampleRoom } from '../iso/themes.js';
import { pickFiles } from '../importer.js';
import { openShelf } from './shelf.js';
import { openBook } from './book.js';

export async function renderLibrary(root, nav) {
  const app = await getAppSettings();
  let mode = app.libraryView || 'room';

  const content = h('div', { class: 'lib-content' });
  const toggle = h('div', { class: 'seg big' },
    h('button', { class: mode === 'room' ? 'on' : '', onclick: () => setMode('room') }, icon('room', 22), 'Sala'),
    h('button', { class: mode === 'list' ? 'on' : '', onclick: () => setMode('list') }, icon('list', 22), 'Lista'));
  const header = h('header', { class: 'topbar lib-top' },
    h('h1', { class: 'brand' }, 'Mi rincón'),
    toggle,
    iconBtn('plus', pickFiles, 'Añadir libro', 'accent'));
  root.append(header, content);

  async function setMode(m) {
    mode = m;
    [...toggle.children].forEach((b, i) => b.classList.toggle('on', (i === 0) === (m === 'room')));
    app.libraryView = m;
    saveAppSettings(app);
    draw();
  }

  let cleanup = null;
  async function draw() {
    cleanup?.();
    content.innerHTML = '';
    cleanup = mode === 'room' ? await roomView(content, nav) : await listView(content, nav);
  }
  await draw();

  const onChange = () => draw();
  window.addEventListener('library-changed', onChange);
  return () => { cleanup?.(); window.removeEventListener('library-changed', onChange); };
}

// ---------------------------------------------------------------------------
// Sala isométrica
// ---------------------------------------------------------------------------
// Libros de muestra para las miniaturas de las salas decoradas
const SAMPLE_COLORS = ['#8c3b3b', '#3f6e8c', '#6b7d4a', '#a0773f', '#5d4a7a', '#2f5d50', '#c25b7a'];
const SAMPLE_BOOKS = Object.fromEntries(['shelf-1', 'shelf-2', 'shelf-3'].map((id, k) => [id, Array.from({ length: 22 + k * 5 }, (_, i) => ({ id: id + i, spineColor: SAMPLE_COLORS[(i * 3 + k) % 7] }))]));

async function roomView(container, nav) {
  const room = await getRoom();
  let books = await getBooks();
  const night = document.documentElement.dataset.theme === 'dark';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'room-svg');
  const wrap = h('div', { class: 'room-wrap' }, svg);
  const overlay = h('div', { class: 'room-overlay' });
  container.append(wrap, overlay);

  let edit = false, selectedId = null, placing = null;
  // Si hay temporada (p. ej. Navidad), el catálogo se abre en ella
  let palTab = activeSeasons()[0] || 'muebles';

  const booksByShelf = () => booksForShelves(room.items, books);

  // ---- Vista (zoom y desplazamiento) ----
  const base = roomViewBox(room.size);
  let view = { cx: base.x + base.w / 2, cy: base.y + base.h / 2, scale: 1 };
  const applyView = () => {
    const w = base.w / view.scale, hh = base.h / view.scale;
    svg.setAttribute('viewBox', `${view.cx - w / 2} ${view.cy - hh / 2} ${w} ${hh}`);
  };
  const clampView = () => {
    view.scale = Math.min(Math.max(4, room.size / 2.5), Math.max(0.8, view.scale)); // en salas grandes se puede acercar más
    view.cx = Math.min(base.x + base.w, Math.max(base.x, view.cx));
    view.cy = Math.min(base.y + base.h, Math.max(base.y, view.cy));
  };

  function draw() {
    svg.innerHTML = renderRoom(room, booksByShelf(), { edit, selectedId, night });
    applyView();
  }
  // En pantallas verticales (móvil), acercar para que la sala llene más
  const fitView = () => {
    const r = wrap.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const ratio = (r.height / r.width) / (base.h / base.w);
    view.scale = Math.min(1.9, Math.max(1, ratio * 0.62));
    view.cy = base.y + base.h / 2 + (view.scale > 1 ? 30 : 0);
  };
  fitView();
  draw();

  const toSvg = (clientX, clientY) => {
    const p = svg.createSVGPoint();
    p.x = clientX; p.y = clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  };

  // ---- Gestos ----
  const pointers = new Map();
  let gesture = null;
  svg.addEventListener('pointerdown', (e) => {
    svg.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      const target = e.target.closest('[data-id]');
      const id = target?.dataset.id;
      gesture = { type: 'tap', sx: e.clientX, sy: e.clientY, id, start: { ...view } };
      if (edit && id && id === selectedId) {
        const it = room.items.find((i) => i.id === id);
        const p = toSvg(e.clientX, e.clientY);
        const f = screenToFloor(p.x, p.y);
        gesture.drag = { it, ox: f.x - (it.x ?? 0), oy: f.y - (it.y ?? 0) };
        if (catalogOf(it.type).wall) {
          const w = screenToWall(p.x, p.y, room.size, true);
          gesture.drag.wo = w.wall === it.wall ? w.t - it.p : catalogOf(it.type).span / 2;
        }
      }
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      gesture = { type: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), start: { ...view } };
    }
  });
  svg.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId) || !gesture) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gesture.type === 'pinch' && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      view.scale = gesture.start.scale * (Math.hypot(a.x - b.x, a.y - b.y) / gesture.dist);
      clampView(); applyView();
      return;
    }
    const dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy;
    if (gesture.type === 'tap' && Math.hypot(dx, dy) > 7) gesture.type = gesture.drag ? 'drag' : 'pan';
    if (gesture.type === 'pan') {
      const rect = svg.getBoundingClientRect();
      const k = (base.w / view.scale) / rect.width;
      const kk = Math.max(k, (base.h / view.scale) / rect.height);
      view.cx = gesture.start.cx - dx * kk;
      view.cy = gesture.start.cy - dy * kk;
      clampView(); applyView();
    } else if (gesture.type === 'drag') {
      const p = toSvg(e.clientX, e.clientY);
      const it = gesture.drag.it;
      if (catalogOf(it.type).wall) {
        // Se mueve desde el punto por donde lo cogiste y no se sale de la pared
        const w = screenToWall(p.x, p.y, room.size, true);
        const span = catalogOf(it.type).span;
        const np = Math.max(0, Math.min(room.size - span, Math.round(w.t - gesture.drag.wo)));
        if ((w.wall !== it.wall || np !== it.p) && canPlaceWall(room, it, w.wall, np)) { it.wall = w.wall; it.p = np; draw(); }
      } else {
        const f = screenToFloor(p.x, p.y);
        const nx = Math.round(f.x - gesture.drag.ox), ny = Math.round(f.y - gesture.drag.oy);
        if ((nx !== it.x || ny !== it.y) && canPlace(room, it, nx, ny)) { it.x = nx; it.y = ny; draw(); }
      }
    }
  });
  const end = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (!gesture) return;
    if (gesture.type === 'tap' && pointers.size === 0) onTap(e, gesture.id);
    if (gesture.type === 'drag') saveRoom(room);
    if (pointers.size === 0) gesture = null;
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    view.scale *= e.deltaY < 0 ? 1.12 : 1 / 1.12;
    clampView(); applyView();
  }, { passive: false });

  function onTap(e, id) {
    if (!edit) {
      const it = id && room.items.find((i) => i.id === id);
      if (it?.type === 'shelf') {
        openShelf(it.id, { origin: { x: e.clientX, y: e.clientY }, onChange: async () => { books = await getBooks(); Object.assign(room, await getRoom()); draw(); } });
      } else if (it?.type === 'cat') {
        toast(['Miau 🐾', 'Prrrr…', '¿Lees un capítulo más?', 'Zzz…'][Math.floor(Math.random() * 4)]);
      } else if (it?.type === 'clock') {
        toast(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
      }
      return;
    }
    // Modo decorar
    const p = toSvg(e.clientX, e.clientY);
    if (placing) {
      const c = catalogOf(placing.type);
      const item = { id: placing.type + '-' + Date.now().toString(36), type: placing.type, rot: 0, color: c.color };
      if (placing.type === 'shelf') { item.name = 'Nueva estantería'; item.tag = ''; }
      if (c.wall) {
        const w = screenToWall(p.x, p.y, room.size);
        if (!w) return toast('Toca una pared para colgarlo');
        w.p = Math.min(w.p, room.size - c.span);
        if (!canPlaceWall(room, item, w.wall, w.p)) return toast('No cabe ahí');
        Object.assign(item, w);
      } else {
        const f = screenToFloor(p.x, p.y);
        let x = Math.floor(f.x), y = Math.floor(f.y);
        if (!canPlace(room, item, x, y)) {
          item.rot = 1;
          if (!canPlace(room, item, x, y)) return toast('No cabe ahí, prueba otro sitio');
        }
        Object.assign(item, { x, y });
      }
      room.items.push(item);
      selectedId = item.id;
      placing = null;
      saveRoom(room);
      draw(); renderEditBar();
      if (item.type === 'shelf') renameShelf(item);
      return;
    }
    selectedId = id && id !== selectedId ? id : (id ? selectedId : null);
    if (!id) selectedId = null;
    draw(); renderEditBar();
  }

  async function renameShelf(it) {
    const name = await promptDialog('Nombre de la estantería', it.name || '');
    if (name) { it.name = name; await saveRoom(room); draw(); }
  }

  // ---- Barra inferior ----
  const continueCard = h('div');
  const tools = h('div', { class: 'room-tools' },
    iconBtn('zoomin', () => { view.scale *= 1.25; clampView(); applyView(); }, 'Acercar'),
    iconBtn('zoomout', () => { view.scale /= 1.25; clampView(); applyView(); }, 'Alejar'),
    h('button', { class: 'pill', onclick: () => setEdit(true) }, icon('brush', 18), 'Decorar'));
  const editBar = h('div', { class: 'edit-bar hidden' });
  overlay.append(tools, continueCard, editBar);

  async function renderContinue() {
    continueCard.innerHTML = '';
    if (edit) return;
    const started = books.filter(isStarted).sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0));
    const reading = started[0];
    if (!reading) {
      if (!books.length) {
        continueCard.append(h('div', { class: 'continue-card empty' },
          h('div', {}, h('strong', {}, 'Tu biblioteca está vacía'), h('p', { class: 'muted' }, 'Añade un EPUB o un PDF, o compártelo desde Telegram.')),
          btn('Añadir', pickFiles, 'primary')));
      }
      return;
    }
    const url = coverUrl(reading);
    continueCard.append(h('button', { class: 'continue-card', onclick: () => nav(`#/leer/${reading.id}`) },
      url ? h('img', { src: url, alt: '' }) : h('div', { class: 'mini-cover', style: { background: reading.spineColor } }),
      h('div', { class: 'cc-text' },
        h('span', { class: 'muted small' }, 'Seguir leyendo'),
        h('strong', {}, reading.title),
        h('div', { class: 'progress thin' }, h('div', { class: 'progress-fill', style: { width: `${Math.round((reading.progress || 0) * 100)}%` } }))),
      h('span', { class: 'cc-pct' }, `${Math.round((reading.progress || 0) * 100)}%`)));
    if (started.length) {
      continueCard.append(h('button', { class: 'pill started-btn', onclick: () => showStarted(started) }, icon('book', 16), started.length > 1 ? `Ver mis ${started.length} libros empezados` : 'Ver libros empezados'));
    }
  }
  // Libros empezados: tocar abre el libro; mantener pulsado da opciones (quitar de la lista, con confirmación)
  function showStarted(list) {
    const s = sheet(h('div', { class: 'stack' }, list.map((b) => {
      const url = coverUrl(b), pct = Math.round((b.progress || 0) * 100);
      const card = h('button', { class: 'continue-card flat started-card' },
        url ? h('img', { src: url, alt: '' }) : h('div', { class: 'mini-cover', style: { background: b.spineColor } }),
        h('div', { class: 'cc-text' },
          h('strong', {}, b.title),
          h('span', { class: 'muted small' }, b.author || ''),
          h('div', { class: 'progress thin' }, h('div', { class: 'progress-fill', style: { width: `${pct}%` } }))),
        h('span', { class: 'cc-pct' }, `${pct}%`));
      onLongPress(card, () => startedOptions(b, s), () => { s.close(); nav(`#/leer/${b.id}`); });
      return card;
    }), h('p', { class: 'muted small', style: { textAlign: 'center' } }, 'Mantén pulsado un libro para quitarlo de esta lista.')), { title: 'Libros empezados', tall: true });
  }
  function startedOptions(b, parent) {
    const o = sheet(h('div', { class: 'stack' },
      btn([icon('trash', 18), ' Quitar de empezados'], async () => {
        o.close();
        if (!(await confirmDialog(`¿Quitar «${b.title}» de tus libros empezados? Seguirá en tu biblioteca y se guarda por dónde ibas.`, { ok: 'Quitar', danger: true }))) return;
        b.status = 'pendiente';
        await putBook(b);
        parent.close();
        toast('Quitado de empezados');
        window.dispatchEvent(new Event('library-changed'));
      }, 'danger'),
      btn([icon('book', 18), ' Ver la ficha del libro'], () => { o.close(); parent.close(); openBook(b.id, { nav }); }, 'ghost')),
    { title: b.title });
  }
  renderContinue();

  function setEdit(on) {
    edit = on; selectedId = null; placing = null;
    tools.classList.toggle('hidden', on);
    editBar.classList.toggle('hidden', !on);
    wrap.classList.toggle('editing', on);
    draw(); renderEditBar(); renderContinue();
  }

  function renderEditBar() {
    editBar.innerHTML = '';
    if (!edit) return;
    const sel = room.items.find((i) => i.id === selectedId);
    if (sel) {
      const c = catalogOf(sel.type);
      const actions = h('div', { class: 'row gap wrap center' });
      if (!c.wall && c.w !== c.d) actions.append(h('button', { class: 'pill', onclick: () => rotate(sel) }, icon('rotate', 18), 'Girar'));
      if (c.wall) actions.append(h('button', { class: 'pill', onclick: () => moveWall(sel) }, icon('move', 18), 'Otra pared'));
      if (sel.type === 'shelf') actions.append(h('button', { class: 'pill', onclick: () => renameShelf(sel) }, icon('edit', 18), 'Nombre'));
      if (c.colorable || sel.type === 'shelf') {
        const input = h('input', { type: 'color', value: sel.color || c.color || '#888888', class: 'color-input' });
        input.addEventListener('input', () => { sel.color = input.value; draw(); });
        input.addEventListener('change', () => saveRoom(room));
        actions.append(h('label', { class: 'pill' }, input, 'Color'));
      }
      actions.append(h('button', { class: 'pill danger', onclick: () => remove(sel) }, icon('trash', 18), 'Quitar'));
      editBar.append(
        h('div', { class: 'edit-head' }, h('strong', {}, sel.name || c.label), h('span', { class: 'muted small' }, c.wall ? 'Arrástralo por la pared' : 'Arrástralo para moverlo'),
          btn('Listo', () => { selectedId = null; draw(); renderEditBar(); }, 'ghost small')),
        actions);
      return;
    }
    // Pestañas: muebles de siempre, los de cada tema (castillo, cuento…) y, si toca, la decoración de temporada
    const seasons = activeSeasons(), groups = Object.keys(GROUPS);
    if (palTab !== 'muebles' && !seasons.includes(palTab) && !groups.includes(palTab)) palTab = 'muebles';
    const tabs = h('div', { class: 'chips scroll pal-tabs' },
      [...seasons.map((k) => [k, `${SEASONS[k].emoji} ${SEASONS[k].label}`]), ['muebles', 'Muebles'], ...groups.map((k) => [k, GROUPS[k]])].map(([k, l]) =>
        h('button', { class: `chip ${palTab === k ? 'on' : ''}`, onclick: () => { palTab = k; placing = null; renderEditBar(); } }, l)));
    const palette = h('div', { class: 'palette' });
    for (const c of CATALOG.filter((x) => (x.season || x.group || 'muebles') === palTab)) {
      const pv = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      pv.innerHTML = itemPreview(c.type);
      const b = h('button', { class: `pal-item ${placing?.type === c.type ? 'on' : ''}`, onclick: () => { placing = placing?.type === c.type ? null : c; renderEditBar(); if (placing) toast(c.wall ? 'Toca una pared para colgarlo' : 'Toca el suelo para colocarlo'); } }, pv, h('span', {}, c.label));
      palette.append(b);
    }
    editBar.append(
      h('div', { class: 'edit-head' },
        h('strong', {}, placing ? `Colocar: ${placing.label}` : 'Decorar'),
        h('span', { class: 'muted small' }, placing ? 'Toca dónde quieres ponerlo' : 'Toca un objeto para editarlo'),
        h('div', { class: 'row gap' },
          h('button', { class: 'pill', onclick: themesSheet }, icon('room', 18), 'Temas'),
          h('button', { class: 'pill', onclick: roomOptions }, icon('settings', 18), 'Sala'),
          btn('Terminar', () => setEdit(false), 'primary small'))),
      tabs, palette);
    requestAnimationFrame(() => { const on = tabs.querySelector('.on'); if (on) tabs.scrollLeft = on.offsetLeft - tabs.clientWidth / 2 + on.offsetWidth / 2; });
    // Ajustar el encuadre de las miniaturas una vez en pantalla
    requestAnimationFrame(() => palette.querySelectorAll('svg').forEach((s) => {
      try { const bb = s.getBBox(); s.setAttribute('viewBox', `${bb.x - 3} ${bb.y - 3} ${bb.width + 6} ${bb.height + 6}`); } catch {}
    }));
  }

  function rotate(it) {
    const nr = (it.rot + 1) % 2;
    if (canPlace(room, it, it.x, it.y, nr)) { it.rot = nr; }
    else {
      const fp = footprint({ ...it, rot: nr });
      let done = false;
      for (const [dx, dy] of [[-1, 0], [0, -1], [-1, -1], [1, 0], [0, 1]]) {
        if (canPlace(room, it, it.x + dx, it.y + dy, nr)) { it.x += dx; it.y += dy; it.rot = nr; done = true; break; }
      }
      if (!done) return toast(fp ? 'No hay sitio para girarlo aquí' : '');
    }
    saveRoom(room); draw();
  }
  function moveWall(it) {
    const other = it.wall === 'a' ? 'b' : 'a';
    const span = catalogOf(it.type).span;
    for (let p = 0; p <= room.size - span; p++) {
      if (canPlaceWall(room, it, other, p)) { it.wall = other; it.p = p; saveRoom(room); draw(); return; }
    }
    toast('No hay sitio libre en la otra pared');
  }
  async function remove(it) {
    if (it.type === 'shelf') {
      const n = books.filter((b) => b.shelfId === it.id).length;
      const others = room.items.filter((i) => i.type === 'shelf' && i.id !== it.id).sort((a, b) => !!a.auto - !!b.auto);
      if (!others.length) return toast('Necesitas al menos una estantería');
      if (n && !(await confirmDialog(`Esta estantería tiene ${n} libro(s). Se moverán a «${others[0].name}».`, { ok: 'Quitar', danger: true }))) return;
      for (const b of books.filter((b) => b.shelfId === it.id)) { b.shelfId = others[0].id; await putBook(b); }
    }
    room.items = room.items.filter((i) => i.id !== it.id);
    selectedId = null;
    await saveRoom(room);
    draw(); renderEditBar();
  }

  function roomOptions() {
    const body = h('div', { class: 'stack' });
    body.append(h('button', { class: 'pill', onclick: () => { s.close(); themesSheet(); } }, icon('room', 18), 'Elegir una sala ya decorada'));
    body.append(h('label', { class: 'label' }, 'Color de las paredes'));
    const walls = h('div', { class: 'swatches' });
    for (const c of WALL_OPTIONS) walls.append(h('button', { class: `swatch ${room.wall === c ? 'on' : ''}`, style: { background: c }, onclick: () => { room.wall = c; saveRoom(room); draw(); s.close(); roomOptions(); } }));
    const custom = h('input', { type: 'color', value: room.wall, class: 'color-input' });
    custom.addEventListener('change', () => { room.wall = custom.value; saveRoom(room); draw(); });
    walls.append(h('label', { class: 'swatch custom' }, custom, '+'));
    body.append(walls);
    body.append(h('label', { class: 'label' }, 'Pared'));
    const wstyles = h('div', { class: 'chips' });
    for (const w of WALL_STYLES) wstyles.append(h('button', { class: `chip ${(room.wallStyle || 'plain') === w.id ? 'on' : ''}`, onclick: () => { room.wallStyle = w.id; saveRoom(room); draw(); s.close(); roomOptions(); } }, w.label));
    body.append(wstyles);
    body.append(h('label', { class: 'label' }, 'Suelo'));
    const floors = h('div', { class: 'chips' });
    for (const f of FLOOR_OPTIONS) floors.append(h('button', { class: `chip ${room.floor === f.id ? 'on' : ''}`, onclick: () => { room.floor = f.id; saveRoom(room); draw(); s.close(); roomOptions(); } }, f.label));
    body.append(floors);
    body.append(h('label', { class: 'label' }, `Tamaño de la sala: ${room.size} × ${room.size}`));
    const sizes = h('div', { class: 'chips' });
    for (const n of [6, 8, 10, 12, 14, 16, 20]) sizes.append(h('button', { class: `chip ${room.size === n ? 'on' : ''}`, onclick: () => resize(n) }, `${n} × ${n}`));
    body.append(sizes);
    const s = sheet(body, { title: 'La sala' });
    function resize(n) {
      const fits = room.items.every((it) => {
        const c = catalogOf(it.type);
        if (c.wall) return it.p + c.span <= n;
        const fp = footprint(it); return it.x + fp.w <= n && it.y + fp.d <= n;
      });
      if (!fits) return toast('Hay objetos fuera de ese tamaño. Muévelos primero.');
      room.size = n; saveRoom(room);
      Object.assign(base, roomViewBox(n));
      view = { cx: base.x + base.w / 2, cy: base.y + base.h / 2, scale: 1 };
      draw(); s.close(); roomOptions();
    }
  }

  // Salas ya decoradas: cambian paredes, suelo y adornos; las estanterías y los libros no se tocan
  function themesSheet() {
    const body = h('div', { class: 'stack' });
    body.append(h('p', { class: 'muted small' }, 'Elige una sala ya decorada. Tus estanterías y tus libros se quedan como están, y después puedes añadir, mover o quitar lo que quieras.'));
    if (room.prevDecor) {
      const prev = themeById(room.prevDecor.theme);
      body.append(h('button', { class: 'pill', onclick: async () => {
        restorePrevDecor(room); await saveRoom(room); s.close(); draw(); renderEditBar();
        toast('Has vuelto a la decoración anterior');
      } }, icon('rotate', 18), prev ? `Volver a la anterior (${prev.label})` : 'Volver a la decoración anterior'));
    }
    const grid = h('div', { class: 'theme-grid' });
    for (const t of THEMES) {
      const pv = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const sample = themeSampleRoom(t);
      const vb = roomViewBox(8);
      pv.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
      pv.innerHTML = renderRoom(sample, SAMPLE_BOOKS, { labels: false, uid: 'th-' + t.id + '-' });
      const on = room.theme === t.id;
      grid.append(h('button', { class: `theme-card ${on ? 'on' : ''}`, onclick: () => pick(t) }, pv,
        h('strong', {}, t.label), h('span', { class: 'muted small' }, on ? 'Es la que tienes ahora' : t.desc)));
    }
    body.append(grid);
    const s = sheet(body, { title: 'Salas decoradas', tall: true });
    async function pick(t) {
      const decor = room.items.filter((i) => i.type !== 'shelf').length;
      if (decor && !(await confirmDialog(`¿Decorar la sala como «${t.label}»? Se cambian las paredes, el suelo y los adornos que tienes ahora. Tus estanterías y tus libros se quedan igual, y podrás volver a la decoración actual desde aquí.`, { ok: 'Usar esta sala' }))) return;
      applyTheme(room, t);
      await saveRoom(room);
      s.close(); draw(); renderEditBar();
      toast(`Sala «${t.label}» lista`);
    }
  }

  // Refrescar el reloj y la ventana cada minuto
  const timer = setInterval(() => { if (!gesture) draw(); }, 60000);
  return () => clearInterval(timer);
}

// ---------------------------------------------------------------------------
// Vista de lista
// ---------------------------------------------------------------------------
const STATUS = { pendiente: 'Pendiente', leyendo: 'Leyendo', leido: 'Leído', abandonado: 'Abandonado' };
export { STATUS };

async function listView(container, nav) {
  const books = await getBooks();
  const tags = allTags(books);
  const room = await getRoom();
  const app = await getAppSettings();
  let filter = app.listFilter || 'all';
  let group = app.listGroup || 'tag';
  let sort = app.listSort || 'recent';

  const chips = h('div', { class: 'chips scroll' });
  const controls = h('div', { class: 'list-controls' },
    selectEl('Agrupar', group, LIST_GROUPS, (v) => { group = v; app.listGroup = v; saveAppSettings(app); draw(); }),
    selectEl('Ordenar', sort, LIST_SORTS, (v) => { sort = v; app.listSort = v; saveAppSettings(app); draw(); }));
  const list = h('div', { class: 'book-groups' });
  container.append(h('div', { class: 'list-view' }, chips, controls, list));

  function renderChips() {
    chips.innerHTML = '';
    const opts = [['all', 'Todos'], ...(books.some((b) => b.nuevo) ? [['nuevos', `Nuevos · ${books.filter((b) => b.nuevo).length}`]] : []), ...(books.some(isStarted) ? [['leyendo', `Empezados · ${books.filter(isStarted).length}`]] : []), ['pendiente', 'Pendientes'], ['leido', 'Leídos'], ...tags.map((t) => ['t:' + t.name, '#' + t.name])];
    for (const [id, label] of opts) {
      chips.append(h('button', { class: `chip ${filter === id ? 'on' : ''}`, onclick: () => { filter = id; app.listFilter = id; saveAppSettings(app); renderChips(); draw(); } }, label));
    }
  }

  function draw() {
    list.innerHTML = '';
    let arr = books.filter((b) => filter === 'all' || (filter === 'nuevos' ? b.nuevo : filter === 'leyendo' ? isStarted(b) : filter.startsWith('t:') ? hasTag(b, tagKey(filter.slice(2))) : b.status === filter));
    const cmp = {
      recent: (a, b) => (b.lastOpenedAt || b.addedAt) - (a.lastOpenedAt || a.addedAt),
      added: (a, b) => (b.addedAt || 0) - (a.addedAt || 0),
      title: (a, b) => a.title.localeCompare(b.title),
      author: (a, b) => (a.author || '').localeCompare(b.author || ''),
      rating: (a, b) => (b.rating || 0) - (a.rating || 0),
      progress: (a, b) => (b.progress || 0) - (a.progress || 0),
    }[sort] || ((a, b) => (b.lastOpenedAt || b.addedAt) - (a.lastOpenedAt || a.addedAt));
    arr.sort(cmp);
    if (!arr.length) {
      list.append(h('div', { class: 'empty-state' }, h('p', {}, books.length ? 'No hay libros con este filtro.' : 'Aún no tienes libros.'), books.length ? null : btn('Añadir libro', pickFiles, 'primary')));
      return;
    }
    const groups = new Map();
    // Las estanterías en el mismo orden que en la sala; los libros sin una válida van a la primera, como en la sala
    const manualShelves = room.items.filter((i) => i.type === 'shelf' && !i.auto);
    const shelfRank = (name) => { const i = manualShelves.findIndex((s) => s.name === name); return i < 0 ? 999 : i; };
    const keyOf = (b) => {
      if (group === 'saga') return b.saga || 'Libros independientes';
      if (group === 'shelf') return (manualShelves.find((s) => s.id === b.shelfId) || manualShelves[0])?.name || 'Sin estantería';
      if (group === 'author') return b.author || 'Autor desconocido';
      if (group === 'status') return STATUS[b.status] || 'Pendiente';
      return '';
    };
    const put = (k, b) => { if (!groups.has(k)) groups.set(k, []); groups.get(k).push(b); };
    for (const b of arr) {
      // Con «Por #» un libro sale en cada uno de sus #
      if (group === 'tag') { if (b.tags?.length) b.tags.forEach((t) => put('#' + t, b)); else put('Sin #', b); }
      else put(keyOf(b), b);
    }
    const keys = [...groups.keys()].sort((a, b) => {
      if (group === 'shelf') return shelfRank(a) - shelfRank(b);
      const last = /^(Sin |Libros independientes|Autor desconocido)/;
      if (group === 'tag' && last.test(a) === last.test(b)) return groups.get(b).length - groups.get(a).length || a.localeCompare(b);
      if (last.test(a) !== last.test(b)) return last.test(a) ? 1 : -1;
      return a.localeCompare(b);
    });
    for (const k of keys) {
      let items = groups.get(k);
      if (group === 'saga' && k !== 'Libros independientes') items = sortBooksForShelf(items);
      list.append(h('section', { class: 'book-group' },
        k ? h('h3', { class: 'group-title' }, k, h('span', { class: 'muted small' }, ` · ${items.length}`)) : null,
        h('div', { class: 'cover-grid' }, items.map((b) => bookCard(b, nav)))));
    }
  }
  renderChips(); draw();
  return null;
}

function selectEl(label, value, options, onChange) {
  const sel = h('select', { class: 'select', 'aria-label': label });
  for (const [v, l] of options) sel.append(h('option', { value: v, selected: v === value }, l));
  sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}

export function bookCard(b, nav) {
  const url = coverUrl(b);
  const pct = Math.round((b.progress || 0) * 100);
  return h('button', { class: 'book-card', onclick: () => openBook(b.id, { nav }) },
    h('div', { class: 'cover', style: { '--spine': b.spineColor } },
      url ? h('img', { src: url, alt: '', loading: 'lazy' }) : h('div', { class: 'cover-fallback', html: `<span>${escapeHtml(b.title)}</span><small>${escapeHtml(b.author || '')}</small>` }),
      b.saga ? h('span', { class: 'saga-badge' }, b.sagaIndex ? `#${b.sagaIndex}` : 'Saga') : null,
      pct > 0 ? h('div', { class: 'progress thin on-cover' }, h('div', { class: 'progress-fill', style: { width: `${pct}%` } })) : null),
    h('div', { class: 'book-card-title' }, b.title),
    h('div', { class: 'book-card-author muted' }, b.author || ''),
    b.rating ? h('div', { class: 'mini-stars' }, '★'.repeat(Math.round(b.rating))) : null);
}

// Mantener pulsado (móvil) o clic derecho (ordenador). Un toque normal hace onTap.
function onLongPress(el, onLong, onTap) {
  let timer = null, fired = false, start = null;
  const cancel = () => { clearTimeout(timer); timer = null; };
  el.addEventListener('pointerdown', (e) => {
    fired = false; start = [e.clientX, e.clientY];
    cancel();
    timer = setTimeout(() => { fired = true; timer = null; navigator.vibrate?.(15); onLong(); }, 550);
  });
  el.addEventListener('pointermove', (e) => { if (start && Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 10) cancel(); });
  el.addEventListener('pointerup', cancel);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('contextmenu', (e) => { e.preventDefault(); if (!fired) { cancel(); fired = true; onLong(); } });
  el.addEventListener('click', (e) => { if (fired) { e.preventDefault(); fired = false; return; } onTap(); });
}
