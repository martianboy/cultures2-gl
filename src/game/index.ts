import { CulturesFS } from "../cultures/fs";
import { load_registry } from "../cultures/registry";
import { CulturesResourceManager } from '../cultures/resource_manager';

export async function createGame(fs: CulturesFS, canvas: HTMLCanvasElement) {
  const registry = await load_registry(fs);
  const resource_manager = new CulturesResourceManager(fs, registry);
  const img = await resource_manager.load_pattern('block plaster 00 01 02');
  const bmp = await createImageBitmap(img);

  canvas.width = document.documentElement.clientWidth;
  canvas.height = document.documentElement.clientHeight;
  
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    console.warn('Context creation failed.');
    return;
  }

  ctx.scale(1, 1);
  ctx.drawImage(bmp, 0, 0);
  console.log('Game initializing...');
}