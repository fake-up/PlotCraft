import type { Point, Path } from '../types';

export function createPoint(x: number, y: number): Point {
  return { x, y };
}

export function createPath(points: Point[], closed = false): Path {
  return { points, closed };
}

export function translatePoint(p: Point, dx: number, dy: number): Point {
  return { x: p.x + dx, y: p.y + dy };
}

export function rotatePoint(p: Point, angle: number, cx = 0, cy = 0): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - cx;
  const dy = p.y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

export function scalePath(path: Path, sx: number, sy: number, cx = 0, cy = 0): Path {
  return {
    ...path,
    points: path.points.map(p => ({
      x: cx + (p.x - cx) * sx,
      y: cy + (p.y - cy) * sy,
    })),
  };
}

export function translatePath(path: Path, dx: number, dy: number): Path {
  return {
    ...path,
    points: path.points.map(p => translatePoint(p, dx, dy)),
  };
}

export function rotatePath(path: Path, angle: number, cx = 0, cy = 0): Path {
  return {
    ...path,
    points: path.points.map(p => rotatePoint(p, angle, cx, cy)),
  };
}

export function createCirclePath(cx: number, cy: number, r: number, segments = 64): Path {
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    });
  }
  return { points, closed: true };
}

export function createRectPath(x: number, y: number, w: number, h: number): Path {
  return {
    points: [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
      { x, y },
    ],
    closed: true,
  };
}

export function createLinePath(x1: number, y1: number, x2: number, y2: number): Path {
  return {
    points: [{ x: x1, y: y1 }, { x: x2, y: y2 }],
    closed: false,
  };
}

export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// Clip a path to a rectangle
export function clipPathToRect(path: Path, rx: number, ry: number, rw: number, rh: number): Path[] {
  const result: Path[] = [];
  let currentPath: Point[] = [];

  const inside = (p: Point) =>
    p.x >= rx && p.x <= rx + rw && p.y >= ry && p.y <= ry + rh;

  const intersect = (p1: Point, p2: Point): Point | null => {
    const edges = [
      { x: rx, y: ry, dx: rw, dy: 0 },      // top
      { x: rx + rw, y: ry, dx: 0, dy: rh }, // right
      { x: rx, y: ry + rh, dx: rw, dy: 0 }, // bottom
      { x: rx, y: ry, dx: 0, dy: rh },      // left
    ];

    let closest: Point | null = null;
    let minDist = Infinity;

    for (const edge of edges) {
      const pt = lineIntersection(
        p1.x, p1.y, p2.x, p2.y,
        edge.x, edge.y, edge.x + edge.dx, edge.y + edge.dy
      );
      if (pt) {
        const d = distance(p1, pt);
        if (d < minDist && d > 0.001) {
          minDist = d;
          closest = pt;
        }
      }
    }
    return closest;
  };

  for (let i = 0; i < path.points.length; i++) {
    const curr = path.points[i];
    const prev = i > 0 ? path.points[i - 1] : null;

    const currIn = inside(curr);
    const prevIn = prev ? inside(prev) : false;

    if (currIn) {
      if (prev && !prevIn) {
        const inter = intersect(prev, curr);
        if (inter) currentPath.push(inter);
      }
      currentPath.push(curr);
    } else {
      if (prev && prevIn) {
        const inter = intersect(prev, curr);
        if (inter) currentPath.push(inter);
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

function lineIntersection(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): Point | null {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 0.0001) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  }
  return null;
}

// Simple 2D noise function
export function noise2D(x: number, y: number, seed: number): number {
  const grad = (hash: number, dx: number, dy: number) => {
    const h = hash & 7;
    const u = h < 4 ? dx : dy;
    const v = h < 4 ? dy : dx;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
  };

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

  const hash = (xi: number, yi: number) => {
    let h = seed + xi * 374761393 + yi * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return h ^ (h >> 16);
  };

  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const u = fade(xf);
  const v = fade(yf);

  const n00 = grad(hash(xi, yi), xf, yf);
  const n10 = grad(hash(xi + 1, yi), xf - 1, yf);
  const n01 = grad(hash(xi, yi + 1), xf, yf - 1);
  const n11 = grad(hash(xi + 1, yi + 1), xf - 1, yf - 1);

  const nx0 = lerp(n00, n10, u);
  const nx1 = lerp(n01, n11, u);

  return lerp(nx0, nx1, v) * 0.5 + 0.5;
}
