import { CulturesFS } from "../cultures/fs";
import { CulturesRegistry, PatternTransition } from "../cultures/registry";
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
    const paths = uniq(Array.from(this.registry.patterns.values()).map(p => p.GfxTexture));

    const images = await Promise.all(paths.map(async path => {
      const blob = this.fs.open(path);
      const result = await this.worker_pool.call<{ blob: Blob }, { width: number; height: number; data: ArrayBuffer; }>('pcx_read', {
        blob
      });

      return new ImageData(new Uint8ClampedArray(result.data), result.width, result.height);
    }));

    const height = images.reduce((r, i) => r + i.height, 0);
    const result = new ImageData(images[0].width, height);

    let offset = 0;
    for (const img of images) {
      result.data.set(img.data, offset);
      offset += img.data.byteLength;
    }

    return {
      paths,
      image: result
    };
  }

  async load_all_pattern_transitions(): Promise<{ paths: string[]; image: ImageData; }> {
    const transitions = new Map<string, PatternTransition>();
    for (const tr of this.registry.pattern_transitions.values()) {
      if (transitions.has(tr.GfxTexture)) continue;
      transitions.set(tr.GfxTexture, tr);
    }

    const paths = Array.from(transitions.keys());

    const images = await Promise.all(paths.map((path, i) => {
      const blob = this.fs.open(path);
      const mask = this.fs.open(transitions.get(path)!.GfxTextureAlpha);

      return pcx_read(blob, mask);
    }));

    const height = images.reduce((r, i) => r + i.height, 0);
    const result = new ImageData(images[0].width, height);

    let offset = 0;
    for (const img of images) {
      result.data.set(img.data, offset);
      offset += img.data.byteLength;
    }

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
