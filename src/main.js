import { boot } from './scene.js';

// A WebGL context is the one hard requirement. The scene has no side effects on
// import, so a client that cannot render simply never boots it and gets the
// mark, still, instead.
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

if (hasWebGL()) {
  boot();
} else {
  // The mark's recovered outline, inlined so this path stays a couple of
  // hundred bytes. Kept in sync with buildMarkRings() in lib/artwork.js.
  const RINGS = [
    [[719.8, 252], [719.3, 504], [659.1, 504], [721.5, 612], [774, 612], [774, 252]],
    [[574.5, 252], [522, 252], [522, 612], [576, 612], [576, 360], [636.9, 360]],
  ];
  const poly = RINGS.map(r => `<polygon points="${r.map(p => p.join(',')).join(' ')}"/>`).join('');
  document.querySelector('#still').innerHTML =
    `<svg viewBox="518 248 260 368" role="img" aria-label="Ncarnate">${poly}</svg>`;
  document.body.classList.add('still');
}
