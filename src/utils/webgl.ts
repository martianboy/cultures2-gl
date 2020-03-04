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
