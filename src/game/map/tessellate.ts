function triA(x: number, y: number) {
  const off = (y % 2 === 1) ? 1 : 0;

  return [
    2 * x + 0 + off, y - 1,
    2 * x + 1 + off, y,
    2 * x - 1 + off, y
  ].map(x => x / 2);
}

function triB(x: number, y: number) {
  const off = (y % 2 === 1) ? 1 : 0;

  return [
    2 * x + off, y - 1,
    2 * (x + 1) + off,       y - 1,
    2 * x + 1 + off,   y - 0
  ].map(x => x / 2);
}

export function triangulate_map(width: number, height: number) {
  let map: number[][] = Array(width * height * 2 + height);
  let a_or_b = false;

  for (let i = 0; i < width * height * 2 + height; i++, a_or_b = !a_or_b) {
    const row = Math.floor(i / (2 * width + 0));
    const col = Math.floor((i % (2 * width + 0)) / 2);

    if (a_or_b) {
      map[i] = triB(col, row);
    } else {
      map[i] = triA(col, row);
    }
  }

  // for (let i = 0; i <= height; i++) {
  //   for (let j = 0; j <= width; j++) {
  //     if (i % 2 === 0 || j < width) map[i * 2 * (width + 1) + 2 * j] = triA(j, i);
  //     if (i % 2 === 1 || j < width) map[i * 2 * (width + 1) + 2 * j + 1] = triB(j, i);
  //   }
  // }

  return map.flat();
}
