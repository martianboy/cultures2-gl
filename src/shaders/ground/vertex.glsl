#version 300 es

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec2 a_position;
in vec2 a_texcoord;
in vec2 a_transcoord1;
in vec2 a_transcoord2;
in float a_layer;
in float a_trans_layer1;
in float a_trans_layer2;
in float a_brightness;

// A matrix to transform the positions by
uniform mat4 u_matrix;

// a varying to pass the texture coordinates to the fragment shader
out vec2 v_texcoord;
out vec2 v_transcoord1;
out vec2 v_transcoord2;
out float layer;
out float trans_layer1;
out float trans_layer2;
out float brightness;

// all shaders have a main function
void main() {
  // Multiply the position by the matrix.
  gl_Position = u_matrix * vec4(a_position.xy, 1, 1);

  // Pass the texcoord to the fragment shader.
  v_texcoord = a_texcoord;
  v_transcoord1 = a_transcoord1;
  v_transcoord2 = a_transcoord2;
  layer = a_layer;
  trans_layer1 = a_trans_layer1;
  trans_layer2 = a_trans_layer2;
  brightness = a_brightness;
}
