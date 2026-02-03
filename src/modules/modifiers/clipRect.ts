import type { ModuleDefinition, Path } from '../../types';
import { clipPathToRect } from '../../engine/geometry';

export const clipRectModifier: ModuleDefinition = {
  id: 'clipRect',
  name: 'Clip Rectangle',
  type: 'modifier',
  parameters: {
    x: { type: 'number', label: 'X (%)', default: 10, min: 0, max: 100, step: 1 },
    y: { type: 'number', label: 'Y (%)', default: 10, min: 0, max: 100, step: 1 },
    width: { type: 'number', label: 'Width (%)', default: 80, min: 1, max: 100, step: 1 },
    height: { type: 'number', label: 'Height (%)', default: 80, min: 1, max: 100, step: 1 },
  },
  execute: (params, input, ctx) => {
    const xPct = params.x as number;
    const yPct = params.y as number;
    const wPct = params.width as number;
    const hPct = params.height as number;

    const { width, height } = ctx.canvas;
    const rx = (xPct / 100) * width;
    const ry = (yPct / 100) * height;
    const rw = (wPct / 100) * width;
    const rh = (hPct / 100) * height;

    return input.map(layer => {
      const newPaths: Path[] = [];

      for (const path of layer.paths) {
        const clipped = clipPathToRect(path, rx, ry, rw, rh);
        newPaths.push(...clipped);
      }

      return {
        ...layer,
        paths: newPaths,
      };
    });
  },
};
