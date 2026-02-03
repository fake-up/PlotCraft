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

export const waveDisplaceModifier: ModuleDefinition = {
  id: 'waveDisplace',
  name: 'Wave Displace',
  type: 'modifier',
  parameters: {
    frequency: { type: 'number', label: 'Frequency', default: 0.05, min: 0.001, max: 0.5, step: 0.005 },
    amplitude: { type: 'number', label: 'Amplitude', default: 10, min: 1, max: 100, step: 1 },
    angle: { type: 'number', label: 'Wave Angle', default: 0, min: 0, max: 360, step: 1 },
    phase: { type: 'number', label: 'Phase', default: 0, min: 0, max: 360, step: 1 },
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
    const frequency = (params.frequency as number) ?? 0.05;
    const amplitude = (params.amplitude as number) ?? 10;
    const angleDeg = (params.angle as number) ?? 0;
    const phaseDeg = (params.phase as number) ?? 0;
    const transformMode = (params.transformMode as string) ?? 'deform';
    const falloff = getFalloffParams(params);

    const angleRad = (angleDeg * Math.PI) / 180;
    const phaseRad = (phaseDeg * Math.PI) / 180;

    // Wave direction (perpendicular to displacement)
    const waveDirX = Math.cos(angleRad);
    const waveDirY = Math.sin(angleRad);

    // Displacement direction (perpendicular to wave direction)
    const dispDirX = -Math.sin(angleRad);
    const dispDirY = Math.cos(angleRad);

    return input.map(layer => ({
      ...layer,
      paths: layer.paths.map(path => {
        if (transformMode === 'translate') {
          // Calculate displacement at path centroid, apply to all points
          const centroid = getPathCentroid(path);
          const wavePos = centroid.x * waveDirX + centroid.y * waveDirY;
          const displacement = Math.sin(wavePos * frequency * Math.PI * 2 + phaseRad) * amplitude;
          const offsetX = dispDirX * displacement;
          const offsetY = dispDirY * displacement;
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
              const wavePos = p.x * waveDirX + p.y * waveDirY;
              const displacement = Math.sin(wavePos * frequency * Math.PI * 2 + phaseRad) * amplitude;
              const displacedX = p.x + dispDirX * displacement;
              const displacedY = p.y + dispDirY * displacement;
              const strength = calculateFalloff(p, falloff, ctx.canvas);
              return {
                x: lerpWithFalloff(p.x, displacedX, strength),
                y: lerpWithFalloff(p.y, displacedY, strength),
              };
            }),
          };
        }
      }),
    }));
  },
};
