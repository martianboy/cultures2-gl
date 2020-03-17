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

    const landscapes = Array.from(this.registry.landscapes.values()).filter(lnd => lnd.GfxBobLibs.bmd.endsWith('ls_trees.bmd'));
    const paths = uniqBy(landscapes.map(p => p.GfxBobLibs), p => p.bmd);
    console.table(paths);
    // @ts-ignore
    const paths_index: Record<string, number> = Object.fromEntries(Object.entries(paths).map(([k, v]) => [v.bmd, parseInt(k)]));
    landscapes.sort((l1, l2) => paths_index[l1.GfxBobLibs.bmd] - paths_index[l2.GfxBobLibs.bmd]);

    const palette_paths = uniq(Array.from(this.registry.palettes.values())).map(p => p.gfxfile);
    const palettes_index = Object.fromEntries(Object.entries(palette_paths).map(([k, v]) => [v, parseInt(k)]));

    const frame_count_per_bob = landscapes.reduce((m, lnd) => {
      let current = m.get(lnd.GfxBobLibs.bmd) || 0;
      let max_frame = Object.entries(lnd.GfxFrames).reduce((r, [lvl, fs]) => Math.max(r, ...fs), current);

      m.set(lnd.GfxBobLibs.bmd, max_frame);
      return m;
    }, new Map<string, number>());

    const total_frames = Array.from(frame_count_per_bob.values()).reduce((s, fs) => s + fs + 1, 0);
    const frame_palette_index = new Uint32Array(total_frames);

    let frame_palette_index_ptr = 0;
    let last_bob = landscapes[0].GfxBobLibs.bmd;

    for (const lnd of landscapes) {
      if (last_bob !== lnd.GfxBobLibs.bmd) {
        last_bob = lnd.GfxBobLibs.bmd;
        frame_palette_index_ptr += frame_count_per_bob.get(last_bob)! + 1;
      }

      let pal = palettes_index[this.registry.palettes.get(lnd.GfxPalette[0])!.gfxfile];

      for (const lvl in lnd.GfxFrames) {
        for (const f of new Set(lnd.GfxFrames[lvl])) {
          frame_palette_index[frame_palette_index_ptr + f] = pal;
        }
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

    console.log(paths[24]);

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
      bmd_tables.has_shadow,
      palette_tables.index,
      frame_palette_index
    );

    return {
      paths_index,
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
