import type { ModuleDefinition, Layer, Path } from '../../types';
import { createSeededRng } from '../../engine/rng';

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
    lengthVariation: { type: 'number', label: 'Length Variation (%)', default: 0, min: 0, max: 100, step: 1 },
    variationSeed: { type: 'number', label: 'Variation Seed', default: 12345, min: 0, max: 99999, step: 1 },
    variationFalloff: { type: 'boolean', label: 'Variation Falloff', default: false },
    falloffCenterX: { type: 'number', label: 'Falloff Center X (%)', default: 50, min: 0, max: 100, step: 1, showWhen: { param: 'variationFalloff', value: true } },
    falloffCenterY: { type: 'number', label: 'Falloff Center Y (%)', default: 50, min: 0, max: 100, step: 1, showWhen: { param: 'variationFalloff', value: true } },
    falloffRadius: { type: 'number', label: 'Falloff Radius (%)', default: 50, min: 1, max: 100, step: 1, showWhen: { param: 'variationFalloff', value: true } },
    falloffInvert: { type: 'boolean', label: 'Falloff Invert', default: false, showWhen: { param: 'variationFalloff', value: true } },
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
    const lengthVariation = ((params.lengthVariation as number) ?? 0) / 100;
    const variationSeed = (params.variationSeed as number) ?? 12345;
    const variationFalloff = params.variationFalloff === true;
    const falloffCenterX = (params.falloffCenterX as number) ?? 50;
    const falloffCenterY = (params.falloffCenterY as number) ?? 50;
    const falloffRadius = (params.falloffRadius as number) ?? 50;
    const falloffInvert = params.falloffInvert === true;
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

    // Falloff center in canvas coordinates
    const fCx = (falloffCenterX / 100) * width;
    const fCy = (falloffCenterY / 100) * height;
    const fRadius = (falloffRadius / 100) * Math.max(width, height);

    const rng = createSeededRng(variationSeed);

    const paths: Path[] = [];
    const startRad = (angleStart * Math.PI) / 180;
    const endRad = (angleEnd * Math.PI) / 180;
    const angleRange = endRad - startRad;

    for (let i = 0; i < lineCount; i++) {
      const t = lineCount === 1 ? 0 : i / (lineCount - (angleEnd === 360 && angleStart === 0 ? 0 : 1));
      const angle = startRad + t * angleRange;

      // Compute the outer endpoint before variation
      const tipX = cx + Math.cos(angle) * outerRadius;
      const tipY = cy + Math.sin(angle) * outerRadius;

      // Determine effective variation amount for this line
      let varAmount = lengthVariation;

      if (variationFalloff && varAmount > 0) {
        const dx = tipX - fCx;
        const dy = tipY - fCy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Falloff: 1.0 at center, 0.0 at falloffRadius and beyond
        let falloff = Math.max(0, 1 - dist / fRadius);
        if (falloffInvert) falloff = 1 - falloff;
        varAmount *= falloff;
      }

      // Random multiplier: scales the outer radius between innerRadius and outerRadius
      const randomVal = rng();
      const radiusRange = outerRadius - innerRadius;
      const effectiveOuter = outerRadius - randomVal * varAmount * radiusRange;

      const x1 = cx + Math.cos(angle) * innerRadius;
      const y1 = cy + Math.sin(angle) * innerRadius;
      const x2 = cx + Math.cos(angle) * effectiveOuter;
      const y2 = cy + Math.sin(angle) * effectiveOuter;

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
