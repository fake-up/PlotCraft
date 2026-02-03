import type { ModuleDefinition, Point, Path, CanvasSettings } from '../../types';
import { FALLOFF_PARAMETERS, getFalloffParams, calculateFalloff } from '../../engine/falloff';

export const extendEndpointsModifier: ModuleDefinition = {
  id: 'extend-endpoints',
  name: 'Extend Endpoints',
  type: 'modifier',
  parameters: {
    extendAmount: { type: 'number', label: 'Extend Amount (mm)', default: 10, min: 0, max: 50, step: 0.5 },
    randomness: { type: 'number', label: 'Randomness (%)', default: 50, min: 0, max: 100, step: 1 },
    extendStart: { type: 'boolean', label: 'Extend Start', default: true },
    extendEnd: { type: 'boolean', label: 'Extend End', default: true },
    directionMode: {
      type: 'select',
      label: 'Direction Mode',
      default: 'tangent',
      options: [
        { value: 'tangent', label: 'Tangent (along path)' },
        { value: 'radial', label: 'Radial (from center)' },
        { value: 'vertical', label: 'Vertical' },
        { value: 'horizontal', label: 'Horizontal' },
      ],
    },
    radialCenterX: {
      type: 'number',
      label: 'Radial Center X (%)',
      default: 50,
      min: 0,
      max: 100,
      step: 1,
      showWhen: { param: 'directionMode', value: 'radial' },
    },
    radialCenterY: {
      type: 'number',
      label: 'Radial Center Y (%)',
      default: 50,
      min: 0,
      max: 100,
      step: 1,
      showWhen: { param: 'directionMode', value: 'radial' },
    },
    direction: {
      type: 'select',
      label: 'Direction',
      default: 'outward',
      options: [
        { value: 'outward', label: 'Outward' },
        { value: 'inward', label: 'Inward' },
        { value: 'both', label: 'Both (random)' },
      ],
    },
    debugSeparateLayer: { type: 'boolean', label: 'Debug: Show Extensions Separately', default: false },
    ...FALLOFF_PARAMETERS,
  },
  execute: (params, input, ctx) => {
    const extendAmount = (params.extendAmount as number) ?? 10;
    const randomness = ((params.randomness as number) ?? 50) / 100;
    const extendStart = params.extendStart !== false;
    const extendEnd = params.extendEnd !== false;
    const directionMode = (params.directionMode as string) ?? 'tangent';
    const radialCenterX = (params.radialCenterX as number) ?? 50;
    const radialCenterY = (params.radialCenterY as number) ?? 50;
    const direction = (params.direction as string) ?? 'outward';
    const debugSeparate = params.debugSeparateLayer === true;
    const falloff = getFalloffParams(params);
    const { rng, canvas } = ctx;

    // Calculate radial center in canvas coordinates
    const radialCenter: Point = {
      x: (radialCenterX / 100) * canvas.width,
      y: (radialCenterY / 100) * canvas.height,
    };

    return input.map(layer => {
      const newPaths: Path[] = [];
      const debugExtensions: Path[] = [];

      for (const path of layer.paths) {
        // Skip closed paths - they don't have endpoints to extend
        if (path.closed) {
          newPaths.push(path);
          continue;
        }

        // Need at least 2 points to calculate tangent
        if (path.points.length < 2) {
          newPaths.push(path);
          continue;
        }

        // Deep copy the points array
        const points: Point[] = path.points.map(p => ({ x: p.x, y: p.y }));
        const origN = points.length;

        // Get direction multiplier once per path for "both" mode consistency
        const dirMult = getDirectionMultiplier(direction, rng);

        // Extend END of path
        if (extendEnd) {
          const pPrev = points[origN - 2];
          const pEnd = points[origN - 1];

          // Get extension direction based on mode
          const extDir = getExtensionDirection(
            directionMode,
            pEnd,
            pPrev,
            'end',
            radialCenter,
            canvas
          );

          if (extDir) {
            // Extension amount with randomness
            const ext = extendAmount * (1 + (rng() - 0.5) * 2 * randomness);

            // Apply falloff
            const falloffStrength = calculateFalloff(pEnd, falloff, canvas);

            // Calculate new endpoint position
            const newX = pEnd.x + extDir.x * ext * falloffStrength * dirMult;
            const newY = pEnd.y + extDir.y * ext * falloffStrength * dirMult;

            if (debugSeparate) {
              debugExtensions.push({
                points: [{ x: pEnd.x, y: pEnd.y }, { x: newX, y: newY }],
                closed: false,
              });
            } else {
              points.push({ x: newX, y: newY });
            }
          }
        }

        // Extend START of path
        if (extendStart) {
          const pStart = points[0];
          const pNext = points[1];

          // Get extension direction based on mode
          const extDir = getExtensionDirection(
            directionMode,
            pStart,
            pNext,
            'start',
            radialCenter,
            canvas
          );

          if (extDir) {
            // Extension amount with randomness
            const ext = extendAmount * (1 + (rng() - 0.5) * 2 * randomness);

            // Apply falloff
            const falloffStrength = calculateFalloff(pStart, falloff, canvas);

            // Calculate new start position
            const newX = pStart.x + extDir.x * ext * falloffStrength * dirMult;
            const newY = pStart.y + extDir.y * ext * falloffStrength * dirMult;

            if (debugSeparate) {
              debugExtensions.push({
                points: [{ x: newX, y: newY }, { x: pStart.x, y: pStart.y }],
                closed: false,
              });
            } else {
              points.unshift({ x: newX, y: newY });
            }
          }
        }

        newPaths.push(debugSeparate ? path : { ...path, points });
      }

      if (debugSeparate) {
        newPaths.push(...debugExtensions);
      }

      return { ...layer, paths: newPaths };
    });
  },
};

/**
 * Calculate the extension direction based on the direction mode
 * Returns a normalized unit vector, or null if direction can't be calculated
 */
function getExtensionDirection(
  mode: string,
  endpoint: Point,
  adjacentPoint: Point,
  endType: 'start' | 'end',
  radialCenter: Point,
  _canvas: CanvasSettings
): Point | null {
  switch (mode) {
    case 'tangent': {
      // Direction along the path's tangent
      let dx: number, dy: number;
      if (endType === 'end') {
        // Direction of travel at end: from adjacent toward endpoint
        dx = endpoint.x - adjacentPoint.x;
        dy = endpoint.y - adjacentPoint.y;
      } else {
        // Direction at start: opposite of travel direction (outward from start)
        dx = endpoint.x - adjacentPoint.x;
        dy = endpoint.y - adjacentPoint.y;
      }
      return normalize(dx, dy);
    }

    case 'radial': {
      // Direction from center to endpoint (outward)
      const dx = endpoint.x - radialCenter.x;
      const dy = endpoint.y - radialCenter.y;
      return normalize(dx, dy);
    }

    case 'vertical': {
      // For end: extend downward (positive Y)
      // For start: extend upward (negative Y)
      // This creates extensions that go "away" from the path vertically
      if (endType === 'end') {
        // If endpoint is above adjacent point, extend upward; otherwise downward
        const goingUp = endpoint.y < adjacentPoint.y;
        return { x: 0, y: goingUp ? -1 : 1 };
      } else {
        // If start is above next point, extend upward; otherwise downward
        const goingDown = endpoint.y > adjacentPoint.y;
        return { x: 0, y: goingDown ? 1 : -1 };
      }
    }

    case 'horizontal': {
      // For end: extend based on horizontal direction of travel
      // For start: extend opposite to horizontal direction
      if (endType === 'end') {
        // If endpoint is right of adjacent, extend right; otherwise left
        const goingRight = endpoint.x > adjacentPoint.x;
        return { x: goingRight ? 1 : -1, y: 0 };
      } else {
        // If start is left of next point, extend left; otherwise right
        const goingLeft = endpoint.x < adjacentPoint.x;
        return { x: goingLeft ? -1 : 1, y: 0 };
      }
    }

    default:
      return null;
  }
}

/**
 * Normalize a vector to unit length
 */
function normalize(dx: number, dy: number): Point | null {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.0001) return null;
  return { x: dx / len, y: dy / len };
}

/**
 * Get the direction multiplier based on direction setting
 * 1 = outward (extend away from path/center)
 * -1 = inward (extend toward path/center)
 */
function getDirectionMultiplier(direction: string, rng: () => number): number {
  switch (direction) {
    case 'outward':
      return 1;
    case 'inward':
      return -1;
    case 'both':
      return rng() < 0.5 ? 1 : -1;
    default:
      return 1;
  }
}
