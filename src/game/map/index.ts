import { throttle } from 'lodash-es';

import { CulturesResourceManager } from "../../cultures/resource_manager";
import * as gl_helper from "./gl";
import { read_map_data, CulturesMapData } from "../../cultures/map";
import { CulturesFS } from "../../cultures/fs";
import { get_texture_buf } from "./texture";
import { draggable } from "../../behaviors/draggable";
import { MapGeometry } from "./geometry";

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

interface GlBuffers {
  a_position: Float32Array;
  a_texcoord: Float32Array;
  a_layer: Float32Array;
  a_transcoord1: Float32Array;
  a_trans_layer1: Float32Array;
  a_transcoord2: Float32Array;
  a_trans_layer2: Float32Array;
  a_brightness: Float32Array;
}

export class CulturesMap {
  private animationFrame: number = 0;
  private vao: WebGLVertexArrayObject | null;
  private geometry: MapGeometry;
  private buffers?: GlBuffers;

  constructor(
    private map: CulturesMapData,
    private gl: WebGL2RenderingContext,
    private rm: CulturesResourceManager,
    private program: IProgram
  ) {
    this.vao = gl.createVertexArray();
    this.geometry = new MapGeometry(
      this.gl.canvas.width,
      this.gl.canvas.height,
      map.width,
      map.height
    );
  }

  async initialize() {
    const { image: patterns, paths: pattern_paths } = await this.rm.load_all_patterns();
    const { image: transitions, paths: transition_paths } = await this.rm.load_all_pattern_transitions();

    this.gl.bindVertexArray(this.vao);

    const { triangulate } = await import('cultures2-wasm');
    const vertices = triangulate(this.map.width, this.map.height, this.map.elevation);

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

    this.buffers = {
      a_position: vertices,
      a_texcoord: texcoords,
      a_layer: layers,
      a_transcoord1: trans_coords1,
      a_transcoord2: trans_coords2,
      a_trans_layer1: transition_layers1,
      a_trans_layer2: transition_layers2,
      a_brightness: brightness,
    };

    gl_helper.load_float_array(this.buffers.a_position, this.program.attrib_locations.a_position, 2, this.gl);
    gl_helper.load_float_array(this.buffers.a_texcoord, this.program.attrib_locations.a_texcoord, 2, this.gl);
    gl_helper.load_float_array(this.buffers.a_layer, this.program.attrib_locations.a_layer, 1, this.gl);
    gl_helper.load_float_array(this.buffers.a_transcoord1, this.program.attrib_locations.a_transcoord1, 2, this.gl);
    gl_helper.load_float_array(this.buffers.a_trans_layer1, this.program.attrib_locations.a_trans_layer1, 1, this.gl);
    gl_helper.load_float_array(this.buffers.a_transcoord2, this.program.attrib_locations.a_transcoord2, 2, this.gl);
    gl_helper.load_float_array(this.buffers.a_trans_layer2, this.program.attrib_locations.a_trans_layer2, 1, this.gl);
    gl_helper.load_float_array(this.buffers.a_brightness, this.program.attrib_locations.a_brightness, 1, this.gl);

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

    this.translate(0, 0);
  }

  translate(dx: number, dy: number) {
    this.geometry.translate(dx, dy);
    this.reload_buffers();
  }

  reload_buffers = throttle(() => {
    this.gl.uniformMatrix4fv(this.program.uniform_locations.u_matrix, false, this.geometry.transformation);
  }, 20, { leading: true })

  render = () => {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.geometry.primitive_count);

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
