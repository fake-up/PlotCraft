import type { ModuleDefinition, Point, Path } from '../../types';

export const subdivideModifier: ModuleDefinition = {
  id: 'subdivide',
  name: 'Subdivide',
  type: 'modifier',
  parameters: {
    divisions: {
      type: 'number',
      label: 'Divisions per Segment',
      default: 5,
      min: 1,
      max: 50,
      step: 1,
    },
    mode: {
      type: 'select',
      label: 'Mode',
      default: 'uniform',
      options: [
        { value: 'uniform', label: 'Uniform' },
        { value: 'adaptive', label: 'Adaptive (by length)' },
      ],
    },
    minSegmentLength: {
      type: 'number',
      label: 'Min Segment Length (mm)',
      default: 1,
      min: 0.5,
      max: 10,
      step: 0.5,
      showWhen: { param: 'mode', value: 'adaptive' },
    },
    maxDivisions: {
      type: 'number',
      label: 'Max Divisions (adaptive)',
      default: 20,
      min: 1,
      max: 100,
      step: 1,
      showWhen: { param: 'mode', value: 'adaptive' },
    },
  },
  execute: (params, input) => {
    const divisions = Math.max(1, (params.divisions as number) ?? 5);
    const mode = (params.mode as string) ?? 'uniform';
    const minSegmentLength = (params.minSegmentLength as number) ?? 1;
    const maxDivisions = (params.maxDivisions as number) ?? 20;

    return input.map(layer => ({
      ...layer,
      paths: layer.paths.map(path => subdividePath(path, {
        divisions,
        mode,
        minSegmentLength,
        maxDivisions,
      })),
    }));
  },
};

interface SubdivideOptions {
  divisions: number;
  mode: string;
  minSegmentLength: number;
  maxDivisions: number;
}

function subdividePath(path: Path, options: SubdivideOptions): Path {
  const { divisions, mode, minSegmentLength, maxDivisions } = options;

  // Need at least 2 points to have segments
  if (path.points.length < 2) {
    return path;
  }

  const newPoints: Point[] = [];
  const points = path.points;
  const n = points.length;

  // Process each segment
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];

    // Always add the start point of this segment
    newPoints.push({ x: p0.x, y: p0.y });

    // Calculate segment length
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);

    // Determine number of divisions for this segment
    let segmentDivisions: number;

    if (mode === 'adaptive') {
      // Adaptive: more divisions for longer segments
      // Calculate divisions based on segment length and min segment length
      segmentDivisions = Math.floor(segmentLength / minSegmentLength);
      segmentDivisions = Math.max(1, Math.min(maxDivisions, segmentDivisions));
    } else {
      // Uniform: same divisions for every segment
      segmentDivisions = divisions;
    }

    // Add intermediate points (but not the endpoint - that's added as the next segment's start)
    if (segmentDivisions > 1) {
      for (let j = 1; j < segmentDivisions; j++) {
        const t = j / segmentDivisions;
        newPoints.push({
          x: p0.x + dx * t,
          y: p0.y + dy * t,
        });
      }
    }
  }

  // Add the final point
  newPoints.push({ x: points[n - 1].x, y: points[n - 1].y });

  // For closed paths, we also need to subdivide the segment from last to first
  if (path.closed && n >= 2) {
    const pLast = points[n - 1];
    const pFirst = points[0];

    const dx = pFirst.x - pLast.x;
    const dy = pFirst.y - pLast.y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);

    let segmentDivisions: number;
    if (mode === 'adaptive') {
      segmentDivisions = Math.floor(segmentLength / minSegmentLength);
      segmentDivisions = Math.max(1, Math.min(maxDivisions, segmentDivisions));
    } else {
      segmentDivisions = divisions;
    }

    // Add intermediate points for the closing segment (but not endpoints)
    if (segmentDivisions > 1) {
      for (let j = 1; j < segmentDivisions; j++) {
        const t = j / segmentDivisions;
        newPoints.push({
          x: pLast.x + dx * t,
          y: pLast.y + dy * t,
        });
      }
    }
  }

  return { ...path, points: newPoints };
}
