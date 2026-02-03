import type { ModuleDefinition, Layer, Path, Point } from '../../types';

export const spiralGenerator: ModuleDefinition = {
  id: 'spiral',
  name: 'Spiral',
  type: 'generator',
  parameters: {
    layerId: {
      type: 'select',
      label: 'Layer',
      default: 'default-layer',
      options: [],
      dynamicOptions: 'plotLayers',
    },
    turns: { type: 'number', label: 'Turns', default: 5, min: 0.5, max: 50, step: 0.5 },
    expansion: { type: 'number', label: 'Expansion (spacing)', default: 10, min: 1, max: 50, step: 0.5 },
    pointsPerTurn: { type: 'number', label: 'Points per Turn', default: 64, min: 8, max: 1000, step: 8 },
    centered: { type: 'boolean', label: 'Center on Canvas', default: true },
    positionX: { type: 'number', label: 'Position X (%)', default: 50, min: 0, max: 100, step: 1, showWhen: { param: 'centered', value: false } },
    positionY: { type: 'number', label: 'Position Y (%)', default: 50, min: 0, max: 100, step: 1, showWhen: { param: 'centered', value: false } },
  },
  execute: (params, _input, ctx) => {
    const turns = (params.turns as number) ?? 5;
    const expansion = (params.expansion as number) ?? 10;
    const pointsPerTurn = (params.pointsPerTurn as number) ?? 64;
    const centered = params.centered !== false;
    const positionX = (params.positionX as number) ?? 50;
    const positionY = (params.positionY as number) ?? 50;

    const { width, height } = ctx.canvas;

    let cx: number;
    let cy: number;

    if (centered) {
      cx = width / 2;
      cy = height / 2;
    } else {
      cx = (positionX / 100) * width;
      cy = (positionY / 100) * height;
    }

    const points: Point[] = [];
    const totalPoints = Math.floor(turns * pointsPerTurn);

    for (let i = 0; i <= totalPoints; i++) {
      const angle = (i / pointsPerTurn) * Math.PI * 2;
      // Archimedean spiral: r = a + b * theta
      const radius = (i / pointsPerTurn) * expansion;

      points.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    }

    const path: Path = {
      points,
      closed: false,
    };

    const layer: Layer = {
      id: 'spiral',
      paths: [path],
    };

    return [layer];
  },
};
