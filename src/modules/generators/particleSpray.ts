import type { ModuleDefinition, Layer, Path, Point } from '../../types';

export const particleSprayGenerator: ModuleDefinition = {
  id: 'particleSpray',
  name: 'Particle Spray',
  type: 'generator',
  parameters: {
    sourceX: { type: 'number', label: 'Source X (%)', default: 50, min: 0, max: 100, step: 1 },
    sourceY: { type: 'number', label: 'Source Y (%)', default: 50, min: 0, max: 100, step: 1 },
    particleCount: { type: 'number', label: 'Particle Count', default: 200, min: 10, max: 2000, step: 10 },
    direction: { type: 'number', label: 'Direction (°)', default: 0, min: 0, max: 360, step: 1 },
    spread: { type: 'number', label: 'Spread (°)', default: 30, min: 0, max: 180, step: 1 },
    minDistance: { type: 'number', label: 'Min Distance', default: 10, min: 5, max: 200, step: 5 },
    maxDistance: { type: 'number', label: 'Max Distance', default: 100, min: 10, max: 500, step: 5 },
    particleType: {
      type: 'select',
      label: 'Particle Type',
      default: 'dot',
      options: [
        { value: 'dot', label: 'Dot' },
        { value: 'line', label: 'Line' },
        { value: 'streak', label: 'Streak' },
      ],
    },
    dotSize: { type: 'number', label: 'Dot Size', default: 1, min: 0.5, max: 3, step: 0.1 },
    streakLength: {
      type: 'number',
      label: 'Streak Length',
      default: 5,
      min: 1,
      max: 20,
      step: 0.5,
      showWhen: { param: 'particleType', value: 'streak' },
    },
    densityFalloff: { type: 'boolean', label: 'Density Falloff', default: true },
  },
  execute: (params, _input, ctx) => {
    const sourceX = (params.sourceX as number) ?? 50;
    const sourceY = (params.sourceY as number) ?? 50;
    const particleCount = (params.particleCount as number) ?? 200;
    const direction = (params.direction as number) ?? 0;
    const spread = (params.spread as number) ?? 30;
    const minDistance = (params.minDistance as number) ?? 10;
    const maxDistance = (params.maxDistance as number) ?? 100;
    const particleType = (params.particleType as string) ?? 'dot';
    const dotSize = (params.dotSize as number) ?? 1;
    const streakLength = (params.streakLength as number) ?? 5;
    const densityFalloff = params.densityFalloff !== false;

    const { canvas, rng } = ctx;

    // Calculate source position
    const sx = (sourceX / 100) * canvas.width;
    const sy = (sourceY / 100) * canvas.height;

    // Convert direction and spread to radians
    const dirRad = (direction * Math.PI) / 180;
    const spreadRad = (spread * Math.PI) / 180;

    const paths: Path[] = [];
    const segments = 12; // segments for dot circles

    for (let i = 0; i < particleCount; i++) {
      // Random angle within spread
      const angle = dirRad + (rng() - 0.5) * spreadRad * 2;

      // Random distance with optional density falloff
      let distance: number;
      if (densityFalloff) {
        // More particles closer to source (inverse square-ish distribution)
        const t = rng();
        distance = minDistance + (maxDistance - minDistance) * (t * t);
      } else {
        distance = minDistance + rng() * (maxDistance - minDistance);
      }

      // Calculate particle position
      const px = sx + Math.cos(angle) * distance;
      const py = sy + Math.sin(angle) * distance;

      if (particleType === 'dot') {
        // Create small circle
        const points: Point[] = [];
        const radius = dotSize / 2;
        for (let j = 0; j <= segments; j++) {
          const a = (j / segments) * Math.PI * 2;
          points.push({
            x: px + Math.cos(a) * radius,
            y: py + Math.sin(a) * radius,
          });
        }
        paths.push({ points, closed: true });
      } else if (particleType === 'line') {
        // Short line perpendicular to spray direction
        const perpAngle = angle + Math.PI / 2;
        const halfLen = dotSize;
        paths.push({
          points: [
            { x: px - Math.cos(perpAngle) * halfLen, y: py - Math.sin(perpAngle) * halfLen },
            { x: px + Math.cos(perpAngle) * halfLen, y: py + Math.sin(perpAngle) * halfLen },
          ],
          closed: false,
        });
      } else if (particleType === 'streak') {
        // Line in the spray direction (motion blur effect)
        const len = streakLength * (0.5 + 0.5 * (distance / maxDistance)); // longer streaks further out
        paths.push({
          points: [
            { x: px - Math.cos(angle) * len / 2, y: py - Math.sin(angle) * len / 2 },
            { x: px + Math.cos(angle) * len / 2, y: py + Math.sin(angle) * len / 2 },
          ],
          closed: false,
        });
      }
    }

    const layer: Layer = {
      id: 'particleSpray',
      paths,
    };

    return [layer];
  },
};
