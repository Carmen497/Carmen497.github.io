// Ficha del libro: valoración, estado, #, saga, estantería, sinopsis y notas.
import { openReader } from '../nav.js';
import { h, icon, btn, sheet, stars, toast, confirmDialog, promptDialog, closeAllSheets, fmtDuration, escapeHtml } from '../ui.js';
import { getBook, putBook, deleteBook, getBooks, getFile } from '../db.js';
import { allTags, addTag, tagKey, getRoom, coverUrl, colorFromImage, shrinkImage } from '../store.js';
import { searchOnline, fetchImage } from '../online.js';

const STATUS = [['pendiente', 'Pendiente'], ['leyendo', 'Leyendo'], ['leido', 'Leído'], ['abandonado', 'Abandonado']];

// Editor de #: los del libro como fichas (con × para quitarlos) y un campo que sugiere mientras escribes
function tagInput(book, known, onChange) {
  const wrap = h('div', { class: 'tag-editor' });
  const chipsEl = h('div', { class: 'tag-chips' });
  const input = h('input', { class: 'input tag-in', placeholder: 'Escribe un # y pulsa Intro', autocomplete: 'off', autocapitalize: 'off', enterkeyhint: 'done' });
  const sugg = h('div', { class: 'chips tag-sugg' });
  wrap.append(chipsEl, input, sugg);
  const drawChips = () => {
    chipsEl.innerHTML = '';
    for (const t of book.tags || []) {
      chipsEl.append(h('span', { class: 'tag-chip' }, '#' + t,
        h('button', { class: 'tag-x', title: 'Quitar', onclick: () => { book.tags = book.tags.filter((x) => x !== t); onChange(); drawChips(); drawSugg(); } }, '×')));
    }
  };
  const add = (t) => {
    if (addTag(book, t)) { onChange(); drawChips(); }
    input.value = ''; drawSugg(); input.focus();
  };
  const drawSugg = () => {
    const q = tagKey(input.value);
    const mine = new Set((book.tags || []).map(tagKey));
    const list = known.filter((t) => !mine.has(t.key) && (!q || t.key.includes(q)))
      .sort((a, b) => (q ? (b.key.startsWith(q) - a.key.startsWith(q)) : 0) || b.count - a.count).slice(0, 12);
    sugg.innerHTML = '';
    for (const t of list) sugg.append(h('button', { class: 'chip', onclick: () => add(t.name) }, '#' + t.name, h('span', { class: 'muted small' }, ' ' + t.count)));
    if (q && !known.some((t) => t.key === q) && !mine.has(q)) sugg.append(h('button', { class: 'chip on', onclick: () => add(input.value) }, '+ Crear #' + input.value.replace(/#/g, '').trim()));
  };
  input.addEventListener('input', () => {
    // Una coma también confirma el #
    if (input.value.includes(',')) { const parts = input.value.split(','); parts.slice(0, -1).forEach((p) => addTag(book, p)); onChange(); drawChips(); input.value = parts.at(-1); }
    drawSugg();
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (input.value.trim()) add(input.value); } });
  input.addEventListener('blur', () => setTimeout(() => { if (input.value.trim() && document.activeElement !== input) add(input.value); }, 200));
  drawChips(); drawSugg();
  return wrap;
}

export async function openBook(id, { onChange } = {}) {
  let book = await getBook(id);
  if (!book) return;
  const body = h('div', { class: 'book-detail' });
  let changed = false;
  const s = sheet(body, { tall: true, onClose: () => { if (changed) { window.dispatchEvent(new CustomEvent('library-changed')); onChange?.(); } } });

  let saveTimer;
  const save = () => {
    changed = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => putBook(book), 300);
  };

  async function draw() {
    const room = await getRoom();
    const all = await getBooks();
    const sagas = [...new Set(all.map((b) => b.saga).filter(Boolean))].sort();
    body.innerHTML = '';
    const url = coverUrl(book);
    const pct = Math.round((book.progress || 0) * 100);

    const coverEl = h('button', { class: 'detail-cover', onclick: changeCover, title: 'Cambiar portada' },
      url ? h('img', { src: url, alt: '' }) : h('div', { class: 'cover-fallback', style: { background: book.spineColor }, html: `<span>${escapeHtml(book.title)}</span>` }));

    const titleIn = h('textarea', { class: 'title-input', rows: 1, value: book.title });
    titleIn.value = book.title;
    titleIn.addEventListener('input', () => { book.title = titleIn.value.trim() || 'Sin título'; save(); });
    const authorIn = h('input', { class: 'author-input', value: book.author || '', placeholder: 'Autor' });
    authorIn.addEventListener('input', () => { book.author = authorIn.value.trim(); save(); });

    body.append(h('div', { class: 'detail-top' },
      coverEl,
      h('div', { class: 'detail-info' },
        titleIn, authorIn,
        stars(book.rating || 0, (v) => { book.rating = v; save(); }),
        h('div', { class: 'progress' }, h('div', { class: 'progress-fill', style: { width: `${pct}%` } })),
        h('div', { class: 'muted small' }, `${pct}% leído · ${fmtDuration(book.readSeconds)} de lectura${book.pages ? ` · ~${book.pages} págs.` : ''}`),
        btn([icon('book', 18), pct > 0 && pct < 100 ? ' Seguir leyendo' : ' Leer'], () => { closeAllSheets(); openReader(book.id); }, 'primary'))));

    // Estado
    const statusRow = h('div', { class: 'chips' }, STATUS.map(([v, l]) =>
      h('button', { class: `chip ${book.status === v ? 'on' : ''}`, onclick: () => {
        book.status = v;
        if (v === 'leido' && !book.finishedAt) book.finishedAt = Date.now();
        if (v === 'leyendo' && !book.startedAt) book.startedAt = Date.now();
        save(); draw();
      } }, l)));

    // # del libro: escribes y van saliendo los que ya usas
    const tagEditor = tagInput(book, allTags(all.filter((b) => b.id !== book.id)), save);

    // Saga
    const dl = h('datalist', { id: 'sagas-list' }, sagas.map((x) => h('option', { value: x })));
    const sagaIn = h('input', { class: 'input', value: book.saga || '', placeholder: 'Nombre de la saga', list: 'sagas-list' });
    sagaIn.addEventListener('input', () => { book.saga = sagaIn.value.trim(); save(); });
    const sagaNum = h('input', { class: 'input num', type: 'number', min: 0, step: 0.5, value: book.sagaIndex ?? '', placeholder: 'Nº' });
    sagaNum.addEventListener('input', () => { book.sagaIndex = sagaNum.value === '' ? null : parseFloat(sagaNum.value); save(); });

    // Estantería
    const shelfSel = h('select', { class: 'select' }, room.items.filter((i) => i.type === 'shelf' && !i.auto).map((sh) => h('option', { value: sh.id, selected: book.shelfId === sh.id }, sh.name)));
    shelfSel.addEventListener('change', () => { book.shelfId = shelfSel.value; book.nuevo = false; save(); });

    body.append(
      h('section', { class: 'field' }, h('label', { class: 'label' }, 'Estado'), statusRow),
      h('section', { class: 'field' }, h('label', { class: 'label' }, '#'), tagEditor),
      h('div', { class: 'grid2' },
        h('section', { class: 'field' }, h('label', { class: 'label' }, 'Estantería'), shelfSel,
          book.nuevo ? h('button', { class: 'pill small-pill', onclick: (e) => { book.nuevo = false; save(); e.currentTarget.remove(); toast('Colocado: ya no sale en «Libros nuevos»'); } }, icon('check', 16), 'Dejarlo aquí') : null)),
      h('section', { class: 'field' }, h('label', { class: 'label' }, 'Saga'), h('div', { class: 'row gap' }, sagaIn, sagaNum), dl));

    // Sinopsis
    const syn = h('textarea', { class: 'textarea', rows: 6, placeholder: 'Escribe o busca la sinopsis…' });
    syn.value = book.description || '';
    syn.addEventListener('input', () => { book.description = syn.value; book.descriptionSource = 'manual'; save(); });
    body.append(h('section', { class: 'field' },
      h('div', { class: 'row between' },
        h('label', { class: 'label' }, 'Sinopsis', book.descriptionSource && book.descriptionSource !== 'manual' ? h('span', { class: 'muted small' }, ` · de ${book.descriptionSource}`) : null),
        h('button', { class: 'pill small', onclick: lookup }, icon('globe', 16), 'Buscar en internet')),
      syn));

    // Notas
    const notes = h('textarea', { class: 'textarea', rows: 3, placeholder: 'Tus notas, citas favoritas, qué te pareció…' });
    notes.value = book.notes || '';
    notes.addEventListener('input', () => { book.notes = notes.value; save(); });
    body.append(h('section', { class: 'field' }, h('label', { class: 'label' }, 'Mis notas'), notes));

    // Información
    const d = (t) => t ? new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    body.append(h('section', { class: 'field info-table' },
      row('Añadido', d(book.addedAt)), row('Empezado', d(book.startedAt)), row('Terminado', d(book.finishedAt)),
      book.publisher ? row('Editorial', book.publisher) : null,
      book.language ? row('Idioma', book.language) : null,
      row('Origen', book.source === 'pdf' ? 'Convertido desde PDF' : 'EPUB'),
      book.subjects?.length ? row('Etiquetas', book.subjects.join(', ')) : null));

    body.append(h('div', { class: 'row gap wrap detail-actions' },
      h('button', { class: 'pill', onclick: download }, icon('download', 16), 'Descargar EPUB'),
      h('button', { class: 'pill danger', onclick: remove }, icon('trash', 16), 'Eliminar')));
    requestAnimationFrame(() => { titleIn.style.height = titleIn.scrollHeight + 'px'; });
  }

  const row = (k, v) => h('div', { class: 'info-row' }, h('span', { class: 'muted' }, k), h('span', {}, v));

  async function lookup() {
    const box = h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Buscando…'));
    const ls = sheet(box, { title: 'Resultados en internet', tall: true });
    const results = await searchOnline(book);
    box.innerHTML = '';
    if (!results.length) { box.append(h('p', {}, 'No se encontró nada. ¿Hay conexión a internet? Prueba a corregir el título o el autor.')); return; }
    for (const r of results) {
      box.append(h('div', { class: 'result-card' },
        r.cover ? h('img', { src: r.cover, alt: '', loading: 'lazy' }) : null,
        h('div', { class: 'stack small-gap' },
          h('strong', {}, r.title), h('span', { class: 'muted small' }, [r.author, r.year, r.source].filter(Boolean).join(' · ')),
          h('p', { class: 'small clamp' }, r.description || 'Sin sinopsis'),
          h('div', { class: 'row gap wrap' },
            r.description ? btn('Usar sinopsis', () => { book.description = r.description; book.descriptionSource = r.source; if (r.pages && !book.pagesFromWeb) { book.pages = r.pages; book.pagesFromWeb = true; } save(); ls.close(); draw(); toast('Sinopsis guardada'); }, 'primary small') : null,
            r.cover ? btn('Usar portada', async () => {
              try {
                const blob = await shrinkImage(await fetchImage(r.cover.replace('zoom=1', 'zoom=2')));
                book.cover = blob; book.spineColor = (await colorFromImage(blob)) || book.spineColor; save(); ls.close(); draw(); toast('Portada cambiada');
              } catch { toast('No se pudo descargar la portada'); }
            }, 'ghost small') : null))));
    }
  }

  function changeCover() {
    const input = h('input', { type: 'file', accept: 'image/*' });
    input.addEventListener('change', async () => {
      const f = input.files[0]; if (!f) return;
      book.cover = await shrinkImage(f);
      book.spineColor = (await colorFromImage(book.cover)) || book.spineColor;
      save(); draw();
    });
    input.click();
  }

  async function download() {
    const blob = await getFile(book.id);
    if (!blob) return toast('No se encontró el archivo');
    const a = h('a', { href: URL.createObjectURL(blob), download: `${book.title}.epub` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function remove() {
    if (!(await confirmDialog(`¿Eliminar «${book.title}» de tu biblioteca? Se borrará también su progreso.`, { ok: 'Eliminar', danger: true }))) return;
    await deleteBook(book.id);
    changed = true;
    s.close();
    toast('Libro eliminado');
  }

  draw();
}
