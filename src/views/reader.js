// Lector EPUB con ajustes de lectura, barra de estado y registro de estadísticas.
import ePub, { EpubCFI } from 'epubjs';
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

// [valor, nombre, tipo, nota]. tipo: serif (con remates, como un libro impreso) o sans (sin remates, más limpia)
export const FONTS = [
  ['Literata', 'Literata', 'serif', 'Pensada para leer en pantalla'],
  ['Source Serif 4', 'Source Serif', 'serif', 'Clara y amplia'],
  ['Noto Serif', 'Noto Serif', 'serif', 'Grande y redonda'],
  ['Merriweather', 'Merriweather', 'serif', 'Robusta, buena en letra pequeña'],
  ['Bitter', 'Bitter', 'serif', 'Trazo firme, muy nítida'],
  ['Lora', 'Lora', 'serif', 'Elegante'],
  ['EB Garamond', 'Garamond', 'serif', 'Clásica de novela'],
  ['Atkinson Hyperlegible', 'Atkinson', 'sans', 'Hecha para leer sin esfuerzo'],
  ['Lexend', 'Lexend', 'sans', 'Espaciada, cansa menos la vista'],
  ['Andika', 'Andika', 'sans', 'Letras muy diferenciadas'],
  ['Open Sans', 'Open Sans', 'sans', 'Limpia y neutra'],
  ['Nunito', 'Nunito', 'sans', 'Redondeada y suave'],
  ['system-ui', 'La del móvil', 'sans', 'La letra del sistema'],
  ['original', 'Original del libro', '', 'La que trae el libro'],
];
export function fontStack(v) {
  if (v === 'original') return null;
  if (v === 'system-ui') return 'system-ui, sans-serif';
  const f = FONTS.find(([x]) => x === v);
  return `'${v}', ${f?.[2] === 'sans' ? 'system-ui, sans-serif' : 'Georgia, serif'}`;
}

function themeColors(s) {
  const t = THEMES[s.theme] || THEMES.paper;
  return { bg: t.bg || s.customBg, fg: t.fg || s.customFg, accent: t.accent };
}

// Libros mal maquetados (o convertidos de PDF) que pegan varios diálogos en un mismo párrafo:
// «…bien? —Es… él es…». Cuando una raya de diálogo empieza frase tras un punto, interrogación o
// exclamación, se abre línea nueva. Se hace dentro del mismo párrafo (sin crear párrafos nuevos)
// para no mover las posiciones guardadas del resto del capítulo.
const DLG = /([.?!…»”"])[  ]+(?=[—―–][  ]?[¿¡«"“A-ZÁÉÍÓÚÑÜ])/g;
function splitDialogues(doc) {
  const body = doc.body || doc.querySelector('body');
  if (!body || body.hasAttribute('data-rincon-dlg')) return;
  body.setAttribute('data-rincon-dlg', '1');
  const span = (cls) => { const e = doc.createElementNS('http://www.w3.org/1999/xhtml', 'span'); e.setAttribute('class', cls); return e; };
  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  const hits = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.parentElement?.closest('pre, code, h1, h2, h3, h4, h5, h6, script, style, a, rt')) continue;
    DLG.lastIndex = 0;
    if (DLG.test(n.data)) hits.push(n);
  }
  for (const n of hits) {
    const frag = doc.createDocumentFragment();
    let last = 0;
    DLG.lastIndex = 0;
    for (let m; (m = DLG.exec(n.data));) {
      frag.append(n.data.slice(last, m.index + m[1].length));
      frag.append(span('rincon-pb'), span('rincon-ind'));
      last = m.index + m[0].length;
    }
    frag.append(n.data.slice(last));
    n.replaceWith(frag);
  }
}

// Tres :not(#…) dan a la regla de la letra el peso de tres ids, más que casi cualquier regla de un libro
const ID3 = ':not(#rx1):not(#rx2):not(#rx3) ';

// Letra escrita directamente en los párrafos (style="font-family:…"): se cambia también, y se recuerda la del libro
function forceInlineFont(doc, font) {
  for (const el of doc.body?.querySelectorAll('[style*="font"], [data-rincon-ff]') || []) {
    if (!('rinconFf' in el.dataset)) {
      if (!el.style.fontFamily) continue;
      el.dataset.rinconFf = el.style.fontFamily;
    }
    if (font) el.style.setProperty('font-family', font, 'important');
    else el.style.fontFamily = el.dataset.rinconFf;
  }
}

function userCss(s) {
  const { bg, fg, accent } = themeColors(s);
  const font = fontStack(s.font);
  const textSel = 'body, p, div, span, li, blockquote, td, dd, dt, section, article';
  return `
    html, body { background: ${bg} !important; }
    /* Muchos libros pintan cajas blancas (o de color) dentro del texto: se quitan para que mande el tema */
    body *:not(img):not(svg):not(image):not(video):not(canvas) { background-color: transparent !important; background-image: none !important; border-color: ${fg}33 !important; box-shadow: none !important; }
    body *:not(a) { color: ${fg} !important; }
    html { color: ${fg} !important; }
    body { color: ${fg} !important; font-size: ${s.fontSize}px !important; letter-spacing: ${s.letterSpacing}em; -webkit-font-smoothing: antialiased; }
    ${textSel} { color: ${fg} !important; line-height: ${s.lineHeight} !important; ${font ? `font-family: ${font} !important;` : ''} }
    h1, h2, h3, h4, h5, h6 { color: ${fg} !important; ${font ? `font-family: ${font} !important;` : ''} line-height: 1.3 !important; }
    /* Muchos libros fijan su propia letra con reglas fuertes: el :not(#…) da a esta regla prioridad de id para que mande la elegida */
    ${font ? `${ID3}body, ${ID3}body *:not(code):not(pre):not(kbd):not(samp) { font-family: ${font} !important; }` : ''}
    p { margin-top: 0 !important; margin-bottom: ${s.paraSpacing}em !important; text-align: ${s.align} !important;
        ${s.indent ? '' : 'text-indent: 0 !important;'} hyphens: ${s.hyphens ? 'auto' : 'manual'} !important; -webkit-hyphens: ${s.hyphens ? 'auto' : 'manual'} !important; }
    a, a * { color: ${accent} !important; }
    img, svg, video { max-width: 100% !important; height: auto; }
    .rincon-pb { display: block !important; height: ${s.paraSpacing}em; }
    /* La sangría de las líneas separadas copia la del párrafo (text-indent heredado) */
    .rincon-ind { display: inline-block !important; text-indent: inherit; }
    .rincon-ind::before { content: '\\200B'; }
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
  let closed = false;
  const setUi = (v) => { uiVisible = v; shell.classList.toggle('ui', v); };

  // ---- Libro ----
  const epub = ePub(await file.arrayBuffer());
  // Los diálogos se separan al cargar cada capítulo, antes de maquetarlo: así no cambia de tamaño
  // ya mostrado (eso hacía que la página «se recargara» al pasarla) y las posiciones cuadran
  epub.spine.hooks.content.register((doc) => splitDialogues(doc));
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
  // El estilo del lector va dentro de cada capítulo desde que se carga. epub.js solo lo aplica
  // después de colocar la página: el texto se recolocaba ya a la vista (parecía que la página
  // «se recargaba» al cambiar de capítulo) y al reabrir el libro aparecía unas páginas antes.
  const XHTML = 'http://www.w3.org/1999/xhtml';
  // La letra elegida va metida dentro de cada capítulo (como datos, no como enlace). Si cada
  // capítulo la descargaba, mientras llegaba se veía con la letra de reserva (más fina) o, en
  // móviles lentos, la página se quedaba en blanco.
  const fontsBase = new URL('fonts/', document.baseURI).href;
  const faceCache = new Map();
  const asDataUrl = (blob) => new Promise((res, rej) => {
    const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob);
  });
  async function fontFaceCss(font) {
    if (!font || font === 'original' || font === 'system-ui') return '';
    if (faceCache.has(font)) return faceCache.get(font);
    try {
      const css = await fetch(fontsHref).then((r) => r.text());
      const rules = (css.match(/@font-face\s*\{[^}]*\}/g) || []).filter((r) => r.includes(`'${font}'`));
      const out = await Promise.all(rules.map(async (r) => {
        const file = r.match(/url\(['"]?(?:\.\/)?([^'")]+)['"]?\)/)?.[1];
        if (!file) return '';
        const blob = await fetch(fontsBase + file).then((x) => { if (!x.ok) throw new Error(x.status); return x.blob(); });
        const data = await asDataUrl(new Blob([blob], { type: 'font/woff2' }));
        return r.replace(/src:[^;}]*/, `src:url(${data}) format('woff2')`);
      }));
      const text = out.join('\n');
      faceCache.set(font, text);
      return text;
    } catch (e) {
      console.warn('letra', font, e);
      return null; // sin datos: se usa el enlace normal a fonts.css
    }
  }
  let fontsCss = await fontFaceCss(s.font);
  function fontsNode(doc, create) {
    const el = create(fontsCss == null ? 'link' : 'style');
    if (fontsCss == null) { el.setAttribute('rel', 'stylesheet'); el.setAttribute('href', fontsHref); }
    else el.textContent = fontsCss;
    el.setAttribute('id', 'rincon-fonts');
    return el;
  }
  epub.spine.hooks.content.register((doc) => {
    const head = doc.querySelector('head');
    if (!head) return;
    const st = doc.createElementNS(XHTML, 'style');
    st.setAttribute('id', 'rincon-user');
    st.textContent = userCss(s);
    head.append(fontsNode(doc, (tag) => doc.createElementNS(XHTML, tag)), st);
  });
  // Al cambiar de letra: preparar la nueva antes de aplicar el estilo
  async function updateFonts() { fontsCss = await fontFaceCss(s.font); }
  function setFonts(doc, create) {
    const old = doc.getElementById('rincon-fonts');
    if (old && old.tagName.toLowerCase() === 'style' && fontsCss != null && old.textContent === fontsCss) return;
    const el = fontsNode(doc, create);
    if (old) old.replaceWith(el); else doc.querySelector('head')?.append(el);
  }
  // Capítulos ya cargados: que lleven el estilo actual la próxima vez que se muestren
  function restyleLoadedSections() {
    epub.spine.each((sec) => {
      const doc = sec.document;
      const st = doc?.getElementById?.('rincon-user');
      if (!st) return;
      st.textContent = userCss(s);
      setFonts(doc, (tag) => doc.createElementNS(XHTML, tag));
    });
  }
  function styleContents(contents) {
    const doc = contents.document;
    setFonts(doc, (tag) => doc.createElement(tag));
    let st = doc.getElementById('rincon-user');
    if (!st) { st = doc.createElement('style'); st.id = 'rincon-user'; doc.head.append(st); }
    st.textContent = userCss(s);
    forceInlineFont(doc, fontStack(s.font));
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
    await show(target || book.cfi || undefined);
    loading.remove();
  }

  // Ir a una posición sin quedarse colgado si ya no encaja (p. ej. guardada antes de separar
  // los diálogos): se prueba con el párrafo que la contiene y, si no, con el principio del capítulo
  async function show(target) {
    await epub.opened;
    const tries = [target];
    if (typeof target === 'string' && target.startsWith('epubcfi(') && target.includes('!')) {
      let [base, path] = target.slice(8, -1).split('!');
      path = path.split(',')[0].replace(/:\d+.*$/, '');
      for (let k = 0; k < 2 && path.split('/').length > 3; k++) {
        path = path.replace(/\/[^/]*$/, '');
        tries.push(`epubcfi(${base}!${path}/1:0)`, `epubcfi(${base}!${path})`);
      }
      tries.push(epub.spine.get(target)?.href);
    }
    // epub.js se queda colgado (en vez de fallar) con una posición imposible: se comprueba antes
    for (const t of tries) {
      if (await fits(t)) return rendition.display(t);
      console.warn('posición no válida', t);
    }
    return rendition.display();
  }
  async function fits(t) {
    if (!t) return false;
    if (!t.startsWith('epubcfi(')) return true;
    try {
      const sec = epub.spine.get(t);
      if (!sec) return false;
      // Copia aparte del capítulo (cargar el de epub.js aquí lo dejaba a medias y se colgaba)
      const doc = await epub.load(sec.url);
      splitDialogues(doc);
      return !!new EpubCFI(t).toRange(doc);
    } catch { return false; }
  }

  let restyling = null;
  async function refreshStyles() {
    // Guardar la posición antes de que el cambio de estilo mueva el texto
    const cfi = restyling || currentLoc?.start?.cfi;
    restyling = cfi;
    applyLook();
    restyleLoadedSections();
    if (!rendition) return;
    rendition.getContents().forEach(styleContents);
    rendition.resize();
    if (cfi) await show(cfi);
    restyling = null;
  }

  // Ubicaciones (para el % y la barra)
  async function ensureLocations() {
    try {
      // locVer 2: ubicaciones calculadas con los diálogos ya separados (las anteriores ya no cuadran)
      if (book.locations && book.locVer === 2) epub.locations.load(book.locations);
      else {
        await epub.ready;
        await epub.locations.generate(1200);
        book.locations = epub.locations.save();
        book.locVer = 2;
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
    enterFullscreen();
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
    show(epub.locations.cfiFromPercentage(slider.value / 1000));
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

  // ---- Pantalla completa (oculta las barras del sistema mientras se lee) ----
  // Necesita un toque reciente: se pide al abrir el libro y, si se perdió, en el siguiente toque.
  function enterFullscreen() {
    if (!s.fullscreen || closed || document.fullscreenElement || !document.documentElement.requestFullscreen) return;
    // En el APK la app ya ocupa toda la pantalla (modo inmersivo): pedirla otra vez solo saca el aviso de Chrome
    if (inApk()) return;
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  }
  function inApk() {
    try { if (localStorage.getItem('enApk')) return true; } catch {}
    return document.referrer.startsWith('android-app://');
  }
  function exitFullscreen() { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }
  enterFullscreen();
  shell.addEventListener('pointerup', enterFullscreen);

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
      listToc.append(h('button', { class: `toc-item ${t.label.trim() === current ? 'on' : ''}`, style: { paddingLeft: `${14 + t.depth * 16}px` }, onclick: () => { show(t.href); ts.close(); setUi(false); } }, t.label.trim()));
    }
    if (!toc.length) listToc.append(h('p', { class: 'muted' }, 'Este libro no tiene índice.'));
    const bms = (book.bookmarks || []).slice().sort((a, b) => (a.pct || 0) - (b.pct || 0));
    for (const b of bms) {
      listBm.append(h('button', { class: 'toc-item', onclick: () => { show(b.cfi); ts.close(); setUi(false); } },
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
      if ('font' in patch) await updateFonts();
      if ('fullscreen' in patch) { patch.fullscreen ? enterFullscreen() : exitFullscreen(); return; }
      if (rebuild) { const cfi = currentLoc?.start?.cfi; applyLook(); restyleLoadedSections(); await build(cfi); }
      else await refreshStyles();
    };
    // Deslizador con botones − y + para ajustar paso a paso
    const slider = (label, key, min, max, step, fmt, rebuild) => {
      const val = h('span', { class: 'rset-val' }, fmt(s[key]));
      const input = h('input', { type: 'range', min, max, step, value: s[key] });
      let t;
      const apply = () => {
        val.textContent = fmt(+input.value);
        clearTimeout(t);
        t = setTimeout(() => set({ [key]: +input.value }, rebuild), key === 'brightness' || key === 'warmth' ? 0 : 250);
      };
      const nudge = (dir) => {
        const dec = (String(step).split('.')[1] || '').length;
        const v = Math.min(max, Math.max(min, +(+input.value + dir * step).toFixed(dec)));
        if (v === +input.value) return;
        input.value = v; apply();
      };
      input.addEventListener('input', apply);
      return h('div', { class: 'rset-row stepper' }, h('span', { class: 'rset-label' }, label),
        h('div', { class: 'step-ctl' },
          h('button', { class: 'step-btn', 'aria-label': `Menos ${label.toLowerCase()}`, onclick: () => nudge(-1) }, '−'),
          input,
          h('button', { class: 'step-btn', 'aria-label': `Más ${label.toLowerCase()}`, onclick: () => nudge(1) }, '+')),
        val);
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

    // Cada letra se enseña escrita con ella misma, para elegir viéndola
    const fontSel = h('div', { class: 'font-grid' }, FONTS.map(([v, l, , note]) =>
      h('button', { class: `font-opt ${s.font === v ? 'on' : ''}`, onclick: (e) => {
        fontSel.querySelectorAll('.on').forEach((x) => x.classList.remove('on'));
        e.currentTarget.classList.add('on');
        set({ font: v });
      } },
      h('span', { class: 'font-sample', style: { fontFamily: fontStack(v) || 'inherit' } }, l),
      h('span', { class: 'font-note' }, note))));

    body.append(
      h('h3', { class: 'rset-h' }, 'Tema'), themeRow, customRow,
      slider('Brillo', 'brightness', 30, 100, 1, (v) => `${v}%`),
      slider('Luz cálida', 'warmth', 0, 100, 1, (v) => `${v}%`),
      h('h3', { class: 'rset-h' }, 'Texto'),
      h('span', { class: 'rset-label' }, 'Letra'), fontSel,
      slider('Tamaño', 'fontSize', 12, 48, 1, (v) => `${v}px`),
      slider('Interlineado', 'lineHeight', 1.1, 2.4, 0.1, (v) => v.toFixed(2)),
      slider('Entre párrafos', 'paraSpacing', 0, 2, 0.1, (v) => `${v.toFixed(1)}`),
      slider('Espacio letras', 'letterSpacing', -0.03, 0.12, 0.01, (v) => v.toFixed(3)),
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
      toggle('Pantalla completa', 'fullscreen'),
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
    exitFullscreen();
    rendition?.destroy();
    epub.destroy();
    document.body.classList.remove('reading');
    window.dispatchEvent(new Event('reader-closed'));
  };
}
