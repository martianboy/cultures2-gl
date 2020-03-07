import { CulturesMapData } from "../../cultures/map";
import { CulturesRegistry } from "../../cultures/registry";

export function get_texture_buf(
  map: CulturesMapData,
  paths: string[],
  registry: CulturesRegistry
): [Float32Array, Float32Array, Float32Array] {
  let length = map.width * map.height;
  const at = map.tiles_a;
  const bt = map.tiles_b;
  const tm = map.tiles_index;

  let brightness = new Float32Array(length * 2 * 3);
  let layers = new Float32Array(length * 2 * 3);
  let tex_coords = new Float32Array(length * 2 * 2 * 3);

  const path_idx = new Map(paths.map((p, i) => [p, i]));

  for (let i = 0; i < length; i++) {
    let tile_name = tm[at[i]];
    let pattern = registry.patterns.get(tile_name);
    let layer = path_idx.get(pattern.GfxTexture)!;

    let brightness_a, brightness_b;
    let row = Math.floor(i / map.width);
    let col = i % map.width;

    if (row % 2 === 0) {
      if (map.lighting[i] > 0) {
        brightness_a = (map.lighting[i] - 0x7F) / 256 + 1;
        brightness_b = (map.lighting[i] - 0x7F) / 256 + 1;
      } else if (row === 0 || row === map.height - 1 || col === 0 || col === map.width - 1) {
        brightness_a = 0.5;
        brightness_b = 0.5;
      } else {
        brightness_a = (Math.min(map.lighting[i + map.width] || 0x1000, map.lighting[i + map.width - 1] || 0x1000) - 0x7F) / 256 + 1;
        brightness_b = (Math.min(map.lighting[i + map.width] || 0x1000, map.lighting[i + 1] || 0x1000) - 0x7F) / 256 + 1;
      }
    } else {
      if (map.lighting[i] > 0) {
        brightness_a = (map.lighting[i] - 0x7F) / 256 + 1;
        brightness_b = (map.lighting[i] - 0x7F) / 256 + 1;
      } else if (row === 0 || row === map.height - 1 || col === 0 || col === map.width - 1) {
        brightness_a = 0.5;
        brightness_b = 0.5;
      } else {
        brightness_a = (Math.min(map.lighting[i + map.width] || 0x1000, map.lighting[i + map.width + 1] || 0x1000) - 0x7F) / 256 + 1;
        brightness_b = (Math.min(map.lighting[i + map.width + 1] || 0x1000, map.lighting[i + 1] || 0x1000) - 0x7F) / 256 + 1;
      }
    }

    for (let j = 0; j < 3; j++) {
      tex_coords[2 * 6 * i + 2 * j + 0] = pattern.GfxCoordsA[2 * j] / 256;
      tex_coords[2 * 6 * i + 2 * j + 1] = pattern.GfxCoordsA[2 * j + 1] / 256;
      layers[2 * 3 * i + j] = layer;
      brightness[2 * 3 * i + j] = brightness_a > 1.5 ? 0.5 : brightness_a;
    }

    tile_name = tm[bt[i]];
    pattern = registry.patterns.get(tile_name);
    layer = path_idx.get(pattern.GfxTexture)!;

    for (let j = 3; j < 6; j++) {
      tex_coords[2 * 6 * i + 2 * j + 0] = pattern.GfxCoordsB[2 * (j - 3)] / 256;
      tex_coords[2 * 6 * i + 2 * j + 1] = pattern.GfxCoordsB[2 * (j - 3) + 1] / 256;
      layers[2 * 3 * i + j] = layer;
      brightness[2 * 3 * i + j] = brightness_b > 1.5 ? 0.5 : brightness_b;
    }
  }

  return [tex_coords, brightness, layers];
}
