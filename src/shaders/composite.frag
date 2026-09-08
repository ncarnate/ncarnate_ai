precision highp float;
varying vec2 vUv;

uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform vec2  uResolution;
uniform float uTime;
uniform float uFrame;      // frame counter, decorrelates the dither over time
uniform float uVel;        // 0..1, drives chromatic aberration
uniform float uBloom;
uniform float uGround;

// Interleaved gradient noise (Jimenez, 2014): a low-discrepancy pattern with
// almost no low-frequency energy, so it reads as texture rather than speckle.
float ign(vec2 px) {
  return fract(52.9829189 * fract(0.06711056 * px.x + 0.00583715 * px.y));
}
// White noise for the grain — a real hash, not fract(sin()), which breaks up
// into stripes on some GPUs once its argument gets large.
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
// Uniform -> triangular. Triangular-PDF dither at one LSB is the correct
// amount: it fully decorrelates the quantisation error (Gjøl & Svendsen,
// "Low Complexity, High Fidelity: INSIDE Rendering", GDC 2016) where uniform
// noise at the same amplitude still leaves the steps faintly visible.
float tri(float u) {
  float v = u * 2.0 - 1.0;
  return sign(v) * (1.0 - sqrt(1.0 - abs(v)));
}

void main() {
  vec2 uv = vUv;
  vec2 fromCentre = uv - 0.5;
  vec2 px = gl_FragCoord.xy;

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

  // The scene is accumulated in the open, so light can stack past 1.0 where
  // lines cross inside the mark. Below the knee nothing changes; above it the
  // highlights roll off into a shoulder instead of clipping to a flat white
  // that would swallow every edge and crossing inside it.
  const float KNEE = 0.78;
  vec3 over = max(col - KNEE, 0.0);
  over /= (1.0 - KNEE);
  col = min(col, KNEE) + (1.0 - KNEE) * (over / (1.0 + over));

  // Fine grain, the one texture the void has. It is a look, not a fix: the
  // banding is handled by the dither below and by the float buffers upstream.
  float fr = mod(uFrame, 64.0);
  float g = hash12(px + fr * vec2(17.0, 59.0));
  col += (g - 0.5) * mix(0.020, 0.008, uGround);

  // This is the only 8-bit quantisation left in the pipeline, so this is where
  // the dither goes: one LSB, triangular, refreshed every frame.
  float d = tri(ign(px + fr * vec2(5.588238, 5.588238)));
  col += d * (1.0 / 255.0);

  gl_FragColor = vec4(col, 1.0);
}
