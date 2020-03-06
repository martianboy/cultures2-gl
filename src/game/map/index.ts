import { m4 } from 'twgl.js';

import { CulturesResourceManager } from "../../cultures/resource_manager";
import * as gl_helper from './gl';
import { read_map_data } from "../../cultures/map";
import { CulturesFS } from '../../cultures/fs';
import { triangulate_map } from './tessellate';
import { get_texture_buf } from './texture';

export async function load_map(path: string, gl: WebGL2RenderingContext, rm: CulturesResourceManager) {
  const { image, paths } = await rm.load_all_patterns();
  const map = await rm.load_map(path);

  const { program, locations } = await gl_helper.init_program(gl);

  let vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const vertices = new Float32Array(triangulate_map(map.width, map.height));
  gl_helper.load_float_array(vertices, locations.a_position, 2, gl);

  const [texcoords, layers] = get_texture_buf(map, paths, rm.registry);
  gl_helper.load_float_array(texcoords, locations.a_texcoord, 2, gl);
  gl_helper.load_float_array(layers, locations.a_layer, 1, gl);

  const texture = gl_helper.define_texture(image, paths.length, gl);

  let translationMatrix = [0, 0, 0];
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Draw
  function draw() {
    gl.useProgram(program);
    gl.bindVertexArray(vao);

    let scaleFactor = .5;
    let size = 80 * scaleFactor;

    let matrix = m4.ortho(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
    matrix = m4.scale(matrix, [size, size / ( 35 / 39 ), 1]);
    matrix = m4.translate(matrix, translationMatrix);
    gl.uniformMatrix4fv(locations.u_matrix, false, matrix);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.drawArrays(gl.TRIANGLES, 0, map.width * map.height * 2 * 3);

    translationMatrix[0] -= 0.03;
    translationMatrix[1] -= 0.06;
    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}

export async function load_user_map(customFS: CulturesFS, gl: WebGL2RenderingContext, rm: CulturesResourceManager) {
  const { image, paths } = await rm.load_all_patterns();
  const blob = customFS.open('currentusermap\\map.dat');
  const map = await read_map_data(blob);

  const { program, locations } = await gl_helper.init_program(gl);

  let vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const vertices = new Float32Array(triangulate_map(map.width, map.height));
  gl_helper.load_float_array(vertices, locations.a_position, 2, gl);

  const [texcoords, layers] = get_texture_buf(map, paths, rm.registry);
  gl_helper.load_float_array(texcoords, locations.a_texcoord, 2, gl);
  gl_helper.load_float_array(layers, locations.a_layer, 1, gl);

  gl_helper.define_texture(image, paths.length, gl);

  // Draw
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(program);
  gl.bindVertexArray(vao);

  let scaleFactor = 1;
  let size = 80 * scaleFactor;

  let matrix = m4.ortho(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
  matrix = m4.scale(matrix, [size, size / ( 35 / 39 ), 1]);
  matrix = m4.translate(matrix, [2.5, 2.5, 0]);
  gl.uniformMatrix4fv(locations.u_matrix, false, matrix);

  gl.drawArrays(gl.TRIANGLES, 0, map.width * map.height * 4 * 3);
}