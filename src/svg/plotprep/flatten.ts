import type { Point } from '../../types';

/**
 * Flatten a quadratic Bezier curve to a polyline using de Casteljau subdivision
 * p0: start point
 * p1: control point
 * p2: end point
 * tolerance: maximum allowed deviation from the curve
 */
export function flattenQuadratic(
  p0: Point,
  p1: Point,
  p2: Point,
  tolerance: number
): Point[] {
  const result: Point[] = [p0];
  flattenQuadraticRecursive(p0, p1, p2, tolerance, result);
  return result;
}

function flattenQuadraticRecursive(
  p0: Point,
  p1: Point,
  p2: Point,
  tolerance: number,
  result: Point[]
): void {
  // Calculate the midpoint of the control polygon
  const mid01: Point = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
  const mid12: Point = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const mid: Point = { x: (mid01.x + mid12.x) / 2, y: (mid01.y + mid12.y) / 2 };

  // Calculate the deviation: distance from control point to the chord
  const dx = p2.x - p0.x;
  const dy = p2.y - p0.y;
  const d = Math.abs((p1.x - p2.x) * dy - (p1.y - p2.y) * dx);
  const lengthSq = dx * dx + dy * dy;

  // If the curve is flat enough, just add the endpoint
  if (d * d <= tolerance * tolerance * lengthSq) {
    result.push(p2);
    return;
  }

  // Otherwise, subdivide
  flattenQuadraticRecursive(p0, mid01, mid, tolerance, result);
  flattenQuadraticRecursive(mid, mid12, p2, tolerance, result);
}

/**
 * Flatten a cubic Bezier curve to a polyline using de Casteljau subdivision
 * p0: start point
 * p1: first control point
 * p2: second control point
 * p3: end point
 * tolerance: maximum allowed deviation from the curve
 */
export function flattenCubic(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  tolerance: number
): Point[] {
  const result: Point[] = [p0];
  flattenCubicRecursive(p0, p1, p2, p3, tolerance, result);
  return result;
}

function flattenCubicRecursive(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  tolerance: number,
  result: Point[]
): void {
  // Calculate the deviation using the maximum distance of control points from the chord
  const dx = p3.x - p0.x;
  const dy = p3.y - p0.y;
  const lengthSq = dx * dx + dy * dy;

  // Distance of control points from the line p0->p3
  const d1 = Math.abs((p1.x - p0.x) * dy - (p1.y - p0.y) * dx);
  const d2 = Math.abs((p2.x - p0.x) * dy - (p2.y - p0.y) * dx);
  const d = Math.max(d1, d2);

  // If the curve is flat enough, just add the endpoint
  if (d * d <= tolerance * tolerance * lengthSq || lengthSq < 0.0001) {
    result.push(p3);
    return;
  }

  // De Casteljau subdivision at t=0.5
  const mid01: Point = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
  const mid12: Point = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const mid23: Point = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };

  const mid012: Point = { x: (mid01.x + mid12.x) / 2, y: (mid01.y + mid12.y) / 2 };
  const mid123: Point = { x: (mid12.x + mid23.x) / 2, y: (mid12.y + mid23.y) / 2 };

  const mid0123: Point = { x: (mid012.x + mid123.x) / 2, y: (mid012.y + mid123.y) / 2 };

  // Recurse on both halves
  flattenCubicRecursive(p0, mid01, mid012, mid0123, tolerance, result);
  flattenCubicRecursive(mid0123, mid123, mid23, p3, tolerance, result);
}

/**
 * Flatten an arc to a polyline
 * This is a placeholder for future arc support
 */
export function flattenArc(
  center: Point,
  radius: number,
  startAngle: number,
  endAngle: number,
  tolerance: number
): Point[] {
  // Calculate number of segments based on arc length and tolerance
  const arcLength = Math.abs(endAngle - startAngle) * radius;
  const segments = Math.max(2, Math.ceil(arcLength / Math.sqrt(8 * tolerance * radius)));

  const result: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + (endAngle - startAngle) * t;
    result.push({
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  }

  return result;
}
