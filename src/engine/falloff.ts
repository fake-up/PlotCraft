import type { Point, CanvasSettings, ParameterDef } from '../types';

export interface FalloffParams {
  enableFalloff: boolean;
  falloffX: number; // 0-100 percentage
  falloffY: number; // 0-100 percentage
  falloffRadius: number; // mm
  falloffCurve: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  invertFalloff: boolean;
}

/**
 * Standard falloff parameter definitions to add to modifiers
 */
export const FALLOFF_PARAMETERS: Record<string, ParameterDef> = {
  enableFalloff: {
    type: 'boolean',
    label: 'Enable Falloff',
    default: false,
  },
  falloffX: {
    type: 'number',
    label: 'Falloff X (%)',
    default: 50,
    min: 0,
    max: 100,
    step: 1,
    showWhen: { param: 'enableFalloff', value: true },
  },
  falloffY: {
    type: 'number',
    label: 'Falloff Y (%)',
    default: 50,
    min: 0,
    max: 100,
    step: 1,
    showWhen: { param: 'enableFalloff', value: true },
  },
  falloffRadius: {
    type: 'number',
    label: 'Falloff Radius (mm)',
    default: 100,
    min: 5,
    max: 500,
    step: 5,
    showWhen: { param: 'enableFalloff', value: true },
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
    showWhen: { param: 'enableFalloff', value: true },
  },
  invertFalloff: {
    type: 'boolean',
    label: 'Invert Falloff',
    default: false,
    showWhen: { param: 'enableFalloff', value: true },
  },
};

/**
 * Extract falloff params from a params object
 */
export function getFalloffParams(params: Record<string, unknown>): FalloffParams {
  return {
    enableFalloff: params.enableFalloff === true,
    falloffX: (params.falloffX as number) ?? 50,
    falloffY: (params.falloffY as number) ?? 50,
    falloffRadius: (params.falloffRadius as number) ?? 100,
    falloffCurve: (params.falloffCurve as FalloffParams['falloffCurve']) ?? 'linear',
    invertFalloff: params.invertFalloff === true,
  };
}

/**
 * Apply easing curve to a normalized value (0-1)
 */
function applyCurve(t: number, curve: FalloffParams['falloffCurve']): number {
  // Clamp t to 0-1
  t = Math.max(0, Math.min(1, t));

  switch (curve) {
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return 1 - (1 - t) * (1 - t);
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case 'linear':
    default:
      return t;
  }
}

/**
 * Calculate falloff strength for a point (0 = no effect, 1 = full effect)
 */
export function calculateFalloff(
  point: Point,
  falloff: FalloffParams,
  canvas: CanvasSettings
): number {
  if (!falloff.enableFalloff) {
    return 1; // Full effect when falloff is disabled
  }

  // Calculate center in canvas coordinates
  const centerX = (falloff.falloffX / 100) * canvas.width;
  const centerY = (falloff.falloffY / 100) * canvas.height;

  // Calculate distance from center
  const dx = point.x - centerX;
  const dy = point.y - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Normalize distance to 0-1 range based on radius
  const normalizedDistance = Math.min(1, distance / falloff.falloffRadius);

  // Apply curve (1 at center, 0 at edge)
  let strength = applyCurve(1 - normalizedDistance, falloff.falloffCurve);

  // Invert if needed (0 at center, 1 at edge)
  if (falloff.invertFalloff) {
    strength = 1 - strength;
  }

  return strength;
}

/**
 * Linear interpolation between two values based on falloff strength
 */
export function lerpWithFalloff(
  original: number,
  modified: number,
  strength: number
): number {
  return original + (modified - original) * strength;
}

/**
 * Check if a module has falloff enabled
 */
export function hasFalloffEnabled(params: Record<string, unknown>): boolean {
  return params.enableFalloff === true;
}
