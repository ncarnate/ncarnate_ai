import geometry from '../geometry.json';

// Artwork is authored in an SVG viewBox of 0 0 1296 864.
export const VIEWBOX = geometry.viewBox;           // [0, 0, 1296, 864]
export const ART_CENTRE = [648, 432];

// The two 6-fold stars, recovered from the line data rather than hard-coded.
export const STAR_CENTRES = {
  star1_lines: [576, 360],
  star2_lines: [720, 504],
};

/**
 * Each construction line is conceptually infinite. Re-anchor it at its own
 * star centre so the reveal grows symmetrically out of the star, and carry a
 * half-extent large enough to leave the frame on any viewport.
 */
export function buildLines() {
  return geometry.lines.map((l, i) => {
    const anchor = STAR_CENTRES[l.group];
    let [dx, dy] = l.dir;
    // canonical direction: rightwards, and upwards for the vertical
    if (dx < -1e-6 || (Math.abs(dx) < 1e-6 && dy < 0)) { dx = -dx; dy = -dy; }
    return {
      index: i,
      group: l.group === 'star1_lines' ? 0 : 1,
      angle: l.angleDeg,
      anchor,
      dir: [dx, dy],
    };
  });
}

export function buildNodes() {
  return geometry.circles.map((c) => ({ centre: c.c, radius: c.r }));
}

/**
 * The 50 lattice shapes as GPU line geometry. Each sampled point carries the
 * element index and its normalised position along that element, so the reveal
 * can propagate per-shape without any per-pixel cost.
 */
export function buildLattice() {
  const position = [];
  const meta = []; // (elementIndex, alongNormalised)
  geometry.lattice.forEach((el, ei) => {
    const pts = el.pts;
    // cumulative arc length for an even reveal regardless of sampling density
    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const total = cum[cum.length - 1] || 1;
    for (let i = 0; i < pts.length - 1; i++) {
      position.push(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      meta.push(ei, cum[i] / total, ei, cum[i + 1] / total);
    }
  });
  return {
    position: new Float32Array(position),
    meta: new Float32Array(meta),
    count: position.length / 2,
    elements: geometry.lattice.length,
  };
}

/**
 * The N itself. Both shapes are simple, disjoint polygons, so the renderer
 * takes them as edge lists and evaluates an exact signed distance field rather
 * than triangulating: analytic antialiasing at any resolution, and a real
 * distance to work with when the light coalesces into the mark.
 */
export function buildMarkRings() {
  return geometry.mark.map(shape => dedupe(shape.pts));
}

export function buildMarkSegments() {
  const data = [];
  for (const ring of buildMarkRings()) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      data.push(a[0], a[1], b[0], b[1]);
    }
  }
  return { data, count: data.length / 4 };
}

function dedupe(pts) {
  // The mark reaches us finely sampled off an SVG path, so its corners arrive
  // as pairs of points straddling the true vertex — which bevels them and
  // leaves slivers in the triangulation. Recover the real polygon in two
  // steps: Douglas-Peucker to find how many edges there are, then fit a line
  // through each edge's interior samples and intersect neighbours to place
  // every corner exactly.
  let ring = [];
  for (const q of pts) {
    const last = ring[ring.length - 1];
    if (!last || Math.hypot(q[0] - last[0], q[1] - last[1]) > 1e-4) ring.push(q);
  }
  if (ring.length > 1) {
    const a = ring[0], b = ring[ring.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-4) ring.pop();
  }
  if (ring.length < 4) return ring;

  const idx = simplifyIndices(ring, 2.5);
  if (idx.length < 3) return ring;
  return refineCorners(ring, idx);
}

/** Douglas-Peucker over a closed ring, returning indices into it. */
function simplifyIndices(ring, tol) {
  let far = 0, best = -1;
  for (let i = 1; i < ring.length; i++) {
    const d = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]);
    if (d > best) { best = d; far = i; }
  }
  const a = dp(ring, 0, far, tol);
  const b = dp(ring, far, ring.length, tol);   // wraps back to index 0
  return [...new Set([0, ...a, far, ...b])].sort((x, y) => x - y);
}

function dp(ring, lo, hi, tol) {
  const n = ring.length;
  const A = ring[lo % n], B = ring[hi % n];
  if (hi - lo < 2) return [];
  const dx = B[0] - A[0], dy = B[1] - A[1];
  const len = Math.hypot(dx, dy);
  let worst = -1, at = -1;
  for (let i = lo + 1; i < hi; i++) {
    const q = ring[i % n];
    const d = len < 1e-9
      ? Math.hypot(q[0] - A[0], q[1] - A[1])
      : Math.abs((q[0] - A[0]) * dy - (q[1] - A[1]) * dx) / len;
    if (d > worst) { worst = d; at = i; }
  }
  if (worst <= tol || at < 0) return [];
  return [...dp(ring, lo, at, tol), at % n, ...dp(ring, at, hi, tol)];
}

/** Total-least-squares line through points; handles vertical edges. */
function fitLine(pts) {
  const n = pts.length;
  let mx = 0, my = 0;
  for (const q of pts) { mx += q[0]; my += q[1]; }
  mx /= n; my /= n;
  let sxx = 0, syy = 0, sxy = 0;
  for (const q of pts) {
    const dx = q[0] - mx, dy = q[1] - my;
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
  }
  // principal axis = eigenvector of the covariance matrix
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { p: [mx, my], d: [Math.cos(theta), Math.sin(theta)] };
}

function intersect(l1, l2) {
  const den = l1.d[0] * l2.d[1] - l1.d[1] * l2.d[0];
  if (Math.abs(den) < 1e-6) return null;             // parallel
  const rx = l2.p[0] - l1.p[0], ry = l2.p[1] - l1.p[1];
  const t = (rx * l2.d[1] - ry * l2.d[0]) / den;
  return [l1.p[0] + l1.d[0] * t, l1.p[1] + l1.d[1] * t];
}

function refineCorners(ring, idx) {
  const n = ring.length, m = idx.length;
  const MARGIN = 2;   // drop samples adjacent to a corner; they are the bevel
  const edges = idx.map((from, i) => {
    const to = idx[(i + 1) % m];
    const span = [];
    for (let k = from; ; k++) {
      const j = k % n;
      span.push(ring[j]);
      if (j === to) break;
      if (span.length > n) break;
    }
    const inner = span.length > 2 * MARGIN + 2 ? span.slice(MARGIN, -MARGIN) : span;
    return inner.length >= 2 ? fitLine(inner) : null;
  });

  return idx.map((vi, i) => {
    const prev = edges[(i - 1 + m) % m], next = edges[i];
    if (!prev || !next) return ring[vi];
    const x = intersect(prev, next);
    // only accept a refinement that stays near the vertex it replaces
    if (!x || Math.hypot(x[0] - ring[vi][0], x[1] - ring[vi][1]) > 12) return ring[vi];
    return [+x[0].toFixed(3), +x[1].toFixed(3)];
  });
}
