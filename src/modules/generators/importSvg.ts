import type { ModuleDefinition, Layer } from '../../types';
import { parseSvg } from '../../engine/svgParser';

export const importSvgGenerator: ModuleDefinition = {
  id: 'importSvg',
  name: 'Import SVG',
  type: 'generator',
  parameters: {
    svgFile: {
      type: 'file',
      label: 'SVG File',
      default: '',
      accept: '.svg',
    },
    scale: {
      type: 'number',
      label: 'Scale (%)',
      default: 100,
      min: 1,
      max: 500,
      step: 1,
    },
    center: {
      type: 'boolean',
      label: 'Center on Canvas',
      default: true,
    },
    flattenTransforms: {
      type: 'boolean',
      label: 'Flatten Transforms',
      default: true,
    },
    convertShapes: {
      type: 'boolean',
      label: 'Convert Shapes',
      default: true,
    },
    ignoreFills: {
      type: 'boolean',
      label: 'Ignore Fills',
      default: true,
    },
  },
  execute: (params, _input, ctx) => {
    const svgContent = (params.svgFile as string) ?? '';
    const scale = ((params.scale as number) ?? 100) / 100;
    const centerOnCanvas = (params.center as boolean) ?? true;
    const flattenTransforms = (params.flattenTransforms as boolean) ?? true;
    const convertShapes = (params.convertShapes as boolean) ?? true;
    const ignoreFills = (params.ignoreFills as boolean) ?? true;

    if (!svgContent || svgContent.length === 0) {
      return [{ id: 'importSvg', paths: [] }];
    }

    const result = parseSvg(svgContent, {
      convertShapes,
      ignoreFills,
      flattenTransforms,
    });

    if (result.paths.length === 0) {
      return [{ id: 'importSvg', paths: [] }];
    }

    let paths = result.paths;

    // Convert from SVG pixels to mm (assuming 96 DPI: 1px = 25.4/96 mm)
    const pxToMm = 25.4 / 96;

    // Apply px-to-mm conversion and user scale
    const totalScale = pxToMm * scale;
    if (totalScale !== 1) {
      paths = paths.map(p => ({
        ...p,
        points: p.points.map(pt => ({
          x: pt.x * totalScale,
          y: pt.y * totalScale,
        })),
      }));
    }

    // Center on canvas if requested
    if (centerOnCanvas) {
      // Find bounding box of all paths
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const path of paths) {
        for (const pt of path.points) {
          if (pt.x < minX) minX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y > maxY) maxY = pt.y;
        }
      }

      if (isFinite(minX)) {
        const contentCX = (minX + maxX) / 2;
        const contentCY = (minY + maxY) / 2;
        const canvasCX = ctx.canvas.width / 2;
        const canvasCY = ctx.canvas.height / 2;
        const dx = canvasCX - contentCX;
        const dy = canvasCY - contentCY;

        paths = paths.map(p => ({
          ...p,
          points: p.points.map(pt => ({
            x: pt.x + dx,
            y: pt.y + dy,
          })),
        }));
      }
    }

    const layer: Layer = {
      id: 'importSvg',
      paths,
    };

    return [layer];
  },
};
