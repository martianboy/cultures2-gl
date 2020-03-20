import { SequentialDataView } from "../../utils/dataview";

import { CulturesMapData } from "../../cultures/map";
import { CulturesResourceManager } from "../../cultures/resource_manager";
import { MapGeometry } from "./geometry";
import { MapLayer } from "./interfaces";

import {
  createShader,
  createProgram,
  load_float_array,
  load_uint8_array,
  define_compressed_texture,
  define_texture
} from "../../utils/webgl";

import vertexShaderSource from "../../shaders/landscape/vertex.glsl";
import fragmentShaderSource from "../../shaders/landscape/fragment.glsl";

interface IProgram {
  program: WebGLProgram;
  attrib_locations: Record<
    "a_position" | "a_texcoord" | "a_texture" | "a_layer" | "a_brightness",
    number
  >;
  uniform_locations: Record<
    "u_matrix" | "u_textures",
    WebGLUniformLocation | null
  >;
}

interface GlBuffers {
  a_position: Float32Array;
  a_texcoord: Float32Array;
  a_texture: Uint32Array;
  a_layer: Float32Array;
  a_brightness: Float32Array;
}

interface GlTexture {
  texture: WebGLTexture;
  width: number;
  height: number;
  depth: number;
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
  const a_texture = gl.getAttribLocation(program, "a_texture");
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
      a_texture,
      a_brightness
    },
    uniform_locations: {
      u_matrix,
      u_textures
    }
  };
}

export class MapLandscape implements MapLayer {
  private vao: WebGLVertexArrayObject | null;
  private buffers?: GlBuffers;
  private layers_index?: Map<number, number>;
  private textures?: GlTexture[];
  private program: IProgram;
  private landscape_count: number = 0;

  private paths_index?: Record<string, number>;
  private palettes_index?: Record<string, number>;

  constructor(
    private map: CulturesMapData,
    private gl: WebGL2RenderingContext,
    private rm: CulturesResourceManager,
    private geometry: MapGeometry
  ) {
    this.vao = gl.createVertexArray();
    this.program = init_program(this.gl);
  }

  async load_texture() {
    const { buf, paths_index, layers_index, palettes_index } = await this.rm.load_landscape_bmd();
    const view = new SequentialDataView(buf.buffer);

    this.layers_index = layers_index;
    this.paths_index = paths_index;
    this.palettes_index = palettes_index;

    this.textures = Object.values(paths_index).map(idx => {
      let depth = view.getUint32();
      let width = view.getUint32();
      let height = view.getUint32();
      let encoded_length = view.getUint32();

      let img = new ImageData(new Uint8ClampedArray(view.slice(encoded_length)), width, height * depth);
      return {
        texture: define_texture(img, idx, depth, this.gl),
        width,
        height,
        depth
      };
    });
  }

  async initialize() {
    this.gl.bindVertexArray(this.vao);
    await this.load_texture();

    const {width, height} = this.textures![0];

    // if (this.paths_index) this.gl.uniform1iv(this.program.uniform_locations.u_textures, Object.values(this.paths_index).slice(0, 16));

    const rect_at = (x: number, y: number, w: number, h: number): number[] => {
      const off = (y % 2) / 2;
      return [
        off + x - w / 2, -y / 2 + (y - h),
        off + x + w / 2, -y / 2 + y,
        off + x - w / 2, -y / 2 + y,

        off + x - w / 2, -y / 2 + (y - h),
        off + x + w / 2, -y / 2 + (y - h),
        off + x + w / 2, -y / 2 + y,
      ].map(xx => xx / 2);
    }

    // const texcoords_at = (x: number, y: number, layer: number): number[] => {
    //   return [

    //   ]
    // }

    let objects = this.map.landscape_types.filter((lt, i) => {
      if (lt > this.map.landscape_index.length) return false;
      let lnd = this.rm.registry.landscapes.get(this.map.landscape_index[lt]);
      if (!lnd || !lnd.GfxBobLibs.bmd.endsWith('ls_trees.bmd')) return false;

      return true;
    });

    this.landscape_count = objects.length;

    let a_position = new Float32Array(12 * objects.length);
    let a_texcoord = new Float32Array(12 * objects.length);
    let a_texture = new Uint8Array(6 * objects.length).fill(0);
    let a_layer = new Float32Array(6 * objects.length);
    let a_brightness = new Float32Array(6 * objects.length).fill(1);

    a_texcoord.set([
      0, 0,
      1, 1,
      0, 1,

      0, 0,
      1, 0,
      1, 1,
    ], 0);
    for (let i = 1; i < objects.length; i++) {
      a_texcoord.copyWithin(i * 12, 0, 12);
    }

    let buf_pos = 0;

    for (let i = 0; i < this.map.width * this.map.height * 4; i++) {
      let lt = this.map.landscape_types[i];
      if (lt > this.map.landscape_index.length) continue;

      let lnd = this.rm.registry.landscapes.get(this.map.landscape_index[lt]);
      if (!lnd || !lnd.GfxBobLibs.bmd.endsWith('ls_trees.bmd')) continue;

      let level = this.map.landscape_levels[i];

      let y = Math.floor(i / this.map.height / 2);
      let x = i % (this.map.width * 2);

      a_position.set(rect_at(x, y, width / 35, height / 39), buf_pos * 12);
      a_layer.set(Array(6).fill(this.layers_index!.get(this.paths_index![lnd.GfxBobLibs.bmd] * 1000000 + lnd.GfxFrames[level][0] * 100 + this.palettes_index![this.rm.registry.palettes.get(lnd.GfxPalette[0])!.gfxfile]))!, buf_pos * 6);

      buf_pos += 1;

      // this.landscape_count += 1;
    }

    load_float_array(
      a_position,
      this.program.attrib_locations.a_position,
      2,
      this.gl
    );

    load_float_array(
      a_texcoord,
      this.program.attrib_locations.a_texcoord,
      2,
      this.gl
    );

    load_uint8_array(
      a_texture,
      this.program.attrib_locations.a_texture,
      1,
      this.gl
    );

    load_float_array(
      a_layer,
      this.program.attrib_locations.a_layer,
      1,
      this.gl
    );

    load_float_array(
      a_brightness,
      this.program.attrib_locations.a_brightness,
      1,
      this.gl
    );
  }

  bind_textures() {
    if (!this.textures) return;

    for (let i = 0; i < this.textures.length; i++) {
      this.gl.activeTexture(this.gl.TEXTURE0 + i);
      this.gl.bindTexture(this.gl.TEXTURE_2D_ARRAY, this.textures[i].texture);
    }
  }

  render(): void {
    if (!this.paths_index) return;

    this.gl.useProgram(this.program.program);
    this.gl.bindVertexArray(this.vao);

    // this.gl.uniform1i(this.program.uniform_locations.u_texture, 0);
    // this.gl.uniform1i(this.program.uniform_locations.u_transition, 1);
    this.gl.uniformMatrix4fv(
      this.program.uniform_locations.u_matrix,
      false,
      this.geometry.transformation
    );
    this.gl.uniform1iv(this.program.uniform_locations.u_textures, Object.values(this.paths_index).slice(0, 16));
    this.bind_textures();

    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6 * this.landscape_count);
  }
}
