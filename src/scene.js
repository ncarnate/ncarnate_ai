import { Renderer, Program, Mesh, Triangle, Geometry, RenderTarget } from 'ogl';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import fullscreenVert from './shaders/fullscreen.vert';
import latticeVert from './shaders/lattice.vert';
import fieldFrag from './shaders/field.frag';
import markFrag from './shaders/mark.frag';
import dustVert from './shaders/dust.vert';
import dustFrag from './shaders/dust.frag';
import latticeFrag from './shaders/lattice.frag';
import prefilterFrag from './shaders/prefilter.frag';
import downFrag from './shaders/down.frag';
import upFrag from './shaders/up.frag';
import compositeFrag from './shaders/composite.frag';
import {
  buildLines, buildNodes, buildLattice, buildMarkSegments, ART_CENTRE,
} from './lib/artwork.js';

/**
 * The whole piece. Called only once a WebGL context is known to be available,
 * so importing this module has no side effects of its own.
 */
export function boot({ progress = 0 } = {}) {
  gsap.registerPlugin(ScrollTrigger);

  // This page owns layout refreshes; library listeners must not independently
  // refresh the timeline when Safari hides a toolbar or a tab becomes visible.
  ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: 'none' });
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const touchQuery = window.matchMedia('(pointer: coarse)');
  let reduced = motionQuery.matches;
  const SCROLL_VH = 620;
  const BLOOM_LEVELS = 5;  // 1/2 .. 1/32 of the frame
  const MARK_DIST = 300;   // artwork units mapped to 1.0 outside the mark
  const DUST_COUNT = 700;
  const MARK_CORE = 120;   // and inside it
  // A subpixel filament: subordinate to the white field at 1x and retina.
  // Calibrated in-context against the line hierarchy discussed in README §5.
  const LATTICE_WIDTH = 0.55;

  const canvas = document.querySelector('#gl');
  const renderer = new Renderer({
    canvas, alpha: false, antialias: false, depth: false,
    dpr: Math.min(window.devicePixelRatio, 2),
    powerPreference: 'high-performance',
  });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 1);

  // Every intermediate buffer is half-float; unsupported hardware gets the still.
  // The piece is faint gradients on near-black; in 8-bit those collapse into
  // 1/255 plateaus — concentric rings around every light — and no amount of
  // noise added afterwards can undo a step that has already been taken. With
  // 16-bit floats the only quantisation left is the final write to the
  // canvas, and that one is dithered.
  const HDR = pickHdrFormat(gl, renderer.isWebgl2);
  if (!HDR) throw new Error('A renderable half-float target is required');

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
  const rtOpts = { depth: false, generateMipmaps: false, ...(HDR || {}) };
  let maskRT, sceneRT;
  const down = [];   // BLOOM_LEVELS render targets, 1/2 .. 1/2^n
  const up = [];     // BLOOM_LEVELS - 1, the accumulated walk back up

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

  // The lattice is drawn as screen-space quads and antialiased in the fragment
  // stage; the stroke stays a hairline at every pixel density.
  const latticeMesh = new Mesh(gl, {
    geometry: new Geometry(gl, {
      pa: { size: 2, data: lattice.pa },
      pb: { size: 2, data: lattice.pb },
      meta: { size: 2, data: lattice.meta },
      corner: { size: 2, data: lattice.corner },
      join: { size: 2, data: lattice.join },
      index: { data: lattice.index },
    }),
    program: new Program(gl, {
      vertex: latticeVert, fragment: latticeFrag,
      transparent: true, cullFace: null, depthTest: false, depthWrite: false,
      uniforms: {
        ...view, uProgress: { value: uLatticeProg }, uFade: { value: 1 },
        uWidth: { value: LATTICE_WIDTH * renderer.dpr },
      },
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
      uDither: { value: HDR ? 0 : 1 },
    },
  });
  const fieldMesh = new Mesh(gl, { geometry: new Triangle(gl), program: fieldProgram });

  // Bloom is a mip chain: a soft-knee prefilter into the half-res level, a
  // dual-filter downsample to 1/32, then a tent upsample that adds each level
  // back on the way up. The sum of scales is what gives a hot point a tight
  // core and a wide skirt with no kernel edge anywhere in it.
  const quad = new Triangle(gl);
  const prefilterProgram = new Program(gl, {
    vertex: fullscreenVert, fragment: prefilterFrag,
    uniforms: {
      tScene: { value: null }, uTexel: { value: new Float32Array([0, 0]) },
      uBase: { value: 0 }, uThreshold: { value: 0.14 }, uKnee: { value: 0.10 },
    },
  });
  const downProgram = new Program(gl, {
    vertex: fullscreenVert, fragment: downFrag,
    uniforms: { tSrc: { value: null }, uTexel: { value: new Float32Array([0, 0]) } },
  });
  const upProgram = new Program(gl, {
    vertex: fullscreenVert, fragment: upFrag,
    uniforms: {
      tSrc: { value: null }, tAdd: { value: null },
      uTexel: { value: new Float32Array([0, 0]) }, uRadius: { value: 1.0 },
    },
  });
  const compositeProgram = new Program(gl, {
    vertex: fullscreenVert, fragment: compositeFrag,
    uniforms: {
      tScene: { value: null }, tBloom: { value: null },
      uResolution: view.uResolution, uTime: { value: 0 }, uFrame: { value: 0 },
      uVel: { value: 0 }, uBloom: { value: 0.30 }, uGround: { value: 0 },
    },
  });
  const prefilterMesh = new Mesh(gl, { geometry: quad, program: prefilterProgram });
  const downMesh = new Mesh(gl, { geometry: quad, program: downProgram });
  const upMesh = new Mesh(gl, { geometry: quad, program: upProgram });
  const compositeMesh = new Mesh(gl, { geometry: quad, program: compositeProgram });

  // ---------------------------------------------------------------------------
  // layout
  // ---------------------------------------------------------------------------
  const track = document.querySelector('#scroll_track');
  const layout = { width: 0, height: 0, distance: 0, resizes: 0, refreshes: 0 };
  let lenis = null, trigger = null, resizeTimer = 0;

  function sizeTrack() {
    // The scroll distance is stable, but its tail follows the visible viewport.
    // Thus the last native scroll pixel always reaches rest, even with bars open.
    track.style.height = reduced ? '0px' : `${layout.distance + window.innerHeight}px`;
  }

  function resize(preserveProgress = true) {
    const w = window.innerWidth, h = canvas.clientHeight;
    const pixelBudget = touchQuery.matches ? 2000000 : Infinity;
    const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(pixelBudget / (w * h)));
    sizeTrack();
    if (w === layout.width && h === layout.height && dpr === renderer.dpr) return false;

    const position = preserveProgress && trigger ? trigger.progress : progress;
    renderer.dpr = dpr;
    renderer.setSize(w, h);
    // OGL writes pixel styles; CSS, not the drawing buffer, owns viewport sizing.
    canvas.style.width = '';
    canvas.style.height = '';
    const bw = gl.drawingBufferWidth, bh = gl.drawingBufferHeight;
    view.uResolution.value.set([bw, bh]);
    dustMesh.program.uniforms.uDpr.value = dpr;
    fieldProgram.uniforms.uDpr.value = dpr;
    latticeMesh.program.uniforms.uWidth.value = LATTICE_WIDTH * dpr;

    // Keep the approved desktop and mobile composition shares exactly as drawn.
    const markShare = w < 700 ? 0.46 : 0.34;
    baseScale = ((Math.min(w, h) * markShare) / 360) * dpr;
    if (!maskRT) {
      maskRT = new RenderTarget(gl, { width: bw, height: bh, ...rtOpts });
      sceneRT = new RenderTarget(gl, { width: bw, height: bh, ...rtOpts });
      for (let i = 0; i < BLOOM_LEVELS; i++) {
        const width = Math.max(1, Math.round(bw / 2 ** (i + 1)));
        const height = Math.max(1, Math.round(bh / 2 ** (i + 1)));
        down.push(new RenderTarget(gl, { width, height, ...rtOpts }));
        if (i < BLOOM_LEVELS - 1) {
          up.push(new RenderTarget(gl, { width, height, ...rtOpts }));
        }
      }
    }
    // Reuse framebuffer/texture objects. A real resize changes storage once;
    // address-bar motion never enters this branch or clears the drawing buffer.
    maskRT.setSize(bw, bh);
    sceneRT.setSize(bw, bh);
    down.forEach((rt, i) => {
      const width = Math.max(1, Math.round(bw / 2 ** (i + 1)));
      const height = Math.max(1, Math.round(bh / 2 ** (i + 1)));
      rt.setSize(width, height);
      up[i]?.setSize(width, height);
    });
    Object.assign(layout, { width: w, height: h, distance: h * (SCROLL_VH / 100 - 1) });
    layout.resizes++;
    sizeTrack();
    lenis?.resize();
    if (trigger) {
      trigger.refresh();
      layout.refreshes++;
      seek(position);
    }
    return true;
  }

  function scheduleResize() {
    sizeTrack();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (document.hidden || destroyed) return;
      if (resize()) renderStill();
    }, 160);
  }
  window.addEventListener('resize', scheduleResize, { passive: true });
  window.addEventListener('orientationchange', scheduleResize, { passive: true });

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
  const cue = document.querySelector('#cue');
  let cueGone = progress > 0, cueTimer = 0;

  function retireCue() {
    if (cueGone || timeline.progress() < 0.006) return;
    cueGone = true;
    clearTimeout(cueTimer);
    cue.classList.remove('on');
  }

  function seek(position) {
    const y = position * layout.distance;
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
    ScrollTrigger.update();
    trigger?.getTween()?.progress(1);
    timeline.progress(reduced ? 1 : position);
    velocity = 0;
  }

  function configureScroll(position = 0) {
    trigger?.kill();
    lenis?.destroy();
    trigger = lenis = null;
    document.body.classList.toggle('reduced', reduced);
    sizeTrack();
    if (reduced) {
      window.scrollTo(0, 0);
      timeline.progress(1);
      cue.classList.remove('on');
      clearTimeout(cueTimer);
      return;
    }
    // Touch belongs to the browser: native momentum, pinch zoom and swipe-back.
    // Only wheel input needs Lenis; there is no second touch-inertia simulation.
    if (!touchQuery.matches) {
      lenis = new Lenis({
        lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true,
        syncTouch: false, autoResize: false,
      });
      lenis.on('scroll', (event) => {
        velocity = event.velocity;
        ScrollTrigger.update();
      });
    }
    trigger = ScrollTrigger.create({
      trigger: track, start: 0, end: () => layout.distance,
      animation: timeline, scrub: 0.35,
    });
    layout.refreshes++;
    seek(position);
    if (!cueGone) {
      clearTimeout(cueTimer);
      cueTimer = setTimeout(() => {
        if (!cueGone && !reduced && !document.hidden) cue.classList.add('on');
      }, 1400);
    }
  }

  // ---------------------------------------------------------------------------
  // cursor parallax — touch gestures never become camera movement
  // ---------------------------------------------------------------------------
  const pointer = { tx: 0, ty: 0, x: 0, y: 0, idle: 0 };
  function movePointer(event) {
    if (reduced || event.pointerType !== 'mouse' || touchQuery.matches) return;
    pointer.tx = (event.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (event.clientY / window.innerHeight - 0.5) * 2;
    pointer.idle = 0;
  }
  function keyboardScroll(event) {
    // A keyboard command takes over from any wheel inertia immediately.
    if (['Home', 'End', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) {
      lenis?.reset();
    }
  }
  window.addEventListener('keydown', keyboardScroll);
  function resetPointer() {
    pointer.tx = pointer.ty = 0;
  }
  window.addEventListener('pointermove', movePointer, { passive: true });
  document.documentElement.addEventListener('pointerleave', resetPointer, { passive: true });

  // ---------------------------------------------------------------------------
  // loop
  // ---------------------------------------------------------------------------
  const hud = document.querySelector('#hud');
  const showHud = new URLSearchParams(location.search).has('hud');
  if (showHud) hud.classList.add('on');
  let frames = 0, acc = 0, worst = 0, last = 0, frameNo = 0;
  let rafId = 0, sceneTime = 0, destroyed = false;
  let previousScroll = window.scrollY;
  const metrics = { renders: 0, frameMs: 0, cpuMs: 0 };

  function frame(now) {
    rafId = 0;
    if (destroyed || document.hidden || gl.isContextLost()) return;
    const cpuStart = performance.now();
    const rawDt = last ? now - last : 1000 / 60;
    const dt = Math.max(0.01, Math.min(rawDt, 50));
    last = now;
    if (!reduced) sceneTime += dt;
    lenis?.raf(sceneTime);
    if (!lenis && !reduced) {
      const delta = window.scrollY - previousScroll;
      const target = delta * (1000 / 60) / dt;
      velocity += (target - velocity) * (1 - Math.exp(-dt / 65));
    }
    previousScroll = window.scrollY;
    // CSS collapses the track before a motion-query change event is delivered.
    // Remember the last normal frame, not the resulting browser-clamped scroll.
    if (!reduced && !motionQuery.matches) motionPosition = trigger?.progress ?? motionPosition;
    retireCue();

    if (!reduced && !touchQuery.matches) {
      pointer.idle += dt;
      const drift = Math.min(pointer.idle / 3000, 1);
      const damping = 1 - Math.pow(1 - 0.042, dt / (1000 / 60));
      const driftX = Math.sin(sceneTime * 0.00019) * 0.30 * drift;
      const driftY = Math.cos(sceneTime * 0.00023) * 0.30 * drift;
      pointer.x += (pointer.tx + driftX - pointer.x) * damping;
      pointer.y += (pointer.ty + driftY - pointer.y) * damping;
    } else {
      pointer.x = pointer.y = 0;
    }
    view.uParallax.value[0] = pointer.x * 13;
    view.uParallax.value[1] = -pointer.y * 13;
    const rest = reduced ? 0 : Math.max(0, (timeline.progress() - 0.962) / 0.038);
    view.uScale.value = baseScale * cam.zoom * (1 + rest * Math.sin(sceneTime * 0.00042) * 0.0024);
    view.uRot.value = cam.rot;

    const vel = Math.min(Math.abs(velocity) / 34, 1);
    fieldProgram.uniforms.uTime.value = sceneTime * 0.001;
    fieldProgram.uniforms.uGround.value = state.ground;
    fieldProgram.uniforms.uInkFade.value = state.ink;
    fieldProgram.uniforms.uVel.value = vel;
    fieldProgram.uniforms.uMarkReveal.value = state.markReveal;
    fieldProgram.uniforms.uMarkSolid.value = state.markSolid;
    fieldProgram.uniforms.uSeed.value = state.seed;
    fieldProgram.uniforms.tMask.value = maskRT.texture;
    dustMesh.program.uniforms.uTime.value = sceneTime * 0.001;
    dustMesh.program.uniforms.uFade.value = state.dust * (1 - state.ground);
    latticeMesh.program.uniforms.uFade.value = state.latticeFade * state.ink;
    // ground luminance, so the bright pass measures only what exceeds the page
    prefilterProgram.uniforms.uBase.value = 0.041 + state.ground * 0.861;

    // 1. mark coverage
    renderer.render({ scene: markMesh, target: maskRT, clear: true });
    // 2. field, then lattice over it
    renderer.render({ scene: fieldMesh, target: sceneRT, clear: true });
    renderer.render({ scene: dustMesh, target: sceneRT, clear: false });
    renderer.render({ scene: latticeMesh, target: sceneRT, clear: false });
    // 3. bloom: prefilter into 1/2, dual-filter down to 1/32, tent back up
    prefilterProgram.uniforms.tScene.value = sceneRT.texture;
    prefilterProgram.uniforms.uTexel.value[0] = 1 / sceneRT.width;
    prefilterProgram.uniforms.uTexel.value[1] = 1 / sceneRT.height;
    renderer.render({ scene: prefilterMesh, target: down[0], clear: true });
    for (let i = 1; i < BLOOM_LEVELS; i++) {
      downProgram.uniforms.tSrc.value = down[i - 1].texture;
      downProgram.uniforms.uTexel.value[0] = 1 / down[i - 1].width;
      downProgram.uniforms.uTexel.value[1] = 1 / down[i - 1].height;
      renderer.render({ scene: downMesh, target: down[i], clear: true });
    }
    for (let i = BLOOM_LEVELS - 2; i >= 0; i--) {
      const coarse = i === BLOOM_LEVELS - 2 ? down[i + 1] : up[i + 1];
      upProgram.uniforms.tSrc.value = coarse.texture;
      upProgram.uniforms.tAdd.value = down[i].texture;
      upProgram.uniforms.uTexel.value[0] = 1 / coarse.width;
      upProgram.uniforms.uTexel.value[1] = 1 / coarse.height;
      renderer.render({ scene: upMesh, target: up[i], clear: true });
    }
    // 4. composite to screen
    compositeProgram.uniforms.tScene.value = sceneRT.texture;
    compositeProgram.uniforms.tBloom.value = up[0].texture;
    compositeProgram.uniforms.uTime.value = sceneTime * 0.001;
    compositeProgram.uniforms.uFrame.value = frameNo++;
    compositeProgram.uniforms.uVel.value = vel;
    compositeProgram.uniforms.uGround.value = state.ground;
    renderer.render({ scene: compositeMesh });

    if (showHud) {
      frames++; acc += rawDt; worst = Math.max(worst, rawDt);
      if (acc > 500 || reduced) {
        const fps = reduced ? 'still' : (1000 / (acc / frames)).toFixed(1);
        hud.textContent = `fps   ${fps}\nworst ${worst.toFixed(1)}ms\n` +
          `prog  ${timeline.progress().toFixed(3)}\ndpr   ${renderer.dpr.toFixed(2)}  ` +
          `${gl.drawingBufferWidth}x${gl.drawingBufferHeight}`;
        frames = 0; acc = 0; worst = 0;
      }
    }
    metrics.renders++;
    metrics.frameMs = rawDt;
    metrics.cpuMs = performance.now() - cpuStart;
    document.body.classList.add('ready');
    if (!reduced) rafId = requestAnimationFrame(frame);
  }

  function renderStill() {
    // Also redraw reduced motion after a real resize, without waking an idle loop.
    cancelAnimationFrame(rafId);
    frame(performance.now());
  }

  function suspend() {
    cancelAnimationFrame(rafId);
    rafId = 0;
    last = 0;
    velocity = 0;
    lenis?.reset();
    trigger?.getTween()?.pause();
    resetPointer();
  }

  function resume() {
    if (document.hidden || destroyed || gl.isContextLost()) return;
    last = 0;
    resize();
    lenis?.reset();
    previousScroll = window.scrollY;
    ScrollTrigger.update();
    trigger?.getTween()?.play();
    renderStill();
    if (!cueGone && !reduced && sceneTime > 1400) cue.classList.add('on');
  }

  function visibilityChange() {
    if (document.hidden) suspend();
    else resume();
  }

  let motionPosition = progress;
  function motionChange() {
    reduced = motionQuery.matches;
    suspend();
    configureScroll(motionPosition);
    resume();
  }

  function inputChange() {
    const position = trigger?.progress ?? motionPosition;
    suspend();
    resize();
    configureScroll(position);
    resume();
  }

  motionQuery.addEventListener('change', motionChange);
  touchQuery.addEventListener('change', inputChange);
  document.addEventListener('visibilitychange', visibilityChange);
  document.addEventListener('freeze', suspend);
  document.addEventListener('resume', resume);
  window.addEventListener('pagehide', suspend);
  window.addEventListener('pageshow', resume);
  // setSize() in the Renderer constructor also writes pixel styles.
  canvas.style.width = '';
  canvas.style.height = '';
  resize(false);
  configureScroll(progress);
  renderStill();

  // verification handle — the sequence cannot be checked from the DOM
  window.__n = { timeline, state, cam, renderer, view, fieldProgram, compositeProgram,
                 uLineMeta, uNodes, uLatticeProg, hdr: !!HDR,
                 layout, metrics, get lenis() { return lenis; },
                 get trigger() { return trigger; },
                 get triggerCount() { return ScrollTrigger.getAll().length; },
                 counts: { lattice: lattice.count, mark: mark.count } };

  return {
    get progress() { return reduced ? motionPosition : trigger?.progress ?? 0; },
    destroy() {
      destroyed = true;
      suspend();
      clearTimeout(resizeTimer);
      clearTimeout(cueTimer);
      trigger?.kill();
      lenis?.destroy();
      timeline.kill();
      motionQuery.removeEventListener('change', motionChange);
      touchQuery.removeEventListener('change', inputChange);
      window.removeEventListener('resize', scheduleResize);
      window.removeEventListener('orientationchange', scheduleResize);
      window.removeEventListener('pointermove', movePointer);
      window.removeEventListener('keydown', keyboardScroll);
      document.documentElement.removeEventListener('pointerleave', resetPointer);
      document.removeEventListener('visibilitychange', visibilityChange);
      document.removeEventListener('freeze', suspend);
      document.removeEventListener('resume', resume);
      window.removeEventListener('pagehide', suspend);
      window.removeEventListener('pageshow', resume);
      [maskRT, sceneRT, ...down, ...up].forEach((rt) => {
        gl.deleteTexture(rt.texture.texture);
        gl.deleteFramebuffer(rt.buffer);
      });
      const meshes = [markMesh, dustMesh, latticeMesh, fieldMesh,
        prefilterMesh, downMesh, upMesh, compositeMesh];
      new Set(meshes.map(mesh => mesh.geometry)).forEach(geometry => geometry.remove());
      meshes.forEach(mesh => mesh.program.remove());
      delete window.__n;
    },
  };

}

/**
 * A renderable, linearly-filterable 16-bit float RGBA format, or null if the
 * context has none. Checks the framebuffer actually completes rather than
 * trusting the extension list: some mobile drivers advertise one and refuse
 * the other.
 */
function pickHdrFormat(gl, isWebgl2) {
  let fmt = null;
  if (isWebgl2) {
    if (gl.getExtension('EXT_color_buffer_half_float') || gl.getExtension('EXT_color_buffer_float')) {
      fmt = { type: gl.HALF_FLOAT, internalFormat: gl.RGBA16F, format: gl.RGBA };
    }
  } else {
    const hf = gl.getExtension('OES_texture_half_float');
    if (hf && gl.getExtension('EXT_color_buffer_half_float') &&
        gl.getExtension('OES_texture_half_float_linear')) {
      fmt = { type: hf.HALF_FLOAT_OES, internalFormat: gl.RGBA, format: gl.RGBA };
    }
  }
  if (!fmt) return null;

  const tex = gl.createTexture();
  const fb = gl.createFramebuffer();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internalFormat, 4, 4, 0, fmt.format, fmt.type, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.deleteFramebuffer(fb);
  gl.deleteTexture(tex);
  return ok ? fmt : null;
}
