import { CulturesFS } from "../cultures/fs";
import { CulturesRegistry, PatternTransition } from "../cultures/registry";
import { read_file } from '../utils/file_reader';
import { pcx_read } from './pcx';
import { read_map_data } from './map';

import { WorkerPool } from '../utils/worker_pool';

// eslint-disable-next-line import/no-webpack-loader-syntax
const worker = require('workerize-loader!./rm.worker');

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export class CulturesResourceManager {
  fs: CulturesFS;
  registry: CulturesRegistry;
  worker_pool: WorkerPool;
  private pattern_cache: Map<string, Promise<ImageData>> = new Map();

  constructor(fs: CulturesFS, registry: CulturesRegistry) {
    this.fs = fs;
    this.worker_pool = new WorkerPool(worker, 10);
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
