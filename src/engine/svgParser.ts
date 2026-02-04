import type { Point, Path } from '../types';
import { flattenCubic, flattenQuadratic } from '../svg/plotprep/flatten';

const CURVE_TOLERANCE = 0.5;

// ============ Transform Matrix ============

type Matrix = [number, number, number, number, number, number]; // [a, b, c, d, e, f]

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function multiplyMatrix(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function applyMatrix(m: Matrix, p: Point): Point {
  return {
    x: m[0] * p.x + m[2] * p.y + m[4],
    y: m[1] * p.x + m[3] * p.y + m[5],
  };
}

function parseTransform(attr: string): Matrix {
  let result: Matrix = IDENTITY;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]+)\)/g;
  let match;

  while ((match = re.exec(attr)) !== null) {
    const type = match[1];
    const args = match[2].split(/[\s,]+/).map(Number);
    let m: Matrix = IDENTITY;

    switch (type) {
      case 'matrix':
        m = [args[0], args[1], args[2], args[3], args[4], args[5]];
        break;
      case 'translate':
        m = [1, 0, 0, 1, args[0] || 0, args[1] || 0];
        break;
      case 'scale': {
        const sx = args[0];
        const sy = args[1] ?? sx;
        m = [sx, 0, 0, sy, 0, 0];
        break;
      }
      case 'rotate': {
        const angle = (args[0] * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        if (args.length >= 3) {
          const cx = args[1], cy = args[2];
          m = [cos, sin, -sin, cos, cx - cos * cx + sin * cy, cy - sin * cx - cos * cy];
        } else {
          m = [cos, sin, -sin, cos, 0, 0];
        }
        break;
      }
      case 'skewX': {
        const angle = (args[0] * Math.PI) / 180;
        m = [1, 0, Math.tan(angle), 1, 0, 0];
        break;
      }
      case 'skewY': {
        const angle = (args[0] * Math.PI) / 180;
        m = [1, Math.tan(angle), 0, 1, 0, 0];
        break;
      }
    }

    result = multiplyMatrix(result, m);
  }

  return result;
}

// ============ SVG Path "d" Parser ============

interface PathCommand {
  type: string;
  args: number[];
}

function tokenizePathD(d: string): PathCommand[] {
  const commands: PathCommand[] = [];
  // Match command letter followed by optional numbers
  const re = /([MmZzLlHhVvCcSsQqTtAa])\s*((?:[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?[\s,]*)*)/g;
  let match;

  while ((match = re.exec(d)) !== null) {
    const type = match[1];
    const numStr = match[2].trim();
    const args = numStr.length > 0
      ? numStr.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g)?.map(Number) ?? []
      : [];

    // Some commands take multiple coordinate pairs (e.g. L x1 y1 x2 y2 ...)
    const argCounts: Record<string, number> = {
      M: 2, m: 2, L: 2, l: 2, H: 1, h: 1, V: 1, v: 1,
      C: 6, c: 6, S: 4, s: 4, Q: 4, q: 4, T: 2, t: 2, A: 7, a: 7,
      Z: 0, z: 0,
    };

    const count = argCounts[type] ?? 0;
    if (count === 0) {
      commands.push({ type, args: [] });
    } else {
      // Split into groups of `count` args
      for (let i = 0; i < args.length; i += count) {
        const chunk = args.slice(i, i + count);
        if (chunk.length === count) {
          // After M, subsequent groups become implicit L
          if (i > 0 && (type === 'M' || type === 'm')) {
            commands.push({ type: type === 'M' ? 'L' : 'l', args: chunk });
          } else {
            commands.push({ type, args: chunk });
          }
        }
      }
    }
  }

  return commands;
}

function executePathCommands(commands: PathCommand[]): Path[] {
  const paths: Path[] = [];
  let currentPoints: Point[] = [];
  let cx = 0, cy = 0; // Current point
  let sx = 0, sy = 0; // Subpath start
  let lastControlX = 0, lastControlY = 0; // For S/T smooth commands
  let lastCmd = '';

  function pushCurrentPath(closed: boolean) {
    if (currentPoints.length >= 2) {
      paths.push({ points: [...currentPoints], closed });
    }
    currentPoints = [];
  }

  for (const cmd of commands) {
    const { type, args } = cmd;

    switch (type) {
      case 'M':
        pushCurrentPath(false);
        cx = args[0]; cy = args[1];
        sx = cx; sy = cy;
        currentPoints.push({ x: cx, y: cy });
        break;
      case 'm':
        pushCurrentPath(false);
        cx += args[0]; cy += args[1];
        sx = cx; sy = cy;
        currentPoints.push({ x: cx, y: cy });
        break;

      case 'L':
        cx = args[0]; cy = args[1];
        currentPoints.push({ x: cx, y: cy });
        break;
      case 'l':
        cx += args[0]; cy += args[1];
        currentPoints.push({ x: cx, y: cy });
        break;

      case 'H':
        cx = args[0];
        currentPoints.push({ x: cx, y: cy });
        break;
      case 'h':
        cx += args[0];
        currentPoints.push({ x: cx, y: cy });
        break;

      case 'V':
        cy = args[0];
        currentPoints.push({ x: cx, y: cy });
        break;
      case 'v':
        cy += args[0];
        currentPoints.push({ x: cx, y: cy });
        break;

      case 'C': {
        const pts = flattenCubic(
          { x: cx, y: cy },
          { x: args[0], y: args[1] },
          { x: args[2], y: args[3] },
          { x: args[4], y: args[5] },
          CURVE_TOLERANCE
        );
        // Skip first point (it's the current point)
        for (let i = 1; i < pts.length; i++) currentPoints.push(pts[i]);
        lastControlX = args[2]; lastControlY = args[3];
        cx = args[4]; cy = args[5];
        break;
      }
      case 'c': {
        const pts = flattenCubic(
          { x: cx, y: cy },
          { x: cx + args[0], y: cy + args[1] },
          { x: cx + args[2], y: cy + args[3] },
          { x: cx + args[4], y: cy + args[5] },
          CURVE_TOLERANCE
        );
        lastControlX = cx + args[2]; lastControlY = cy + args[3];
        cx += args[4]; cy += args[5];
        for (let i = 1; i < pts.length; i++) currentPoints.push(pts[i]);
        break;
      }

      case 'S': {
        // Smooth cubic: reflect last control point
        let cp1x: number, cp1y: number;
        if (lastCmd === 'C' || lastCmd === 'c' || lastCmd === 'S' || lastCmd === 's') {
          cp1x = 2 * cx - lastControlX;
          cp1y = 2 * cy - lastControlY;
        } else {
          cp1x = cx; cp1y = cy;
        }
        const pts = flattenCubic(
          { x: cx, y: cy },
          { x: cp1x, y: cp1y },
          { x: args[0], y: args[1] },
          { x: args[2], y: args[3] },
          CURVE_TOLERANCE
        );
        for (let i = 1; i < pts.length; i++) currentPoints.push(pts[i]);
        lastControlX = args[0]; lastControlY = args[1];
        cx = args[2]; cy = args[3];
        break;
      }
      case 's': {
        let cp1x: number, cp1y: number;
        if (lastCmd === 'C' || lastCmd === 'c' || lastCmd === 'S' || lastCmd === 's') {
          cp1x = 2 * cx - lastControlX;
          cp1y = 2 * cy - lastControlY;
        } else {
          cp1x = cx; cp1y = cy;
        }
        const pts = flattenCubic(
          { x: cx, y: cy },
          { x: cp1x, y: cp1y },
          { x: cx + args[0], y: cy + args[1] },
          { x: cx + args[2], y: cy + args[3] },
          CURVE_TOLERANCE
        );
        lastControlX = cx + args[0]; lastControlY = cy + args[1];
        cx += args[2]; cy += args[3];
        for (let i = 1; i < pts.length; i++) currentPoints.push(pts[i]);
        break;
      }

      case 'Q': {
        const pts = flattenQuadratic(
          { x: cx, y: cy },
          { x: args[0], y: args[1] },
          { x: args[2], y: args[3] },
          CURVE_TOLERANCE
        );
        for (let i = 1; i < pts.length; i++) currentPoints.push(pts[i]);
        lastControlX = args[0]; lastControlY = args[1];
        cx = args[2]; cy = args[3];
        break;
      }
      case 'q': {
        const pts = flattenQuadratic(
          { x: cx, y: cy },
          { x: cx + args[0], y: cy + args[1] },
          { x: cx + args[2], y: cy + args[3] },
          CURVE_TOLERANCE
        );
        lastControlX = cx + args[0]; lastControlY = cy + args[1];
        cx += args[2]; cy += args[3];
        for (let i = 1; i < pts.length; i++) currentPoints.push(pts[i]);
        break;
      }

      case 'T': {
        let cpx: number, cpy: number;
        if (lastCmd === 'Q' || lastCmd === 'q' || lastCmd === 'T' || lastCmd === 't') {
          cpx = 2 * cx - lastControlX;
          cpy = 2 * cy - lastControlY;
        } else {
          cpx = cx; cpy = cy;
        }
        const pts = flattenQuadratic(
          { x: cx, y: cy },
          { x: cpx, y: cpy },
          { x: args[0], y: args[1] },
          CURVE_TOLERANCE
        );
        for (let i = 1; i < pts.length; i++) currentPoints.push(pts[i]);
        lastControlX = cpx; lastControlY = cpy;
        cx = args[0]; cy = args[1];
        break;
      }
      case 't': {
        let cpx: number, cpy: number;
        if (lastCmd === 'Q' || lastCmd === 'q' || lastCmd === 'T' || lastCmd === 't') {
          cpx = 2 * cx - lastControlX;
          cpy = 2 * cy - lastControlY;
        } else {
          cpx = cx; cpy = cy;
        }
        const pts = flattenQuadratic(
          { x: cx, y: cy },
          { x: cpx, y: cpy },
          { x: cx + args[0], y: cy + args[1] },
          CURVE_TOLERANCE
        );
        lastControlX = cpx; lastControlY = cpy;
        cx += args[0]; cy += args[1];
        for (let i = 1; i < pts.length; i++) currentPoints.push(pts[i]);
        break;
      }

      case 'A':
      case 'a': {
        // Arc: approximate with cubic beziers
        const isRel = type === 'a';
        const endX = isRel ? cx + args[5] : args[5];
        const endY = isRel ? cx + args[6] : args[6];
        const arcPts = arcToCubicPoints(
          cx, cy, args[0], args[1], args[2], !!args[3], !!args[4], endX, endY
        );
        for (let i = 1; i < arcPts.length; i++) currentPoints.push(arcPts[i]);
        cx = endX; cy = endY;
        break;
      }

      case 'Z':
      case 'z':
        cx = sx; cy = sy;
        pushCurrentPath(true);
        break;
    }

    lastCmd = type;
  }

  pushCurrentPath(false);
  return paths;
}

// Convert SVG arc to polyline points via cubic bezier approximation
function arcToCubicPoints(
  x1: number, y1: number,
  rx: number, ry: number,
  xAxisRotation: number,
  largeArcFlag: boolean,
  sweepFlag: boolean,
  x2: number, y2: number
): Point[] {
  if (rx === 0 || ry === 0) {
    return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
  }

  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const phi = (xAxisRotation * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  // Step 1: Compute (x1', y1')
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  // Step 2: Compute (cx', cy')
  let rxSq = rx * rx;
  let rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;

  // Ensure radii are large enough
  const lambda = x1pSq / rxSq + y1pSq / rySq;
  if (lambda > 1) {
    const lambdaSqrt = Math.sqrt(lambda);
    rx *= lambdaSqrt;
    ry *= lambdaSqrt;
    rxSq = rx * rx;
    rySq = ry * ry;
  }

  let sq = (rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / (rxSq * y1pSq + rySq * x1pSq);
  if (sq < 0) sq = 0;
  const sign = largeArcFlag === sweepFlag ? -1 : 1;
  const coeff = sign * Math.sqrt(sq);
  const cxp = coeff * (rx * y1p / ry);
  const cyp = coeff * -(ry * x1p / rx);

  // Step 3: Compute (cx, cy)
  const ccx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const ccy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  // Step 4: Compute theta1 and dtheta
  const theta1 = vectorAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dtheta = vectorAngle(
    (x1p - cxp) / rx, (y1p - cyp) / ry,
    (-x1p - cxp) / rx, (-y1p - cyp) / ry
  );

  if (!sweepFlag && dtheta > 0) dtheta -= 2 * Math.PI;
  if (sweepFlag && dtheta < 0) dtheta += 2 * Math.PI;

  // Generate points along the arc
  const segments = Math.max(4, Math.ceil(Math.abs(dtheta) / (Math.PI / 8)));
  const points: Point[] = [{ x: x1, y: y1 }];

  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const angle = theta1 + dtheta * t;
    const px = rx * Math.cos(angle);
    const py = ry * Math.sin(angle);
    points.push({
      x: cosPhi * px - sinPhi * py + ccx,
      y: sinPhi * px + cosPhi * py + ccy,
    });
  }

  return points;
}

function vectorAngle(ux: number, uy: number, vx: number, vy: number): number {
  const dot = ux * vx + uy * vy;
  const len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
  let angle = Math.acos(Math.max(-1, Math.min(1, dot / len)));
  if (ux * vy - uy * vx < 0) angle = -angle;
  return angle;
}

// ============ SVG Element Parsers ============

function parsePathElement(d: string): Path[] {
  const commands = tokenizePathD(d);
  return executePathCommands(commands);
}

function parseLineElement(attrs: Record<string, string>): Path[] {
  const x1 = parseFloat(attrs.x1 || '0');
  const y1 = parseFloat(attrs.y1 || '0');
  const x2 = parseFloat(attrs.x2 || '0');
  const y2 = parseFloat(attrs.y2 || '0');
  return [{ points: [{ x: x1, y: y1 }, { x: x2, y: y2 }], closed: false }];
}

function parsePolylineElement(attrs: Record<string, string>): Path[] {
  const pointsStr = attrs.points || '';
  const nums = pointsStr.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g)?.map(Number) ?? [];
  const points: Point[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    points.push({ x: nums[i], y: nums[i + 1] });
  }
  if (points.length < 2) return [];
  return [{ points, closed: false }];
}

function parsePolygonElement(attrs: Record<string, string>): Path[] {
  const paths = parsePolylineElement(attrs);
  for (const p of paths) p.closed = true;
  return paths;
}

function parseRectElement(attrs: Record<string, string>): Path[] {
  const x = parseFloat(attrs.x || '0');
  const y = parseFloat(attrs.y || '0');
  const w = parseFloat(attrs.width || '0');
  const h = parseFloat(attrs.height || '0');
  const rx = parseFloat(attrs.rx || '0');
  const ry = parseFloat(attrs.ry || attrs.rx || '0');

  if (w <= 0 || h <= 0) return [];

  if (rx > 0 || ry > 0) {
    // Rounded rect: build as path d
    const r = Math.min(rx || ry, w / 2, h / 2);
    const d = `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
    return parsePathElement(d);
  }

  return [{
    points: [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ],
    closed: true,
  }];
}

function parseCircleElement(attrs: Record<string, string>): Path[] {
  const cx = parseFloat(attrs.cx || '0');
  const cy = parseFloat(attrs.cy || '0');
  const r = parseFloat(attrs.r || '0');
  if (r <= 0) return [];

  const segments = Math.max(16, Math.ceil(2 * Math.PI * r / 2));
  const points: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    });
  }
  return [{ points, closed: true }];
}

function parseEllipseElement(attrs: Record<string, string>): Path[] {
  const cx = parseFloat(attrs.cx || '0');
  const cy = parseFloat(attrs.cy || '0');
  const rx = parseFloat(attrs.rx || '0');
  const ry = parseFloat(attrs.ry || '0');
  if (rx <= 0 || ry <= 0) return [];

  const segments = Math.max(16, Math.ceil(Math.PI * (rx + ry) / 2));
  const points: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push({
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
    });
  }
  return [{ points, closed: true }];
}

// ============ Minimal DOM-free XML Parser ============

interface SvgNode {
  tag: string;
  attrs: Record<string, string>;
  children: SvgNode[];
}

function parseSvgXml(svgString: string): SvgNode | null {
  // Use DOMParser (available in browser)
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return null;
  return domToSvgNode(svg);
}

function domToSvgNode(el: Element): SvgNode {
  const attrs: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    attrs[attr.name] = attr.value;
  }
  const children: SvgNode[] = [];
  for (const child of Array.from(el.children)) {
    children.push(domToSvgNode(child));
  }
  return { tag: el.tagName.toLowerCase(), attrs, children };
}

// ============ Main SVG Parser ============

export interface SvgParseOptions {
  convertShapes: boolean;
  ignoreFills: boolean;
  flattenTransforms: boolean;
}

function hasStroke(attrs: Record<string, string>): boolean {
  const stroke = attrs.stroke;
  const style = attrs.style || '';
  if (stroke && stroke !== 'none') return true;
  if (style.includes('stroke:') && !style.includes('stroke:none') && !style.includes('stroke: none')) return true;
  return false;
}

function hasFill(attrs: Record<string, string>): boolean {
  const fill = attrs.fill;
  const style = attrs.style || '';
  // Default fill is black when neither fill nor stroke is specified
  if (fill === 'none') return false;
  if (style.includes('fill:none') || style.includes('fill: none')) return false;
  return true;
}

function extractPaths(
  node: SvgNode,
  parentTransform: Matrix,
  options: SvgParseOptions,
): Path[] {
  const paths: Path[] = [];

  // Compute this node's transform
  let localTransform = parentTransform;
  if (node.attrs.transform) {
    const nodeTransform = parseTransform(node.attrs.transform);
    localTransform = multiplyMatrix(parentTransform, nodeTransform);
  }

  const tag = node.tag;

  // Skip <defs>, <clipPath>, <mask>, <style>, <text>, <symbol>
  if (['defs', 'clippath', 'mask', 'style', 'text', 'symbol', 'metadata', 'title', 'desc'].includes(tag)) {
    return paths;
  }

  // Check if element should be imported based on stroke/fill filtering
  const shouldImport = (attrs: Record<string, string>) => {
    if (!options.ignoreFills) return true;
    // When ignoreFills is true, only import elements with strokes
    return hasStroke(attrs) || !hasFill(attrs);
  };

  let elementPaths: Path[] = [];

  switch (tag) {
    case 'path':
      if (node.attrs.d && shouldImport(node.attrs)) {
        elementPaths = parsePathElement(node.attrs.d);
      }
      break;
    case 'line':
      if (shouldImport(node.attrs)) {
        elementPaths = parseLineElement(node.attrs);
      }
      break;
    case 'polyline':
      if (shouldImport(node.attrs)) {
        elementPaths = parsePolylineElement(node.attrs);
      }
      break;
    case 'polygon':
      if (shouldImport(node.attrs)) {
        elementPaths = parsePolygonElement(node.attrs);
      }
      break;
    case 'rect':
      if (options.convertShapes && shouldImport(node.attrs)) {
        elementPaths = parseRectElement(node.attrs);
      }
      break;
    case 'circle':
      if (options.convertShapes && shouldImport(node.attrs)) {
        elementPaths = parseCircleElement(node.attrs);
      }
      break;
    case 'ellipse':
      if (options.convertShapes && shouldImport(node.attrs)) {
        elementPaths = parseEllipseElement(node.attrs);
      }
      break;
  }

  // Apply transform to extracted paths
  if (options.flattenTransforms) {
    for (const path of elementPaths) {
      path.points = path.points.map(p => applyMatrix(localTransform, p));
    }
    paths.push(...elementPaths);
  } else {
    paths.push(...elementPaths);
  }

  // Recurse into children (g, svg, use, etc.)
  for (const child of node.children) {
    paths.push(...extractPaths(child, localTransform, options));
  }

  return paths;
}

export interface SvgParseResult {
  paths: Path[];
  viewBox: { x: number; y: number; width: number; height: number } | null;
  width: number;
  height: number;
}

export function parseSvg(svgContent: string, options: SvgParseOptions): SvgParseResult {
  const root = parseSvgXml(svgContent);
  if (!root) {
    return { paths: [], viewBox: null, width: 0, height: 0 };
  }

  // Parse viewBox
  let viewBox: SvgParseResult['viewBox'] = null;
  if (root.attrs.viewBox || root.attrs.viewbox) {
    const vb = (root.attrs.viewBox || root.attrs.viewbox).split(/[\s,]+/).map(Number);
    if (vb.length === 4) {
      viewBox = { x: vb[0], y: vb[1], width: vb[2], height: vb[3] };
    }
  }

  // Parse width/height (may have units)
  const parseLength = (val: string | undefined): number => {
    if (!val) return 0;
    const num = parseFloat(val);
    if (isNaN(num)) return 0;
    // Convert common units to px (approximate)
    if (val.endsWith('mm')) return num * 3.7795;
    if (val.endsWith('cm')) return num * 37.795;
    if (val.endsWith('in')) return num * 96;
    if (val.endsWith('pt')) return num * 1.333;
    return num;
  };

  const svgWidth = parseLength(root.attrs.width) || viewBox?.width || 100;
  const svgHeight = parseLength(root.attrs.height) || viewBox?.height || 100;

  // Build initial transform for viewBox mapping
  let baseTransform: Matrix = IDENTITY;
  if (viewBox) {
    // Map viewBox to SVG dimensions
    const sx = svgWidth / viewBox.width;
    const sy = svgHeight / viewBox.height;
    baseTransform = [sx, 0, 0, sy, -viewBox.x * sx, -viewBox.y * sy];
  }

  const paths = extractPaths(root, baseTransform, options);

  return {
    paths,
    viewBox,
    width: svgWidth,
    height: svgHeight,
  };
}
