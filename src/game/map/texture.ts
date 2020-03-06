import { CulturesMapData } from "../../cultures/map";
import { CulturesRegistry } from "../../cultures/registry";

export function get_texture_buf(
  map: CulturesMapData,
  paths: string[],
  registry: CulturesRegistry
): [Float32Array, Float32Array] {
  let length = map.width * map.height;
  const at = map.tiles_a;
  const bt = map.tiles_b;
  const tm = map.tiles_index;

  let layers = new Float32Array(length * 2 * 3);
  let tex_coords = new Float32Array(length * 2 * 2 * 3);

  const path_idx = new Map(paths.map((p, i) => [p, i]));

  for (let i = 0; i < length; i++) {
    let tile_name = tm[at[i]];
    let pattern = registry.patterns.get(tile_name);
    let layer = path_idx.get(pattern.GfxTexture)!;

    for (let j = 0; j < 3; j++) {
      tex_coords[2 * 6 * i + 2 * j + 0] = pattern.GfxCoordsA[2 * j] / 256;
      tex_coords[2 * 6 * i + 2 * j + 1] = pattern.GfxCoordsA[2 * j + 1] / 256;
      layers[2 * 3 * i + j] = layer;
    }

    tile_name = tm[bt[i]];
    pattern = registry.patterns.get(tile_name);
    layer = path_idx.get(pattern.GfxTexture)!;

    for (let j = 3; j < 6; j++) {
      tex_coords[2 * 6 * i + 2 * j + 0] = pattern.GfxCoordsB[2 * (j - 3)] / 256;
      tex_coords[2 * 6 * i + 2 * j + 1] = pattern.GfxCoordsB[2 * (j - 3) + 1] / 256;
      layers[2 * 3 * i + j] = layer;
    }
  }

  return [tex_coords, layers];
}
