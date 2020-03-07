import { CulturesMapData } from "../../cultures/map";

function triA(i: number, map_data: CulturesMapData) {
  const y = Math.floor(i / (2 * map_data.width + 0));
  const x = Math.floor((i % (2 * map_data.width + 0)) / 2);
  const ei = y * map_data.width + x;

  const off = y % 2;
  const elv = elevationAtTriA(ei, map_data);

  return [
    2 * x + 0 + off, y - elv[0] - 1,
    2 * x + 1 + off, y - elv[1],
    2 * x - 1 + off, y - elv[2]
  ].map(x => x / 2);
}

function triB(i: number, map_data: CulturesMapData) {
  const y = Math.floor(i / (2 * map_data.width + 0));
  const x = Math.floor((i % (2 * map_data.width + 0)) / 2);
  const ei = y * map_data.width + x;

  const off = y % 2;
  const elv = elevationAtTriB(ei, map_data);

  return [
    2 * x + 0 + off, y - elv[0] - 1,
    2 * x + 2 + off, y - elv[1] - 1,
    2 * x + 1 + off, y - elv[2] - 0
  ].map(x => x / 2);
}

function triACoords(i: number, w: number): [number, number, number] {
  let row = Math.floor(i / w);

  if (i === 152) debugger;

  return [
    i,
    i + w + (row % 2),
    i + w + (row % 2) - 1,
  ];
}

function triBCoords(i: number, w: number): [number, number, number] {
  let row = Math.floor(i / w);

  return [
    i,
    i + 1,
    i + w + (row % 2),
  ];
}

function elevationAtTriA(i: number, map_data: CulturesMapData): [number, number, number] {
  let row = Math.floor(i / map_data.width);
  let col = i % map_data.width;
  let elv = map_data.elevation;

  if (row === 0 || row === map_data.height - 1 || col === 0 || col === map_data.width - 1) {
    return [0, 0, 0];
  }

  const coords = triACoords(i, map_data.width);
  return [
    elv[coords[0]] / 25,
    elv[coords[1]] / 25,
    elv[coords[2]] / 25,
  ];
}

function elevationAtTriB(i: number, map_data: CulturesMapData): [number, number, number] {
  let row = Math.floor(i / map_data.width);
  let col = i % map_data.width;
  let elv = map_data.elevation;

  if (row === 0 || row === map_data.height - 1 || col === 0 || col === map_data.width - 1) {
    return [0, 0, 0];
  }

  const coords = triBCoords(i, map_data.width);
  return [
    elv[coords[0]] / 25,
    elv[coords[1]] / 25,
    elv[coords[2]] / 25,
  ];
}

export function triangulate_map(map_data: CulturesMapData) {
  const { width, height } = map_data;
  let map: number[][] = Array(width * height * 2);
  let a_or_b = false;

  for (let i = 0; i < width * height * 2; i++, a_or_b = !a_or_b) {
    if (a_or_b) {
      map[i] = triB(i, map_data);
    } else {
      map[i] = triA(i, map_data);
    }
  }

  return map.flat();
}
