attribute vec2 pa;         // segment start, artwork units
attribute vec2 pb;         // segment end
attribute vec2 meta;       // x = element index, y = normalised position along element
attribute vec2 corner;     // x = which end (0|1), y = which side (-1|1)
attribute vec2 join;       // shared miter, in artwork orientation

uniform vec2  uResolution;
uniform float uScale;
uniform vec2  uCenter;
uniform vec2  uParallax;
uniform float uRot;
uniform float uWidth;      // stroke width, device px

varying vec2  vMeta;
varying float vAcross;     // device px from the centreline
varying float vFootprint;  // pixel support along the stroke normal

// artwork -> device px, with the inverse of the view rotation
vec2 toScreen(vec2 position) {
  vec2 rel = position - uCenter - uParallax;
  float cs = cos(uRot), sn = sin(uRot);
  rel = vec2(rel.x * cs + rel.y * sn, -rel.x * sn + rel.y * cs);
  return vec2(rel.x, -rel.y) * uScale;
}

void main() {
  vec2 a = toScreen(pa), b = toScreen(pb);
  vec2 ab = b - a;
  float len = length(ab);
  vec2 dir = len > 1.0e-5 ? ab / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  // The pixel footprint covers diagonals without a hard one-pixel width floor.
  vFootprint = abs(nrm.x) + abs(nrm.y);
  // A fixed outer feather gives both sides of each join identical vertices.
  float h = uWidth * 0.5 + 0.75;
  float cs = cos(uRot), sn = sin(uRot);
  vec2 miter = vec2(join.x * cs - join.y * sn, -join.x * sn - join.y * cs);
  vec2 pos = mix(a, b, corner.x) + miter * corner.y * h;
  vAcross = corner.y * h;
  vMeta = meta;
  gl_Position = vec4(pos / (0.5 * uResolution), 0.0, 1.0);
}
