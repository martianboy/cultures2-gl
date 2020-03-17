// import { throttle } from 'lodash-es';

import { CulturesResourceManager } from "../../cultures/resource_manager";
import { CulturesMapData } from "../../cultures/map";
import { MapGeometry } from "./geometry";
import { MapLayer } from "./interfaces";

import { get_texture_buf } from "./texture";

import {
  createShader,
  createProgram,
  load_float_array,
  define_texture
} from "../../utils/webgl";

import vertexShaderSource from "../../shaders/ground/vertex.glsl";
import fragmentShaderSource from "../../shaders/ground/fragment.glsl";

interface IProgram {
  program: WebGLProgram;
  attrib_locations: Record<
    | "a_position"
    | "a_texcoord"
    | "a_layer"
    | "a_transcoord1"
    | "a_trans_layer1"
    | "a_transcoord2"
    | "a_trans_layer2"
    | "a_brightness",
    number
  >;
  uniform_locations: Record<
    "u_matrix" | "u_texture" | "u_transition",
    WebGLUniformLocation | null
  >;
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

interface GlTextures {
  patterns: WebGLTexture;
  transitions: WebGLTexture;
}

function init_program(gl: WebGL2RenderingContext): IProgram {
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
      u_transition
    }
  };
}

export class MapGround implements MapLayer {
  private vao: WebGLVertexArrayObject | null;
  private buffers?: GlBuffers;
  private textures?: GlTextures;
  private program: IProgram;

  constructor(
    private map: CulturesMapData,
    private gl: WebGL2RenderingContext,
    private rm: CulturesResourceManager,
    private geometry: MapGeometry
  ) {
    this.vao = gl.createVertexArray();
    this.program = init_program(this.gl);
  }

  async initialize() {
    const {
      image: patterns,
      paths: pattern_paths
    } = await this.rm.load_all_patterns();
    const {
      image: transitions,
      paths: transition_paths
    } = await this.rm.load_all_pattern_transitions();

    this.gl.bindVertexArray(this.vao);

    const { triangulate } = await import("cultures2-wasm");
    const vertices = triangulate(
      this.map.width,
      this.map.height,
      this.map.elevation
    );

    const [
      texcoords,
      brightness,
      layers,
      trans_coords1,
      transition_layers1,
      trans_coords2,
      transition_layers2
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
      a_brightness: brightness
    };

    load_float_array(
      this.buffers.a_position,
      this.program.attrib_locations.a_position,
      2,
      this.gl
    );
    load_float_array(
      this.buffers.a_texcoord,
      this.program.attrib_locations.a_texcoord,
      2,
      this.gl
    );
    load_float_array(
      this.buffers.a_layer,
      this.program.attrib_locations.a_layer,
      1,
      this.gl
    );
    load_float_array(
      this.buffers.a_transcoord1,
      this.program.attrib_locations.a_transcoord1,
      2,
      this.gl
    );
    load_float_array(
      this.buffers.a_trans_layer1,
      this.program.attrib_locations.a_trans_layer1,
      1,
      this.gl
    );
    load_float_array(
      this.buffers.a_transcoord2,
      this.program.attrib_locations.a_transcoord2,
      2,
      this.gl
    );
    load_float_array(
      this.buffers.a_trans_layer2,
      this.program.attrib_locations.a_trans_layer2,
      1,
      this.gl
    );
    load_float_array(
      this.buffers.a_brightness,
      this.program.attrib_locations.a_brightness,
      1,
      this.gl
    );

    const tex_patterns = define_texture(
      patterns,
      0,
      pattern_paths.length,
      this.gl
    );
    const tex_transitions = define_texture(
      transitions,
      1,
      transition_paths.length,
      this.gl
    );

    this.textures = {
      patterns: tex_patterns,
      transitions: tex_transitions
    };

    this.render();
  }

  bind_textures() {
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D_ARRAY, this.textures!.patterns);

    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D_ARRAY, this.textures!.transitions);
  }

  render() {
    this.gl.useProgram(this.program.program);
    this.gl.bindVertexArray(this.vao);

    this.gl.uniform1i(this.program.uniform_locations.u_texture, 0);
    this.gl.uniform1i(this.program.uniform_locations.u_transition, 1);
    this.gl.uniformMatrix4fv(
      this.program.uniform_locations.u_matrix,
      false,
      this.geometry.transformation
    );

    this.bind_textures();

    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.geometry.primitive_count);
  }
}
