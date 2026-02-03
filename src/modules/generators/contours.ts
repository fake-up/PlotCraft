import type { ModuleDefinition, Layer, Path, Point } from '../../types';
import { noise2D } from '../../engine/geometry';

export const contoursGenerator: ModuleDefinition = {
  id: 'contours',
  name: 'Contours',
  type: 'generator',
  parameters: {
    layerId: {
      type: 'select',
      label: 'Layer',
      default: 'default-layer',
      options: [],
      dynamicOptions: 'plotLayers',
    },
    contourLevels: { type: 'number', label: 'Contour Levels', default: 15, min: 5, max: 50, step: 1 },
    noiseScale: { type: 'number', label: 'Noise Scale', default: 0.01, min: 0.001, max: 0.05, step: 0.001 },
    noiseOctaves: { type: 'number', label: 'Noise Octaves', default: 2, min: 1, max: 5, step: 1 },
    seedOffset: { type: 'number', label: 'Seed Offset', default: 0, min: 0, max: 1000, step: 1 },
    smoothing: { type: 'number', label: 'Smoothing', default: 2, min: 0, max: 5, step: 1 },
    resolution: { type: 'number', label: 'Grid Resolution', default: 100, min: 20, max: 200, step: 10 },
    margin: { type: 'number', label: 'Margin (mm)', default: 10, min: 0, max: 50, step: 5 },
    centered: { type: 'boolean', label: 'Center on Canvas', default: true },
    positionX: { type: 'number', label: 'Position X (%)', default: 50, min: 0, max: 100, step: 1, showWhen: { param: 'centered', value: false } },
    positionY: { type: 'number', label: 'Position Y (%)', default: 50, min: 0, max: 100, step: 1, showWhen: { param: 'centered', value: false } },
  },
  execute: (params, _input, ctx) => {
    const contourLevels = (params.contourLevels as number) ?? 15;
    const noiseScale = (params.noiseScale as number) ?? 0.01;
    const noiseOctaves = (params.noiseOctaves as number) ?? 2;
    const seedOffset = (params.seedOffset as number) ?? 0;
    const smoothing = (params.smoothing as number) ?? 2;
    const resolution = (params.resolution as number) ?? 100;
    const margin = (params.margin as number) ?? 10;

    const { width, height } = ctx.canvas;
    const seed = ctx.seed + seedOffset;

    // Calculate bounds with margin
    const x0 = margin;
    const y0 = margin;
    const x1 = width - margin;
    const y1 = height - margin;
    const fieldWidth = x1 - x0;
    const fieldHeight = y1 - y0;

    if (fieldWidth <= 0 || fieldHeight <= 0) {
      return [{ id: 'contours', paths: [] }];
    }

    // Calculate grid dimensions based on resolution
    const cellSize = Math.max(fieldWidth, fieldHeight) / resolution;
    const cols = Math.ceil(fieldWidth / cellSize) + 1;
    const rows = Math.ceil(fieldHeight / cellSize) + 1;

    // Generate noise field
    const noiseField: number[][] = [];
    for (let row = 0; row < rows; row++) {
      noiseField[row] = [];
      for (let col = 0; col < cols; col++) {
        const x = x0 + col * cellSize;
        const y = y0 + row * cellSize;
        noiseField[row][col] = fbmNoise(x, y, noiseScale, noiseOctaves, seed);
      }
    }

    // Generate contour lines at each level
    const paths: Path[] = [];

    for (let level = 0; level < contourLevels; level++) {
      // Threshold value for this contour (evenly spaced from 0.1 to 0.9)
      const threshold = 0.1 + (level / (contourLevels - 1)) * 0.8;

      // Get contour segments using marching squares
      const segments = marchingSquares(noiseField, threshold, x0, y0, cellSize);

      // Connect segments into polylines
      const polylines = connectSegments(segments);

      // Apply smoothing and add to paths
      for (let polyline of polylines) {
        // Skip very short polylines
        if (polyline.length < 3) continue;

        // Apply smoothing
        for (let i = 0; i < smoothing; i++) {
          polyline = chaikinSmooth(polyline, false);
        }

        paths.push({
          points: polyline,
          closed: false,
        });
      }
    }

    const layer: Layer = {
      id: 'contours',
      paths,
    };

    return [layer];
  },
};

/**
 * Fractal Brownian Motion noise - combines multiple octaves for more natural look
 */
function fbmNoise(
  x: number,
  y: number,
  scale: number,
  octaves: number,
  seed: number
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = scale;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += noise2D(x * frequency, y * frequency, seed + i * 100) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue; // Normalize to 0-1
}

/**
 * Marching squares algorithm to find contour line segments
 */
function marchingSquares(
  field: number[][],
  threshold: number,
  x0: number,
  y0: number,
  cellSize: number
): Array<[Point, Point]> {
  const segments: Array<[Point, Point]> = [];
  const rows = field.length - 1;
  const cols = field[0].length - 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Get the four corners of the cell
      const tl = field[row][col];
      const tr = field[row][col + 1];
      const br = field[row + 1][col + 1];
      const bl = field[row + 1][col];

      // Calculate cell position
      const cx = x0 + col * cellSize;
      const cy = y0 + row * cellSize;

      // Determine which corners are above threshold (1) or below (0)
      const config =
        (tl >= threshold ? 8 : 0) |
        (tr >= threshold ? 4 : 0) |
        (br >= threshold ? 2 : 0) |
        (bl >= threshold ? 1 : 0);

      // Skip if all corners are same (no contour crosses this cell)
      if (config === 0 || config === 15) continue;

      // Calculate interpolated edge crossing points
      const top = lerp(cx, cx + cellSize, (threshold - tl) / (tr - tl));
      const right = lerp(cy, cy + cellSize, (threshold - tr) / (br - tr));
      const bottom = lerp(cx, cx + cellSize, (threshold - bl) / (br - bl));
      const left = lerp(cy, cy + cellSize, (threshold - tl) / (bl - tl));

      // Edge midpoints
      const topPt: Point = { x: top, y: cy };
      const rightPt: Point = { x: cx + cellSize, y: right };
      const bottomPt: Point = { x: bottom, y: cy + cellSize };
      const leftPt: Point = { x: cx, y: left };

      // Add line segments based on marching squares lookup table
      switch (config) {
        case 1:
        case 14:
          segments.push([leftPt, bottomPt]);
          break;
        case 2:
        case 13:
          segments.push([bottomPt, rightPt]);
          break;
        case 3:
        case 12:
          segments.push([leftPt, rightPt]);
          break;
        case 4:
        case 11:
          segments.push([topPt, rightPt]);
          break;
        case 5:
          // Saddle point - ambiguous case
          segments.push([leftPt, topPt]);
          segments.push([bottomPt, rightPt]);
          break;
        case 6:
        case 9:
          segments.push([topPt, bottomPt]);
          break;
        case 7:
        case 8:
          segments.push([leftPt, topPt]);
          break;
        case 10:
          // Saddle point - ambiguous case
          segments.push([topPt, rightPt]);
          segments.push([leftPt, bottomPt]);
          break;
      }
    }
  }

  return segments;
}

/**
 * Linear interpolation
 */
function lerp(a: number, b: number, t: number): number {
  if (!isFinite(t)) return (a + b) / 2;
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * Connect line segments into continuous polylines
 */
function connectSegments(segments: Array<[Point, Point]>): Point[][] {
  if (segments.length === 0) return [];

  const polylines: Point[][] = [];
  const used = new Set<number>();
  const tolerance = 0.001;

  // Helper to check if two points are the same (within tolerance)
  const pointsEqual = (a: Point, b: Point): boolean =>
    Math.abs(a.x - b.x) < tolerance && Math.abs(a.y - b.y) < tolerance;

  // Helper to find a segment that connects to a point
  const findConnecting = (point: Point, exclude: Set<number>): { index: number; reverse: boolean } | null => {
    for (let i = 0; i < segments.length; i++) {
      if (exclude.has(i)) continue;
      const [start, end] = segments[i];
      if (pointsEqual(point, start)) return { index: i, reverse: false };
      if (pointsEqual(point, end)) return { index: i, reverse: true };
    }
    return null;
  };

  // Process all segments
  for (let i = 0; i < segments.length; i++) {
    if (used.has(i)) continue;

    // Start a new polyline with this segment
    const polyline: Point[] = [segments[i][0], segments[i][1]];
    used.add(i);

    // Try to extend forward from the end
    let extended = true;
    while (extended) {
      extended = false;
      const lastPoint = polyline[polyline.length - 1];
      const connecting = findConnecting(lastPoint, used);
      if (connecting) {
        used.add(connecting.index);
        const [start, end] = segments[connecting.index];
        polyline.push(connecting.reverse ? start : end);
        extended = true;
      }
    }

    // Try to extend backward from the start
    extended = true;
    while (extended) {
      extended = false;
      const firstPoint = polyline[0];
      const connecting = findConnecting(firstPoint, used);
      if (connecting) {
        used.add(connecting.index);
        const [start, end] = segments[connecting.index];
        polyline.unshift(connecting.reverse ? start : end);
        extended = true;
      }
    }

    polylines.push(polyline);
  }

  return polylines;
}

/**
 * Chaikin's corner cutting algorithm for smoothing
 */
function chaikinSmooth(points: Point[], closed: boolean): Point[] {
  if (points.length < 3) return points;

  const result: Point[] = [];
  const n = points.length;

  if (closed) {
    for (let i = 0; i < n; i++) {
      const p0 = points[i];
      const p1 = points[(i + 1) % n];
      result.push({
        x: p0.x * 0.75 + p1.x * 0.25,
        y: p0.y * 0.75 + p1.y * 0.25,
      });
      result.push({
        x: p0.x * 0.25 + p1.x * 0.75,
        y: p0.y * 0.25 + p1.y * 0.75,
      });
    }
  } else {
    // Keep first point
    result.push(points[0]);

    for (let i = 0; i < n - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];

      if (i > 0) {
        result.push({
          x: p0.x * 0.75 + p1.x * 0.25,
          y: p0.y * 0.75 + p1.y * 0.25,
        });
      }

      if (i < n - 2) {
        result.push({
          x: p0.x * 0.25 + p1.x * 0.75,
          y: p0.y * 0.25 + p1.y * 0.75,
        });
      }
    }

    // Keep last point
    result.push(points[n - 1]);
  }

  return result;
}
