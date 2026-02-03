import type { ModuleDefinition, Layer, Path, Point } from '../../types';

interface VoronoiEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const voronoiGenerator: ModuleDefinition = {
  id: 'voronoi',
  name: 'Voronoi',
  type: 'generator',
  parameters: {
    layerId: {
      type: 'select',
      label: 'Layer',
      default: 'default-layer',
      options: [],
      dynamicOptions: 'plotLayers',
    },
    pointCount: { type: 'number', label: 'Point Count', default: 30, min: 3, max: 500, step: 1 },
    relaxationIterations: { type: 'number', label: 'Relaxation (Lloyd)', default: 0, min: 0, max: 10, step: 1 },
    margin: { type: 'number', label: 'Margin', default: 20, min: 0, max: 100, step: 5 },
  },
  execute: (params, _input, ctx) => {
    const pointCount = (params.pointCount as number) ?? 30;
    const relaxationIterations = (params.relaxationIterations as number) ?? 0;
    const margin = (params.margin as number) ?? 20;

    const { width, height } = ctx.canvas;
    const { rng } = ctx;

    // Generate random points
    let points: Point[] = [];
    for (let i = 0; i < pointCount; i++) {
      points.push({
        x: margin + rng() * (width - 2 * margin),
        y: margin + rng() * (height - 2 * margin),
      });
    }

    // Lloyd's relaxation
    for (let iter = 0; iter < relaxationIterations; iter++) {
      const cells = computeVoronoiCells(points, width, height);
      points = cells.map(cell => getCentroid(cell));
    }

    // Compute final Voronoi edges
    const edges = computeVoronoiEdges(points, width, height, margin);

    // Convert edges to paths
    const paths: Path[] = edges.map(edge => ({
      points: [
        { x: edge.x1, y: edge.y1 },
        { x: edge.x2, y: edge.y2 },
      ],
      closed: false,
    }));

    const layer: Layer = {
      id: 'voronoi',
      paths,
    };

    return [layer];
  },
};

// Simple Voronoi implementation using Fortune's algorithm approximation
// For simplicity, we use a brute-force edge detection approach
function computeVoronoiEdges(
  points: Point[],
  width: number,
  height: number,
  margin: number
): VoronoiEdge[] {
  const edges: VoronoiEdge[] = [];

  // For each pair of adjacent points, find the perpendicular bisector
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p1 = points[i];
      const p2 = points[j];

      // Midpoint of the two points
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      // Direction perpendicular to the line between points
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const perpX = -dy;
      const perpY = dx;
      const len = Math.sqrt(perpX * perpX + perpY * perpY);
      const nx = perpX / len;
      const ny = perpY / len;

      // Extend the bisector line
      const extendDist = Math.max(width, height) * 2;
      let x1 = midX - nx * extendDist;
      let y1 = midY - ny * extendDist;
      let x2 = midX + nx * extendDist;
      let y2 = midY + ny * extendDist;

      // Clip to bounds
      const clipped = clipLineToBounds(x1, y1, x2, y2, margin, margin, width - margin, height - margin);
      if (!clipped) continue;

      [x1, y1, x2, y2] = clipped;

      // Check if this edge is actually a Voronoi edge
      // (the midpoint should be equidistant to the two nearest points)
      const testPoints = [
        { x: (x1 + x2) / 2, y: (y1 + y2) / 2 },
        { x: x1 + (x2 - x1) * 0.25, y: y1 + (y2 - y1) * 0.25 },
        { x: x1 + (x2 - x1) * 0.75, y: y1 + (y2 - y1) * 0.75 },
      ];

      let isValidEdge = true;
      for (const tp of testPoints) {
        const d1 = dist(tp, p1);
        const d2 = dist(tp, p2);

        // Check if any other point is closer
        for (let k = 0; k < points.length; k++) {
          if (k === i || k === j) continue;
          const dk = dist(tp, points[k]);
          if (dk < Math.min(d1, d2) - 0.1) {
            isValidEdge = false;
            break;
          }
        }
        if (!isValidEdge) break;
      }

      if (isValidEdge) {
        // Trim edge to valid region
        const trimmed = trimEdgeToVoronoiRegion(x1, y1, x2, y2, i, j, points);
        if (trimmed) {
          edges.push({ x1: trimmed[0], y1: trimmed[1], x2: trimmed[2], y2: trimmed[3] });
        }
      }
    }
  }

  return edges;
}

function trimEdgeToVoronoiRegion(
  x1: number, y1: number, x2: number, y2: number,
  i: number, j: number,
  points: Point[]
): [number, number, number, number] | null {
  const p1 = points[i];
  const p2 = points[j];

  // Sample along the edge to find valid range
  const samples = 50;
  let validStart = -1;
  let validEnd = -1;

  for (let s = 0; s <= samples; s++) {
    const t = s / samples;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;

    const d1 = dist({ x: px, y: py }, p1);
    const d2 = dist({ x: px, y: py }, p2);
    const dMin = Math.min(d1, d2);

    let isValid = true;
    for (let k = 0; k < points.length; k++) {
      if (k === i || k === j) continue;
      const dk = dist({ x: px, y: py }, points[k]);
      if (dk < dMin - 0.5) {
        isValid = false;
        break;
      }
    }

    if (isValid) {
      if (validStart < 0) validStart = t;
      validEnd = t;
    }
  }

  if (validStart < 0 || validEnd < 0 || validEnd <= validStart) {
    return null;
  }

  return [
    x1 + (x2 - x1) * validStart,
    y1 + (y2 - y1) * validStart,
    x1 + (x2 - x1) * validEnd,
    y1 + (y2 - y1) * validEnd,
  ];
}

function computeVoronoiCells(points: Point[], width: number, height: number): Point[][] {
  // Simplified: return approximate cell vertices for centroid calculation
  // For Lloyd's relaxation, we just need approximate centroids
  const cells: Point[][] = [];
  const gridSize = 5;

  for (let i = 0; i < points.length; i++) {
    const cell: Point[] = [];

    // Sample points around the site and find boundary
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
      let dist = 1;
      while (dist < Math.max(width, height)) {
        const px = points[i].x + Math.cos(angle) * dist;
        const py = points[i].y + Math.sin(angle) * dist;

        // Check if still closest to point i
        let closest = i;
        let closestDist = Math.sqrt(
          (px - points[i].x) ** 2 + (py - points[i].y) ** 2
        );

        for (let j = 0; j < points.length; j++) {
          if (j === i) continue;
          const d = Math.sqrt(
            (px - points[j].x) ** 2 + (py - points[j].y) ** 2
          );
          if (d < closestDist) {
            closestDist = d;
            closest = j;
          }
        }

        if (closest !== i || px < 0 || px > width || py < 0 || py > height) {
          cell.push({ x: px, y: py });
          break;
        }

        dist += gridSize;
      }
    }

    cells.push(cell);
  }

  return cells;
}

function getCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };

  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }

  return {
    x: sumX / points.length,
    y: sumY / points.length,
  };
}

function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function clipLineToBounds(
  x1: number, y1: number, x2: number, y2: number,
  minX: number, minY: number, maxX: number, maxY: number
): [number, number, number, number] | null {
  // Cohen-Sutherland line clipping
  const INSIDE = 0;
  const LEFT = 1;
  const RIGHT = 2;
  const BOTTOM = 4;
  const TOP = 8;

  function computeCode(x: number, y: number): number {
    let code = INSIDE;
    if (x < minX) code |= LEFT;
    else if (x > maxX) code |= RIGHT;
    if (y < minY) code |= BOTTOM;
    else if (y > maxY) code |= TOP;
    return code;
  }

  let code1 = computeCode(x1, y1);
  let code2 = computeCode(x2, y2);

  while (true) {
    if (!(code1 | code2)) {
      return [x1, y1, x2, y2];
    }
    if (code1 & code2) {
      return null;
    }

    const codeOut = code1 ? code1 : code2;
    let x: number, y: number;

    if (codeOut & TOP) {
      x = x1 + (x2 - x1) * (maxY - y1) / (y2 - y1);
      y = maxY;
    } else if (codeOut & BOTTOM) {
      x = x1 + (x2 - x1) * (minY - y1) / (y2 - y1);
      y = minY;
    } else if (codeOut & RIGHT) {
      y = y1 + (y2 - y1) * (maxX - x1) / (x2 - x1);
      x = maxX;
    } else {
      y = y1 + (y2 - y1) * (minX - x1) / (x2 - x1);
      x = minX;
    }

    if (codeOut === code1) {
      x1 = x;
      y1 = y;
      code1 = computeCode(x1, y1);
    } else {
      x2 = x;
      y2 = y;
      code2 = computeCode(x2, y2);
    }
  }
}
