# ncarnate.ai

The public site for Ncarnate, served from GitHub Pages (`CNAME` pins
`ncarnate.ai`). One hand-written HTML file, one typeface, no JavaScript and no
build step.

- `index.html` — the whole page: markup and styles, edited directly.
- `favicon.svg` — the mark; its ink follows the browser's light or dark theme.
- `fonts/source-serif-4.woff2` — Source Serif 4 (SIL OFL, licence beside it),
  cut down for this page; see below.
- `CNAME`, `.nojekyll` — Pages configuration. Production surface.

Preview exactly what Pages serves:

```sh
python3 -m http.server 8000   # from the repository root → http://localhost:8000
```

## Typography

Source Serif 4 was chosen over the other open serifs because it has true small
caps (`smcp`, `c2sc`) and old-style figures (`onum`). The page sets acronyms
(AI, CRM, API, am) in small caps through `<abbr>`, and uses old-style figures in
running text.

Both variable axes together came to 145 kB, so the shipped file keeps only the
weight axis (340–600) and pins optical size at 36, the display drawing, which
still holds up at phone sizes: 62 kB. Weight stays live because dark mode
takes 40 units back: light type on a dark ground reads heavier than dark type
on paper.

To regenerate it from the upstream variable font
(`google/fonts` → `ofl/sourceserif4/SourceSerif4[opsz,wght].ttf`):

```sh
fonttools varLib.instancer 'SourceSerif4[opsz,wght].ttf' wght=340:600 opsz=36 -o inst.ttf
pyftsubset inst.ttf \
  --unicodes='U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2009,U+200A,U+2013-2014,U+2018-201E,U+2022,U+2026,U+202F,U+2032-2033,U+2039-203A,U+2122,U+2190-2193,U+2197-2198' \
  --layout-features='kern,liga,ccmp,locl,mark,mkmk,onum,lnum,pnum,tnum,smcp,c2sc,case' \
  --flavor=woff2 --output-file=fonts/source-serif-4.woff2
```

## History

The previous page, a scroll-driven WebGL emergence of the N mark built with
Vite, lives in git history up to `d8fbb40`.
