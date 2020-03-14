#version 300 es

precision mediump int;
precision mediump float;
precision mediump sampler2DArray;

// Passed in from the vertex shader.
in vec2 v_texcoord;
in int i_texture;
in float layer;
in float brightness;

// The texture.
uniform sampler2DArray[] u_textures;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  outColor = texture(u_textures[i_texture], vec3(v_texcoord, layer));

  outColor = vec4(tColor * brightness, 1.0);
}
