#version 300 es

precision mediump float;
precision mediump sampler2DArray;

// Passed in from the vertex shader.
in vec2 v_texcoord;
in float layer;
in float brightness;

// The texture.
uniform sampler2DArray u_texture;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  vec4 tColor = texture(u_texture, vec3(v_texcoord, layer));
  outColor = vec4(tColor.rgb * brightness, tColor.a);
}
