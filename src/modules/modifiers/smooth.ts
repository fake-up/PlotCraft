import type { ModuleDefinition, Point, Path, CanvasSettings } from '../../types';
import { FALLOFF_PARAMETERS, getFalloffParams, calculateFalloff, lerpWithFalloff } from '../../engine/falloff';
import type { FalloffParams } from '../../engine/falloff';

export const smoothModifier: ModuleDefinition = {
  id: 'smooth',
  name: 'Smooth',
  type: 'modifier',
  parameters: {
    iterations: { type: 'number', label: 'Iterations', default: 2, min: 1, max: 5, step: 1 },
    preserveEndSegments: { type: 'boolean', label: 'Preserve End Segments', default: false },
    ...FALLOFF_PARAMETERS,
  },
  execute: (params, input, ctx) => {
    const iterations = (params.iterations as number) ?? 2;
    const preserveEndSegments = params.preserveEndSegments === true;
    const falloff = getFalloffParams(params);

    return input.map(layer => ({
      ...layer,
      paths: layer.paths.map(path => smoothPathWithFalloff(path, iterations, preserveEndSegments, falloff, ctx.canvas)),
    }));
  },
};

/**
 * Apply Chaikin's corner cutting algorithm to smooth a path, with falloff support
 */
function smoothPathWithFalloff(
  path: Path,
  iterations: number,
  preserveEndSegments: boolean,
  falloff: FalloffParams,
  canvas: CanvasSettings
): Path {
  // First compute fully smoothed path
  let smoothedPoints = path.points;

  for (let i = 0; i < iterations; i++) {
    smoothedPoints = chaikinIteration(smoothedPoints, path.closed, preserveEndSegments);
  }

  // If falloff is not enabled, return fully smoothed
  if (!falloff.enableFalloff) {
    return { ...path, points: smoothedPoints };
  }

  // When falloff is enabled, we need to blend original with smoothed
  // Since smoothing changes point count, we interpolate along the path
  const originalPoints = path.points;
  const result: Point[] = [];

  // Sample the smoothed path at similar positions to the original
  // This is an approximation since smoothing changes path length
  for (let i = 0; i < smoothedPoints.length; i++) {
    const smoothedPt = smoothedPoints[i];
    const strength = calculateFalloff(smoothedPt, falloff, canvas);

    // Find the corresponding position on the original path
    const t = i / (smoothedPoints.length - 1);
    const origIdx = t * (originalPoints.length - 1);
    const origIdxFloor = Math.floor(origIdx);
    const origIdxCeil = Math.min(origIdxFloor + 1, originalPoints.length - 1);
    const origT = origIdx - origIdxFloor;

    const origPt = {
      x: originalPoints[origIdxFloor].x + (originalPoints[origIdxCeil].x - originalPoints[origIdxFloor].x) * origT,
      y: originalPoints[origIdxFloor].y + (originalPoints[origIdxCeil].y - originalPoints[origIdxFloor].y) * origT,
    };

    result.push({
      x: lerpWithFalloff(origPt.x, smoothedPt.x, strength),
      y: lerpWithFalloff(origPt.y, smoothedPt.y, strength),
    });
  }

  return { ...path, points: result };
}

/**
 * Single iteration of Chaikin's corner cutting
 * For each segment, create two new points at 1/4 and 3/4 along the segment
 */
function chaikinIteration(points: Point[], closed: boolean, preserveEndSegments = false): Point[] {
  if (points.length < 2) return points;

  const result: Point[] = [];
  const n = points.length;

  if (closed) {
    // For closed paths, process all segments including the last-to-first
    for (let i = 0; i < n; i++) {
      const p0 = points[i];
      const p1 = points[(i + 1) % n];

      // Point at 1/4 of the segment
      result.push({
        x: p0.x * 0.75 + p1.x * 0.25,
        y: p0.y * 0.75 + p1.y * 0.25,
      });

      // Point at 3/4 of the segment
      result.push({
        x: p0.x * 0.25 + p1.x * 0.75,
        y: p0.y * 0.25 + p1.y * 0.75,
      });
    }
  } else {
    // For open paths, keep the first and last points
    result.push(points[0]);

    // If preserveEndSegments is enabled, also keep the second point (preserves start direction)
    if (preserveEndSegments && n >= 3) {
      result.push(points[1]);
    }

    for (let i = 0; i < n - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];

      // Skip smoothing for first segment if preserving end segments
      if (preserveEndSegments && i === 0) {
        continue;
      }

      // Skip smoothing for last segment if preserving end segments
      if (preserveEndSegments && i === n - 2) {
        continue;
      }

      // Point at 1/4 of the segment (skip for first segment normally)
      if (i > 0 && !(preserveEndSegments && i === 1)) {
        result.push({
          x: p0.x * 0.75 + p1.x * 0.25,
          y: p0.y * 0.75 + p1.y * 0.25,
        });
      }

      // Point at 3/4 of the segment (skip for last segment normally)
      if (i < n - 2 && !(preserveEndSegments && i === n - 3)) {
        result.push({
          x: p0.x * 0.25 + p1.x * 0.75,
          y: p0.y * 0.25 + p1.y * 0.75,
        });
      }
    }

    // If preserveEndSegments is enabled, also keep the second-to-last point
    if (preserveEndSegments && n >= 3) {
      result.push(points[n - 2]);
    }

    result.push(points[n - 1]);
  }

  return result;
}
