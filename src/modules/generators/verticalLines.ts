import type { ModuleDefinition, Layer, Path } from '../../types';
import { noise2D } from '../../engine/geometry';

export const verticalLinesGenerator: ModuleDefinition = {
  id: 'verticalLines',
  name: 'Vertical Lines',
  type: 'generator',
  parameters: {
    layerId: {
      type: 'select',
      label: 'Layer',
      default: 'default-layer',
      options: [],
      dynamicOptions: 'plotLayers',
    },
    lineCount: { type: 'number', label: 'Line Count', default: 20, min: 1, max: 5000, step: 1 },
    spacing: { type: 'number', label: 'Spacing', default: 10, min: 1, max: 100, step: 0.5 },
    centered: { type: 'boolean', label: 'Center on Canvas', default: true },
    positionX: { type: 'number', label: 'Position X (%)', default: 50, min: 0, max: 100, step: 1, showWhen: { param: 'centered', value: false } },

    // Height Control
    heightMode: {
      type: 'select',
      label: 'Height Mode',
      default: 'uniform',
      options: [
        { value: 'uniform', label: 'Uniform' },
        { value: 'random', label: 'Random' },
        { value: 'gradient', label: 'Gradient' },
        { value: 'wave', label: 'Wave' },
        { value: 'noise', label: 'Noise' },
      ],
    },
    heightMin: { type: 'number', label: 'Min Height (mm)', default: 50, min: 1, max: 500, step: 1 },
    heightMax: { type: 'number', label: 'Max Height (mm)', default: 100, min: 1, max: 500, step: 1 },

    // Gradient mode options
    gradientDirection: {
      type: 'select',
      label: 'Gradient Direction',
      default: 'left-right',
      options: [
        { value: 'left-right', label: 'Left → Right' },
        { value: 'right-left', label: 'Right → Left' },
        { value: 'center-out', label: 'Center → Out' },
        { value: 'edges-in', label: 'Edges → In' },
      ],
      showWhen: { param: 'heightMode', value: 'gradient' },
    },

    // Wave mode options
    waveFrequency: {
      type: 'number',
      label: 'Wave Frequency',
      default: 2,
      min: 0.5,
      max: 10,
      step: 0.5,
      showWhen: { param: 'heightMode', value: 'wave' },
    },
    wavePhase: {
      type: 'number',
      label: 'Wave Phase (°)',
      default: 0,
      min: 0,
      max: 360,
      step: 15,
      showWhen: { param: 'heightMode', value: 'wave' },
    },

    // Noise mode options
    noiseScale: {
      type: 'number',
      label: 'Noise Scale',
      default: 0.02,
      min: 0.001,
      max: 0.1,
      step: 0.001,
      showWhen: { param: 'heightMode', value: 'noise' },
    },
    noiseOctaves: {
      type: 'number',
      label: 'Noise Octaves',
      default: 2,
      min: 1,
      max: 4,
      step: 1,
      showWhen: { param: 'heightMode', value: 'noise' },
    },

    // Vertical Position Control
    alignment: {
      type: 'select',
      label: 'Vertical Alignment',
      default: 'center',
      options: [
        { value: 'bottom', label: 'Bottom' },
        { value: 'top', label: 'Top' },
        { value: 'center', label: 'Center' },
        { value: 'random', label: 'Random' },
        { value: 'wave', label: 'Wave' },
        { value: 'noise', label: 'Noise' },
      ],
    },
    alignmentBase: {
      type: 'number',
      label: 'Base Y Position (%)',
      default: 50,
      min: 0,
      max: 100,
      step: 1,
    },
    alignmentWaveFreq: {
      type: 'number',
      label: 'Align Wave Frequency',
      default: 2,
      min: 0.5,
      max: 10,
      step: 0.5,
      showWhen: { param: 'alignment', value: 'wave' },
    },
    alignmentWaveAmp: {
      type: 'number',
      label: 'Align Wave Amplitude (mm)',
      default: 20,
      min: 0,
      max: 100,
      step: 5,
      showWhen: { param: 'alignment', value: 'wave' },
    },
    alignmentNoiseScale: {
      type: 'number',
      label: 'Align Noise Scale',
      default: 0.02,
      min: 0.001,
      max: 0.1,
      step: 0.001,
      showWhen: { param: 'alignment', value: 'noise' },
    },
    alignmentNoiseAmp: {
      type: 'number',
      label: 'Align Noise Amplitude (mm)',
      default: 20,
      min: 0,
      max: 100,
      step: 5,
      showWhen: { param: 'alignment', value: 'noise' },
    },

    // Height Falloff
    enableHeightFalloff: { type: 'boolean', label: 'Enable Height Falloff', default: false },
    falloffCenterX: {
      type: 'number',
      label: 'Falloff Center X (%)',
      default: 50,
      min: 0,
      max: 100,
      step: 1,
      showWhen: { param: 'enableHeightFalloff', value: true },
    },
    falloffCenterY: {
      type: 'number',
      label: 'Falloff Center Y (%)',
      default: 50,
      min: 0,
      max: 100,
      step: 1,
      showWhen: { param: 'enableHeightFalloff', value: true },
    },
    falloffRadius: {
      type: 'number',
      label: 'Falloff Radius (mm)',
      default: 100,
      min: 10,
      max: 500,
      step: 10,
      showWhen: { param: 'enableHeightFalloff', value: true },
    },
    falloffCurve: {
      type: 'select',
      label: 'Falloff Curve',
      default: 'linear',
      options: [
        { value: 'linear', label: 'Linear' },
        { value: 'ease-in', label: 'Ease In' },
        { value: 'ease-out', label: 'Ease Out' },
        { value: 'ease-in-out', label: 'Ease In-Out' },
      ],
      showWhen: { param: 'enableHeightFalloff', value: true },
    },
    invertFalloff: {
      type: 'boolean',
      label: 'Invert Falloff',
      default: false,
      showWhen: { param: 'enableHeightFalloff', value: true },
    },
  },
  execute: (params, _input, ctx) => {
    const lineCount = (params.lineCount as number) ?? 20;
    const spacing = (params.spacing as number) ?? 10;
    const centered = params.centered !== false;
    const positionX = (params.positionX as number) ?? 50;

    // Height parameters
    const heightMode = (params.heightMode as string) ?? 'uniform';
    const heightMin = (params.heightMin as number) ?? 50;
    const heightMax = (params.heightMax as number) ?? 100;
    const gradientDirection = (params.gradientDirection as string) ?? 'left-right';
    const waveFrequency = (params.waveFrequency as number) ?? 2;
    const wavePhase = ((params.wavePhase as number) ?? 0) * Math.PI / 180;
    const noiseScale = (params.noiseScale as number) ?? 0.02;
    const noiseOctaves = (params.noiseOctaves as number) ?? 2;

    // Alignment parameters
    const alignment = (params.alignment as string) ?? 'center';
    const alignmentBase = (params.alignmentBase as number) ?? 50;
    const alignmentWaveFreq = (params.alignmentWaveFreq as number) ?? 2;
    const alignmentWaveAmp = (params.alignmentWaveAmp as number) ?? 20;
    const alignmentNoiseScale = (params.alignmentNoiseScale as number) ?? 0.02;
    const alignmentNoiseAmp = (params.alignmentNoiseAmp as number) ?? 20;

    // Falloff parameters
    const enableHeightFalloff = params.enableHeightFalloff === true;
    const falloffCenterX = (params.falloffCenterX as number) ?? 50;
    const falloffCenterY = (params.falloffCenterY as number) ?? 50;
    const falloffRadius = (params.falloffRadius as number) ?? 100;
    const falloffCurve = (params.falloffCurve as string) ?? 'linear';
    const invertFalloff = params.invertFalloff === true;

    const { width, height } = ctx.canvas;
    const { rng, seed } = ctx;

    // Calculate starting X position
    const totalWidth = (lineCount - 1) * spacing;
    let startX: number;
    if (centered) {
      startX = (width - totalWidth) / 2;
    } else {
      startX = (positionX / 100) * width - totalWidth / 2;
    }

    // Falloff center in canvas coords
    const falloffCX = (falloffCenterX / 100) * width;
    const falloffCY = (falloffCenterY / 100) * height;

    const paths: Path[] = [];

    for (let i = 0; i < lineCount; i++) {
      const x = startX + i * spacing;
      const normalizedI = lineCount > 1 ? i / (lineCount - 1) : 0.5;

      // Calculate line height based on mode
      let heightFactor = getHeightFactor(
        heightMode,
        normalizedI,
        x,
        waveFrequency,
        wavePhase,
        gradientDirection,
        noiseScale,
        noiseOctaves,
        seed,
        rng
      );

      // Apply height falloff if enabled
      if (enableHeightFalloff) {
        const baseY = (alignmentBase / 100) * height;
        const falloffStrength = calculateHeightFalloff(
          x, baseY, falloffCX, falloffCY, falloffRadius, falloffCurve, invertFalloff
        );
        // Falloff modulates between heightMin and the calculated height
        heightFactor = heightFactor * falloffStrength;
      }

      const lineHeight = heightMin + heightFactor * (heightMax - heightMin);

      // Calculate vertical position based on alignment
      const baseY = (alignmentBase / 100) * height;
      const alignOffset = getAlignmentOffset(
        alignment,
        lineHeight,
        normalizedI,
        x,
        alignmentWaveFreq,
        alignmentWaveAmp,
        alignmentNoiseScale,
        alignmentNoiseAmp,
        seed + 500,
        rng
      );

      let y1: number, y2: number;
      switch (alignment) {
        case 'bottom':
          y1 = baseY;
          y2 = baseY - lineHeight;
          break;
        case 'top':
          y1 = baseY;
          y2 = baseY + lineHeight;
          break;
        case 'center':
        default:
          y1 = baseY - lineHeight / 2 + alignOffset;
          y2 = baseY + lineHeight / 2 + alignOffset;
          break;
        case 'random':
        case 'wave':
        case 'noise':
          y1 = baseY - lineHeight / 2 + alignOffset;
          y2 = baseY + lineHeight / 2 + alignOffset;
          break;
      }

      paths.push({
        points: [{ x, y: y1 }, { x, y: y2 }],
        closed: false,
      });
    }

    const layer: Layer = {
      id: 'verticalLines',
      paths,
    };

    return [layer];
  },
};

/**
 * Calculate height factor (0-1) based on height mode
 */
function getHeightFactor(
  mode: string,
  normalizedI: number,
  x: number,
  waveFrequency: number,
  wavePhase: number,
  gradientDirection: string,
  noiseScale: number,
  noiseOctaves: number,
  seed: number,
  rng: () => number
): number {
  switch (mode) {
    case 'uniform':
      return 1;

    case 'random':
      return rng();

    case 'gradient':
      switch (gradientDirection) {
        case 'left-right':
          return normalizedI;
        case 'right-left':
          return 1 - normalizedI;
        case 'center-out':
          return Math.abs(normalizedI - 0.5) * 2;
        case 'edges-in':
          return 1 - Math.abs(normalizedI - 0.5) * 2;
        default:
          return normalizedI;
      }

    case 'wave':
      // Sine wave across the lines
      const waveValue = Math.sin(normalizedI * Math.PI * 2 * waveFrequency + wavePhase);
      return (waveValue + 1) / 2; // Normalize to 0-1

    case 'noise':
      return fbmNoise(x, 0, noiseScale, noiseOctaves, seed);

    default:
      return 1;
  }
}

/**
 * Calculate alignment offset based on alignment mode
 */
function getAlignmentOffset(
  alignment: string,
  _lineHeight: number,
  normalizedI: number,
  x: number,
  waveFreq: number,
  waveAmp: number,
  noiseScale: number,
  noiseAmp: number,
  seed: number,
  rng: () => number
): number {
  switch (alignment) {
    case 'bottom':
    case 'top':
    case 'center':
      return 0;

    case 'random':
      return (rng() - 0.5) * 2 * waveAmp;

    case 'wave':
      return Math.sin(normalizedI * Math.PI * 2 * waveFreq) * waveAmp;

    case 'noise':
      const noiseVal = fbmNoise(x, 100, noiseScale, 2, seed);
      return (noiseVal - 0.5) * 2 * noiseAmp;

    default:
      return 0;
  }
}

/**
 * Calculate height falloff based on distance from center
 */
function calculateHeightFalloff(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  radius: number,
  curve: string,
  invert: boolean
): number {
  const dx = x - centerX;
  const dy = y - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Normalize distance (0 at center, 1 at radius)
  let normalized = Math.min(1, distance / radius);

  // Apply curve
  let strength: number;
  switch (curve) {
    case 'ease-in':
      strength = 1 - normalized * normalized;
      break;
    case 'ease-out':
      strength = (1 - normalized) * (1 - normalized);
      break;
    case 'ease-in-out':
      strength = normalized < 0.5
        ? 1 - 2 * normalized * normalized
        : 2 * (1 - normalized) * (1 - normalized);
      break;
    case 'linear':
    default:
      strength = 1 - normalized;
      break;
  }

  if (invert) {
    strength = 1 - strength;
  }

  return strength;
}

/**
 * Fractal Brownian Motion noise
 */
function fbmNoise(
  x: number,
  y: number,
  scale: number,
  octaves: number,
  seed: number
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = scale;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += noise2D(x * frequency, y * frequency, seed + i * 100) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}
