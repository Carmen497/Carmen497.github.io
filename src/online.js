// Búsqueda de sinopsis y portadas en internet (Google Books y Open Library, sin claves).
import { stripHtml } from './epubmeta.js';

export async function searchOnline(book) {
  const results = [];
  const q = [];
  if (book.isbn) q.push(`isbn:${book.isbn}`);
  const title = (book.title || '').replace(/[([].*?[)\]]/g, '').trim();
  q.push(`intitle:${title}${book.author ? ` inauthor:${book.author.split(',')[0]}` : ''}`);
  for (const query of q) {
    try {
      const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=6&printType=books`);
      if (!r.ok) continue;
      const data = await r.json();
      for (const it of data.items || []) {
        const v = it.volumeInfo || {};
        if (!v.description && !v.imageLinks) continue;
        results.push({
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
      if (results.length) break;
    } catch (e) { console.warn('Google Books', e); }
  }
  if (!results.some((r) => r.description)) {
    try {
      const r = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}${book.author ? `&author=${encodeURIComponent(book.author.split(',')[0])}` : ''}&limit=4&fields=key,title,author_name,cover_i,number_of_pages_median,first_publish_year`);
      const data = await r.json();
      for (const d of data.docs || []) {
        let description = '';
        try {
          const w = await (await fetch(`https://openlibrary.org${d.key}.json`)).json();
          description = typeof w.description === 'string' ? w.description : w.description?.value || '';
        } catch {}
        results.push({
          source: 'Open Library',
          title: d.title,
          author: (d.author_name || []).join(', '),
          description: description.replace(/\(\[source\].*$/s, '').trim(),
          cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : '',
          pages: d.number_of_pages_median || 0,
          categories: [],
          year: d.first_publish_year || '',
        });
      }
    } catch (e) { console.warn('Open Library', e); }
  }
  // Preferir las que tienen sinopsis en español
  return results.sort((a, b) => (b.language === 'es') - (a.language === 'es') || (b.description ? 1 : 0) - (a.description ? 1 : 0));
}

export async function fetchImage(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('No se pudo descargar la imagen');
  return r.blob();
}
