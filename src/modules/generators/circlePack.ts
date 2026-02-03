import type { ModuleDefinition, Layer, Path, Point } from '../../types';
import { distance } from '../../engine/geometry';

interface Circle {
  x: number;
  y: number;
  r: number;
}

export const circlePackGenerator: ModuleDefinition = {
  id: 'circlePack',
  name: 'Circle Pack',
  type: 'generator',
  parameters: {
    layerId: {
      type: 'select',
      label: 'Layer',
      default: 'default-layer',
      options: [],
      dynamicOptions: 'plotLayers',
    },
    minRadius: { type: 'number', label: 'Min Radius', default: 5, min: 1, max: 50, step: 1 },
    maxRadius: { type: 'number', label: 'Max Radius', default: 30, min: 5, max: 100, step: 1 },
    count: { type: 'number', label: 'Target Count', default: 50, min: 5, max: 1000, step: 5 },
    padding: { type: 'number', label: 'Padding', default: 2, min: 0, max: 20, step: 0.5 },
    maxAttempts: { type: 'number', label: 'Max Attempts', default: 1000, min: 100, max: 10000, step: 100 },
    segments: { type: 'number', label: 'Circle Segments', default: 32, min: 8, max: 360, step: 8 },
    centered: { type: 'boolean', label: 'Center on Canvas', default: true },
    areaWidth: { type: 'number', label: 'Area Width', default: 180, min: 50, max: 500, step: 10, showWhen: { param: 'centered', value: false } },
    areaHeight: { type: 'number', label: 'Area Height', default: 180, min: 50, max: 500, step: 10, showWhen: { param: 'centered', value: false } },
    positionX: { type: 'number', label: 'Position X (%)', default: 50, min: 0, max: 100, step: 1, showWhen: { param: 'centered', value: false } },
    positionY: { type: 'number', label: 'Position Y (%)', default: 50, min: 0, max: 100, step: 1, showWhen: { param: 'centered', value: false } },
  },
  execute: (params, _input, ctx) => {
    const minRadius = (params.minRadius as number) ?? 5;
    const maxRadius = (params.maxRadius as number) ?? 30;
    const count = (params.count as number) ?? 50;
    const padding = (params.padding as number) ?? 2;
    const maxAttempts = (params.maxAttempts as number) ?? 1000;
    const segments = (params.segments as number) ?? 32;
    const centered = params.centered !== false;
    const areaWidth = (params.areaWidth as number) ?? 180;
    const areaHeight = (params.areaHeight as number) ?? 180;
    const positionX = (params.positionX as number) ?? 50;
    const positionY = (params.positionY as number) ?? 50;

    const { width, height } = ctx.canvas;
    const { rng } = ctx;

    let boundsX: number;
    let boundsY: number;
    let boundsW: number;
    let boundsH: number;

    if (centered) {
      // Use canvas with margin
      const margin = maxRadius + padding;
      boundsX = margin;
      boundsY = margin;
      boundsW = width - 2 * margin;
      boundsH = height - 2 * margin;
    } else {
      boundsW = areaWidth;
      boundsH = areaHeight;
      boundsX = (positionX / 100) * width - boundsW / 2;
      boundsY = (positionY / 100) * height - boundsH / 2;
    }

    const circles: Circle[] = [];
    let attempts = 0;

    // Try to place circles
    while (circles.length < count && attempts < maxAttempts) {
      attempts++;

      // Random position and radius
      const r = minRadius + rng() * (maxRadius - minRadius);
      const x = boundsX + r + rng() * (boundsW - 2 * r);
      const y = boundsY + r + rng() * (boundsH - 2 * r);

      // Check for overlap with existing circles
      let overlaps = false;
      for (const c of circles) {
        const dist = distance({ x, y }, { x: c.x, y: c.y });
        if (dist < r + c.r + padding) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        circles.push({ x, y, r });
      }
    }

    // Convert circles to paths
    const paths: Path[] = circles.map(c => {
      const points: Point[] = [];
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push({
          x: c.x + Math.cos(angle) * c.r,
          y: c.y + Math.sin(angle) * c.r,
        });
      }
      return { points, closed: true };
    });

    const layer: Layer = {
      id: 'circlePack',
      paths,
    };

    return [layer];
  },
};
