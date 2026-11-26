// Búsqueda de sinopsis y portadas en internet (Google Books, Wikipedia y Open Library, sin claves).
// Google Books sin clave se queda muchas veces sin cupo (error 429), así que se buscan las tres a la vez
// y se junta lo que llegue.
import { stripHtml } from './epubmeta.js';

const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();

async function getJson(url, ms = 9000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

async function fromGoogle(book, title, author) {
  const out = [];
  const q = [];
  if (book.isbn) q.push(`isbn:${book.isbn}`);
  q.push(`intitle:${title}${author ? ` inauthor:${author}` : ''}`);
  q.push(`${title} ${author}`.trim());
  for (const query of q) {
    let data;
    try { data = await getJson(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=6&printType=books`); }
    catch (e) { console.warn('Google Books', e); return out; } // sin cupo o sin conexión: no insistir
    for (const it of data.items || []) {
      const v = it.volumeInfo || {};
      if (!v.description && !v.imageLinks) continue;
      out.push({
        source: 'Google Books',
        title: v.title,
        author: (v.authors || []).join(', '),
        description: stripHtml(v.description || ''),
        cover: (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://').replace('&edge=curl', ''),
        pages: v.pageCount || 0,
        categories: v.categories || [],
        language: v.language,
        year: (v.publishedDate || '').slice(0, 4),
      });
    }
    if (out.some((r) => r.description)) break;
  }
  return out;
}

// Wikipedia en español: la entrada de la novela suele resumir de qué trata
async function fromWikipedia(title, author) {
  const out = [];
  const ft = fold(title), surname = fold(author).split(' ').pop() || '';
  const searches = [`intitle:"${title}" ${author}`.trim(), `${title} ${author} novela`.trim()];
  const seen = new Set();
  for (const s of searches) {
    let data;
    try {
      data = await getJson('https://es.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1'
        + `&generator=search&gsrsearch=${encodeURIComponent(s)}&gsrlimit=5`
        + '&prop=extracts|pageimages&exintro=1&explaintext=1&exchars=1500&piprop=thumbnail&pithumbsize=400');
    } catch (e) { console.warn('Wikipedia', e); return out; }
    const pages = Object.values(data.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
    for (const p of pages) {
      if (seen.has(p.pageid)) continue;
      seen.add(p.pageid);
      const pt = fold(p.title.replace(/\(.*?\)/g, '')), ex = fold(p.extract);
      // Solo páginas que sean de este libro: título parecido y que hable de su autor o de una novela/libro
      const sameTitle = pt === ft || pt.startsWith(ft) || ft.startsWith(pt) || ex.startsWith(ft);
      const aboutBook = (surname && ex.includes(surname)) || /\b(novela|libro|saga|relato|cuento|poemario|ensayo)\b/.test(ex);
      if (!sameTitle || !aboutBook || !p.extract) continue;
      out.push({
        source: 'Wikipedia',
        title: p.title,
        author: author || '',
        description: p.extract.replace(/​/g, '').replace(/\s*\n+\s*/g, '\n\n').trim(),
        cover: '',
        pages: 0,
        categories: [],
        language: 'es',
        year: '',
      });
    }
    if (out.length) break;
  }
  return out;
}

async function fromOpenLibrary(title, author) {
  const out = [];
  let data;
  try {
    data = await getJson(`https://openlibrary.org/search.json?q=${encodeURIComponent(`${title} ${author}`.trim())}&limit=4&fields=key,title,author_name,cover_i,number_of_pages_median,first_publish_year`);
  } catch (e) { console.warn('Open Library', e); return out; }
  await Promise.all((data.docs || []).map(async (d, i) => {
    let description = '';
    try {
      const w = await getJson(`https://openlibrary.org${d.key}.json`, 7000);
      description = typeof w.description === 'string' ? w.description : w.description?.value || '';
    } catch {}
    out[i] = {
      source: 'Open Library',
      title: d.title,
      author: (d.author_name || []).join(', '),
      description: description.replace(/\(\[source\].*$/s, '').replace(/-{3,}[\s\S]*$/, '').replace(/\[([^\]]+)\](\([^)]*\)|\[\d+\])/g, '$1').replace(/^\s*\[\d+\]:.*$/gm, '').replace(/\*{2,3}/g, '').trim(),
      cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : '',
      pages: d.number_of_pages_median || 0,
      categories: [],
      language: 'en',
      year: d.first_publish_year || '',
    };
  }));
  return out.filter(Boolean);
}

export async function searchOnline(book) {
  const title = (book.title || '').replace(/[([].*?[)\]]/g, '').replace(/\s+/g, ' ').trim();
  const author = (book.author || '').split(/[,;&]| y /)[0].trim();
  const lists = await Promise.all([
    fromGoogle(book, title, author).catch(() => []),
    fromWikipedia(title, author).catch(() => []),
    fromOpenLibrary(title, author).catch(() => []),
  ]);
  const results = lists.flat();
  // Primero las que tienen sinopsis, y de esas las que están en español
  const score = (r) => (r.description ? 2 : 0) + (r.language === 'es' ? 1 : 0);
  return results.sort((a, b) => score(b) - score(a));
}

export async function fetchImage(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('No se pudo descargar la imagen');
  return r.blob();
}
