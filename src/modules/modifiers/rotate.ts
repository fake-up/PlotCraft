import type { ModuleDefinition } from '../../types';
import { FALLOFF_PARAMETERS, getFalloffParams, calculateFalloff, lerpWithFalloff } from '../../engine/falloff';

export const rotateModifier: ModuleDefinition = {
  id: 'rotate',
  name: 'Rotate',
  type: 'modifier',
  parameters: {
    angle: { type: 'number', label: 'Angle (degrees)', default: 0, min: -360, max: 360, step: 1 },
    centerX: { type: 'number', label: 'Center X (%)', default: 50, min: 0, max: 100, step: 1 },
    centerY: { type: 'number', label: 'Center Y (%)', default: 50, min: 0, max: 100, step: 1 },
    ...FALLOFF_PARAMETERS,
  },
  execute: (params, input, ctx) => {
    const angleDeg = params.angle as number;
    const centerXPct = params.centerX as number;
    const centerYPct = params.centerY as number;
    const falloff = getFalloffParams(params);

    const angleRad = (angleDeg * Math.PI) / 180;
    const { width, height } = ctx.canvas;
    const cx = (centerXPct / 100) * width;
    const cy = (centerYPct / 100) * height;

    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    return input.map(layer => ({
      ...layer,
      paths: layer.paths.map(path => ({
        ...path,
        points: path.points.map(p => {
          // Calculate rotated position
          const dx = p.x - cx;
          const dy = p.y - cy;
          const rotatedX = cx + dx * cos - dy * sin;
          const rotatedY = cy + dx * sin + dy * cos;

          const strength = calculateFalloff(p, falloff, ctx.canvas);
          return {
            x: lerpWithFalloff(p.x, rotatedX, strength),
            y: lerpWithFalloff(p.y, rotatedY, strength),
          };
        }),
      })),
    }));
  },
};
