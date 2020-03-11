import { m4 } from "twgl.js";

import { CulturesResourceManager } from "../../cultures/resource_manager";
import * as gl_helper from "./gl";
import { read_map_data, CulturesMapData } from "../../cultures/map";
import { CulturesFS } from "../../cultures/fs";
import { get_texture_buf } from "./texture";
import { draggable } from "../../behaviors/draggable";

interface IProgram {
  program: WebGLProgram;
  attrib_locations: Record<
    | 'a_position'
    | 'a_texcoord'
    | 'a_layer'
    | 'a_transcoord1'
    | 'a_trans_layer1'
    | 'a_transcoord2'
    | 'a_trans_layer2'
    | 'a_brightness'
  , number>;
  uniform_locations: Record<'u_matrix' | 'u_texture' | 'u_transition', WebGLUniformLocation | null>;
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
    const { image: patterns, paths: pattern_paths } = await this.rm.load_all_patterns();
    const { image: transitions, paths: transition_paths } = await this.rm.load_all_pattern_transitions();

    this.gl.bindVertexArray(this.vao);

    const { triangulate } = await import('cultures2-wasm');
    const vertices = triangulate(this.map.width, this.map.height, this.map.elevation);

    gl_helper.load_float_array(vertices, this.program.attrib_locations.a_position, 2, this.gl);

    const [
      texcoords,
      brightness,
      layers,
      trans_coords1,
      transition_layers1,
      trans_coords2,
      transition_layers2,
    ] = get_texture_buf(
      this.map,
      pattern_paths,
      transition_paths,
      this.rm.registry
    );
    gl_helper.load_float_array(texcoords, this.program.attrib_locations.a_texcoord, 2, this.gl);
    gl_helper.load_float_array(layers, this.program.attrib_locations.a_layer, 1, this.gl);
    gl_helper.load_float_array(trans_coords1, this.program.attrib_locations.a_transcoord1, 2, this.gl);
    gl_helper.load_float_array(transition_layers1, this.program.attrib_locations.a_trans_layer1, 1, this.gl);
    gl_helper.load_float_array(trans_coords2, this.program.attrib_locations.a_transcoord2, 2, this.gl);
    gl_helper.load_float_array(transition_layers2, this.program.attrib_locations.a_trans_layer2, 1, this.gl);
    gl_helper.load_float_array(brightness, this.program.attrib_locations.a_brightness, 1, this.gl);

    const tex_patterns = gl_helper.define_texture(patterns, 0, pattern_paths.length, this.gl);
    const tex_transitions1 = gl_helper.define_texture(transitions, 1, transition_paths.length, this.gl);

    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.gl.useProgram(this.program.program);
    this.gl.bindVertexArray(this.vao);

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D_ARRAY, tex_patterns);
    this.gl.uniform1i(this.program.uniform_locations.u_texture, 0);

    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D_ARRAY, tex_transitions1);
    this.gl.uniform1i(this.program.uniform_locations.u_transition, 1);
  }

  translate(dx: number, dy: number) {
    this.translationMatrix[0] += dx;
    this.translationMatrix[1] += dy;
  }

  render = () => {
    let scaleFactor = 0.8;
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

function create_map(map_data: CulturesMapData, canvas: HTMLCanvasElement, rm: CulturesResourceManager) {
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    throw new Error('Context creation failed.');
  }

  const { program, attrib_locations, uniform_locations } = gl_helper.init_program(gl);

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
  const map = create_map( map_data, canvas, rm );
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
  const map = create_map( map_data, canvas, rm );
  await map.initialize();
  return map;
}
