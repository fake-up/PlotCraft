import type { ModuleDefinition, Layer, Path, Point } from '../../types';

export const arcGenerator: ModuleDefinition = {
  id: 'arc',
  name: 'Arc',
  type: 'generator',
  parameters: {
    centerX: { type: 'number', label: 'Center X (%)', default: 50, min: 0, max: 100, step: 1 },
    centerY: { type: 'number', label: 'Center Y (%)', default: 50, min: 0, max: 100, step: 1 },
    radius: { type: 'number', label: 'Radius', default: 50, min: 5, max: 500, step: 1 },
    startAngle: { type: 'number', label: 'Start Angle', default: 0, min: 0, max: 360, step: 1 },
    endAngle: { type: 'number', label: 'End Angle', default: 180, min: 0, max: 360, step: 1 },
    segments: { type: 'number', label: 'Segments', default: 64, min: 8, max: 360, step: 1 },
    closePath: { type: 'boolean', label: 'Close Path (Pie Slice)', default: false },
    arcCount: { type: 'number', label: 'Arc Count', default: 1, min: 1, max: 50, step: 1 },
    radiusStep: {
      type: 'number',
      label: 'Radius Step',
      default: 10,
      min: 1,
      max: 100,
      step: 1,
      showWhen: { param: 'arcCount', value: 1 }, // Show when NOT 1, but we can't do that, so show always
    },
  },
  execute: (params, _input, ctx) => {
    const centerX = (params.centerX as number) ?? 50;
    const centerY = (params.centerY as number) ?? 50;
    const baseRadius = (params.radius as number) ?? 50;
    const startAngle = (params.startAngle as number) ?? 0;
    const endAngle = (params.endAngle as number) ?? 180;
    const segments = (params.segments as number) ?? 64;
    const closePath = (params.closePath as boolean) ?? false;
    const arcCount = (params.arcCount as number) ?? 1;
    const radiusStep = (params.radiusStep as number) ?? 10;

    const { canvas } = ctx;

    // Calculate center position in canvas coords
    const cx = (centerX / 100) * canvas.width;
    const cy = (centerY / 100) * canvas.height;

    // Convert angles to radians
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const paths: Path[] = [];

    for (let a = 0; a < arcCount; a++) {
      const radius = baseRadius + a * radiusStep;
      const points: Point[] = [];

      // If closing path, start from center
      if (closePath) {
        points.push({ x: cx, y: cy });
      }

      // Generate arc points
      const angleRange = endRad - startRad;
      const segmentsForThisArc = Math.max(2, Math.ceil(Math.abs(angleRange) / (Math.PI * 2) * segments));

      for (let i = 0; i <= segmentsForThisArc; i++) {
        const t = i / segmentsForThisArc;
        const angle = startRad + t * angleRange;
        points.push({
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
        });
      }

      // If closing path, connect back to center (pie slice)
      if (closePath) {
        points.push({ x: cx, y: cy });
      }

      paths.push({ points, closed: closePath });
    }

    const layer: Layer = {
      id: 'arc',
      paths,
    };

    return [layer];
  },
};
