// Arregla EPUB ya guardados que traen caracteres que el XML no admite (los convertidos desde
// algunos PDF): con uno solo, el capítulo no se abría y salía una página de error.
import JSZip from 'jszip';

// Caracteres que el XML no admite (controles invisibles que traen algunos PDF)
export const XML_BAD = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export async function repairEpub(blob) {
  const zip = await JSZip.loadAsync(blob);
  let changed = false;
  for (const f of Object.values(zip.files)) {
    if (f.dir || !/\.(x?html?|xml|opf|ncx)$/i.test(f.name)) continue;
    const text = await f.async('string');
    XML_BAD.lastIndex = 0;
    if (!XML_BAD.test(text)) continue;
    zip.file(f.name, text.replace(XML_BAD, ''));
    changed = true;
  }
  if (!changed) return null;
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  const out = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip', compression: 'DEFLATE' });
  return new File([out], blob.name || 'libro.epub', { type: 'application/epub+zip' });
}
