// Arregla EPUB que el lector no podría abrir bien. Con un solo fallo de XML en un capítulo, el
// navegador muestra una página de error («This page contains the following errors…») en lugar
// del texto. Pasa con libros convertidos de PDF y con EPUB hechos con prisas por ahí:
//  - caracteres de control que el XML no admite
//  - entidades de HTML que el XML no conoce (&nbsp; &aacute; …)
//  - «&» sueltos, etiquetas sin cerrar (<br>, <img …>), atributos sin comillas
import JSZip from 'jszip';

// Caracteres que el XML no admite (controles invisibles que traen algunos PDF)
export const XML_BAD = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

// Sube cuando se añadan arreglos nuevos: los libros guardados se revisan otra vez una sola vez
export const REPAIR_VERSION = 2;

const XML_ENTITIES = new Set(['amp', 'lt', 'gt', 'quot', 'apos']);
const isHtmlName = (n) => /\.(x?html?|xht)$/i.test(n);
const isXmlName = (n) => /\.(opf|ncx|xml)$/i.test(n) && !/^META-INF\/(signatures|encryption|rights)/i.test(n);

function broken(text, type) {
  const doc = new DOMParser().parseFromString(text, type);
  return !!doc.getElementsByTagName('parsererror').length;
}

// &nbsp; → &#160; (el XML solo conoce cinco entidades con nombre)
function fixEntities(text) {
  const decoder = document.createElement('textarea');
  return text.replace(/&([a-zA-Z][a-zA-Z0-9]{1,31});/g, (m, name) => {
    if (XML_ENTITIES.has(name)) return m;
    decoder.innerHTML = m;
    const v = decoder.value;
    return v === m ? '' : [...v].map((c) => `&#${c.codePointAt(0)};`).join('');
  });
}

// «&» que no empieza una entidad → &amp;
const fixAmps = (text) => text.replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');

// Último recurso: leerlo como HTML (que lo perdona todo) y volver a escribirlo como XHTML válido
function rebuildXhtml(text) {
  const src = text.replace(/^﻿/, '').replace(/<\?xml[^>]*\?>/i, '').replace(/<!DOCTYPE[^>]*>/i, '');
  const doc = new DOMParser().parseFromString(src, 'text/html');
  const lang = doc.documentElement.getAttribute('lang') || doc.documentElement.getAttribute('xml:lang');
  const ser = new XMLSerializer();
  const strip = (s) => s.replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, '');
  const inner = (el) => strip([...el.childNodes].map((n) => ser.serializeToString(n)).join(''));
  const attr = (v) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const bodyAttrs = [...doc.body.attributes].filter((a) => /^[a-zA-Z_][\w.-]*$/.test(a.name)).map((a) => ` ${a.name}="${attr(a.value)}"`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"${lang ? ` lang="${attr(lang)}" xml:lang="${attr(lang)}"` : ''}><head>${inner(doc.head)}</head><body${bodyAttrs}>${inner(doc.body)}</body></html>`;
}

// Devuelve el texto arreglado, o null si ya estaba bien (o no se pudo mejorar)
export function repairText(name, text) {
  let t = text.replace(XML_BAD, '');
  const type = isHtmlName(name) ? 'application/xhtml+xml' : 'application/xml';
  if (!broken(t, type)) return t === text ? null : t;
  t = fixAmps(fixEntities(t));
  if (!broken(t, type)) return t;
  if (isHtmlName(name)) {
    const r = rebuildXhtml(t);
    if (!broken(r, type)) return r;
  }
  return t === text ? null : t;
}

export async function repairEpub(blob) {
  const zip = await JSZip.loadAsync(blob);
  let changed = false;
  for (const f of Object.values(zip.files)) {
    if (f.dir || !(isHtmlName(f.name) || isXmlName(f.name))) continue;
    const text = await f.async('string');
    let fixed = null;
    try { fixed = repairText(f.name, text); } catch (e) { console.warn('reparar', f.name, e); }
    if (fixed == null) continue;
    zip.file(f.name, fixed);
    changed = true;
  }
  if (!changed) return null;
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  const out = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip', compression: 'DEFLATE' });
  return new File([out], blob.name || 'libro.epub', { type: 'application/epub+zip' });
}
