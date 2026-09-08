# Ncarnate.ai

The pre-launch page for the Ncarnate platform, served from GitHub Pages
(`CNAME` pins `ncarnate.ai`). The site is one page and nothing else: the
scroll-driven emergence of the Ncarnate "N" mark, in WebGL. No other URL on the
domain resolves, by design.

## Current state

- `index.html` — **the entire site, and a generated file.** One self-contained
  document, 256 KB / 91 KB gzipped: markup, styles, shaders, artwork geometry
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

**Status: shipped.** It is the site. Every open question in §7 is decided and
every gate in §5 passes with measured numbers. The brief below is kept
as-written — it is still the spec the build is held to, and still handoff-ready
for a fresh session (copy BEGIN to END). What actually shipped is in
[Build state](#build-state) at the bottom.

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
- One render target chain. Mask → scene → bright pass at ¼ res → separable
  9-tap blur → composite. Fold bloom, chromatic aberration, grain and vignette
  into that single composite pass — do not chain a pass per effect.
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

Measurements below are from the production build, driven by Playwright over a
full scroll of the sequence. Frame times are rAF deltas; ~1 770 frames per
configuration, three runs.

**Performance**

- [x] Locked 60fps at 1440×900 on Apple Silicon, measured over a full scroll —
      **≤2.1 ms median, 2.4 ms p95** at a 2880×1800 backing buffer. The budget
      is 16.7 ms; roughly seven eighths of it is unspent.
- [x] ≥30fps on integrated graphics (throttle CPU 4×) — **≤1.2 ms median**;
      also ≤2.0 ms at 2560×1440 and ≤2.0 ms at iPhone 390×844@3x
- [x] No frame over 50ms during the whole sequence — **0 of ~21 000 frames**
      across all four configurations and three runs; worst single frame 11.6 ms
- [x] JS payload **< 120 KB gzipped total** — **92 KB** (89.9 scene + 1.3
      entry + 1.3 HTML). No CDN, no fonts, no images, one request each.
- [x] Scene interactive < 3s on simulated Fast 3G — **1.68 s**

**Correctness**

- [x] Page rests at beat 1 on load — blank/void, animation at exactly zero
      progress, no flash of a later state (the current site had this bug: the
      ScrollTrigger start offset put progress above zero at scroll 0)
- [x] Zero console errors, zero failed requests
- [x] Resize mid-scroll rebuilds cleanly, leaves exactly one ScrollTrigger, no
      leaked render targets or listeners — seven viewport changes mid-sequence,
      clean; render targets free both texture and framebuffer
- [x] Works at 390×844 through 2560×1440; the composition reflows, it does not
      just scale — the mark holds 34% of the short axis, 46% under 700px, and
      the infinite construction lines fill whatever is left
- [x] Scrubbing backwards is as clean as forwards — end-to-start returns every
      state variable to exactly its initial value

**Accessibility & degradation**

- [x] `prefers-reduced-motion: reduce` → static composed N, no scroll hijack —
      the track collapses to 100vh, Lenis is never constructed, timeline pinned
      at 1
- [x] No WebGL → falls back to the SVG mark, silently. The capability test is
      the entry chunk (1.3 KB); the renderer is a dynamic import behind it, so
      a client that cannot render never downloads one.
- [x] Real `<h1>` and meta description in the DOM for crawlers and screen
      readers, visually hidden
- [x] Lenis does not trap keyboard scrolling; Home/End/PageUp/PageDown work

**Craft**

- [x] Nothing moves linearly. No `ease: none` on anything the eye tracks.
- [x] No dead zone — no stretch of scroll where nothing perceptibly changes.
      Beats overlap by design (nodes fire while the last lines are still
      arriving; the lattice tail runs into the coalescence), and the camera
      moves continuously underneath all of it.
- [x] Total scroll length justified by content — 620vh, down from the current
      site's 800vh
- [x] The red is used once, with intent — the four nodes and the lattice they
      draw, nothing else
- [x] Screenshot at 6 evenly spaced scroll depths — each frame should stand
      alone as a composition

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

Shipped. It is the site, and it passes every gate in §5.

```
index.html              generated — the entire site, one self-contained file
CNAME                   the custom domain
.nojekyll               Pages serves the files as they are
src/
  page.html             the page shell: void ground, canvas, cue, no-WebGL still
                        (not index.html, so /src/ resolves to nothing on Pages)
  main.js               WebGL capability test; the fallback mark; nothing else
  scene.js              boot(): passes, six-beat timeline, scroll rig, frame loop
  geometry.json         resolved artwork — transforms baked out of the source SVG
  lib/artwork.js        geometry.json -> lines, nodes, lattice buffers, mark polygons
  shaders/              fullscreen.vert artwork.vert dust.vert
                        field.frag mark.frag lattice.frag dust.frag
                        bright.frag blur.frag composite.frag
  vite.config.js        glsl imports; folds the chunk in and emits ../index.html
  .nvmrc                22
```

**Run it**

```sh
cd src
nvm use            # 22 — Vite 7 will not start on 20.11.1
npm install
npm run dev        # http://localhost:5180, hot reload
npm run build      # rewrites the root index.html
```

Preview what Pages actually serves with `python3 -m http.server 8000` from the
repository root. `?hud` on either URL prints fps, worst frame, timeline progress
and buffer size.

**What the frame is made of**, per render:

| Pass | Target | Cost |
|---|---|---|
| mark | full res | one fullscreen quad, 12-segment exact polygon SDF → coverage + distance in/out |
| field | full res | 12 analytic line SDFs, 4 nodes, the seed, ground mix, the coalescence |
| dust | full res | 700 additive point sprites |
| lattice | full res | 4 574 GPU line vertices carrying `(element, arcLength)` |
| bright | ¼ res | threshold above the ground's own luminance |
| blur ×2 | ¼ res | separable 9-tap |
| composite | screen | bloom + velocity-scaled chromatic aberration + grain + vignette |

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
