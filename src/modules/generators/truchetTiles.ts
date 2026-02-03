import type { ModuleDefinition, Layer, Path, Point } from '../../types';

export const truchetTilesGenerator: ModuleDefinition = {
  id: 'truchetTiles',
  name: 'Truchet Tiles',
  type: 'generator',
  parameters: {
    layerId: {
      type: 'select',
      label: 'Layer',
      default: 'default-layer',
      options: [],
      dynamicOptions: 'plotLayers',
    },
    // Grid settings
    columns: { type: 'number', label: 'Columns', default: 8, min: 2, max: 50, step: 1 },
    rows: { type: 'number', label: 'Rows', default: 6, min: 2, max: 50, step: 1 },
    tileSize: { type: 'number', label: 'Tile Size (mm)', default: 20, min: 5, max: 100, step: 1 },
    centerX: { type: 'number', label: 'Center X (%)', default: 50, min: 0, max: 100, step: 1 },
    centerY: { type: 'number', label: 'Center Y (%)', default: 50, min: 0, max: 100, step: 1 },

    // Pattern settings
    tileType: {
      type: 'select',
      label: 'Tile Type',
      default: 'arcs',
      options: [
        { value: 'arcs', label: 'Arcs (Classic)' },
        { value: 'lines', label: 'Lines' },
        { value: 'mixed', label: 'Mixed' },
        { value: 'curves', label: 'Curves' },
      ],
    },
    lineCount: { type: 'number', label: 'Line Count', default: 5, min: 1, max: 10, step: 1 },
    lineSpacing: { type: 'number', label: 'Line Spacing (mm)', default: 1.5, min: 0.5, max: 5, step: 0.5 },
    segments: { type: 'number', label: 'Segments', default: 16, min: 8, max: 64, step: 4 },

    // Variation
    randomRotation: { type: 'boolean', label: 'Random Rotation', default: true },
    patternVariety: { type: 'number', label: 'Pattern Variety (%)', default: 100, min: 0, max: 100, step: 5 },

    // Advanced
    connectEdges: { type: 'boolean', label: 'Connect Edges', default: false },
    cornerStyle: {
      type: 'select',
      label: 'Corner Style',
      default: 'rounded',
      options: [
        { value: 'rounded', label: 'Rounded' },
        { value: 'sharp', label: 'Sharp' },
      ],
    },
  },
  execute: (params, _input, ctx) => {
    const columns = (params.columns as number) ?? 8;
    const rows = (params.rows as number) ?? 6;
    const tileSize = (params.tileSize as number) ?? 20;
    const centerX = (params.centerX as number) ?? 50;
    const centerY = (params.centerY as number) ?? 50;
    const tileType = (params.tileType as string) ?? 'arcs';
    const lineCount = (params.lineCount as number) ?? 5;
    const lineSpacing = (params.lineSpacing as number) ?? 1.5;
    const segments = (params.segments as number) ?? 16;
    const randomRotation = params.randomRotation !== false;
    const patternVariety = ((params.patternVariety as number) ?? 100) / 100;
    const connectEdges = params.connectEdges === true;
    const cornerStyle = (params.cornerStyle as string) ?? 'rounded';

    const { width, height } = ctx.canvas;
    const { rng } = ctx;

    // Calculate grid origin so it's centered at centerX/centerY
    const gridWidth = columns * tileSize;
    const gridHeight = rows * tileSize;
    const originX = (centerX / 100) * width - gridWidth / 2;
    const originY = (centerY / 100) * height - gridHeight / 2;

    // Pre-determine tile rotations and pattern types
    // rotation: 0=0°, 1=90°, 2=180°, 3=270°
    const tileRotations: number[][] = [];
    const tilePatterns: string[][] = [];

    // Base values for low-variety mode
    const baseRotation = Math.floor(rng() * 4);
    const basePattern = tileType === 'curves'
      ? ['arcs', 'scurve', 'uturn'][Math.floor(rng() * 3)]
      : tileType === 'mixed'
        ? (rng() < 0.5 ? 'arcs' : 'lines')
        : tileType;

    for (let row = 0; row < rows; row++) {
      tileRotations[row] = [];
      tilePatterns[row] = [];
      for (let col = 0; col < columns; col++) {
        // Rotation
        if (randomRotation) {
          if (rng() < patternVariety) {
            tileRotations[row][col] = Math.floor(rng() * 4);
          } else {
            tileRotations[row][col] = baseRotation;
            rng(); // consume to keep stream consistent
          }
        } else {
          tileRotations[row][col] = 0;
        }

        // Pattern type (for mixed/curves)
        if (tileType === 'mixed') {
          if (rng() < patternVariety) {
            tilePatterns[row][col] = rng() < 0.5 ? 'arcs' : 'lines';
          } else {
            tilePatterns[row][col] = basePattern;
            rng();
          }
        } else if (tileType === 'curves') {
          if (rng() < patternVariety) {
            const r = rng();
            tilePatterns[row][col] = r < 0.4 ? 'arcs' : r < 0.7 ? 'scurve' : 'uturn';
          } else {
            tilePatterns[row][col] = basePattern;
            rng();
          }
        } else {
          tilePatterns[row][col] = tileType;
        }
      }
    }

    // In connectEdges mode, constrain rotations so arcs connect across tile boundaries.
    // Classic Truchet arcs connect when adjacent tiles use complementary rotations.
    // A simple rule: even checkerboard cells use rotation 0 or 1 (random),
    // odd checkerboard cells get the rotation that makes edges match.
    if (connectEdges) {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          // Use only 0 or 1, then checkerboard-flip odd cells
          const base = tileRotations[row][col] % 2; // 0 or 1
          if ((row + col) % 2 === 0) {
            tileRotations[row][col] = base;
          } else {
            // Complement: 0↔2, 1↔3
            tileRotations[row][col] = base + 2;
          }
        }
      }
    }

    const paths: Path[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const tileX = originX + col * tileSize;
        const tileY = originY + row * tileSize;
        const rotation = tileRotations[row][col];
        const pattern = tilePatterns[row][col];

        const tilePaths = generateTilePaths(
          tileX, tileY, tileSize, rotation, pattern,
          lineCount, lineSpacing, segments, cornerStyle
        );

        paths.push(...tilePaths);
      }
    }

    const layer: Layer = {
      id: 'truchetTiles',
      paths,
    };

    return [layer];
  },
};

/**
 * Generate all paths for a single tile.
 *
 * Each tile contains two pattern elements (e.g. two quarter-arcs).
 * For each element we draw `lineCount` parallel copies offset by `lineSpacing`,
 * creating a thick band of lines.
 *
 * Coordinates are generated relative to tile center (0,0), then rotated and
 * translated to the final tile position.
 */
function generateTilePaths(
  tileX: number,
  tileY: number,
  size: number,
  rotation: number,
  pattern: string,
  lineCount: number,
  lineSpacing: number,
  segments: number,
  cornerStyle: string,
): Path[] {
  const paths: Path[] = [];
  const half = size / 2;

  // Calculate offset for each parallel line, centered around 0
  for (let lineIdx = 0; lineIdx < lineCount; lineIdx++) {
    const offset = lineCount > 1
      ? (lineIdx - (lineCount - 1) / 2) * lineSpacing
      : 0;

    let rawPaths: Point[][];

    switch (pattern) {
      case 'arcs':
        rawPaths = generateArcPaths(half, offset, segments, cornerStyle);
        break;
      case 'lines':
        rawPaths = generateLinePaths(half, offset);
        break;
      case 'scurve':
        rawPaths = generateSCurvePaths(half, offset, segments);
        break;
      case 'uturn':
        rawPaths = generateUTurnPaths(half, offset, segments);
        break;
      default:
        rawPaths = generateArcPaths(half, offset, segments, cornerStyle);
    }

    for (const rawPoints of rawPaths) {
      const transformed = rawPoints.map(p => {
        const rotated = rotatePoint(p.x, p.y, rotation);
        return {
          x: tileX + half + rotated.x,
          y: tileY + half + rotated.y,
        };
      });

      paths.push({ points: transformed, closed: false });
    }
  }

  return paths;
}

/**
 * Classic Truchet: two quarter-circle arcs at opposite corners.
 *
 * Arc 1 — centered at top-left corner (-half, -half):
 *   Sweeps from angle 0 to PI/2 (right edge → bottom edge of corner).
 *   At radius = half this connects top-edge midpoint (0, -half)
 *   to left-edge midpoint (-half, 0).
 *
 * Arc 2 — centered at bottom-right corner (half, half):
 *   Sweeps from angle PI to 3*PI/2.
 *   At radius = half this connects bottom-edge midpoint (0, half)
 *   to right-edge midpoint (half, 0).
 *
 * For parallel lines, arc 1 radius = half + offset (grows outward from corner
 * toward tile center), arc 2 radius = half - offset (shrinks inward toward
 * corner = also toward tile center). This keeps both bands symmetric and
 * ensures parallel lines align at shared tile edges.
 */
function generateArcPaths(
  half: number,
  offset: number,
  segments: number,
  cornerStyle: string,
): Point[][] {
  const paths: Point[][] = [];

  if (cornerStyle === 'sharp') {
    // Straight diagonal from one edge midpoint to another, offset perpendicular.
    // Arc 1: (0, -half) → (-half, 0). Perpendicular toward tile center = (1,1)/sqrt2.
    const s = offset / Math.SQRT2;
    paths.push([
      { x: s, y: -half + s },
      { x: -half + s, y: s },
    ]);
    // Arc 2: (0, half) → (half, 0). Perpendicular toward tile center = (-1,-1)/sqrt2.
    paths.push([
      { x: -s, y: half - s },
      { x: half - s, y: -s },
    ]);
  } else {
    // Rounded quarter-circle arcs
    // Arc 1: centered at (-half, -half), sweep 0 → PI/2
    const r1 = half + offset;
    if (r1 > 0.01) {
      const arc: Point[] = [];
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * (Math.PI / 2); // 0 → PI/2
        arc.push({
          x: -half + Math.cos(angle) * r1,
          y: -half + Math.sin(angle) * r1,
        });
      }
      paths.push(arc);
    }

    // Arc 2: centered at (half, half), sweep PI → 3*PI/2
    const r2 = half - offset;
    if (r2 > 0.01) {
      const arc: Point[] = [];
      for (let i = 0; i <= segments; i++) {
        const angle = Math.PI + (i / segments) * (Math.PI / 2); // PI → 3PI/2
        arc.push({
          x: half + Math.cos(angle) * r2,
          y: half + Math.sin(angle) * r2,
        });
      }
      paths.push(arc);
    }
  }

  return paths;
}

/**
 * Diagonal line from top-right corner to bottom-left corner,
 * offset perpendicular to the diagonal.
 *
 * Line direction: (half, -half) → (-half, half), so direction = (-1, 1)/sqrt2.
 * Perpendicular (toward +x,+y) = (1, 1)/sqrt2.
 */
function generateLinePaths(
  half: number,
  offset: number,
): Point[][] {
  const s = offset / Math.SQRT2;
  return [[
    { x: half + s, y: -half + s },
    { x: -half + s, y: half + s },
  ]];
}

/**
 * S-curve connecting top edge to bottom edge with a sinusoidal wave.
 * Offset shifts the curve horizontally (perpendicular to main travel direction).
 */
function generateSCurvePaths(
  half: number,
  offset: number,
  segments: number,
): Point[][] {
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const y = -half + t * 2 * half;
    // Smooth S-curve: use cubic interpolation for smoother shape
    const s = t * Math.PI;
    const x = offset + Math.sin(s) * half * 0.4;
    points.push({ x, y });
  }
  return [points];
}

/**
 * U-turn: enters from top edge, curves downward, exits from top edge.
 * Center of the semicircle is at (0, -half), curving down into the tile.
 *
 * For parallel lines, each line has a different radius creating concentric
 * semicircles. The base radius controls how deep the U-turn reaches.
 */
function generateUTurnPaths(
  half: number,
  offset: number,
  segments: number,
): Point[][] {
  const baseRadius = half * 0.45;
  const r = baseRadius + offset;
  if (r < 0.01) return [];

  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Sweep from PI (left) to 0 (right), curving downward
    const angle = Math.PI - t * Math.PI;
    points.push({
      x: Math.cos(angle) * r,
      y: -half + Math.sin(angle) * r,
    });
  }
  return [points];
}

/**
 * Rotate a point around origin by 90-degree increments.
 * 0=0°, 1=90° CW, 2=180°, 3=270° CW
 */
function rotatePoint(x: number, y: number, rotation: number): Point {
  switch (rotation % 4) {
    case 0: return { x, y };
    case 1: return { x: -y, y: x };
    case 2: return { x: -x, y: -y };
    case 3: return { x: y, y: -x };
    default: return { x, y };
  }
}
