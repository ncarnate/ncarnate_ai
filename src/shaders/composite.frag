precision highp float;
varying vec2 vUv;

uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform vec2  uResolution;
uniform float uTime;
uniform float uVel;        // 0..1, drives chromatic aberration
uniform float uBloom;
uniform float uGround;

void main() {
  vec2 uv = vUv;
  vec2 fromCentre = uv - 0.5;

  // Chromatic aberration scaled by scroll velocity — invisible at rest, and
  // never more than a pixel or two even at speed.
  float ca = (0.0006 + uVel * 0.0042) * (0.35 + dot(fromCentre, fromCentre) * 2.4);
  vec3 col;
  col.r = texture2D(tScene, uv + fromCentre * ca).r;
  col.g = texture2D(tScene, uv).g;
  col.b = texture2D(tScene, uv - fromCentre * ca).b;

  // Bloom belongs to the void phase: light drawing itself in the dark. Once the
  // ground has lifted to paper there is nothing luminous left to bloom.
  col += texture2D(tBloom, uv).rgb * uBloom * (1.0 - uGround * 0.94);

  // vignette — deep in the void, almost nothing once the ground has lifted
  float vig = 1.0 - dot(fromCentre, fromCentre) * mix(0.85, 0.16, uGround);
  col *= vig;

  // fine grain, slightly stronger in the dark where banding would show
  float g = fract(sin(dot(uv * uResolution + uTime * 60.0, vec2(12.9898, 78.233))) * 43758.5453);
  col += (g - 0.5) * mix(0.030, 0.011, uGround);

  gl_FragColor = vec4(col, 1.0);
}
