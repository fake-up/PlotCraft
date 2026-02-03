import { useState } from 'react';
import { usePlotCraftStore } from '../store';
import { SavePresetModal } from './SavePresetModal';

export function PresetPanel() {
  const { presets, loadPreset, deletePreset } = usePlotCraftStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <div className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-[11px] uppercase text-[#888] font-medium">
            Presets
          </span>
          <span className="text-gray-400 text-sm">{isExpanded ? '−' : '+'}</span>
        </button>

        {isExpanded && (
          <div className="p-3 space-y-2">
            {/* Save Current Button */}
            <button
              onClick={() => setShowSaveModal(true)}
              className="w-full px-3 py-1.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Save Current
            </button>

            {/* Preset List */}
            {presets.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">
                No saved presets
              </p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="group flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => loadPreset(preset.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {formatDate(preset.createdAt)} · {preset.moduleStack.length} modules
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePreset(preset.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 px-1.5 text-gray-400 hover:text-red-500 transition-opacity"
                      title="Delete preset"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showSaveModal && (
        <SavePresetModal onClose={() => setShowSaveModal(false)} />
      )}
    </>
  );
}
