import { CulturesFS } from "../cultures/fs";
import { CulturesRegistry, PatternTransition, GfxPalette256, GfxLandscape } from "../cultures/registry";
import { read_file } from '../utils/file_reader';
import { pcx_read } from './pcx';
import { read_map_data } from './map';

import {uniq, uniqBy} from 'lodash-es';

import { WorkerPool } from '../utils/worker_pool';

// eslint-disable-next-line import/no-webpack-loader-syntax
const worker = require('workerize-loader!./rm.worker');

export class CulturesResourceManager {
  fs: CulturesFS;
  registry: CulturesRegistry;
  // worker_pool: WorkerPool;
  private pattern_cache: Map<string, Promise<ImageData>> = new Map();

  constructor(fs: CulturesFS, registry: CulturesRegistry) {
    this.fs = fs;
    // this.worker_pool = new WorkerPool(worker, 10);
    this.registry = registry;
  }

  async load_pattern(name: string): Promise<ImageData> {
    const path = this.registry.patterns.get(name).GfxTexture;
    const cache = this.pattern_cache.get(path);
    if (cache) return cache;

    const blob = this.fs.open(path);
    const img_p = pcx_read(blob);

    this.pattern_cache.set(path, img_p);

    return img_p;
  }

  async load_landscape_bmd() {
    const { create_bmd_texture_array } = await import('cultures2-wasm');

    console.time('load_landscape_bmd');

    const ENABLED_BMDS = [
      "ls_trees.bmd",
      "ls_ground.bmd",
      "ls_harbour.bmd",
      "ls_bridge.bmd",
      "ls_chest.bmd",
      "ls_goods.bmd",
      "ls_mushrooms.bmd",
      "ls_trees_dead.bmd",
      "ls_stonehenge.bmd",
      "ls_statues.bmd",
      "ls_misc.bmd",
      "ls_caves.bmd",
      "ls_beduines.bmd",
    ];
    const landscapes = Array.from(this.registry.landscapes.values()).filter(lnd => ENABLED_BMDS.some(p => lnd.GfxBobLibs.bmd.endsWith(p)));
    const paths = uniqBy(landscapes.map(p => p.GfxBobLibs), p => p.bmd);
    // @ts-ignore
    const paths_index: Record<string, number> = Object.fromEntries(Object.entries(paths).map(([k, v]) => [v.bmd, parseInt(k)]));
    landscapes.sort((l1, l2) => paths_index[l1.GfxBobLibs.bmd] - paths_index[l2.GfxBobLibs.bmd]);

    const palette_paths = uniq(Array.from(this.registry.palettes.values())).map(p => p.gfxfile);
    const palettes_index = Object.fromEntries(Object.entries(palette_paths).map(([k, v]) => [v, parseInt(k)]));

    // Frame instances per BMD file
    let bmd_frame_instances = new Map<number, Set<number>>(paths.map(p => [paths_index[p.bmd], new Set()]));
    for (const lnd of landscapes) {
      let c = bmd_frame_instances.get(paths_index[lnd.GfxBobLibs.bmd])!;
      let pal = palettes_index[this.registry.palettes.get(lnd.GfxPalette[0])!.gfxfile];

      for (const level of Object.keys(lnd.GfxFrames)) {
        for (const f of lnd.GfxFrames[parseInt(level)]) {
          c.add(f * 1000 + pal);
        }
      }
    }

    let bmd_frame_instance_count = [...bmd_frame_instances.values()].reduce((s, c) => s + c.size, 0);
    const frame_palette_index = new Uint32Array(paths.length * 2 + 2 * bmd_frame_instance_count);
    frame_palette_index.set(Array.from(bmd_frame_instances.entries()).sort((a, b) => paths_index[a[0]] - paths_index[b[0]]).map(a => a[1].size));

    // start after bmd_frame_instance_count table
    let frame_palette_index_ptr = paths.length;
    const layers_index = new Map<number, number>();
    const bmd_frame_ptr = new Map<number, number>();

    for (const [path_idx, frame_instances] of bmd_frame_instances.entries()) {
      for (const fi of frame_instances) {
        let pal = fi % 1000;
        let f = Math.floor(fi / 1000);

        frame_palette_index.set([
          f,
          pal,
        ], frame_palette_index_ptr);
        frame_palette_index_ptr += 2;

        const layer = bmd_frame_ptr.get(path_idx) || 0;
        layers_index.set(path_idx * 1000000 + fi, layer);
        bmd_frame_ptr.set(path_idx, layer + 1);
      }
    }

    const bmd_tables = paths.reduce<{ index: Uint32Array; has_shadow: Uint8Array; acc_length: number; acc_frames: number; }>((s, path, i) => {
      const bob_stats = this.fs.stats(path.bmd);
      const shadow_stats = path.shadow ? this.fs.stats(path.shadow) : null;

      s.index[i] = s.acc_length;
      s.has_shadow[i] = shadow_stats ? 1 : 0;
      s.acc_length += bob_stats.length + (shadow_stats ? shadow_stats.length : 0);

      return s;
    }, {
      index: new Uint32Array(paths.length),
      has_shadow: new Uint8Array(paths.length),
      acc_length: 0,
      acc_frames: 0,
    });

    const palette_tables = palette_paths.reduce<{ index: Uint32Array; acc_length: number }>((s, path, i) => {
      const stats = this.fs.stats(path);

      s.index[i] = s.acc_length;
      s.acc_length += stats.length;

      return s;
    }, {
      index: new Uint32Array(palette_paths.length),
      acc_length: 0,
    });

    const buf = new Uint8Array(bmd_tables.acc_length);

    await Promise.all(paths.map(async (path, i) => {
      const blob = this.fs.open(path.bmd);
      const bmd_buf = await read_file(blob);
      buf.set(new Uint8Array(bmd_buf), bmd_tables.index[i]);

      if (path.shadow) {
        const shadow = this.fs.open(path.shadow);
        const shadow_buf = await read_file(shadow);
        buf.set(new Uint8Array(shadow_buf), bmd_tables.index[i] + bmd_buf.byteLength);
      }
    }));

    await Promise.all(paths.map(async (path, i) => {
      const blob = this.fs.open(path.bmd);
      const bmd_buf = await read_file(blob);
      buf.set(new Uint8Array(bmd_buf), bmd_tables.index[i]);

      if (path.shadow) {
        const shadow = this.fs.open(path.shadow);
        const shadow_buf = await read_file(shadow);
        buf.set(new Uint8Array(shadow_buf), bmd_tables.index[i] + bmd_buf.byteLength);
      }
    }));

    const palettes_buf = new Uint8Array(palette_tables.acc_length);

    await Promise.all(palette_paths.map(async (path, i) => {
      const blob = this.fs.open(path);

      const buf = await read_file(blob);
      palettes_buf.set(new Uint8Array(buf), palette_tables.index[i]);
    }));
    console.timeEnd('load_landscape_bmd');

    let res_buf = create_bmd_texture_array(
      buf,
      palettes_buf,
      bmd_tables.index,
      new Uint32Array(Array.from(bmd_frame_ptr.entries()).sort((a, b) => paths_index[a[0]] - paths_index[b[0]]).map(a => a[1])),
      bmd_tables.has_shadow,
      palette_tables.index,
      frame_palette_index
    );

    return {
      layers_index,
      paths_index,
      palettes_index,
      buf: res_buf
    };
  }

  async load_all_patterns(): Promise<{ paths: string[]; image: ImageData; }> {
    const { create_2d_texture } = await import('cultures2-wasm');
    const paths = uniq(Array.from(this.registry.patterns.values()).map(p => p.GfxTexture));

    const index_tables = paths.reduce<{ index: Uint32Array; acc_length: number }>((s, path, i) => {
      const stats = this.fs.stats(path);

      s.index[i] = s.acc_length;
      s.acc_length += stats.length;

      return s;
    }, {
      index: new Uint32Array(paths.length),
      acc_length: 0,
    });

    const buf = new Uint8Array(index_tables.acc_length);

    await Promise.all(paths.map(async (path, i) => {
      const blob = this.fs.open(path);

      const tex_buf = await read_file(blob);
      buf.set(new Uint8Array(tex_buf), index_tables.index[i]);
    }));
    const img_buf = create_2d_texture(256, 256, buf, index_tables.index);
    const result = new ImageData(Uint8ClampedArray.from(img_buf), 256);

    return {
      paths,
      image: result
    };
  }

  async load_all_pattern_transitions(): Promise<{ paths: string[]; image: ImageData; }> {
    const { create_2d_texture_masked } = await import('cultures2-wasm');

    const transitions = new Map<string, PatternTransition>();
    for (const tr of this.registry.pattern_transitions.values()) {
      if (transitions.has(tr.GfxTexture)) continue;
      transitions.set(tr.GfxTexture, tr);
    }

    const paths = Array.from(transitions.keys());
    const index_tables = paths.reduce<{ index: Uint32Array; mask_index: Uint32Array; acc_length: number }>((s, path, i) => {
      const texture_stats = this.fs.stats(path);
      const mask_stats = this.fs.stats(transitions.get(path)!.GfxTextureAlpha);

      s.index[i] = s.acc_length;
      s.mask_index[i] = s.acc_length + texture_stats.length;
      s.acc_length += texture_stats.length + mask_stats.length;

      return s;
    }, {
      index: new Uint32Array(paths.length),
      mask_index: new Uint32Array(paths.length),
      acc_length: 0,
    });

    const buf = new Uint8Array(index_tables.acc_length);

    await Promise.all(paths.map(async (path, i) => {
      const blob = this.fs.open(path);
      const mask = this.fs.open(transitions.get(path)!.GfxTextureAlpha);

      return Promise.all([
        read_file(blob).then(tex_buf => buf.set(new Uint8Array(tex_buf), index_tables.index[i]), ex => Promise.reject(ex)),
        read_file(mask).then(mask_buf => buf.set(new Uint8Array(mask_buf), index_tables.mask_index[i]), ex => Promise.reject(ex)),
      ]);
    }));

    const img_buf = create_2d_texture_masked(256, 256, buf, index_tables.index, index_tables.mask_index);
    const result = new ImageData(Uint8ClampedArray.from(img_buf), 256);

    return {
      paths,
      image: result
    };
  }

  async load_map(path: string) {
    const blob = this.fs.open(path);
    return read_map_data(blob);
  }
}
