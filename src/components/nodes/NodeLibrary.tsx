import { useState } from 'react';
import { useNodeStore } from '../../store/nodeStore';
import { nodeDefinitions, categoryColors } from '../../engine/nodeDefinitions';
import { getNodeIcon } from './nodeIcons';

interface CategorySectionProps {
  title: string;
  nodes: ReturnType<typeof nodeDefinitions.getGenerators>;
  isOpen: boolean;
  onToggle: () => void;
  color: string;
}

function CategorySection({
  title,
  nodes,
  isOpen,
  onToggle,
  color,
}: CategorySectionProps) {
  const addNode = useNodeStore((s) => s.addNode);
  const panOffset = useNodeStore((s) => s.panOffset);
  const zoom = useNodeStore((s) => s.zoom);

  const handleAddNode = (type: string) => {
    // Add node near center of visible canvas
    const x = (400 - panOffset.x) / zoom;
    const y = (300 - panOffset.y) / zoom;
    addNode(type, x, y);
  };

  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('node-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-100 rounded-md transition-colors"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-[11px] uppercase font-medium text-gray-500 tracking-wide">
            {title}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-1 space-y-1 px-1">
          {nodes.map((node) => {
            const NodeIcon = getNodeIcon(node.type);
            return (
              <div
                key={node.type}
                draggable
                onDragStart={(e) => handleDragStart(e, node.type)}
                onClick={() => handleAddNode(node.type)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all text-sm"
              >
                {NodeIcon ? (
                  <NodeIcon className="flex-shrink-0" style={{ color }} />
                ) : (
                  <div
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                )}
                <span className="text-gray-800">{node.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function NodeLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    generator: true,
    modifier: true,
    value: true,
    output: true,
  });

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const generators = nodeDefinitions.getGenerators();
  const modifiers = nodeDefinitions.getModifiers();
  const valueNodes = nodeDefinitions.getValueNodes();
  const outputNodes = nodeDefinitions.getOutputNodes();

  // Filter nodes based on search
  const filterNodes = (nodes: typeof generators) => {
    if (!searchQuery) return nodes;
    const query = searchQuery.toLowerCase();
    return nodes.filter(
      (n) =>
        n.name.toLowerCase().includes(query) ||
        n.type.toLowerCase().includes(query)
    );
  };

  const filteredGenerators = filterNodes(generators);
  const filteredModifiers = filterNodes(modifiers);
  const filteredValues = filterNodes(valueNodes);
  const filteredOutputs = filterNodes(outputNodes);

  return (
    <div className="w-[220px] h-full bg-[#FAFAFA] border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">PlotCraft</h1>
        <p className="text-xs text-gray-500 mt-0.5">Node-based generative art</p>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Node Categories */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredGenerators.length > 0 && (
          <CategorySection
            title="Generators"
            nodes={filteredGenerators}
            isOpen={openCategories.generator}
            onToggle={() => toggleCategory('generator')}
            color={categoryColors.generator}
          />
        )}

        {filteredModifiers.length > 0 && (
          <CategorySection
            title="Modifiers"
            nodes={filteredModifiers}
            isOpen={openCategories.modifier}
            onToggle={() => toggleCategory('modifier')}
            color={categoryColors.modifier}
          />
        )}

        {filteredValues.length > 0 && (
          <CategorySection
            title="Values"
            nodes={filteredValues}
            isOpen={openCategories.value}
            onToggle={() => toggleCategory('value')}
            color={categoryColors.value}
          />
        )}

        {filteredOutputs.length > 0 && (
          <CategorySection
            title="Output"
            nodes={filteredOutputs}
            isOpen={openCategories.output}
            onToggle={() => toggleCategory('output')}
            color={categoryColors.output}
          />
        )}
      </div>

      {/* Footer hint */}
      <div className="p-3 border-t border-gray-200 text-xs text-gray-400">
        Click or drag to add nodes
      </div>
    </div>
  );
}
