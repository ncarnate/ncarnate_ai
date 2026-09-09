import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

/**
 * ncarnate.ai is one file. Vite emits an HTML document plus a JS chunk; fold
 * the chunk into the document and drop it, so the built site is a single
 * self-contained index.html with no second request and no assets directory.
 *
 * The entry is page.html rather than index.html on purpose: the build renames
 * it, and leaving no index.html inside src/ means GitHub Pages has nothing to
 * serve at /src/. The site is one page, and only one page resolves.
 */
function buildSinglePage() {
  return {
    name: 'build-single-page',
    apply: 'build',
    enforce: 'post',
    generateBundle(_opts, bundle) {
      const chunks = Object.values(bundle).filter(a => a.type === 'chunk');
      const [key, html] = Object.entries(bundle).find(([, a]) => a.fileName.endsWith('.html')) || [];
      if (!html || chunks.length === 0) return;
      if (chunks.length > 1) this.error(`expected one chunk, got ${chunks.length}`);

      const js = chunks[0].code.replace(/<\/script>/gi, '<\\/script>');
      html.source = html.source
        .replace(/\s*<script[^>]*src="[^"]*"[^>]*>\s*<\/script>/i, '')
        // A replacement callback keeps $&, $` and $' in bundled JS literal.
        .replace('</body>', () => `<script type="module">\n${js}\n</script>\n</body>`);
      delete bundle[chunks[0].fileName];

      delete bundle[key];
      html.fileName = 'index.html';
      bundle['index.html'] = html;
    },
  };
}

/** Dev only: keep the entry reachable at / even though the file is page.html. */
function serveEntryAtRoot() {
  return {
    name: 'serve-entry-at-root',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/' || req.url.startsWith('/?')) req.url = '/page.html' + req.url.slice(1);
        next();
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [glsl({ compress: false }), serveEntryAtRoot(), buildSinglePage()],
  server: { port: 5181, strictPort: true },
  // Built straight into the repository root, which is what GitHub Pages serves.
  build: {
    outDir: '..', emptyOutDir: false, target: 'es2020',
    rollupOptions: { input: 'page.html' },
  },
});
