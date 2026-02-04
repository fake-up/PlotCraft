import type { ModuleDefinition, Layer, Path, Point } from '../../types';
import { STAMP_PARAMETERS, getStampCenter, getStampParams, getStampRotation, placeStamp } from '../../engine/stamp';

export const scatterPointsGenerator: ModuleDefinition = {
  id: 'scatterPoints',
  name: 'Scatter Points',
  type: 'generator',
  additionalInputs: [
    { name: 'stamp', type: 'paths', optional: true },
  ],
  parameters: {
    count: { type: 'number', label: 'Point Count', default: 500, min: 10, max: 5000, step: 10 },
    region: {
      type: 'select',
      label: 'Region Shape',
      default: 'rectangle',
      options: [
        { value: 'rectangle', label: 'Rectangle' },
        { value: 'circle', label: 'Circle' },
        { value: 'ellipse', label: 'Ellipse' },
      ],
    },
    width: { type: 'number', label: 'Width', default: 150, min: 10, max: 500, step: 5 },
    height: { type: 'number', label: 'Height', default: 150, min: 10, max: 500, step: 5 },
    centerX: { type: 'number', label: 'Center X (%)', default: 50, min: 0, max: 100, step: 1 },
    centerY: { type: 'number', label: 'Center Y (%)', default: 50, min: 0, max: 100, step: 1 },
    dotSize: { type: 'number', label: 'Dot Size', default: 1, min: 0.5, max: 5, step: 0.1 },
    densityFalloff: {
      type: 'select',
      label: 'Density Falloff',
      default: 'none',
      options: [
        { value: 'none', label: 'None (Uniform)' },
        { value: 'center-out', label: 'Center → Out' },
        { value: 'edges-in', label: 'Edges → In' },
        { value: 'top-down', label: 'Top → Down' },
        { value: 'radial-noise', label: 'Radial Noise' },
      ],
    },
    falloffStrength: { type: 'number', label: 'Falloff Strength', default: 50, min: 0, max: 100, step: 5 },
    ...STAMP_PARAMETERS,
  },
  execute: (params, _input, ctx) => {
    const count = (params.count as number) ?? 500;
    const region = (params.region as string) ?? 'rectangle';
    const width = (params.width as number) ?? 150;
    const height = (params.height as number) ?? 150;
    const centerX = (params.centerX as number) ?? 50;
    const centerY = (params.centerY as number) ?? 50;
    const dotSize = (params.dotSize as number) ?? 1;
    const densityFalloff = (params.densityFalloff as string) ?? 'none';
    const falloffStrength = ((params.falloffStrength as number) ?? 50) / 100;

    const { rng, canvas } = ctx;

    // Check for stamp input
    const stampLayers = ctx.inputs?.stamp;
    const hasStamp = stampLayers && stampLayers.length > 0 && stampLayers.some(l => l.paths.length > 0);
    const stampCenter = hasStamp ? getStampCenter(stampLayers) : null;
    const stamp = hasStamp ? getStampParams(params) : null;

    // Calculate center position in canvas coords
    const cx = (centerX / 100) * canvas.width;
    const cy = (centerY / 100) * canvas.height;

    const paths: Path[] = [];
    const segments = 12; // segments for each dot circle
    const radius = dotSize / 2;

    // Generate points using rejection sampling for non-rectangular regions
    let generated = 0;
    let attempts = 0;
    const maxAttempts = count * 10;

    while (generated < count && attempts < maxAttempts) {
      attempts++;

      // Generate random point in bounding box
      const localX = (rng() - 0.5) * width;
      const localY = (rng() - 0.5) * height;

      // Check if point is within region
      let inRegion = true;
      if (region === 'circle') {
        const r = Math.min(width, height) / 2;
        inRegion = localX * localX + localY * localY <= r * r;
      } else if (region === 'ellipse') {
        const rx = width / 2;
        const ry = height / 2;
        inRegion = (localX * localX) / (rx * rx) + (localY * localY) / (ry * ry) <= 1;
      }

      if (!inRegion) continue;

      // Apply density falloff - use probability to reject points
      let keepProbability = 1;
      if (densityFalloff !== 'none') {
        const normX = localX / (width / 2); // -1 to 1
        const normY = localY / (height / 2); // -1 to 1
        const distFromCenter = Math.sqrt(normX * normX + normY * normY);

        switch (densityFalloff) {
          case 'center-out':
            // Denser at center, sparser at edges
            keepProbability = 1 - distFromCenter * falloffStrength;
            break;
          case 'edges-in':
            // Sparser at center, denser at edges
            keepProbability = distFromCenter * falloffStrength + (1 - falloffStrength);
            break;
          case 'top-down': {
            // Denser at top, sparser at bottom
            const normTop = (normY + 1) / 2; // 0 at top, 1 at bottom
            keepProbability = 1 - normTop * falloffStrength;
            break;
          }
          case 'radial-noise': {
            // Use noise-like variation based on angle
            const angle = Math.atan2(localY, localX);
            const noiseVal = Math.sin(angle * 7) * 0.5 + 0.5;
            keepProbability = noiseVal * falloffStrength + (1 - falloffStrength);
            break;
          }
        }
      }

      if (rng() > keepProbability) continue;

      // Position on canvas
      const px = cx + localX;
      const py = cy + localY;

      if (hasStamp && stampCenter && stamp) {
        // Place stamp at this position
        const rotation = getStampRotation(stamp.stampRotation, rng, stamp.stampRandomRotation);
        const stampPaths = placeStamp(stampLayers, stampCenter, px, py, stamp.stampScale, rotation);
        paths.push(...stampPaths);
      } else {
        // Create default dot at this position
        const points: Point[] = [];
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          points.push({
            x: px + Math.cos(angle) * radius,
            y: py + Math.sin(angle) * radius,
          });
        }
        paths.push({ points, closed: true });
      }
      generated++;
    }

    const layer: Layer = {
      id: 'scatterPoints',
      paths,
    };

    return [layer];
  },
};
