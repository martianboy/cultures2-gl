import { CulturesFS } from "../cultures/fs";
import { CulturesRegistry } from "../cultures/registry";
import { pcx_read } from './pcx';

export class CulturesResourceManager {
  fs: CulturesFS;
  registry: CulturesRegistry;
  private pattern_cache: Map<string, Promise<ImageData>> = new Map();

  constructor(fs: CulturesFS, registry: CulturesRegistry) {
    this.fs = fs;
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
}
