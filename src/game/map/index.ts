import { m4 } from "twgl.js";

import { CulturesResourceManager } from "../../cultures/resource_manager";
import * as gl_helper from "./gl";
import { read_map_data, CulturesMapData } from "../../cultures/map";
import { CulturesFS } from "../../cultures/fs";
import { triangulate_map } from "./tessellate";
import { get_texture_buf } from "./texture";
import { draggable } from "../../behaviors/draggable";

interface IProgram {
  program: WebGLProgram;
  attrib_locations: Record<
    | 'a_position'
    | 'a_texcoord'
    | 'a_layer'
    | 'a_brightness'
  , number>;
  uniform_locations: Record<'u_matrix', WebGLUniformLocation | null>;
}

export class CulturesMap {
  private translationMatrix = [0, 0, 0];
  private animationFrame: number = 0;
  private vao: WebGLVertexArrayObject | null;

  constructor(
    private map: CulturesMapData,
    private gl: WebGL2RenderingContext,
    private rm: CulturesResourceManager,
    private program: IProgram
  ) {
    this.vao = gl.createVertexArray();
  }

  async initialize() {
    const { image, paths } = await this.rm.load_all_patterns();

    this.gl.bindVertexArray(this.vao);

    const vertices = new Float32Array(
      triangulate_map(this.map)
    );
    gl_helper.load_float_array(vertices, this.program.attrib_locations.a_position, 2, this.gl);

    const [texcoords, brightness, layers] = get_texture_buf(
      this.map,
      paths,
      this.rm.registry
    );
    gl_helper.load_float_array(texcoords, this.program.attrib_locations.a_texcoord, 2, this.gl);
    gl_helper.load_float_array(layers, this.program.attrib_locations.a_layer, 1, this.gl);
    gl_helper.load_float_array(brightness, this.program.attrib_locations.a_brightness, 1, this.gl);

    gl_helper.define_texture(image, paths.length, this.gl);
  }

  translate(dx: number, dy: number) {
    this.translationMatrix[0] += dx;
    this.translationMatrix[1] += dy;
  }

  render = () => {
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.gl.useProgram(this.program.program);
    this.gl.bindVertexArray(this.vao);

    let scaleFactor = 0.5;
    let size = 80 * scaleFactor;

    let matrix = m4.ortho(0, this.gl.canvas.width, this.gl.canvas.height, 0, -1, 1);
    matrix = m4.scale(matrix, [size, size / (35 / 39), 1]);
    matrix = m4.translate(matrix, this.translationMatrix);
    this.gl.uniformMatrix4fv(this.program.uniform_locations.u_matrix, false, matrix);

    // gl.bindTexture(gl.TEXTURE_2D, texture);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.map.width * this.map.height * 2 * 3);

    this.animationFrame = requestAnimationFrame(this.render);
  }
  
  stop() {
    cancelAnimationFrame(this.animationFrame);
  }
}

async function create_map(map_data: CulturesMapData, canvas: HTMLCanvasElement, rm: CulturesResourceManager) {
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    throw new Error('Context creation failed.');
  }

  const { program, attrib_locations, uniform_locations } = await gl_helper.init_program(gl);

  const map = new CulturesMap(map_data, gl, rm, {
    program,
    attrib_locations,
    uniform_locations
  });

  draggable(canvas, {
    onDrag(e) {
      map.translate(e.dx / 30, e.dy / 39);
    }
  });

  return map;
}

export async function load_map(
  path: string,
  canvas: HTMLCanvasElement,
  rm: CulturesResourceManager
) {
  const map_data = await rm.load_map(path);
  const map = await create_map( map_data, canvas, rm );
  await map.initialize();
  return map;
}

export async function load_user_map(
  customFS: CulturesFS,
  canvas: HTMLCanvasElement,
  rm: CulturesResourceManager
) {
  const blob = customFS.open("currentusermap\\map.dat");
  const map_data = await read_map_data(blob);
  const map = await create_map( map_data, canvas, rm );
  await map.initialize();
  return map;
}
