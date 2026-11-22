// Buscador: título, autor, saga, género, sinopsis y notas.
import { h, icon } from '../ui.js';
import { getBooks } from '../db.js';
import { getGenres, genreById } from '../store.js';
import { bookCard } from './library.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export async function renderSearch(root) {
  const books = await getBooks();
  const genres = await getGenres();
  const input = h('input', { class: 'search-input', type: 'search', placeholder: 'Título, autor, saga, género…', autocomplete: 'off', enterkeyhint: 'search' });
  const results = h('div', { class: 'page' });
  root.append(h('header', { class: 'topbar' }, h('label', { class: 'search-box' }, icon('search', 20), input)), results);

  const index = books.map((b) => ({
    b,
    title: norm(b.title), author: norm(b.author), saga: norm(b.saga), genre: norm(genreById(genres, b.genre)?.name),
    rest: norm(`${b.description} ${b.notes} ${(b.subjects || []).join(' ')} ${b.publisher}`),
  }));

  function run() {
    const q = norm(input.value.trim());
    results.innerHTML = '';
    if (!q) {
      // Sugerencias: sagas y autores
      const sagas = [...new Set(books.map((b) => b.saga).filter(Boolean))].sort();
      const authors = [...new Set(books.map((b) => b.author).filter(Boolean))].sort();
      if (!books.length) { results.append(h('p', { class: 'muted center-text' }, 'Cuando añadas libros podrás buscarlos aquí.')); return; }
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
        if (it.genre.includes(t)) s = Math.max(s, 4);
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
