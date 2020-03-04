import { CulturesFS } from "../cultures/fs";
import { load_registry } from "../cultures/registry";
import { CulturesResourceManager } from '../cultures/resource_manager';
import { load_map } from './map';

export async function createGame(fs: CulturesFS, canvas: HTMLCanvasElement) {
  const registry = await load_registry(fs);
  const resource_manager = new CulturesResourceManager(fs, registry);

  canvas.width = document.documentElement.clientWidth;
  canvas.height = document.documentElement.clientHeight;

  const gl = canvas.getContext('webgl2');
  if (!gl) {
    console.warn('Context creation failed.');
    return;
  }

  await load_map('data\\maps\\campaign_01_01\\map.dat', gl, resource_manager);

  console.log('Game initialized...');
}