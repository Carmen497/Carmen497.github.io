// Estantería abierta: sus libros, agrupados por saga.
import { h, icon, btn, sheet, promptDialog, toast, escapeHtml } from '../ui.js';
import { getBooks, putBook } from '../db.js';
import { getRoom, saveRoom, getGenres, coverUrl, booksForShelves, AUTO_RULES, ruleLabel } from '../store.js';
import { openBook } from './book.js';

// origin: punto de la pantalla donde se tocó la estantería (la animación se abre desde ahí)
export async function openShelf(shelfId, { onChange, origin } = {}) {
  const room = await getRoom();
  const shelf = room.items.find((i) => i.id === shelfId);
  if (!shelf) return;
  const body = h('div', { class: 'shelf-view' });
  let toolsOpen = false;
  const s = sheet(body, { title: shelf.name || 'Estantería', tall: true, cls: 'wood-sheet bookcase', onClose: () => onChange?.() });
  s.panel.style.transformOrigin = origin ? `${origin.x}px ${origin.y}px` : '50% 40%';

  async function draw() {
    const genres = await getGenres();
    const books = booksForShelves(room.items, await getBooks())[shelfId] || [];
    body.innerHTML = '';

    // Qué enseña esta estantería
    const ruleSel = h('select', { class: 'select small' },
      AUTO_RULES.map(([v, l]) => h('option', { value: v, selected: (shelf.auto || '') === v }, l)),
      h('optgroup', { label: 'Un género' }, genres.map((g) => h('option', { value: `g:${g.id}`, selected: shelf.auto === `g:${g.id}` }, g.name))));
    ruleSel.addEventListener('change', async () => {
      shelf.auto = ruleSel.value;
      await saveRoom(room);
      toast(shelf.auto ? 'Esta estantería se llenará sola' : 'Ahora guarda los libros que pongas tú');
      draw();
    });

    const genreSel = h('select', { class: 'select small' },
      h('option', { value: '' }, 'Ninguno'),
      genres.map((g) => h('option', { value: g.id, selected: shelf.genre === g.id }, g.name)));
    genreSel.addEventListener('change', async () => { shelf.genre = genreSel.value; await saveRoom(room); toast(shelf.genre ? 'Los libros nuevos de ese género vendrán aquí' : 'Sin género asignado'); });

    const tools = h('div', { class: `row gap wrap case-tools ${toolsOpen ? '' : 'hidden'}` },
      h('button', { class: 'pill', onclick: rename }, icon('edit', 16), 'Renombrar'),
      h('label', { class: 'pill' }, 'Muestra: ', ruleSel),
      shelf.auto ? null : h('label', { class: 'pill' }, 'Libros nuevos de: ', genreSel),
      shelf.auto ? null : h('button', { class: 'pill', onclick: addBooks }, icon('plus', 16), 'Traer libros'));
    body.append(h('div', { class: 'shelf-head' },
      h('div', { class: 'row gap center between' },
        h('span', { class: 'muted' }, `${books.length} libro${books.length === 1 ? '' : 's'}${shelf.auto ? ` · ${ruleLabel(shelf.auto, genres)}` : ''}`),
        h('button', { class: 'pill', onclick: () => { toolsOpen = !toolsOpen; tools.classList.toggle('hidden', !toolsOpen); } }, icon('settings', 16), 'Opciones')),
      tools));

    const caseEl = h('div', { class: 'case' });
    body.append(caseEl);
    if (!books.length) {
      caseEl.append(h('div', { class: 'case-row empty' }, h('div', { class: 'empty-state' },
        shelf.auto
          ? h('p', {}, `Aún no tienes libros que encajen aquí («${ruleLabel(shelf.auto, genres)}»). Aparecerán solos.`)
          : [h('p', {}, 'Esta estantería está vacía.'), btn('Traer libros aquí', addBooks, 'primary')])),
        h('div', { class: 'case-row' }), h('div', { class: 'case-row' }));
      return;
    }
    // Agrupar por saga
    const groups = [];
    for (const b of books) {
      const key = b.saga || '';
      let g = groups.find((x) => x.key === key);
      if (!g) { g = { key, books: [] }; groups.push(g); }
      g.books.push(b);
    }
    // Colocar en baldas, como en un mueble de verdad
    const cols = Math.max(3, Math.min(8, Math.floor((Math.min(innerWidth, 900) - 64) / 92)));
    const rows = [];
    for (const g of groups) {
      for (let i = 0; i < g.books.length; i += cols) {
        rows.push({ label: i === 0 ? (g.key || (groups.length > 1 ? 'Otros libros' : '')) : '', books: g.books.slice(i, i + cols) });
      }
    }
    while (rows.length < 4) rows.push({ label: '', books: [] });
    caseEl.append(...rows.map((r) => h('div', { class: 'case-row', style: { '--cols': cols } },
      r.label ? h('span', { class: 'case-plate' }, r.label) : null,
      r.books.map((b) => {
        const url = coverUrl(b);
        return h('button', { class: 'plank-book', onclick: () => openBook(b.id, { onChange: draw }), title: b.title },
          url ? h('img', { src: url, alt: b.title, loading: 'lazy' }) : h('div', { class: 'cover-fallback', style: { background: b.spineColor }, html: `<span>${escapeHtml(b.title)}</span>` }),
          b.sagaIndex ? h('span', { class: 'saga-badge' }, `#${b.sagaIndex}`) : null,
          b.progress > 0 ? h('div', { class: 'progress thin on-cover' }, h('div', { class: 'progress-fill', style: { width: `${Math.round(b.progress * 100)}%` } })) : null);
      }))));
  }

  async function rename() {
    const name = await promptDialog('Nombre de la estantería', shelf.name || '');
    if (!name) return;
    shelf.name = name;
    await saveRoom(room);
    s.setTitle(name);
  }

  async function addBooks() {
    const all = (await getBooks()).filter((b) => b.shelfId !== shelfId).sort((a, b) => a.title.localeCompare(b.title));
    if (!all.length) return toast('Todos tus libros ya están aquí');
    const chosen = new Set();
    const list = h('div', { class: 'pick-list' }, all.map((b) => {
      const other = room.items.find((i) => i.id === b.shelfId)?.name || 'sin estantería';
      const cb = h('input', { type: 'checkbox' });
      cb.addEventListener('change', () => cb.checked ? chosen.add(b.id) : chosen.delete(b.id));
      return h('label', { class: 'pick-row' }, cb, h('div', {}, h('strong', {}, b.title), h('div', { class: 'muted small' }, `${b.author || ''} · en ${other}`)));
    }));
    const ps = sheet(h('div', { class: 'stack' }, list, btn('Mover aquí', async () => {
      for (const b of all.filter((x) => chosen.has(x.id))) { b.shelfId = shelfId; await putBook(b); }
      ps.close(); draw();
    }, 'primary block')), { title: `Traer a «${shelf.name}»`, tall: true });
  }

  draw();
}
