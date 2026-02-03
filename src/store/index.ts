import { create } from 'zustand';
import type { ModuleInstance, CanvasSettings, Layer, PlotLayer, Preset } from '../types';
import { DEFAULT_LAYER_COLORS } from '../types';
import { moduleRegistry } from '../modules/registry';
import { runPipeline } from '../engine/pipeline';
import { randomSeed } from '../engine/rng';
import type { OptimizationSettings, PlotStats } from '../svg/plotprep';
import { DEFAULT_OPTIMIZATION_SETTINGS } from '../svg/plotprep';

interface PlotCraftState {
  // Canvas
  canvas: CanvasSettings;
  setCanvas: (canvas: CanvasSettings) => void;

  // Seed
  seed: number;
  setSeed: (seed: number) => void;
  randomizeSeed: () => void;

  // Modules
  modules: ModuleInstance[];
  addModule: (moduleId: string) => void;
  removeModule: (instanceId: string) => void;
  moveModule: (fromIndex: number, toIndex: number) => void;
  updateModuleParams: (instanceId: string, params: Record<string, unknown>) => void;
  toggleModuleEnabled: (instanceId: string) => void;
  toggleModuleCollapsed: (instanceId: string) => void;

  // Output (pipeline layers, not plot layers)
  layers: Layer[];
  regenerate: () => void;

  // Plot Layers (user-managed layers for multi-pen plotting)
  plotLayers: PlotLayer[];
  addPlotLayer: () => void;
  removePlotLayer: (id: string) => void;
  updatePlotLayer: (id: string, updates: Partial<Omit<PlotLayer, 'id'>>) => void;
  togglePlotLayerVisibility: (id: string) => void;

  // Optimization
  optimizationSettings: OptimizationSettings;
  setOptimizationSettings: (settings: Partial<OptimizationSettings>) => void;
  resetOptimizationSettings: () => void;
  lastPlotStats: PlotStats | null;
  setLastPlotStats: (stats: PlotStats | null) => void;
  plotSpeed: number;
  setPlotSpeed: (speed: number) => void;

  // Presets
  presets: Preset[];
  savePreset: (name: string, description?: string) => void;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;

  // Toast notifications
  toast: { message: string; visible: boolean };
  showToast: (message: string) => void;
  hideToast: () => void;

  // Focused module for falloff control
  focusedModuleId: string | null;
  setFocusedModuleId: (id: string | null) => void;

  // Preview settings
  previewStrokeWidth: number;
  setPreviewStrokeWidth: (width: number) => void;
  performanceMode: boolean;
  setPerformanceMode: (enabled: boolean) => void;
  autoRegenerate: boolean;
  setAutoRegenerate: (enabled: boolean) => void;

  // Debounced regeneration
  pendingRegenerate: boolean;
  setPendingRegenerate: (pending: boolean) => void;
  scheduleRegenerate: () => void;
}

let instanceCounter = 0;
let layerCounter = 0;

function generateInstanceId(): string {
  return `inst-${++instanceCounter}-${Date.now()}`;
}

function generateLayerId(): string {
  return `layer-${++layerCounter}-${Date.now()}`;
}

function getDefaultParams(moduleId: string): Record<string, unknown> {
  const def = moduleRegistry.get(moduleId);
  if (!def) return {};

  const params: Record<string, unknown> = {};
  for (const [key, param] of Object.entries(def.parameters)) {
    params[key] = param.default;
  }
  return params;
}

const defaultPlotLayer: PlotLayer = {
  id: 'default-layer',
  name: 'Layer 1',
  color: DEFAULT_LAYER_COLORS[0],
  visible: true,
};

const PRESETS_STORAGE_KEY = 'plotcraft-presets';

function loadPresetsFromStorage(): Preset[] {
  try {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load presets from localStorage:', e);
  }
  return [];
}

function savePresetsToStorage(presets: Preset[]): void {
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.error('Failed to save presets to localStorage:', e);
  }
}

function generatePresetId(): string {
  return `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Debounce timer
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function getDebounceTime(pathCount: number): number {
  if (pathCount > 5000) return 500;
  if (pathCount > 1000) return 200;
  return 50;
}

export const usePlotCraftStore = create<PlotCraftState>((set, get) => ({
  canvas: { width: 210, height: 297, units: 'mm' },

  setCanvas: (canvas) => {
    set({ canvas });
    get().scheduleRegenerate();
  },

  seed: randomSeed(),

  setSeed: (seed) => {
    set({ seed });
    get().scheduleRegenerate();
  },

  randomizeSeed: () => {
    const seed = randomSeed();
    set({ seed });
    get().scheduleRegenerate();
  },

  modules: [],

  addModule: (moduleId) => {
    const instance: ModuleInstance = {
      instanceId: generateInstanceId(),
      moduleId,
      params: getDefaultParams(moduleId),
      enabled: true,
      collapsed: false,
    };
    set((state) => ({ modules: [instance, ...state.modules] }));
    get().scheduleRegenerate();
  },

  removeModule: (instanceId) => {
    set((state) => ({
      modules: state.modules.filter((m) => m.instanceId !== instanceId),
    }));
    get().scheduleRegenerate();
  },

  moveModule: (fromIndex, toIndex) => {
    set((state) => {
      const modules = [...state.modules];
      const [moved] = modules.splice(fromIndex, 1);
      modules.splice(toIndex, 0, moved);
      return { modules };
    });
    get().scheduleRegenerate();
  },

  updateModuleParams: (instanceId, params) => {
    set((state) => ({
      modules: state.modules.map((m) =>
        m.instanceId === instanceId
          ? { ...m, params: { ...m.params, ...params } }
          : m
      ),
    }));
    get().scheduleRegenerate();
  },

  toggleModuleEnabled: (instanceId) => {
    set((state) => ({
      modules: state.modules.map((m) =>
        m.instanceId === instanceId ? { ...m, enabled: !m.enabled } : m
      ),
    }));
    get().scheduleRegenerate();
  },

  toggleModuleCollapsed: (instanceId) => {
    set((state) => ({
      modules: state.modules.map((m) =>
        m.instanceId === instanceId ? { ...m, collapsed: !m.collapsed } : m
      ),
    }));
  },

  layers: [],

  regenerate: () => {
    const { modules, canvas, seed, plotLayers } = get();
    const layers = runPipeline(modules, canvas, seed, plotLayers);
    set({ layers, pendingRegenerate: false });
  },

  // Plot Layers
  plotLayers: [defaultPlotLayer],

  addPlotLayer: () => {
    set((state) => {
      const newIndex = state.plotLayers.length + 1;
      const colorIndex = state.plotLayers.length % DEFAULT_LAYER_COLORS.length;
      const newLayer: PlotLayer = {
        id: generateLayerId(),
        name: `Layer ${newIndex}`,
        color: DEFAULT_LAYER_COLORS[colorIndex],
        visible: true,
      };
      return { plotLayers: [...state.plotLayers, newLayer] };
    });
  },

  removePlotLayer: (id) => {
    set((state) => {
      // Don't allow removing the last layer
      if (state.plotLayers.length <= 1) return state;
      return {
        plotLayers: state.plotLayers.filter((l) => l.id !== id),
      };
    });
    get().scheduleRegenerate();
  },

  updatePlotLayer: (id, updates) => {
    set((state) => ({
      plotLayers: state.plotLayers.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      ),
    }));
  },

  togglePlotLayerVisibility: (id) => {
    set((state) => ({
      plotLayers: state.plotLayers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l
      ),
    }));
  },

  // Optimization
  optimizationSettings: { ...DEFAULT_OPTIMIZATION_SETTINGS },

  setOptimizationSettings: (settings) => {
    set((state) => ({
      optimizationSettings: { ...state.optimizationSettings, ...settings },
    }));
  },

  resetOptimizationSettings: () => {
    set({ optimizationSettings: { ...DEFAULT_OPTIMIZATION_SETTINGS } });
  },

  lastPlotStats: null,

  setLastPlotStats: (stats) => {
    set({ lastPlotStats: stats });
  },

  plotSpeed: 50, // mm/s default

  setPlotSpeed: (speed) => {
    set({ plotSpeed: speed });
  },

  // Presets
  presets: loadPresetsFromStorage(),

  savePreset: (name, description) => {
    const { modules, canvas, plotLayers, presets } = get();

    const preset: Preset = {
      id: generatePresetId(),
      name,
      description,
      createdAt: Date.now(),
      moduleStack: modules.map((m) => ({
        moduleId: m.moduleId,
        params: { ...m.params },
        enabled: m.enabled,
      })),
      canvasSize: { width: canvas.width, height: canvas.height },
      plotLayers: plotLayers.map((l) => ({
        id: l.id,
        name: l.name,
        color: l.color,
        visible: l.visible,
      })),
    };

    const newPresets = [...presets, preset];
    savePresetsToStorage(newPresets);
    set({ presets: newPresets });
    get().showToast('Preset saved');
  },

  loadPreset: (presetId) => {
    const { presets } = get();
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;

    // Restore modules with new instance IDs
    const modules: ModuleInstance[] = preset.moduleStack.map((m) => ({
      instanceId: generateInstanceId(),
      moduleId: m.moduleId,
      params: { ...m.params },
      enabled: m.enabled,
      collapsed: false,
    }));

    // Restore canvas
    const canvas: CanvasSettings = {
      width: preset.canvasSize.width,
      height: preset.canvasSize.height,
      units: 'mm',
    };

    // Restore plot layers
    const plotLayers: PlotLayer[] = preset.plotLayers.map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
      visible: l.visible,
    }));

    // Update state (keep current seed)
    set({ modules, canvas, plotLayers });
    get().regenerate();
    get().showToast('Preset loaded');
  },

  deletePreset: (presetId) => {
    const { presets } = get();
    const newPresets = presets.filter((p) => p.id !== presetId);
    savePresetsToStorage(newPresets);
    set({ presets: newPresets });
  },

  // Toast
  toast: { message: '', visible: false },

  showToast: (message) => {
    set({ toast: { message, visible: true } });
    setTimeout(() => {
      get().hideToast();
    }, 2000);
  },

  hideToast: () => {
    set({ toast: { message: '', visible: false } });
  },

  // Focused module for falloff control
  focusedModuleId: null,

  setFocusedModuleId: (id) => {
    set({ focusedModuleId: id });
  },

  // Preview settings
  previewStrokeWidth: 0.3,

  setPreviewStrokeWidth: (width) => {
    set({ previewStrokeWidth: width });
  },

  performanceMode: false,

  setPerformanceMode: (enabled) => {
    set({ performanceMode: enabled });
  },

  autoRegenerate: true,

  setAutoRegenerate: (enabled) => {
    set({ autoRegenerate: enabled });
    // If turning on auto-regenerate and there's pending work, regenerate
    if (enabled && get().pendingRegenerate) {
      get().regenerate();
    }
  },

  // Debounced regeneration
  pendingRegenerate: false,

  setPendingRegenerate: (pending) => {
    set({ pendingRegenerate: pending });
  },

  scheduleRegenerate: () => {
    const { autoRegenerate, layers } = get();

    if (!autoRegenerate) {
      set({ pendingRegenerate: true });
      return;
    }

    // Calculate path count for debounce timing
    const pathCount = layers.reduce((sum, l) => sum + l.paths.length, 0);
    const debounceTime = getDebounceTime(pathCount);

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      get().regenerate();
      debounceTimer = null;
    }, debounceTime);
  },
}));
