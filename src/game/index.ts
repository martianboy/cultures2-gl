import { CulturesFS } from "../cultures/fs";
import { load_registry } from "../cultures/registry";
import { CulturesResourceManager } from '../cultures/resource_manager';
import { load_map, load_user_map } from './map';

export class CulturesGame {
  private fs: CulturesFS;
  private resource_manager: CulturesResourceManager;
  private canvas: HTMLCanvasElement;

  constructor(fs: CulturesFS, canvas: HTMLCanvasElement, resource_manager: CulturesResourceManager) {
    this.fs = fs;
    this.resource_manager = resource_manager;
    this.canvas = canvas;
  }
}

export async function createGame(fs: CulturesFS, canvas: HTMLCanvasElement, custom_map?: CulturesFS) {
  const registry = await load_registry(fs);
  const resource_manager = new CulturesResourceManager(fs, registry);

  canvas.width = document.documentElement.clientWidth;
  canvas.height = document.documentElement.clientHeight;

  if (custom_map) {
    const map = await load_user_map(custom_map, canvas, resource_manager);
    map.render();
  } else {
    const map = await load_map('data\\maps\\campaign_01_01\\map.dat', canvas, resource_manager);
    map.render();
  }
  // setTimeout(() => map.stop(), 2000);

  // console.log('Game initialized...');
}