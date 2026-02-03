import type { Point, Path, Layer } from '../../types';
import { distance } from '../../engine/geometry';

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
 * Join two paths together, returning the combined path
 * Assumes path1's end connects to path2's start
 */
function concatenatePaths(path1: Path, path2: Path): Path {
  // Skip the first point of path2 since it's (approximately) the same as path1's end
  const combinedPoints = [...path1.points, ...path2.points.slice(1)];

  return {
    points: combinedPoints,
    closed: path1.closed || path2.closed,
  };
}

/**
 * Check if a path forms a closed loop (start point equals end point within tolerance)
 */
function checkIfClosed(path: Path, tolerance: number): Path {
  if (path.points.length < 3) return path;

  const start = getStart(path);
  const end = getEnd(path);

  if (distance(start, end) <= tolerance) {
    return {
      points: path.points.slice(0, -1), // Remove duplicate endpoint
      closed: true,
    };
  }

  return path;
}

/**
 * Join paths within a single layer where endpoints are within tolerance
 */
export function joinPaths(paths: Path[], tolerance: number): Path[] {
  if (paths.length === 0) return [];

  // Create working copies
  let workingPaths = paths.map(p => ({ ...p, points: [...p.points] }));
  const used = new Set<number>();
  const result: Path[] = [];

  for (let i = 0; i < workingPaths.length; i++) {
    if (used.has(i)) continue;

    let currentPath = workingPaths[i];
    used.add(i);
    let changed = true;

    // Keep trying to extend the current path
    while (changed) {
      changed = false;
      const currentEnd = getEnd(currentPath);
      const currentStart = getStart(currentPath);

      for (let j = 0; j < workingPaths.length; j++) {
        if (used.has(j)) continue;

        const candidate = workingPaths[j];
        const candStart = getStart(candidate);
        const candEnd = getEnd(candidate);

        // Check 4 connection cases:
        // 1. current end -> candidate start
        if (distance(currentEnd, candStart) <= tolerance) {
          currentPath = concatenatePaths(currentPath, candidate);
          used.add(j);
          changed = true;
          break;
        }

        // 2. current end -> candidate end (reverse candidate)
        if (distance(currentEnd, candEnd) <= tolerance) {
          currentPath = concatenatePaths(currentPath, reversePath(candidate));
          used.add(j);
          changed = true;
          break;
        }

        // 3. candidate end -> current start (prepend candidate)
        if (distance(candEnd, currentStart) <= tolerance) {
          currentPath = concatenatePaths(candidate, currentPath);
          used.add(j);
          changed = true;
          break;
        }

        // 4. candidate start -> current start (reverse candidate, then prepend)
        if (distance(candStart, currentStart) <= tolerance) {
          currentPath = concatenatePaths(reversePath(candidate), currentPath);
          used.add(j);
          changed = true;
          break;
        }
      }
    }

    // Check if the resulting path forms a closed loop
    currentPath = checkIfClosed(currentPath, tolerance);
    result.push(currentPath);
  }

  return result;
}

/**
 * Apply path joining to all layers
 */
export function joinLayers(layers: Layer[], tolerance: number): Layer[] {
  return layers.map(layer => ({
    id: layer.id,
    paths: joinPaths(layer.paths, tolerance),
  }));
}
