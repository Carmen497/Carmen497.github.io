// Lee los metadatos de un EPUB: título, autor, sinopsis, saga, portada, etc.
import JSZip from 'jszip';

const parser = () => new DOMParser();

function resolvePath(base, href) {
  const parts = (base ? base.split('/') : []);
  for (const seg of decodeURIComponent(href.split('#')[0]).split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.' && seg !== '') parts.push(seg);
  }
  return parts.join('/');
}

function textOf(doc, local) {
  const el = doc.getElementsByTagNameNS('*', local)[0];
  return el ? el.textContent.trim() : '';
}

export function stripHtml(html) {
  if (!html) return '';
  const doc = parser().parseFromString(`<div>${html}</div>`, 'text/html');
  doc.querySelectorAll('p,br,div,li').forEach((n) => n.append('\n'));
  return doc.body.textContent.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
}

export async function readEpubMeta(blob) {
  const zip = await JSZip.loadAsync(blob);
  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerXml) throw new Error('No parece un EPUB válido');
  const container = parser().parseFromString(containerXml, 'application/xml');
  const opfPath = container.getElementsByTagNameNS('*', 'rootfile')[0]?.getAttribute('full-path');
  const opfXml = await zip.file(opfPath)?.async('string');
  if (!opfXml) throw new Error('No se encontró el índice del EPUB');
  const opf = parser().parseFromString(opfXml, 'application/xml');
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : '';

  const meta = {
    title: textOf(opf, 'title'),
    author: [...opf.getElementsByTagNameNS('*', 'creator')].map((e) => e.textContent.trim()).filter(Boolean).join(', '),
    description: stripHtml(textOf(opf, 'description')),
    language: textOf(opf, 'language'),
    publisher: textOf(opf, 'publisher'),
    subjects: [...opf.getElementsByTagNameNS('*', 'subject')].map((e) => e.textContent.trim()).filter(Boolean),
    isbn: '',
    saga: '',
    sagaIndex: null,
    cover: null,
    pages: 0,
  };

  for (const id of opf.getElementsByTagNameNS('*', 'identifier')) {
    const v = id.textContent.replace(/[^0-9Xx]/g, '');
    if (v.length === 13 || v.length === 10) { meta.isbn = v; break; }
  }

  const metas = [...opf.getElementsByTagNameNS('*', 'meta')];
  // Saga estilo Calibre
  for (const m of metas) {
    const name = m.getAttribute('name');
    if (name === 'calibre:series') meta.saga = m.getAttribute('content') || '';
    if (name === 'calibre:series_index') meta.sagaIndex = parseFloat(m.getAttribute('content')) || null;
  }
  // Saga estilo EPUB3
  if (!meta.saga) {
    const coll = metas.find((m) => m.getAttribute('property') === 'belongs-to-collection');
    if (coll) {
      meta.saga = coll.textContent.trim();
      const id = coll.getAttribute('id');
      const pos = metas.find((m) => m.getAttribute('property') === 'group-position' && m.getAttribute('refines') === '#' + id);
      if (pos) meta.sagaIndex = parseFloat(pos.textContent) || null;
    }
  }

  // Portada
  const items = [...opf.getElementsByTagNameNS('*', 'item')];
  let coverItem = items.find((i) => (i.getAttribute('properties') || '').split(' ').includes('cover-image'));
  if (!coverItem) {
    const coverId = metas.find((m) => m.getAttribute('name') === 'cover')?.getAttribute('content');
    if (coverId) coverItem = items.find((i) => i.getAttribute('id') === coverId);
  }
  if (!coverItem) {
    coverItem = items.find((i) => /image/.test(i.getAttribute('media-type') || '') && /cover|portada/i.test((i.getAttribute('id') || '') + (i.getAttribute('href') || '')));
  }
  if (coverItem) {
    const file = zip.file(resolvePath(opfDir, coverItem.getAttribute('href')));
    if (file) {
      const data = await file.async('blob');
      meta.cover = new Blob([data], { type: coverItem.getAttribute('media-type') || 'image/jpeg' });
    }
  }

  // Estimación de páginas (≈1500 caracteres por página)
  const byId = Object.fromEntries(items.map((i) => [i.getAttribute('id'), i.getAttribute('href')]));
  let chars = 0;
  for (const ref of opf.getElementsByTagNameNS('*', 'itemref')) {
    const href = byId[ref.getAttribute('idref')];
    if (!href) continue;
    const f = zip.file(resolvePath(opfDir, href));
    if (!f) continue;
    const html = await f.async('string');
    chars += html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').length;
  }
  meta.pages = Math.max(1, Math.round(chars / 1500));
  if (!meta.title) meta.title = 'Sin título';
  return meta;
}
