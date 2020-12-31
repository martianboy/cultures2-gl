import groupBy from 'lodash-es/groupBy';

import { CulturesFS } from "./fs";
import { read_cif } from "./cif";
import { read_map_data } from './map';

export class Campaign {
  constructor(private fs: CulturesFS) {}

  async *list() {
    for (const fi of this.fs.ls()) {
      if (fi.path.match(/^data\\maps\\campaign_\d\d_\d\d\\map.dat$/)) {
        const path = fi.path.replace(/map\.dat$/, '');

        yield await this.parse_map_cif(path);
      }
    }
  }

  async load_campaign(base_path: string) {
    const dat_path = base_path + 'map.dat';

    return {
      base_path,
      map_data: await read_map_data(this.fs.open(dat_path)),
      ...(await this.parse_map_cif(base_path))
    };
  }

  private async parse_map_cif(base_path: string) {
    const cif_path = base_path + 'map.cif';
    const strings_path = base_path + 'text\\eng\\strings.cif';

    const map_cif = await read_cif(this.fs.open(cif_path));
    const strings_cif = await read_cif(this.fs.open(strings_path));

    const by_section = groupBy(map_cif, 'name');
    const misc_mapname = by_section.misc_mapname;
    const { mapnamestringid, mapdescriptionstringid } = misc_mapname[0].def!;

    let misc_startpositions = by_section.misc_startpositions;
    const start_position = misc_startpositions ? misc_startpositions[0].def!.startposition[0] : undefined;

    return {
      name: strings_cif[0].def.stringn[mapnamestringid],
      description: strings_cif[0].def.stringn[mapdescriptionstringid],
      start_position,
    };
  }
}
