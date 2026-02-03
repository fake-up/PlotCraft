import { useState } from 'react';
import { usePlotCraftStore } from '../store';
import { CANVAS_PRESETS } from '../types';

export function CanvasSettingsPanel() {
  const {
    canvas,
    setCanvas,
    previewStrokeWidth,
    setPreviewStrokeWidth,
    performanceMode,
    setPerformanceMode,
  } = usePlotCraftStore();
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handlePreset = (presetName: string) => {
    const preset = CANVAS_PRESETS[presetName];
    if (preset) {
      setCanvas(preset);
    }
  };

  const isCurrentPreset = (presetName: string) => {
    const preset = CANVAS_PRESETS[presetName];
    return preset && preset.width === canvas.width && preset.height === canvas.height;
  };

  const currentPresetName = Object.keys(CANVAS_PRESETS).find(isCurrentPreset) || 'Custom';

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-lg">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isCollapsed ? '' : 'rotate-90'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className="text-[11px] uppercase text-[#888] font-medium">
            Canvas Settings
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {currentPresetName} ({canvas.width} × {canvas.height} mm)
        </span>
      </button>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4 pt-1 space-y-4">
          {/* Canvas Size Presets */}
          <div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.keys(CANVAS_PRESETS).map((name) => (
                <button
                  key={name}
                  onClick={() => handlePreset(name)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                    isCurrentPreset(name)
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-700 border-[#E5E5E5] hover:border-gray-400'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase text-[#888] font-medium mb-1">
                  Width (mm)
                </label>
                <input
                  type="number"
                  value={canvas.width}
                  onChange={(e) =>
                    setCanvas({ ...canvas, width: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E5E5E5] rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase text-[#888] font-medium mb-1">
                  Height (mm)
                </label>
                <input
                  type="number"
                  value={canvas.height}
                  onChange={(e) =>
                    setCanvas({ ...canvas, height: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E5E5E5] rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Preview Settings */}
          <div className="pt-3 border-t border-gray-100">
            <div className="mb-3">
              <div className="flex items-center justify-between text-[11px] uppercase text-[#888] font-medium mb-1">
                <span>Preview Stroke</span>
                <span className="font-mono">{previewStrokeWidth.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={2}
                step={0.1}
                value={previewStrokeWidth}
                onChange={(e) => setPreviewStrokeWidth(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={performanceMode}
                onChange={(e) => setPerformanceMode(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm">Performance Mode</span>
              <span className="text-[10px] text-gray-400">(simplified preview)</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
