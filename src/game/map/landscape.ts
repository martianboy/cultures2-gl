import { CulturesMapData } from "../../cultures/map";
import { CulturesResourceManager } from "../../cultures/resource_manager";
import { MapGeometry } from "./geometry";
import { MapLayer } from './interfaces';

import { createShader, createProgram } from "../../utils/webgl";

import vertexShaderSource from '../../shaders/landscape/vertex.glsl';
import fragmentShaderSource from '../../shaders/landscape/fragment.glsl';

interface IProgram {
  program: WebGLProgram;
  attrib_locations: Record<
    | 'a_position'
    | 'a_texcoord'
    | 'a_layer'
    | 'a_brightness'
  , number>;
  uniform_locations: Record<'u_matrix' | 'u_textures', WebGLUniformLocation | null>;
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
  patterns: WebGLTexture,
  transitions: WebGLTexture,
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
  const a_layer = gl.getAttribLocation(program, "a_layer");
  const a_brightness = gl.getAttribLocation(program, "a_brightness");

  const u_matrix = gl.getUniformLocation(program, "u_matrix");
  const u_textures = gl.getUniformLocation(program, "u_textures");

  return {
    program,
    attrib_locations: {
      a_position,
      a_texcoord,
      a_layer,
      a_brightness
    }, 
    uniform_locations: {
      u_matrix,
      u_textures,
    }
  }
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
    this.gl.bindVertexArray(this.vao);
  }

  render(): void {
    this.gl.useProgram(this.program.program);
    this.gl.bindVertexArray(this.vao);

    // this.gl.uniform1i(this.program.uniform_locations.u_texture, 0);
    // this.gl.uniform1i(this.program.uniform_locations.u_transition, 1);
    this.gl.uniformMatrix4fv(this.program.uniform_locations.u_matrix, false, this.geometry.transformation);

    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.geometry.primitive_count);  }
}
