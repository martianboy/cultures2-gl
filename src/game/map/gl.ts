import { load_shader, createShader, createProgram } from "../../utils/webgl";

const vertexShaderUrl = require('../../shaders/ground/vertex.glsl');
const fragmentShaderUrl = require('../../shaders/ground/fragment.glsl');

export async function init_program(gl: WebGL2RenderingContext) {
  const vertexShaderSource = await load_shader(vertexShaderUrl);
  const fragmentShaderSource = await load_shader(fragmentShaderUrl);

  // create GLSL shaders, upload the GLSL source, compile the shaders
  var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  var fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
  );

  // Link the two shaders into a program
  const program = createProgram(gl, vertexShader, fragmentShader);
  const a_position = gl.getAttribLocation(program, "a_position");
  const a_texcoord = gl.getAttribLocation(program, "a_texcoord");
  const a_transcoord1 = gl.getAttribLocation(program, "a_transcoord1");
  const a_transcoord2 = gl.getAttribLocation(program, "a_transcoord2");
  const a_layer = gl.getAttribLocation(program, "a_layer");
  const a_trans_layer1 = gl.getAttribLocation(program, "a_trans_layer1");
  const a_trans_layer2 = gl.getAttribLocation(program, "a_trans_layer2");
  const a_brightness = gl.getAttribLocation(program, "a_brightness");

  const u_matrix = gl.getUniformLocation(program, "u_matrix");
  const u_texture = gl.getUniformLocation(program, "u_texture");
  const u_transition = gl.getUniformLocation(program, "u_transition");

  return {
    program,
    attrib_locations: {
      a_position,
      a_texcoord,
      a_transcoord1,
      a_transcoord2,
      a_layer,
      a_trans_layer1,
      a_trans_layer2,
      a_brightness
    }, 
    uniform_locations: {
      u_matrix,
      u_texture,
      u_transition,
    }
  }
}

export function load_float_array(buf: Float32Array, location: number, size: number, gl: WebGL2RenderingContext) {
  let positionBuffer = gl.createBuffer();
  gl.enableVertexAttribArray(location);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  gl.bufferData(gl.ARRAY_BUFFER, buf, gl.STATIC_DRAW);
  gl.vertexAttribPointer(
      location, size, gl.FLOAT, false, 0, 0);
}

export function load_uint8_array(buf: Uint8Array, location: number, size: number, gl: WebGL2RenderingContext) {
  let positionBuffer = gl.createBuffer();
  gl.enableVertexAttribArray(location);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  gl.bufferData(gl.ARRAY_BUFFER, buf, gl.STATIC_DRAW);
  gl.vertexAttribPointer(
      location, size, gl.UNSIGNED_BYTE, false, 0, 0);
}

export function define_texture(image: ImageData, index: number, depth: number, gl: WebGL2RenderingContext) {
  // Create a texture.
  var texture = gl.createTexture();

  // use texture unit 0
  gl.activeTexture(gl.TEXTURE0 + index);

  // bind to the TEXTURE_2D bind point of texture unit 0
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.texImage3D(
    gl.TEXTURE_2D_ARRAY,
    0,
    gl.RGBA,
    image.width,
    image.height / depth,
    depth,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    image.data
  );
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);

  return texture;
}