import './styles.css';
import { h, icon, closeTopSheet, toast } from './ui.js';
import { getAppSettings, migrateGenresToTags } from './store.js';
import { processInbox, setupLaunchQueue, setupDropZone } from './importer.js';
import { backupToDrive, driveTokenValid, needsBackup } from './backup.js';

export const APP_VERSION = __APP_VERSION__;

const main = h('main', { id: 'view' });
const navBar = h('nav', { class: 'bottom-nav' });
document.getElementById('app').append(main, navBar);

const TABS = [
  ['#/', 'home', 'Biblioteca'],
  ['#/buscar', 'search', 'Buscar'],
  ['#/estadisticas', 'stats', 'Estadísticas'],
  ['#/ajustes', 'settings', 'Ajustes'],
];
for (const [href, ic, label] of TABS) navBar.append(h('a', { href, class: 'nav-item' }, icon(ic, 22), h('span', {}, label)));

// ---- Tema de la app ----
export function applyAppTheme(pref) {
  const dark = pref === 'dark' || (pref === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1f1814' : '#f6efe3');
}

// ---- Rutas ----
let cleanup = null;
let routing = Promise.resolve();
function route() { routing = routing.then(doRoute, doRoute); }
async function doRoute() {
  const hash = location.hash || '#/';
  const read = hash.match(/^#\/leer\/(.+)$/);
  // Cargar primero el código de la pantalla, así la anterior sigue visible mientras tanto
  const mod = read ? await import('./views/reader.js')
    : hash.startsWith('#/buscar') ? await import('./views/search.js')
    : hash.startsWith('#/estadisticas') ? await import('./views/stats.js')
    : hash.startsWith('#/ajustes') ? await import('./views/settings.js')
    : await import('./views/library.js');
  if (cleanup) { const c = cleanup; cleanup = null; await c(); }
  main.innerHTML = '';
  main.className = '';
  window.scrollTo(0, 0);
  const app = await getAppSettings();
  applyAppTheme(app.theme);
  navBar.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === hash || (a.getAttribute('href') === '#/' && hash === '#')));

  if (read) {
    navBar.classList.add('hidden');
    cleanup = await mod.renderReader(main, decodeURIComponent(read[1]));
    return;
  }
  navBar.classList.remove('hidden');
  if (mod.renderSearch) await mod.renderSearch(main);
  else if (mod.renderStats) await mod.renderStats(main);
  else if (mod.renderSettings) await mod.renderSettings(main);
  else {
    main.className = 'library-main';
    cleanup = await mod.renderLibrary(main, (to) => { location.hash = to; });
    maybeAutoBackup();
    applyPendingUpdate();
  }
}
window.addEventListener('hashchange', route);

// Botón atrás de Android: cerrar hojas antes de navegar
window.addEventListener('popstate', () => { closeTopSheet(); });

// ---- Copia automática en Drive ----
let backingUp = false;
async function maybeAutoBackup() {
  const app = await getAppSettings();
  if (!app.autoBackup || !app.driveClientId || backingUp || !navigator.onLine || !needsBackup()) return;
  if (!driveTokenValid()) { showBackupNudge(); return; }
  backingUp = true;
  try { await backupToDrive({ interactive: false }); } catch (e) { console.warn('copia automática', e); }
  backingUp = false;
}
function showBackupNudge() {
  const last = +localStorage.getItem('rincon-backed') || 0;
  if (Date.now() - last < 20 * 3600 * 1000 || document.getElementById('backup-nudge')) return;
  const el = h('button', { id: 'backup-nudge', class: 'nudge', onclick: async () => {
    el.remove();
    try { backingUp = true; await backupToDrive({ interactive: true }); toast('Copia guardada en Google Drive ☁️'); }
    catch (e) { toast(e.message, 5000); }
    finally { backingUp = false; }
  } }, icon('cloud', 18), 'Toca para guardar tu copia en Drive');
  document.body.append(el);
  setTimeout(() => el.remove(), 15000);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') maybeAutoBackup(); });

// ---- Instalación y actualizaciones ----
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__installPrompt = e; });

let updateSW = null, updateReady = false;
// La versión nueva se aplica cuando sales de la app (en segundo plano), nunca al abrirla:
// antes se recargaba nada más abrir y parecía que la app se abría dos veces.
function applyPendingUpdate() {
  if (updateReady && updateSW && document.visibilityState === 'hidden' && !location.hash.startsWith('#/leer/')) {
    updateReady = false;
    updateSW(true);
  }
}
document.addEventListener('visibilitychange', applyPendingUpdate);
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() { updateReady = true; applyPendingUpdate(); },
      onRegisteredSW(url, reg) {
        if (!reg) return;
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
      },
    });
  });
}

// ---- Arranque ----
(async () => {
  const app = await getAppSettings();
  applyAppTheme(app.theme);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => applyAppTheme((await getAppSettings()).theme));
  try { await migrateGenresToTags(); } catch (e) { console.warn('géneros a #', e); }
  setupLaunchQueue();
  setupDropZone();
  const params = new URLSearchParams(location.search);
  // El APK abre la web con ?apk=1: allí Android ya oculta las barras, sin el aviso del navegador
  if (params.has('apk')) { try { localStorage.setItem('enApk', '1'); } catch {} }
  if (params.has('compartido') || params.has('apk')) history.replaceState(null, '', location.pathname + location.hash);
  await route();
  await processInbox();
  navigator.storage?.persist?.();
})();
