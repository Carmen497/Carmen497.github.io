// Ajustes: apariencia, géneros, copias de seguridad y ayuda.
import { h, icon, btn, sheet, toast, confirmDialog, promptDialog } from '../ui.js';
import { getAppSettings, saveAppSettings, getGenres, saveGenres } from '../store.js';
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

  // Añadir libros
  page.append(section('Añadir libros',
    h('p', { class: 'muted small' }, 'Puedes añadir archivos EPUB o PDF (los PDF se convierten a EPUB automáticamente).'),
    h('ul', { class: 'help-list' },
      h('li', {}, h('strong', {}, 'Desde Telegram: '), 'abre el archivo en el chat → menú ⋮ → Compartir → «Rincón». (La app debe estar instalada en el móvil.)'),
      h('li', {}, h('strong', {}, 'Desde el móvil u ordenador: '), 'botón + de la biblioteca, o arrastra los archivos a la ventana.')),
    btn([icon('plus', 18), ' Elegir archivos'], pickFiles, 'ghost')));

  // Géneros
  const genreList = h('div', { class: 'genre-list' });
  async function drawGenres() {
    const genres = await getGenres();
    const books = await getBooks();
    genreList.innerHTML = '';
    for (const g of genres) {
      const color = h('input', { type: 'color', value: g.color, class: 'color-input' });
      color.addEventListener('change', () => { g.color = color.value; saveGenres(genres); });
      const n = books.filter((b) => b.genre === g.id).length;
      genreList.append(h('div', { class: 'genre-row' },
        h('label', { class: 'genre-dot', style: { background: g.color } }, color),
        h('span', { class: 'grow' }, g.name, h('span', { class: 'muted small' }, ` · ${n}`)),
        h('button', { class: 'icon-btn', title: 'Renombrar', onclick: async () => { const name = await promptDialog('Nombre del género', g.name); if (name) { g.name = name; await saveGenres(genres); drawGenres(); } } }, icon('edit', 18)),
        h('button', { class: 'icon-btn', title: 'Eliminar', onclick: async () => {
          if (!(await confirmDialog(`¿Eliminar el género «${g.name}»?${n ? ` ${n} libro(s) quedarán sin género.` : ''}`, { ok: 'Eliminar', danger: true }))) return;
          for (const b of books.filter((b) => b.genre === g.id)) { b.genre = ''; await putBook(b); }
          await saveGenres(genres.filter((x) => x.id !== g.id)); drawGenres();
        } }, icon('trash', 18))));
    }
    genreList.append(btn([icon('plus', 18), ' Nuevo género'], async () => {
      const name = await promptDialog('Nombre del nuevo género');
      if (!name) return;
      genres.push({ id: 'g-' + Date.now().toString(36), name, color: '#' + Math.floor(Math.random() * 0x777777 + 0x444444).toString(16) });
      await saveGenres(genres); drawGenres();
    }, 'ghost'));
  }
  drawGenres();
  page.append(section('Mis géneros', h('p', { class: 'muted small' }, 'Tú decides los géneros. Cada estantería puede recibir automáticamente los libros nuevos de un género.'), genreList));

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
    h('p', { class: 'muted small' }, 'Instálala desde el navegador (menú ⋮ → «Instalar aplicación» o «Añadir a pantalla de inicio»). Se actualiza sola: cuando haya una versión nueva se aplicará al volver a la biblioteca, sin interrumpir tu lectura.'),
    h('p', { class: 'small' }, `Versión ${APP_VERSION}`),
    window.__installPrompt ? btn('Instalar ahora', async () => { window.__installPrompt.prompt(); }, 'primary') : null,
    btn('Buscar actualizaciones', async () => {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (!reg) return toast('Las actualizaciones funcionan en la app publicada');
      await reg.update(); toast(reg.waiting ? 'Actualización encontrada, aplicando…' : 'Ya tienes la última versión');
    }, 'ghost')));

  function section(title, ...children) {
    return h('section', { class: 'card' }, h('h2', {}, title), ...children);
  }
}
