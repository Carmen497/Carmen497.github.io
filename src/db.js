import { openDB } from 'idb';

const DB_NAME = 'rincon-lectura';
const VERSION = 1;

let dbp;
export function db() {
  if (!dbp) {
    dbp = openDB(DB_NAME, VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains('books')) d.createObjectStore('books', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('files')) d.createObjectStore('files', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('days')) d.createObjectStore('days', { keyPath: 'date' });
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if (!d.objectStoreNames.contains('inbox')) d.createObjectStore('inbox', { keyPath: 'id' });
      },
    });
  }
  return dbp;
}

// ---- Libros ----
export async function getBooks() { return (await db()).getAll('books'); }
export async function getBook(id) { return (await db()).get('books', id); }
export async function putBook(book) {
  book.updatedAt = Date.now();
  await (await db()).put('books', book);
  markDirty();
  return book;
}
export async function deleteBook(id) {
  const d = await db();
  await d.delete('books', id);
  await d.delete('files', id);
  markDirty();
}
export async function getFile(id) { return (await (await db()).get('files', id))?.blob; }
export async function putFile(id, blob) { await (await db()).put('files', { id, blob }); }

// ---- Días (estadísticas) ----
export async function getDays() { return (await db()).getAll('days'); }
export async function addDay(date, seconds, pages, bookId) {
  const d = await db();
  const row = (await d.get('days', date)) || { date, seconds: 0, pages: 0, books: {} };
  row.seconds += seconds;
  row.pages += pages;
  if (bookId) row.books[bookId] = (row.books[bookId] || 0) + seconds;
  await d.put('days', row);
}

// ---- Clave/valor ----
export async function kvGet(key, def) {
  const v = await (await db()).get('kv', key);
  return v === undefined ? def : v;
}
export async function kvSet(key, value, dirty = true) {
  await (await db()).put('kv', value, key);
  if (dirty) markDirty();
}

// ---- Bandeja de archivos compartidos ----
export async function putInbox(item) { await (await db()).put('inbox', item); }
export async function takeInbox() {
  const d = await db();
  const items = await d.getAll('inbox');
  await d.clear('inbox');
  return items;
}

// ---- Cambios pendientes de copia ----
const listeners = new Set();
export function onDirty(fn) { listeners.add(fn); }
function markDirty() {
  if (typeof self.localStorage === 'undefined') return;
  try { localStorage.setItem('rincon-dirty', String(Date.now())); } catch {}
  listeners.forEach((fn) => fn());
}
