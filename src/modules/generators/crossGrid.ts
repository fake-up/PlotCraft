import type { ModuleDefinition, Layer, Path, Point } from '../../types';

export const crossGridGenerator: ModuleDefinition = {
  id: 'crossGrid',
  name: 'Cross Grid',
  type: 'generator',
  parameters: {
    columns: { type: 'number', label: 'Columns', default: 10, min: 1, max: 100, step: 1 },
    rows: { type: 'number', label: 'Rows', default: 10, min: 1, max: 100, step: 1 },
    spacing: { type: 'number', label: 'Spacing (mm)', default: 10, min: 1, max: 100, step: 1 },
    crossSize: { type: 'number', label: 'Cross Size (mm)', default: 8, min: 1, max: 50, step: 1 },
    crossStyle: {
      type: 'select',
      label: 'Cross Style',
      default: 'x',
      options: [
        { value: 'x', label: 'X' },
        { value: 'plus', label: 'Plus' },
      ],
    },
    lineCount: { type: 'number', label: 'Line Count', default: 1, min: 1, max: 10, step: 1 },
    lineSpacing: { type: 'number', label: 'Line Spacing (mm)', default: 1, min: 0.5, max: 10, step: 0.5 },
    showGrid: { type: 'boolean', label: 'Show Grid', default: false },
    centerX: { type: 'number', label: 'Center X (%)', default: 50, min: 0, max: 100, step: 1 },
    centerY: { type: 'number', label: 'Center Y (%)', default: 50, min: 0, max: 100, step: 1 },
  },
  execute: (params, _input, ctx) => {
    const columns = (params.columns as number) ?? 10;
    const rows = (params.rows as number) ?? 10;
    const spacing = (params.spacing as number) ?? 10;
    const crossSize = (params.crossSize as number) ?? 8;
    const crossStyle = (params.crossStyle as string) ?? 'x';
    const lineCount = (params.lineCount as number) ?? 1;
    const lineSpacing = (params.lineSpacing as number) ?? 1;
    const showGrid = params.showGrid === true;
    const centerX = (params.centerX as number) ?? 50;
    const centerY = (params.centerY as number) ?? 50;

    const { width, height } = ctx.canvas;

    // Grid dimensions and origin (centered at centerX/centerY)
    // Crosses sit at cell centers, so total extent is columns * spacing
    const gridWidth = columns * spacing;
    const gridHeight = rows * spacing;
    const originX = (centerX / 100) * width - gridWidth / 2;
    const originY = (centerY / 100) * height - gridHeight / 2;

    const half = crossSize / 2;
    const rot = crossStyle === 'x' ? Math.PI / 4 : 0;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);

    // Transform a local coordinate to world coordinate, applying rotation around cross center
    const transform = (cx: number, cy: number, lx: number, ly: number): Point => ({
      x: cx + lx * cosR - ly * sinR,
      y: cy + lx * sinR + ly * cosR,
    });

    const crossPaths: Path[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const cx = originX + col * spacing + spacing / 2;
        const cy = originY + row * spacing + spacing / 2;

        const points: Point[] = [];

        // Trace horizontal arm lines in serpentine order
        for (let i = 0; i < lineCount; i++) {
          const off = (i - (lineCount - 1) / 2) * lineSpacing;
          if (i % 2 === 0) {
            points.push(transform(cx, cy, -half, off));
            points.push(transform(cx, cy, half, off));
          } else {
            points.push(transform(cx, cy, half, off));
            points.push(transform(cx, cy, -half, off));
          }
        }

        // Route through center to transition to vertical arm
        points.push(transform(cx, cy, 0, 0));

        // Trace vertical arm lines in serpentine order
        for (let i = 0; i < lineCount; i++) {
          const off = (i - (lineCount - 1) / 2) * lineSpacing;
          if (i % 2 === 0) {
            points.push(transform(cx, cy, off, -half));
            points.push(transform(cx, cy, off, half));
          } else {
            points.push(transform(cx, cy, off, half));
            points.push(transform(cx, cy, off, -half));
          }
        }

        crossPaths.push({ points, closed: false });
      }
    }

    const layers: Layer[] = [{ id: 'crossGrid', paths: crossPaths }];

    // Optional grid lines as a separate layer
    if (showGrid) {
      const gridPaths: Path[] = [];

      // Horizontal grid lines (rows + 1 lines to form cell boundaries)
      for (let row = 0; row <= rows; row++) {
        const y = originY + row * spacing;
        gridPaths.push({
          points: [
            { x: originX, y },
            { x: originX + gridWidth, y },
          ],
          closed: false,
        });
      }

      // Vertical grid lines (columns + 1 lines to form cell boundaries)
      for (let col = 0; col <= columns; col++) {
        const x = originX + col * spacing;
        gridPaths.push({
          points: [
            { x, y: originY },
            { x, y: originY + gridHeight },
          ],
          closed: false,
        });
      }

      layers.push({ id: 'crossGridLines', paths: gridPaths });
    }

    return layers;
  },
};
