import { CulturesResourceManager } from "../../cultures/resource_manager";
import * as gl_helper from './gl';

export function triA(x: number, y: number) {
  const off = (y % 2 === 1) ? -1 : 0;

  return [
    2 * x + 0 + off, y - 1, 1.0,
    2 * x + 1 + off, y, 1.0,
    2 * x - 1 + off, y, 1.0
  ];
}

export function triB(x: number, y: number) {
  const off = (y % 2 === 1) ? 1 : 0;

  return [
    2 * (x - 1) + off, y - 1, 1.0,
    2 * x + off,       y - 1, 1.0,
    2 * x - 1 + off,   y - 0, 1.0
  ];
}

export function triangulate_map(width: number, height: number) {
  let map: number[][] = Array(width * height * 4 * 2);

  for (let i = 0; i < 2 * width; i++) {
    for (let j = 0; j < 2 * height; j++) {
      map[2 * i * 2 * width + 2 * j] = triA(j, i);
      map[2 * i * 2 * width + 2 * j + 1] = triB(j, i);
    }
  }

  return map.flat();
}

export async function load_map(gl: WebGL2RenderingContext, rm: CulturesResourceManager) {
  const img = await rm.load_all_patterns();

  const { program, locations } = gl_helper.init_program(gl);

  let vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

}