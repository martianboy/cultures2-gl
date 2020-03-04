import { SequentialDataView } from '../../utils/dataview';
import { read_file } from '../../utils/file_reader';


/**
 * @param {Blob} blob 
 */
export async function hoixdpae(blob) {
  const buf = await read_file(blob);

  const view = new SequentialDataView(buf);

  const content = {
    len: view.getUint32(),
    ground_types: []
  };

  for (let i = 0; i < content.len; i++) {
    const str = view.getShortString();
    view.skip(1);
    content.ground_types.push(str);
  }

  return content;
}