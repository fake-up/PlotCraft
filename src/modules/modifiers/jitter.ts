import type { ModuleDefinition, Point, Path } from '../../types';
import { FALLOFF_PARAMETERS, getFalloffParams, calculateFalloff, lerpWithFalloff } from '../../engine/falloff';

// Calculate centroid of a path
function getPathCentroid(path: Path): Point {
  if (path.points.length === 0) return { x: 0, y: 0 };
  const sum = path.points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );
  return { x: sum.x / path.points.length, y: sum.y / path.points.length };
}

export const jitterModifier: ModuleDefinition = {
  id: 'jitter',
  name: 'Jitter',
  type: 'modifier',
  parameters: {
    amountX: { type: 'number', label: 'Amount X', default: 5, min: 0, max: 50, step: 0.5 },
    amountY: { type: 'number', label: 'Amount Y', default: 5, min: 0, max: 50, step: 0.5 },
    transformMode: {
      type: 'select',
      label: 'Transform Mode',
      default: 'deform',
      options: [
        { value: 'deform', label: 'Deform' },
        { value: 'translate', label: 'Translate' },
      ],
    },
    ...FALLOFF_PARAMETERS,
  },
  execute: (params, input, ctx) => {
    const amountX = (params.amountX as number) ?? 5;
    const amountY = (params.amountY as number) ?? 5;
    const transformMode = (params.transformMode as string) ?? 'deform';
    const falloff = getFalloffParams(params);

    const { rng } = ctx;

    return input.map(layer => ({
      ...layer,
      paths: layer.paths.map(path => {
        if (transformMode === 'translate') {
          // Calculate random offset once, apply to all points (translate mode)
          const centroid = getPathCentroid(path);
          const offsetX = (rng() - 0.5) * 2 * amountX;
          const offsetY = (rng() - 0.5) * 2 * amountY;
          const strength = calculateFalloff(centroid, falloff, ctx.canvas);

          return {
            ...path,
            points: path.points.map(p => ({
              x: p.x + offsetX * strength,
              y: p.y + offsetY * strength,
            })),
          };
        } else {
          // Deform mode: random offset for each point
          return {
            ...path,
            points: path.points.map(p => {
              const jitteredX = p.x + (rng() - 0.5) * 2 * amountX;
              const jitteredY = p.y + (rng() - 0.5) * 2 * amountY;
              const strength = calculateFalloff(p, falloff, ctx.canvas);
              return {
                x: lerpWithFalloff(p.x, jitteredX, strength),
                y: lerpWithFalloff(p.y, jitteredY, strength),
              };
            }),
          };
        }
      }),
    }));
  },
};
