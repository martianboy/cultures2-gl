export class SequentialDataView {
  view: DataView;
  position: number;
  decoder: TextDecoder;

  constructor(buf: ArrayBuffer, byteOffset?: number, byteLength?: number) {
    this.view = new DataView(buf, byteOffset, byteLength);
    this.position = 0;
    this.decoder = new TextDecoder('ascii');
  }

  get buffer() {
    return this.view.buffer;
  }

  get eof() {
    return this.position >= this.buffer.byteLength;
  }

  seek(position: number) {
    this.position = position;
  }

  skip(offset: number) {
    this.position += offset;
  }

  slice(length?: number) {
    if (length) {
      const val = this.view.buffer.slice(this.position, this.position + length);
      this.seek(Math.min(this.position + length, this.view.byteLength));
      return val;
    } else {
      const val = this.view.buffer.slice(this.position);
      this.seek(this.view.byteLength);
      return val;
    }
  }

  sliceView(length?: number) {
    return new SequentialDataView(this.buffer, this.position, length);
  }

  getUint8() {
    const val = this.view.getUint8(this.position);
    this.position += 1;
    return val;
  }

  getUint16() {
    const val = this.view.getUint16(this.position, true);
    this.position += 2;
    return val;
  }

  getUint32() {
    const val = this.view.getUint32(this.position, true);
    this.position += 4;
    return val;
  }

  sliceAsString(length: number) {
    const bytes = this.view.buffer.slice(this.position, this.position + length);
    this.position += length;
    return this.decoder.decode(bytes);
  }

  getString() {
    let length = this.getUint32();
    return this.sliceAsString(length);
  }

  getShortString() {
    let length = this.getUint8();
    return this.sliceAsString(length);
  }

  getZeroTerminatedString() {
    const pos = this.position;
    let i = 0;
    for (let b = this.view.getUint8(pos); b !== 0; b = this.view.getUint8(pos + i), i++);

    const string = this.sliceAsString(i - 1);
    this.skip(1);
    return string;
  }

  transform(fn: (b: number) => number) {
    for (let i = 0; i < this.view.byteLength; i++) {
      const val = fn(this.view.getUint8(this.position + i));
      this.view.setUint8(this.position + i, val);
    }
  }
}