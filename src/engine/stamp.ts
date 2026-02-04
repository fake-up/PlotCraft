import type { Path, Point, Layer, ParameterDef } from '../types';

/** Shared stamp parameters for generators that support stamp input */
export const STAMP_PARAMETERS: Record<string, ParameterDef> = {
  stampScale: {
    type: 'number',
    label: 'Stamp Scale',
    default: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
  },
  stampRotation: {
    type: 'select',
    label: 'Stamp Rotation',
    default: 'fixed',
    options: [
      { value: 'fixed', label: 'Fixed (0°)' },
      { value: 'random', label: 'Random' },
      { value: 'follow', label: 'Follow Direction' },
    ],
  },
  stampRandomRotation: {
    type: 'number',
    label: 'Random Rotation (°)',
    default: 180,
    min: 0,
    max: 360,
    step: 1,
    showWhen: { param: 'stampRotation', value: 'random' },
  },
};

/** Compute the centroid (center) of all paths in a set of layers */
export function getStampCenter(layers: Layer[]): Point {
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (const layer of layers) {
    for (const path of layer.paths) {
      for (const pt of path.points) {
        sumX += pt.x;
        sumY += pt.y;
        count++;
      }
    }
  }

  if (count === 0) return { x: 0, y: 0 };
  return { x: sumX / count, y: sumY / count };
}

/**
 * Place a stamp (set of paths) at a given position with scale and rotation.
 * The stamp paths are centered around (0,0) relative to stampCenter,
 * then scaled, rotated, and translated to the target position.
 */
export function placeStamp(
  stampLayers: Layer[],
  stampCenter: Point,
  targetX: number,
  targetY: number,
  scale: number,
  rotationRad: number,
): Path[] {
  const cosR = Math.cos(rotationRad);
  const sinR = Math.sin(rotationRad);
  const result: Path[] = [];

  for (const layer of stampLayers) {
    for (const path of layer.paths) {
      const transformedPoints: Point[] = path.points.map((pt) => {
        // Center the point
        const dx = (pt.x - stampCenter.x) * scale;
        const dy = (pt.y - stampCenter.y) * scale;
        // Rotate
        const rx = dx * cosR - dy * sinR;
        const ry = dx * sinR + dy * cosR;
        // Translate to target
        return { x: targetX + rx, y: targetY + ry };
      });
      result.push({ points: transformedPoints, closed: path.closed });
    }
  }

  return result;
}

/** Extract stamp parameters from params record */
export function getStampParams(params: Record<string, unknown>) {
  return {
    stampScale: (params.stampScale as number) ?? 1,
    stampRotation: (params.stampRotation as string) ?? 'fixed',
    stampRandomRotation: (params.stampRandomRotation as number) ?? 180,
  };
}

/**
 * Compute the rotation angle for a stamp placement.
 * @param mode - 'fixed', 'random', or 'follow'
 * @param rng - random number generator
 * @param randomAmount - max random rotation in degrees
 * @param directionRad - direction angle in radians (for 'follow' mode)
 */
export function getStampRotation(
  mode: string,
  rng: () => number,
  randomAmount: number,
  directionRad?: number,
): number {
  switch (mode) {
    case 'random': {
      const maxRad = (randomAmount * Math.PI) / 180;
      return (rng() * 2 - 1) * maxRad;
    }
    case 'follow':
      return directionRad ?? 0;
    default:
      return 0;
  }
}
