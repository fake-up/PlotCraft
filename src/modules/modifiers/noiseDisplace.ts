import type { ModuleDefinition, Point, Path } from '../../types';
import { noise2D } from '../../engine/geometry';
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

export const noiseDisplaceModifier: ModuleDefinition = {
  id: 'noiseDisplace',
  name: 'Noise Displace',
  type: 'modifier',
  parameters: {
    amount: { type: 'number', label: 'Amount', default: 10, min: 0, max: 100, step: 1 },
    scale: { type: 'number', label: 'Noise Scale', default: 0.02, min: 0.001, max: 0.2, step: 0.001 },
    octaves: { type: 'number', label: 'Octaves', default: 1, min: 1, max: 4, step: 1 },
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
    const amount = params.amount as number;
    const scale = params.scale as number;
    const octaves = params.octaves as number;
    const transformMode = (params.transformMode as string) ?? 'deform';
    const falloff = getFalloffParams(params);

    return input.map(layer => ({
      ...layer,
      paths: layer.paths.map(path => {
        if (transformMode === 'translate') {
          // Calculate displacement at path centroid, apply to all points
          const centroid = getPathCentroid(path);
          const displaced = displacePoint(centroid, amount, scale, octaves, ctx.seed);
          const offsetX = displaced.x - centroid.x;
          const offsetY = displaced.y - centroid.y;
          const strength = calculateFalloff(centroid, falloff, ctx.canvas);

          return {
            ...path,
            points: path.points.map(p => ({
              x: p.x + offsetX * strength,
              y: p.y + offsetY * strength,
            })),
          };
        } else {
          // Deform mode: displace each point individually
          return {
            ...path,
            points: path.points.map(p => {
              const displaced = displacePoint(p, amount, scale, octaves, ctx.seed);
              const strength = calculateFalloff(p, falloff, ctx.canvas);
              return {
                x: lerpWithFalloff(p.x, displaced.x, strength),
                y: lerpWithFalloff(p.y, displaced.y, strength),
              };
            }),
          };
        }
      }),
    }));
  },
};

function displacePoint(
  p: Point,
  amount: number,
  scale: number,
  octaves: number,
  seed: number
): Point {
  let nx = 0;
  let ny = 0;
  let amp = 1;
  let freq = scale;

  for (let o = 0; o < octaves; o++) {
    nx += (noise2D(p.x * freq, p.y * freq, seed) - 0.5) * 2 * amp;
    ny += (noise2D(p.x * freq + 100, p.y * freq + 100, seed) - 0.5) * 2 * amp;
    amp *= 0.5;
    freq *= 2;
  }

  return {
    x: p.x + nx * amount,
    y: p.y + ny * amount,
  };
}
