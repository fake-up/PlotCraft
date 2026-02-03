import type { Point, Path, Layer } from '../../types';

/**
 * Calculate perpendicular distance from a point to a line defined by two points
 */
function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  // Line length squared
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    // Line start and end are the same point
    const pdx = point.x - lineStart.x;
    const pdy = point.y - lineStart.y;
    return Math.sqrt(pdx * pdx + pdy * pdy);
  }

  // Calculate perpendicular distance using cross product formula
  const numerator = Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x);
  const denominator = Math.sqrt(lengthSq);

  return numerator / denominator;
}

/**
 * Ramer-Douglas-Peucker algorithm for polyline simplification
 * Recursively removes points that are within epsilon distance from the line
 */
export function rdpSimplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) {
    return points;
  }

  // Find the point with maximum distance from the line between start and end
  let maxDistance = 0;
  let maxIndex = 0;

  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDistance) {
      maxDistance = dist;
      maxIndex = i;
    }
  }

  // If the maximum distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIndex + 1), epsilon);
    const right = rdpSimplify(points.slice(maxIndex), epsilon);

    // Combine results, removing duplicate point at junction
    return [...left.slice(0, -1), ...right];
  }

  // All points are within epsilon, keep only endpoints
  return [start, end];
}

/**
 * Simplify a single path using Ramer-Douglas-Peucker algorithm
 */
export function simplifyPath(path: Path, epsilon: number): Path {
  if (path.points.length < 3) {
    return path;
  }

  const simplifiedPoints = rdpSimplify(path.points, epsilon);

  return {
    points: simplifiedPoints,
    closed: path.closed,
  };
}

/**
 * Apply simplification to all paths in all layers
 */
export function simplifyLayers(layers: Layer[], epsilon: number): Layer[] {
  return layers.map(layer => ({
    id: layer.id,
    paths: layer.paths
      .map(path => simplifyPath(path, epsilon))
      .filter(path => path.points.length >= 2), // Remove degenerate paths
  }));
}
