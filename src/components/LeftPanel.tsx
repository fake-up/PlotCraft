import { ModuleStack } from './ModuleStack';
import { SeedControl } from './SeedControl';
import { CanvasSettingsPanel } from './CanvasSettings';
import { PresetPanel } from './PresetPanel';

export function LeftPanel() {
  return (
    <div className="w-[380px] h-screen flex flex-col bg-[#F5F5F5] border-r border-[#E5E5E5]">
      {/* Header */}
      <div className="p-4 pb-0">
        <h1 className="text-2xl font-bold tracking-tight">PlotCraft</h1>
        <p className="text-sm text-gray-500">Generative art for pen plotters</p>
      </div>

      {/* Seed Control */}
      <div className="px-4 pt-4">
        <SeedControl />
      </div>

      {/* Module Stack - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        <ModuleStack />
      </div>

      {/* Presets and Canvas Settings - Fixed at bottom */}
      <div className="p-4 pt-2 border-t border-[#E5E5E5] space-y-3">
        <PresetPanel />
        <CanvasSettingsPanel />
      </div>
    </div>
  );
}
