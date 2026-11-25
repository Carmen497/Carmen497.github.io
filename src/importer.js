// Añadir libros: EPUB directamente, PDF convertido a EPUB.
import { readEpubMeta } from './epubmeta.js';
import { repairEpub, REPAIR_VERSION } from './epubfix.js';
import { putBook, putFile, getBooks, takeInbox } from './db.js';
import { pickShelf, colorFromImage, hashColor, shrinkImage, getGenres } from './store.js';
import { h, sheet, toast } from './ui.js';

const isPdf = (f) => /pdf/i.test(f.type) || /\.pdf$/i.test(f.name);
const isEpub = (f) => /epub/i.test(f.type) || /\.epub$/i.test(f.name);

// Intenta reconocer un género a partir de las materias del libro
async function guessGenre(subjects) {
  const s = subjects.join(' ').toLowerCase();
  const map = [
    ['fantasia', /fantas/], ['scifi', /ciencia ficci|science fiction|sci-fi|scifi/], ['romance', /romance|romántic|romantic|amor/],
    ['thriller', /thriller|suspense/], ['misterio', /misterio|mystery|policiac|detective|crime|crimen|negra/],
    ['historica', /hist[oó]ric/], ['juvenil', /juvenil|young adult|infantil/], ['poesia', /poes|poetry/],
    ['clasicos', /cl[aá]sic/], ['noficcion', /ensayo|biograf|non-fiction|nonfiction|autoayuda|divulga/],
  ];
  const genres = await getGenres();
  for (const [id, re] of map) if (re.test(s) && genres.some((g) => g.id === id)) return id;
  return '';
}

export async function importFiles(files) {
  files = [...files].filter((f) => isPdf(f) || isEpub(f) || /octet-stream/.test(f.type));
  if (!files.length) { toast('Solo se pueden añadir archivos EPUB o PDF'); return []; }

  const status = h('p', { class: 'muted' }, 'Preparando…');
  const bar = h('div', { class: 'progress' }, h('div', { class: 'progress-fill' }));
  const s = sheet(h('div', { class: 'dialog' }, status, bar), { title: 'Añadiendo libros' });
  const setP = (p, msg) => { bar.firstChild.style.width = `${Math.round(p * 100)}%`; if (msg) status.textContent = msg; };

  const added = [];
  const existing = await getBooks();
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    const prefix = files.length > 1 ? `(${i + 1}/${files.length}) ` : '';
    try {
      let source = 'epub';
      if (isPdf(file) || (!isEpub(file) && await looksLikePdf(file))) {
        source = 'pdf';
        setP(0, `${prefix}Convirtiendo PDF a EPUB…`);
        const { pdfToEpub } = await import('./pdf2epub.js');
        file = await pdfToEpub(file, (p, m) => setP(p, prefix + m));
      }
      setP(0.95, `${prefix}Leyendo datos del libro…`);
      // Capítulos mal formados (salían como página de error): se arreglan ya al añadir el libro
      try { const fixed = await repairEpub(file); if (fixed) file = fixed; } catch (e) { console.warn('reparar epub', e); }
      const meta = await readEpubMeta(file);
      const dup = existing.find((b) => b.title.toLowerCase() === meta.title.toLowerCase() && (b.author || '') === (meta.author || ''));
      if (dup) { toast(`«${meta.title}» ya está en tu biblioteca`); continue; }

      const id = crypto.randomUUID();
      const cover = meta.cover ? await shrinkImage(meta.cover) : null;
      const book = {
        id,
        title: meta.title,
        author: meta.author,
        description: meta.description,
        descriptionSource: meta.description ? 'libro' : '',
        language: meta.language,
        publisher: meta.publisher,
        subjects: meta.subjects,
        isbn: meta.isbn,
        saga: meta.saga,
        sagaIndex: meta.sagaIndex,
        genre: await guessGenre(meta.subjects),
        rating: 0,
        status: 'pendiente',
        notes: '',
        pages: meta.pages,
        cover,
        spineColor: (cover && await colorFromImage(cover)) || hashColor(meta.title),
        source,
        fileName: file.name,
        fileSize: file.size,
        addedAt: Date.now(),
        progress: 0,
        cfi: null,
        readSeconds: 0,
        bookmarks: [],
        xmlOk: REPAIR_VERSION,
      };
      book.shelfId = await pickShelf(book);
      await putFile(id, new Blob([file], { type: 'application/epub+zip' }));
      await putBook(book);
      existing.push(book);
      added.push(book);
    } catch (e) {
      console.error(e);
      toast(`No se pudo añadir «${files[i].name}»: ${e.message}`, 5000);
    }
  }
  s.close();
  if (added.length) {
    toast(added.length === 1 ? `«${added[0].title}» añadido a tu biblioteca` : `${added.length} libros añadidos`);
    window.dispatchEvent(new CustomEvent('library-changed'));
  }
  return added;
}

async function looksLikePdf(file) {
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...head) === '%PDF-';
}

export function pickFiles() {
  const input = h('input', { type: 'file', accept: '.epub,.pdf,application/epub+zip,application/pdf', multiple: true, style: { display: 'none' } });
  input.addEventListener('change', () => { if (input.files.length) importFiles(input.files); input.remove(); });
  document.body.append(input);
  input.click();
}

// Archivos que llegan desde "Compartir" (Telegram, etc.) o "Abrir con"
export async function processInbox() {
  const items = await takeInbox();
  if (!items.length) return;
  const files = items.map((it) => new File([it.blob], it.name, { type: it.type }));
  return importFiles(files);
}

export function setupLaunchQueue() {
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async (params) => {
      if (!params.files?.length) return;
      const files = await Promise.all(params.files.map((fh) => fh.getFile()));
      importFiles(files);
    });
  }
}

// Arrastrar y soltar archivos en ordenador
export function setupDropZone() {
  window.addEventListener('dragover', (e) => { e.preventDefault(); document.body.classList.add('dragging'); });
  window.addEventListener('dragleave', (e) => { if (!e.relatedTarget) document.body.classList.remove('dragging'); });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    document.body.classList.remove('dragging');
    if (e.dataTransfer?.files?.length) importFiles(e.dataTransfer.files);
  });
}
