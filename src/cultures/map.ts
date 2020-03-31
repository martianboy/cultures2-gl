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
  landscape_objects(): IterableIterator<{ i: number; type: number; level: number }>;
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

function* u8_iter(buf: ArrayBuffer, nil_value: number): IterableIterator<[number, number]> {
  let view = new SequentialDataView(buf);
  let ptr = 0;

  while (!view.eof) {
    let head = view.getUint8();

    if (head > 0x80) {
      const value = view.getUint8();
      if (value !== nil_value) {
        for (let i = 0; i < head - 0x80; i++) {
          yield [ptr++, value];
        }
      } else {
        ptr += head - 0x80;
      }
    } else {
      for (let i = 0; i < head; i++) {
        const value = view.getUint8();
        if (value !== nil_value) {
          yield [ptr++, value];
        } else {
          ptr += 1;
        }
      }
    }
  }

}

function* u16_iter(buf: ArrayBuffer, nil_value: number): IterableIterator<[number, number]> {
  let view = new SequentialDataView(buf);
  let ptr = 0;

  while (!view.eof) {
    let head = view.getUint8();

    if (head > 0x80) {
      const value = view.getUint16();
      if (value !== nil_value) {
        for (let i = 0; i < head - 0x80; i++) {
          yield [ptr++, value];
        }
      } else {
        ptr += head - 0x80;
      }
    } else {
      for (let i = 0; i < head; i++) {
        const value = view.getUint16();
        if (value !== nil_value) {
          yield [ptr++, value];
        } else {
          ptr += 1;
        }
      }
    }
  }

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
    landscape_objects: function* () {
      let alme_iter = u16_iter(sections.hoixalme.content.data, 0xFFFF);

      for (;;) {
        let alme_next = alme_iter.next();

        if (alme_next.done) return;

        yield {
          i: alme_next.value[0],
          type: alme_next.value[1],
          level: sections.hoixvlml.content.data[alme_next.value[0]],
        };
      }
    },

    landscape_types: sections.hoixalme.content.data,
    landscape_levels: sections.hoixvlml.content.data,

    sections
  };
}