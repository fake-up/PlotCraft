import type { ModuleDefinition, Layer, Path } from '../../types';
import { createSeededRng } from '../../engine/rng';

interface Block {
  y: number;
  height: number;
  column: number;
}

export const dashColumnsGenerator: ModuleDefinition = {
  id: 'dashColumns',
  name: 'Dash Columns',
  type: 'generator',
  parameters: {
    // Grid setup
    columns: { type: 'number', label: 'Columns', default: 10, min: 1, max: 50, step: 1 },
    columnWidth: { type: 'number', label: 'Column Width (mm)', default: 10, min: 2, max: 50, step: 0.5 },
    columnGap: { type: 'number', label: 'Column Gap (mm)', default: 2, min: 0, max: 20, step: 0.5 },
    totalHeight: { type: 'number', label: 'Total Height (mm)', default: 150, min: 10, max: 300, step: 1 },

    // Dash setup
    dashLength: { type: 'number', label: 'Dash Length (mm)', default: 8, min: 1, max: 50, step: 0.5 },
    dashSpacing: { type: 'number', label: 'Dash Spacing (mm)', default: 1, min: 0.5, max: 10, step: 0.1 },
    dashThickness: { type: 'number', label: 'Dash Thickness', default: 1, min: 1, max: 10, step: 1 },

    // Block randomization
    minBlockHeight: { type: 'number', label: 'Min Block Height (mm)', default: 10, min: 5, max: 100, step: 1 },
    maxBlockHeight: { type: 'number', label: 'Max Block Height (mm)', default: 40, min: 5, max: 150, step: 1 },
    minGapHeight: { type: 'number', label: 'Min Gap Height (mm)', default: 5, min: 0, max: 50, step: 1 },
    maxGapHeight: { type: 'number', label: 'Max Gap Height (mm)', default: 20, min: 0, max: 100, step: 1 },
    seed: { type: 'number', label: 'Seed', default: 12345, min: 0, max: 99999, step: 1 },

    // Output mode
    outputMode: {
      type: 'select',
      label: 'Output Mode',
      default: 'allOneLayer',
      options: [
        { value: 'allOneLayer', label: 'All One Layer' },
        { value: 'columnPerLayer', label: 'Column Per Layer' },
        { value: 'blockPerLayer', label: 'Block Per Layer' },
      ],
    },

    // Centering
    centerX: { type: 'number', label: 'Center X (%)', default: 50, min: 0, max: 100, step: 1 },
    centerY: { type: 'number', label: 'Center Y (%)', default: 50, min: 0, max: 100, step: 1 },
  },

  execute: (params, _input, ctx) => {
    const columns = (params.columns as number) ?? 10;
    const columnWidth = (params.columnWidth as number) ?? 10;
    const columnGap = (params.columnGap as number) ?? 2;
    const totalHeight = (params.totalHeight as number) ?? 150;

    const dashLength = (params.dashLength as number) ?? 8;
    const dashSpacing = (params.dashSpacing as number) ?? 1;
    const dashThickness = (params.dashThickness as number) ?? 1;

    const minBlockHeight = (params.minBlockHeight as number) ?? 10;
    const maxBlockHeight = (params.maxBlockHeight as number) ?? 40;
    const minGapHeight = (params.minGapHeight as number) ?? 5;
    const maxGapHeight = (params.maxGapHeight as number) ?? 20;
    const seed = (params.seed as number) ?? 12345;

    const outputMode = (params.outputMode as string) ?? 'allOneLayer';
    const centerXPct = (params.centerX as number) ?? 50;
    const centerYPct = (params.centerY as number) ?? 50;

    const { canvas } = ctx;
    const rng = createSeededRng(seed);

    // Calculate total pattern dimensions
    const patternWidth = columns * columnWidth + (columns - 1) * columnGap;

    // Calculate origin based on centering
    const originX = (centerXPct / 100) * canvas.width - patternWidth / 2;
    const originY = (centerYPct / 100) * canvas.height - totalHeight / 2;

    // Thickness line spacing (for multi-line dashes)
    const thicknessSpacing = dashSpacing * 0.4;

    // Generate blocks for each column
    // Structure: blocksByColumn[colIndex] = Block[]
    const blocksByColumn: Block[][] = [];

    for (let col = 0; col < columns; col++) {
      const colBlocks: Block[] = [];
      let y = 0;
      let isFilled = rng() > 0.3; // Start with filled or gap (biased toward filled)

      while (y < totalHeight) {
        if (isFilled) {
          const blockH = minBlockHeight + rng() * (maxBlockHeight - minBlockHeight);
          const clampedH = Math.min(blockH, totalHeight - y);
          if (clampedH > dashSpacing) {
            colBlocks.push({ y, height: clampedH, column: col });
          }
          y += clampedH;
        } else {
          const gapH = minGapHeight + rng() * (maxGapHeight - minGapHeight);
          y += gapH;
        }
        isFilled = !isFilled;
      }

      blocksByColumn.push(colBlocks);
    }

    // Generate dash paths for a single block
    function generateBlockDashes(block: Block): Path[] {
      const paths: Path[] = [];
      const colX = originX + block.column * (columnWidth + columnGap);
      const dashStartX = colX + (columnWidth - dashLength) / 2;
      const dashEndX = dashStartX + dashLength;
      const blockTop = originY + block.y;
      const blockBottom = originY + block.y + block.height;

      let dy = blockTop + dashSpacing / 2;
      while (dy < blockBottom) {
        for (let t = 0; t < dashThickness; t++) {
          const lineY = dy + t * thicknessSpacing;
          if (lineY < blockBottom) {
            paths.push({
              points: [
                { x: dashStartX, y: lineY },
                { x: dashEndX, y: lineY },
              ],
              closed: false,
            });
          }
        }
        dy += dashSpacing + (dashThickness - 1) * thicknessSpacing;
      }

      return paths;
    }

    // Build output based on mode
    if (outputMode === 'columnPerLayer') {
      const layers: Layer[] = [];
      for (let col = 0; col < columns; col++) {
        const columnPaths: Path[] = [];
        for (const block of blocksByColumn[col]) {
          columnPaths.push(...generateBlockDashes(block));
        }
        if (columnPaths.length > 0) {
          layers.push({ id: `dashCol-${col}`, paths: columnPaths });
        }
      }
      return layers.length > 0 ? layers : [{ id: 'dashColumns', paths: [] }];
    }

    if (outputMode === 'blockPerLayer') {
      const layers: Layer[] = [];
      let blockIndex = 0;
      for (let col = 0; col < columns; col++) {
        for (const block of blocksByColumn[col]) {
          const blockPaths = generateBlockDashes(block);
          if (blockPaths.length > 0) {
            layers.push({ id: `dashBlock-${blockIndex}`, paths: blockPaths });
            blockIndex++;
          }
        }
      }
      return layers.length > 0 ? layers : [{ id: 'dashColumns', paths: [] }];
    }

    // Default: allOneLayer
    const allPaths: Path[] = [];
    for (let col = 0; col < columns; col++) {
      for (const block of blocksByColumn[col]) {
        allPaths.push(...generateBlockDashes(block));
      }
    }

    return [{ id: 'dashColumns', paths: allPaths }];
  },
};
