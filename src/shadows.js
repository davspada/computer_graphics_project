export const depthVertex = `
attribute vec4 a_position;

uniform mat4 u_world;
uniform mat4 u_lightWorld;

void main() {
  gl_Position = u_lightWorld * u_world * a_position;
}
`;

export const depthFragment = `
precision mediump float;

void main() {
  // gl_FragCoord.z is the depth value
}
`