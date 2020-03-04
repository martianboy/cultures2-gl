import { SequentialDataView } from '../../utils/dataview';
import { read_file } from '../../utils/file_reader';

/**
 * @param {Blob} blob 
 */
export async function hoixocal(blob) {
  const buf = await read_file(blob);
  const view = new SequentialDataView(buf);

  const content = {
    unk: view.getUint32(),
    data: [],
  };

  let count = 0;
  let data = Array(content.length);

  while (!view.eof) {
    data.push({
      unk1: view.getUint32(),
      unk_a: view.getUint16(),
      unk_b: view.getUint16(),
      unk2: view.getUint32(),
      unk3: view.getUint32(),
    });
  }

  content.data = data;

  return content;
}
