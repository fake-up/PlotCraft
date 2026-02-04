import type { ModuleDefinition, Point, Path } from '../../types';
import { FALLOFF_PARAMETERS, getFalloffParams, calculateFalloff, lerpWithFalloff } from '../../engine/falloff';

function getPathCentroid(path: Path): Point {
  if (path.points.length === 0) return { x: 0, y: 0 };
  const sum = path.points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );
  return { x: sum.x / path.points.length, y: sum.y / path.points.length };
}

export const scaleModifier: ModuleDefinition = {
  id: 'scale',
  name: 'Scale',
  type: 'modifier',
  parameters: {
    scaleMode: {
      type: 'select',
      label: 'Scale Mode',
      default: 'global',
      options: [
        { value: 'global', label: 'Global' },
        { value: 'perPath', label: 'Per Path' },
      ],
    },
    scaleX: { type: 'number', label: 'Scale X', default: 1, min: 0.1, max: 5, step: 0.1 },
    scaleY: { type: 'number', label: 'Scale Y', default: 1, min: 0.1, max: 5, step: 0.1 },
    uniform: { type: 'boolean', label: 'Uniform Scale', default: true },
    centerX: {
      type: 'number', label: 'Center X (%)', default: 50, min: 0, max: 100, step: 1,
      showWhen: { param: 'scaleMode', value: 'global' },
    },
    centerY: {
      type: 'number', label: 'Center Y (%)', default: 50, min: 0, max: 100, step: 1,
      showWhen: { param: 'scaleMode', value: 'global' },
    },
    ...FALLOFF_PARAMETERS,
  },
  execute: (params, input, ctx) => {
    const scaleMode = (params.scaleMode as string) ?? 'global';
    const scaleX = (params.scaleX as number) ?? 1;
    const uniform = params.uniform !== false;
    const scaleY = uniform ? scaleX : ((params.scaleY as number) ?? 1);
    const centerXPct = (params.centerX as number) ?? 50;
    const centerYPct = (params.centerY as number) ?? 50;
    const falloff = getFalloffParams(params);

    const { width, height } = ctx.canvas;

    if (scaleMode === 'perPath') {
      return input.map(layer => ({
        ...layer,
        paths: layer.paths.map(path => {
          const centroid = getPathCentroid(path);
          const strength = calculateFalloff(centroid, falloff, ctx.canvas);
          const effectiveSX = 1 + (scaleX - 1) * strength;
          const effectiveSY = 1 + (scaleY - 1) * strength;

          return {
            ...path,
            points: path.points.map(p => ({
              x: centroid.x + (p.x - centroid.x) * effectiveSX,
              y: centroid.y + (p.y - centroid.y) * effectiveSY,
            })),
          };
        }),
      }));
    }

    // Global mode (existing behavior)
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
