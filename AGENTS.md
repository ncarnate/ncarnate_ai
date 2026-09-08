# Repository Guidelines

## What this repo is

`ncarnate.ai` is a single page: the pre-launch holding page for the Ncarnate
platform, whose entire content is the scroll-driven emergence of the Ncarnate
"N" mark in WebGL. **Nothing else on the domain is reachable, and that is
deliberate.** Before adding anything to the repository, ask whether it
should be readable by the public: this repository is public and Pages serves the
root, so anything committed is visible one way or another.

## Project Structure & Module Organization

- `index.html` — **generated, and the entire site.** One self-contained file:
  Vite folds the JS chunk into the HTML, so the page makes no second request.
  Never hand-edit it; any change is lost on the next `npm run build`.
- `src/` — the source it is built from, a Vite project rooted there.
  - `page.html` — the page shell. Named `page.html`, not `index.html`, so that
    `ncarnate.ai/src/` resolves to nothing; the build renames it on the way out.
  - `main.js` — WebGL capability test and the static fallback mark. Nothing
    else; it calls `boot()` only when a context is available.
  - `scene.js` — the whole piece: render passes, the six-beat timeline, scroll
    rig, frame loop. Exports `boot()` and has no side effects on import.
  - `geometry.json` — the artwork with its transforms resolved.
  - `lib/artwork.js` — geometry.json to GPU buffers and mark polygons.
  - `shaders/` — eleven GLSL files, imported by `vite-plugin-glsl`. Every
    intermediate buffer is half-float and the only 8-bit write (the canvas)
    is dithered; keep it that way, or the dark gradients band.
- `.nojekyll` — Pages serves the files as they are, with no Jekyll step. Keep
  it; the build has no need of one.
- `CNAME` — pins the custom domain. Never touch without coordinating DNS.
- `_archive/` — the previous site, **git-ignored and local-only**. It is not in
  the repository and must not be committed; it exists so the old pages remain
  readable on this machine.

## Build, Test, and Development Commands

```sh
cd src
nvm use            # 22 — Vite 7 will not start on older Node
npm install
npm run dev        # http://localhost:5180, hot reload
npm run build      # rewrites the root index.html
```

Preview what Pages will actually serve with `python3 -m http.server 8000` from
the repository root. Append `?hud` to either URL for fps, worst frame, timeline
progress and buffer size.

## Testing Guidelines

A scroll animation cannot be verified from the DOM. Drive it with real browser
automation, screenshot several scroll depths, and *look at the images*. The
gates the piece is held to — frame budget, payload, degradation, craft — are
enumerated in README.md §5; re-run them after any change to a shader or to the
timeline, and keep the measured numbers in that section current.

Specifically confirm: the page rests at zero progress on load (blank void, no
flash of a later state); scrubbing backwards returns every state variable to its
initial value; resize mid-scroll leaves exactly one ScrollTrigger and no leaked
render targets; `prefers-reduced-motion` collapses the scroll track and pins the
final composition; and the console is clean.

## Coding Style & Naming Conventions

- 2-space indent across JS, GLSL, HTML; lines under 100 characters.
- `camelCase` in JS, `uSomething` for uniforms, `vSomething` for varyings.
- Comments explain *why* — a constant that was tuned by eye should say what it
  is protecting against, not restate its value.

## Commit & Pull Request Guidelines

- Match the concise commit style in history: lowercase, action-oriented, one
  change set.
- Rebuild before committing if you touched `src/`, so the generated
  `index.html` and the source never disagree.
- `CNAME`, `.nojekyll` and the Pages settings are production surface. Flag
  changes to them separately and verify the deployment afterwards.
