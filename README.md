# Ncarnate.ai

Static site for Ncarnate Labs, including the public landing page (`index.html`), client deck (`/vosa-deck`), and the Eleventy-powered blog (`/blog`).

## Blog (Eleventy)

- Source lives in `blog/src/` with Markdown posts under `blog/src/posts/`.
- Install dependencies once with `cd blog && npm install`.
- Build the blog with `npm run build` (outputs to `blog/_site/`); serve locally with `npm start` (defaults to `http://localhost:8080`).
- Deploy by syncing the generated `_site/` directory to the main site under the `/blog` path.

The Eleventy setup mirrors the Ncarnate visual language—Inter typography, dark canvases, and accent-driven highlights. Each post can override the theme (light/dark) and accent color via front matter.
