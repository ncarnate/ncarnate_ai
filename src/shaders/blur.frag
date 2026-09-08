precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uDir;        // texel-sized step, one axis at a time
// 9-tap gaussian, linear-sampling weights
const float w0 = 0.2270270270;
const float w1 = 0.3162162162;
const float w2 = 0.0702702703;
const float o1 = 1.3846153846;
const float o2 = 3.2307692308;
void main() {
  vec3 c = texture2D(tSrc, vUv).rgb * w0;
  c += texture2D(tSrc, vUv + uDir * o1).rgb * w1;
  c += texture2D(tSrc, vUv - uDir * o1).rgb * w1;
  c += texture2D(tSrc, vUv + uDir * o2).rgb * w2;
  c += texture2D(tSrc, vUv - uDir * o2).rgb * w2;
  gl_FragColor = vec4(c, 1.0);
}
