precision highp float;
varying vec2 vUv;
uniform sampler2D tScene;
uniform vec2  uTexel;      // one texel of tScene
uniform float uBase;       // luminance of the current ground, so the paper
                           // itself is never treated as something that glows
uniform float uThreshold;
uniform float uKnee;

vec3 fetch(vec2 uv) { return max(texture2D(tScene, uv).rgb - uBase, 0.0); }

// First bloom level, at half resolution. Four bilinear taps on the texel
// corners make a 4x4 box, which is what keeps a single hot pixel from
// flickering as a firefly. The threshold has a soft knee (Unity/Frostbite
// style) so the glow fades in continuously instead of being cut out at a
// hard luminance — a hard cut is a ring by definition.
void main() {
  vec3 c = fetch(vUv + uTexel * vec2(-1.0, -1.0)) + fetch(vUv + uTexel * vec2(1.0, -1.0))
         + fetch(vUv + uTexel * vec2(-1.0,  1.0)) + fetch(vUv + uTexel * vec2(1.0,  1.0));
  c *= 0.25;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float soft = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 1.0e-4);
  float w = max(soft, l - uThreshold) / max(l, 1.0e-4);
  gl_FragColor = vec4(c * w, 1.0);
}
