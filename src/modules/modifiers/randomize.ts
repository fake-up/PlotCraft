import type { ModuleDefinition, Point, Path } from '../../types';
import { FALLOFF_PARAMETERS, getFalloffParams, calculateFalloff } from '../../engine/falloff';
import { createSeededRng } from '../../engine/rng';

// Calculate centroid of a path
function getPathCentroid(path: Path): Point {
  if (path.points.length === 0) return { x: 0, y: 0 };
  const sum = path.points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );
  return { x: sum.x / path.points.length, y: sum.y / path.points.length };
}

export const randomizeModifier: ModuleDefinition = {
  id: 'randomize',
  name: 'Randomize',
  type: 'modifier',
  parameters: {
    scaleVariation: { type: 'number', label: 'Scale Variation (%)', default: 0, min: 0, max: 100, step: 1 },
    scaleMin: { type: 'number', label: 'Scale Min', default: 0.5, min: 0.1, max: 2, step: 0.05 },
    scaleMax: { type: 'number', label: 'Scale Max', default: 1.5, min: 0.1, max: 3, step: 0.05 },
    rotationVariation: { type: 'number', label: 'Rotation Variation (deg)', default: 0, min: 0, max: 180, step: 1 },
    positionVariation: { type: 'number', label: 'Position Variation (mm)', default: 0, min: 0, max: 50, step: 0.5 },
    lengthVariation: { type: 'number', label: 'Length Variation (%)', default: 0, min: 0, max: 100, step: 1 },
    lengthMode: {
      type: 'select',
      label: 'Length Mode',
      default: 'trimEnd',
      options: [
        { value: 'trimEnd', label: 'Trim End' },
        { value: 'trimStart', label: 'Trim Start' },
        { value: 'trimBoth', label: 'Trim Both' },
      ],
    },
    seed: { type: 'number', label: 'Seed', default: 12345, min: 0, max: 99999, step: 1 },
    ...FALLOFF_PARAMETERS,
  },
  execute: (params, input, ctx) => {
    const scaleVariation = ((params.scaleVariation as number) ?? 0) / 100;
    const scaleMin = (params.scaleMin as number) ?? 0.5;
    const scaleMax = (params.scaleMax as number) ?? 1.5;
    const rotationVariation = ((params.rotationVariation as number) ?? 0) * (Math.PI / 180);
    const positionVariation = (params.positionVariation as number) ?? 0;
    const lengthVariation = ((params.lengthVariation as number) ?? 0) / 100;
    const lengthMode = (params.lengthMode as string) ?? 'trimEnd';
    const seed = (params.seed as number) ?? 12345;
    const falloff = getFalloffParams(params);

    const rng = createSeededRng(seed);

    return input.map(layer => ({
      ...layer,
      paths: layer.paths.map(path => {
        if (path.points.length < 2) return path;

        const centroid = getPathCentroid(path);
        const strength = calculateFalloff(centroid, falloff, ctx.canvas);

        let points = path.points.map(p => ({ x: p.x, y: p.y }));

        // Scale variation
        if (scaleVariation > 0) {
          const randomScale = scaleMin + rng() * (scaleMax - scaleMin);
          const effectiveScale = 1.0 + (randomScale - 1.0) * scaleVariation * strength;
          points = points.map(p => ({
            x: centroid.x + (p.x - centroid.x) * effectiveScale,
            y: centroid.y + (p.y - centroid.y) * effectiveScale,
          }));
        }

        // Rotation variation
        if (rotationVariation > 0) {
          const randomAngle = (rng() - 0.5) * 2 * rotationVariation;
          const effectiveAngle = randomAngle * strength;
          const cos = Math.cos(effectiveAngle);
          const sin = Math.sin(effectiveAngle);
          points = points.map(p => {
            const dx = p.x - centroid.x;
            const dy = p.y - centroid.y;
            return {
              x: centroid.x + dx * cos - dy * sin,
              y: centroid.y + dx * sin + dy * cos,
            };
          });
        }

        // Position variation
        if (positionVariation > 0) {
          const offsetX = (rng() - 0.5) * 2 * positionVariation * strength;
          const offsetY = (rng() - 0.5) * 2 * positionVariation * strength;
          points = points.map(p => ({
            x: p.x + offsetX,
            y: p.y + offsetY,
          }));
        }

        // Length variation (trim points)
        if (lengthVariation > 0 && points.length > 2) {
          const trimFraction = rng() * lengthVariation * strength;
          const trimCount = Math.floor(trimFraction * points.length);

          if (trimCount > 0 && trimCount < points.length - 1) {
            if (lengthMode === 'trimEnd') {
              points = points.slice(0, points.length - trimCount);
            } else if (lengthMode === 'trimStart') {
              points = points.slice(trimCount);
            } else {
              // trimBoth
              const trimStart = Math.floor(trimCount / 2);
              const trimEnd = trimCount - trimStart;
              points = points.slice(trimStart, points.length - trimEnd);
            }
          }
        }

        // Consume rng values for unused variations to keep determinism consistent
        if (scaleVariation <= 0) rng();
        if (rotationVariation <= 0) rng();
        if (positionVariation <= 0) { rng(); rng(); }
        if (lengthVariation <= 0) rng();

        return {
          ...path,
          points,
          closed: lengthVariation > 0 && points.length < path.points.length ? false : path.closed,
        };
      }),
    }));
  },
};
