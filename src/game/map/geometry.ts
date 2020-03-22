import { m4 } from "twgl.js";

export class MapGeometry {
  public transformation: m4.Mat4;
  private base_transformation: m4.Mat4;

  public translation: [number, number, 0] = [0, 0, 0];
  public zoom_factor = 1;
  public width_unit = 34;
  public height_unit = 19.5;

  public primitive_count: number;

  constructor(
    public width: number,
    public height: number,
    public map_width: number,
    public map_height: number
  ) {
    this.base_transformation = m4.ortho(0, width, height, 0, -1, 1);
    this.base_transformation = m4.scale(this.base_transformation, [
      this.zoom_factor * this.width_unit,
      this.zoom_factor * this.height_unit,
      1
    ]);

    this.primitive_count = 2 * 3 * map_width * map_height;

    this.transformation = this.base_transformation;
  }

  translate(dx: number, dy: number) {
    this.translation[0] = Math.max(-this.map_width + this.width / this.width_unit, Math.min(dx + this.translation[0], 5));
    this.translation[1] = Math.max(-this.map_height + this.height / this.height_unit, Math.min(dy + this.translation[1], 5));

    this.transformation = m4.translate(
      this.base_transformation,
      this.translation,
    );
  }

  // get viewport() {

  // }

  slice2d(arr: Float32Array, size = 3) {
    // debugger;
    let mw = this.map_width, mh = this.map_height;

    let vw = Math.ceil((this.width / this.width_unit) / this.zoom_factor) + 1;
    let vh = 2 * Math.ceil((this.height / this.height_unit) / this.zoom_factor);

    let x0 = 2 * Math.min(Math.ceil(-this.translation[0]), mw - vw);
    let y0 = Math.min(Math.ceil(-this.translation[1]), mh - vh);
    let pos = (x0 + y0 * mw * 2) * size;

    let result = new Float32Array(2 * vw * vh * size);

    for (let i = 0; i < vh; i++) {
      result.set(arr.slice(pos, pos + 2 * vw * size), i * 2 * vw * size);
      pos += 2 * mw * size;
    }

    return result;
  }
}
