import { m4 } from 'twgl.js';

import { CulturesResourceManager } from "../../cultures/resource_manager";
import * as gl_helper from './gl';
import { CulturesMap, read_map_data } from "../../cultures/map";
import { CulturesRegistry } from "../../cultures/registry";
import { CulturesFS } from '../../cultures/fs';

function triA(x: number, y: number) {
  const off = (y % 2 === 1) ? -1 : 0;

  return [
    2 * x + 0 + off, y - 1,
    2 * x + 1 + off, y,
    2 * x - 1 + off, y
  ].map(x => x / 4);
}

function triB(x: number, y: number) {
  const off = (y % 2 === 1) ? 1 : 0;

  return [
    2 * (x - 1) + off, y - 1,
    2 * x + off,       y - 1,
    2 * x - 1 + off,   y - 0
  ].map(x => x / 4);
}

function triangulate_map(width: number, height: number) {
  let map: number[][] = Array(width * height * 4 * 2);

  for (let i = 0; i < 2 * width; i++) {
    for (let j = 0; j < 2 * height; j++) {
      map[2 * i * 2 * width + 2 * j] = triA(j, i);
      map[2 * i * 2 * width + 2 * j + 1] = triB(j, i);
    }
  }

  return map.flat();
}

function* get_texture_buf(map: CulturesMap, paths: string[], registry: CulturesRegistry) {
  let length = map.width * map.height;
  const at = map.tiles_a, bt = map.tiles_b;
  const tm = map.tiles_index;

  for (let i = 0; i < length; i++) {
    let tile_name = tm[at[i]];
    let pattern = registry.patterns.get(tile_name);
    let layer = paths.indexOf(pattern.GfxTexture);

    for (let j = 0; j < 3; j++) {
      yield pattern.GfxCoordsA[2 * j] / 256;
      yield pattern.GfxCoordsA[2 * j + 1] / 256;
      yield layer;
    }

    tile_name = tm[bt[i]];
    pattern = registry.patterns.get(tile_name);
    layer = paths.indexOf(pattern.GfxTexture);

    for (let j = 0; j < 3; j++) {
      yield pattern.GfxCoordsB[2 * j] / 256;
      yield pattern.GfxCoordsB[2 * j + 1] / 256;
      yield layer;
    }
  }
}

export async function load_map(path: string, gl: WebGL2RenderingContext, rm: CulturesResourceManager) {
  const { image, paths } = await rm.load_all_patterns();
  const map = await rm.load_map(path);

  const { program, locations } = await gl_helper.init_program(gl);

  let vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const vertices = new Float32Array(triangulate_map(map.width, map.height));
  gl_helper.load_float_array(vertices, locations.a_position, 2, gl);

  const texcoords = new Float32Array(get_texture_buf(map, paths, rm.registry));
  gl_helper.load_float_array(texcoords, locations.a_texcoord, 3, gl);

  const texture = gl_helper.define_texture(image, paths.length, gl);

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
  matrix = m4.translate(matrix, [0.5, 0.5, 0]);
  gl.uniformMatrix4fv(locations.u_matrix, false, matrix);

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.drawArrays(gl.TRIANGLES, 0, map.width * map.height * 4);
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

  const texcoords = new Float32Array(get_texture_buf(map, paths, rm.registry));
  gl_helper.load_float_array(texcoords, locations.a_texcoord, 3, gl);

  const texture = gl_helper.define_texture(image, paths.length, gl);

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
  matrix = m4.translate(matrix, [0.5, 0.5, 0]);
  gl.uniformMatrix4fv(locations.u_matrix, false, matrix);

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.drawArrays(gl.TRIANGLES, 0, map.width * map.height * 4);
}