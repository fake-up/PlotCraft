import type { Point, Path, Layer } from '../../types';
import type { PlotStats } from './types';
import { distance } from '../../engine/geometry';

/**
 * Calculate the total draw distance (pen-down movement) for a list of paths
 */
export function calculateDrawDistance(paths: Path[]): number {
  let total = 0;

  for (const path of paths) {
    for (let i = 1; i < path.points.length; i++) {
      total += distance(path.points[i - 1], path.points[i]);
    }
  }

  return total;
}

/**
 * Calculate the total travel distance (pen-up movement) between paths
 * Assumes paths are drawn in order, starting from origin (0, 0)
 */
export function calculateTravelDistance(paths: Path[]): number {
  if (paths.length === 0) return 0;

  let total = 0;
  let currentPosition: Point = { x: 0, y: 0 };

  for (const path of paths) {
    if (path.points.length === 0) continue;

    // Travel from current position to start of path
    total += distance(currentPosition, path.points[0]);

    // Update current position to end of path
    currentPosition = path.points[path.points.length - 1];
  }

  return total;
}

/**
 * Count total number of points across all paths
 */
export function countPoints(paths: Path[]): number {
  let total = 0;
  for (const path of paths) {
    total += path.points.length;
  }
  return total;
}

/**
 * Count total number of paths across all layers
 */
export function countPaths(layers: Layer[]): number {
  let total = 0;
  for (const layer of layers) {
    total += layer.paths.length;
  }
  return total;
}

/**
 * Collect all paths from all layers into a flat array
 */
function getAllPaths(layers: Layer[]): Path[] {
  const paths: Path[] = [];
  for (const layer of layers) {
    paths.push(...layer.paths);
  }
  return paths;
}

/**
 * Calculate comprehensive statistics comparing before and after optimization
 * @param before - Layers before optimization
 * @param after - Layers after optimization
 * @param plotSpeed - Pen plotter speed in mm/s
 */
export function calculateStats(
  before: Layer[],
  after: Layer[],
  plotSpeed: number
): PlotStats {
  const pathsBefore = getAllPaths(before);
  const pathsAfter = getAllPaths(after);

  const drawDistance = calculateDrawDistance(pathsAfter);
  const travelDistance = calculateTravelDistance(pathsAfter);

  // Estimated time = (draw distance + travel distance) / speed
  // This is a simplification; real plotters may have different speeds for pen-up vs pen-down
  const totalDistance = drawDistance + travelDistance;
  const estimatedTime = totalDistance / plotSpeed;

  return {
    pathCountBefore: pathsBefore.length,
    pathCountAfter: pathsAfter.length,
    pointCountBefore: countPoints(pathsBefore),
    pointCountAfter: countPoints(pathsAfter),
    drawDistance,
    travelDistance,
    estimatedTime,
  };
}
