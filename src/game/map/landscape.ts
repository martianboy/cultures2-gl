import { SequentialDataView } from "../../utils/dataview";

import { CulturesMapData } from "../../cultures/map";
import { CulturesResourceManager } from "../../cultures/resource_manager";
import { MapGeometry } from "./geometry";
import { MapLayer } from "./interfaces";

import {
  createShader,
  createProgram,
  load_float_array,
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

  private frame_offsets = new Map<number, Int32Array>();

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
    const {
      buf,
      paths_index,
      layers_index,
      palettes_index
    } = await this.rm.load_landscape_bmd();
    const view = new SequentialDataView(buf.buffer);

    console.time('landscape#load_texture');
    this.layers_index = layers_index;
    this.paths_index = paths_index;
    this.palettes_index = palettes_index;

    this.textures = Object.values(paths_index).map(idx => {
      let depth = view.getUint32();
      let width = view.getUint32();
      let height = view.getUint32();
      let encoded_length = view.getUint32();
      this.frame_offsets.set(idx, new Int32Array(view.slice(depth * 2 * 4)));

      console.time('landscape#load_texture:ImageData');
      let img = new ImageData(
        new Uint8ClampedArray(view.slice(encoded_length)),
        width,
        height * depth
      );
      console.timeEnd('landscape#load_texture:ImageData');

      console.time('landscape#load_texture:define_texture');
      const texture = define_texture(img, idx, depth, this.gl, {
        MIN_FILTER: this.gl.NEAREST,
        MAG_FILTER: this.gl.NEAREST
      });
      console.timeEnd('landscape#load_texture:define_texture');

      return {
        texture,
        width,
        height,
        depth
      };
    });

    console.timeEnd('landscape#load_texture');
  }

  async initialize() {
    this.gl.bindVertexArray(this.vao);
    await this.load_texture();

    console.time('landscape#initialize');
    // if (this.paths_index) this.gl.uniform1iv(this.program.uniform_locations.u_textures, Object.values(this.paths_index).slice(0, 16));
    const ENABLED_BMDS = [
      "ls_trees.bmd",
      "ls_ground.bmd",
      "ls_harbour.bmd",
      "ls_bridge.bmd",
      "ls_chest.bmd",
      "ls_goods.bmd",
      "ls_mushrooms.bmd",
      "ls_trees_dead.bmd",
      "ls_stonehenge.bmd",
      "ls_statues.bmd",
      "ls_misc.bmd",
      "ls_caves.bmd",
      "ls_beduines.bmd",
    ];

    const elevation_at = (x: number, y: number): number => {
      const el = this.map.elevation;
      const w = this.map.width;

      const ty = Math.floor(y / 2);
      const tx = Math.floor(x / 2);
      const i = ty * w + tx;

      if (x < 2 || x > (w - 1) * 2 || y < 2 || y > (this.map.height - 1) * 2)
        return 0;
      if (ty % 2 === x % 2) return el[i] / 16;

      if (y % 2 === 0) {
        return (el[i] + el[i + 2]) / 32;
      } else if (x % 2 === 0) {
        return (el[i] + el[i + w]) / 32;
      } else {
        return (el[i + ((ty + 1) % 2)] + el[i + w + (ty % 2)]) / 32;
      }
    };

    const rect_at = (x: number, y: number, w: number, h: number): number[] => {
      const off = (y % 2) / 2;
      return [
        off + x,
        y,
        off + x + w,
        y + h,
        off + x,
        y + h,
        off + x,
        y,
        off + x + w,
        y,
        off + x + w,
        y + h
      ];
    };

    let objects = this.map.landscape_types.filter((lt, i) => {
      if (lt > this.map.landscape_index.length) return false;
      let lnd = this.rm.registry.landscapes.get(this.map.landscape_index[lt]);
      if (!lnd || !ENABLED_BMDS.some(p => lnd!.GfxBobLibs.bmd.endsWith(p)))
        return false;

      return true;
    });

    this.landscape_count = objects.length;

    let a_position = new Float32Array(12 * objects.length);
    let a_texcoord = new Float32Array(12 * objects.length);
    let a_texture = new Float32Array(6 * objects.length);
    let a_layer = new Float32Array(6 * objects.length);
    let a_brightness = new Float32Array(6 * objects.length).fill(1);

    a_texcoord.set([0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1], 0);

    for (let i = 1; i < objects.length; i++) {
      a_texcoord.copyWithin(i * 12, 0, 12);
    }

    let buf_pos = 0;

    if (!this.paths_index)
      throw new Error("this.paths_index is not initialized.");
    if (!this.palettes_index)
      throw new Error("this.palettes_index is not initialized.");
    if (!this.layers_index)
      throw new Error("this.layers_index is not initialized.");

    for (let i = 0; i < this.map.width * this.map.height * 4; i++) {
      let lt = this.map.landscape_types[i];
      if (lt > this.map.landscape_index.length) continue;

      let lnd = this.rm.registry.landscapes.get(this.map.landscape_index[lt]);
      if (!lnd || !ENABLED_BMDS.some(p => lnd!.GfxBobLibs.bmd.endsWith(p)))
        continue;

      let path_idx = this.paths_index[lnd.GfxBobLibs.bmd];
      let palette_idx = this.palettes_index[
        this.rm.registry.palettes.get(lnd.GfxPalette[0])!.gfxfile
      ];
      let level = this.map.landscape_levels[i];
      if (lnd.GfxFrames[level] === undefined) {
        level = this.map.landscape_levels[i] = Math.max(...Object.keys(lnd.GfxFrames).map(Number));
      }

      let layer = this.layers_index.get(
        path_idx * 1000000 + lnd.GfxFrames[level][0] * 1000 + palette_idx
      );
      if (layer === undefined)
        throw new Error(
          `Layer hash code ${path_idx * 1000000 +
            lnd.GfxFrames[level][0] * 1000 +
            palette_idx} was not found in the index.`
        );

      const frame_offsets = this.frame_offsets.get(path_idx);
      if (frame_offsets === undefined)
        throw new Error(`Frame offsets not found for path_idx = ${path_idx}`);

      let y = Math.floor(i / this.map.width / 2);
      let x = i % (this.map.width * 2);

      if (
        lnd.GfxFrames == undefined ||
        lnd.GfxFrames[level] == undefined ||
        lnd.GfxPalette == undefined
      )
        debugger;

      const { width, height } = this.textures![path_idx];

      let rect = rect_at(
        x +
          frame_offsets[layer * 2 + 0] / this.geometry.width_unit -
          0.5 +
          (y % 2),
        y +
          frame_offsets[layer * 2 + 1] / this.geometry.height_unit -
          elevation_at(x, y),
        width / this.geometry.width_unit,
        height / this.geometry.height_unit
      );

      a_position.set(rect, buf_pos * 12);
      a_layer.set(Array(6).fill(layer), buf_pos * 6);
      a_texture.set(Array(6).fill(path_idx), buf_pos * 6);

      buf_pos += 1;

      // this.landscape_count += 1;
    }

    console.timeEnd('landscape#initialize');

    console.time('landscape#initialize:loadBuffers');

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

    load_float_array(
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

    console.timeEnd('landscape#initialize:loadBuffers');
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

    // let matrix = m4.translate(this.base_transformation, [
    //   this.geometry.translation[0] * 70,
    //   this.geometry.translation[1] * 78,
    //   0
    // ]);

    this.gl.uniformMatrix4fv(
      this.program.uniform_locations.u_matrix,
      false,
      // matrix,
      this.geometry.transformation
    );
    this.gl.uniform1iv(
      this.program.uniform_locations.u_textures,
      Object.values(this.paths_index).slice(0, 16)
    );
    this.bind_textures();

    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6 * this.landscape_count);
  }
}
