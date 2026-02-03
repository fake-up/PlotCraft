import type { Layer } from '../../types';

export interface OptimizationSettings {
  simplifyEnabled: boolean;
  simplifyTolerance: number;  // mm, default 0.1
  joinEnabled: boolean;
  joinTolerance: number;      // mm, default 0.5
  orderEnabled: boolean;
  flattenTolerance: number;   // mm, default 0.2
}

export interface PlotStats {
  pathCountBefore: number;
  pathCountAfter: number;
  pointCountBefore: number;
  pointCountAfter: number;
  drawDistance: number;       // mm
  travelDistance: number;     // mm
  estimatedTime: number;      // seconds
}

export interface OptimizationResult {
  layers: Layer[];
  stats: PlotStats;
}

export const DEFAULT_OPTIMIZATION_SETTINGS: OptimizationSettings = {
  simplifyEnabled: true,
  simplifyTolerance: 0.1,
  joinEnabled: true,
  joinTolerance: 0.5,
  orderEnabled: true,
  flattenTolerance: 0.2,
};
