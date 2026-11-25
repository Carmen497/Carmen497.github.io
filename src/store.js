// Estado de la biblioteca: sala, estanterías, géneros y ajustes.
import { kvGet, kvSet } from './db.js';

export const DEFAULT_GENRES = [
  { id: 'fantasia', name: 'Fantasía', color: '#7a5aa6' },
  { id: 'scifi', name: 'Ciencia ficción', color: '#3f7ea6' },
  { id: 'romance', name: 'Romance', color: '#c25b7a' },
  { id: 'misterio', name: 'Misterio', color: '#4f5d75' },
  { id: 'thriller', name: 'Thriller', color: '#8c3b3b' },
  { id: 'historica', name: 'Histórica', color: '#a0773f' },
  { id: 'clasicos', name: 'Clásicos', color: '#6b7d4a' },
  { id: 'noficcion', name: 'No ficción', color: '#5d8a82' },
  { id: 'juvenil', name: 'Juvenil', color: '#d0894a' },
  { id: 'poesia', name: 'Poesía', color: '#9a6f9e' },
];

export const DEFAULT_READER = {
  theme: 'paper',
  customBg: '#f4ecd8',
  customFg: '#3b3026',
  font: 'Literata',
  fontSize: 19,
  lineHeight: 1.6,
  margin: 24,
  paraSpacing: 0.4,
  indent: true,
  letterSpacing: 0,
  align: 'justify',
  hyphens: true,
  flow: 'paginated',
  spread: 'auto',
  brightness: 100,
  warmth: 0,
  showClock: true,
  showBattery: false,
  showProgress: true,
  showChapter: true,
  showTimeLeft: true,
  keepAwake: true,
  fullscreen: true,
  publisherStyles: false,
  tapZones: 'sides',
};

export const DEFAULT_APP = {
  theme: 'auto',
  yearGoal: 24,
  dailyGoal: 20,
  autoBackup: true,
  driveClientId: '',
  libraryView: 'room',
};

export function defaultRoom() {
  return {
    size: 8,
    wall: '#e9d8c0',
    floor: 'wood',
    items: [
      { id: 'shelf-1', type: 'shelf', x: 1, y: 0, rot: 0, name: 'Mis favoritos', genre: '', color: '#8a5a3b' },
      { id: 'shelf-2', type: 'shelf', x: 4, y: 0, rot: 0, name: 'Pendientes', genre: '', auto: 'pendiente', color: '#8a5a3b' },
      { id: 'shelf-3', type: 'shelf', x: 0, y: 3, rot: 1, name: 'Sagas', genre: '', auto: 'saga', color: '#8a5a3b' },
      { id: 'win-1', type: 'window', wall: 'b', p: 6 },
      { id: 'paint-1', type: 'painting', wall: 'a', p: 1, color: '#6d9a8b' },
      { id: 'clock-1', type: 'clock', wall: 'b', p: 3 },
      { id: 'rug-1', type: 'rug', x: 3, y: 3, rot: 0, color: '#b65b48' },
      { id: 'arm-1', type: 'armchair', x: 4, y: 4, rot: 0, color: '#4f7a6b' },
      { id: 'lamp-1', type: 'lamp', x: 6, y: 4, rot: 0 },
      { id: 'plant-1', type: 'plant', x: 7, y: 1, rot: 0 },
      { id: 'table-1', type: 'table', x: 3, y: 5, rot: 0 },
      { id: 'cat-1', type: 'cat', x: 2, y: 6, rot: 0, color: '#e0a15b' },
    ],
  };
}

let cache = {};
export async function getRoom() {
  if (cache.room) return cache.room;
  const room = await kvGet('room', defaultRoom());
  // Salas antiguas: las estanterías «Pendientes» y «Sagas» de serie pasan a llenarse solas
  for (const it of room.items) {
    if (it.type !== 'shelf' || it.auto !== undefined) continue;
    const n = (it.name || '').trim().toLowerCase();
    it.auto = n === 'pendientes' ? 'pendiente' : n === 'sagas' ? 'saga' : '';
  }
  return cache.room = room;
}
export async function saveRoom(room) { cache.room = room; await kvSet('room', room); }

export async function getGenres() { return cache.genres ||= await kvGet('genres', DEFAULT_GENRES); }
export async function saveGenres(g) { cache.genres = g; await kvSet('genres', g); }
export function genreById(genres, id) { return genres.find((g) => g.id === id); }

export async function getReaderSettings() {
  if (!cache.reader) {
    cache.reader = { ...DEFAULT_READER, ...(await kvGet('reader', {})) };
    // Letras retiradas: quien las tuviera elegidas pasa a la predeterminada
    if (cache.reader.font === 'OpenDyslexic') cache.reader.font = DEFAULT_READER.font;
  }
  return cache.reader;
}
export async function saveReaderSettings(s) { cache.reader = s; await kvSet('reader', s); }

export async function getAppSettings() { return cache.app ||= { ...DEFAULT_APP, ...(await kvGet('app', {})) }; }
export async function saveAppSettings(s) { cache.app = s; await kvSet('app', s); }

export function clearCache() { cache = {}; }

// Vista de lista
export const LIST_GROUPS = [['shelf', 'Por estantería (librería)'], ['genre', 'Por género'], ['saga', 'Por saga'], ['author', 'Por autor'], ['status', 'Por estado'], ['none', 'Sin agrupar']];
export const LIST_SORTS = [['recent', 'Recientes'], ['added', 'Añadidos hace poco'], ['title', 'Título'], ['author', 'Autor'], ['rating', 'Valoración'], ['progress', 'Progreso']];


export async function shelves() {
  return (await getRoom()).items.filter((i) => i.type === 'shelf');
}

// ---- Estanterías automáticas ----
// Una estantería puede guardar los libros que tú pones (auto = '') o enseñar sola los que cumplen una regla.
export const AUTO_RULES = [
  ['', 'Los libros que yo ponga'],
  ['nuevos', 'Libros nuevos (todos los géneros)'],
  ['pendiente', 'Pendientes (sin terminar)'],
  ['leyendo', 'Leyendo ahora'],
  ['leido', 'Leídos'],
  ['favoritos', 'Favoritos (4 ★ o más)'],
  ['saga', 'Libros de sagas'],
];
export function ruleLabel(auto, genres = []) {
  if (auto?.startsWith('g:')) return `Género: ${genreById(genres, auto.slice(2))?.name || '—'}`;
  return AUTO_RULES.find(([v]) => v === auto)?.[1] || '';
}
function matchesRule(b, auto) {
  switch (auto) {
    case 'nuevos': return !!b.nuevo;
    case 'pendiente': return b.status !== 'leido' && b.status !== 'abandonado';
    case 'leyendo': return b.status === 'leyendo';
    case 'leido': return b.status === 'leido';
    case 'favoritos': return (b.rating || 0) >= 4;
    case 'saga': return !!b.saga;
    default: return auto?.startsWith('g:') ? b.genre === auto.slice(2) : false;
  }
}
// Libros que se ven en cada estantería. Los que no tienen una estantería «normal» válida
// se muestran en la primera estantería normal, para que ningún libro se quede fuera de la sala.
export function booksForShelves(items, books) {
  const list = items.filter((i) => i.type === 'shelf');
  const manual = list.filter((s) => !s.auto);
  const manualIds = new Set(manual.map((s) => s.id));
  const map = {};
  for (const s of list) map[s.id] = [];
  for (const b of books) {
    const home = manualIds.has(b.shelfId) ? b.shelfId : manual[0]?.id;
    if (home) map[home].push(b);
  }
  for (const s of list) if (s.auto) map[s.id] = books.filter((b) => matchesRule(b, s.auto));
  for (const k in map) map[k] = sortBooksForShelf(map[k]);
  return map;
}

// Elige la estantería para un libro nuevo: la de su género o, si no hay, la primera.
// Las estanterías no se llenan nunca: caben todos los libros (en la sala solo se dibujan unos cuantos lomos).
export async function pickShelf(book) {
  const list = (await shelves()).filter((s) => !s.auto);
  if (!list.length) return '';
  if (book.genre) {
    const byGenre = list.find((s) => s.genre === book.genre);
    if (byGenre) return byGenre.id;
  }
  return list[0].id;
}

// Color del lomo a partir de la portada
export async function colorFromImage(blob) {
  try {
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = 12; c.height = 12;
    const ctx = c.getContext('2d');
    ctx.drawImage(bmp, 0, 0, 12, 12);
    const d = ctx.getImageData(0, 0, 12, 12).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const sat = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
      const w = 1 + sat / 40;
      r += d[i] * w; g += d[i + 1] * w; b += d[i + 2] * w; n += w;
    }
    r /= n; g /= n; b /= n;
    const k = 0.85;
    return '#' + [r, g, b].map((v) => Math.round(Math.min(255, v * k)).toString(16).padStart(2, '0')).join('');
  } catch { return null; }
}

const SPINE_COLORS = ['#8c3b3b', '#3f6e8c', '#6b7d4a', '#a0773f', '#5d4a7a', '#2f5d50', '#b0603a', '#4a4a6a', '#7a3f5d', '#3b5f3b'];
export function hashColor(str) {
  let h = 0;
  for (const ch of str || '') h = (h * 31 + ch.charCodeAt(0)) | 0;
  return SPINE_COLORS[Math.abs(h) % SPINE_COLORS.length];
}

// Reduce la portada a un tamaño razonable
export async function shrinkImage(blob, max = 600) {
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
  } catch { return blob; }
}

export function sortBooksForShelf(list) {
  return [...list].sort((a, b) => {
    const sa = (a.saga || '').toLowerCase(), sb = (b.saga || '').toLowerCase();
    if (sa !== sb) {
      if (!sa) return 1;
      if (!sb) return -1;
      return sa.localeCompare(sb);
    }
    if (sa && (a.sagaIndex ?? 999) !== (b.sagaIndex ?? 999)) return (a.sagaIndex ?? 999) - (b.sagaIndex ?? 999);
    return (a.author || '').localeCompare(b.author || '') || a.title.localeCompare(b.title);
  });
}

const urlCache = new Map();
export function coverUrl(book) {
  if (!book.cover) return null;
  const hit = urlCache.get(book.id);
  if (hit && hit.blob === book.cover) return hit.url;
  if (hit) URL.revokeObjectURL(hit.url);
  const url = URL.createObjectURL(book.cover);
  urlCache.set(book.id, { blob: book.cover, url });
  return url;
}
