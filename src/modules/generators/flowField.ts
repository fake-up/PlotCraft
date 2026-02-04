import type { ModuleDefinition, Layer, Path, Point } from '../../types';
import { noise2D } from '../../engine/geometry';
import { STAMP_PARAMETERS, getStampCenter, getStampParams, getStampRotation, placeStamp } from '../../engine/stamp';

export const flowFieldGenerator: ModuleDefinition = {
  id: 'flowField',
  name: 'Flow Field',
  type: 'generator',
  additionalInputs: [
    { name: 'stamp', type: 'paths', optional: true },
  ],
  parameters: {
    layerId: {
      type: 'select',
      label: 'Layer',
      default: 'default-layer',
      options: [],
      dynamicOptions: 'plotLayers',
    },
    lines: { type: 'number', label: 'Number of Lines', default: 200, min: 10, max: 5000, step: 10 },
    steps: { type: 'number', label: 'Steps per Line', default: 50, min: 5, max: 1000, step: 5 },
    stepSize: { type: 'number', label: 'Step Size', default: 3, min: 0.5, max: 20, step: 0.5 },
    noiseScale: { type: 'number', label: 'Noise Scale', default: 0.01, min: 0.001, max: 0.1, step: 0.001 },
    fieldWidth: { type: 'number', label: 'Field Width', default: 180, min: 20, max: 800, step: 10 },
    fieldHeight: { type: 'number', label: 'Field Height', default: 250, min: 20, max: 800, step: 10 },
    centered: { type: 'boolean', label: 'Center on Canvas', default: true },
    positionX: { type: 'number', label: 'Position X (%)', default: 50, min: 0, max: 100, step: 1, showWhen: { param: 'centered', value: false } },
    positionY: { type: 'number', label: 'Position Y (%)', default: 50, min: 0, max: 100, step: 1, showWhen: { param: 'centered', value: false } },
    ...STAMP_PARAMETERS,
  },
  execute: (params, _input, ctx) => {
    // Use defaults for any missing params (handles legacy module instances)
    const lines = (params.lines as number) ?? 200;
    const steps = (params.steps as number) ?? 50;
    const stepSize = (params.stepSize as number) ?? 3;
    const noiseScale = (params.noiseScale as number) ?? 0.01;
    const fieldWidth = (params.fieldWidth as number) ?? 180;
    const fieldHeight = (params.fieldHeight as number) ?? 250;
    const centered = params.centered !== false; // Default to true
    const positionX = (params.positionX as number) ?? 50;
    const positionY = (params.positionY as number) ?? 50;

    const { width, height } = ctx.canvas;
    const rng = ctx.rng;

    // Check for stamp input
    const stampLayers = ctx.inputs?.stamp;
    const hasStamp = stampLayers && stampLayers.length > 0 && stampLayers.some(l => l.paths.length > 0);
    const stampCenter = hasStamp ? getStampCenter(stampLayers) : null;
    const stamp = hasStamp ? getStampParams(params) : null;

    // Calculate field position
    let offsetX: number;
    let offsetY: number;

    if (centered) {
      // Center the field on the canvas
      offsetX = (width - fieldWidth) / 2;
      offsetY = (height - fieldHeight) / 2;
    } else {
      // Position based on percentage
      offsetX = (positionX / 100) * width - fieldWidth / 2;
      offsetY = (positionY / 100) * height - fieldHeight / 2;
    }

    const paths: Path[] = [];

    for (let i = 0; i < lines; i++) {
      // Start within the field bounds
      const startX = offsetX + rng() * fieldWidth;
      const startY = offsetY + rng() * fieldHeight;

      if (hasStamp && stampCenter && stamp) {
        // In stamp mode, place stamps along the flow line at each start position
        // Trace the flow line and place stamps at the starting point
        const noiseVal = noise2D(startX * noiseScale, startY * noiseScale, ctx.seed);
        const angle = noiseVal * Math.PI * 4;
        const rotation = getStampRotation(stamp.stampRotation, rng, stamp.stampRandomRotation, angle);
        const stampPaths = placeStamp(stampLayers, stampCenter, startX, startY, stamp.stampScale, rotation);
        paths.push(...stampPaths);
      } else {
        // Default behavior: trace flow lines
        const points: Point[] = [{ x: startX, y: startY }];
        let x = startX;
        let y = startY;

        for (let s = 0; s < steps; s++) {
          const noiseVal = noise2D(x * noiseScale, y * noiseScale, ctx.seed);
          const angle = noiseVal * Math.PI * 4;

          x += Math.cos(angle) * stepSize;
          y += Math.sin(angle) * stepSize;

          // Stop if out of field bounds
          if (x < offsetX || x > offsetX + fieldWidth || y < offsetY || y > offsetY + fieldHeight) {
            break;
          }

          points.push({ x, y });
        }

        if (points.length >= 2) {
          paths.push({ points, closed: false });
        }
      }
    }

    const layer: Layer = {
      id: 'flowfield',
      paths,
    };

    return [layer];
  },
};
