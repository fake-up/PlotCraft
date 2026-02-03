import type { ModuleDefinition, Layer, Path } from '../../types';
import { createLinePath } from '../../engine/geometry';

export const horizontalLinesGenerator: ModuleDefinition = {
  id: 'horizontalLines',
  name: 'Horizontal Lines',
  type: 'generator',
  parameters: {
    lineCount: { type: 'number', label: 'Line Count', default: 20, min: 2, max: 500, step: 1 },
    spacing: { type: 'number', label: 'Spacing', default: 5, min: 1, max: 50, step: 0.5 },
    width: { type: 'number', label: 'Width', default: 150, min: 10, max: 500, step: 5 },
    startY: { type: 'number', label: 'Start Y (%)', default: 10, min: 0, max: 100, step: 1 },
    centerX: { type: 'number', label: 'Center X (%)', default: 50, min: 0, max: 100, step: 1 },
    lineMode: {
      type: 'select',
      label: 'Line Mode',
      default: 'uniform',
      options: [
        { value: 'uniform', label: 'Uniform' },
        { value: 'random-offset', label: 'Random Offset' },
        { value: 'wave', label: 'Wave' },
        { value: 'converge', label: 'Converge to Center' },
      ],
    },
    randomOffset: {
      type: 'number',
      label: 'Random Offset',
      default: 10,
      min: 0,
      max: 50,
      step: 1,
      showWhen: { param: 'lineMode', value: 'random-offset' },
    },
    waveAmplitude: {
      type: 'number',
      label: 'Wave Amplitude',
      default: 20,
      min: 0,
      max: 100,
      step: 1,
      showWhen: { param: 'lineMode', value: 'wave' },
    },
    waveFrequency: {
      type: 'number',
      label: 'Wave Frequency',
      default: 2,
      min: 0.5,
      max: 10,
      step: 0.5,
      showWhen: { param: 'lineMode', value: 'wave' },
    },
    convergeStrength: {
      type: 'number',
      label: 'Converge Strength',
      default: 50,
      min: 0,
      max: 100,
      step: 5,
      showWhen: { param: 'lineMode', value: 'converge' },
    },
  },
  execute: (params, _input, ctx) => {
    const lineCount = (params.lineCount as number) ?? 20;
    const spacing = (params.spacing as number) ?? 5;
    const width = (params.width as number) ?? 150;
    const startY = (params.startY as number) ?? 10;
    const centerX = (params.centerX as number) ?? 50;
    const lineMode = (params.lineMode as string) ?? 'uniform';
    const randomOffset = (params.randomOffset as number) ?? 10;
    const waveAmplitude = (params.waveAmplitude as number) ?? 20;
    const waveFrequency = (params.waveFrequency as number) ?? 2;
    const convergeStrength = ((params.convergeStrength as number) ?? 50) / 100;

    const { canvas, rng } = ctx;

    // Calculate base positions
    const baseX = (centerX / 100) * canvas.width;
    const baseY = (startY / 100) * canvas.height;

    const paths: Path[] = [];

    for (let i = 0; i < lineCount; i++) {
      const y = baseY + i * spacing;
      let x1 = baseX - width / 2;
      let x2 = baseX + width / 2;

      switch (lineMode) {
        case 'random-offset': {
          const offset = (rng() - 0.5) * 2 * randomOffset;
          x1 += offset;
          x2 += offset;
          break;
        }
        case 'wave': {
          const phase = (i / lineCount) * Math.PI * 2 * waveFrequency;
          const offset = Math.sin(phase) * waveAmplitude;
          x1 += offset;
          x2 += offset;
          break;
        }
        case 'converge': {
          // Lines get shorter toward the center (vertically)
          const normalizedY = i / (lineCount - 1); // 0 to 1
          const distFromCenter = Math.abs(normalizedY - 0.5) * 2; // 0 at center, 1 at edges
          const widthFactor = 1 - (1 - distFromCenter) * convergeStrength;
          const newWidth = width * widthFactor;
          x1 = baseX - newWidth / 2;
          x2 = baseX + newWidth / 2;
          break;
        }
        // 'uniform' - no modification
      }

      const path = createLinePath(x1, y, x2, y);
      paths.push(path);
    }

    const layer: Layer = {
      id: 'horizontalLines',
      paths,
    };

    return [layer];
  },
};
