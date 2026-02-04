export interface Point {
  x: number;
  y: number;
}

export interface Path {
  points: Point[];
  closed: boolean;
}

export interface Layer {
  id: string;
  paths: Path[];
}

// Output layer with metadata from Output nodes
export interface OutputLayer {
  id: string;
  name: string;
  color: string;
  penNumber: number;
  enabled: boolean;
  paths: Path[];
}

// Plot layer for multi-pen plotting (user-managed layers)
export interface PlotLayer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

export const DEFAULT_LAYER_COLORS = [
  '#000000', // Black
  '#E53935', // Red
  '#1E88E5', // Blue
  '#43A047', // Green
  '#FB8C00', // Orange
  '#8E24AA', // Purple
  '#00ACC1', // Cyan
  '#F4511E', // Deep Orange
];

export interface CanvasSettings {
  width: number;
  height: number;
  units: 'mm';
}

export interface ParameterDef {
  type: 'number' | 'select' | 'boolean' | 'file';
  label: string;
  default: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  showWhen?: { param: string; value: unknown };
  dynamicOptions?: string; // For dynamic option lists like 'plotLayers'
  accept?: string; // File type filter for 'file' type (e.g., '.svg')
}

// Alias for compatibility
export type ParameterConfig = ParameterDef;

export interface ModuleInputDef {
  name: string;
  type: 'paths';
  optional?: boolean;
}

export interface ModuleDefinition {
  id: string;
  name: string;
  type: 'generator' | 'modifier';
  parameters: Record<string, ParameterDef>;
  additionalInputs?: ModuleInputDef[]; // Additional inputs beyond standard 'paths' for modifiers
  execute: (params: Record<string, unknown>, input: Layer[], ctx: ModuleContext) => Layer[];
}

export interface ModuleInstance {
  instanceId: string;
  moduleId: string;
  params: Record<string, unknown>;
  enabled: boolean;
  collapsed: boolean;
}

export interface ModuleContext {
  canvas: CanvasSettings;
  rng: () => number;
  seed: number;
  plotLayers?: PlotLayer[]; // Available plot layers for assignment
  inputs?: Record<string, Layer[]>; // Additional named inputs for modifiers
}

// Preset for saving/loading module configurations
export interface Preset {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  moduleStack: Array<{
    moduleId: string;
    params: Record<string, unknown>;
    enabled: boolean;
  }>;
  canvasSize: { width: number; height: number };
  plotLayers: Array<{
    id: string;
    name: string;
    color: string;
    visible: boolean;
  }>;
}

export const CANVAS_PRESETS: Record<string, CanvasSettings> = {
  'A4': { width: 210, height: 297, units: 'mm' },
  'A3': { width: 297, height: 420, units: 'mm' },
  'Letter': { width: 216, height: 279, units: 'mm' },
  '24x36': { width: 610, height: 914, units: 'mm' },
  '12x12': { width: 305, height: 305, units: 'mm' },
  '8x10': { width: 203, height: 254, units: 'mm' },
};
