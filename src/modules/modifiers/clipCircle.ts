import type { ModuleDefinition, Path, Point } from '../../types';
import { distance } from '../../engine/geometry';

export const clipCircleModifier: ModuleDefinition = {
  id: 'clipCircle',
  name: 'Clip Circle',
  type: 'modifier',
  parameters: {
    centerX: { type: 'number', label: 'Center X (%)', default: 50, min: 0, max: 100, step: 1 },
    centerY: { type: 'number', label: 'Center Y (%)', default: 50, min: 0, max: 100, step: 1 },
    radius: { type: 'number', label: 'Radius', default: 80, min: 10, max: 500, step: 5 },
    invert: { type: 'boolean', label: 'Invert (keep outside)', default: false },
  },
  execute: (params, input, ctx) => {
    const centerXPct = (params.centerX as number) ?? 50;
    const centerYPct = (params.centerY as number) ?? 50;
    const radius = (params.radius as number) ?? 80;
    const invert = params.invert === true;

    const { width, height } = ctx.canvas;
    const cx = (centerXPct / 100) * width;
    const cy = (centerYPct / 100) * height;
    const center: Point = { x: cx, y: cy };

    return input.map(layer => {
      const newPaths: Path[] = [];

      for (const path of layer.paths) {
        const clipped = clipPathToCircle(path, center, radius, invert);
        newPaths.push(...clipped);
      }

      return {
        ...layer,
        paths: newPaths,
      };
    });
  },
};

/**
 * Clip a path to a circle, returning multiple path segments
 */
function clipPathToCircle(
  path: Path,
  center: Point,
  radius: number,
  invert: boolean
): Path[] {
  const result: Path[] = [];
  let currentPath: Point[] = [];

  const isInside = (p: Point) => {
    const d = distance(p, center);
    return invert ? d > radius : d <= radius;
  };

  for (let i = 0; i < path.points.length; i++) {
    const curr = path.points[i];
    const prev = i > 0 ? path.points[i - 1] : null;

    const currIn = isInside(curr);
    const prevIn = prev ? isInside(prev) : false;

    if (currIn) {
      if (prev && !prevIn) {
        // Entering the region - find intersection
        const intersection = findCircleIntersection(prev, curr, center, radius);
        if (intersection) {
          currentPath.push(intersection);
        }
      }
      currentPath.push(curr);
    } else {
      if (prev && prevIn) {
        // Leaving the region - find intersection
        const intersection = findCircleIntersection(prev, curr, center, radius);
        if (intersection) {
          currentPath.push(intersection);
        }
        if (currentPath.length >= 2) {
          result.push({ points: [...currentPath], closed: false });
        }
        currentPath = [];
      }
    }
  }

  if (currentPath.length >= 2) {
    result.push({ points: currentPath, closed: false });
  }

  return result;
}

/**
 * Find intersection point of a line segment with a circle
 */
function findCircleIntersection(
  p1: Point,
  p2: Point,
  center: Point,
  radius: number
): Point | null {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const fx = p1.x - center.x;
  const fy = p1.y - center.y;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;

  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return null;
  }

  const sqrtDisc = Math.sqrt(discriminant);

  // Try both solutions, prefer one in [0, 1] range
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);

  let t: number | null = null;

  if (t1 >= 0 && t1 <= 1) {
    t = t1;
  } else if (t2 >= 0 && t2 <= 1) {
    t = t2;
  }

  if (t === null) {
    // Take the one closer to [0,1] range
    const d1 = Math.min(Math.abs(t1), Math.abs(t1 - 1));
    const d2 = Math.min(Math.abs(t2), Math.abs(t2 - 1));
    t = d1 < d2 ? Math.max(0, Math.min(1, t1)) : Math.max(0, Math.min(1, t2));
  }

  return {
    x: p1.x + t * dx,
    y: p1.y + t * dy,
  };
}
