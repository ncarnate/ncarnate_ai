precision highp float;

varying vec2 vUv;

uniform vec2  uResolution;
uniform float uTime;
uniform float uDpr;

// artwork mapping
uniform float uScale;      // screen px per artwork unit
uniform vec2  uCenter;     // artwork-space point pinned to screen centre
uniform vec2  uParallax;   // cursor offset, artwork units
uniform float uRot;        // camera rotation, radians

// 12 construction lines: xy = anchor (star centre), zw = unit direction
uniform vec4  uLines[12];
// per line: x = reveal centre along the line, y = half extent, z = progress 0..1, w = group (0|1)
uniform vec4  uLineMeta[12];

// 4 nodes: xy = centre, z = radius, w = progress 0..1
uniform vec4  uNodes[4];

// staging
uniform float uGround;     // 0 = void black, 1 = brand grey
uniform float uInkFade;    // scaffolding opacity (lines + nodes)
uniform float uVel;        // |scroll velocity|, normalised

uniform sampler2D tMask;   // r = coverage, g = distance outside, b = depth inside
uniform float uMarkReveal; // 0..1 — light concentrates into the mark
uniform float uMarkSolid;  // 0..1 — the mark settles to solid ink
uniform float uSeed;       // 0..1 — beat 1's single point of light

const vec3 INK   = vec3(0.137, 0.122, 0.125);   // #231f20
const vec3 RED   = vec3(0.761, 0.039, 0.161);   // #c20a29, the brand ink
const vec3 RED_HOT = vec3(0.930, 0.052, 0.038); // the ignition core, off magenta
const vec3 PAPER = vec3(0.902, 0.902, 0.902);   // #e6e6e6
const vec3 VOID  = vec3(0.039, 0.039, 0.043);

// distance from p to an infinite line (anchor a, unit dir d)
float lineDist(vec2 p, vec2 a, vec2 d) {
  vec2 r = p - a;
  return abs(r.x * d.y - r.y * d.x);
}
// signed position along that line
float lineAlong(vec2 p, vec2 a, vec2 d) {
  return dot(p - a, d);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  // the mark's signed distance field: coverage is already analytically
  // antialiased, so one fetch is enough
  vec3 md = texture2D(tMask, frag / uResolution).rgb;
  float mask = md.r;
  float halo = exp(-md.g * 7.0);   // 1 at the mark's edge, falling off outside
  // screen px -> artwork units (SVG y is down, GL y is up)
  vec2 p = (frag - 0.5 * uResolution) / uScale;
  p.y = -p.y;
  float cs = cos(uRot), sn = sin(uRot);
  p = vec2(p.x * cs - p.y * sn, p.x * sn + p.y * cs) + uCenter + uParallax;

  // --- ground -------------------------------------------------------------
  vec3 col = mix(VOID, PAPER, uGround);
  // a breath of vignette-scale luminance so the void is never dead flat
  vec2 q = (frag - 0.5 * uResolution) / max(uResolution.x, uResolution.y);
  col += (1.0 - uGround) * 0.020 * exp(-3.5 * dot(q, q));

  // ink polarity: dark ground -> light strokes, light ground -> dark strokes
  vec3 strokeCol = mix(vec3(0.82, 0.84, 0.88), INK, uGround);

  // --- the seed -----------------------------------------------------------
  // Before anything is drawn, the first intersection is already there. The
  // lines will arrive out of this point; it is not a decoration.
  if (uSeed > 0.001) {
    float ds = length(p - uLines[0].xy);
    float pulse = 0.78 + 0.22 * sin(uTime * 1.35);
    col += vec3(0.66, 0.70, 0.82) * uSeed * pulse *
           ((1.0 - smoothstep(0.0, 2.6, ds)) * 0.55 + exp(-ds * 0.055) * 0.085);
  }

  // --- 12 construction lines ---------------------------------------------
  // Scroll speed smears the rays along themselves: the halo reaches further
  // and the growing tip trails. Nothing else in the frame reacts to velocity
  // except the chromatic aberration in the composite.
  float smear = 1.0 - uVel * 0.48;
  float lineAcc = 0.0;
  float headAcc = 0.0;
  for (int i = 0; i < 12; i++) {
    vec4 L = uLines[i];
    vec4 M = uLineMeta[i];
    float prog = M.z;
    if (prog <= 0.0) continue;

    float d     = lineDist(p, L.xy, L.zw);
    float along = lineAlong(p, L.xy, L.zw);

    // grows outward from M.x in both directions
    float reach = M.y * prog;
    float fromCentre = abs(along - M.x);
    float within = 1.0 - smoothstep(reach - 26.0, reach + 2.0, fromCentre);

    // crisp core + soft halo, both in artwork units
    float core = 1.0 - smoothstep(0.0, 1.5 + 0.8 / uScale, d);
    float glow = exp(-d * 0.085 * smear);

    lineAcc += within * (core + glow * 0.22);
    // bright head at the growing tip — reads as light drawing itself
    float head = exp(-abs(fromCentre - reach) * 0.09 * smear) * step(0.001, prog) * (1.0 - step(0.999, prog));
    headAcc += head * (core + glow * 0.5);
  }
  // Coalescence: rather than fading a shape in, bias the whole light field so
  // it concentrates inside the mark and drains outside it. The N becomes
  // legible out of geometry that was already there.
  // outside the mark the field drains, but not to nothing: it pools against
  // the silhouette first, so the N is felt as a shape before it is one.
  float outside = 0.10 + 0.62 * halo;
  float sel = mix(1.0, mix(outside, 1.85, mask), uMarkReveal);
  lineAcc = min(lineAcc * sel, 2.2) * uInkFade;
  headAcc = min(headAcc, 1.6) * uInkFade;

  col = mix(col, strokeCol, clamp(lineAcc * 0.5, 0.0, 1.0));
  col += strokeCol * headAcc * 0.30;

  // --- 4 nodes ------------------------------------------------------------
  float discAcc = 0.0;
  float glowAcc = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 N = uNodes[i];
    float prog = N.w;
    if (prog <= 0.0) continue;
    float d = length(p - N.xy);
    // elastic-ish pop handled on the JS side; here prog is the eased scale
    float r = N.z * prog;
    discAcc += 1.0 - smoothstep(r - 1.2, r + 1.2, d);
    glowAcc += exp(-max(d - r, 0.0) * 0.055) * prog;
  }
  discAcc = clamp(discAcc, 0.0, 1.0) * uInkFade;
  glowAcc = clamp(glowAcc, 0.0, 2.2) * uInkFade;

  // Every node sits on a line crossing, which is exactly where the white
  // construction light is brightest — mixing red into white is what made
  // these read pink. Inside the disc the crossing is not deleted, it is
  // tinted: it keeps its energy and burns red.
  float crossing = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, RED_HOT * crossing * 1.10, discAcc);
  col += RED_HOT * discAcc * 0.95;
  col += RED * glowAcc * 0.50;

  // The silhouette holds light of its own before it is ink — otherwise the N
  // only ever reads where construction lines happened to cross it — and its
  // edge catches a rim off the distance field.
  float body = mask * uMarkReveal * (1.0 - uGround) * (1.0 - uMarkSolid * 0.35);
  col += vec3(0.42, 0.45, 0.55) * body;
  float rim = mask * exp(-md.b * 8.5) * uMarkReveal * (1.0 - uMarkSolid * 0.8);
  col += vec3(0.80, 0.84, 0.94) * rim * 0.42;

  // the mark settles: light on the void, ink once the ground has lifted
  vec3 markCol = mix(vec3(0.93, 0.94, 0.96), INK, uGround);
  col = mix(col, markCol, clamp(mask * uMarkSolid, 0.0, 1.0));

  gl_FragColor = vec4(col, 1.0);
}
