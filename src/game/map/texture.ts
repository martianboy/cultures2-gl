import { CulturesMapData } from "../../cultures/map";
import { CulturesRegistry } from "../../cultures/registry";

export function get_texture_buf(
  map: CulturesMapData,
  paths: string[],
  transition_paths: string[],
  registry: CulturesRegistry
): [Float32Array, Float32Array, Float32Array, Float32Array, Float32Array, Float32Array, Float32Array] {
  let length = map.width * map.height;
  const ap = map.tiles_a;
  const bp = map.tiles_b;
  const at1 = map.trans_a1;
  const bt1 = map.trans_b1;
  const at2 = map.trans_a2;
  const bt2 = map.trans_b2;

  const dp = map.tiles_index;
  const dt = map.transitions_index;

  let brightness = new Float32Array(length * 2 * 3);
  let layers = new Float32Array(length * 2 * 3);
  let transition_layers1 = new Float32Array(length * 2 * 3).fill(-1);
  let transition_layers2 = new Float32Array(length * 2 * 3).fill(-1);
  let tex_coords = new Float32Array(length * 2 * 2 * 3);
  let trans_coords1 = new Float32Array(length * 2 * 2 * 3).fill(0);
  let trans_coords2 = new Float32Array(length * 2 * 2 * 3).fill(0);

  const path_idx = new Map(paths.map((p, i) => [p, i]));
  const transition_path_idx = new Map(transition_paths.map((t, i) => [t, i]));

  for (let i = 0; i < length; i++) {
    let tile_name = dp[ap[i]];
    let pattern = registry.patterns.get(tile_name);
    let layer = path_idx.get(pattern.GfxTexture)!;

    if (at1[i] < 255) {
//       debugger;
      let transition_name = dt[Math.floor(at1[i] / 6)];
      let transition_type = at1[i] % 6;

      let transition = registry.pattern_transitions.get(transition_name)!;
      let transition_layer = transition_path_idx.get(transition.GfxTexture)!;

      for (let j = 0; j < 3; j++) {
        trans_coords1[2 * 6 * i + 2 * j + 0] = transition.GfxCoordsA[transition_type][2 * j] / 256;
        trans_coords1[2 * 6 * i + 2 * j + 1] = transition.GfxCoordsA[transition_type][2 * j + 1] / 256;
        transition_layers1[2 * 3 * i + j] = transition_layer;
      }
    }

    if (bt1[i] < 255) {
      let transition_name = dt[Math.floor(bt1[i] / 6)];
      let transition_type = bt1[i] % 6;

      let transition = registry.pattern_transitions.get(transition_name)!;
      let transition_layer = transition_path_idx.get(transition.GfxTexture)!;

      for (let j = 3; j < 6; j++) {
        trans_coords1[2 * 6 * i + 2 * j + 0] = transition.GfxCoordsB[transition_type][2 * (j - 3)] / 256;
        trans_coords1[2 * 6 * i + 2 * j + 1] = transition.GfxCoordsB[transition_type][2 * (j - 3) + 1] / 256;
        transition_layers1[2 * 3 * i + j] = transition_layer;
      }
    }

    if (at2[i] < 255) {
      let transition_name = dt[Math.floor(at2[i] / 6)];
      let transition_type = at2[i] % 6;

      let transition = registry.pattern_transitions.get(transition_name)!;
      let transition_layer = transition_path_idx.get(transition.GfxTexture)!;

      for (let j = 0; j < 3; j++) {
        trans_coords2[2 * 6 * i + 2 * j + 0] = transition.GfxCoordsA[transition_type][2 * j] / 256;
        trans_coords2[2 * 6 * i + 2 * j + 1] = transition.GfxCoordsA[transition_type][2 * j + 1] / 256;
        transition_layers2[2 * 3 * i + j] = transition_layer;
      }
    }

    if (bt2[i] < 255) {
      let transition_name = dt[Math.floor(bt2[i] / 6)];
      let transition_type = bt2[i] % 6;

      let transition = registry.pattern_transitions.get(transition_name)!;
      let transition_layer = transition_path_idx.get(transition.GfxTexture)!;

      for (let j = 3; j < 6; j++) {
        trans_coords2[2 * 6 * i + 2 * j + 0] = transition.GfxCoordsB[transition_type][2 * (j - 3)] / 256;
        trans_coords2[2 * 6 * i + 2 * j + 1] = transition.GfxCoordsB[transition_type][2 * (j - 3) + 1] / 256;
        transition_layers2[2 * 3 * i + j] = transition_layer;
      }
    }

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

    tile_name = dp[bp[i]];
    pattern = registry.patterns.get(tile_name);
    layer = path_idx.get(pattern.GfxTexture)!;

    for (let j = 3; j < 6; j++) {
      tex_coords[2 * 6 * i + 2 * j + 0] = pattern.GfxCoordsB[2 * (j - 3)] / 256;
      tex_coords[2 * 6 * i + 2 * j + 1] = pattern.GfxCoordsB[2 * (j - 3) + 1] / 256;
      layers[2 * 3 * i + j] = layer;
      brightness[2 * 3 * i + j] = brightness_b > 1.5 ? 0.5 : brightness_b;
    }
  }

  return [
    tex_coords,
    brightness,
    layers,
    trans_coords1,
    transition_layers1,
    trans_coords2,
    transition_layers2,
  ];
}
