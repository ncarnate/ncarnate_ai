# Ncarnate.ai

The pre-launch page for the Ncarnate platform, served from GitHub Pages
(`CNAME` pins `ncarnate.ai`). The site is one page and nothing else: the
scroll-driven emergence of the Ncarnate "N" mark, in WebGL. No other URL on the
domain resolves, by design.

## Current state

- `index.html` — **the entire site, and a generated file.** One self-contained
  document, 265 kB / 95 kB gzipped: markup, styles, shaders, artwork geometry
  and the renderer are all inlined, so the page makes no second request. Do not
  hand-edit it; `npm run build` overwrites it.
- `src/` — the source it is built from (see [Build state](#build-state)).
- `CNAME` — pins the custom domain.
- `.nojekyll` — Pages serves the files as they are, with no Jekyll step.
- `_archive/` — the previous full site, **git-ignored and local-only**. Not in
  the repository; kept on disk so the old pages stay readable.

Nothing else resolves on the domain. The old `vosa/`, `pages/`, `vosa-deck/`
and `blog/` paths were removed from the tree, so they 404.

Preview exactly what Pages serves: `python3 -m http.server 8000` from the
repository root → <http://localhost:8000>

---

# Project: Immersive N

Rebuild the N-logo animation as a deeply immersive WebGL experience, in the
register of [Lusion](https://lusion.co/).

Everything about this project stays in this repo. This file is the brief; the
source is in `src/`.

**Status: interaction, red-light and star-ray polish complete (2026-09-08).**
This revision refines the red lattice, node lighting and white construction
rays on top of the interaction polish in `ab17ceb`; the source geometry, six
beats and final mark remain unchanged. Both optical passes are approved.
Reference rationale and measured verification are in §5 and
[Build state](#build-state).

**Scroll hint removed:** the bottom-centre scroll hint has been removed entirely,
including its animation and lifecycle code. Scrolling and the artwork are unchanged.

---

## ▽ BEGIN HANDOFF PROMPT

You are building **Immersive N** — a single-page WebGL experience for Ncarnate
Labs whose entire content is the emergence of the Ncarnate "N" mark.

Work in `src/`. The root `index.html` is generated from it — never hand-edit
it. `_archive/` is git-ignored and local-only; do not touch it, and never
commit it.

### 1. The asset you are starting from

The current animation lives in the root `index.html`. Read it first. Verified
facts about the artwork:

| Thing | Detail |
|---|---|
| SVG canvas | `viewBox="0 0 1296 864"` (3:2) |
| Construction lines | **12** — two 6-fold stars, `#star1_lines` and `#star2_lines`, each 6 lines at 0°/30°/60°/90°/120°/150°. They extend far past the canvas. |
| Star centres | star1 ≈ (576, 360), star2 ≈ (720, 504) — offset by (144, 144) |
| Nodes | **4** red circles, `r=9`, at (576, 252), (522, 389.79), (720.63, 612), (774, 473.65) — these sit on line intersections |
| Inner lattice | **50** red strokes in `#red_lines` (40 `<path>`, 10 `<rect>`) |
| The mark | **2** shapes in `#logo`: `#logo_left` (polygon), `#logo_right` (path) |
| Ink | `#231f20` near-black, `#c20a29` red (`hsl(350 90% 40%)`), `#e6e6e6` ground |
| Type | Inter, via `rsms.me` |
| Current tech | GSAP 3.12.4 + ScrollTrigger + DrawSVGPlugin 3.13.0, all CDN |
| Current timeline | duration 1.491, scrubbed over an 800vh spacer at `scrub: 0.3` |

**The concept worth preserving.** The N is not drawn — it is *discovered*. Two
overlapping stars of infinite lines intersect, and the mark is already sitting
in the negative space where they cross. The logo is a consequence of the
geometry, not an illustration laid on top of it. Every design decision below
serves that idea. If a proposed effect does not serve it, cut the effect.

### 2. The reference, and what to actually take from it

Study [lusion.co](https://lusion.co/) and [oryzo.ai](https://oryzo.ai) (also
Lusion — Edan Kwan's satirical product site). Do not clone them. Take the
*craft standard*, not the visual motifs:

**What actually makes that work feel the way it does**

- **Nothing snaps.** Every response is spring-damped and lags the input
  slightly. Cursor, scroll, camera, opacity — all critically damped, never
  linear, never instant.
- **Scroll is velocity, not position.** Inertial scrolling, and scroll *speed*
  feeds the visuals (stretch, blur, chromatic offset), not just scroll offset.
- **The load is part of the piece.** A designed entry sequence with a real
  progress readout. Never a spinner. The first frame is already composed.
- **The payoff is earned.** A long, quiet build with restraint, then one
  moment of resolution. Resist the urge to make everything happen at once.
- **Enormous negative space, restrained palette, one accent.** You already
  have this: grey ground, near-black, one red.
- **Post-processing is the finish.** Subtle bloom on the red, chromatic
  aberration scaled by scroll velocity, fine film grain, a slight vignette.
  Each one barely perceptible alone; together they read as "expensive."
- **60fps is a hard requirement**, not a goal. Lusion ships custom renderers
  specifically to hold frame budget. You are working thin and close to the
  metal for the same reason (§4) — spend the budget on shader quality, not on
  framework you will not use.

**What to ignore:** their specific effects (curly tubes, fluid sims, cloth).
Borrowing those makes a pastiche. The N's own geometry is the subject.

### 3. The narrative

Six beats, scrubbed by scroll. Hold each one longer than feels comfortable.

1. **Void** — near-black or deep grey. Slow drifting dust. One faint point of
   light where the first intersection will be. Nothing else. This is where the
   page rests on load.
2. **Construction** — the 12 lines sweep in as thin rays of light, not strokes.
   They arrive from off-canvas, on their real angles, staggered. The two stars
   arrive as distinct events, star1 then star2.
3. **Ignition** — the 4 nodes fire where lines cross. Red. Each one a small
   burst that pushes light along the lines it sits on.
4. **Lattice** — the 50 inner strokes propagate outward from the nodes along
   the construction grid, drawing the internal structure.
5. **Coalescence** — the N resolves out of the negative space. This is the one
   moment of real payoff in the piece. It should feel like focus, not fade-in
   — the geometry *becomes* legible rather than an object appearing.
6. **Rest** — scaffolding dissolves. The N alone, breathing almost
   imperceptibly, reacting to the cursor with parallax. The viewer can stay
   here. (A specular sweep was in the original brief and was cut: on flat ink
   on paper it has no physical excuse, and it reads as a gimmick. The rest
   state is parallax plus a ±0.24% scale breath on a 15s period — present, not
   noticeable.)

### 4. Technical spec

**Stack**

- **OGL** — WebGL2 with WebGL1 fallback. *Not Three.js* — see below.
- **GSAP + ScrollTrigger** — the timeline spine (keep; it already works)
- **Lenis** — inertial scroll, exposes velocity
- **Vite** — dev server and build
- Post-processing: **hand-written GLSL**, no library

**Why not Three.js.** Measured, tree-shaken, gzipped:

| Stack | gzipped |
|---|---|
| three (renderer + SVGLoader) | 146 KB |
| + `postprocessing` (pmndrs) | 161 KB |
| + gsap/ScrollTrigger + lenis | **210 KB** |
| ogl (renderer + fullscreen program) | 14 KB |
| + gsap/ScrollTrigger + lenis | **63 KB** |
| *gsap + ScrollTrigger alone* | *44 KB* |
| *lenis alone* | *5 KB* |

This piece is 12 lines, 4 nodes, 50 lattice strokes and the mark — all SDFs in
a fragment shader, plus a GPGPU dust pass. There is no scene graph, no camera,
no lighting, no materials, no mesh hierarchy. Three.js's whole value is the
part you would not touch; you would be paying 146 KB to use it as a WebGL
context wrapper. The concept argues the same way — "discovered in the negative
space where two star fields cross" is inherently flat and screen-space, and
depth fights it.

Same reasoning kills `postprocessing`: 15 KB marginal is cheap, but bloom +
chromatic aberration + grain + vignette is ~80 lines of GLSL, and the brief
demands each effect be *barely perceptible*. You want direct control of those
constants, not presets tuned for a game-like look.

GSAP stays despite being the largest single item. Six beats with staggers and
eased sub-sequences is exactly what timelines are for, and it is already proven
in the current file. (You *could* pass one `uProgress` uniform and do all beat
timing in GLSL with `smoothstep` ranges — that is the 19 KB floor — but tuning
easing curves in GLSL is miserable. Not worth it.)

*Settled: flat.* Beat 5 works **because** it is screen-space — the mark is
found by biasing a 2D light field, which is not a thing you can do with an
extruded mesh. Depth would have made it an object appearing, which is the one
outcome §3 forbids.

**Build notes.** This introduces a build step and `node_modules`, which the
current site deliberately does not have — acceptable because the *output* is
still one hand-servable file: Vite folds the single JS chunk into the HTML, so
what Pages serves is one self-contained document with no second request. Commit
the built `index.html` alongside the source. And **Vite 8 is rolldown-based and
needs newer Node than the 20.11.1 that was on this machine** — it dies with
`node:util does not provide an export named 'styleText'`. Pinned: Vite 7,
Node 22 via `.nvmrc`.

**Rendering approach**

- Draw the lines as **screen-space SDF lines in a fragment shader**, not as
  geometry with stroke-dash. You get free antialiasing, glow, and thickness
  that is resolution-independent — and the "light ray" quality that
  `DrawSVGPlugin` cannot produce.
- Reveal along a line by animating a parameter in the shader, not by
  transforming an object.
- The N mark: also an SDF, so the whole piece stays in one visual language.
  *Solve it analytically* — the mark is two disjoint 6-gons, so an exact
  polygon SDF over a fullscreen pass is 12 segments per pixel, which costs
  nothing and beats a baked texture on every axis: correct at any zoom, no
  offline step, and it hands you a real distance to build the coalescence out
  of. (A baked texture was the original plan. It is unnecessary.)
- Recovering that polygon is the one fiddly part. The mark reaches you as
  sampled path points, so every corner arrives as a *pair* of samples
  straddling the true vertex, which bevels it. Douglas-Peucker to find how many
  edges there are, then fit a line through each edge's interior samples and
  intersect neighbours: exact corners, 0.2 artwork units of error.
- Dust: 700 additively-blended point sprites, positions integrated in the
  *vertex* shader from a per-mote seed. GPGPU is the right tool an order of
  magnitude further up; at this density it is ceremony.
- One render target chain, all of it half-float. Mask → scene → soft-knee
  prefilter at ½ res → dual-filter downsample to 1/32 → tent upsample, adding
  each level back → composite. Fold bloom, chromatic aberration, highlight
  shoulder, grain, vignette and the final dither into that single composite
  pass — do not chain a pass per effect. The buffers are 16-bit float because
  the piece is faint gradients on near-black: in 8-bit they collapse into
  1/255 plateaus (rings around every light), and noise added afterwards cannot
  undo a step already taken. The one 8-bit write left, the canvas, gets a
  triangular-PDF dither at one LSB.
- A slow camera runs under everything: the field starts rotated ~4.5° and
  zoomed in, and rectifies onto the axis exactly as the mark settles. It is
  what keeps the long construction beats from reading as static, and it makes
  the lockup land as an arrival rather than a stop.

**Interaction**

- Cursor drives parallax as a shader uniform, not a camera (spring-damped,
  a few pixels of offset — subtle)
- Scroll velocity drives chromatic aberration strength and line stretch
- Idle drift when the cursor has not moved for a few seconds
- Touch: parallax from device orientation if permitted, otherwise omit it

### 5. Definition of clean

These are the gates. Iterate until every one passes — this list is what
"super clean" means, so that iteration converges instead of wandering.

**Red-light finish: reference and calibration**

The original stroke weight was tuned by eye. This pass uses explicit visual
precedents, then calibrates the actual raster output; no reference is being
claimed as the source of a universal CSS line-width value.

| Primary reference | What was inspected | Decision for this piece |
|---|---|---|
| [Ryoji Ikeda — data-verse / X-verse](https://www.ryojiikeda.com/project/x_verse/) | The artist's data-verse 3 installation photographs: fine white networks and precise red coordinate accents | Red should describe structure, with no broad wash obscuring the intersections. Not a reference for this page's pacing or flashing. |
| [Matt DesLauriers — Subscapes, technical account](https://mattdesl.substack.com/p/subscapes-part-3) | Artist-published renderings and the discussion of line thickness, density and contrast | Judge weight and contrast together, and keep fine strokes continuous. The quieter candidate must not erase the lattice at 1×. |
| [Lusion](https://lusion.co/) | Live homepage, entry and scroll transition | The broader interactive-finish benchmark. Its current 3D materials are not a literal stroke-width reference or a motif to copy. |

The visual conclusions in the last column are this project's design judgments,
not specifications published by those artists. Reference images remain in the
local QA directory, not in this public repository.

**Selected treatment**, compared in-context at 38/46/53/60/66/72/80% on desktop
1×/2× and a 3× phone profile (rendered at the existing 2× cap):

- **0.55 CSS px** lattice width, replacing 0.7 CSS px plus a one-device-pixel
  minimum. The 0.50 px / lower-opacity candidate was also rendered and inspected;
  0.55 keeps the geometric structure more legible at 1× and on mobile.
- Thin-strip pixel coverage and shared miter joins replace overlapping segment
  caps. Sampling density no longer makes a stroke heavier or creates bright
  joints; this is a rasterization correction, not a change to the artwork paths.
- Lattice base alpha **0.62 → 0.50**. Drawing tips remain red, with a small
  temporary lift instead of white-hot endpoints; they cool fully at completion.
- Node halo gain **0.50 → 0.18** (64% less), with its exponential falloff length
  **18.2 → 11.1 artwork units**. Node radius is 72% of its former rendered value;
  lower core energy keeps the four arrivals precise without losing their beat.
- This first optical pass left the white construction rays unchanged; the
  follow-on ray treatment is recorded below. No global bloom reduction, palette
  or timeline change. All targets remain half-float, with final dithering intact.

**Star-ray finish: Lusion-led calibration**

[Lusion](https://lusion.co/) is the governing reference for this follow-on pass.
The live homepage and its scroll transition were inspected again: contained
specular highlights against dark materials preserve contrast without spreading
light across the whole image. The translation to this flat piece is a finer
construction field, controlled intersections and a brighter relative payoff.
This is our interpretation of the reference, not a claim about Lusion's shader
parameters or a reason to introduce its 3D motifs.

Two candidates were rendered against the previous red-refined build at
8/14/20/30/40/60/72/80/100%, on desktop 1×/2× and an iPhone profile. The quieter
candidate was selected: its rays remain continuous and legible, with less haze
and a clearer separation between the construction and the N's arrival.

- Core support **1.50 → 1.15 artwork units**, retaining the **0.8-device-pixel
  feather** for subpixel stability. Core gain **1.0 → 0.80**. These are light
  profile parameters, not a fixed CSS stroke-width claim.
- Halo gain **0.22 → 0.12** (45% lower); rest-state exponential falloff length
  **11.8 → 8.0 artwork units**. Scroll-velocity response remains in place.
- A local, smooth highlight shoulder replaces the hard accumulated-light cap
  during construction. Six overlapping rays retain a luminous centre without
  flattening into a broad white hotspot; global bloom is unchanged.
- Travelling-head contribution **0.30 → 0.20**, with a narrower halo contribution
  and smooth onset/completion instead of binary activation. The twelve arrivals
  keep their original timeline and geometry.
- The original ray profile returns progressively inside the emerging N. The
  mark's own body/rim lighting, final ink, seed, dust and the previous red-light
  settings are unchanged. Nothing in scroll, resize or resource handling changed.

Measurements below are from the **local production build, 2026-09-08**, driven
with Playwright 1.58.2 / Chromium 145 on an **Apple M4 Max, macOS 15.6.1**, using
hardware ANGLE/Metal. Normal browser frame pacing is enabled (120 Hz on this
host): **no `--disable-frame-rate-limit` flag**. Seven configurations, three
10-second forward-and-reverse scroll runs each, **25,211 sampled frames**.
The table reports the worst percentile across the three runs, not a selected
best run. Screenshot readback is kept outside timing windows. Screenshots and
lifecycle checks also ran in **WebKit 26.0**.

The old 1–2 ms "60fps" figures were collected with Chromium's frame-rate limit
disabled; they were not real display cadence and have been superseded. rAF
intervals below measure cadence; render-CPU time measures JS/WebGL submission,
**not completed GPU time**. CPU throttling does not emulate a phone GPU or prove
performance on other integrated graphics. Physical iOS/Android toolbar behavior
and device GPU/thermal performance remain unmeasured; mobile results here are
explicitly emulation, plus the injected toolbar-lifecycle test below.

**Performance**

| Profile | Backing buffer | rAF p50 | p95 | p99 | Worst | Render CPU p95 |
|---|---|---:|---:|---:|---:|---:|
| Desktop 1440×900 @2× | 2880×1800 | 8.3 ms | 9.1 ms | 9.3 ms | 9.4 ms | 0.3 ms |
| Desktop 2560×1440 @1× | 2560×1440 | 8.3 ms | 9.1 ms | 9.3 ms | 9.4 ms | 0.3 ms |
| Desktop 1440×900, CPU 4× | 2880×1800 | 8.3 ms | 9.2 ms | 9.3 ms | 9.4 ms | 0.5 ms |
| iPhone 390×844 @3× | 780×1688 | 8.3 ms | 9.1 ms | 9.3 ms | 9.4 ms | 0.3 ms |
| iPhone, CPU 4× | 780×1688 | 8.3 ms | 9.2 ms | 9.3 ms | 9.4 ms | 0.4 ms |
| Android 412×839 @3× | 824×1678 | 8.3 ms | 9.1 ms | 9.3 ms | 9.4 ms | 0.3 ms |
| Android, CPU 4× | 824×1678 | 8.3 ms | 9.2 ms | 9.3 ms | 9.4 ms | 0.4 ms |

- [x] ≥60fps at 1440×900 on this Apple Silicon host: **8.3 ms median**,
      maintaining its 120 Hz cadence with the approved 2880×1800 buffer.
- [x] ≥30fps under CPU 4× emulation: **p95 ≤9.2 ms** on desktop and both
      mobile profiles. This is a CPU stress gate, not physical phone certification.
- [x] No frame over 50 ms in the timed full-sequence runs: **0 / 25,211**;
      **9.4 ms** worst frame.
- [x] Separate CDP-native touch swipes at CPU 4× traverse end-to-start on both
      phone profiles: **2,480 frames**, **8.3 ms median / 9.2 ms p95 / 9.3 ms
      p99 / 9.4 ms worst**, zero >50 ms frames, ending at exactly zero with
      one trigger and no layout rebuilds.
- [x] JS payload <120 kB gzipped: the **entire HTML, JS, shaders and geometry
      total 94.7 kB gzipped** (265.4 kB raw, Vite report). One document request, no assets.
- [x] Scene interactive <3 s: **1.59 s**, at exactly zero progress, with a cold
      cache, 1.6 Mbps down / 750 kbps up / 150 ms latency and CPU 4×. The local
      HTTP server sent the full **uncompressed** document; zero other requests.

**Correctness**

- [x] Fresh load and reload start at exactly zero, on the void. The canvas is
      revealed only after the first complete render; no later-state flash.
- [x] Zero console errors and zero failed requests in the production checks.
- [x] Seven viewport changes mid-sequence preserve progress within 0.001 and
      leave exactly one ScrollTrigger. GPU instrumentation stays at **11 live
      textures + 11 live framebuffers**, with no new objects on resize.
- [x] Thirty simulated browser-toolbar height changes on each phone profile:
      **zero target reallocations, zero refreshes, unchanged progress**. Width
      and `lvh` stayed fixed while `innerHeight` changed, matching the toolbar
      resize contract. This is an injected lifecycle test, not real browser UI.
- [x] Portrait/landscape and 390×844 through 2560×1440 checked visually. Approved
      shares remain 34% of the short axis, 46% when width is under 700 px.
- [x] End-to-start scrubbing returns every timeline state, camera state, line,
      node and lattice value exactly to its initial value.
- [x] Native touch gestures advance and reverse the sequence on iPhone/Android
      profiles, without Lenis or touch parallax. Keyboard and wheel checks pass.
- [x] Real hidden-tab test: render count and scene time stop while hidden;
      returning preserves progress and does not refresh or reallocate. The
      Playwright runner's forced-focus emulation was disabled for this test.
- [x] GPU context loss shows the still; restoration returns to retained progress
      with one trigger and 11 live target textures/framebuffers.

**Accessibility & degradation**

- [x] Initial and live `prefers-reduced-motion: reduce`: final composition at
      progress 1, zero scroll range, zero ScrollTriggers, no Lenis and no idle
      render loop. Idle screenshots are byte-identical; resize redraws once.
      Removing the preference restores the prior normal-motion position.
- [x] WebGL1 tested. No WebGL or no renderable half-float support silently shows
      the SVG mark and collapses the track. The one-file build contains all code;
      there is no separate renderer download, including on this fallback path.
- [x] Real `<h1>` and meta description remain in the DOM; decorative canvas and
      diagnostic HUD are hidden from assistive technology.
- [x] Home/End/PageUp/PageDown work, including handing off from wheel inertia.
- [x] Safe-area override: a 34 px home-indicator inset places the diagnostic HUD
      34 px above the viewport bottom. Native **1.5× pinch zoom**
      is allowed and causes no scene resize or timeline refresh.

**Craft**

- [x] Nothing moves linearly. No `ease: none` on anything the eye tracks.
- [x] No dead zone — no stretch of scroll where nothing perceptibly changes.
      Beats overlap by design (nodes fire while the last lines are still
      arriving; the lattice tail runs into the coalescence), and the camera
      moves continuously underneath all of it.
- [x] Total scroll length justified by content — the equivalent of 620vh,
      now a stable 520lvh scrub distance plus one live viewport of track
- [x] The red is used once, with intent — the four nodes and the lattice they
      draw, nothing else
- [x] Screenshots at 0/20/40/60/80/100% in desktop, iPhone, Android and
      WebKit iPhone profiles, visually inspected alongside the approved baseline

### 6. How to iterate

1. Get beats 1→6 wired end to end with placeholder visuals **first**. Timing
   and pacing are the hard part; effects are the easy part.
2. Screenshot the six beats. Look at them side by side. Fix composition before
   touching shaders.
3. Then one beat at a time, to final quality.
4. Re-run the §5 gates after every beat. Do not accumulate debt.
5. Profile before optimizing. The bottleneck is rarely where it feels.

Drive it with real browser automation and *look at the screenshots* — a scroll
animation cannot be verified from the DOM alone.

### 7. Decisions

These were the open questions. All are settled; the rationale is here so a
fresh session does not reopen them.

- **Flat or depth? → Flat, screen-space.** Answered first because §4's renderer
  choice hangs on it. The concept is "the mark is already sitting in the
  negative space where two star fields cross" — that is a statement about a 2D
  light field, and beat 5 executes it literally by biasing the field so light
  pools inside the silhouette and drains outside it. An extruded, lit,
  rotating N would be an object appearing, which §3 forbids. Depth would also
  have cost 147 KB for a scene graph with one object in it.
- **Ground colour? → Dark to light.** Open on the void, land on the brand grey
  `#e6e6e6`. This is what makes the piece work: light-on-dark for the whole
  construction, then the ground lifts underneath the mark and the same shape
  reads as ink on paper. It resolves *to* the existing brand, which is a better
  ending than starting there. It also buys the entire vocabulary — bloom,
  glow, dust, ignition — none of which exists on a grey page.
- **Build step? → Yes: Vite, source in `src/`.** Ten GLSL files and three npm
  dependencies do not survive being hand-pasted into a single document. But the
  *output* is still one file: a 25-line Vite plugin inlines the chunk into the
  HTML, so the built site is a single self-contained `index.html` and the repo
  root stays as simple as it was before there was a build.
- **Sound? → Out.** Ruled out by Svetly. Also right on the merits: audio that
  cannot autoplay needs an unmute affordance, and an unmute button is the only
  piece of UI the composition cannot absorb.
- **Fate of the root page? → It is the root page.** Ncarnate.ai is now this
  and nothing else — the pre-launch holding page for the platform. Everything
  prior (`vosa/`, `pages/`, `vosa-deck/`, `blog/`, the old landing page) is out
  of the repository and off the domain; it survives locally in `_archive/`,
  which is git-ignored.

## △ END HANDOFF PROMPT

---

## Build state

**Scroll hint removed — approved release, 2026-09-08.** Removed the label, animated
line, styles, timer and lifecycle hooks. The generated `index.html` is rebuilt.
No shader, timeline or scrolling changes; §5 frame-time measurements remain from
the approved optical build. The removal is included in this revision.
Chromium desktop/iPhone and WebKit iPhone checks pass: no hint after idle,
zero-progress load, forward/reverse scroll, resize, reduced motion and clean
console. Screenshots were inspected; evidence is in `/tmp/ncarnate-no-cue/`.

**Red-light + star-ray refinement — approved release, 2026-09-08.** The generated
root `index.html` is current and verified; the development preview remains at
<http://localhost:5181/>. Both optical passes are included in this revision.
Reference studies, candidate comparisons and selected values are recorded in §5.
Current evidence is in
`/tmp/ncarnate-ray-polish/qa/`, with Lusion captures in its sibling `references/`
folder. The prior red-light comparisons remain in `/tmp/ncarnate-red-polish/qa/`.

Changed: red lattice coverage, joins, tips and node lighting; star-ray core,
halo, travelling highlights and intersection rolloff. Unchanged: source artwork
coordinates, six-beat timeline, final mark, scroll/resize behavior, `CNAME`,
`.nojekyll`, Pages settings and `_archive/`.

**Interaction polish — published as `ab17ceb`.** The following lifecycle and
mobile refinements remain in place:

**Refinement, not redesign**

- Native scrollbars are hidden in Chromium, WebKit and Firefox CSS without
  disabling scrolling, keyboard input or pinch zoom. Root overscroll and scroll
  anchoring are disabled; the diagnostic HUD respects safe-area insets.
- The artwork uses a stable `100lvh` stage (`100vh` fallback). Scroll distance
  stays at 5.2 large viewports; only the track's viewport-sized tail follows
  `innerHeight`. Browser toolbar changes do not clear the canvas, resize GPU
  storage, refresh ScrollTrigger or change the mapping from scroll to progress.
  `dvh` is deliberately not the render-buffer size: that would reintroduce
  address-bar-driven allocation. Real viewport/orientation changes settle for
  160 ms, resize existing targets in place and retain normalized progress.
- Touch stays entirely native: no Lenis instance on a coarse-primary pointer,
  no simulated touch inertia, no swipe-driven parallax. Desktop wheel input
  keeps the existing Lenis tuning. ScrollTrigger now owns the timeline through
  `animation` so its intended 0.35 s scrub actually works. Keyboard commands
  cancel pending wheel inertia without preventing the browser's key action.
- DPR remains capped at 2, including 3× phones; large touch viewports also have
  a two-million-pixel budget. DPR-dependent uniforms update with the buffer.
  The desktop resolution and artwork proportions are unchanged.
- The canvas stays hidden until its first complete composition. A fresh
  navigation/reload starts at zero. There is no extra font, favicon or asset request.
- Hidden/frozen pages stop rendering; the scene clock pauses rather than
  jumping on resume. Mouse damping is refresh-rate independent. Reduced motion
  renders a truly static final composition, with no Lenis, ScrollTrigger or
  continuous render loop. Live preference changes and resizing work as well.
- Capability detection uses the actual canvas, not a second GPU context.
  Missing WebGL or renderable half-float support lands on the SVG still. Context
  loss disposes scene resources/listeners, shows that still, and reconstructs
  the scene at the retained progress if the context is restored. No 8-bit
  intermediate fallback is introduced.
- The single-file build uses a replacement callback when inlining JavaScript;
  literal dollar sequences in minified code cannot corrupt the HTML anymore.

**Earlier interaction-pass artifacts** live outside this public repository, in
`/tmp/ncarnate-polish/qa/`; the Playwright runners are in its parent directory.
Current optical-pass evidence is in `/tmp/ncarnate-ray-polish/qa/`. These are
local working evidence, not published site assets. Current measured gates and
hardware/emulation limits are recorded in §5.

```
index.html              generated — the entire site, one self-contained file
CNAME                   the custom domain
.nojekyll               Pages serves the files as they are
src/
  page.html             the page shell: void ground, canvas, no-WebGL still
                        (not index.html, so /src/ resolves to nothing on Pages)
  main.js               canvas capability test, fallback mark, context recovery
  scene.js              boot(): passes, six-beat timeline, stable layout, scroll/lifecycle
  geometry.json         resolved artwork — transforms baked out of the source SVG
  lib/artwork.js        geometry.json -> lines, nodes, lattice buffers, mark polygons
  shaders/              fullscreen.vert lattice.vert dust.vert
                        field.frag mark.frag lattice.frag dust.frag
                        prefilter.frag down.frag up.frag composite.frag
  vite.config.js        glsl imports; folds the chunk in and emits ../index.html
  .nvmrc                22
```

**Run it**

```sh
cd src
nvm use            # 22 — Vite 7 will not start on 20.11.1
npm install
npm run dev        # http://localhost:5181, hot reload
npm run build      # rewrites the root index.html
```

Preview what Pages actually serves with `python3 -m http.server 8000` from the
repository root. `?hud` on either URL prints actual frame cadence, worst frame,
timeline progress and buffer size. Test without `?hud` for performance samples.

**What the frame is made of**, per render:

| Pass | Target | Cost |
|---|---|---|
| mark | full res | one fullscreen quad, 12-segment exact polygon SDF → coverage + distance in/out |
| field | full res | 12 analytic line SDFs, 4 nodes, the seed, ground mix, the coalescence |
| dust | full res | 700 additive point sprites |
| lattice | full res | 2 287 screen-space quads, analytically antialiased, carrying `(element, arcLength)` |
| prefilter | ½ res | 4×4 box + soft-knee threshold above the ground's own luminance |
| down ×4 | ¼ … 1/32 | dual-filter (Bjørge 2015) |
| up ×4 | 1/16 … ½ | 3×3 tent, each level added back |
| composite | screen | bloom + velocity-scaled chromatic aberration + highlight shoulder + grain + vignette + TPDF dither |

**Deliberate departures from the brief**, all in §4 and §7 with reasons: the
mark's SDF is analytic rather than a baked texture; dust is vertex-shader point
sprites rather than GPGPU; beat 6's specular sweep is cut. Device-orientation
parallax on touch is omitted, which §4 allows — it needs a permission prompt on
iOS, and a modal dialog is not an opening beat.

**Known and accepted**

- The repository is public, so `README.md`, `AGENTS.md` and `src/` are readable
  on GitHub and fetchable by exact URL on the domain. Nothing here is secret;
  if that changes, make the repository private rather than trying to hide paths.
- The old site's history — `vosa/`, its Apple SF Pro font files, `pages/` — is
  still in the git history even though those paths are gone from the tree.
  Removing it would require rewriting published history.

---

## Research notes

Gathered while writing this brief.

**Lusion's actual stack.** Their studio site uses a *fully custom WebGL
renderer* — not Three.js — for frame-budget reasons, with cloth simulation,
real-time GI approximation and fluid dynamics shaders. Their client work does
use Three.js, with vertex animations authored in Houdini and offline frames
rendered in Redshift3D and composited with the realtime layer. Matching them
exactly is not a realistic target; matching their *restraint and finish* is.

**Oryzo AI** is Lusion's own fictional product site (Edan Kwan) — a satirical
cork coaster "for the AI era." Useful as a study in narrative pacing and
type-driven storytelling on a single scrolling page, less so for 3D technique.

**`ai-website-cloner-template`** (suggested as an analysis tool) rebuilds a
target site as a Next.js 16 / React 19 / Tailwind v4 / shadcn app via a
`/clone-website <url>` command. It is a **poor fit here**: it extracts DOM,
design tokens and static assets, and Lusion's value is almost entirely inside
canvas and shaders, which it cannot see. It would also impose Next.js on a repo
that is deliberately static. Recommend not using it. If you want automated
reference-gathering, capture scroll-depth screenshots and record frame timings
instead.

**GSAP licensing** is no longer a concern — the full plugin set, including
`DrawSVGPlugin`, became free in 2025.

Sources:
[Lusion](https://lusion.co/) ·
[Curly Tubes from the Lusion Website with Three.js — Codrops](https://tympanus.net/codrops/2021/05/17/curly-tubes-from-the-lusion-website-with-three-js/) ·
[Lusion — Communication Arts](https://www.commarts.com/webpicks/lusion) ·
[Gemini: A WebGL Car Demo by Lusion](https://www.webgpu.com/showcase/gemini-webgl-car-demo-lusion/) ·
[Best Three.js Websites 2026 — Utsubo](https://www.utsubo.com/blog/best-threejs-websites-2026) ·
[Oryzo AI on Product Hunt](https://www.producthunt.com/products/oryzo-ai) ·
[ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template)
