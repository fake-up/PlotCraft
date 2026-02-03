import type { ModuleDefinition, Layer, Path, Point } from '../../types';

export const lissajousGenerator: ModuleDefinition = {
  id: 'lissajous',
  name: 'Lissajous',
  type: 'generator',
  parameters: {
    layerId: {
      type: 'select',
      label: 'Layer',
      default: 'default-layer',
      options: [],
      dynamicOptions: 'plotLayers',
    },
    freqA: { type: 'number', label: 'Frequency A', default: 3, min: 1, max: 20, step: 1 },
    freqB: { type: 'number', label: 'Frequency B', default: 4, min: 1, max: 20, step: 1 },
    phaseShift: { type: 'number', label: 'Phase Shift (delta)', default: 90, min: 0, max: 360, step: 1 },
    amplitude: { type: 'number', label: 'Amplitude', default: 80, min: 10, max: 300, step: 5 },
    resolution: { type: 'number', label: 'Resolution (points)', default: 500, min: 100, max: 10000, step: 50 },
    centered: { type: 'boolean', label: 'Center on Canvas', default: true },
    positionX: { type: 'number', label: 'Position X (%)', default: 50, min: 0, max: 100, step: 1, showWhen: { param: 'centered', value: false } },
    positionY: { type: 'number', label: 'Position Y (%)', default: 50, min: 0, max: 100, step: 1, showWhen: { param: 'centered', value: false } },
  },
  execute: (params, _input, ctx) => {
    const freqA = (params.freqA as number) ?? 3;
    const freqB = (params.freqB as number) ?? 4;
    const phaseShift = (params.phaseShift as number) ?? 90;
    const amplitude = (params.amplitude as number) ?? 80;
    const resolution = (params.resolution as number) ?? 500;
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
    const delta = (phaseShift * Math.PI) / 180;

    // Lissajous curve: x = A * sin(a * t + delta), y = B * sin(b * t)
    for (let i = 0; i <= resolution; i++) {
      const t = (i / resolution) * Math.PI * 2;

      const x = cx + amplitude * Math.sin(freqA * t + delta);
      const y = cy + amplitude * Math.sin(freqB * t);

      points.push({ x, y });
    }

    const path: Path = {
      points,
      closed: false,
    };

    const layer: Layer = {
      id: 'lissajous',
      paths: [path],
    };

    return [layer];
  },
};
