#version 300 es

precision mediump int;
precision mediump float;
precision mediump sampler2DArray;

// Passed in from the vertex shader.
in vec2 v_texcoord;
flat in int i_texture;
in float layer;
in float brightness;

// The texture.
uniform sampler2DArray[1] u_textures;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  vec4 texel = texture(u_textures[0], vec3(v_texcoord, layer));
  outColor = vec4(texel.rgb * brightness, texel.a);
}
