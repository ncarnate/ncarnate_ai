precision highp float;

uniform vec2  uResolution;
uniform float uScale;      // screen px per artwork unit
uniform vec2  uCenter;
uniform vec2  uParallax;
uniform float uRot;

// closed edge list of the two mark polygons: xy = a, zw = b, artwork units
uniform vec4  uSeg[MARK_SEGMENTS];
uniform float uDistScale;  // artwork units that map to 1.0 outside the mark
uniform float uCoreScale;  // and inside it, where a finer scale buys a rim

// Exact signed distance to the union of the polygons (after iq). The two
// shapes are disjoint, so one global crossing parity gives the correct sign
// for both without tracking them separately.
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / uScale;
  p.y = -p.y;
  float cs = cos(uRot), sn = sin(uRot);
  p = vec2(p.x * cs - p.y * sn, p.x * sn + p.y * cs) + uCenter + uParallax;

  float d2 = 1.0e12;
  float s  = 1.0;
  for (int i = 0; i < MARK_SEGMENTS; i++) {
    vec2 a = uSeg[i].xy;
    vec2 b = uSeg[i].zw;
    vec2 e = b - a;
    vec2 w = p - a;
    vec2 r = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    d2 = min(d2, dot(r, r));
    bvec3 c = bvec3(p.y >= a.y, p.y < b.y, e.x * w.y > e.y * w.x);
    if (all(c) || all(not(c))) s = -s;
  }
  float sd = s * sqrt(d2);          // negative inside, artwork units

  // one device pixel, expressed in artwork units -> analytic coverage
  float px = 1.0 / uScale;
  float cov = clamp(0.5 - sd / px, 0.0, 1.0);

  // r = coverage, g = distance outside, b = depth inside (a tight rim needs
  // more resolution near the edge than the outer falloff does)
  gl_FragColor = vec4(cov,
                      clamp( sd / uDistScale, 0.0, 1.0),
                      clamp(-sd / uCoreScale, 0.0, 1.0),
                      1.0);
}
