import type { ModuleInstance, Layer, ModuleContext, CanvasSettings, PlotLayer } from '../types';
import { moduleRegistry } from '../modules/registry';
import { createRNG } from './rng';

export function runPipeline(
  modules: ModuleInstance[],
  canvas: CanvasSettings,
  seed: number,
  plotLayers: PlotLayer[] = []
): Layer[] {
  let layers: Layer[] = [];

  // Process from visual bottom to top, so modifiers at top affect generators below
  // modules[0] = visual top, modules[n-1] = visual bottom
  // We want: bottom first → top last
  for (const instance of [...modules].reverse()) {
    if (!instance.enabled) continue;

    const moduleDef = moduleRegistry.get(instance.moduleId);
    if (!moduleDef) continue;

    // Create a fresh RNG for each module based on seed + module position
    const moduleRng = createRNG(seed + hashString(instance.instanceId));

    const ctx: ModuleContext = {
      canvas,
      rng: moduleRng,
      seed,
      plotLayers,
    };

    try {
      const result = moduleDef.execute(instance.params, layers, ctx);

      if (moduleDef.type === 'generator') {
        // Generators accumulate: add their output to existing layers
        layers = [...layers, ...result];
      } else {
        // Modifiers transform: replace layers with the modified result
        layers = result;
      }
    } catch (e) {
      console.error(`Error in module ${moduleDef.name}:`, e);
    }
  }

  return layers;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
