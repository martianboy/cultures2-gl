import { SequentialDataView } from '../utils/dataview';
import { read_file } from '../utils/file_reader';

import * as parsers from './map_sections/index';

type MapSectionName = keyof typeof parsers;

interface CulturesMap {
  width: number;
  height: number;
  elevation: Uint8Array;
  lighting: Uint8Array;
  tiles_index: string[];
  tiles_a: Uint16Array;
  tiles_b: Uint16Array;
}

function read_header(view: SequentialDataView) {
  return {
    tag: view.sliceAsString(8) as MapSectionName,
    unk1: view.getUint32(),
    section_length: view.getUint32(),
    unk2: view.getUint32(),
    unk3: view.getUint32(),
    unk4: view.getUint32(),
    unk5: view.getUint32(),
  };
}

export async function read_map_data(blob: Blob): Promise<CulturesMap> {
  let pointer = 0;
  // @ts-ignore
  let sections: Record<MapSectionName, any> = {};

  do {
    const buf = await read_file(blob.slice(pointer, pointer + 0x20));
    const view = new SequentialDataView(buf);
    const header = read_header(view);

    sections[header.tag] = header;
    if (parsers[header.tag]) {
      const section_blob = blob.slice(pointer + 0x20, pointer + 0x20 + header.section_length);
      sections[header.tag].content = await parsers[header.tag](section_blob);
    }

    pointer += header.section_length + 0x20;
  } while(pointer < blob.size);

  return {
    width: sections.hoixzisl.content.width,
    height: sections.hoixzisl.content.height,
    elevation: sections.hoixehml.content.data,
    lighting: sections.hoixrbme.content.data,
    tiles_index: sections.hoixdpae.content.ground_types,
    tiles_a: sections.hoixapme.content.data,
    tiles_b: sections.hoixbpme.content.data,
  };
}