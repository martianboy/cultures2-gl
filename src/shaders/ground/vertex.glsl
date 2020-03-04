#version 300 es

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec4 a_position;
in vec2 a_texcoord;

// A matrix to transform the positions by
uniform mat4 u_matrix;

// a varying to pass the texture coordinates to the fragment shader
out vec3 v_texcoord;
out float layer;

// all shaders have a main function
void main() {
  // Multiply the position by the matrix.
  gl_Position = u_matrix * a_position;

  // Pass the texcoord to the fragment shader.
  v_texcoord = a_texcoord.xy;
  layer = a_texcoord.z;
}
