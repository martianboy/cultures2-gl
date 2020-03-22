#version 300 es

precision mediump float;
precision mediump sampler2DArray;

// Passed in from the vertex shader.
in vec2 v_texcoord;
flat in float v_texture;
in float layer;
in float brightness;

// The texture.
uniform sampler2DArray[1] u_textures;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  vec4 texel = vec4(0.0, 0.0, 0.0, 0.0);
  if (v_texture == 0.0) texel = texture(u_textures[0], vec3(v_texcoord, layer));
  // if (v_texture == 1) texel = texture(u_textures[1], vec3(v_texcoord, layer));

  outColor = vec4(texel.rgb * brightness, texel.a);
}
