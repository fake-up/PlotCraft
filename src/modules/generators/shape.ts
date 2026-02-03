import type { ModuleDefinition, Layer, Path, Point } from '../../types';
import { createCirclePath, createLinePath, rotatePath } from '../../engine/geometry';

export const shapeGenerator: ModuleDefinition = {
  id: 'shape',
  name: 'Shape',
  type: 'generator',
  parameters: {
    shapeType: {
      type: 'select',
      label: 'Shape Type',
      default: 'circle',
      options: [
        { value: 'dot', label: 'Dot' },
        { value: 'line', label: 'Line' },
        { value: 'circle', label: 'Circle' },
        { value: 'rectangle', label: 'Rectangle' },
        { value: 'triangle', label: 'Triangle' },
        { value: 'polygon', label: 'Polygon' },
        { value: 'arc', label: 'Arc' },
      ],
    },
    // Common parameters
    centerX: { type: 'number', label: 'Center X (%)', default: 50, min: 0, max: 100, step: 1 },
    centerY: { type: 'number', label: 'Center Y (%)', default: 50, min: 0, max: 100, step: 1 },
    rotation: { type: 'number', label: 'Rotation', default: 0, min: 0, max: 360, step: 1 },

    // Dot parameters
    dotSize: { type: 'number', label: 'Dot Size', default: 1, min: 0.5, max: 10, step: 0.5, showWhen: { param: 'shapeType', value: 'dot' } },

    // Line parameters
    lineLength: { type: 'number', label: 'Length', default: 50, min: 1, max: 500, step: 1, showWhen: { param: 'shapeType', value: 'line' } },
    lineAngle: { type: 'number', label: 'Angle', default: 0, min: 0, max: 360, step: 1, showWhen: { param: 'shapeType', value: 'line' } },
    lineCentered: { type: 'boolean', label: 'Centered', default: true, showWhen: { param: 'shapeType', value: 'line' } },

    // Circle parameters
    circleRadius: { type: 'number', label: 'Radius', default: 25, min: 1, max: 500, step: 1, showWhen: { param: 'shapeType', value: 'circle' } },
    circleSegments: { type: 'number', label: 'Segments', default: 64, min: 8, max: 360, step: 1, showWhen: { param: 'shapeType', value: 'circle' } },

    // Rectangle parameters
    rectWidth: { type: 'number', label: 'Width', default: 50, min: 1, max: 500, step: 1, showWhen: { param: 'shapeType', value: 'rectangle' } },
    rectHeight: { type: 'number', label: 'Height', default: 50, min: 1, max: 500, step: 1, showWhen: { param: 'shapeType', value: 'rectangle' } },
    rectCornerRadius: { type: 'number', label: 'Corner Radius', default: 0, min: 0, max: 50, step: 0.5, showWhen: { param: 'shapeType', value: 'rectangle' } },

    // Triangle parameters
    triangleSize: { type: 'number', label: 'Size', default: 50, min: 1, max: 500, step: 1, showWhen: { param: 'shapeType', value: 'triangle' } },
    triangleType: {
      type: 'select',
      label: 'Triangle Type',
      default: 'equilateral',
      options: [
        { value: 'equilateral', label: 'Equilateral' },
        { value: 'isoceles', label: 'Isoceles' },
        { value: 'right', label: 'Right' },
      ],
      showWhen: { param: 'shapeType', value: 'triangle' },
    },

    // Polygon parameters
    polyRadius: { type: 'number', label: 'Radius', default: 25, min: 1, max: 500, step: 1, showWhen: { param: 'shapeType', value: 'polygon' } },
    polySides: { type: 'number', label: 'Sides', default: 6, min: 3, max: 20, step: 1, showWhen: { param: 'shapeType', value: 'polygon' } },
    polyCornerRadius: { type: 'number', label: 'Corner Radius', default: 0, min: 0, max: 20, step: 0.5, showWhen: { param: 'shapeType', value: 'polygon' } },

    // Arc parameters
    arcRadius: { type: 'number', label: 'Radius', default: 25, min: 1, max: 500, step: 1, showWhen: { param: 'shapeType', value: 'arc' } },
    arcStartAngle: { type: 'number', label: 'Start Angle', default: 0, min: 0, max: 360, step: 1, showWhen: { param: 'shapeType', value: 'arc' } },
    arcEndAngle: { type: 'number', label: 'End Angle', default: 180, min: 0, max: 360, step: 1, showWhen: { param: 'shapeType', value: 'arc' } },
    arcSegments: { type: 'number', label: 'Segments', default: 32, min: 8, max: 180, step: 1, showWhen: { param: 'shapeType', value: 'arc' } },

    // Layer assignment
    layerId: {
      type: 'select',
      label: 'Layer',
      default: 'default-layer',
      options: [],
      dynamicOptions: 'plotLayers',
    },
  },
  execute: (params, _input, ctx) => {
    const shapeType = (params.shapeType as string) ?? 'circle';
    const centerX = ((params.centerX as number) ?? 50) / 100 * ctx.canvas.width;
    const centerY = ((params.centerY as number) ?? 50) / 100 * ctx.canvas.height;
    const rotation = ((params.rotation as number) ?? 0) * Math.PI / 180;

    let path: Path;

    switch (shapeType) {
      case 'dot': {
        const size = (params.dotSize as number) ?? 1;
        path = createCirclePath(centerX, centerY, size / 2, 16);
        break;
      }

      case 'line': {
        const length = (params.lineLength as number) ?? 50;
        const angle = ((params.lineAngle as number) ?? 0) * Math.PI / 180;
        const centered = params.lineCentered !== false;

        if (centered) {
          const halfLen = length / 2;
          const dx = Math.cos(angle) * halfLen;
          const dy = Math.sin(angle) * halfLen;
          path = createLinePath(centerX - dx, centerY - dy, centerX + dx, centerY + dy);
        } else {
          const dx = Math.cos(angle) * length;
          const dy = Math.sin(angle) * length;
          path = createLinePath(centerX, centerY, centerX + dx, centerY + dy);
        }
        break;
      }

      case 'circle': {
        const radius = (params.circleRadius as number) ?? 25;
        const segments = (params.circleSegments as number) ?? 64;
        path = createCirclePath(centerX, centerY, radius, segments);
        break;
      }

      case 'rectangle': {
        const width = (params.rectWidth as number) ?? 50;
        const height = (params.rectHeight as number) ?? 50;
        const cornerRadius = (params.rectCornerRadius as number) ?? 0;

        if (cornerRadius > 0) {
          path = createRoundedRect(centerX, centerY, width, height, cornerRadius);
        } else {
          const halfW = width / 2;
          const halfH = height / 2;
          path = {
            points: [
              { x: centerX - halfW, y: centerY - halfH },
              { x: centerX + halfW, y: centerY - halfH },
              { x: centerX + halfW, y: centerY + halfH },
              { x: centerX - halfW, y: centerY + halfH },
              { x: centerX - halfW, y: centerY - halfH },
            ],
            closed: true,
          };
        }
        break;
      }

      case 'triangle': {
        const size = (params.triangleSize as number) ?? 50;
        const triangleType = (params.triangleType as string) ?? 'equilateral';
        path = createTriangle(centerX, centerY, size, triangleType);
        break;
      }

      case 'polygon': {
        const radius = (params.polyRadius as number) ?? 25;
        const sides = (params.polySides as number) ?? 6;
        const cornerRadius = (params.polyCornerRadius as number) ?? 0;

        if (cornerRadius > 0) {
          path = createRoundedPolygon(centerX, centerY, radius, sides, cornerRadius);
        } else {
          path = createPolygon(centerX, centerY, radius, sides);
        }
        break;
      }

      case 'arc': {
        const radius = (params.arcRadius as number) ?? 25;
        const startAngle = ((params.arcStartAngle as number) ?? 0) * Math.PI / 180;
        const endAngle = ((params.arcEndAngle as number) ?? 180) * Math.PI / 180;
        const segments = (params.arcSegments as number) ?? 32;
        path = createArc(centerX, centerY, radius, startAngle, endAngle, segments);
        break;
      }

      default:
        path = createCirclePath(centerX, centerY, 25, 64);
    }

    // Apply rotation if non-zero
    if (rotation !== 0) {
      path = rotatePath(path, rotation, centerX, centerY);
    }

    const layer: Layer = {
      id: 'shape',
      paths: [path],
    };

    return [layer];
  },
};

// Helper function to create a regular polygon
function createPolygon(cx: number, cy: number, radius: number, sides: number): Path {
  const points: Point[] = [];
  // Start from top (-90 degrees) so polygons point up
  const startAngle = -Math.PI / 2;

  for (let i = 0; i <= sides; i++) {
    const angle = startAngle + (i / sides) * Math.PI * 2;
    points.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    });
  }

  return { points, closed: true };
}

// Helper function to create a triangle
function createTriangle(cx: number, cy: number, size: number, type: string): Path {
  const points: Point[] = [];

  switch (type) {
    case 'equilateral': {
      // Equilateral triangle with given height
      const height = size;
      const sideLength = (height * 2) / Math.sqrt(3);
      const halfBase = sideLength / 2;
      // Center the triangle vertically
      const topY = cy - height / 2;
      const bottomY = cy + height / 2;
      points.push(
        { x: cx, y: topY },                    // Top vertex
        { x: cx + halfBase, y: bottomY },      // Bottom right
        { x: cx - halfBase, y: bottomY },      // Bottom left
        { x: cx, y: topY },                    // Close
      );
      break;
    }

    case 'isoceles': {
      // Isoceles triangle - narrower base
      const height = size;
      const halfBase = size / 3;
      const topY = cy - height / 2;
      const bottomY = cy + height / 2;
      points.push(
        { x: cx, y: topY },
        { x: cx + halfBase, y: bottomY },
        { x: cx - halfBase, y: bottomY },
        { x: cx, y: topY },
      );
      break;
    }

    case 'right': {
      // Right triangle
      const halfSize = size / 2;
      points.push(
        { x: cx - halfSize, y: cy - halfSize },  // Top left (right angle)
        { x: cx + halfSize, y: cy + halfSize },  // Bottom right
        { x: cx - halfSize, y: cy + halfSize },  // Bottom left
        { x: cx - halfSize, y: cy - halfSize },  // Close
      );
      break;
    }

    default:
      // Default to equilateral
      return createTriangle(cx, cy, size, 'equilateral');
  }

  return { points, closed: true };
}

// Helper function to create an arc
function createArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  segments: number
): Path {
  const points: Point[] = [];
  const angleDiff = endAngle - startAngle;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + t * angleDiff;
    points.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    });
  }

  return { points, closed: false };
}

// Helper function to create a rounded rectangle
function createRoundedRect(
  cx: number,
  cy: number,
  width: number,
  height: number,
  cornerRadius: number
): Path {
  const points: Point[] = [];
  const halfW = width / 2;
  const halfH = height / 2;

  // Clamp corner radius to half of the smaller dimension
  const r = Math.min(cornerRadius, halfW, halfH);
  const segments = 8; // segments per corner

  // Top-right corner
  for (let i = 0; i <= segments; i++) {
    const angle = -Math.PI / 2 + (i / segments) * (Math.PI / 2);
    points.push({
      x: cx + halfW - r + Math.cos(angle) * r,
      y: cy - halfH + r + Math.sin(angle) * r,
    });
  }

  // Bottom-right corner
  for (let i = 0; i <= segments; i++) {
    const angle = 0 + (i / segments) * (Math.PI / 2);
    points.push({
      x: cx + halfW - r + Math.cos(angle) * r,
      y: cy + halfH - r + Math.sin(angle) * r,
    });
  }

  // Bottom-left corner
  for (let i = 0; i <= segments; i++) {
    const angle = Math.PI / 2 + (i / segments) * (Math.PI / 2);
    points.push({
      x: cx - halfW + r + Math.cos(angle) * r,
      y: cy + halfH - r + Math.sin(angle) * r,
    });
  }

  // Top-left corner
  for (let i = 0; i <= segments; i++) {
    const angle = Math.PI + (i / segments) * (Math.PI / 2);
    points.push({
      x: cx - halfW + r + Math.cos(angle) * r,
      y: cy - halfH + r + Math.sin(angle) * r,
    });
  }

  // Close the path
  points.push(points[0]);

  return { points, closed: true };
}

// Helper function to create a rounded polygon
function createRoundedPolygon(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  cornerRadius: number
): Path {
  const points: Point[] = [];
  const startAngle = -Math.PI / 2;
  const segmentsPerCorner = 4;

  // Calculate vertices
  const vertices: Point[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = startAngle + (i / sides) * Math.PI * 2;
    vertices.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    });
  }

  // For each vertex, create a rounded corner
  for (let i = 0; i < sides; i++) {
    const prev = vertices[(i - 1 + sides) % sides];
    const curr = vertices[i];
    const next = vertices[(i + 1) % sides];

    // Direction vectors
    const toPrev = {
      x: prev.x - curr.x,
      y: prev.y - curr.y,
    };
    const toNext = {
      x: next.x - curr.x,
      y: next.y - curr.y,
    };

    // Normalize
    const lenPrev = Math.sqrt(toPrev.x * toPrev.x + toPrev.y * toPrev.y);
    const lenNext = Math.sqrt(toNext.x * toNext.x + toNext.y * toNext.y);

    toPrev.x /= lenPrev;
    toPrev.y /= lenPrev;
    toNext.x /= lenNext;
    toNext.y /= lenNext;

    // Limit corner radius
    const maxR = Math.min(cornerRadius, lenPrev / 2, lenNext / 2);

    // Corner start and end points
    const cornerStart = {
      x: curr.x + toPrev.x * maxR,
      y: curr.y + toPrev.y * maxR,
    };
    const cornerEnd = {
      x: curr.x + toNext.x * maxR,
      y: curr.y + toNext.y * maxR,
    };

    // Add arc between cornerStart and cornerEnd
    // Using simple interpolation for now (quadratic bezier approximation)
    for (let j = 0; j <= segmentsPerCorner; j++) {
      const t = j / segmentsPerCorner;
      // Quadratic bezier: (1-t)^2 * P0 + 2*(1-t)*t * P1 + t^2 * P2
      const x = (1 - t) * (1 - t) * cornerStart.x + 2 * (1 - t) * t * curr.x + t * t * cornerEnd.x;
      const y = (1 - t) * (1 - t) * cornerStart.y + 2 * (1 - t) * t * curr.y + t * t * cornerEnd.y;
      points.push({ x, y });
    }
  }

  // Close the path
  if (points.length > 0) {
    points.push(points[0]);
  }

  return { points, closed: true };
}
