// Convierte un PDF de texto en un EPUB reflowable (se adapta a la pantalla y a tus ajustes).
import JSZip from 'jszip';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

// Agrupa los fragmentos de texto de una página en líneas
function toLines(items) {
  const rows = [];
  for (const it of items) {
    if (!it.str || !it.str.trim()) { if (it.hasEOL && rows.length) rows[rows.length - 1].eol = true; continue; }
    const x = it.transform[4], y = it.transform[5];
    const size = Math.abs(it.transform[3]) || it.height || 10;
    let row = rows.find((r) => Math.abs(r.y - y) < size * 0.45);
    if (!row) { row = { y, x, size, parts: [] }; rows.push(row); }
    row.parts.push({ x, str: it.str, w: it.width });
    row.x = Math.min(row.x, x);
    row.size = Math.max(row.size, size);
  }
  rows.sort((a, b) => b.y - a.y);
  for (const r of rows) {
    r.parts.sort((a, b) => a.x - b.x);
    let text = '', lastEnd = null;
    for (const p of r.parts) {
      if (lastEnd != null && p.x - lastEnd > r.size * 0.2 && !text.endsWith(' ') && !p.str.startsWith(' ')) text += ' ';
      text += p.str;
      lastEnd = p.x + (p.w || 0);
    }
    r.text = text.replace(/\s+/g, ' ').trim();
    r.right = lastEnd || r.x;
  }
  return rows.filter((r) => r.text);
}

export async function pdfToEpub(file, onProgress = () => {}) {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  let info = {};
  try { info = (await pdf.getMetadata()).info || {}; } catch {}

  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(toLines(content.items));
    onProgress(i / pdf.numPages * 0.85, `Leyendo página ${i} de ${pdf.numPages}`);
  }

  const totalChars = pages.flat().reduce((n, l) => n + l.text.length, 0);
  if (totalChars < pdf.numPages * 40) {
    throw new Error('Este PDF parece escaneado (imágenes sin texto) y no se puede convertir a EPUB.');
  }

  // Quitar cabeceras/pies repetidos y números de página
  const freq = new Map();
  for (const lines of pages) {
    const edge = [...lines.slice(0, 2), ...lines.slice(-2)];
    for (const l of edge) {
      const k = l.text.replace(/\d+/g, '#');
      freq.set(k, (freq.get(k) || 0) + 1);
    }
  }
  const repeated = new Set([...freq].filter(([, n]) => n >= Math.max(3, pdf.numPages * 0.3)).map(([k]) => k));
  const clean = pages.map((lines) => lines.filter((l, idx) => {
    if (/^[-–—\s]*\d{1,4}[-–—\s]*$/.test(l.text)) return false;
    const edge = idx < 2 || idx >= lines.length - 2;
    return !(edge && repeated.has(l.text.replace(/\d+/g, '#')));
  }));

  const all = clean.flat();
  const bodySize = median(all.map((l) => l.size));
  const gaps = [];
  for (const lines of clean) for (let i = 1; i < lines.length; i++) gaps.push(lines[i - 1].y - lines[i].y);
  const lineGap = median(gaps.filter((g) => g > 0)) || bodySize * 1.2;
  const leftMargin = median(all.map((l) => l.x));
  const rightEdge = median(all.map((l) => l.right));

  // Construir capítulos con párrafos
  const chapters = [];
  let chap = null, para = '';
  const newChapter = (title) => { flush(); chap = { title, html: [] }; chapters.push(chap); };
  const flush = () => {
    if (para.trim()) { if (!chap) newChapter(null); chap.html.push(`<p>${esc(para.trim())}</p>`); }
    para = '';
  };
  let pagesInChapter = 0;
  clean.forEach((lines, pIdx) => {
    pagesInChapter++;
    lines.forEach((l, i) => {
      const isHeading = l.size > bodySize * 1.25 && l.text.length < 90;
      if (isHeading) {
        flush();
        const prev = lines[i - 1];
        if (prev && prev.size > bodySize * 1.25 && chap?.titleOpen) {
          chap.title += ' ' + l.text;
          chap.html[chap.html.length - 1] = `<h2>${esc(chap.title)}</h2>`;
        } else {
          newChapter(l.text);
          chap.titleOpen = true;
          chap.html.push(`<h2>${esc(l.text)}</h2>`);
          pagesInChapter = 0;
        }
        return;
      }
      if (chap) chap.titleOpen = false;
      const prev = i > 0 ? lines[i - 1] : null;
      const bigGap = prev && prev.y - l.y > lineGap * 1.45;
      const indented = l.x - leftMargin > bodySize * 0.8;
      const prevShort = prev && prev.right < rightEdge - bodySize * 3 && /[.!?:»"”)]$/.test(prev.text);
      if (!prev && pIdx > 0) {
        // Continuación desde la página anterior
        if (indented) flush();
      } else if (bigGap || indented || prevShort) flush();

      if (para.endsWith('-') && /^[a-záéíóúñü]/.test(l.text)) para = para.slice(0, -1) + l.text;
      else para += (para ? ' ' : '') + l.text;
    });
    // Si no hay títulos, partir cada 15 páginas para que sea manejable
    if (pagesInChapter >= 15 && chapters.length && !chapters.some((c) => c.title)) {
      flush();
      newChapter(null);
      pagesInChapter = 0;
    }
  });
  flush();
  const finalChapters = chapters.filter((c) => c.html.length);
  finalChapters.forEach((c, i) => { if (!c.title) c.title = `Parte ${i + 1}`; });

  // Portada: la primera página renderizada
  let cover = null;
  try {
    const page = await pdf.getPage(1);
    const vp = page.getViewport({ scale: 1 });
    const scale = 900 / Math.max(vp.width, vp.height);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport, canvas }).promise;
    cover = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
  } catch (e) { console.warn('portada pdf', e); }

  onProgress(0.92, 'Creando el EPUB…');
  const baseName = file.name.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ');
  const title = (info.Title && info.Title.trim().length > 1 ? info.Title.trim() : baseName);
  const author = (info.Author || '').trim();
  const epub = await buildEpub({ title, author, chapters: finalChapters, cover });
  onProgress(1, 'Listo');
  return epub;
}

export async function buildEpub({ title, author, chapters, cover, language = 'es' }) {
  const zip = new JSZip();
  const uid = 'urn:uuid:' + crypto.randomUUID();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
  const css = 'body{margin:0 4%;line-height:1.5}p{margin:0;text-indent:1.5em;text-align:justify}h2{text-align:center;margin:1.5em 0 1em;text-indent:0}.cover{text-align:center}.cover img{max-width:100%;max-height:100vh}';
  zip.file('OEBPS/style.css', css);
  const xhtml = (t, body) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${language}"><head><meta charset="UTF-8"/><title>${esc(t)}</title><link rel="stylesheet" href="style.css"/></head><body>${body}</body></html>`;

  const manifest = [], spine = [];
  if (cover) {
    zip.file('OEBPS/cover.jpg', cover);
    manifest.push('<item id="cover-img" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>');
    zip.file('OEBPS/cover.xhtml', xhtml('Portada', '<div class="cover"><img src="cover.jpg" alt="Portada"/></div>'));
    manifest.push('<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>');
    spine.push('<itemref idref="cover"/>');
  }
  chapters.forEach((c, i) => {
    const name = `cap${String(i + 1).padStart(3, '0')}.xhtml`;
    zip.file(`OEBPS/${name}`, xhtml(c.title, c.html.join('\n')));
    manifest.push(`<item id="c${i}" href="${name}" media-type="application/xhtml+xml"/>`);
    spine.push(`<itemref idref="c${i}"/>`);
  });
  const navLis = chapters.map((c, i) => `<li><a href="cap${String(i + 1).padStart(3, '0')}.xhtml">${esc(c.title)}</a></li>`).join('');
  zip.file('OEBPS/nav.xhtml', xhtml('Índice', `<nav epub:type="toc" id="toc"><h1>Índice</h1><ol>${navLis}</ol></nav>`));
  manifest.push('<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>');
  manifest.push('<item id="css" href="style.css" media-type="text/css"/>');
  const ncxPoints = chapters.map((c, i) => `<navPoint id="n${i}" playOrder="${i + 1}"><navLabel><text>${esc(c.title)}</text></navLabel><content src="cap${String(i + 1).padStart(3, '0')}.xhtml"/></navPoint>`).join('');
  zip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="UTF-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="${uid}"/></head><docTitle><text>${esc(title)}</text></docTitle><navMap>${ncxPoints}</navMap></ncx>`);
  manifest.push('<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>');

  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="uid">${uid}</dc:identifier>
<dc:title>${esc(title)}</dc:title>
${author ? `<dc:creator>${esc(author)}</dc:creator>` : ''}
<dc:language>${language}</dc:language>
<meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
${cover ? '<meta name="cover" content="cover-img"/>' : ''}
</metadata>
<manifest>${manifest.join('\n')}</manifest>
<spine toc="ncx">${spine.join('')}</spine>
</package>`);
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  return new File([blob], `${title}.epub`, { type: 'application/epub+zip' });
}
