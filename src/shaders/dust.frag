precision highp float;

varying float vBright;
uniform float uFade;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = 1.0 - smoothstep(0.10, 0.5, d);
  gl_FragColor = vec4(vec3(0.72, 0.76, 0.86) * a * vBright * uFade, 1.0);
}
