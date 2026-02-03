import type { ModuleDefinition, Point, CanvasSettings } from '../../types';
import { FALLOFF_PARAMETERS, getFalloffParams, calculateFalloff, lerpWithFalloff } from '../../engine/falloff';
import type { FalloffParams } from '../../engine/falloff';

export const twistModifier: ModuleDefinition = {
  id: 'twist',
  name: 'Twist',
  type: 'modifier',
  parameters: {
    twistAmount: {
      type: 'number',
      label: 'Twist Amount (°)',
      default: 180,
      min: -720,
      max: 720,
      step: 15,
    },
    centerX: {
      type: 'number',
      label: 'Center X (%)',
      default: 50,
      min: 0,
      max: 100,
      step: 1,
    },
    centerY: {
      type: 'number',
      label: 'Center Y (%)',
      default: 50,
      min: 0,
      max: 100,
      step: 1,
    },
    twistProfile: {
      type: 'select',
      label: 'Twist Profile',
      default: 'linear',
      options: [
        { value: 'linear', label: 'Linear' },
        { value: 'ease-in', label: 'Ease In' },
        { value: 'ease-out', label: 'Ease Out' },
        { value: 'ease-in-out', label: 'Ease In-Out' },
        { value: 'inverse', label: 'Inverse (center heavy)' },
      ],
    },
    innerRadius: {
      type: 'number',
      label: 'Inner Radius (mm)',
      default: 0,
      min: 0,
      max: 200,
      step: 5,
    },
    outerRadius: {
      type: 'number',
      label: 'Outer Radius (mm)',
      default: 200,
      min: 0,
      max: 500,
      step: 10,
    },
    includeRadialWave: {
      type: 'boolean',
      label: 'Add Radial Wave',
      default: false,
    },
    waveFrequency: {
      type: 'number',
      label: 'Wave Frequency',
      default: 6,
      min: 1,
      max: 20,
      step: 1,
      showWhen: { param: 'includeRadialWave', value: true },
    },
    waveAmplitude: {
      type: 'number',
      label: 'Wave Amplitude (mm)',
      default: 10,
      min: 0,
      max: 50,
      step: 1,
      showWhen: { param: 'includeRadialWave', value: true },
    },
    ...FALLOFF_PARAMETERS,
  },
  execute: (params, input, ctx) => {
    const twistAmount = (params.twistAmount as number) ?? 180;
    const centerXPct = (params.centerX as number) ?? 50;
    const centerYPct = (params.centerY as number) ?? 50;
    const twistProfile = (params.twistProfile as string) ?? 'linear';
    const innerRadius = (params.innerRadius as number) ?? 0;
    const outerRadius = (params.outerRadius as number) ?? 200;
    const includeRadialWave = params.includeRadialWave === true;
    const waveFrequency = (params.waveFrequency as number) ?? 6;
    const waveAmplitude = (params.waveAmplitude as number) ?? 10;
    const falloff = getFalloffParams(params);

    const { width, height } = ctx.canvas;

    // Calculate center in canvas coordinates
    const centerX = (centerXPct / 100) * width;
    const centerY = (centerYPct / 100) * height;

    // Convert twist amount to radians
    const twistRadians = (twistAmount * Math.PI) / 180;

    return input.map(layer => ({
      ...layer,
      paths: layer.paths.map(path => ({
        ...path,
        points: path.points.map(p =>
          twistPoint(p, {
            centerX,
            centerY,
            twistRadians,
            twistProfile,
            innerRadius,
            outerRadius,
            includeRadialWave,
            waveFrequency,
            waveAmplitude,
            falloff,
            canvas: ctx.canvas,
          })
        ),
      })),
    }));
  },
};

interface TwistOptions {
  centerX: number;
  centerY: number;
  twistRadians: number;
  twistProfile: string;
  innerRadius: number;
  outerRadius: number;
  includeRadialWave: boolean;
  waveFrequency: number;
  waveAmplitude: number;
  falloff: FalloffParams;
  canvas: CanvasSettings;
}

function twistPoint(point: Point, options: TwistOptions): Point {
  const {
    centerX,
    centerY,
    twistRadians,
    twistProfile,
    innerRadius,
    outerRadius,
    includeRadialWave,
    waveFrequency,
    waveAmplitude,
    falloff,
    canvas,
  } = options;

  // Calculate distance and angle from center
  const dx = point.x - centerX;
  const dy = point.y - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  // Calculate normalized distance (0 at innerRadius, 1 at outerRadius)
  let normalizedDist: number;
  if (outerRadius <= innerRadius) {
    normalizedDist = distance > innerRadius ? 1 : 0;
  } else {
    normalizedDist = (distance - innerRadius) / (outerRadius - innerRadius);
    normalizedDist = Math.max(0, Math.min(1, normalizedDist));
  }

  // Apply twist profile
  const twistFactor = applyProfile(normalizedDist, twistProfile);

  // Calculate twist angle for this point
  const pointTwist = twistRadians * twistFactor;

  // Apply falloff
  const falloffStrength = calculateFalloff(point, falloff, canvas);

  // Final twist angle with falloff
  const finalTwist = pointTwist * falloffStrength;

  // Rotate the point around the center
  const newAngle = angle + finalTwist;
  let newDistance = distance;

  // Apply radial wave if enabled
  if (includeRadialWave && waveAmplitude > 0) {
    // Wave based on the NEW angle (after twist) for spiral effect
    const wavePhase = newAngle * waveFrequency;
    const waveOffset = Math.sin(wavePhase) * waveAmplitude * falloffStrength;
    newDistance = Math.max(0, distance + waveOffset);
  }

  // Calculate new position
  const twistedX = centerX + Math.cos(newAngle) * newDistance;
  const twistedY = centerY + Math.sin(newAngle) * newDistance;

  // Interpolate between original and twisted based on falloff
  return {
    x: lerpWithFalloff(point.x, twistedX, falloffStrength),
    y: lerpWithFalloff(point.y, twistedY, falloffStrength),
  };
}

/**
 * Apply easing profile to normalized distance
 */
function applyProfile(t: number, profile: string): number {
  switch (profile) {
    case 'linear':
      return t;

    case 'ease-in':
      // Quadratic ease in - slow start
      return t * t;

    case 'ease-out':
      // Quadratic ease out - fast start
      return 1 - (1 - t) * (1 - t);

    case 'ease-in-out':
      // Smooth S-curve
      return t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;

    case 'inverse':
      // More twist near center, less at edges
      // Invert the normalized distance so center gets max twist
      return 1 - t;

    default:
      return t;
  }
}
