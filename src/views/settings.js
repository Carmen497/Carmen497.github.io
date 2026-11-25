// Ajustes: apariencia, #, copias de seguridad y ayuda.
import { h, icon, btn, sheet, toast, confirmDialog, promptDialog } from '../ui.js';
import { getAppSettings, saveAppSettings, getGenres, saveGenres, allTags, tagKey, cleanTag, tagColor, LIST_GROUPS, LIST_SORTS, getRoom, saveRoom } from '../store.js';
import { canPlace, catalogOf } from '../iso/room.js';
import { getBooks, putBook, kvGet } from '../db.js';
import {
  exportZip, importZip, backupToDrive, restoreFromDrive, driveBackupInfo, disconnectDrive, driveTokenValid,
} from '../backup.js';
import { applyAppTheme, APP_VERSION } from '../main.js';
import { pickFiles } from '../importer.js';

export async function renderSettings(root) {
  const app = await getAppSettings();
  root.append(h('header', { class: 'topbar' }, h('h1', { class: 'brand' }, 'Ajustes')));
  const page = h('div', { class: 'page settings' });
  root.append(page);
  const save = () => saveAppSettings(app);

  // Apariencia
  const themeChips = h('div', { class: 'chips' }, [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Noche']].map(([v, l]) =>
    h('button', { class: `chip ${app.theme === v ? 'on' : ''}`, onclick: (e) => {
      app.theme = v; save(); applyAppTheme(v);
      themeChips.querySelectorAll('.chip').forEach((c) => c.classList.remove('on')); e.currentTarget.classList.add('on');
    } }, l)));
  const daily = h('input', { type: 'number', class: 'input num', min: 1, max: 600, value: app.dailyGoal });
  daily.addEventListener('change', () => { app.dailyGoal = Math.max(1, +daily.value || 20); save(); });
  page.append(section('Apariencia',
    h('p', { class: 'muted small' }, 'En modo noche la biblioteca se ilumina con lámparas y chimenea.'),
    themeChips,
    h('label', { class: 'row gap center' }, h('span', {}, 'Objetivo diario de lectura'), daily, h('span', { class: 'muted' }, 'min'))));

  // Biblioteca
  const newShelfBox = h('div');
  async function drawNewShelf() {
    const room = await getRoom();
    const has = room.items.some((i) => i.type === 'shelf' && i.auto === 'nuevos');
    newShelfBox.innerHTML = '';
    newShelfBox.append(has
      ? h('p', { class: 'small' }, '✓ Ya tienes una estantería de libros nuevos en la sala.')
      : btn([icon('plus', 18), ' Poner la estantería «Libros nuevos» en la sala'], addNewShelf, 'ghost'));
  }
  async function addNewShelf() {
    const room = await getRoom();
    const item = { id: 'shelf-' + Date.now().toString(36), type: 'shelf', rot: 0, name: 'Libros nuevos', tag: '', auto: 'nuevos', color: catalogOf('shelf').color || '#8a5a3b' };
    for (const rot of [0, 1]) for (let y = 0; y < room.size; y++) for (let x = 0; x < room.size; x++) {
      if (canPlace(room, item, x, y, rot)) {
        Object.assign(item, { x, y, rot });
        room.items.push(item);
        await saveRoom(room);
        toast('Estantería «Libros nuevos» colocada en la sala');
        return drawNewShelf();
      }
    }
    toast('No queda sitio en la sala: agrándala o mueve algún mueble (Decorar → Sala)', 5000);
  }
  drawNewShelf();
  const pick = (options, value, onPick) => {
    const sel = h('select', { class: 'select' }, options.map(([v, l]) => h('option', { value: v, selected: v === value }, l)));
    sel.addEventListener('change', () => { onPick(sel.value); save(); });
    return sel;
  };
  page.append(section('Biblioteca',
    h('label', { class: 'label' }, 'Al abrir la app, ver'),
    pick([['room', 'La sala'], ['list', 'La lista']], app.libraryView || 'room', (v) => { app.libraryView = v; }),
    h('label', { class: 'label' }, 'En la lista, agrupar los libros'),
    pick(LIST_GROUPS, app.listGroup || 'tag', (v) => { app.listGroup = v; }),
    h('label', { class: 'label' }, 'Y ordenarlos por'),
    pick(LIST_SORTS, app.listSort || 'recent', (v) => { app.listSort = v; }),
    h('p', { class: 'muted small' }, 'La estantería «Libros nuevos» enseña todos los libros que vas añadiendo, lleven el # que lleven, hasta que les eliges su estantería. También puedes convertir cualquier estantería: ábrela → Opciones → Muestra: «Libros nuevos».'),
    newShelfBox));

  // Añadir libros
  page.append(section('Añadir libros',
    h('p', { class: 'muted small' }, 'Puedes añadir archivos EPUB o PDF (los PDF se convierten a EPUB automáticamente).'),
    h('ul', { class: 'help-list' },
      h('li', {}, h('strong', {}, 'Desde Telegram: '), 'abre el archivo en el chat → menú ⋮ → Compartir → «Rincón». (La app debe estar instalada en el móvil.)'),
      h('li', {}, h('strong', {}, 'Desde el móvil u ordenador: '), 'botón + de la biblioteca, o arrastra los archivos a la ventana.')),
    btn([icon('plus', 18), ' Elegir archivos'], pickFiles, 'ghost')));

  // Mis #
  const genreList = h('div', { class: 'genre-list' });
  async function drawGenres() {
    const books = await getBooks();
    const tags = allTags(books);
    const genres = await getGenres(); // aquí se guardan los colores de los #
    genreList.innerHTML = '';
    if (!tags.length) genreList.append(h('p', { class: 'muted small' }, 'Aún no has puesto ningún #. Abre un libro y escríbelos en su ficha.'));
    for (const tg of tags) {
      const col = await tagColor(tg.name);
      const color = h('input', { type: 'color', value: col, class: 'color-input' });
      const dot = h('label', { class: 'genre-dot', style: { background: col } }, color);
      color.addEventListener('input', () => { dot.style.background = color.value; });
      color.addEventListener('change', async () => {
        const g = genres.find((x) => tagKey(x.name) === tg.key);
        if (g) g.color = color.value; else genres.push({ id: 'g-' + Date.now().toString(36), name: tg.name, color: color.value });
        await saveGenres(genres); toast('Color guardado');
      });
      genreList.append(h('div', { class: 'genre-row' },
        dot,
        h('span', { class: 'grow' }, '#' + tg.name, h('span', { class: 'muted small' }, ` · ${tg.count}`)),
        h('button', { class: 'icon-btn', title: 'Renombrar', onclick: async () => {
          const name = cleanTag(await promptDialog('Nuevo nombre del #', tg.name) || '');
          if (!name || name === tg.name) return;
          await renameTag(books, tg, name, genres); drawGenres();
        } }, icon('edit', 18)),
        h('button', { class: 'icon-btn', title: 'Quitar', onclick: async () => {
          if (!(await confirmDialog(`¿Quitar #${tg.name} de ${tg.count} libro(s)?`, { ok: 'Quitar', danger: true }))) return;
          await renameTag(books, tg, '', genres); drawGenres();
        } }, icon('trash', 18))));
    }
  }
  // Cambia (o quita, si name está vacío) un # en todos los libros y estanterías
  async function renameTag(books, tg, name, genres) {
    for (const b of books) {
      if (!(b.tags || []).some((x) => tagKey(x) === tg.key)) continue;
      const out = [];
      for (const x of b.tags) {
        const n = tagKey(x) === tg.key ? name : x;
        if (n && !out.some((y) => tagKey(y) === tagKey(n))) out.push(n);
      }
      b.tags = out;
      await putBook(b);
    }
    const room = await getRoom();
    for (const it of room.items) {
      if (it.type !== 'shelf') continue;
      if (tagKey(it.tag) === tg.key) it.tag = name;
      if (it.auto?.startsWith('t:') && tagKey(it.auto.slice(2)) === tg.key) it.auto = name ? 't:' + name : '';
    }
    await saveRoom(room);
    const g = genres.find((x) => tagKey(x.name) === tg.key);
    if (g && name) { g.name = name; await saveGenres(genres); }
    toast(name ? `Ahora es #${name}` : `#${tg.name} quitado`);
    window.dispatchEvent(new CustomEvent('library-changed'));
  }
  drawGenres();
  page.append(section('Mis #', h('p', { class: 'muted small' }, 'Los # se escriben en la ficha de cada libro (un libro puede tener muchos). Aquí puedes cambiarles el color, renombrarlos o quitarlos de todos los libros a la vez. Para buscar por #, escribe # en el buscador.'), genreList));

  // Copia de seguridad en Google Drive
  const driveBox = h('div', { class: 'stack' });
  async function drawDrive() {
    driveBox.innerHTML = '';
    const last = await kvGet('lastBackup', null);
    const connected = await kvGet('driveConnected', false);
    const idIn = h('input', { class: 'input', value: app.driveClientId, placeholder: 'xxxxxxxx.apps.googleusercontent.com' });
    idIn.addEventListener('change', () => { app.driveClientId = idIn.value.trim(); save(); drawDrive(); });
    const auto = h('input', { type: 'checkbox', checked: app.autoBackup });
    auto.addEventListener('change', () => { app.autoBackup = auto.checked; save(); });

    driveBox.append(
      h('p', { class: 'muted small' }, 'Se guarda todo (libros, progreso, notas, estadísticas y decoración) en una carpeta de tu Google Drive. Si cambias de móvil, instala la app y pulsa «Restaurar».'),
      h('p', { class: 'small' }, last ? `Última copia: ${new Date(last).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Todavía no se ha hecho ninguna copia.'),
      app.driveClientId ? null : h('div', { class: 'note' }, 'Para conectar Drive hace falta un «ID de cliente» de Google (gratis, una sola vez). Mira los pasos en el archivo LEEME.md del proyecto.'),
      h('label', { class: 'label' }, 'ID de cliente de Google'), idIn,
      h('label', { class: 'switch-row' }, h('span', {}, 'Copia automática'), auto, h('span', { class: 'switch' })),
      h('p', { class: 'muted small' }, 'Con la copia automática, la app guarda los cambios en Drive al salir de un libro o cerrar la app (Google pide confirmar la cuenta como mucho una vez cada hora).'),
      h('div', { class: 'row gap wrap' },
        btn([icon('cloud', 18), ' Hacer copia ahora'], () => runBackup(), 'primary'),
        btn([icon('download', 18), ' Restaurar desde Drive'], () => runRestore(), 'ghost'),
        connected ? btn('Desconectar', async () => { await disconnectDrive(); toast('Drive desconectado'); drawDrive(); }, 'ghost') : null));
  }
  async function runBackup() {
    const status = h('p', { class: 'muted' }, 'Conectando con Google…');
    const bar = h('div', { class: 'progress' }, h('div', { class: 'progress-fill' }));
    const s = sheet(h('div', { class: 'dialog' }, status, bar), { title: 'Copia en Drive' });
    try {
      await backupToDrive({ onProgress: (p, m) => { bar.firstChild.style.width = `${p * 100}%`; status.textContent = m; } });
      s.close(); toast('Copia guardada en Google Drive ☁️'); drawDrive();
    } catch (e) { status.textContent = e.message; }
  }
  async function runRestore() {
    try {
      const info = await driveBackupInfo();
      if (!info) return toast('No hay ninguna copia en tu Drive');
      const when = new Date(info.modified).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
      if (!(await confirmDialog(`Se encontró una copia del ${when} con ${info.books} libros. Restaurarla reemplazará lo que hay ahora en este dispositivo.`, { ok: 'Restaurar' }))) return;
      const status = h('p', { class: 'muted' }, 'Descargando…');
      const bar = h('div', { class: 'progress' }, h('div', { class: 'progress-fill' }));
      const s = sheet(h('div', { class: 'dialog' }, status, bar), { title: 'Restaurando' });
      await restoreFromDrive((p, m) => { bar.firstChild.style.width = `${p * 100}%`; status.textContent = m; });
      s.close(); toast('¡Biblioteca recuperada!');
      setTimeout(() => location.reload(), 800);
    } catch (e) { toast(e.message, 5000); }
  }
  drawDrive();
  page.append(section('Copia en Google Drive', driveBox));

  // Copia local
  const fileIn = h('input', { type: 'file', accept: '.zip', style: { display: 'none' } });
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files[0]; if (!f) return;
    if (!(await confirmDialog('Importar esta copia reemplazará la biblioteca actual de este dispositivo.', { ok: 'Importar' }))) return;
    try { await importZip(f); toast('Copia importada'); setTimeout(() => location.reload(), 800); } catch (e) { toast(e.message, 5000); }
  });
  page.append(section('Copia en un archivo',
    h('p', { class: 'muted small' }, 'También puedes guardar toda tu biblioteca en un archivo .zip y recuperarla después.'),
    h('div', { class: 'row gap wrap' },
      btn([icon('download', 18), ' Exportar copia'], async () => { toast('Preparando el archivo…'); await exportZip(); }, 'ghost'),
      btn([icon('upload', 18), ' Importar copia'], () => fileIn.click(), 'ghost')), fileIn));

  // Instalación
  page.append(section('Instalar y actualizar',
    h('p', { class: 'muted small' }, 'Instálala desde el navegador (menú ⋮ → «Instalar aplicación» o «Añadir a pantalla de inicio»). Se actualiza sola: cuando haya una versión nueva se aplicará al salir de la app, sin interrumpir tu lectura.'),
    h('p', { class: 'small' }, `Versión ${APP_VERSION}`),
    window.__installPrompt ? btn('Instalar ahora', async () => { window.__installPrompt.prompt(); }, 'primary') : null,
    btn('Buscar actualizaciones', async () => {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (!reg) return toast('Las actualizaciones funcionan en la app publicada');
      await reg.update();
      await new Promise((r) => setTimeout(r, 1500));
      if (!reg.waiting) return toast('Ya tienes la última versión');
      toast('Actualización encontrada, aplicando…');
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }, 'ghost')));

  function section(title, ...children) {
    return h('section', { class: 'card' }, h('h2', {}, title), ...children);
  }
}
