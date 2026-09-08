attribute vec3 position;   // seed: x, y in 0..1, z = depth

uniform vec2  uResolution;
uniform float uTime;
uniform float uDpr;
uniform vec2  uParallax;

varying float vBright;

void main() {
  float z = 0.22 + 0.78 * position.z;              // near motes are larger and swing more
  float t = uTime * (0.0060 + 0.0165 * z);

  // a slow, wrapped rise with a little lateral wander
  vec2 q = vec2(
    fract(position.x + t * 0.30 + sin(position.y * 6.2831 + uTime * 0.06) * 0.014),
    fract(position.y + t));

  vec2 ndc = q * 2.0 - 1.0;
  ndc += vec2(-uParallax.x, uParallax.y) * 0.0022 * z;

  gl_Position = vec4(ndc, 0.0, 1.0);
  gl_PointSize = (0.9 + 2.4 * z) * uDpr;
  // depth also reads as brightness, and motes breathe out of phase
  vBright = (0.07 + 0.42 * z) * (0.55 + 0.45 * sin(uTime * 0.55 + position.x * 41.0));
}
