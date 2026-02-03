import type { Path, CanvasSettings, OutputLayer } from '../types';

export interface BuildSVGOptions {
  strokeWidth?: number;
  forExport?: boolean;
}

export function buildSVG(
  outputLayers: OutputLayer[],
  canvas: CanvasSettings,
  options: BuildSVGOptions = {}
): string {
  const {
    strokeWidth = 0.3,
    forExport = false,
  } = options;

  const { width, height } = canvas;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" `;
  if (forExport) {
    svg += `width="${width}mm" height="${height}mm" `;
  } else {
    svg += `width="100%" height="100%" `;
  }
  svg += `viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">\n`;

  for (const layer of outputLayers) {
    if (layer.paths.length === 0) continue;

    // Use layer color for preview, black for export
    const color = forExport ? 'black' : layer.color;
    const layerName = layer.name.replace(/[^a-zA-Z0-9-_]/g, '-');
    const penId = `pen-${layer.penNumber}`;

    svg += `  <g id="${layerName}" data-pen="${penId}">\n`;

    for (const path of layer.paths) {
      const d = pathToD(path);
      if (d) {
        svg += `    <path d="${d}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>\n`;
      }
    }

    svg += `  </g>\n`;
  }

  svg += `</svg>`;
  return svg;
}

/**
 * Build separate SVG files for each output layer
 */
export function buildSVGPerLayer(
  outputLayers: OutputLayer[],
  canvas: CanvasSettings,
  strokeWidth = 0.3
): Map<string, { svg: string; layer: OutputLayer }> {
  const result = new Map<string, { svg: string; layer: OutputLayer }>();
  const { width, height } = canvas;

  for (const layer of outputLayers) {
    if (layer.paths.length === 0) continue;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" `;
    svg += `width="${width}mm" height="${height}mm" `;
    svg += `viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">\n`;

    const layerName = layer.name.replace(/[^a-zA-Z0-9-_]/g, '-');
    svg += `  <g id="${layerName}">\n`;

    for (const path of layer.paths) {
      const d = pathToD(path);
      if (d) {
        svg += `    <path d="${d}" fill="none" stroke="black" stroke-width="${strokeWidth}"/>\n`;
      }
    }

    svg += `  </g>\n`;
    svg += `</svg>`;

    result.set(layer.name, { svg, layer });
  }

  return result;
}

/**
 * Build SVG for a single layer by name
 */
export function buildSVGForLayer(
  outputLayers: OutputLayer[],
  layerName: string,
  canvas: CanvasSettings,
  strokeWidth = 0.3
): string | null {
  const layer = outputLayers.find(l => l.name === layerName);
  if (!layer || layer.paths.length === 0) return null;

  const { width, height } = canvas;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" `;
  svg += `width="${width}mm" height="${height}mm" `;
  svg += `viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">\n`;

  const safeName = layer.name.replace(/[^a-zA-Z0-9-_]/g, '-');
  svg += `  <g id="${safeName}">\n`;

  for (const path of layer.paths) {
    const d = pathToD(path);
    if (d) {
      svg += `    <path d="${d}" fill="none" stroke="black" stroke-width="${strokeWidth}"/>\n`;
    }
  }

  svg += `  </g>\n`;
  svg += `</svg>`;

  return svg;
}

function pathToD(path: Path): string {
  if (path.points.length < 2) return '';

  const parts: string[] = [];
  const first = path.points[0];
  parts.push(`M${fmt(first.x)} ${fmt(first.y)}`);

  for (let i = 1; i < path.points.length; i++) {
    const p = path.points[i];
    parts.push(`L${fmt(p.x)} ${fmt(p.y)}`);
  }

  if (path.closed) {
    parts.push('Z');
  }

  return parts.join('');
}

function fmt(n: number): string {
  return n.toFixed(3).replace(/\.?0+$/, '');
}
