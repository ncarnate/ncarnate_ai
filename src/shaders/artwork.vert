attribute vec2 position;   // artwork units
attribute vec2 meta;       // x = element index, y = normalised position along element

uniform vec2  uResolution;
uniform float uScale;
uniform vec2  uCenter;
uniform vec2  uParallax;
uniform float uRot;

varying vec2 vMeta;
varying vec2 vArt;

void main() {
  vMeta = meta;
  vArt  = position;
  vec2 rel = position - uCenter - uParallax;
  float cs = cos(uRot), sn = sin(uRot);
  rel = vec2(rel.x * cs + rel.y * sn, -rel.x * sn + rel.y * cs);   // inverse of the view rotation
  vec2 clip = vec2(rel.x, -rel.y) * uScale / (0.5 * uResolution);
  gl_Position = vec4(clip, 0.0, 1.0);
}
