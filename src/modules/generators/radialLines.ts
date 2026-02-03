import type { ModuleDefinition, Layer, Path } from '../../types';

export const radialLinesGenerator: ModuleDefinition = {
  id: 'radialLines',
  name: 'Radial Lines',
  type: 'generator',
  parameters: {
    layerId: {
      type: 'select',
      label: 'Layer',
      default: 'default-layer',
      options: [],
      dynamicOptions: 'plotLayers',
    },
    lineCount: { type: 'number', label: 'Line Count', default: 24, min: 2, max: 5000, step: 1 },
    innerRadius: { type: 'number', label: 'Inner Radius', default: 20, min: 0, max: 300, step: 1 },
    outerRadius: { type: 'number', label: 'Outer Radius', default: 100, min: 10, max: 500, step: 5 },
    angleStart: { type: 'number', label: 'Start Angle', default: 0, min: 0, max: 360, step: 1 },
    angleEnd: { type: 'number', label: 'End Angle', default: 360, min: 0, max: 360, step: 1 },
    centered: { type: 'boolean', label: 'Center on Canvas', default: true },
    positionX: { type: 'number', label: 'Position X (%)', default: 50, min: 0, max: 100, step: 1, showWhen: { param: 'centered', value: false } },
    positionY: { type: 'number', label: 'Position Y (%)', default: 50, min: 0, max: 100, step: 1, showWhen: { param: 'centered', value: false } },
  },
  execute: (params, _input, ctx) => {
    const lineCount = (params.lineCount as number) ?? 24;
    const innerRadius = (params.innerRadius as number) ?? 20;
    const outerRadius = (params.outerRadius as number) ?? 100;
    const angleStart = (params.angleStart as number) ?? 0;
    const angleEnd = (params.angleEnd as number) ?? 360;
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

    const paths: Path[] = [];
    const startRad = (angleStart * Math.PI) / 180;
    const endRad = (angleEnd * Math.PI) / 180;
    const angleRange = endRad - startRad;

    for (let i = 0; i < lineCount; i++) {
      const t = lineCount === 1 ? 0 : i / (lineCount - (angleEnd === 360 && angleStart === 0 ? 0 : 1));
      const angle = startRad + t * angleRange;

      const x1 = cx + Math.cos(angle) * innerRadius;
      const y1 = cy + Math.sin(angle) * innerRadius;
      const x2 = cx + Math.cos(angle) * outerRadius;
      const y2 = cy + Math.sin(angle) * outerRadius;

      paths.push({
        points: [{ x: x1, y: y1 }, { x: x2, y: y2 }],
        closed: false,
      });
    }

    const layer: Layer = {
      id: 'radial',
      paths,
    };

    return [layer];
  },
};
