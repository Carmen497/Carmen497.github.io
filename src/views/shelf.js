// Estantería abierta: sus libros, agrupados por saga.
import { h, icon, btn, sheet, promptDialog, toast, escapeHtml } from '../ui.js';
import { getBooks, putBook } from '../db.js';
import { getRoom, saveRoom, getGenres, sortBooksForShelf, coverUrl } from '../store.js';
import { openBook } from './book.js';

export async function openShelf(shelfId, { onChange } = {}) {
  const room = await getRoom();
  const shelf = room.items.find((i) => i.id === shelfId);
  if (!shelf) return;
  const body = h('div', { class: 'shelf-view' });
  const s = sheet(body, { title: shelf.name || 'Estantería', tall: true, cls: 'wood-sheet', onClose: () => onChange?.() });

  async function draw() {
    const books = sortBooksForShelf((await getBooks()).filter((b) => b.shelfId === shelfId));
    const genres = await getGenres();
    body.innerHTML = '';

    const genreSel = h('select', { class: 'select small' },
      h('option', { value: '' }, 'Ninguno'),
      genres.map((g) => h('option', { value: g.id, selected: shelf.genre === g.id }, g.name)));
    genreSel.addEventListener('change', async () => { shelf.genre = genreSel.value; await saveRoom(room); toast(shelf.genre ? 'Los libros nuevos de ese género vendrán aquí' : 'Sin género asignado'); });

    body.append(h('div', { class: 'shelf-head' },
      h('span', { class: 'muted' }, `${books.length} libro${books.length === 1 ? '' : 's'}`),
      h('div', { class: 'row gap wrap' },
        h('button', { class: 'pill', onclick: rename }, icon('edit', 16), 'Renombrar'),
        h('label', { class: 'pill' }, 'Género: ', genreSel),
        h('button', { class: 'pill', onclick: addBooks }, icon('plus', 16), 'Traer libros'))));

    if (!books.length) {
      body.append(h('div', { class: 'empty-state' }, h('p', {}, 'Esta estantería está vacía.'), btn('Traer libros aquí', addBooks, 'primary')));
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
    for (const g of groups) {
      body.append(h('div', { class: 'plank-group' },
        h('h3', { class: 'plank-title' }, g.key ? `📚 ${g.key}` : (groups.length > 1 ? 'Otros libros' : '')),
        h('div', { class: 'plank' }, g.books.map((b) => {
          const url = coverUrl(b);
          return h('button', { class: 'plank-book', onclick: () => openBook(b.id, { onChange: draw }), title: b.title },
            url ? h('img', { src: url, alt: b.title, loading: 'lazy' }) : h('div', { class: 'cover-fallback', style: { background: b.spineColor }, html: `<span>${escapeHtml(b.title)}</span>` }),
            b.sagaIndex ? h('span', { class: 'saga-badge' }, `#${b.sagaIndex}`) : null,
            b.progress > 0 ? h('div', { class: 'progress thin on-cover' }, h('div', { class: 'progress-fill', style: { width: `${Math.round(b.progress * 100)}%` } })) : null);
        }))));
    }
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
