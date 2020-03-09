import { SequentialDataView } from '../utils/dataview';
import { read_file } from '../utils/file_reader';

import * as parsers from './map_sections/index';

type MapSectionName = keyof typeof parsers;

interface IMapDataSection {
  content: any;
}

export interface CulturesMapData {
  width: number;
  height: number;
  elevation: Uint8Array;
  lighting: Uint8Array;
  tiles_index: string[];
  tiles_a: Uint16Array;
  tiles_b: Uint16Array;
  transitions_index: string[];
  trans_a1: Uint8Array;
  trans_b1: Uint8Array;
  trans_a2: Uint8Array;
  trans_b2: Uint8Array;

  landscape_index: string[];
  landscape_levels: Uint8Array;
  landscape_types: Uint16Array;

  sections: Record<keyof typeof parsers, IMapDataSection>;
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

export async function read_map_data(blob: Blob): Promise<CulturesMapData> {
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

    tiles_index: sections.hoixdpae.content.dictionary,
    tiles_a: sections.hoixapme.content.data,
    tiles_b: sections.hoixbpme.content.data,

    transitions_index: sections.hoixdtae.content.dictionary,
    trans_a1: sections.hoix1tme.content.data,
    trans_b1: sections.hoix2tme.content.data,
    trans_a2: sections.hoix3tme.content.data,
    trans_b2: sections.hoix4tme.content.data,

    landscape_index: sections.hoixdlae.content.dictionary,
    landscape_types: sections.hoixalme.content.data,
    landscape_levels: sections.hoixvlml.content.data,

    sections
  };
}