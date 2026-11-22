// Lector EPUB con ajustes de lectura, barra de estado y registro de estadísticas.
import ePub from 'epubjs';
import { h, icon, iconBtn, sheet, toast, stars, fmtDuration, todayKey, closeAllSheets } from '../ui.js';
import { getBook, putBook, getFile, addDay } from '../db.js';
import { getReaderSettings, saveReaderSettings } from '../store.js';

export const THEMES = {
  paper: { name: 'Papel', bg: '#fbf6ec', fg: '#3a3128', accent: '#a0673f' },
  sepia: { name: 'Sepia', bg: '#f1e4c8', fg: '#5b4636', accent: '#94572f' },
  sage: { name: 'Salvia', bg: '#e4eadc', fg: '#2f3a2c', accent: '#4f7a4b' },
  mist: { name: 'Niebla', bg: '#dfe3e8', fg: '#2b3138', accent: '#3f6e8c' },
  dusk: { name: 'Atardecer', bg: '#2e2a33', fg: '#ddd4c6', accent: '#e0a15b' },
  night: { name: 'Noche', bg: '#1b1916', fg: '#cbbfa9', accent: '#d79a5a' },
  oled: { name: 'Negro', bg: '#000000', fg: '#a8a196', accent: '#c98a4a' },
  custom: { name: 'Mío', bg: null, fg: null, accent: '#a0673f' },
};

export const FONTS = [
  ['original', 'Original del libro'],
  ['Literata', 'Literata'],
  ['Lora', 'Lora'],
  ['Merriweather', 'Merriweather'],
  ['EB Garamond', 'Garamond'],
  ['Atkinson Hyperlegible', 'Atkinson (muy legible)'],
  ['Nunito', 'Nunito (sin serifa)'],
  ['Georgia', 'Georgia'],
  ['system-ui', 'Del sistema'],
];

function themeColors(s) {
  const t = THEMES[s.theme] || THEMES.paper;
  return { bg: t.bg || s.customBg, fg: t.fg || s.customFg, accent: t.accent };
}

function userCss(s) {
  const { fg, accent } = themeColors(s);
  const font = s.font === 'original' ? null : (s.font === 'system-ui' ? 'system-ui, sans-serif' : `'${s.font}', Georgia, serif`);
  const textSel = 'body, p, div, span, li, blockquote, td, dd, dt, section, article';
  return `
    html, body { background: transparent !important; }
    html { color: ${fg} !important; }
    body { color: ${fg} !important; font-size: ${s.fontSize}px !important; letter-spacing: ${s.letterSpacing}em; -webkit-font-smoothing: antialiased; }
    ${textSel} { color: ${fg} !important; line-height: ${s.lineHeight} !important; ${font ? `font-family: ${font} !important;` : ''} }
    h1, h2, h3, h4, h5, h6 { color: ${fg} !important; ${font ? `font-family: ${font} !important;` : ''} line-height: 1.3 !important; }
    p { margin-top: 0 !important; margin-bottom: ${s.paraSpacing}em !important; text-align: ${s.align} !important;
        ${s.indent ? '' : 'text-indent: 0 !important;'} hyphens: ${s.hyphens ? 'auto' : 'manual'} !important; -webkit-hyphens: ${s.hyphens ? 'auto' : 'manual'} !important; }
    a, a * { color: ${accent} !important; }
    img, svg, video { max-width: 100% !important; height: auto; }
    ::selection { background: ${accent}55; }
  `;
}

export async function renderReader(root, bookId) {
  const book = await getBook(bookId);
  const file = await getFile(bookId);
  if (!book || !file) { toast('No se encontró el libro'); location.hash = '#/'; return; }
  let s = await getReaderSettings();

  document.body.classList.add('reading');
  const viewer = h('div', { class: 'reader-viewer' });
  const page = h('div', { class: 'reader-page' }, viewer);
  const chapterEl = h('span', { class: 'rs-chapter' });
  const clockEl = h('span', { class: 'rs-clock' });
  const batteryEl = h('span', { class: 'rs-battery' });
  const progressEl = h('span', { class: 'rs-progress' });
  const leftEl = h('span', { class: 'rs-left' });
  const statusTop = h('div', { class: 'reader-status top' }, chapterEl, h('span', { class: 'row gap' }, batteryEl, clockEl));
  const statusBottom = h('div', { class: 'reader-status bottom' }, leftEl, progressEl);
  const dim = h('div', { class: 'reader-dim' });
  const warm = h('div', { class: 'reader-warm' });

  const slider = h('input', { type: 'range', min: 0, max: 1000, value: Math.round((book.progress || 0) * 1000), class: 'reader-slider', 'aria-label': 'Posición en el libro' });
  const sliderLabel = h('span', { class: 'small' });
  const bmBtn = iconBtn('bookmark', () => toggleBookmark(), 'Marcador');
  const topBar = h('div', { class: 'reader-bar top' },
    iconBtn('back', () => close(), 'Volver a la biblioteca'),
    h('div', { class: 'rb-title' }, h('strong', {}, book.title), h('span', { class: 'muted small' }, book.author || '')),
    bmBtn,
    iconBtn('toc', () => openToc(), 'Índice'),
    iconBtn('font', () => openSettings(), 'Ajustes de lectura'));
  const bottomBar = h('div', { class: 'reader-bar bottom' },
    iconBtn('back', () => rendition?.prev(), 'Página anterior'), slider, sliderLabel,
    h('span', { class: 'flip' }, iconBtn('back', () => rendition?.next(), 'Página siguiente')));
  const loading = h('div', { class: 'reader-loading' }, h('div', { class: 'spinner' }), 'Abriendo libro…');

  const shell = h('div', { class: 'reader' }, statusTop, page, statusBottom, dim, warm, topBar, bottomBar, loading);
  root.append(shell);

  let uiVisible = false;
  const setUi = (v) => { uiVisible = v; shell.classList.toggle('ui', v); };

  // ---- Libro ----
  const epub = ePub(await file.arrayBuffer());
  let rendition = null;
  let toc = [];
  let currentLoc = null;
  let lastProgress = book.progress || 0;

  epub.loaded.navigation.then((nav) => { toc = nav.toc || []; }).catch(() => {});

  function flatToc(items, depth = 0, out = []) {
    for (const it of items) { out.push({ ...it, depth }); if (it.subitems?.length) flatToc(it.subitems, depth + 1, out); }
    return out;
  }
  function chapterFor(href) {
    if (!href) return '';
    const base = href.split('#')[0];
    const flat = flatToc(toc);
    const hit = flat.find((t) => t.href.split('#')[0].endsWith(base) || base.endsWith(t.href.split('#')[0]));
    return hit ? hit.label.trim() : '';
  }

  function applyLook() {
    const { bg, fg } = themeColors(s);
    shell.style.setProperty('--r-bg', bg);
    shell.style.setProperty('--r-fg', fg);
    page.style.padding = `0 ${s.margin}px`;
    dim.style.opacity = String((100 - s.brightness) / 100 * 0.75);
    warm.style.opacity = String(s.warmth / 100 * 0.35);
    statusTop.classList.toggle('hidden', !s.showChapter && !s.showClock && !s.showBattery);
    chapterEl.style.visibility = s.showChapter ? 'visible' : 'hidden';
    clockEl.style.display = s.showClock ? '' : 'none';
    batteryEl.style.display = s.showBattery ? '' : 'none';
    progressEl.style.display = s.showProgress ? '' : 'none';
    leftEl.style.display = s.showTimeLeft ? '' : 'none';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
  }

  const fontsHref = new URL('fonts/fonts.css', document.baseURI).href;
  function styleContents(contents) {
    const doc = contents.document;
    if (!doc.getElementById('rincon-fonts')) {
      const link = doc.createElement('link');
      link.id = 'rincon-fonts'; link.rel = 'stylesheet'; link.href = fontsHref;
      doc.head.append(link);
    }
    let st = doc.getElementById('rincon-user');
    if (!st) { st = doc.createElement('style'); st.id = 'rincon-user'; doc.head.append(st); }
    st.textContent = userCss(s);
    doc.documentElement.lang ||= book.language || 'es';
  }

  async function build(target) {
    if (rendition) { rendition.destroy(); viewer.innerHTML = ''; }
    const scroll = s.flow === 'scroll';
    rendition = epub.renderTo(viewer, {
      width: '100%', height: '100%',
      flow: scroll ? 'scrolled-doc' : 'paginated',
      manager: scroll ? 'continuous' : 'default',
      spread: s.spread === 'none' ? 'none' : 'auto',
      minSpreadWidth: 900,
      allowScriptedContent: false,
    });
    rendition.hooks.content.register(styleContents);
    rendition.on('relocated', onRelocated);
    rendition.on('click', onClick);
    rendition.on('touchstart', onTouchStart);
    rendition.on('touchend', onTouchEnd);
    rendition.on('keyup', onKey);
    rendition.on('mouseup', () => markActive());
    await rendition.display(target || book.cfi || undefined);
    loading.remove();
  }

  let restyling = null;
  async function refreshStyles() {
    // Guardar la posición antes de que el cambio de estilo mueva el texto
    const cfi = restyling || currentLoc?.start?.cfi;
    restyling = cfi;
    applyLook();
    if (!rendition) return;
    rendition.getContents().forEach(styleContents);
    rendition.resize();
    if (cfi) await rendition.display(cfi);
    restyling = null;
  }

  // Ubicaciones (para el % y la barra)
  async function ensureLocations() {
    try {
      if (book.locations) epub.locations.load(book.locations);
      else {
        await epub.ready;
        await epub.locations.generate(1200);
        book.locations = epub.locations.save();
        await putBook(book);
      }
      if (currentLoc) onRelocated(currentLoc);
    } catch (e) { console.warn('locations', e); }
  }

  function onRelocated(loc) {
    currentLoc = loc;
    const cfi = loc.start.cfi;
    let pct = book.progress || 0;
    if (epub.locations.length()) pct = epub.locations.percentageFromCfi(cfi);
    if (loc.atEnd) pct = 1;
    const delta = pct - lastProgress;
    if (delta > 0 && delta < 0.03 && !restyling) {
      session.pages += delta * (book.pages || 300);
      book.speedP = (book.speedP || 0) + delta;
    }
    lastProgress = pct;
    book.cfi = cfi;
    book.progress = pct;
    book.lastOpenedAt = Date.now();
    if (book.status === 'pendiente' && pct > 0.005) { book.status = 'leyendo'; book.startedAt ||= Date.now(); }
    saveSoon();
    markActive();
    // Barra de estado
    chapterEl.textContent = chapterFor(loc.start.href) || book.title;
    const displayed = loc.start.displayed;
    const pageInfo = displayed && s.flow !== 'scroll' ? `pág. ${displayed.page} de ${displayed.total} · ` : '';
    progressEl.textContent = epub.locations.length() ? `${pageInfo}${Math.round(pct * 100)}%` : pageInfo.replace(/ · $/, '');
    slider.value = Math.round(pct * 1000);
    sliderLabel.textContent = `${Math.round(pct * 100)}%`;
    updateLeft();
    bmBtn.classList.toggle('on', (book.bookmarks || []).some((b) => b.cfi === cfi));
    if (loc.atEnd && book.status !== 'leido') setTimeout(finishedPrompt, 400);
  }

  function updateLeft() {
    const secs = book.speedS || 0, p = book.speedP || 0;
    if (secs > 180 && p > 0.002) {
      const left = (1 - (book.progress || 0)) * secs / p;
      leftEl.textContent = left < 60 ? 'Casi terminado' : `≈ ${fmtDuration(left)} para terminar`;
    } else leftEl.textContent = '';
  }

  let saveTimer;
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(() => putBook(book), 800); }

  // ---- Navegación por toques ----
  let touch = null, swiped = false;
  function onTouchStart(e) {
    const t = e.changedTouches?.[0]; if (!t) return;
    touch = { x: t.screenX, y: t.screenY, time: Date.now() };
  }
  function onTouchEnd(e) {
    const t = e.changedTouches?.[0]; if (!t || !touch) return;
    const dx = t.screenX - touch.x, dy = t.screenY - touch.y;
    if (s.flow !== 'scroll' && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3 && Date.now() - touch.time < 800) {
      swiped = true; setTimeout(() => { swiped = false; }, 400);
      dx < 0 ? rendition.next() : rendition.prev();
      setUi(false);
    }
    touch = null;
  }
  function onClick(e) {
    markActive();
    if (swiped) return;
    if (e.target?.closest?.('a')) return;
    const sel = e.view?.getSelection?.();
    if (sel && sel.toString().trim()) return;
    const frame = e.view?.frameElement;
    const fr = frame ? frame.getBoundingClientRect() : { left: 0 };
    const vr = viewer.getBoundingClientRect();
    const x = (fr.left + e.clientX - vr.left) / vr.width;
    handleTap(x);
  }
  function handleTap(x) {
    if (uiVisible) return setUi(false);
    if (s.flow === 'scroll') return setUi(true);
    if (s.tapZones === 'next') {
      if (x < 0.25) return rendition.prev();
      if (x > 0.4 && x < 0.6) return setUi(true);
      return rendition.next();
    }
    if (x < 0.3) return rendition.prev();
    if (x > 0.7) return rendition.next();
    setUi(true);
  }
  // Toques en los márgenes (fuera del iframe)
  page.addEventListener('click', (e) => {
    if (e.target !== page && e.target !== viewer) return;
    const vr = viewer.getBoundingClientRect();
    handleTap((e.clientX - vr.left) / vr.width);
  });
  for (const el of [statusTop, statusBottom]) el.addEventListener('click', () => setUi(!uiVisible));

  function onKey(e) {
    markActive();
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') rendition.next();
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') rendition.prev();
    if (e.key === 'Escape') setUi(!uiVisible);
  }
  const docKey = (e) => { if (!document.querySelector('.sheet-backdrop')) onKey(e); };
  document.addEventListener('keyup', docKey);

  slider.addEventListener('input', () => { sliderLabel.textContent = `${Math.round(slider.value / 10)}%`; });
  slider.addEventListener('change', () => {
    if (!epub.locations.length()) return toast('Calculando páginas, espera un momento…');
    rendition.display(epub.locations.cfiFromPercentage(slider.value / 1000));
  });

  // ---- Estadísticas: tiempo activo de lectura ----
  const session = { seconds: 0, pages: 0 };
  let lastActive = Date.now();
  function markActive() { lastActive = Date.now(); }
  const tick = setInterval(() => {
    if (document.visibilityState === 'visible' && Date.now() - lastActive < 3 * 60 * 1000) {
      session.seconds += 5;
      book.speedS = (book.speedS || 0) + 5;
    }
  }, 5000);
  async function flushStats() {
    const secs = session.seconds, pages = Math.round(session.pages);
    if (!secs && !pages) return;
    session.seconds = 0; session.pages = 0;
    book.readSeconds = (book.readSeconds || 0) + secs;
    await addDay(todayKey(), secs, pages, book.id);
    await putBook(book);
  }
  const flushTimer = setInterval(flushStats, 30000);
  const onVis = () => { if (document.visibilityState === 'hidden') flushStats(); else { requestWake(); markActive(); } };
  document.addEventListener('visibilitychange', onVis);

  // ---- Reloj y batería ----
  const updateClock = () => { clockEl.textContent = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); };
  updateClock();
  const clockTimer = setInterval(updateClock, 15000);
  let battery = null;
  const updateBattery = () => { if (battery) batteryEl.textContent = `${battery.charging ? '⚡' : '🔋'} ${Math.round(battery.level * 100)}%`; };
  navigator.getBattery?.().then((b) => { battery = b; updateBattery(); b.addEventListener('levelchange', updateBattery); b.addEventListener('chargingchange', updateBattery); }).catch(() => {});

  // ---- Pantalla siempre encendida ----
  let wake = null;
  async function requestWake() {
    if (!s.keepAwake || !('wakeLock' in navigator) || wake) return;
    try { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } catch {}
  }
  requestWake();

  // ---- Marcadores e índice ----
  function toggleBookmark() {
    if (!currentLoc) return;
    const cfi = currentLoc.start.cfi;
    book.bookmarks ||= [];
    const i = book.bookmarks.findIndex((b) => b.cfi === cfi);
    if (i >= 0) { book.bookmarks.splice(i, 1); toast('Marcador quitado'); }
    else {
      book.bookmarks.push({ cfi, label: chapterEl.textContent || book.title, pct: book.progress, at: Date.now() });
      toast('Página marcada');
    }
    bmBtn.classList.toggle('on', i < 0);
    saveSoon();
  }

  function openToc() {
    const listToc = h('div', { class: 'toc-list' });
    const listBm = h('div', { class: 'toc-list hidden' });
    const tabs = h('div', { class: 'seg' },
      h('button', { class: 'on', onclick: (e) => { tabs.children[0].classList.add('on'); tabs.children[1].classList.remove('on'); listToc.classList.remove('hidden'); listBm.classList.add('hidden'); } }, 'Índice'),
      h('button', { onclick: () => { tabs.children[1].classList.add('on'); tabs.children[0].classList.remove('on'); listBm.classList.remove('hidden'); listToc.classList.add('hidden'); } }, `Marcadores (${(book.bookmarks || []).length})`));
    const current = currentLoc ? chapterFor(currentLoc.start.href) : '';
    for (const t of flatToc(toc)) {
      listToc.append(h('button', { class: `toc-item ${t.label.trim() === current ? 'on' : ''}`, style: { paddingLeft: `${14 + t.depth * 16}px` }, onclick: () => { rendition.display(t.href); ts.close(); setUi(false); } }, t.label.trim()));
    }
    if (!toc.length) listToc.append(h('p', { class: 'muted' }, 'Este libro no tiene índice.'));
    const bms = (book.bookmarks || []).slice().sort((a, b) => (a.pct || 0) - (b.pct || 0));
    for (const b of bms) {
      listBm.append(h('button', { class: 'toc-item', onclick: () => { rendition.display(b.cfi); ts.close(); setUi(false); } },
        h('span', {}, b.label), h('span', { class: 'muted small' }, ` · ${Math.round((b.pct || 0) * 100)}%`)));
    }
    if (!bms.length) listBm.append(h('p', { class: 'muted' }, 'Aún no has marcado ninguna página. Usa el icono de marcador arriba.'));
    const ts = sheet(h('div', { class: 'stack' }, tabs, listToc, listBm), { title: book.title, tall: true });
    setTimeout(() => listToc.querySelector('.on')?.scrollIntoView({ block: 'center' }), 300);
  }

  // ---- Ajustes de lectura ----
  function openSettings() {
    setUi(false);
    const body = h('div', { class: 'rset' });
    const set = async (patch, rebuild = false) => {
      Object.assign(s, patch);
      await saveReaderSettings(s);
      if (rebuild) { const cfi = currentLoc?.start?.cfi; applyLook(); await build(cfi); }
      else await refreshStyles();
    };
    const slider = (label, key, min, max, step, fmt, rebuild) => {
      const val = h('span', { class: 'rset-val' }, fmt(s[key]));
      const input = h('input', { type: 'range', min, max, step, value: s[key] });
      let t;
      input.addEventListener('input', () => {
        val.textContent = fmt(+input.value);
        clearTimeout(t);
        t = setTimeout(() => set({ [key]: +input.value }, rebuild), key === 'brightness' || key === 'warmth' ? 0 : 180);
      });
      return h('div', { class: 'rset-row' }, h('span', { class: 'rset-label' }, label), input, val);
    };
    const toggle = (label, key, rebuild) => {
      const cb = h('input', { type: 'checkbox', checked: !!s[key] });
      cb.addEventListener('change', () => set({ [key]: cb.checked }, rebuild));
      return h('label', { class: 'switch-row' }, h('span', {}, label), cb, h('span', { class: 'switch' }));
    };
    const choice = (key, options, rebuild) => h('div', { class: 'chips' }, options.map(([v, l]) =>
      h('button', { class: `chip ${s[key] === v ? 'on' : ''}`, onclick: (e) => {
        [...e.currentTarget.parentNode.children].forEach((c) => c.classList.remove('on'));
        e.currentTarget.classList.add('on');
        set({ [key]: v }, rebuild);
      } }, l)));

    // Temas
    const themeRow = h('div', { class: 'theme-row' });
    for (const [id, t] of Object.entries(THEMES)) {
      const bg = t.bg || s.customBg, fg = t.fg || s.customFg;
      themeRow.append(h('button', { class: `theme-dot ${s.theme === id ? 'on' : ''}`, style: { background: bg, color: fg }, onclick: (e) => {
        themeRow.querySelectorAll('.theme-dot').forEach((d) => d.classList.remove('on'));
        e.currentTarget.classList.add('on');
        customRow.classList.toggle('hidden', id !== 'custom');
        set({ theme: id });
      } }, h('span', {}, 'Aa'), h('small', {}, t.name)));
    }
    const bgIn = h('input', { type: 'color', value: s.customBg, class: 'color-input' });
    const fgIn = h('input', { type: 'color', value: s.customFg, class: 'color-input' });
    bgIn.addEventListener('input', () => set({ customBg: bgIn.value }));
    fgIn.addEventListener('input', () => set({ customFg: fgIn.value }));
    const customRow = h('div', { class: `row gap ${s.theme === 'custom' ? '' : 'hidden'}` }, h('label', { class: 'pill' }, bgIn, 'Fondo'), h('label', { class: 'pill' }, fgIn, 'Texto'));

    const fontSel = h('select', { class: 'select' }, FONTS.map(([v, l]) => h('option', { value: v, selected: s.font === v, style: { fontFamily: v } }, l)));
    fontSel.addEventListener('change', () => set({ font: fontSel.value }));

    body.append(
      h('h3', { class: 'rset-h' }, 'Tema'), themeRow, customRow,
      slider('Brillo', 'brightness', 30, 100, 1, (v) => `${v}%`),
      slider('Luz cálida', 'warmth', 0, 100, 1, (v) => `${v}%`),
      h('h3', { class: 'rset-h' }, 'Texto'),
      h('div', { class: 'rset-row' }, h('span', { class: 'rset-label' }, 'Letra'), fontSel),
      slider('Tamaño', 'fontSize', 12, 36, 1, (v) => `${v}px`),
      slider('Interlineado', 'lineHeight', 1.1, 2.4, 0.05, (v) => v.toFixed(2)),
      slider('Entre párrafos', 'paraSpacing', 0, 2, 0.1, (v) => `${v.toFixed(1)}`),
      slider('Espacio letras', 'letterSpacing', -0.03, 0.12, 0.005, (v) => v.toFixed(3)),
      slider('Márgenes', 'margin', 0, 120, 2, (v) => `${v}px`),
      h('div', { class: 'rset-row' }, h('span', { class: 'rset-label' }, 'Alineación'), choice('align', [['justify', 'Justificado'], ['left', 'Izquierda']])),
      toggle('Sangría en párrafos', 'indent'),
      toggle('Separar palabras con guion', 'hyphens'),
      h('h3', { class: 'rset-h' }, 'Pantalla'),
      h('div', { class: 'rset-row' }, h('span', { class: 'rset-label' }, 'Modo'), choice('flow', [['paginated', 'Páginas'], ['scroll', 'Desplazamiento']], true)),
      h('div', { class: 'rset-row' }, h('span', { class: 'rset-label' }, 'Dos páginas'), choice('spread', [['auto', 'En pantallas anchas'], ['none', 'Nunca']], true)),
      h('div', { class: 'rset-row' }, h('span', { class: 'rset-label' }, 'Toques'), choice('tapZones', [['sides', 'Izq. atrás · der. adelante'], ['next', 'Casi todo adelante']])),
      toggle('Mostrar reloj', 'showClock'),
      toggle('Mostrar batería', 'showBattery'),
      toggle('Mostrar capítulo', 'showChapter'),
      toggle('Mostrar progreso', 'showProgress'),
      toggle('Tiempo restante estimado', 'showTimeLeft'),
      toggle('Mantener pantalla encendida', 'keepAwake'),
    );
    sheet(body, { title: 'Ajustes de lectura', cls: 'clear-backdrop', tall: true });
  }

  // ---- Final del libro ----
  let finishedShown = false;
  function finishedPrompt() {
    if (finishedShown || book.status === 'leido') return;
    finishedShown = true;
    const body = h('div', { class: 'dialog center' },
      h('div', { class: 'big-emoji' }, '🎉'),
      h('h2', {}, '¡Has terminado el libro!'),
      h('p', { class: 'muted' }, '¿Qué te ha parecido?'),
      stars(book.rating || 0, (v) => { book.rating = v; }, 34),
      h('button', { class: 'btn primary', onclick: () => {
        book.status = 'leido'; book.finishedAt = Date.now(); book.progress = 1; putBook(book); fs.close(); toast('Guardado en tus leídos');
      } }, 'Marcar como leído'));
    const fs = sheet(body);
  }

  // ---- Cerrar ----
  let closed = false;
  async function close() {
    if (closed) return;
    closed = true;
    await flushStats();
    clearTimeout(saveTimer);
    await putBook(book);
    closeAllSheets();
    location.hash = '#/';
  }

  applyLook();
  try {
    await build();
  } catch (e) {
    console.error(e);
    loading.textContent = 'No se pudo abrir este libro: ' + e.message;
  }
  ensureLocations();

  return async () => {
    clearInterval(tick); clearInterval(flushTimer); clearInterval(clockTimer);
    document.removeEventListener('visibilitychange', onVis);
    document.removeEventListener('keyup', docKey);
    await flushStats();
    clearTimeout(saveTimer);
    putBook(book);
    wake?.release().catch(() => {});
    rendition?.destroy();
    epub.destroy();
    document.body.classList.remove('reading');
    window.dispatchEvent(new Event('reader-closed'));
  };
}
