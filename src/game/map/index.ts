import { CulturesResourceManager } from "../../cultures/resource_manager";
import { read_map_data, CulturesMapData } from "../../cultures/map";
import { CulturesFS } from "../../cultures/fs";
import { draggable } from "../../behaviors/draggable";
import { MapGeometry } from "./geometry";
import { MapGround } from "./ground";
import { MapLandscape } from "./landscape";

export class CulturesMap {
  private animationFrame: number = 0;
  private geometry: MapGeometry;
  private gl: WebGL2RenderingContext;

  // Layers
  private ground: MapGround;
  private landscape: MapLandscape;

  constructor(
    map: CulturesMapData,
    gl: WebGL2RenderingContext,
    rm: CulturesResourceManager
  ) {
    this.gl = gl;

    this.geometry = new MapGeometry(
      gl.canvas.width,
      gl.canvas.height,
      map.width,
      map.height
    );

    this.ground = new MapGround(map, gl, rm, this.geometry);
    this.landscape = new MapLandscape(map, gl, rm, this.geometry);
  }

  async initialize() {
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
    // this.gl.blendEquationSeparate(this.gl.FUNC_ADD, this.gl.FUNC_ADD);
    // this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ZERO);

    await this.ground.initialize();
    await this.landscape.initialize();

    this.translate(0, 0);
  }

  translate(dx: number, dy: number) {
    this.geometry.translate(dx, dy);
  }

  render = () => {
    this.ground.render();
    this.landscape.render();

    this.animationFrame = requestAnimationFrame(this.render);
  };

  stop() {
    cancelAnimationFrame(this.animationFrame);
  }
}

function create_map(
  map_data: CulturesMapData,
  canvas: HTMLCanvasElement,
  rm: CulturesResourceManager
) {
  const gl = canvas.getContext("webgl2");

  if (!gl) {
    throw new Error("Context creation failed.");
  }

  const map = new CulturesMap(map_data, gl, rm);

  draggable(canvas, {
    onDrag(e) {
      map.translate(e.dx / 35, e.dy / 39);
    }
  });

  return map;
}

export async function load_map(
  canvas: HTMLCanvasElement,
  rm: CulturesResourceManager
) {
  const map_paths = [...rm.fs.ls()].filter(e => e.path.match(/^data\\maps\\campaign_\d\d_\d\d\\map.dat$/)).sort();
  const e = map_paths[0];
  const map_data = await rm.load_map(e!.path);
  const map = create_map(map_data, canvas, rm);
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
  const map = create_map(map_data, canvas, rm);
  await map.initialize();
  return map;
}
