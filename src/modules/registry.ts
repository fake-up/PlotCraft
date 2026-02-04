import type { ModuleDefinition } from '../types';

// Generators
import { gridGenerator } from './generators/grid';
import { flowFieldGenerator } from './generators/flowField';
import { concentricCirclesGenerator } from './generators/concentricCircles';
import { radialLinesGenerator } from './generators/radialLines';
import { spiralGenerator } from './generators/spiral';
import { lissajousGenerator } from './generators/lissajous';
import { verticalLinesGenerator } from './generators/verticalLines';
import { circlePackGenerator } from './generators/circlePack';
import { voronoiGenerator } from './generators/voronoi';
import { contoursGenerator } from './generators/contours';
import { shapeGenerator } from './generators/shape';
import { scatterPointsGenerator } from './generators/scatterPoints';
import { arcGenerator } from './generators/arc';
import { horizontalLinesGenerator } from './generators/horizontalLines';
import { particleSprayGenerator } from './generators/particleSpray';
import { truchetTilesGenerator } from './generators/truchetTiles';
import { crossGridGenerator } from './generators/crossGrid';
import { importSvgGenerator } from './generators/importSvg';
import { dashColumnsGenerator } from './generators/dashColumns';

// Modifiers
import { noiseDisplaceModifier } from './modifiers/noiseDisplace';
import { rotateModifier } from './modifiers/rotate';
import { clipRectModifier } from './modifiers/clipRect';
import { jitterModifier } from './modifiers/jitter';
import { smoothModifier } from './modifiers/smooth';
import { scaleModifier } from './modifiers/scale';
import { waveDisplaceModifier } from './modifiers/waveDisplace';
import { duplicateModifier } from './modifiers/duplicate';
import { clipCircleModifier } from './modifiers/clipCircle';
import { extendEndpointsModifier } from './modifiers/extendEndpoints';
import { subdivideModifier } from './modifiers/subdivide';
import { twistModifier } from './modifiers/twist';
import { dashModifier } from './modifiers/dash';
import { attractorModifier } from './modifiers/attractor';
import { randomizeModifier } from './modifiers/randomize';

class ModuleRegistry {
  private modules: Map<string, ModuleDefinition> = new Map();

  register(module: ModuleDefinition): void {
    this.modules.set(module.id, module);
  }

  get(id: string): ModuleDefinition | undefined {
    return this.modules.get(id);
  }

  getAll(): ModuleDefinition[] {
    return Array.from(this.modules.values());
  }

  getGenerators(): ModuleDefinition[] {
    return this.getAll().filter(m => m.type === 'generator');
  }

  getModifiers(): ModuleDefinition[] {
    return this.getAll().filter(m => m.type === 'modifier');
  }
}

export const moduleRegistry = new ModuleRegistry();

// Register all generators
moduleRegistry.register(shapeGenerator);
moduleRegistry.register(gridGenerator);
moduleRegistry.register(flowFieldGenerator);
moduleRegistry.register(concentricCirclesGenerator);
moduleRegistry.register(radialLinesGenerator);
moduleRegistry.register(spiralGenerator);
moduleRegistry.register(lissajousGenerator);
moduleRegistry.register(verticalLinesGenerator);
moduleRegistry.register(horizontalLinesGenerator);
moduleRegistry.register(circlePackGenerator);
moduleRegistry.register(voronoiGenerator);
moduleRegistry.register(contoursGenerator);
moduleRegistry.register(scatterPointsGenerator);
moduleRegistry.register(arcGenerator);
moduleRegistry.register(particleSprayGenerator);
moduleRegistry.register(truchetTilesGenerator);
moduleRegistry.register(crossGridGenerator);
moduleRegistry.register(importSvgGenerator);
moduleRegistry.register(dashColumnsGenerator);

// Register all modifiers
moduleRegistry.register(noiseDisplaceModifier);
moduleRegistry.register(rotateModifier);
moduleRegistry.register(clipRectModifier);
moduleRegistry.register(jitterModifier);
moduleRegistry.register(smoothModifier);
moduleRegistry.register(scaleModifier);
moduleRegistry.register(waveDisplaceModifier);
moduleRegistry.register(duplicateModifier);
moduleRegistry.register(clipCircleModifier);
moduleRegistry.register(extendEndpointsModifier);
moduleRegistry.register(subdivideModifier);
moduleRegistry.register(twistModifier);
moduleRegistry.register(dashModifier);
moduleRegistry.register(attractorModifier);
moduleRegistry.register(randomizeModifier);
