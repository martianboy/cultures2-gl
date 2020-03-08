#version 300 es

precision mediump float;
precision mediump sampler2DArray;

// Passed in from the vertex shader.
in vec2 v_texcoord;
in vec2 v_transcoord1;
in vec2 v_transcoord2;
in float layer;
in float trans_layer1;
in float trans_layer2;
in float brightness;

// The texture.
uniform sampler2DArray u_texture;
uniform sampler2DArray u_transition;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  vec4 texColor = texture(u_texture, vec3(v_texcoord, layer));
  vec4 transColor1 = texture(u_transition, vec3(v_transcoord1, trans_layer1));
  vec4 transColor2 = texture(u_transition, vec3(v_transcoord2, trans_layer2));

  vec3 tColor = texColor.rgb;

  if (trans_layer2 >= 0.0f) {
    tColor = mix(tColor, transColor2.rgb, transColor2.a);
  }

  if (trans_layer1 >= 0.0f) {
    tColor = mix(tColor, transColor1.rgb, transColor1.a);
  }

  outColor = vec4(tColor * brightness, 1.0);
}
