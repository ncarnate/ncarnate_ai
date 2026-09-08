precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc;    // the coarser level, blurred
uniform sampler2D tAdd;    // this level, from the down chain
uniform vec2  uTexel;      // one texel of tSrc
uniform float uRadius;

// 3x3 tent upsample of the coarser level, added to this level's own light.
// Walking back up the chain this way sums every scale at once: a tight
// core from the fine levels and a wide, soft skirt from the coarse ones.
void main() {
  vec2 o = uTexel * uRadius;
  vec3 c  = texture2D(tSrc, vUv + vec2(-o.x,  o.y)).rgb;
  c += 2.0 * texture2D(tSrc, vUv + vec2( 0.0,  o.y)).rgb;
  c +=       texture2D(tSrc, vUv + vec2( o.x,  o.y)).rgb;
  c += 2.0 * texture2D(tSrc, vUv + vec2(-o.x,  0.0)).rgb;
  c += 4.0 * texture2D(tSrc, vUv).rgb;
  c += 2.0 * texture2D(tSrc, vUv + vec2( o.x,  0.0)).rgb;
  c +=       texture2D(tSrc, vUv + vec2(-o.x, -o.y)).rgb;
  c += 2.0 * texture2D(tSrc, vUv + vec2( 0.0, -o.y)).rgb;
  c +=       texture2D(tSrc, vUv + vec2( o.x, -o.y)).rgb;
  gl_FragColor = vec4(c * (1.0 / 16.0) + texture2D(tAdd, vUv).rgb, 1.0);
}
