import { read_file } from '../utils/file_reader';
import { SequentialDataView } from '../utils/dataview';

export interface RGBColor {
  red: number;
  green: number;
  blue: number;
}

function read_palette(view: SequentialDataView) {
  let palette: RGBColor[] = [];

  for (let i = 0; i < 256; i++) {
    palette.push({
      red: view.getUint8(),
      green: view.getUint8(),
      blue: view.getUint8(),
    });
  }

  return palette;
}

function read_header(view: SequentialDataView) {
  return {
    magic: view.getUint8(),
    version: view.getUint8(),
    encoding_method: view.getUint8(),
    bits_per_pixel: view.getUint8(),
    x0: view.getUint16(),
    y0: view.getUint16(),
    x1: view.getUint16(),
    y1: view.getUint16(),
    h_dpi: view.getUint16(),
    v_dpi: view.getUint16(),
    palette: view.slice(48),
    reserved: view.getUint8(),
    color_planes: view.getUint8(),
    bytes_per_color_plane: view.getUint16(),
    palette_type: view.getUint16(),
    h_res: view.getUint16(),
    v_res: view.getUint16(),
    reserved_block: view.slice(54),
  }
}

function read_pixels(view: SequentialDataView, width: number, height: number) {
  let pixels = new Uint8Array(new ArrayBuffer(width * height));
  let i = 0;

  while (i < width * height) {
    let val = view.getUint8();
    let len = 1;

    if (val > 192) {
      len = val - 192;
      val = view.getUint8();
    }

    for (; len > 0; len--) {
      pixels[i++] = val;
    }
  }

  return pixels;
}

export async function pcx_read_palette(blob: Blob) {
  const buf = await read_file(blob.slice(blob.size - 768));
  const view = new SequentialDataView(buf);

  return read_palette(view);
}

export async function pcx_read(blob: Blob, mask?: Blob): Promise<ImageData> {
  const buf = await read_file(blob);
  const view = new SequentialDataView(buf);
  const header = read_header(view);
  const width = header.x1 - header.x0 + 1;
  const height = header.y1 - header.y0 + 1;

  const pixels = read_pixels(view, width, height);
  let palette = undefined;

  const extended_palette_indicator = view.getUint8();
  if (extended_palette_indicator === 0x0C) {
    palette = read_palette(view);
  } else {
    throw new Error('Palette could not be found.');
  }

  let alpha = new Uint8Array(width * height).fill(0xFF);
  if (mask) {
    const mask_buf = await read_file(mask);
    const mask_view = new SequentialDataView(mask_buf);
    mask_view.skip(0x80);
    alpha = read_pixels(mask_view, width, height);
  }

  const img = new ImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    img.data[4 * i + 0] = palette[pixels[i]].red;
    img.data[4 * i + 1] = palette[pixels[i]].green;
    img.data[4 * i + 2] = palette[pixels[i]].blue;
    img.data[4 * i + 3] = alpha[i];
  }

  return img;
}
