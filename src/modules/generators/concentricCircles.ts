import type { ModuleDefinition, Layer, Path, Point } from '../../types';

export const concentricCirclesGenerator: ModuleDefinition = {
  id: 'concentricCircles',
  name: 'Concentric Circles',
  type: 'generator',
  parameters: {
    layerId: {
      type: 'select',
      label: 'Layer',
      default: 'default-layer',
      options: [],
      dynamicOptions: 'plotLayers',
    },
    count: { type: 'number', label: 'Number of Circles', default: 20, min: 1, max: 5000, step: 1 },
    minRadius: { type: 'number', label: 'Min Radius', default: 10, min: 1, max: 200, step: 1 },
    maxRadius: { type: 'number', label: 'Max Radius', default: 100, min: 10, max: 500, step: 5 },
    segments: { type: 'number', label: 'Segments', default: 64, min: 8, max: 360, step: 8 },
    centered: { type: 'boolean', label: 'Center on Canvas', default: true },
    positionX: { type: 'number', label: 'Position X (%)', default: 50, min: 0, max: 100, step: 1, showWhen: { param: 'centered', value: false } },
    positionY: { type: 'number', label: 'Position Y (%)', default: 50, min: 0, max: 100, step: 1, showWhen: { param: 'centered', value: false } },
  },
  execute: (params, _input, ctx) => {
    // Use defaults for any missing params (handles legacy module instances)
    const count = (params.count as number) ?? 20;
    const minRadius = (params.minRadius as number) ?? 10;
    const maxRadius = (params.maxRadius as number) ?? 100;
    const segments = (params.segments as number) ?? 64;
    const centered = params.centered !== false; // Default to true
    const positionX = (params.positionX as number) ?? 50;
    const positionY = (params.positionY as number) ?? 50;

    const { width, height } = ctx.canvas;

    // Calculate center position
    let cx: number;
    let cy: number;

    if (centered) {
      // Center on the canvas
      cx = width / 2;
      cy = height / 2;
    } else {
      // Position based on percentage
      cx = (positionX / 100) * width;
      cy = (positionY / 100) * height;
    }

    const paths: Path[] = [];

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const radius = minRadius + t * (maxRadius - minRadius);

      const points: Point[] = [];
      for (let s = 0; s <= segments; s++) {
        const angle = (s / segments) * Math.PI * 2;
        points.push({
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
        });
      }

      paths.push({ points, closed: true });
    }

    const layer: Layer = {
      id: 'concentric',
      paths,
    };

    return [layer];
  },
};
