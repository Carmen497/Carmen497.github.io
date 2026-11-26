// Salas ya decoradas («temas»). Al elegir una cambian paredes, suelo y adornos; las estanterías
// (y sus libros) se quedan donde están. La decoración anterior se guarda para poder volver a ella.
import { catalogOf, canPlace, canPlaceWall } from './room.js';

const b = (type, p, extra) => ({ type, wall: 'b', p, ...extra });
const a = (type, p, extra) => ({ type, wall: 'a', p, ...extra });
const f = (type, x, y, extra) => ({ type, x, y, rot: 0, ...extra });

export const THEMES = [
  {
    id: 'acogedora', label: 'Rincón acogedor', desc: 'La sala de siempre: sillón, lámpara y té',
    wall: '#e9d8c0', wallStyle: 'plain', floor: 'wood',
    items: [b('window', 6), a('painting', 1, { color: '#6d9a8b' }), b('clock', 3), f('rug', 3, 3, { color: '#b65b48' }),
      f('armchair', 4, 4, { color: '#4f7a6b' }), f('lamp', 6, 4), f('plant', 7, 1), f('table', 3, 5), f('cat', 2, 6, { color: '#e0a15b' })],
  },
  {
    id: 'taberna', label: 'Taberna medieval', desc: 'Vigas de madera, chimenea, barriles y velas',
    wall: '#dcc8a6', wallStyle: 'timber', floor: 'darkwood',
    items: [f('fireplace', 0, 5, { rot: 1 }), a('shield', 6, { color: '#7a2e2e' }), a('torch', 1), b('torch', 7), b('banner', 3, { color: '#7a2e2e' }),
      f('barrel', 6, 0), f('barrel', 7, 0), f('barrel', 7, 1), f('chest', 3, 0, { color: '#6b4226' }), f('rug', 2, 3, { color: '#8c4a2a' }),
      f('table', 3, 4), f('pouf', 2, 4, { color: '#7a5230' }), f('pouf', 4, 4, { color: '#7a5230' }), f('candles', 5, 5), f('stack', 6, 4), f('cat', 1, 6, { color: '#7a6a5a' })],
  },
  {
    id: 'castillo', label: 'Castillo medieval', desc: 'Almenas, piedra, armaduras y un trono',
    wall: '#a39a8d', wallStyle: 'stone', floor: 'flagstone',
    items: [a('balcony', 5), b('tapestry', 6, { color: '#6a2c3a' }), a('torch', 2), a('torch', 7), b('torch', 0), b('shield', 3, { color: '#2e4a7a' }),
      a('banner', 0, { color: '#8c2b3a' }), f('armor', 6, 0), f('armor', 0, 2),
      f('rug', 2, 3, { color: '#8c2b3a' }), f('throne', 3, 2, { color: '#8c2b3a' }), f('chest', 1, 6, { color: '#5a3a24' }), f('candles', 5, 2), f('candles', 6, 5)],
  },
  {
    id: 'viento', label: 'Casa del Viento', desc: 'Palacio en la montaña con arcos abiertos al cielo estrellado y la ciudad del valle',
    wall: '#c9a57e', wallStyle: 'wind', floor: 'nightstone',
    items: [a('candelabra', 1), b('candelabra', 3), f('roundrug', 3, 3, { color: '#2e3a6b' }), f('sofa', 2, 5, { color: '#2e3a6b' }),
      f('armchair', 5, 4, { color: '#3d4a85' }), f('table', 4, 4), f('pouf', 2, 3, { color: '#c9b8e8' }), f('bigplant', 7, 1), f('plant', 0, 1),
      f('stack', 6, 6), f('candles', 5, 6), f('cat', 1, 6, { color: '#2c2a30' })],
  },
  {
    id: 'hadas', label: 'Bosque de hadas', desc: 'Al aire libre entre árboles, con setas y luciérnagas',
    wall: '#b7cfa9', wallStyle: 'leaves', floor: 'moss',
    items: [b('vines', 0), a('vines', 5), b('fireflies', 5), a('fireflies', 0), f('mushrooms', 6, 1, { color: '#d9443a' }),
      f('mushrooms', 1, 6, { color: '#e0a03a' }), f('mushrooms', 5, 6, { color: '#d9443a' }), f('roundrug', 2, 3, { color: '#d9c27a' }),
      f('armchair', 2, 3, { color: '#7aa06a' }), f('stump', 3, 4), f('stump', 6, 5), f('fern', 7, 0), f('bigplant', 6, 0), f('plant', 0, 1)],
  },
  {
    id: 'botanica', label: 'Cúpula botánica', desc: 'Invernadero de cristal con cúpula, palmeras y fuente',
    wall: '#e2efe9', wallStyle: 'glass', floor: 'terracotta',
    items: [b('vines', 0), a('vines', 5), f('palm', 6, 1), f('palm', 0, 6), f('bigplant', 3, 0), f('fern', 0, 1), f('fountain', 3, 3),
      f('bench', 4, 6), f('cactus', 7, 4), f('plant', 7, 6), f('fern', 6, 4), f('cat', 2, 5, { color: '#e0a15b' })],
  },
  {
    id: 'mago', label: 'Torre del mago', desc: 'Velas flotantes, círculo mágico y bola de cristal',
    wall: '#3d3454', wallStyle: 'stars', floor: 'darkwood',
    items: [b('archwindow', 6), a('stars', 5), b('stars', 0), a('candelabra', 1), b('candelabra', 3), a('wallshelf', 6, { color: '#5a3d2b' }),
      f('roundrug', 2, 3, { color: '#5a3d7a' }), f('armchair', 2, 3, { color: '#5a3d7a' }), f('crystalball', 3, 4), f('cauldron', 6, 4),
      f('globe', 6, 2), f('candles', 1, 6), f('stack', 2, 6), f('stack', 4, 2), f('cat', 5, 5, { color: '#2c2a30' })],
  },
  {
    id: 'zen', label: 'Jardín zen', desc: 'Papel de arroz, tatami, bonsái y farolillos',
    wall: '#efe6d0', wallStyle: 'shoji', floor: 'tatami',
    items: [b('paperlanterns', 5), a('paperlanterns', 0), f('bonsai', 6, 1), f('stonelantern', 7, 0), f('stonelantern', 0, 6),
      f('table', 3, 4), f('pouf', 2, 4, { color: '#a33a2e' }), f('pouf', 4, 4, { color: '#3f5f4a' }), f('bigplant', 7, 3), f('plant', 0, 1), f('cat', 6, 6, { color: '#e9e4da' })],
  },
  {
    id: 'victoriana', label: 'Biblioteca victoriana', desc: 'Verde oscuro, madera, chimenea y globo',
    wall: '#2f4a3e', wallStyle: 'wainscot', floor: 'darkwood',
    items: [f('fireplace', 0, 5, { rot: 1 }), a('mirror', 5), b('painting', 3, { color: '#8a6a3a' }), a('painting', 1, { color: '#5d7a8a' }), a('clock', 7), b('window', 6),
      f('sofa', 2, 4, { color: '#6b2f2a' }), f('rug', 2, 5, { color: '#7a3b2a' }), f('table', 3, 6), f('armchair', 5, 5, { color: '#6b2f2a' }), f('globe', 6, 1),
      f('lamp', 4, 4), f('stack', 7, 5), f('plant', 7, 2)],
  },
  {
    id: 'cabana', label: 'Cabaña de montaña', desc: 'Troncos, chimenea y leña, con montañas nevadas detrás',
    wall: '#a8723f', wallStyle: 'logs', floor: 'wood',
    items: [f('fireplace', 0, 5, { rot: 1 }), b('window', 6), a('painting', 1, { color: '#4f7a6b' }), a('wallshelf', 5, { color: '#5a3d2b' }), b('antlers', 3), b('lights', 0),
      f('rug', 2, 4, { color: '#8c3a2e' }), f('woodpile', 1, 5), f('armchair', 2, 4, { color: '#a33a2e' }), f('table', 3, 5), f('stack', 4, 4), f('lamp', 5, 4),
      f('plant', 7, 1), f('candles', 6, 6), f('cat', 1, 6, { color: '#7a6a5a' })],
  },
];
export const themeById = (id) => THEMES.find((t) => t.id === id);

// Coloca cada objeto lo más cerca posible de donde lo pone el tema, sin chocar con las estanterías.
// scale: en salas más grandes que 8×8 se reparten las posiciones por toda la sala.
function placeAll(room, list, prefix, scale = true) {
  const N = room.size, k = scale ? N / 8 : 1;
  list.forEach((src, i) => {
    const c = catalogOf(src.type);
    if (!c.type) return;
    const it = { ...src, id: src.id || `${src.type}-${prefix}${i}` };
    if (!it.color && c.color) it.color = c.color;
    if (c.wall) {
      const p0 = Math.min(N - c.span, Math.round(src.p * k));
      const opts = [];
      for (const w of ['a', 'b']) for (let p = 0; p <= N - c.span; p++) opts.push({ w, p, d: Math.abs(p - p0) + (w === src.wall ? 0 : 100) });
      opts.sort((x, y) => x.d - y.d);
      const ok = opts.find((o) => canPlaceWall(room, it, o.w, o.p));
      if (!ok) return;
      it.wall = ok.w; it.p = ok.p;
    } else {
      it.rot = it.rot || 0;
      const x0 = Math.round(src.x * k), y0 = Math.round(src.y * k);
      const rots = c.w !== c.d ? [it.rot, 1 - it.rot] : [it.rot];
      const opts = [];
      for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) opts.push({ x, y, d: Math.hypot(x - x0, y - y0) });
      opts.sort((p, q) => p.d - q.d);
      let done = false;
      for (const o of opts) {
        for (const r of rots) if (canPlace(room, it, o.x, o.y, r)) { it.x = o.x; it.y = o.y; it.rot = r; done = true; break; }
        if (done) break;
      }
      if (!done) return;
    }
    room.items.push(it);
  });
}

const decorOf = (room) => ({
  theme: room.theme || '', wall: room.wall, wallStyle: room.wallStyle || 'plain', floor: room.floor,
  items: room.items.filter((i) => i.type !== 'shelf'),
});

export function applyTheme(room, theme) {
  room.prevDecor = decorOf(room);
  room.theme = theme.id; room.wall = theme.wall; room.wallStyle = theme.wallStyle; room.floor = theme.floor;
  room.items = room.items.filter((i) => i.type === 'shelf');
  placeAll(room, theme.items, Date.now().toString(36));
}

// Vuelve a la decoración de antes de elegir el último tema (y guarda la actual por si quieres volver)
export function restorePrevDecor(room) {
  const p = room.prevDecor;
  if (!p) return false;
  const cur = decorOf(room);
  room.theme = p.theme; room.wall = p.wall; room.wallStyle = p.wallStyle; room.floor = p.floor;
  room.items = room.items.filter((i) => i.type === 'shelf');
  placeAll(room, p.items, 'r' + Date.now().toString(36), false);
  room.prevDecor = cur;
  return true;
}

// Sala de muestra para la miniatura de cada tema
const SAMPLE_SHELVES = [
  { id: 'shelf-1', type: 'shelf', x: 1, y: 0, rot: 0, color: '#8a5a3b' },
  { id: 'shelf-2', type: 'shelf', x: 4, y: 0, rot: 0, color: '#8a5a3b' },
  { id: 'shelf-3', type: 'shelf', x: 0, y: 3, rot: 1, color: '#8a5a3b' },
];
export function themeSampleRoom(theme) {
  const room = { size: 8, wall: theme.wall, wallStyle: theme.wallStyle, floor: theme.floor, items: SAMPLE_SHELVES.map((s) => ({ ...s })) };
  placeAll(room, theme.items, theme.id + '-');
  return room;
}
