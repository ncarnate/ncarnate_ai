precision highp float;

varying vec2  vMeta;
varying float vAcross;

uniform float uProgress[50];   // per-element reveal, 0..1
uniform float uFade;           // global scaffolding fade
uniform float uGround;         // 0 = void, 1 = paper
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
  float head = smoothstep(prog, prog - 0.30, vMeta.y);
  if (head <= 0.001) discard;
  // brighten right at the growing tip
  float tip = exp(-abs(vMeta.y - prog) * 14.0);
  // hot core at the tip cooling to the artwork red behind it
  vec3 col = mix(RED, mix(vec3(1.0), RED * 1.5, uGround), clamp(tip, 0.0, 1.0));
  // analytic coverage across the stroke: one pixel of feather either side
  float cov = 1.0 - smoothstep(uWidth * 0.5 - 0.5, uWidth * 0.5 + 0.5, abs(vAcross));
  gl_FragColor = vec4(col, cov * head * uFade * (0.62 + tip * 0.8));
}
