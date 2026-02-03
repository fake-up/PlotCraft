import type { Layer, OutputLayer } from '../../types';
import type { OptimizationSettings, OptimizationResult } from './types';
import { DEFAULT_OPTIMIZATION_SETTINGS } from './types';
import { simplifyLayers } from './simplify';
import { joinLayers } from './join';
import { orderLayers } from './order';
import { calculateStats } from './stats';

export type { OptimizationSettings, PlotStats, OptimizationResult } from './types';
export { DEFAULT_OPTIMIZATION_SETTINGS } from './types';

/**
 * Run the full optimization pipeline on output layers
 * @param outputLayers - Input output layers to optimize
 * @param settings - Partial optimization settings (merged with defaults)
 * @param plotSpeed - Plotter speed in mm/s for time estimation
 * @returns Optimized output layers and statistics
 */
export function optimizeOutputLayers(
  outputLayers: OutputLayer[],
  settings: Partial<OptimizationSettings>,
  plotSpeed: number
): { outputLayers: OutputLayer[]; stats: OptimizationResult['stats'] } {
  const fullSettings: OptimizationSettings = {
    ...DEFAULT_OPTIMIZATION_SETTINGS,
    ...settings,
  };

  // Convert OutputLayer[] to Layer[] for internal processing
  const layers: Layer[] = outputLayers.map(ol => ({
    id: ol.id,
    paths: ol.paths,
  }));

  // Store original for stats comparison
  const originalLayers = layers;

  let result = layers;

  // Step 1: Simplify paths (reduce point count)
  if (fullSettings.simplifyEnabled) {
    result = simplifyLayers(result, fullSettings.simplifyTolerance);
  }

  // Step 2: Join nearby path endpoints
  if (fullSettings.joinEnabled) {
    result = joinLayers(result, fullSettings.joinTolerance);
  }

  // Step 3: Reorder paths to minimize travel distance
  if (fullSettings.orderEnabled) {
    result = orderLayers(result);
  }

  // Calculate statistics
  const stats = calculateStats(originalLayers, result, plotSpeed);

  // Convert back to OutputLayer[]
  const optimizedOutputLayers: OutputLayer[] = result.map((layer, index) => {
    const original = outputLayers[index];
    return {
      id: original?.id || layer.id,
      name: original?.name || 'Layer',
      color: original?.color || '#000000',
      penNumber: original?.penNumber || index + 1,
      enabled: original?.enabled ?? true,
      paths: layer.paths,
    };
  });

  return {
    outputLayers: optimizedOutputLayers,
    stats,
  };
}

// Legacy function for backward compatibility
export function optimizeLayers(
  layers: Layer[],
  settings: Partial<OptimizationSettings>,
  plotSpeed: number
): OptimizationResult {
  const fullSettings: OptimizationSettings = {
    ...DEFAULT_OPTIMIZATION_SETTINGS,
    ...settings,
  };

  const originalLayers = layers;
  let result = layers;

  if (fullSettings.simplifyEnabled) {
    result = simplifyLayers(result, fullSettings.simplifyTolerance);
  }

  if (fullSettings.joinEnabled) {
    result = joinLayers(result, fullSettings.joinTolerance);
  }

  if (fullSettings.orderEnabled) {
    result = orderLayers(result);
  }

  const stats = calculateStats(originalLayers, result, plotSpeed);

  return {
    layers: result,
    stats,
  };
}
