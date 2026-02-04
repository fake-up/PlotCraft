import type { ModuleDefinition, Path, Point } from '../../types';
import { noise2D, distance } from '../../engine/geometry';
import { createSeededRng } from '../../engine/rng';

export const duplicateModifier: ModuleDefinition = {
  id: 'duplicate',
  name: 'Duplicate',
  type: 'modifier',
  additionalInputs: [
    { name: 'guidePath', type: 'paths', optional: true },
  ],
  parameters: {
    // === DISTRIBUTION ===
    distributionMode: {
      type: 'select',
      label: 'Distribution Mode',
      default: 'linear',
      options: [
        { value: 'linear', label: 'Linear' },
        { value: 'grid', label: 'Grid' },
        { value: 'circular', label: 'Circular' },
        { value: 'random', label: 'Random' },
        { value: 'radial', label: 'Radial' },
        { value: 'along-path', label: 'Along Path' },
      ],
    },

    // Linear mode
    copies: {
      type: 'number',
      label: 'Copies',
      default: 3,
      min: 1,
      max: 50,
      step: 1,
      showWhen: { param: 'distributionMode', value: 'linear' },
    },
    offsetX: {
      type: 'number',
      label: 'Offset X (mm)',
      default: 20,
      min: -200,
      max: 200,
      step: 1,
      showWhen: { param: 'distributionMode', value: 'linear' },
    },
    offsetY: {
      type: 'number',
      label: 'Offset Y (mm)',
      default: 20,
      min: -200,
      max: 200,
      step: 1,
      showWhen: { param: 'distributionMode', value: 'linear' },
    },

    // Grid mode
    gridRows: {
      type: 'number',
      label: 'Grid Rows',
      default: 3,
      min: 1,
      max: 50,
      step: 1,
      showWhen: { param: 'distributionMode', value: 'grid' },
    },
    gridColumns: {
      type: 'number',
      label: 'Grid Columns',
      default: 3,
      min: 1,
      max: 50,
      step: 1,
      showWhen: { param: 'distributionMode', value: 'grid' },
    },
    gridSpacingX: {
      type: 'number',
      label: 'Grid Spacing X (mm)',
      default: 20,
      min: 0,
      max: 200,
      step: 1,
      showWhen: { param: 'distributionMode', value: 'grid' },
    },
    gridSpacingY: {
      type: 'number',
      label: 'Grid Spacing Y (mm)',
      default: 20,
      min: 0,
      max: 200,
      step: 1,
      showWhen: { param: 'distributionMode', value: 'grid' },
    },
    gridCentered: {
      type: 'boolean',
      label: 'Center Grid',
      default: true,
      showWhen: { param: 'distributionMode', value: 'grid' },
    },

    // Circular mode
    circleRadius: {
      type: 'number',
      label: 'Circle Radius (mm)',
      default: 100,
      min: 10,
      max: 500,
      step: 5,
      showWhen: { param: 'distributionMode', value: 'circular' },
    },
    circleCount: {
      type: 'number',
      label: 'Copies Around Circle',
      default: 8,
      min: 1,
      max: 100,
      step: 1,
      showWhen: { param: 'distributionMode', value: 'circular' },
    },
    circleStartAngle: {
      type: 'number',
      label: 'Start Angle (°)',
      default: 0,
      min: 0,
      max: 360,
      step: 15,
      showWhen: { param: 'distributionMode', value: 'circular' },
    },
    circleEndAngle: {
      type: 'number',
      label: 'End Angle (°)',
      default: 360,
      min: 0,
      max: 360,
      step: 15,
      showWhen: { param: 'distributionMode', value: 'circular' },
    },
    circleCenterX: {
      type: 'number',
      label: 'Circle Center X (%)',
      default: 50,
      min: 0,
      max: 100,
      step: 1,
      showWhen: { param: 'distributionMode', value: 'circular' },
    },
    circleCenterY: {
      type: 'number',
      label: 'Circle Center Y (%)',
      default: 50,
      min: 0,
      max: 100,
      step: 1,
      showWhen: { param: 'distributionMode', value: 'circular' },
    },
    orientToCircle: {
      type: 'boolean',
      label: 'Orient to Circle',
      default: true,
      showWhen: { param: 'distributionMode', value: 'circular' },
    },

    // Along-path mode
    pathCopies: {
      type: 'number',
      label: 'Copies',
      default: 10,
      min: 1,
      max: 100,
      step: 1,
      showWhen: { param: 'distributionMode', value: 'along-path' },
    },
    alignToPath: {
      type: 'boolean',
      label: 'Align to Path',
      default: true,
      showWhen: { param: 'distributionMode', value: 'along-path' },
    },
    pathStartOffset: {
      type: 'number',
      label: 'Start Offset (%)',
      default: 0,
      min: 0,
      max: 100,
      step: 1,
      showWhen: { param: 'distributionMode', value: 'along-path' },
    },
    pathEndOffset: {
      type: 'number',
      label: 'End Offset (%)',
      default: 100,
      min: 0,
      max: 100,
      step: 1,
      showWhen: { param: 'distributionMode', value: 'along-path' },
    },
    pathSpacing: {
      type: 'select',
      label: 'Spacing Mode',
      default: 'even',
      options: [
        { value: 'even', label: 'Even (by count)' },
        { value: 'by-distance', label: 'By Distance (mm)' },
      ],
      showWhen: { param: 'distributionMode', value: 'along-path' },
    },
    pathSpacingDistance: {
      type: 'number',
      label: 'Spacing Distance (mm)',
      default: 20,
      min: 1,
      max: 200,
      step: 1,
      showWhen: { param: 'distributionMode', value: 'along-path' },
    },

    // Random mode
    randomCopies: {
      type: 'number',
      label: 'Copies',
      default: 5,
      min: 1,
      max: 50,
      step: 1,
      showWhen: { param: 'distributionMode', value: 'random' },
    },
    randomSpreadX: {
      type: 'number',
      label: 'Random Spread X (mm)',
      default: 50,
      min: 0,
      max: 200,
      step: 1,
      showWhen: { param: 'distributionMode', value: 'random' },
    },
    randomSpreadY: {
      type: 'number',
      label: 'Random Spread Y (mm)',
      default: 50,
      min: 0,
      max: 200,
      step: 1,
      showWhen: { param: 'distributionMode', value: 'random' },
    },
    randomSeed: {
      type: 'number',
      label: 'Random Seed',
      default: 12345,
      min: 0,
      max: 99999,
      step: 1,
      showWhen: { param: 'distributionMode', value: 'random' },
    },

    // Radial mode
    radialCount: {
      type: 'number',
      label: 'Copies',
      default: 6,
      min: 1,
      max: 50,
      step: 1,
      showWhen: { param: 'distributionMode', value: 'radial' },
    },
    radialRadius: {
      type: 'number',
      label: 'Radial Radius (mm)',
      default: 30,
      min: 1,
      max: 500,
      step: 1,
      showWhen: { param: 'distributionMode', value: 'radial' },
    },
    radialAngleOffset: {
      type: 'number',
      label: 'Angle Offset (°)',
      default: 0,
      min: 0,
      max: 360,
      step: 5,
      showWhen: { param: 'distributionMode', value: 'radial' },
    },

    // === ROTATION RAMPING ===
    rotationStart: {
      type: 'number',
      label: 'Rotation Start (°)',
      default: 0,
      min: -360,
      max: 360,
      step: 15,
    },
    rotationEnd: {
      type: 'number',
      label: 'Rotation End (°)',
      default: 0,
      min: -360,
      max: 360,
      step: 15,
    },
    rotationEasing: {
      type: 'select',
      label: 'Rotation Easing',
      default: 'linear',
      options: [
        { value: 'linear', label: 'Linear' },
        { value: 'ease-in', label: 'Ease In' },
        { value: 'ease-out', label: 'Ease Out' },
        { value: 'ease-in-out', label: 'Ease In-Out' },
      ],
    },

    // === SCALE RAMPING ===
    uniformScale: {
      type: 'boolean',
      label: 'Uniform Scale',
      default: true,
    },
    scaleStart: {
      type: 'number',
      label: 'Scale Start',
      default: 1,
      min: 0.1,
      max: 3,
      step: 0.05,
      showWhen: { param: 'uniformScale', value: true },
    },
    scaleEnd: {
      type: 'number',
      label: 'Scale End',
      default: 1,
      min: 0.1,
      max: 3,
      step: 0.05,
      showWhen: { param: 'uniformScale', value: true },
    },
    scaleXStart: {
      type: 'number',
      label: 'Scale X Start',
      default: 1,
      min: 0.1,
      max: 3,
      step: 0.05,
      showWhen: { param: 'uniformScale', value: false },
    },
    scaleXEnd: {
      type: 'number',
      label: 'Scale X End',
      default: 1,
      min: 0.1,
      max: 3,
      step: 0.05,
      showWhen: { param: 'uniformScale', value: false },
    },
    scaleYStart: {
      type: 'number',
      label: 'Scale Y Start',
      default: 1,
      min: 0.1,
      max: 3,
      step: 0.05,
      showWhen: { param: 'uniformScale', value: false },
    },
    scaleYEnd: {
      type: 'number',
      label: 'Scale Y End',
      default: 1,
      min: 0.1,
      max: 3,
      step: 0.05,
      showWhen: { param: 'uniformScale', value: false },
    },
    scaleEasing: {
      type: 'select',
      label: 'Scale Easing',
      default: 'linear',
      options: [
        { value: 'linear', label: 'Linear' },
        { value: 'ease-in', label: 'Ease In' },
        { value: 'ease-out', label: 'Ease Out' },
        { value: 'ease-in-out', label: 'Ease In-Out' },
      ],
    },

    // Transform center
    centerX: {
      type: 'number',
      label: 'Transform Center X (%)',
      default: 50,
      min: 0,
      max: 100,
      step: 1,
    },
    centerY: {
      type: 'number',
      label: 'Transform Center Y (%)',
      default: 50,
      min: 0,
      max: 100,
      step: 1,
    },

    // === RANDOM EFFECTOR ===
    randomizePosition: {
      type: 'number',
      label: 'Random Position (mm)',
      default: 0,
      min: 0,
      max: 50,
      step: 1,
    },
    randomizeRotation: {
      type: 'number',
      label: 'Random Rotation (°)',
      default: 0,
      min: 0,
      max: 180,
      step: 5,
    },
    randomizeScale: {
      type: 'number',
      label: 'Random Scale (±)',
      default: 0,
      min: 0,
      max: 0.5,
      step: 0.05,
    },

    // === STEP EFFECTOR ===
    enableStepEffector: {
      type: 'boolean',
      label: 'Enable Step Effector',
      default: false,
    },
    stepInterval: {
      type: 'number',
      label: 'Step Interval',
      default: 2,
      min: 1,
      max: 10,
      step: 1,
      showWhen: { param: 'enableStepEffector', value: true },
    },
    stepRotation: {
      type: 'number',
      label: 'Step Rotation (°)',
      default: 0,
      min: -180,
      max: 180,
      step: 15,
      showWhen: { param: 'enableStepEffector', value: true },
    },
    stepScale: {
      type: 'number',
      label: 'Step Scale Multiplier',
      default: 1,
      min: 0.5,
      max: 2,
      step: 0.1,
      showWhen: { param: 'enableStepEffector', value: true },
    },

    // === NOISE EFFECTOR ===
    enableNoiseEffector: {
      type: 'boolean',
      label: 'Enable Noise Effector',
      default: false,
    },
    noisePositionAmount: {
      type: 'number',
      label: 'Noise Position (mm)',
      default: 0,
      min: 0,
      max: 50,
      step: 1,
      showWhen: { param: 'enableNoiseEffector', value: true },
    },
    noiseRotationAmount: {
      type: 'number',
      label: 'Noise Rotation (°)',
      default: 0,
      min: 0,
      max: 90,
      step: 5,
      showWhen: { param: 'enableNoiseEffector', value: true },
    },
    noiseScaleAmount: {
      type: 'number',
      label: 'Noise Scale (±)',
      default: 0,
      min: 0,
      max: 0.5,
      step: 0.05,
      showWhen: { param: 'enableNoiseEffector', value: true },
    },
    noiseFrequency: {
      type: 'number',
      label: 'Noise Frequency',
      default: 0.1,
      min: 0.01,
      max: 1,
      step: 0.01,
      showWhen: { param: 'enableNoiseEffector', value: true },
    },

    // Include original
    includeOriginal: {
      type: 'boolean',
      label: 'Include Original',
      default: true,
    },
  },

  execute: (params, input, ctx) => {
    // Distribution params
    const distributionMode = (params.distributionMode as string) ?? 'linear';
    const copies = (params.copies as number) ?? 3;
    const offsetX = (params.offsetX as number) ?? 20;
    const offsetY = (params.offsetY as number) ?? 20;

    // Grid params
    const gridRows = (params.gridRows as number) ?? 3;
    const gridColumns = (params.gridColumns as number) ?? 3;
    const gridSpacingX = (params.gridSpacingX as number) ?? 20;
    const gridSpacingY = (params.gridSpacingY as number) ?? 20;
    const gridCentered = params.gridCentered !== false;

    // Circular params
    const circleRadius = (params.circleRadius as number) ?? 100;
    const circleCount = (params.circleCount as number) ?? 8;
    const circleStartAngle = ((params.circleStartAngle as number) ?? 0) * Math.PI / 180;
    const circleEndAngle = ((params.circleEndAngle as number) ?? 360) * Math.PI / 180;
    const circleCenterXPct = (params.circleCenterX as number) ?? 50;
    const circleCenterYPct = (params.circleCenterY as number) ?? 50;
    const orientToCircle = params.orientToCircle !== false;

    // Along-path params
    const pathCopies = (params.pathCopies as number) ?? 10;
    const alignToPath = params.alignToPath !== false;
    const pathStartOffset = (params.pathStartOffset as number) ?? 0;
    const pathEndOffset = (params.pathEndOffset as number) ?? 100;
    const pathSpacing = (params.pathSpacing as string) ?? 'even';
    const pathSpacingDistance = (params.pathSpacingDistance as number) ?? 20;

    // Random mode params
    const randomCopies = (params.randomCopies as number) ?? 5;
    const randomSpreadX = (params.randomSpreadX as number) ?? 50;
    const randomSpreadY = (params.randomSpreadY as number) ?? 50;
    const randomSeed = (params.randomSeed as number) ?? 12345;

    // Radial mode params
    const radialCount = (params.radialCount as number) ?? 6;
    const radialRadius = (params.radialRadius as number) ?? 30;
    const radialAngleOffset = ((params.radialAngleOffset as number) ?? 0) * Math.PI / 180;

    // Get guide path from additional inputs
    const guidePathLayers = ctx.inputs?.guidePath;
    const guidePath = guidePathLayers?.[0]?.paths?.[0] ?? null;

    // Rotation ramping
    const rotationStart = ((params.rotationStart as number) ?? 0) * Math.PI / 180;
    const rotationEnd = ((params.rotationEnd as number) ?? 0) * Math.PI / 180;
    const rotationEasing = (params.rotationEasing as string) ?? 'linear';

    // Scale ramping
    const uniformScale = params.uniformScale !== false;
    const scaleStart = (params.scaleStart as number) ?? 1;
    const scaleEnd = (params.scaleEnd as number) ?? 1;
    const scaleXStart = (params.scaleXStart as number) ?? 1;
    const scaleXEnd = (params.scaleXEnd as number) ?? 1;
    const scaleYStart = (params.scaleYStart as number) ?? 1;
    const scaleYEnd = (params.scaleYEnd as number) ?? 1;
    const scaleEasing = (params.scaleEasing as string) ?? 'linear';

    // Transform center
    const centerXPct = (params.centerX as number) ?? 50;
    const centerYPct = (params.centerY as number) ?? 50;

    // Random effector
    const randomizePosition = (params.randomizePosition as number) ?? 0;
    const randomizeRotation = ((params.randomizeRotation as number) ?? 0) * Math.PI / 180;
    const randomizeScale = (params.randomizeScale as number) ?? 0;

    // Step effector
    const enableStepEffector = params.enableStepEffector === true;
    const stepInterval = (params.stepInterval as number) ?? 2;
    const stepRotation = ((params.stepRotation as number) ?? 0) * Math.PI / 180;
    const stepScale = (params.stepScale as number) ?? 1;

    // Noise effector
    const enableNoiseEffector = params.enableNoiseEffector === true;
    const noisePositionAmount = (params.noisePositionAmount as number) ?? 0;
    const noiseRotationAmount = ((params.noiseRotationAmount as number) ?? 0) * Math.PI / 180;
    const noiseScaleAmount = (params.noiseScaleAmount as number) ?? 0;
    const noiseFrequency = (params.noiseFrequency as number) ?? 0.1;

    const includeOriginal = params.includeOriginal !== false;

    const { width, height } = ctx.canvas;
    const { rng, seed } = ctx;

    // Transform center in canvas coords
    const cx = (centerXPct / 100) * width;
    const cy = (centerYPct / 100) * height;

    // Circle center in canvas coords
    const circleCX = (circleCenterXPct / 100) * width;
    const circleCY = (circleCenterYPct / 100) * height;

    // Generate copy positions based on distribution mode
    const copyConfigs = generateCopyConfigs(
      distributionMode,
      {
        copies, offsetX, offsetY,
        gridRows, gridColumns, gridSpacingX, gridSpacingY, gridCentered,
        circleRadius, circleCount, circleStartAngle, circleEndAngle,
        circleCX, circleCY, orientToCircle,
        pathCopies, alignToPath, pathStartOffset, pathEndOffset, pathSpacing, pathSpacingDistance, guidePath,
        randomCopies, randomSpreadX, randomSpreadY, randomSeed,
        radialCount, radialRadius, radialAngleOffset,
        width, height,
      }
    );

    const totalCopies = copyConfigs.length;

    return input.map(layer => {
      const allPaths: Path[] = [];

      // Include original if requested
      if (includeOriginal) {
        allPaths.push(...layer.paths);
      }

      // Create each copy
      for (let i = 0; i < copyConfigs.length; i++) {
        const config = copyConfigs[i];
        const t = totalCopies > 1 ? i / (totalCopies - 1) : 0;

        // Calculate ramped rotation
        const easedRotT = applyEasing(t, rotationEasing);
        let rotation = rotationStart + (rotationEnd - rotationStart) * easedRotT;

        // Add orientation if applicable (circular or along-path)
        if ((distributionMode === 'circular' && orientToCircle) ||
            (distributionMode === 'along-path' && alignToPath)) {
          rotation += config.orientAngle ?? 0;
        }

        // Calculate ramped scale
        const easedScaleT = applyEasing(t, scaleEasing);
        let scaleX: number, scaleY: number;
        if (uniformScale) {
          const s = scaleStart + (scaleEnd - scaleStart) * easedScaleT;
          scaleX = s;
          scaleY = s;
        } else {
          scaleX = scaleXStart + (scaleXEnd - scaleXStart) * easedScaleT;
          scaleY = scaleYStart + (scaleYEnd - scaleYStart) * easedScaleT;
        }

        // Apply step effector
        if (enableStepEffector && (i + 1) % stepInterval === 0) {
          rotation += stepRotation;
          scaleX *= stepScale;
          scaleY *= stepScale;
        }

        // Apply noise effector
        let noiseOffsetX = 0, noiseOffsetY = 0, noiseRotation = 0, noiseScale = 1;
        if (enableNoiseEffector) {
          const noiseInput = i * noiseFrequency;
          // Use different offsets for each noise channel
          const posNoiseX = noise2D(noiseInput, 0, seed + 100) * 2 - 1;
          const posNoiseY = noise2D(noiseInput, 0, seed + 200) * 2 - 1;
          const rotNoise = noise2D(noiseInput, 0, seed + 300) * 2 - 1;
          const scaleNoise = noise2D(noiseInput, 0, seed + 400) * 2 - 1;

          noiseOffsetX = posNoiseX * noisePositionAmount;
          noiseOffsetY = posNoiseY * noisePositionAmount;
          noiseRotation = rotNoise * noiseRotationAmount;
          noiseScale = 1 + scaleNoise * noiseScaleAmount;
        }

        // Apply random effector
        let randOffsetX = 0, randOffsetY = 0, randRotation = 0, randScale = 1;
        if (randomizePosition > 0) {
          randOffsetX = (rng() * 2 - 1) * randomizePosition;
          randOffsetY = (rng() * 2 - 1) * randomizePosition;
        }
        if (randomizeRotation > 0) {
          randRotation = (rng() * 2 - 1) * randomizeRotation;
        }
        if (randomizeScale > 0) {
          randScale = 1 + (rng() * 2 - 1) * randomizeScale;
        }

        // Combine all transforms
        const finalRotation = rotation + noiseRotation + randRotation;
        const finalScaleX = scaleX * noiseScale * randScale;
        const finalScaleY = scaleY * noiseScale * randScale;
        const finalOffsetX = config.x + noiseOffsetX + randOffsetX;
        const finalOffsetY = config.y + noiseOffsetY + randOffsetY;

        // Transform paths
        const transformedPaths = layer.paths.map(path => ({
          ...path,
          points: path.points.map(p =>
            transformPoint(p, cx, cy, finalScaleX, finalScaleY, finalRotation, finalOffsetX, finalOffsetY)
          ),
        }));

        allPaths.push(...transformedPaths);
      }

      return {
        ...layer,
        paths: allPaths,
      };
    });
  },
};

interface CopyConfig {
  x: number;
  y: number;
  orientAngle?: number;
}

interface DistributionParams {
  copies: number;
  offsetX: number;
  offsetY: number;
  gridRows: number;
  gridColumns: number;
  gridSpacingX: number;
  gridSpacingY: number;
  gridCentered: boolean;
  circleRadius: number;
  circleCount: number;
  circleStartAngle: number;
  circleEndAngle: number;
  circleCX: number;
  circleCY: number;
  orientToCircle: boolean;
  // Along-path params
  pathCopies: number;
  alignToPath: boolean;
  pathStartOffset: number;
  pathEndOffset: number;
  pathSpacing: string;
  pathSpacingDistance: number;
  guidePath: Path | null;
  // Random params
  randomCopies: number;
  randomSpreadX: number;
  randomSpreadY: number;
  randomSeed: number;
  // Radial params
  radialCount: number;
  radialRadius: number;
  radialAngleOffset: number;
  width: number;
  height: number;
}

function generateCopyConfigs(mode: string, p: DistributionParams): CopyConfig[] {
  const configs: CopyConfig[] = [];

  switch (mode) {
    case 'linear':
      for (let i = 1; i <= p.copies; i++) {
        configs.push({
          x: p.offsetX * i,
          y: p.offsetY * i,
        });
      }
      break;

    case 'grid': {
      // Calculate grid offset for centering
      let gridOffsetX = 0;
      let gridOffsetY = 0;
      if (p.gridCentered) {
        gridOffsetX = -((p.gridColumns - 1) * p.gridSpacingX) / 2;
        gridOffsetY = -((p.gridRows - 1) * p.gridSpacingY) / 2;
      }

      for (let row = 0; row < p.gridRows; row++) {
        for (let col = 0; col < p.gridColumns; col++) {
          // Skip the center position (0,0) as that's the original
          if (p.gridCentered && row === Math.floor(p.gridRows / 2) && col === Math.floor(p.gridColumns / 2) && p.gridRows % 2 === 1 && p.gridColumns % 2 === 1) {
            continue;
          }
          configs.push({
            x: gridOffsetX + col * p.gridSpacingX,
            y: gridOffsetY + row * p.gridSpacingY,
          });
        }
      }
      break;
    }

    case 'circular': {
      const angleRange = p.circleEndAngle - p.circleStartAngle;
      const isFullCircle = Math.abs(angleRange - Math.PI * 2) < 0.01;
      const count = p.circleCount;

      for (let i = 0; i < count; i++) {
        // For full circle, don't include endpoint that overlaps start
        const t = isFullCircle ? i / count : (count > 1 ? i / (count - 1) : 0);
        const angle = p.circleStartAngle + angleRange * t;

        // Position relative to canvas center, but offset from circle center
        const posX = Math.cos(angle) * p.circleRadius + (p.circleCX - p.width / 2);
        const posY = Math.sin(angle) * p.circleRadius + (p.circleCY - p.height / 2);

        configs.push({
          x: posX,
          y: posY,
          orientAngle: p.orientToCircle ? angle + Math.PI / 2 : 0, // Face outward (perpendicular to radius)
        });
      }
      break;
    }

    case 'random': {
      const rng = createSeededRng(p.randomSeed);
      for (let i = 0; i < p.randomCopies; i++) {
        configs.push({
          x: (rng() - 0.5) * p.randomSpreadX,
          y: (rng() - 0.5) * p.randomSpreadY,
        });
      }
      break;
    }

    case 'radial': {
      for (let i = 0; i < p.radialCount; i++) {
        const angle = p.radialAngleOffset + (i / p.radialCount) * Math.PI * 2;
        configs.push({
          x: Math.cos(angle) * p.radialRadius,
          y: Math.sin(angle) * p.radialRadius,
        });
      }
      break;
    }

    case 'along-path': {
      if (!p.guidePath || p.guidePath.points.length < 2) {
        // No guide path, just create one copy at origin
        configs.push({ x: 0, y: 0 });
        break;
      }

      // Calculate cumulative distances along the path
      const pathPoints = p.guidePath.points;
      const cumulativeDistances: number[] = [0];
      let totalDistance = 0;

      for (let i = 1; i < pathPoints.length; i++) {
        const d = distance(pathPoints[i - 1], pathPoints[i]);
        totalDistance += d;
        cumulativeDistances.push(totalDistance);
      }

      if (totalDistance === 0) {
        configs.push({ x: 0, y: 0 });
        break;
      }

      // Calculate start and end positions on the path
      const startT = p.pathStartOffset / 100;
      const endT = p.pathEndOffset / 100;
      const startDist = startT * totalDistance;
      const endDist = endT * totalDistance;
      const usableDistance = endDist - startDist;

      // Determine sample positions based on spacing mode
      const sampleDistances: number[] = [];

      if (p.pathSpacing === 'by-distance' && p.pathSpacingDistance > 0) {
        // Fixed distance spacing
        let d = startDist;
        while (d <= endDist + 0.001) {
          sampleDistances.push(d);
          d += p.pathSpacingDistance;
        }
      } else {
        // Even parametric spacing
        const count = p.pathCopies;
        for (let i = 0; i < count; i++) {
          const t = count > 1 ? i / (count - 1) : 0;
          sampleDistances.push(startDist + t * usableDistance);
        }
      }

      // Sample points and tangents along the path
      for (const targetDist of sampleDistances) {
        // Find the segment containing this distance
        let segmentIndex = 0;
        for (let i = 1; i < cumulativeDistances.length; i++) {
          if (cumulativeDistances[i] >= targetDist) {
            segmentIndex = i - 1;
            break;
          }
          segmentIndex = i - 1;
        }

        // Interpolate within the segment
        const segStart = cumulativeDistances[segmentIndex];
        const segEnd = cumulativeDistances[segmentIndex + 1] ?? segStart;
        const segLength = segEnd - segStart;
        const segT = segLength > 0 ? (targetDist - segStart) / segLength : 0;

        const p1 = pathPoints[segmentIndex];
        const p2 = pathPoints[segmentIndex + 1] ?? p1;

        const posX = p1.x + (p2.x - p1.x) * segT;
        const posY = p1.y + (p2.y - p1.y) * segT;

        // Calculate tangent angle
        let tangentAngle = 0;
        if (p.alignToPath) {
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          tangentAngle = Math.atan2(dy, dx);
        }

        // Position relative to canvas center (for consistent transform behavior)
        configs.push({
          x: posX - p.width / 2,
          y: posY - p.height / 2,
          orientAngle: tangentAngle,
        });
      }
      break;
    }

    default:
      break;
  }

  return configs;
}

function transformPoint(
  p: Point,
  cx: number,
  cy: number,
  scaleX: number,
  scaleY: number,
  rotation: number,
  offsetX: number,
  offsetY: number
): Point {
  // Translate to center
  let x = p.x - cx;
  let y = p.y - cy;

  // Scale
  x *= scaleX;
  y *= scaleY;

  // Rotate
  if (rotation !== 0) {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const newX = x * cos - y * sin;
    const newY = x * sin + y * cos;
    x = newX;
    y = newY;
  }

  // Translate back and apply offset
  return {
    x: x + cx + offsetX,
    y: y + cy + offsetY,
  };
}

function applyEasing(t: number, easing: string): number {
  switch (easing) {
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return 1 - (1 - t) * (1 - t);
    case 'ease-in-out':
      return t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case 'linear':
    default:
      return t;
  }
}
