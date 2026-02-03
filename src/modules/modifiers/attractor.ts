import type { ModuleDefinition, Point, Path } from '../../types';

// Calculate centroid of a path
function getPathCentroid(path: Path): Point {
  if (path.points.length === 0) return { x: 0, y: 0 };
  const sum = path.points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );
  return { x: sum.x / path.points.length, y: sum.y / path.points.length };
}

export const attractorModifier: ModuleDefinition = {
  id: 'attractor',
  name: 'Attractor',
  type: 'modifier',
  parameters: {
    attractorX: { type: 'number', label: 'Attractor X (%)', default: 50, min: 0, max: 100, step: 1 },
    attractorY: { type: 'number', label: 'Attractor Y (%)', default: 50, min: 0, max: 100, step: 1 },
    strength: { type: 'number', label: 'Strength', default: 50, min: -100, max: 100, step: 5 },
    radius: { type: 'number', label: 'Influence Radius', default: 100, min: 10, max: 500, step: 5 },
    falloff: {
      type: 'select',
      label: 'Falloff',
      default: 'smooth',
      options: [
        { value: 'linear', label: 'Linear' },
        { value: 'quadratic', label: 'Quadratic' },
        { value: 'smooth', label: 'Smooth' },
      ],
    },
    transformMode: {
      type: 'select',
      label: 'Transform Mode',
      default: 'deform',
      options: [
        { value: 'deform', label: 'Deform' },
        { value: 'translate', label: 'Translate' },
      ],
    },
    mode: {
      type: 'select',
      label: 'Mode',
      default: 'single',
      options: [
        { value: 'single', label: 'Single' },
        { value: 'multi', label: 'Multiple (Circle)' },
      ],
    },
    attractorCount: {
      type: 'number',
      label: 'Attractor Count',
      default: 3,
      min: 2,
      max: 10,
      step: 1,
      showWhen: { param: 'mode', value: 'multi' },
    },
    multiRadius: {
      type: 'number',
      label: 'Circle Radius',
      default: 50,
      min: 10,
      max: 200,
      step: 5,
      showWhen: { param: 'mode', value: 'multi' },
    },
  },
  execute: (params, input, ctx) => {
    const attractorX = (params.attractorX as number) ?? 50;
    const attractorY = (params.attractorY as number) ?? 50;
    const strength = ((params.strength as number) ?? 50) / 100;
    const radius = (params.radius as number) ?? 100;
    const falloff = (params.falloff as string) ?? 'smooth';
    const transformMode = (params.transformMode as string) ?? 'deform';
    const mode = (params.mode as string) ?? 'single';
    const attractorCount = (params.attractorCount as number) ?? 3;
    const multiRadius = (params.multiRadius as number) ?? 50;

    const { canvas } = ctx;

    // Calculate attractor positions
    const attractors: Point[] = [];
    const baseCx = (attractorX / 100) * canvas.width;
    const baseCy = (attractorY / 100) * canvas.height;

    if (mode === 'single') {
      attractors.push({ x: baseCx, y: baseCy });
    } else {
      // Arrange attractors in a circle
      for (let i = 0; i < attractorCount; i++) {
        const angle = (i / attractorCount) * Math.PI * 2;
        attractors.push({
          x: baseCx + Math.cos(angle) * multiRadius,
          y: baseCy + Math.sin(angle) * multiRadius,
        });
      }
    }

    // Falloff function
    const applyFalloff = (normalizedDist: number): number => {
      const clamped = Math.max(0, Math.min(1, normalizedDist));
      switch (falloff) {
        case 'linear':
          return 1 - clamped;
        case 'quadratic':
          return (1 - clamped) * (1 - clamped);
        case 'smooth':
          // Smooth step (hermite interpolation)
          return 1 - (clamped * clamped * (3 - 2 * clamped));
        default:
          return 1 - clamped;
      }
    };

    // Calculate displacement for a point
    const calculateDisplacement = (p: Point): { dx: number; dy: number } => {
      let totalDx = 0;
      let totalDy = 0;

      for (const attractor of attractors) {
        const dx = attractor.x - p.x;
        const dy = attractor.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < radius && dist > 0.001) {
          const normalizedDist = dist / radius;
          const influence = applyFalloff(normalizedDist);
          const pullStrength = influence * strength;

          // Normalize direction and apply strength
          totalDx += (dx / dist) * dist * pullStrength;
          totalDy += (dy / dist) * dist * pullStrength;
        }
      }

      return { dx: totalDx, dy: totalDy };
    };

    return input.map(layer => ({
      ...layer,
      paths: layer.paths.map(path => {
        if (transformMode === 'translate') {
          // Calculate displacement at path centroid, apply to all points
          const centroid = getPathCentroid(path);
          const { dx, dy } = calculateDisplacement(centroid);

          return {
            ...path,
            points: path.points.map(p => ({
              x: p.x + dx,
              y: p.y + dy,
            })),
          };
        } else {
          // Deform mode: displace each point individually
          return {
            ...path,
            points: path.points.map(p => {
              const { dx, dy } = calculateDisplacement(p);
              return {
                x: p.x + dx,
                y: p.y + dy,
              };
            }),
          };
        }
      }),
    }));
  },
};
