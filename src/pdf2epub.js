// Convierte un PDF de texto en un EPUB reflowable (se adapta a la pantalla y a tus ajustes).
import JSZip from 'jszip';
import { XML_BAD } from './epubfix.js';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const esc = (s) => String(s).replace(XML_BAD, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

// Ligaduras tipográficas (ﬁ, ﬂ…): se ven raras con otras letras y estropean las búsquedas
const LIGATURES = { 'ﬀ': 'ff', 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬃ': 'ffi', 'ﬄ': 'ffl', 'ﬅ': 'st', 'ﬆ': 'st', 'Ĳ': 'IJ', 'ĳ': 'ij', 'Œ': 'Œ' };
// Limpia el texto de un trozo del PDF: ligaduras, símbolos de fuentes sin traducir, espacios raros
function cleanStr(s) {
  return s
    .replace(XML_BAD, '')
    .replace(/[ﬀ-ﬆ]/g, (c) => LIGATURES[c] || c)
    .replace(/[�-​-‍⁠﻿]/g, '') // signos ilegibles e invisibles
    .replace(/[ -   　\t]/g, ' ')
    .replace(/[‐‑]/g, '-');
}

// Agrupa los fragmentos de texto de una página en filas (todavía sin unir)
function groupRows(items) {
  const rows = [];
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue;
    const [a, b, , d, x, y] = it.transform;
    // Texto girado (marcas de agua, notas en el margen): no es parte de la lectura
    if (Math.abs(b) > Math.abs(a) * 0.3) continue;
    const size = Math.abs(d) || it.height || 10;
    const str = cleanStr(it.str);
    if (!str.trim()) continue;
    let row = rows.find((r) => Math.abs(r.y - y) < Math.min(size, r.base) * 0.45);
    if (!row) { row = { y, base: size, parts: [] }; rows.push(row); }
    row.parts.push({ x, y, str, w: it.width || 0, size });
  }
  return rows;
}

// Une los fragmentos de una fila en una línea de texto
function finishRow(r) {
  r.parts.sort((a, b) => a.x - b.x);
  // Negritas falsas: algunos PDF imprimen el mismo texto dos veces casi encima («HHoollaa»)
  r.parts = r.parts.filter((p, i, arr) => !arr.slice(Math.max(0, i - 3), i).some((q) => q.str === p.str && Math.abs(q.x - p.x) < p.size * 0.4));
  // Títulos con letras separadas («C A P Í T U L O»): cada letra viene suelta; solo los huecos
  // claramente mayores que el normal entre letras son espacios entre palabras
  const singles = r.parts.filter((p) => p.str.trim().length === 1).length;
  let letterGap = null;
  if (r.parts.length >= 4 && singles >= r.parts.length * 0.8) {
    const gs = r.parts.slice(1).map((p, i) => p.x - (r.parts[i].x + r.parts[i].w)).sort((a, b) => a - b);
    letterGap = gs[Math.floor(gs.length / 2)];
  }
  let text = r.prefix || '', last = null;
  const bySize = new Map();
  for (const p of r.parts) {
    // El hueco entre palabras se mide con la letra de cada trozo, no con la más grande de la fila
    // (una letra capital enorme hacía que se perdieran los espacios: «Aveníanentrelaceremonia»)
    const gap = last ? p.x - (last.x + last.w) : 0;
    const isSpace = letterGap != null
      ? gap > Math.max(letterGap * 1.8, letterGap + p.size * 0.15)
      : gap > Math.min(last?.size ?? p.size, p.size) * 0.2;
    // Un hueco muy grande se marca con dos espacios: así, si luego resulta ser un título con letras
    // separadas («C A P Í T U L O   1»), se sabe dónde acaba cada palabra
    if (last && isSpace && !/\s$/.test(text) && !/^\s/.test(p.str)) text += gap > Math.min(last.size, p.size) * 0.9 ? '  ' : ' ';
    text += letterGap != null ? p.str.trim() : p.str;
    last = p;
    const k = Math.round(p.size * 10) / 10;
    bySize.set(k, (bySize.get(k) || 0) + p.str.trim().length);
  }
  // Letras separadas dentro de un mismo trozo: «C A P Í T U L O  1» → «CAPÍTULO 1»
  if (/^(?:\S {1,3}){3,}\S$/.test(text.trim()) && text.trim().split(/ +/).every((t) => t.length === 1)) {
    text = text.trim().split(/ {2,}/).map((w) => w.replace(/ /g, '')).join(' ');
  }
  r.text = text.replace(/\s+/g, ' ').trim();
  r.x = r.parts[0].x;
  r.right = last ? last.x + last.w : r.x;
  // Tamaño de la fila = el de la mayoría de sus letras
  r.size = [...bySize].sort((a, b) => b[1] - a[1])[0][0];
  return r;
}

// Letras capitales: la primera letra del capítulo en grande, ocupando varias líneas. El PDF la
// trae como un trozo suelto; se pega delante de la primera línea que tiene a su derecha. Si no,
// convertía esa línea en un título.
function joinDropCaps(rows, bodySize) {
  for (const r of [...rows]) {
    for (const p of [...r.parts]) {
      if (p.size < bodySize * 1.6 || !/^[¿¡«"“'‘—–-]?\p{Lu}$/u.test(p.str.trim())) continue;
      const right = p.x + (p.w || p.size * 0.5) * 0.8;
      const top = p.y + p.size * 0.9;
      const target = rows
        .filter((o) => o.parts.some((q) => q !== p && q.size < bodySize * 1.25 && q.x >= right && q.y >= p.y - bodySize * 0.5 && q.y <= top))
        .sort((a, b) => b.y - a.y)[0];
      if (!target) continue;
      r.parts.splice(r.parts.indexOf(p), 1);
      if (!r.parts.length) rows.splice(rows.indexOf(r), 1);
      target.prefix = p.str.trim();
    }
  }
  return rows;
}

function toLines(rows, bodySize) {
  joinDropCaps(rows, bodySize);
  return rows.map(finishRow).filter((r) => r.text).sort((a, b) => b.y - a.y);
}

export async function pdfToEpub(file, onProgress = () => {}) {
  const data = new Uint8Array(await file.arrayBuffer());
  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data }).promise;
  } catch (e) {
    if (e?.name === 'PasswordException') throw new Error('El PDF tiene contraseña. Quítasela primero y vuelve a añadirlo.');
    throw new Error('El PDF está dañado o no se puede leer.');
  }
  let info = {};
  try { info = (await pdf.getMetadata()).info || {}; } catch {}

  const rawPages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    // Una página rota no debe impedir convertir el resto del libro
    try {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      rawPages.push(groupRows(content.items));
      page.cleanup();
    } catch (e) {
      console.warn('página pdf', i, e);
      rawPages.push([]);
    }
    onProgress(i / pdf.numPages * 0.85, `Leyendo página ${i} de ${pdf.numPages}`);
  }
  // Tamaño normal de la letra (contando caracteres, para que las capitales no cuenten)
  const count = new Map();
  let chars = 0;
  for (const rows of rawPages) for (const r of rows) for (const p of r.parts) {
    const n = p.str.trim().length;
    count.set(p.size, (count.get(p.size) || 0) + n); chars += n;
  }
  let bodySize0 = 10, acc = 0;
  for (const [sz, n] of [...count].sort((a, b) => a[0] - b[0])) { acc += n; if (acc >= chars / 2) { bodySize0 = sz; break; } }
  const pages = rawPages.map((rows) => toLines(rows, bodySize0));

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
  // Marcas de agua y avisos repetidos en medio de la página («Descargado de www…»)
  const anywhere = new Map();
  for (const lines of pages) for (const k of new Set(lines.map((l) => l.text.replace(/\d+/g, '#')))) anywhere.set(k, (anywhere.get(k) || 0) + 1);
  // Solo líneas cortas: una línea larga de texto normal repetida en medio libro no es una marca de agua
  const watermark = (k) => k.length >= 8 && k.length <= 80 && (anywhere.get(k) || 0) >= Math.max(4, pdf.numPages * 0.5)
    && (/www\.|https?:|\.com|\.net|\.org|@|descargad|download|©|copyright|todos los derechos|prohibid/i.test(k) || pdf.numPages >= 20);
  const clean = pages.map((lines) => lines.filter((l, idx) => {
    if (/^[-–—\s]*\d{1,4}[-–—\s]*$/.test(l.text)) return false;
    if (/^(p[aá]g(ina)?\.?\s*)?\d{1,4}\s*(de|of|\/)\s*\d{1,4}$/i.test(l.text)) return false; // «Página 3 de 200»
    const k = l.text.replace(/\d+/g, '#');
    const edge = idx < 2 || idx >= lines.length - 2;
    return !(edge && repeated.has(k)) && !watermark(k);
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
  // Ojo: flush no puede llamar a newChapter (que vuelve a llamar a flush): se quedaba en bucle con los PDF que empiezan sin título
  const startChapter = (title) => { chap = { title, html: [] }; chapters.push(chap); };
  const newChapter = (title) => { flush(); startChapter(title); };
  const flush = () => {
    const t = para.trim().replace(/[­¬]/g, '');
    if (t) {
      if (!chap) startChapter(null);
      // Separadores de escena («* * *», «◆»): centrados, no como párrafo
      chap.html.push(isSeparator(t) ? `<div class="sep">${esc(t)}</div>` : `<p>${esc(t)}</p>`);
    }
    para = '';
  };
  const isSeparator = (t) => t.length <= 12 && !/[\p{L}\p{N}]/u.test(t);
  // Títulos escritos con letra normal pero reconocibles («CAPÍTULO 3», «Prólogo»)
  const KEYWORD = /^(cap[ií]tulo|chapter|parte|libro|pr[oó]logo|ep[ií]logo|introducci[oó]n|interludio|pre[aá]mbulo|agradecimientos|nota del autor|nota de la autora)\b/i;
  // Si casi cada página tendría un «título», es que el PDF usa letras de varios tamaños en el
  // texto normal: entonces solo cuentan como títulos las claramente grandes
  let headRatio = 1.25;
  const bigLines = all.filter((l) => l.size > bodySize * 1.25 && l.text.length < 90 && /[\p{L}\p{N}]/u.test(l.text)).length;
  if (bigLines > Math.max(20, pdf.numPages * 1.5)) headRatio = 1.6;
  let pagesInChapter = 0;
  clean.forEach((lines, pIdx) => {
    pagesInChapter++;
    lines.forEach((l, i) => {
      const prevL = lines[i - 1];
      const isBig = l.size > bodySize * headRatio && l.text.length < 90;
      if (isBig && !/[\p{L}\p{N}]/u.test(l.text)) { flush(); para = l.text; flush(); return; }
      const keyword = !isBig && KEYWORD.test(l.text) && l.text.length < 60 && !/[,;]$/.test(l.text)
        && (!prevL || prevL.y - l.y > lineGap * 1.45) && !para.trim().endsWith('-');
      const isHeading = isBig || keyword;
      if (isHeading) {
        flush();
        const prev = lines[i - 1];
        if (prev && prev.size > bodySize * headRatio && chap?.titleOpen && chap.title.length < 120) {
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
      // Una línea que empieza con raya de diálogo tras una frase terminada es otra intervención
      const newDialogue = /^[—―–]\s?[¿¡«"“A-ZÁÉÍÓÚÑÜ]/.test(l.text) && /[.?!…»"”]$/.test(para.trim());
      if (newDialogue) flush();
      else if (!prev && pIdx > 0) {
        // Continuación desde la página anterior
        if (indented) flush();
      } else if (bigGap || indented || prevShort) flush();

      // Palabra partida a final de línea (guion normal, guion blando o «¬»)
      if (/[-\u00AD¬]$/.test(para) && /^[a-záéíóúñü]/.test(l.text)) para = para.slice(0, -1) + l.text;
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
  const named = chapters.filter((c) => c.html.length);
  named.forEach((c, i) => { if (!c.title) c.title = `Parte ${i + 1}`; });
  // Capítulos enormes (un PDF con un solo título al principio): se parten en trozos para que el
  // móvil no tarde ni se atasque al abrirlos. Los trozos siguen bajo el mismo título del índice.
  const MAX = 120000;
  const finalChapters = [];
  for (const c of named) {
    let cur = { title: c.title, html: [] }, size = 0;
    finalChapters.push(cur);
    for (const p of c.html) {
      if (size > MAX && cur.html.length) { cur = { title: c.title, html: [], cont: true }; finalChapters.push(cur); size = 0; }
      cur.html.push(p); size += p.length;
    }
  }

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
  // Títulos que pone el programa que creó el PDF («Microsoft Word - libro.docx», «Untitled»)
  let metaTitle = cleanStr(String(info.Title || '')).trim()
    .replace(/^(microsoft (word|powerpoint)|word|libreoffice|openoffice)\s*-\s*/i, '')
    .replace(/\.(docx?|odt|rtf|txt|pdf|indd|pages)$/i, '').trim();
  if (/^(untitled|sin t[ií]tulo|documento?\s*\d*|document\d*|new document|título|title)$/i.test(metaTitle) || /^[\W\d_]*$/.test(metaTitle)) metaTitle = '';
  const title = (metaTitle.length > 1 ? metaTitle : baseName).slice(0, 200);
  // Algunos PDF traen en «autor» un correo o el programa que lo creó: eso no es un autor
  let author = (info.Author || '').trim();
  if (/@|https?:|www.|microsoft|adobe|word|calibre|^usuario$|^user$/i.test(author)) author = '';
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
  const css = 'body{margin:0 4%;line-height:1.5}p{margin:0;text-indent:1.5em;text-align:justify}h2{text-align:center;margin:1.5em 0 1em;text-indent:0}.sep{text-align:center;margin:1em 0;text-indent:0}.cover{text-align:center}.cover img{max-width:100%;max-height:100vh}';
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
  const navLis = chapters.map((c, i) => c.cont ? '' : `<li><a href="cap${String(i + 1).padStart(3, '0')}.xhtml">${esc(c.title)}</a></li>`).join('');
  zip.file('OEBPS/nav.xhtml', xhtml('Índice', `<nav epub:type="toc" id="toc"><h1>Índice</h1><ol>${navLis}</ol></nav>`));
  manifest.push('<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>');
  manifest.push('<item id="css" href="style.css" media-type="text/css"/>');
  const ncxPoints = chapters.map((c, i) => c.cont ? '' : `<navPoint id="n${i}" playOrder="${i + 1}"><navLabel><text>${esc(c.title)}</text></navLabel><content src="cap${String(i + 1).padStart(3, '0')}.xhtml"/></navPoint>`).join('');
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
