export async function load_shader(url: string) {
  const res = await fetch(url, {
    cache: "no-cache"
  });
  return res.text();
}

export function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
  var shader = gl.createShader(type);
  if (!shader) throw new Error("Shader could not be created.");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  console.log(gl.getShaderInfoLog(shader)); // eslint-disable-line
  gl.deleteShader(shader);
  throw new Error("Could not initialize the shaders.");
}

export function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
  var program = gl.createProgram();
  if (!program) throw new Error("Program could not be created.");

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program)); // eslint-disable-line
  gl.deleteProgram(program);
  throw new Error("Program setup failed.");
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

  if (!texture) throw new Error('Texture could not be created');

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

  return texture;
}
