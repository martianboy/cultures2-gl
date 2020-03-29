#version 300 es

precision mediump float;
precision mediump sampler2DArray;

// Passed in from the vertex shader.
in vec2 v_texcoord;
flat in float v_texture;
in float layer;
in float brightness;

// The texture.
uniform sampler2DArray[13] u_textures;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  vec4 texel = vec4(0.0, 0.0, 0.0, 0.0);
  if (v_texture == 0.0) texel = texture(u_textures[0], vec3(v_texcoord, layer));
  if (v_texture == 1.0) texel = texture(u_textures[1], vec3(v_texcoord, layer));
  if (v_texture == 2.0) texel = texture(u_textures[2], vec3(v_texcoord, layer));
  if (v_texture == 3.0) texel = texture(u_textures[3], vec3(v_texcoord, layer));
  if (v_texture == 4.0) texel = texture(u_textures[4], vec3(v_texcoord, layer));
  if (v_texture == 5.0) texel = texture(u_textures[5], vec3(v_texcoord, layer));
  if (v_texture == 6.0) texel = texture(u_textures[6], vec3(v_texcoord, layer));
  if (v_texture == 7.0) texel = texture(u_textures[7], vec3(v_texcoord, layer));
  if (v_texture == 8.0) texel = texture(u_textures[8], vec3(v_texcoord, layer));
  if (v_texture == 9.0) texel = texture(u_textures[9], vec3(v_texcoord, layer));
  if (v_texture == 10.0) texel = texture(u_textures[10], vec3(v_texcoord, layer));
  if (v_texture == 11.0) texel = texture(u_textures[11], vec3(v_texcoord, layer));
  if (v_texture == 12.0) texel = texture(u_textures[12], vec3(v_texcoord, layer));

  outColor = vec4(texel.rgb * brightness, texel.a);
}
