import { SequentialDataView } from '../../utils/dataview';
import { read_file } from '../../utils/file_reader';

/**
 * @param {Blob} blob 
 */
export async function raw(blob) {
  const buf = await read_file(blob);

  const view = new SequentialDataView(buf);

  const content = {
    unk1: view.getUint8(),
    data_len: view.getUint32(), // = header.section_length - 5
    unk_magic: view.sliceAsString(8),
    length: view.getUint32() / 2, // width * height
    unk_len_dup: view.getUint32(), // = header.section_length - 5
    /** @type {Uint8Array=} */
    data: undefined,
    range: new Set(),
  };

  content.data = view.slice(content.data_len);

  return content;
}
