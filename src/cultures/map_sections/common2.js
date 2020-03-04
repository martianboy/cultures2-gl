import { SequentialDataView } from '../../utils/dataview';
import { read_file } from '../../utils/file_reader';

/**
 * @param {Blob} blob 
 */
export async function common_decoding2(blob) {
  const buf = await read_file(blob);

  const view = new SequentialDataView(buf);

  const content = {
    unk1: view.getUint8(),
    unk_len: view.getUint32(), // = header.section_length - 5
    unk_magic: view.sliceAsString(8),
    length: view.getUint32() / 2, // width * height
    unk_len_dup: view.getUint32(), // = header.section_length - 5
    /** @type {Uint16Array=} */
    data: undefined,
    range: new Set()
  };  

  let count = 0;
  let data = new Uint16Array(content.length);

  while (!view.eof) {
    let head = view.getUint8();

    if (head > 0x80) {
      const value = view.getUint16();
      for (let i = 0; i < head - 0x80; i++) {
        data[count++] = value;
      }
    } else {
      for (let i = 0; i < head; i++) {
        data[count++] = view.getUint16();
      }
    }
  }

  content.data = data;

  return content;
}
