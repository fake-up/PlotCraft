import { useState } from 'react';
import { usePlotCraftStore } from '../store';
import { moduleRegistry } from '../modules/registry';
import { ModuleCard } from './ModuleCard';

export function ModuleStack() {
  const { modules, addModule, moveModule } = usePlotCraftStore();
  const generators = moduleRegistry.getGenerators();
  const modifiers = moduleRegistry.getModifiers();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dropTargetIndex !== null && draggedIndex !== dropTargetIndex) {
      moveModule(draggedIndex, dropTargetIndex);
    }
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    // Calculate if we should insert before or after based on mouse position
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertIndex = e.clientY < midY ? index : index + 1;

    // Adjust for the dragged item's removal
    const adjustedIndex = insertIndex > draggedIndex ? insertIndex - 1 : insertIndex;
    setDropTargetIndex(adjustedIndex);
  };

  const handleDragLeave = () => {
    // Only clear if we're leaving the entire stack
  };

  const handleStackDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // If dragging over empty space at the end, set target to last position
    if (draggedIndex !== null && modules.length > 0) {
      const cards = e.currentTarget.querySelectorAll('[data-module-card]');
      if (cards.length > 0) {
        const lastCard = cards[cards.length - 1];
        const lastCardRect = lastCard.getBoundingClientRect();
        if (e.clientY > lastCardRect.bottom) {
          setDropTargetIndex(modules.length - 1);
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[11px] uppercase text-[#888] font-medium mb-2">
          Add Generator
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {generators.map((gen) => (
            <button
              key={gen.id}
              onClick={() => addModule(gen.id)}
              className="px-3 py-1.5 text-sm bg-white border border-[#E5E5E5] rounded-md hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              + {gen.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-[11px] uppercase text-[#888] font-medium mb-2">
          Add Modifier
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {modifiers.map((mod) => (
            <button
              key={mod.id}
              onClick={() => addModule(mod.id)}
              className="px-3 py-1.5 text-sm bg-white border border-[#E5E5E5] rounded-md hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              + {mod.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-[11px] uppercase text-[#888] font-medium mb-2">
          Module Stack
        </h3>
        {modules.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            Add a generator to get started
          </p>
        ) : (
          <div
            className="space-y-2"
            onDragOver={handleStackDragOver}
            onDragLeave={handleDragLeave}
          >
            {modules.map((instance, index) => (
              <div key={instance.instanceId} className="relative">
                {/* Drop indicator above */}
                {draggedIndex !== null && dropTargetIndex === index && draggedIndex !== index && draggedIndex !== index - 1 && (
                  <div className="absolute -top-1.5 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10" />
                )}
                <ModuleCard
                  instance={instance}
                  index={index}
                  total={modules.length}
                  isDragging={draggedIndex === index}
                  onDragStart={() => handleDragStart(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index)}
                />
                {/* Drop indicator below (only for last item) */}
                {index === modules.length - 1 && draggedIndex !== null && dropTargetIndex === modules.length - 1 && draggedIndex !== modules.length - 1 && (
                  <div className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
