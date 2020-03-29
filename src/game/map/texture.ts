import { CulturesMapData } from "../../cultures/map";
import { CulturesRegistry } from "../../cultures/registry";

export function triACoords(i: number, w: number): [number, number, number] {
  let row = Math.floor(i / w);

  return [
    i,
    i + w + (row % 2),
    i + w + (row % 2) - 1,
  ];
}

export function triBCoords(i: number, w: number): [number, number, number] {
  let row = Math.floor(i / w);

  return [
    i,
    i + 1,
    i + w + (row % 2),
  ];
}

function brightnessAtTriA(i: number, map_data: CulturesMapData): [number, number, number] {
  let row = Math.floor(i / map_data.width);
  let col = i % map_data.width;
  let lighting = map_data.lighting;

  if (row < 1 || row >= map_data.height - 1 || col < 1 || col >= map_data.width - 1) {
    return [0, 0, 0];
  }

  const coords = triACoords(i, map_data.width);
  return [
    (lighting[coords[0]] - 0x7F) / 256 + 1,
    (lighting[coords[1]] - 0x7F) / 256 + 1,
    (lighting[coords[2]] - 0x7F) / 256 + 1,
  ];
}

function brightnessAtTriB(i: number, map_data: CulturesMapData): [number, number, number] {
  let row = Math.floor(i / map_data.width);
  let col = i % map_data.width;
  let lighting = map_data.lighting;

  if (row < 1 || row >= map_data.height - 1 || col < 1 || col >= map_data.width - 1) {
    return [0, 0, 0];
  }

  const coords = triBCoords(i, map_data.width);
  return [
    (lighting[coords[0]] - 0x7F) / 256 + 1,
    (lighting[coords[1]] - 0x7F) / 256 + 1,
    (lighting[coords[2]] - 0x7F) / 256 + 1,
  ];
}

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

    let brightness_a = brightnessAtTriA(i, map);
    for (let j = 0; j < 3; j++) {
      tex_coords[2 * 6 * i + 2 * j + 0] = pattern.GfxCoordsA[2 * j] / 256;
      tex_coords[2 * 6 * i + 2 * j + 1] = pattern.GfxCoordsA[2 * j + 1] / 256;
      layers[2 * 3 * i + j] = layer;
      brightness[2 * 3 * i + j] = brightness_a[j];
    }

    tile_name = dp[bp[i]];
    pattern = registry.patterns.get(tile_name);
    layer = path_idx.get(pattern.GfxTexture)!;

    let brightness_b = brightnessAtTriB(i, map);
    for (let j = 3; j < 6; j++) {
      tex_coords[2 * 6 * i + 2 * j + 0] = pattern.GfxCoordsB[2 * (j - 3)] / 256;
      tex_coords[2 * 6 * i + 2 * j + 1] = pattern.GfxCoordsB[2 * (j - 3) + 1] / 256;
      layers[2 * 3 * i + j] = layer;
      brightness[2 * 3 * i + j] = brightness_b[j - 3];
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
