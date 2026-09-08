precision highp float;
varying vec2 vUv;
uniform sampler2D tScene;
uniform float uThreshold;
uniform float uBase;      // luminance of the current ground, so the paper
                          // itself is never treated as something that glows
void main() {
  vec3 c = max(texture2D(tScene, vUv).rgb - uBase, 0.0);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  gl_FragColor = vec4(c * smoothstep(uThreshold, uThreshold + 0.22, l), 1.0);
}
