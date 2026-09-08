import { Renderer, Program, Mesh, Triangle, Geometry, RenderTarget, Transform } from 'ogl';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import fullscreenVert from './shaders/fullscreen.vert';
import artworkVert from './shaders/artwork.vert';
import fieldFrag from './shaders/field.frag';
import markFrag from './shaders/mark.frag';
import dustVert from './shaders/dust.vert';
import dustFrag from './shaders/dust.frag';
import latticeFrag from './shaders/lattice.frag';
import brightFrag from './shaders/bright.frag';
import blurFrag from './shaders/blur.frag';
import compositeFrag from './shaders/composite.frag';
import { buildLines, buildNodes, buildLattice, buildMarkSegments, ART_CENTRE } from './lib/artwork.js';

/**
 * The whole piece. Called only once a WebGL context is known to be available,
 * so importing this module has no side effects of its own.
 */
export function boot() {
  gsap.registerPlugin(ScrollTrigger);

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SCROLL_VH = 620;
  const BLOOM_DIV = 4;
  const MARK_DIST = 300;   // artwork units mapped to 1.0 outside the mark
  const DUST_COUNT = 700;
  const MARK_CORE = 120;   // and inside it

  const canvas = document.querySelector('#gl');
  const renderer = new Renderer({
    canvas, alpha: false, antialias: false,
    dpr: Math.min(window.devicePixelRatio, 2),
    powerPreference: 'high-performance',
  });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 1);

  // ---------------------------------------------------------------------------
  // artwork
  // ---------------------------------------------------------------------------
  const lines = buildLines();
  const nodes = buildNodes();
  const lattice = buildLattice();
  const mark = buildMarkSegments();

  // NB: array uniforms must be plain Arrays. OGL resolves indexed uniform names
  // (`uLines[0]`) via `Array.isArray(uniform.value)`, false for typed arrays —
  // the uniform is then silently dropped with a console warning.
  const uLines = new Array(48).fill(0);
  const uLineMeta = new Array(48).fill(0);
  const uNodes = new Array(16).fill(0);
  const uLatticeProg = new Array(lattice.elements).fill(0);

  const put = (a, i, v) => v.forEach((x, k) => { a[i * 4 + k] = x; });
  lines.forEach((l, i) => {
    put(uLines, i, [l.anchor[0], l.anchor[1], l.dir[0], l.dir[1]]);
    put(uLineMeta, i, [0, 1400, 0, l.group]);
  });
  nodes.forEach((n, i) => put(uNodes, i, [n.centre[0], n.centre[1], n.radius, 0]));

  // shared artwork-space transform uniforms
  const view = {
    uResolution: { value: new Float32Array([1, 1]) },
    uScale: { value: 1 },
    uCenter: { value: new Float32Array(ART_CENTRE) },
    uParallax: { value: new Float32Array([0, 0]) },
    uRot: { value: 0 },
  };
  // The camera: a slow pull-back that rectifies the whole construction onto the
  // axis exactly as the mark settles. Nothing in the frame is ever quite still.
  const cam = { zoom: 1.24, rot: -0.078 };
  let baseScale = 1;

  // ---------------------------------------------------------------------------
  // render targets
  // ---------------------------------------------------------------------------
  const rtOpts = { depth: false, generateMipmaps: false };
  let maskRT, sceneRT, brightRT, blurRT;

  // ---------------------------------------------------------------------------
  // passes
  // ---------------------------------------------------------------------------
  // The mark is drawn as an exact signed distance field over a fullscreen
  // triangle, not as triangulated geometry: the edges stay analytically
  // antialiased at any scale, and the field itself drives the coalescence.
  const markMesh = new Mesh(gl, {
    geometry: new Triangle(gl),
    program: new Program(gl, {
      vertex: fullscreenVert,
      fragment: markFrag.replace(/MARK_SEGMENTS/g, String(mark.count)),
      depthTest: false, depthWrite: false,
      uniforms: {
        ...view,
        uSeg: { value: mark.data },
        uDistScale: { value: MARK_DIST },
        uCoreScale: { value: MARK_CORE },
      },
    }),
  });

  // beat 1 — the void is not empty. 700 motes, wrapped and drifting, with depth
  // read out of the seed so they parallax against the cursor at different rates.
  const dustSeed = new Float32Array(DUST_COUNT * 3);
  for (let i = 0; i < DUST_COUNT; i++) {
    dustSeed[i * 3] = Math.random();
    dustSeed[i * 3 + 1] = Math.random();
    dustSeed[i * 3 + 2] = Math.random() ** 1.7;   // biased to the far field
  }
  const dustMesh = new Mesh(gl, {
    mode: gl.POINTS,
    geometry: new Geometry(gl, { position: { size: 3, data: dustSeed } }),
    program: new Program(gl, {
      vertex: dustVert, fragment: dustFrag,
      transparent: true, depthTest: false, depthWrite: false,
      uniforms: {
        uResolution: view.uResolution, uParallax: view.uParallax,
        uTime: { value: 0 }, uDpr: { value: renderer.dpr }, uFade: { value: 1 },
      },
    }),
  });
  dustMesh.program.setBlendFunc(gl.ONE, gl.ONE);

  const latticeMesh = new Mesh(gl, {
    mode: gl.LINES,
    geometry: new Geometry(gl, {
      position: { size: 2, data: lattice.position },
      meta: { size: 2, data: lattice.meta },
    }),
    program: new Program(gl, {
      vertex: artworkVert, fragment: latticeFrag,
      transparent: true, cullFace: null, depthTest: false, depthWrite: false,
      uniforms: { ...view, uProgress: { value: uLatticeProg }, uFade: { value: 1 }, uGround: { value: 0 } },
    }),
  });

  const fieldProgram = new Program(gl, {
    vertex: fullscreenVert, fragment: fieldFrag,
    uniforms: {
      ...view,
      uTime: { value: 0 }, uDpr: { value: renderer.dpr },
      uLines: { value: uLines }, uLineMeta: { value: uLineMeta }, uNodes: { value: uNodes },
      uGround: { value: 0 }, uInkFade: { value: 1 }, uVel: { value: 0 },
      tMask: { value: null }, uMarkReveal: { value: 0 }, uMarkSolid: { value: 0 },
      uSeed: { value: 1 },
    },
  });
  const fieldMesh = new Mesh(gl, { geometry: new Triangle(gl), program: fieldProgram });

  const quad = new Triangle(gl);
  const brightProgram = new Program(gl, {
    vertex: fullscreenVert, fragment: brightFrag,
    uniforms: { tScene: { value: null }, uThreshold: { value: 0.16 }, uBase: { value: 0 } },
  });
  const blurProgram = new Program(gl, {
    vertex: fullscreenVert, fragment: blurFrag,
    uniforms: { tSrc: { value: null }, uDir: { value: new Float32Array([0, 0]) } },
  });
  const compositeProgram = new Program(gl, {
    vertex: fullscreenVert, fragment: compositeFrag,
    uniforms: {
      tScene: { value: null }, tBloom: { value: null },
      uResolution: view.uResolution, uTime: { value: 0 },
      uVel: { value: 0 }, uBloom: { value: 0.62 }, uGround: { value: 0 },
    },
  });
  const brightMesh = new Mesh(gl, { geometry: quad, program: brightProgram });
  const blurMesh = new Mesh(gl, { geometry: quad, program: blurProgram });
  const compositeMesh = new Mesh(gl, { geometry: quad, program: compositeProgram });

  const emptyScene = new Transform();

  // ---------------------------------------------------------------------------
  // layout
  // ---------------------------------------------------------------------------
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    const bw = gl.drawingBufferWidth, bh = gl.drawingBufferHeight;
    view.uResolution.value[0] = bw;
    view.uResolution.value[1] = bh;

    // Composition reflows: the mark keeps a stable share of the smaller axis and
    // the infinite construction lines fill whatever is left.
    const markShare = w < 700 ? 0.46 : 0.34;
    baseScale = ((Math.min(w, h) * markShare) / 360) * renderer.dpr;

    [maskRT, sceneRT, brightRT, blurRT].forEach((rt) => {
      if (!rt) return;
      if (rt.texture) gl.deleteTexture(rt.texture.texture);
      if (rt.buffer) gl.deleteFramebuffer(rt.buffer);
    });
    maskRT = new RenderTarget(gl, { width: bw, height: bh, ...rtOpts });
    sceneRT = new RenderTarget(gl, { width: bw, height: bh, ...rtOpts });
    const bwq = Math.max(1, Math.floor(bw / BLOOM_DIV)), bhq = Math.max(1, Math.floor(bh / BLOOM_DIV));
    brightRT = new RenderTarget(gl, { width: bwq, height: bhq, ...rtOpts });
    blurRT = new RenderTarget(gl, { width: bwq, height: bhq, ...rtOpts });

    document.querySelector('#scroll_track').style.height = REDUCED ? '100vh' : `${SCROLL_VH}vh`;
    ScrollTrigger.refresh();
  }
  window.addEventListener('resize', resize);

  // ---------------------------------------------------------------------------
  // the six beats
  // ---------------------------------------------------------------------------
  const state = { ground: 0, ink: 1, markReveal: 0, markSolid: 0, latticeFade: 1, dust: 1, seed: 1 };

  function buildTimeline() {
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });

    // beat 1 — the seed hands off to the lines that grow out of it
    tl.to(state, { seed: 0, duration: 0.34, ease: 'power2.in' }, 0.10);

    // beat 2 — construction: star1 sweeps in, then star2 as a distinct event
    [0, 1].forEach((g) => {
      lines.filter(l => l.group === g).forEach((l, li) => {
        tl.to(uLineMeta, { [l.index * 4 + 2]: 1, duration: 0.46, ease: 'power2.inOut' },
          0.08 + g * 0.20 + li * 0.038);
      });
    });

    // beat 3 — ignition: nodes fire where the lines cross
    nodes.forEach((n, i) => {
      tl.to(uNodes, { [i * 4 + 3]: 1, duration: 0.36, ease: 'elastic.out(1.0, 0.55)' },
        0.86 + i * 0.05);
    });

    // beat 4 — lattice propagates outward from the nodes
    for (let i = 0; i < lattice.elements; i++) {
      tl.to(uLatticeProg, { [i]: 1, duration: 0.40, ease: 'power2.out' },
        1.10 + (i / lattice.elements) * 0.34);
    }

    // beat 5 — coalescence: the payoff. The drawing recedes, light concentrates
    // into the mark, the ground lifts out of the void, the mark settles to ink.
    tl.to(state, { markReveal: 1, duration: 0.50, ease: 'power2.inOut' }, 1.70);
    tl.to(state, { latticeFade: 0.20, duration: 0.34, ease: 'power2.inOut' }, 1.86);
    tl.to(state, { dust: 0, duration: 0.40, ease: 'power2.in' }, 1.84);
    tl.to(state, { markSolid: 1, duration: 0.40, ease: 'power2.inOut' }, 2.02);
    // the ground lifts last, so the void holds its contrast while the N forms
    tl.to(state, { ground: 1, duration: 0.52, ease: 'power2.inOut' }, 2.12);

    // beat 6 — rest: the scaffolding dissolves, the mark is left alone
    tl.to(state, { latticeFade: 0, duration: 0.30, ease: 'power2.in' }, 2.26);
    tl.to(state, { ink: 0, duration: 0.36, ease: 'power2.in' }, 2.30);

    // the camera runs under all of it and lands square on the lockup
    tl.to(cam, { zoom: 1, rot: 0, duration: 2.42, ease: 'power1.inOut' }, 0);
    tl.to({}, { duration: 0.10 });
    return tl;
  }
  const timeline = buildTimeline();

  // ---------------------------------------------------------------------------
  // scroll
  // ---------------------------------------------------------------------------
  let velocity = 0;
  if (!REDUCED) {
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
    lenis.on('scroll', (e) => { velocity = e.velocity; });
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.create({
      trigger: '#scroll_track', start: 'top top', end: 'bottom bottom', scrub: 0.35,
      onUpdate: (self) => timeline.progress(self.progress),
    });
  } else {
    timeline.progress(1);
  }

  // The cue arrives a beat after the void does, and leaves the moment it is
  // answered. It never comes back.
  const cue = document.querySelector('#cue');
  if (!REDUCED) {
    let cueShown = false, cueGone = false;
    setTimeout(() => { if (!cueGone) { cue.classList.add('on'); cueShown = true; } }, 1400);
    const retire = () => {
      if (cueGone || timeline.progress() < 0.006) return;
      cueGone = true;
      cue.classList.remove('on');
      if (!cueShown) cue.style.display = 'none';
      gsap.ticker.remove(retire);
    };
    gsap.ticker.add(retire);
  }

  // ---------------------------------------------------------------------------
  // cursor parallax
  // ---------------------------------------------------------------------------
  const pointer = { tx: 0, ty: 0, x: 0, y: 0, idle: 0 };
  if (!REDUCED) {
    window.addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      pointer.idle = 0;
    }, { passive: true });
  }

  // ---------------------------------------------------------------------------
  // loop
  // ---------------------------------------------------------------------------
  const hud = document.querySelector('#hud');
  const showHud = new URLSearchParams(location.search).has('hud');
  if (showHud) hud.classList.add('on');
  let frames = 0, acc = 0, worst = 0, last = performance.now();

  function frame(now) {
    const dt = Math.min(now - last, 100); last = now;

    pointer.idle += dt;
    const drift = Math.min(pointer.idle / 3000, 1);
    pointer.x += ((pointer.tx + Math.sin(now * 0.00019) * 0.30 * drift) - pointer.x) * 0.042;
    pointer.y += ((pointer.ty + Math.cos(now * 0.00023) * 0.30 * drift) - pointer.y) * 0.042;
    view.uParallax.value[0] = pointer.x * 13;
    view.uParallax.value[1] = -pointer.y * 13;
    // at rest the lockup breathes — far below the threshold of noticing, but
    // the frame is never quite frozen
    const rest = Math.max(0, (timeline.progress() - 0.962) / 0.038);
    view.uScale.value = baseScale * cam.zoom * (1 + rest * Math.sin(now * 0.00042) * 0.0024);
    view.uRot.value = cam.rot;

    const vel = Math.min(Math.abs(velocity) / 34, 1);
    fieldProgram.uniforms.uTime.value = now * 0.001;
    fieldProgram.uniforms.uGround.value = state.ground;
    fieldProgram.uniforms.uInkFade.value = state.ink;
    fieldProgram.uniforms.uVel.value = vel;
    fieldProgram.uniforms.uMarkReveal.value = state.markReveal;
    fieldProgram.uniforms.uMarkSolid.value = state.markSolid;
    fieldProgram.uniforms.uSeed.value = state.seed;
    fieldProgram.uniforms.tMask.value = maskRT.texture;
    dustMesh.program.uniforms.uTime.value = now * 0.001;
    dustMesh.program.uniforms.uFade.value = state.dust * (1 - state.ground);
    latticeMesh.program.uniforms.uFade.value = state.latticeFade * state.ink;
    latticeMesh.program.uniforms.uGround.value = state.ground;
    // ground luminance, so the bright pass measures only what exceeds the page
    brightProgram.uniforms.uBase.value = 0.041 + state.ground * 0.861;

    // 1. mark coverage
    renderer.render({ scene: markMesh, target: maskRT, clear: true });
    // 2. field, then lattice over it
    renderer.render({ scene: fieldMesh, target: sceneRT, clear: true });
    renderer.render({ scene: dustMesh, target: sceneRT, clear: false });
    renderer.render({ scene: latticeMesh, target: sceneRT, clear: false });
    // 3. bloom: bright pass at quarter res, separable blur
    brightProgram.uniforms.tScene.value = sceneRT.texture;
    renderer.render({ scene: brightMesh, target: brightRT, clear: true });
    blurProgram.uniforms.tSrc.value = brightRT.texture;
    blurProgram.uniforms.uDir.value[0] = 1 / brightRT.width;
    blurProgram.uniforms.uDir.value[1] = 0;
    renderer.render({ scene: blurMesh, target: blurRT, clear: true });
    blurProgram.uniforms.tSrc.value = blurRT.texture;
    blurProgram.uniforms.uDir.value[0] = 0;
    blurProgram.uniforms.uDir.value[1] = 1 / brightRT.height;
    renderer.render({ scene: blurMesh, target: brightRT, clear: true });
    // 4. composite to screen
    compositeProgram.uniforms.tScene.value = sceneRT.texture;
    compositeProgram.uniforms.tBloom.value = brightRT.texture;
    compositeProgram.uniforms.uTime.value = now * 0.001;
    compositeProgram.uniforms.uVel.value = vel;
    compositeProgram.uniforms.uGround.value = state.ground;
    renderer.render({ scene: compositeMesh });

    if (showHud) {
      frames++; acc += dt; worst = Math.max(worst, dt);
      if (acc > 500) {
        hud.textContent = `fps   ${(1000 / (acc / frames)).toFixed(1)}\nworst ${worst.toFixed(1)}ms\n` +
          `prog  ${timeline.progress().toFixed(3)}\ndpr   ${renderer.dpr}  ${gl.drawingBufferWidth}x${gl.drawingBufferHeight}`;
        frames = 0; acc = 0; worst = 0;
      }
    }
    requestAnimationFrame(frame);
  }

  resize();
  requestAnimationFrame(frame);

  // verification handle — the sequence cannot be checked from the DOM
  window.__n = { timeline, state, cam, renderer, view, fieldProgram,
                 uLineMeta, uNodes, uLatticeProg,
                 counts: { lattice: lattice.count, mark: mark.count } };

}
