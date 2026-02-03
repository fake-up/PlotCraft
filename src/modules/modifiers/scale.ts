import type { ModuleDefinition } from '../../types';
import { FALLOFF_PARAMETERS, getFalloffParams, calculateFalloff, lerpWithFalloff } from '../../engine/falloff';

export const scaleModifier: ModuleDefinition = {
  id: 'scale',
  name: 'Scale',
  type: 'modifier',
  parameters: {
    scaleX: { type: 'number', label: 'Scale X', default: 1, min: 0.1, max: 5, step: 0.1 },
    scaleY: { type: 'number', label: 'Scale Y', default: 1, min: 0.1, max: 5, step: 0.1 },
    uniform: { type: 'boolean', label: 'Uniform Scale', default: true },
    centerX: { type: 'number', label: 'Center X (%)', default: 50, min: 0, max: 100, step: 1 },
    centerY: { type: 'number', label: 'Center Y (%)', default: 50, min: 0, max: 100, step: 1 },
    ...FALLOFF_PARAMETERS,
  },
  execute: (params, input, ctx) => {
    const scaleX = (params.scaleX as number) ?? 1;
    const uniform = params.uniform !== false;
    const scaleY = uniform ? scaleX : ((params.scaleY as number) ?? 1);
    const centerXPct = (params.centerX as number) ?? 50;
    const centerYPct = (params.centerY as number) ?? 50;
    const falloff = getFalloffParams(params);

    const { width, height } = ctx.canvas;
    const cx = (centerXPct / 100) * width;
    const cy = (centerYPct / 100) * height;

    return input.map(layer => ({
      ...layer,
      paths: layer.paths.map(path => ({
        ...path,
        points: path.points.map(p => {
          const scaledX = cx + (p.x - cx) * scaleX;
          const scaledY = cy + (p.y - cy) * scaleY;

          const strength = calculateFalloff(p, falloff, ctx.canvas);
          return {
            x: lerpWithFalloff(p.x, scaledX, strength),
            y: lerpWithFalloff(p.y, scaledY, strength),
          };
        }),
      })),
    }));
  },
};
