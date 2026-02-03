import { useEffect } from 'react';
import { usePlotCraftStore } from '../store';
import { moduleRegistry } from '../modules/registry';
import type { ModuleInstance, ParameterDef } from '../types';
import { hasFalloffEnabled } from '../engine/falloff';

interface ModuleCardProps {
  instance: ModuleInstance;
  index: number;
  total: number;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
}

export function ModuleCard({
  instance,
  index,
  total,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOver,
}: ModuleCardProps) {
  const {
    removeModule,
    moveModule,
    updateModuleParams,
    toggleModuleEnabled,
    toggleModuleCollapsed,
    plotLayers,
    focusedModuleId,
    setFocusedModuleId,
  } = usePlotCraftStore();

  const definition = moduleRegistry.get(instance.moduleId);
  if (!definition) return null;

  const isGenerator = definition.type === 'generator';
  const hasFalloff = hasFalloffEnabled(instance.params);
  const isFocused = focusedModuleId === instance.instanceId;

  // Set focused module when expanded and has falloff enabled
  useEffect(() => {
    if (!instance.collapsed && hasFalloff) {
      setFocusedModuleId(instance.instanceId);
    } else if (isFocused && (instance.collapsed || !hasFalloff)) {
      setFocusedModuleId(null);
    }
  }, [instance.collapsed, hasFalloff, instance.instanceId, isFocused, setFocusedModuleId]);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', instance.instanceId);
    onDragStart?.();
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver?.(e);
  };

  return (
    <div
      data-module-card
      onDragOver={handleDragOver}
      className={`bg-white border rounded-lg overflow-hidden transition-opacity ${
        isDragging ? 'opacity-50' : ''
      } ${isFocused && hasFalloff ? 'border-blue-400 ring-1 ring-blue-200' : 'border-[#E5E5E5]'}`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#E5E5E5] bg-gray-50">
        <div className="flex items-center gap-2">
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 select-none px-0.5"
            title="Drag to reorder"
          >
            ⋮⋮
          </div>
          <button
            onClick={() => toggleModuleCollapsed(instance.instanceId)}
            className="text-gray-500 hover:text-gray-700 w-5 h-5 flex items-center justify-center"
          >
            {instance.collapsed ? '▶' : '▼'}
          </button>
          <span
            className={`text-[10px] uppercase font-medium px-1.5 py-0.5 rounded ${
              isGenerator
                ? 'bg-blue-100 text-blue-700'
                : 'bg-purple-100 text-purple-700'
            }`}
          >
            {isGenerator ? 'GEN' : 'MOD'}
          </span>
          <span className="font-semibold text-sm">{definition.name}</span>
          {hasFalloff && (
            <span className="w-2 h-2 rounded-full bg-blue-400" title="Falloff active" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => moveModule(index, Math.max(0, index - 1))}
            disabled={index === 0}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-30 px-1"
            title="Move up"
          >
            ↑
          </button>
          <button
            onClick={() => moveModule(index, Math.min(total - 1, index + 1))}
            disabled={index === total - 1}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-30 px-1"
            title="Move down"
          >
            ↓
          </button>
          <button
            onClick={() => toggleModuleEnabled(instance.instanceId)}
            className={`px-2 py-0.5 text-xs rounded ${
              instance.enabled
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {instance.enabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => removeModule(instance.instanceId)}
            className="text-red-400 hover:text-red-600 px-1"
            title="Remove"
          >
            ×
          </button>
        </div>
      </div>

      {!instance.collapsed && (
        <div className="p-3 space-y-3">
          {Object.entries(definition.parameters).map(([key, param]) => {
            // Check showWhen condition
            if (param.showWhen) {
              const dependentValue = instance.params[param.showWhen.param];
              if (dependentValue !== param.showWhen.value) {
                return null;
              }
            }
            return (
              <ParameterInput
                key={key}
                param={param}
                value={instance.params[key]}
                onChange={(value) =>
                  updateModuleParams(instance.instanceId, { [key]: value })
                }
                plotLayers={plotLayers}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ParameterInputProps {
  param: ParameterDef;
  value: unknown;
  onChange: (value: unknown) => void;
  plotLayers: { id: string; name: string; color: string }[];
}

function ParameterInput({ param, value, onChange, plotLayers }: ParameterInputProps) {
  if (param.type === 'number') {
    return (
      <div>
        <label className="block text-[11px] uppercase text-[#888] font-medium mb-1">
          {param.label}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={param.min}
            max={param.max}
            step={param.step}
            value={value as number}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer"
          />
          <input
            type="number"
            min={param.min}
            max={param.max}
            step={param.step}
            value={value as number}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-16 px-2 py-1 text-sm border border-[#E5E5E5] rounded text-right"
          />
        </div>
      </div>
    );
  }

  if (param.type === 'select') {
    // Handle dynamic options for layer selection
    const options = param.dynamicOptions === 'plotLayers'
      ? plotLayers.map(layer => ({ value: layer.id, label: layer.name }))
      : param.options ?? [];

    return (
      <div>
        <label className="block text-[11px] uppercase text-[#888] font-medium mb-1">
          {param.label}
        </label>
        <div className="flex items-center gap-2">
          {param.dynamicOptions === 'plotLayers' && (
            <div
              className="w-4 h-4 rounded border border-gray-300"
              style={{
                backgroundColor: plotLayers.find(l => l.id === value)?.color ?? '#000',
              }}
            />
          )}
          <select
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-2 py-1.5 text-sm border border-[#E5E5E5] rounded bg-white"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  if (param.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={value as boolean}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300"
        />
        <span className="text-sm">{param.label}</span>
      </label>
    );
  }

  return null;
}
