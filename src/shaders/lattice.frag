precision highp float;

varying vec2  vMeta;
varying float vAcross;
varying float vFootprint;

uniform float uProgress[50];   // per-element reveal, 0..1
uniform float uFade;           // global scaffolding fade
uniform float uWidth;          // stroke width, device px

const vec3 RED = vec3(0.761, 0.039, 0.161);

void main() {
  int idx = int(vMeta.x + 0.5);
  float prog = 0.0;
  // GLSL ES 1.0 forbids dynamic indexing of a uniform array in the fragment
  // stage on some drivers, so resolve it with a constant-bounded loop.
  for (int i = 0; i < 50; i++) {
    if (i == idx) { prog = uProgress[i]; break; }
  }
  float head = 1.0 - smoothstep(prog - 0.30, prog, vMeta.y);
  if (head <= 0.001) discard;
  // A small red glint travels with the reveal. It expires at completion instead
  // of leaving white-hot endpoints that make the scaffold compete with the N.
  float active = smoothstep(0.0, 0.08, prog) * (1.0 - smoothstep(0.88, 1.0, prog));
  float tip = exp(-abs(vMeta.y - prog) * 14.0) * active;
  vec3 col = RED * (0.90 + 0.10 * tip);

  // Integrate a thin strip over the pixel footprint. Subpixel width reduces
  // coverage, not continuity; this avoids thickening 1x displays to a full pixel.
  float halfWidth = uWidth * 0.5;
  float footprint = max(vFootprint, 1.0);
  float lo = max(-halfWidth, vAcross - footprint * 0.5);
  float hi = min(halfWidth, vAcross + footprint * 0.5);
  float cov = clamp((hi - lo) / footprint, 0.0, 1.0);
  gl_FragColor = vec4(col, cov * head * uFade * (0.50 + tip * 0.12));
}
