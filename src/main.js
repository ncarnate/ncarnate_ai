import { boot } from './scene.js';

const canvas = document.querySelector('#gl');
let scene = null, savedProgress = 0;

// The recovered outline is also the quiet landing state for a lost context.
// Kept in sync with buildMarkRings() in lib/artwork.js.
function showStill() {
  const rings = [
    [[719.8, 252], [719.3, 504], [659.1, 504], [721.5, 612], [774, 612], [774, 252]],
    [[574.5, 252], [522, 252], [522, 612], [576, 612], [576, 360], [636.9, 360]],
  ];
  const poly = rings.map(r =>
    `<polygon points="${r.map(p => p.join(',')).join(' ')}"/>`).join('');
  document.querySelector('#still').innerHTML =
    `<svg viewBox="518 248 260 368" role="img" aria-label="Ncarnate">${poly}</svg>`;
  document.body.classList.add('still');
}

function start() {
  try {
    // Probe the actual canvas, not a disposable second GPU context on a phone.
    const options = { alpha: false, antialias: false, depth: false,
      powerPreference: 'high-performance' };
    const gl = canvas.getContext('webgl2', options) || canvas.getContext('webgl', options);
    if (!gl) return showStill();
    document.body.classList.remove('still', 'ready');
    scene = boot({ progress: savedProgress });
  } catch {
    showStill();
  }
}

canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  savedProgress = scene?.progress ?? 0;
  scene?.destroy();
  scene = null;
  showStill();
});
canvas.addEventListener('webglcontextrestored', start);
start();
