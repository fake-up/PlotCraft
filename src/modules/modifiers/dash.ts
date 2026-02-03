import type { ModuleDefinition, Path, Point } from '../../types';

// Calculate distance between two points
function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Interpolate between two points
function lerp(p1: Point, p2: Point, t: number): Point {
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  };
}

// Get total length of a path
function getPathLength(points: Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += distance(points[i - 1], points[i]);
  }
  return length;
}

// Get point at a specific distance along the path
function getPointAtDistance(points: Point[], targetDist: number): Point | null {
  let accumulated = 0;
  for (let i = 1; i < points.length; i++) {
    const segmentLength = distance(points[i - 1], points[i]);
    if (accumulated + segmentLength >= targetDist) {
      const t = (targetDist - accumulated) / segmentLength;
      return lerp(points[i - 1], points[i], t);
    }
    accumulated += segmentLength;
  }
  return points[points.length - 1];
}

export const dashModifier: ModuleDefinition = {
  id: 'dash',
  name: 'Dash',
  type: 'modifier',
  parameters: {
    dashLength: { type: 'number', label: 'Dash Length', default: 10, min: 1, max: 50, step: 0.5 },
    gapLength: { type: 'number', label: 'Gap Length', default: 5, min: 1, max: 50, step: 0.5 },
    randomDash: { type: 'number', label: 'Random Dash (%)', default: 0, min: 0, max: 100, step: 5 },
    randomGap: { type: 'number', label: 'Random Gap (%)', default: 0, min: 0, max: 100, step: 5 },
    offset: { type: 'number', label: 'Offset (%)', default: 0, min: 0, max: 100, step: 5 },
    mode: {
      type: 'select',
      label: 'Mode',
      default: 'fixed',
      options: [
        { value: 'fixed', label: 'Fixed' },
        { value: 'fit', label: 'Fit to Path' },
      ],
    },
    minSegmentPoints: { type: 'number', label: 'Points per Dash', default: 2, min: 2, max: 20, step: 1 },
  },
  execute: (params, input, ctx) => {
    const dashLength = (params.dashLength as number) ?? 10;
    const gapLength = (params.gapLength as number) ?? 5;
    const randomDash = ((params.randomDash as number) ?? 0) / 100;
    const randomGap = ((params.randomGap as number) ?? 0) / 100;
    const offset = ((params.offset as number) ?? 0) / 100;
    const mode = (params.mode as string) ?? 'fixed';
    const minSegmentPoints = (params.minSegmentPoints as number) ?? 2;

    const { rng } = ctx;

    return input.map(layer => ({
      ...layer,
      paths: layer.paths.flatMap(path => {
        const totalLength = getPathLength(path.points);
        if (totalLength === 0) return [];

        const patternLength = dashLength + gapLength;
        let actualDashLength = dashLength;
        let actualGapLength = gapLength;

        // Fit mode: adjust dash/gap to fit whole number of patterns
        if (mode === 'fit' && totalLength > patternLength) {
          const patternCount = Math.round(totalLength / patternLength);
          const scaleFactor = totalLength / (patternCount * patternLength);
          actualDashLength = dashLength * scaleFactor;
          actualGapLength = gapLength * scaleFactor;
        }

        const dashedPaths: Path[] = [];
        const startOffset = offset * (actualDashLength + actualGapLength);
        let currentDist = startOffset;

        while (currentDist < totalLength) {
          // Calculate this dash's length (with randomization)
          const thisDashLength = actualDashLength * (1 + (rng() - 0.5) * 2 * randomDash);
          const thisGapLength = actualGapLength * (1 + (rng() - 0.5) * 2 * randomGap);

          const dashStart = currentDist;
          const dashEnd = Math.min(currentDist + thisDashLength, totalLength);

          if (dashEnd > dashStart) {
            // Create dash segment with multiple points for smooth curves
            const dashPoints: Point[] = [];
            const numPoints = Math.max(minSegmentPoints, Math.ceil((dashEnd - dashStart) / 2));

            for (let i = 0; i <= numPoints; i++) {
              const t = i / numPoints;
              const dist = dashStart + t * (dashEnd - dashStart);
              const point = getPointAtDistance(path.points, dist);
              if (point) {
                dashPoints.push(point);
              }
            }

            if (dashPoints.length >= 2) {
              dashedPaths.push({ points: dashPoints, closed: false });
            }
          }

          currentDist = dashEnd + thisGapLength;
        }

        return dashedPaths;
      }),
    }));
  },
};
