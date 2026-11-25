// Buscador: título, autor, saga, #, sinopsis y notas. Escribiendo # se buscan solo los #.
import { h, icon } from '../ui.js';
import { getBooks } from '../db.js';
import { allTags, tagKey } from '../store.js';
import { bookCard } from './library.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export async function renderSearch(root) {
  const books = await getBooks();
  const tags = allTags(books);
  const input = h('input', { class: 'search-input', type: 'search', placeholder: 'Título, autor, saga o #…', autocomplete: 'off', enterkeyhint: 'search' });
  const results = h('div', { class: 'page' });
  root.append(h('header', { class: 'topbar' }, h('label', { class: 'search-box' }, icon('search', 20), input)), results);

  const index = books.map((b) => ({
    b,
    title: norm(b.title), author: norm(b.author), saga: norm(b.saga), tags: (b.tags || []).map(tagKey),
    rest: norm(`${b.description} ${b.notes} ${(b.subjects || []).join(' ')} ${b.publisher}`),
  }));

  function run() {
    const q = norm(input.value.trim());
    results.innerHTML = '';
    const chip = (t) => h('button', { class: 'chip', onclick: () => { input.value = '#' + t.name; run(); } }, '#' + t.name, h('span', { class: 'muted small' }, ' ' + t.count));
    // Búsqueda por #: los libros que llevan todos los # escritos
    if (q.startsWith('#')) {
      const wanted = q.split('#').map((x) => tagKey(x)).filter(Boolean);
      const last = wanted.at(-1) || '';
      const exact = wanted.length && wanted.every((w) => tags.some((t) => t.key === w));
      const options = tags.filter((t) => !last || t.key.includes(last));
      if (!exact || !wanted.length) results.append(h('h3', { class: 'group-title' }, '#'), options.length ? h('div', { class: 'chips' }, options.slice(0, 60).map(chip)) : h('p', { class: 'muted' }, 'Ningún libro lleva ese #.'));
      const found = wanted.length ? index.filter((it) => wanted.every((w, i) => it.tags.some((t) => (exact || i < wanted.length - 1 ? t === w : t.includes(w))))).map((it) => it.b) : [];
      if (found.length) results.append(h('p', { class: 'muted small' }, `${found.length} libro${found.length === 1 ? '' : 's'}`), h('div', { class: 'cover-grid' }, found.map((b) => bookCard(b))));
      return;
    }
    if (!q) {
      // Sugerencias: sagas y autores
      const sagas = [...new Set(books.map((b) => b.saga).filter(Boolean))].sort();
      const authors = [...new Set(books.map((b) => b.author).filter(Boolean))].sort();
      if (!books.length) { results.append(h('p', { class: 'muted center-text' }, 'Cuando añadas libros podrás buscarlos aquí.')); return; }
      if (tags.length) results.append(h('h3', { class: 'group-title' }, 'Tus #'), h('div', { class: 'chips' }, tags.slice(0, 40).map(chip)));
      if (sagas.length) results.append(h('h3', { class: 'group-title' }, 'Sagas'), h('div', { class: 'chips' }, sagas.map((s) => h('button', { class: 'chip', onclick: () => { input.value = s; run(); } }, s))));
      if (authors.length) results.append(h('h3', { class: 'group-title' }, 'Autores'), h('div', { class: 'chips' }, authors.slice(0, 30).map((a) => h('button', { class: 'chip', onclick: () => { input.value = a; run(); } }, a))));
      return;
    }
    const terms = q.split(/\s+/);
    const scored = [];
    for (const it of index) {
      let score = 0;
      for (const t of terms) {
        let s = 0;
        if (it.title.includes(t)) s = Math.max(s, it.title.startsWith(t) ? 10 : 7);
        if (it.author.includes(t)) s = Math.max(s, 6);
        if (it.saga.includes(t)) s = Math.max(s, 6);
        if (it.tags.some((x) => x.includes(t))) s = Math.max(s, 5);
        if (it.rest.includes(t)) s = Math.max(s, 1);
        if (!s) { score = 0; break; }
        score += s;
      }
      if (score) scored.push([score, it.b]);
    }
    scored.sort((a, b) => b[0] - a[0] || (a[1].sagaIndex ?? 0) - (b[1].sagaIndex ?? 0));
    if (!scored.length) { results.append(h('p', { class: 'muted center-text' }, `Nada encontrado para «${input.value}».`)); return; }
    results.append(h('p', { class: 'muted small' }, `${scored.length} resultado${scored.length === 1 ? '' : 's'}`),
      h('div', { class: 'cover-grid' }, scored.map(([, b]) => bookCard(b))));
  }
  input.addEventListener('input', run);
  run();
  setTimeout(() => input.focus(), 100);
}
