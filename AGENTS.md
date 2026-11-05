# Repository Guidelines

## What this repo is

`ncarnate.ai` is the public site for Ncarnate: a single page of type. It is
minimal on purpose, and its quality lives in the details: the measure, the
small caps, the hover states, dark-mode weight. **This repository is public and
Pages serves the root**, so anything committed is readable by anyone. Before
adding a file, ask whether it should be.

## Project Structure

- `index.html` — the entire site, hand-written: markup, one `<style>` block,
  no build step. Edit it directly. Its only script assembles Ashley's number
  and address from fragments: never write either out whole in the HTML, which
  is what scrapers read.
- `favicon.svg` — the N mark, square-padded, ink switching with the theme.
- `fonts/` — `source-serif-4.woff2` (subset; the regeneration command is in
  README.md) and its `OFL.txt`. Keep the licence with the font.
- `.nojekyll` — Pages serves the files as they are. Keep it.
- `CNAME` — pins the custom domain. Never touch without coordinating DNS.
- Local-only, git-ignored: `_archive/` (an older site), `_inspo/`,
  `_research/` (working notes, including a customer's words: never commit),
  and large video under `assets/`. Never `git add -A`; add files by name.

## Development

```sh
python3 -m http.server 8000   # from the repository root → http://localhost:8000
```

## Testing Guidelines

Look at the page; don't infer it from the DOM. Screenshot it in a real browser
at desktop (1440×900) and phone (390×844) widths, in both light and dark
schemes, plus the hover state of a link. Confirm the font actually loads (no
Georgia fallback), the console is clean, and no request 404s.

## Coding Style

- 2-space indent; lines under 100 characters.
- Sizes in `em`/`lh`/`rem` relative to the type, not pixels, so the page scales
  as one piece.
- Comments explain *why*: a value tuned by eye should say what it protects.

## Commit & Pull Request Guidelines

- Concise lowercase commit messages, one change set each.
- `CNAME`, `.nojekyll` and the Pages settings are production surface. Flag
  changes to them separately and verify the deployment afterwards.
