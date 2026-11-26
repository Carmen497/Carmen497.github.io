// Navegación sin apilar pantallas repetidas en el historial.
// Antes cada vez que entrabas y salías de un libro se añadía otra «Biblioteca» al historial y, al pulsar
// Atrás en Android, iban saliendo una y otra vez: parecía que la app estaba abierta varias veces.
// Ahora el historial como mucho tiene: Biblioteca → (otra pestaña) → libro.
const isHome = (x) => !x || x === '#' || x === '#/';
const fire = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

export function openReader(id) {
  const href = '#/leer/' + encodeURIComponent(id);
  if (location.hash === href) return;
  if (location.hash.startsWith('#/leer/')) history.replaceState({ rincon: 'reader' }, '', href);
  else history.pushState({ rincon: 'reader' }, '', href);
  fire();
}

export function leaveReader() {
  if (history.state?.rincon === 'reader') history.back();
  else location.replace('#/');
}

export function goTab(href) {
  const cur = location.hash || '#/';
  if (href === cur || (isHome(href) && isHome(cur))) return;
  if (isHome(href)) {
    if (history.state?.rincon === 'tab') history.back();
    else location.replace(href);
  } else if (isHome(cur)) {
    history.pushState({ rincon: 'tab' }, '', href); fire();
  } else {
    history.replaceState(history.state, '', href); fire();
  }
}
