import { read_cif } from './cif';
import { CulturesFS } from './fs';

export interface PatternTransition {
  name: string;
  pointtype: string;
  GfxTexture: string;
  GfxTextureAlpha: string;
  GfxCoordsA: number[][];
  GfxCoordsB: number[][];
}

export class CulturesRegistry {
  fs: CulturesFS;
  palettes: Map<any, any>;
  landscapes: Map<any, any>;
  patterns: Map<any, any>;
  pattern_transitions: Map<string, PatternTransition> = new Map();
  landscape_types: Map<any, any>;
  animals: Set<unknown>;

  constructor(fs: CulturesFS) {
    this.fs = fs;

    this.palettes = new Map();
    this.landscapes = new Map();
    this.patterns = new Map();
    this.landscape_types = new Map();
    this.animals = new Set();
  }

  async load_palettes() {
    const PATH = 'data\\engine2d\\inis\\palettes\\palettes.cif';
    const cif = await read_cif(this.fs.open(PATH));

    for (const section of cif) {
      if (section.name === 'GfxPalette256') {
        this.palettes.set(section.def.editname, section);
      }
    }
  }

  async load_animals() {
    const PATH = 'data\\engine2d\\inis\\animals\\jobgraphics.cif';
    const cif = await read_cif(this.fs.open(PATH));

    for (const section of cif) {
      this.animals.add(section.def);
    }
  }

  async load_patterns() {
    const PATH = 'data\\engine2d\\inis\\patterns\\pattern.cif';
    const cif = await read_cif(this.fs.open(PATH));

    for (const section of cif) {
      if (section.name === 'GfxPattern') {
        this.patterns.set(section.def.EditName, section.def);
      }
    }
  }

  async load_pattern_transitions() {
    const PATH = 'data\\engine2d\\inis\\patterntransitions\\transitions.cif';
    const cif = await read_cif(this.fs.open(PATH));

    for (const section of cif) {
      if (section.name === 'transition') {
        this.pattern_transitions.set(section.def.name, section.def);
      }
    }
  }

  async load_landscapes() {
    const PATH = 'data\\engine2d\\inis\\landscapes\\landscapes.cif';
    const cif = await read_cif(this.fs.open(PATH));

    for (const section of cif) {
      if (section.name === 'GfxLandscape') {
        this.landscapes.set(section.def.EditName, section);
      }
    }
  }
}

export async function load_registry(fs: CulturesFS) {
  const registry = new CulturesRegistry(fs);

  await registry.load_palettes();
  await registry.load_patterns();
  await registry.load_pattern_transitions();
  await registry.load_landscapes();
  await registry.load_animals();

  return registry;
}
