precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uTexel;       // one texel of tSrc, the finer level

// Dual-filter downsample (Bjørge, SIGGRAPH 2015). Five bilinear taps at the
// half-resolution step cover a wide footprint for almost nothing; repeated
// down a mip chain the result converges on a Gaussian with no visible kernel
// edge, which is precisely what a 9-tap blur at one scale cannot do.
void main() {
  vec2 h = uTexel;
  vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
  c += texture2D(tSrc, vUv + vec2(-h.x, -h.y)).rgb;
  c += texture2D(tSrc, vUv + vec2( h.x, -h.y)).rgb;
  c += texture2D(tSrc, vUv + vec2(-h.x,  h.y)).rgb;
  c += texture2D(tSrc, vUv + vec2( h.x,  h.y)).rgb;
  gl_FragColor = vec4(c * 0.125, 1.0);
}
