function triA(i: number, width: number, height: number, elevation: Uint8Array) {
  const y = Math.floor(i / (2 * width + 0));
  const x = Math.floor((i % (2 * width + 0)) / 2);
  const ei = y * width + x;

  const off = y % 2;
  const elv = elevationAtTriA(ei, width, height, elevation);

  return [
    2 * x + 0 + off, y - elv[0] - 1,
    2 * x + 1 + off, y - elv[1],
    2 * x - 1 + off, y - elv[2]
  ].map(x => x / 2);
}

function triB(i: number, width: number, height: number, elevation: Uint8Array) {
  const y = Math.floor(i / (2 * width + 0));
  const x = Math.floor((i % (2 * width + 0)) / 2);
  const ei = y * width + x;

  const off = y % 2;
  const elv = elevationAtTriB(ei, width, height, elevation);

  return [
    2 * x + 0 + off, y - elv[0] - 1,
    2 * x + 2 + off, y - elv[1] - 1,
    2 * x + 1 + off, y - elv[2] - 0
  ].map(x => x / 2);
}

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

function elevationAtTriA(i: number, width: number, height: number, elevation: Uint8Array): [number, number, number] {
  let row = Math.floor(i / width);
  let col = i % width;
  let elv = elevation;

  if (row === 0 || row === height - 1 || col === 0 || col === width - 1) {
    return [0, 0, 0];
  }

  const coords = triACoords(i, width);
  return [
    elv[coords[0]] / 25,
    elv[coords[1]] / 25,
    elv[coords[2]] / 25,
  ];
}

function elevationAtTriB(i: number, width: number, height: number, elevation: Uint8Array): [number, number, number] {
  let row = Math.floor(i / width);
  let col = i % width;
  let elv = elevation;

  if (row === 0 || row === height - 1 || col === 0 || col === width - 1) {
    return [0, 0, 0];
  }

  const coords = triBCoords(i, width);
  return [
    elv[coords[0]] / 25,
    elv[coords[1]] / 25,
    elv[coords[2]] / 25,
  ];
}

export function triangulate_map(width: number, height: number, elevation: Uint8Array): Float32Array {
  let map: number[][] = Array(width * height * 2);
  let a_or_b = false;

  for (let i = 0; i < width * height * 2; i++, a_or_b = !a_or_b) {
    if (a_or_b) {
      map[i] = triB(i, width, height, elevation);
    } else {
      map[i] = triA(i, width, height, elevation);
    }
  }

  return new Float32Array(map.flat());
}
