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

export interface GfxLandscape {
  EditName: string,
  EditGroups: string[],
  LogicType: number,
  LogicMaximumValency: number,
  LogicIsWorkable: boolean,
  logicispileableonmap: boolean,
  LogicWalkBlockArea: number[][],
  LogicBuildBlockArea: number[][],
  LogicWorkArea: number[][],
  GfxBobLibs: { bmd: string; shadow?: string },
  GfxPalette: string[],
  GfxFrames: Record<number, number[]>,
  GfxStatic: boolean,
  GfxLoopAnimation: boolean,
  GfxShadingFactor: number,
  GfxUserFXMatrix: number,
  GfxDynamicBackground: boolean,
  gfxdrawvoidever: boolean,
  GfxTransition: Record<number, string>,
}

export interface GfxPalette256 {
  editname: string;
  gfxfile: string;
  gfxpreshade: boolean;
}

export class CulturesRegistry {
  fs: CulturesFS;
  palettes: Map<string, GfxPalette256>;
  landscapes: Map<string, GfxLandscape> = new Map();
  patterns: Map<any, any>;
  pattern_transitions: Map<string, PatternTransition> = new Map();
  landscape_types: Map<any, any>;
  animals: Set<unknown>;

  constructor(fs: CulturesFS) {
    this.fs = fs;

    this.palettes = new Map();
    this.patterns = new Map();
    this.landscape_types = new Map();
    this.animals = new Set();
  }

  async load_palettes() {
    const PATH = 'data\\engine2d\\inis\\palettes\\palettes.cif';
    const cif = await read_cif(this.fs.open(PATH));

    for (const section of cif) {
      if (section.name === 'GfxPalette256') {
        this.palettes.set(section.def.editname, section.def);
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
      if (section.name === 'GfxLandscape' && section.def.GfxPalette) {
        if (!section.def.GfxFrames) {
          section.def.GfxFrames = { 0: [0] };
        }
        this.landscapes.set(section.def.EditName, section.def);
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
