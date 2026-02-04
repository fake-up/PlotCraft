import type { ModuleDefinition, Layer, Path, Point } from '../../types';
import { createLinePath } from '../../engine/geometry';
import { STAMP_PARAMETERS, getStampCenter, getStampParams, getStampRotation, placeStamp } from '../../engine/stamp';

export const gridGenerator: ModuleDefinition = {
  id: 'grid',
  name: 'Grid',
  type: 'generator',
  additionalInputs: [
    { name: 'stamp', type: 'paths', optional: true },
  ],
  parameters: {
    layerId: {
      type: 'select',
      label: 'Layer',
      default: 'default-layer',
      options: [],
      dynamicOptions: 'plotLayers',
    },
    rows: { type: 'number', label: 'Rows', default: 10, min: 1, max: 500, step: 1 },
    cols: { type: 'number', label: 'Columns', default: 10, min: 1, max: 500, step: 1 },
    gridWidth: { type: 'number', label: 'Width', default: 150, min: 10, max: 800, step: 5 },
    gridHeight: { type: 'number', label: 'Height', default: 150, min: 10, max: 800, step: 5 },
    style: {
      type: 'select',
      label: 'Style',
      default: 'lines',
      options: [
        { value: 'lines', label: 'Lines' },
        { value: 'crosses', label: 'Crosses' },
        { value: 'dots', label: 'Dots (circles)' },
      ],
    },
    crossSize: { type: 'number', label: 'Cross/Dot Size', default: 5, min: 1, max: 50, step: 0.5 },
    centered: { type: 'boolean', label: 'Center on Canvas', default: true },
    positionX: { type: 'number', label: 'Position X (%)', default: 50, min: 0, max: 100, step: 1, showWhen: { param: 'centered', value: false } },
    positionY: { type: 'number', label: 'Position Y (%)', default: 50, min: 0, max: 100, step: 1, showWhen: { param: 'centered', value: false } },
    ...STAMP_PARAMETERS,
  },
  execute: (params, _input, ctx) => {
    // Use defaults for any missing params (handles legacy module instances)
    const rows = (params.rows as number) ?? 10;
    const cols = (params.cols as number) ?? 10;
    const gridWidth = (params.gridWidth as number) ?? 150;
    const gridHeight = (params.gridHeight as number) ?? 150;
    const style = (params.style as string) ?? 'lines';
    const crossSize = (params.crossSize as number) ?? 5;
    const centered = params.centered !== false; // Default to true
    const positionX = (params.positionX as number) ?? 50;
    const positionY = (params.positionY as number) ?? 50;

    const { width, height } = ctx.canvas;
    const rng = ctx.rng;

    // Check for stamp input
    const stampLayers = ctx.inputs?.stamp;
    const hasStamp = stampLayers && stampLayers.length > 0 && stampLayers.some(l => l.paths.length > 0);
    const stampCenter = hasStamp ? getStampCenter(stampLayers) : null;
    const stamp = hasStamp ? getStampParams(params) : null;

    // Calculate offset to position the grid
    let offsetX: number;
    let offsetY: number;

    if (centered) {
      // Center the grid on the canvas
      offsetX = (width - gridWidth) / 2;
      offsetY = (height - gridHeight) / 2;
    } else {
      // Position based on percentage (0% = left edge, 50% = center, 100% = right edge)
      offsetX = (positionX / 100) * width - gridWidth / 2;
      offsetY = (positionY / 100) * height - gridHeight / 2;
    }

    const paths: Path[] = [];

    if (hasStamp && stampCenter && stamp) {
      // Stamp mode: place stamp at each grid intersection
      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const x = offsetX + (c / cols) * gridWidth;
          const y = offsetY + (r / rows) * gridHeight;
          const rotation = getStampRotation(stamp.stampRotation, rng, stamp.stampRandomRotation);
          const stampPaths = placeStamp(stampLayers, stampCenter, x, y, stamp.stampScale, rotation);
          paths.push(...stampPaths);
        }
      }
    } else if (style === 'lines') {
      // Horizontal lines
      for (let r = 0; r <= rows; r++) {
        const y = offsetY + (r / rows) * gridHeight;
        const path = createLinePath(offsetX, y, offsetX + gridWidth, y);
        paths.push(path);
      }
      // Vertical lines
      for (let c = 0; c <= cols; c++) {
        const x = offsetX + (c / cols) * gridWidth;
        const path = createLinePath(x, offsetY, x, offsetY + gridHeight);
        paths.push(path);
      }
    } else if (style === 'crosses') {
      const half = crossSize / 2;
      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const x = offsetX + (c / cols) * gridWidth;
          const y = offsetY + (r / rows) * gridHeight;
          const path1 = createLinePath(x - half, y, x + half, y);
          const path2 = createLinePath(x, y - half, x, y + half);
          paths.push(path1);
          paths.push(path2);
        }
      }
    } else if (style === 'dots') {
      const segments = 16;
      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const cx = offsetX + (c / cols) * gridWidth;
          const cy = offsetY + (r / rows) * gridHeight;
          const radius = crossSize / 2;
          const points: Point[] = [];
          for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push({
              x: cx + Math.cos(angle) * radius,
              y: cy + Math.sin(angle) * radius,
            });
          }
          paths.push({ points, closed: true });
        }
      }
    }

    const layer: Layer = {
      id: 'grid',
      paths,
    };

    return [layer];
  },
};
