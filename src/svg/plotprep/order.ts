import type { Point, Path, Layer } from '../../types';
import { distance } from '../../engine/geometry';

/**
 * Get the start point of a path
 */
function getStart(path: Path): Point {
  return path.points[0];
}

/**
 * Get the end point of a path
 */
function getEnd(path: Path): Point {
  return path.points[path.points.length - 1];
}

/**
 * Reverse a path's points
 */
function reversePath(path: Path): Path {
  return {
    points: [...path.points].reverse(),
    closed: path.closed,
  };
}

/**
 * Order paths using nearest-neighbor algorithm to minimize pen travel
 * Starts from origin (0, 0) and greedily picks the closest path endpoint
 */
export function orderPaths(paths: Path[]): Path[] {
  if (paths.length <= 1) return paths;

  const remaining = paths.map((path, index) => ({ path, index }));
  const ordered: Path[] = [];
  let currentPosition: Point = { x: 0, y: 0 };

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    let shouldReverse = false;

    // Find the closest path endpoint to current position
    for (let i = 0; i < remaining.length; i++) {
      const { path } = remaining[i];
      const startDist = distance(currentPosition, getStart(path));
      const endDist = distance(currentPosition, getEnd(path));

      if (startDist < bestDistance) {
        bestDistance = startDist;
        bestIndex = i;
        shouldReverse = false;
      }

      if (endDist < bestDistance) {
        bestDistance = endDist;
        bestIndex = i;
        shouldReverse = true;
      }
    }

    // Add the best path to ordered list
    const { path } = remaining[bestIndex];
    const orderedPath = shouldReverse ? reversePath(path) : path;
    ordered.push(orderedPath);

    // Update current position to end of the path we just added
    currentPosition = getEnd(orderedPath);

    // Remove from remaining
    remaining.splice(bestIndex, 1);
  }

  return ordered;
}

/**
 * Order all paths globally across layers to minimize total pen travel
 * Flattens layers into a single optimized group
 */
export function orderLayers(layers: Layer[]): Layer[] {
  // Collect all paths from all layers
  const allPaths: Path[] = [];
  for (const layer of layers) {
    allPaths.push(...layer.paths);
  }

  if (allPaths.length === 0) {
    return [];
  }

  // Order all paths globally
  const orderedPaths = orderPaths(allPaths);

  // Return as a single "optimized" layer
  return [{
    id: 'optimized',
    paths: orderedPaths,
  }];
}
