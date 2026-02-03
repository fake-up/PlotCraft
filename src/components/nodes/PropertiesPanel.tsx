import { useMemo, useEffect, useCallback, useState, useRef } from 'react';
import { useNodeStore, type ParameterDefinition, type ProjectFile } from '../../store/nodeStore';
import { nodeDefinitions, categoryColors, getDefaultParams, isParamPromotable, dataTypeColors } from '../../engine/nodeDefinitions';
import { executeGraph } from '../../engine/nodeExecutor';
import { buildSVG, buildSVGPerLayer } from '../../svg/builder';
import { optimizeOutputLayers } from '../../svg/plotprep';

const MIN_PANEL_WIDTH = 250;
const MAX_PANEL_WIDTH = 600;
const DEFAULT_PANEL_WIDTH = 350;
const STORAGE_KEY = 'plotcraft-panel-width';

// Paper size presets (width x height in mm, portrait orientation)
const PAPER_PRESETS = [
  { name: 'A4', width: 210, height: 297 },
  { name: 'A3', width: 297, height: 420 },
  { name: 'A2', width: 420, height: 594 },
  { name: 'A1', width: 594, height: 841 },
  { name: 'Letter', width: 216, height: 279 },
  { name: 'Tabloid', width: 279, height: 432 },
  { name: '6" × 8"', width: 152, height: 203 },
  { name: '8" × 10"', width: 203, height: 254 },
  { name: '9" × 12"', width: 229, height: 305 },
  { name: '11" × 14"', width: 279, height: 356 },
  { name: '12" × 12"', width: 305, height: 305 },
  { name: '18" × 24"', width: 457, height: 610 },
  { name: '24" × 36"', width: 610, height: 914 },
] as const;

// Find matching preset for current canvas size
function findMatchingPreset(width: number, height: number): string {
  for (const preset of PAPER_PRESETS) {
    if (
      (preset.width === width && preset.height === height) ||
      (preset.width === height && preset.height === width)
    ) {
      return preset.name;
    }
  }
  return 'Custom';
}

function getStoredPanelWidth(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const width = parseInt(stored, 10);
      if (width >= MIN_PANEL_WIDTH && width <= MAX_PANEL_WIDTH) {
        return width;
      }
    }
  } catch {
    // localStorage not available
  }
  return DEFAULT_PANEL_WIDTH;
}

function storePanelWidth(width: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(width));
  } catch {
    // localStorage not available
  }
}

// Collapsible section state management
const SECTIONS_STORAGE_KEY = 'plotcraft-collapsed-sections';

interface CollapsedSections {
  project: boolean;
  canvas: boolean;
  export: boolean;
}

const DEFAULT_COLLAPSED: CollapsedSections = {
  project: false,
  canvas: true,
  export: true,
};

function getStoredCollapsedSections(): CollapsedSections {
  try {
    const stored = localStorage.getItem(SECTIONS_STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_COLLAPSED, ...JSON.parse(stored) };
    }
  } catch {
    // localStorage not available or invalid JSON
  }
  return DEFAULT_COLLAPSED;
}

function storeCollapsedSections(sections: CollapsedSections): void {
  try {
    localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(sections));
  } catch {
    // localStorage not available
  }
}

// Collapsible Section Header Component
function SectionHeader({
  title,
  isCollapsed,
  onToggle,
  children,
}: {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 transition-colors -mx-3 px-3"
    >
      <div className="flex items-center gap-1.5">
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
            isCollapsed ? '' : 'rotate-90'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-[11px] uppercase font-medium text-gray-500 tracking-wide">
          {title}
        </span>
      </div>
      {children}
    </button>
  );
}

export function PropertiesPanel() {
  const nodes = useNodeStore((s) => s.nodes);
  const connections = useNodeStore((s) => s.connections);
  const selectedNodeIds = useNodeStore((s) => s.selectedNodeIds);
  const updateNodeParams = useNodeStore((s) => s.updateNodeParams);
  const removeNodes = useNodeStore((s) => s.removeNodes);
  const canvas = useNodeStore((s) => s.canvas);
  const setCanvas = useNodeStore((s) => s.setCanvas);
  const seed = useNodeStore((s) => s.seed);
  const setSeed = useNodeStore((s) => s.setSeed);
  const randomizeSeed = useNodeStore((s) => s.randomizeSeed);
  const outputLayers = useNodeStore((s) => s.outputLayers);
  const setOutputLayers = useNodeStore((s) => s.setOutputLayers);
  const executionVersion = useNodeStore((s) => s.executionVersion);
  const showToast = useNodeStore((s) => s.showToast);
  const promoteParam = useNodeStore((s) => s.promoteParam);
  const demoteParam = useNodeStore((s) => s.demoteParam);
  const getConnectionToPort = useNodeStore((s) => s.getConnectionToPort);
  const saveProject = useNodeStore((s) => s.saveProject);
  const loadProject = useNodeStore((s) => s.loadProject);
  const newProject = useNodeStore((s) => s.newProject);
  const groups = useNodeStore((s) => s.groups);
  const selectedGroupId = useNodeStore((s) => s.selectedGroupId);
  const updateGroup = useNodeStore((s) => s.updateGroup);
  const ungroupNodes = useNodeStore((s) => s.ungroupNodes);
  const deleteGroup = useNodeStore((s) => s.deleteGroup);
  const createGroup = useNodeStore((s) => s.createGroup);

  // Panel resize state
  const [panelWidth, setPanelWidth] = useState(getStoredPanelWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [isHoveringResize, setIsHoveringResize] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState<CollapsedSections>(getStoredCollapsedSections);

  const toggleSection = useCallback((section: keyof CollapsedSections) => {
    setCollapsedSections((prev) => {
      const updated = { ...prev, [section]: !prev[section] };
      storeCollapsedSections(updated);
      return updated;
    });
  }, []);

  const selectedNode = useMemo(() => {
    if (selectedNodeIds.length !== 1) return null;
    return nodes.find((n) => n.id === selectedNodeIds[0]);
  }, [nodes, selectedNodeIds]);

  const nodeDef = useMemo(() => {
    if (!selectedNode) return null;
    return nodeDefinitions.get(selectedNode.type);
  }, [selectedNode]);

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return groups.find((g) => g.id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  // Execute graph when needed
  useEffect(() => {
    const layers = executeGraph(
      nodes,
      connections,
      canvas,
      seed,
      executionVersion
    );
    setOutputLayers(layers);
  }, [nodes, connections, canvas, seed, executionVersion, setOutputLayers]);

  // Handle resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = { startX: e.clientX, startWidth: panelWidth };
  }, [panelWidth]);

  useEffect(() => {
    if (!isResizing) return;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = resizeRef.current.startX - e.clientX;
      const newWidth = Math.min(
        MAX_PANEL_WIDTH,
        Math.max(MIN_PANEL_WIDTH, resizeRef.current.startWidth + delta)
      );
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      storePanelWidth(panelWidth);
      resizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, panelWidth]);

  // Handle parameter change
  const handleParamChange = useCallback(
    (paramName: string, value: unknown) => {
      if (selectedNode) {
        updateNodeParams(selectedNode.id, { [paramName]: value });
      }
    },
    [selectedNode, updateNodeParams]
  );

  // Export functions
  const downloadSVG = useCallback((svg: string, filename: string) => {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleExportRaw = useCallback(() => {
    const svg = buildSVG(outputLayers, canvas, {
      strokeWidth: 0.3,
      forExport: true,
    });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    downloadSVG(svg, `plotcraft-${timestamp}.svg`);
    showToast('SVG exported');
  }, [outputLayers, canvas, downloadSVG, showToast]);

  const handleExportOptimized = useCallback(() => {
    const result = optimizeOutputLayers(outputLayers, {}, 50);
    const svg = buildSVG(result.outputLayers, canvas, {
      strokeWidth: 0.3,
      forExport: true,
    });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    downloadSVG(svg, `plotcraft-optimized-${timestamp}.svg`);
    showToast(`Optimized: ${result.stats.pathCountBefore} → ${result.stats.pathCountAfter} paths`);
  }, [outputLayers, canvas, downloadSVG, showToast]);

  // Export layers separately
  const handleExportSeparate = useCallback(() => {
    const layerFiles = buildSVGPerLayer(outputLayers, canvas, 0.3);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');

    for (const [layerName, { svg }] of layerFiles) {
      const safeName = layerName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      downloadSVG(svg, `plotcraft-${safeName}-${timestamp}.svg`);
    }
    showToast(`Exported ${layerFiles.size} layer(s)`);
  }, [outputLayers, canvas, downloadSVG, showToast]);

  // Project file handlers
  const handleSaveProject = useCallback(() => {
    const project = saveProject('Untitled');
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    a.download = `plotcraft-project-${timestamp}.plotcraft`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Project saved');
  }, [saveProject, showToast]);

  const handleLoadProject = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.plotcraft,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text) as ProjectFile;
        const result = loadProject(data);
        if (result.success) {
          showToast('Project loaded');
        } else {
          showToast(result.error || 'Failed to load project');
        }
      } catch {
        showToast('Invalid project file');
      }
    };
    input.click();
  }, [loadProject, showToast]);

  const handleNewProject = useCallback(() => {
    if (nodes.length > 2 || connections.length > 1) {
      // Only confirm if there's more than the default project
      if (!confirm('Create a new project? Unsaved changes will be lost.')) {
        return;
      }
    }
    newProject();
    showToast('New project created');
  }, [nodes.length, connections.length, newProject, showToast]);

  // Group handlers
  const handleCreateGroup = useCallback(() => {
    if (selectedNodeIds.length > 1) {
      createGroup(selectedNodeIds);
      showToast(`Grouped ${selectedNodeIds.length} nodes`);
    }
  }, [selectedNodeIds, createGroup, showToast]);

  const handleUngroupNodes = useCallback(() => {
    if (selectedGroup) {
      ungroupNodes(selectedGroup.id);
      showToast('Nodes ungrouped');
    }
  }, [selectedGroup, ungroupNodes, showToast]);

  const handleDeleteGroup = useCallback(() => {
    if (selectedGroup && confirm('Delete this group and all its nodes?')) {
      deleteGroup(selectedGroup.id);
      showToast('Group deleted');
    }
  }, [selectedGroup, deleteGroup, showToast]);

  // Check if a parameter should be visible
  const isParamVisible = useCallback(
    (param: ParameterDefinition) => {
      if (!param.showWhen || !selectedNode) return true;
      const storedValue = selectedNode.params[param.showWhen.param];
      const defaultValue = getDefaultParams(selectedNode.type)[param.showWhen.param];
      const currentValue = storedValue !== undefined ? storedValue : defaultValue;

      if (typeof param.showWhen.value === 'boolean') {
        return Boolean(currentValue) === param.showWhen.value;
      }

      return currentValue === param.showWhen.value;
    },
    [selectedNode]
  );

  // Small promote button component - appears to the LEFT of labels
  const PromoteButton = useCallback(
    ({ param, isPromoted }: { param: ParameterDefinition; isPromoted: boolean }) => {
      if (!selectedNode || !isParamPromotable(param)) return null;

      const color = param.dataType ? dataTypeColors[param.dataType] : '#888';

      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isPromoted) {
              demoteParam(selectedNode.id, param.name);
            } else {
              promoteParam(selectedNode.id, param.name);
            }
          }}
          className="w-2.5 h-2.5 flex-shrink-0 rounded-full transition-all hover:scale-125 opacity-40 hover:opacity-100"
          style={{
            border: `1.5px solid ${color}`,
            backgroundColor: isPromoted ? color : 'transparent',
          }}
          title={isPromoted ? 'Demote from input port' : 'Promote to input port'}
        />
      );
    },
    [selectedNode, promoteParam, demoteParam]
  );

  // Render parameter input
  const renderParam = useCallback(
    (param: ParameterDefinition) => {
      if (!selectedNode || !isParamVisible(param)) return null;

      const value = selectedNode.params[param.name] ?? param.default;
      const promotedParams = selectedNode.promotedParams || [];
      const isPromoted = promotedParams.includes(param.name);
      const paramPortId = `param:${param.name}`;
      const incomingConnection = isPromoted ? getConnectionToPort(selectedNode.id, paramPortId) : null;
      const isConnected = !!incomingConnection;

      switch (param.type) {
        case 'number':
          return (
            <div key={param.name} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5">
                  <PromoteButton param={param} isPromoted={isPromoted} />
                  <label className={isPromoted ? 'text-gray-400 italic' : 'text-gray-500'}>
                    {param.label}
                  </label>
                </div>
                <span className={`font-medium ${isPromoted ? 'text-gray-400' : 'text-gray-700'}`}>
                  {isPromoted
                    ? isConnected
                      ? '◀ linked'
                      : '—'
                    : Number(value).toFixed(param.step && param.step < 1 ? 2 : 0)}
                </span>
              </div>
              <input
                type="range"
                min={param.min ?? 0}
                max={param.max ?? 100}
                step={param.step ?? 1}
                value={Number(value)}
                onChange={(e) =>
                  handleParamChange(param.name, parseFloat(e.target.value))
                }
                disabled={isPromoted}
                className={`w-full h-1.5 rounded-lg appearance-none ${
                  isPromoted
                    ? 'bg-gray-100 cursor-not-allowed opacity-50'
                    : 'bg-gray-200 cursor-pointer accent-black'
                }`}
              />
            </div>
          );

        case 'select': {
          const options = param.options || [];

          return (
            <div key={param.name} className="space-y-1">
              <label className="text-xs text-gray-500">{param.label}</label>
              <select
                value={String(value)}
                onChange={(e) => handleParamChange(param.name, e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:border-gray-400"
              >
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        case 'boolean':
          return (
            <div key={param.name} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <PromoteButton param={param} isPromoted={isPromoted} />
                <label className={`text-xs ${isPromoted ? 'text-gray-400 italic' : 'text-gray-500'}`}>
                  {param.label}
                </label>
              </div>
              {isPromoted ? (
                <span className="text-xs text-gray-400 font-medium">
                  {isConnected ? '◀ linked' : '—'}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleParamChange(param.name, !value)}
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                    value ? 'bg-black' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform pointer-events-none ${
                      value ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              )}
            </div>
          );

        default:
          return null;
      }
    },
    [selectedNode, handleParamChange, isParamVisible, getConnectionToPort, PromoteButton]
  );

  return (
    <div
      className="h-full bg-white border-l border-gray-200 flex flex-col relative"
      style={{ width: panelWidth }}
    >
        {/* Resize handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 group"
          onMouseDown={handleResizeStart}
          onMouseEnter={() => setIsHoveringResize(true)}
          onMouseLeave={() => setIsHoveringResize(false)}
        >
          <div
            className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${
              isResizing ? 'bg-blue-500' : isHoveringResize ? 'bg-blue-400' : 'bg-transparent group-hover:bg-gray-300'
            }`}
          />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-12 flex flex-col items-center justify-center gap-1.5">
            <div className={`w-1 h-1 rounded-full transition-colors ${isResizing || isHoveringResize ? 'bg-blue-500' : 'bg-gray-300'}`} />
            <div className={`w-1 h-1 rounded-full transition-colors ${isResizing || isHoveringResize ? 'bg-blue-500' : 'bg-gray-300'}`} />
            <div className={`w-1 h-1 rounded-full transition-colors ${isResizing || isHoveringResize ? 'bg-blue-500' : 'bg-gray-300'}`} />
          </div>
        </div>

        {/* Project section */}
        <div className="p-3 border-b border-gray-200">
          <SectionHeader
            title="Project"
            isCollapsed={collapsedSections.project}
            onToggle={() => toggleSection('project')}
          />

          {!collapsedSections.project && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleNewProject}
                className="flex-1 px-2 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                title="New project"
              >
                New
              </button>
              <button
                onClick={handleLoadProject}
                className="flex-1 px-2 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                title="Load project"
              >
                Load
              </button>
              <button
                onClick={handleSaveProject}
                className="flex-1 px-2 py-1.5 text-xs font-medium bg-black text-white hover:bg-gray-800 rounded transition-colors"
                title="Save project"
              >
                Save
              </button>
            </div>
          )}
        </div>

        {/* Seed control */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <label className="text-[11px] uppercase font-medium text-gray-500 tracking-wide">
              Seed
            </label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
              className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-gray-400"
            />
            <button
              onClick={randomizeSeed}
              className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              title="Randomize seed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Node/Group properties or empty state */}
        <div className="flex-1 overflow-y-auto">
          {selectedGroup ? (
            // Group properties
            <div className="p-3">
              {/* Group header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedGroup.color }}
                  />
                  <h2 className="font-semibold text-gray-900">Group</h2>
                </div>
              </div>

              {/* Group name */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Name</label>
                  <input
                    type="text"
                    value={selectedGroup.name}
                    onChange={(e) => updateGroup(selectedGroup.id, { name: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:border-gray-400"
                  />
                </div>

                {/* Group color */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Color</label>
                  <div className="flex gap-2">
                    {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map((color) => (
                      <button
                        key={color}
                        onClick={() => updateGroup(selectedGroup.id, { color })}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          selectedGroup.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Nodes in group */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">
                    Nodes ({selectedGroup.nodeIds.length})
                  </label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {selectedGroup.nodeIds.map((nodeId) => {
                      const node = nodes.find((n) => n.id === nodeId);
                      const def = node ? nodeDefinitions.get(node.type) : null;
                      return (
                        <div
                          key={nodeId}
                          className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded text-xs"
                        >
                          {def && (
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: categoryColors[def.category] }}
                            />
                          )}
                          <span className="truncate text-gray-600">
                            {def?.name || 'Unknown'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Group actions */}
                <div className="pt-2 space-y-2">
                  <button
                    onClick={handleUngroupNodes}
                    className="w-full px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Ungroup
                  </button>
                  <button
                    onClick={handleDeleteGroup}
                    className="w-full px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                  >
                    Delete Group
                  </button>
                </div>
              </div>
            </div>
          ) : selectedNode && nodeDef ? (
            <div className="p-3">
              {/* Node header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: categoryColors[nodeDef.category] }}
                  />
                  <h2 className="font-semibold text-gray-900">{nodeDef.name}</h2>
                </div>
                <button
                  onClick={() => removeNodes([selectedNode.id])}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Delete node"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Parameters */}
              <div className="space-y-4">
                {nodeDef.parameters.map((param) => renderParam(param))}
              </div>

              {nodeDef.parameters.length === 0 && (
                <p className="text-sm text-gray-400">No parameters</p>
              )}
            </div>
          ) : selectedNodeIds.length > 1 ? (
            <div className="p-4 text-center">
              <p className="text-gray-500 text-sm">
                {selectedNodeIds.length} nodes selected
              </p>
              <div className="mt-3 space-y-2">
                <button
                  onClick={handleCreateGroup}
                  className="w-full px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Group Selected
                </button>
                <button
                  onClick={() => removeNodes(selectedNodeIds)}
                  className="w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Delete all
                </button>
              </div>
              <p className="mt-2 text-[10px] text-gray-400">
                or press Cmd+G
              </p>
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-gray-400 text-sm">Select a node to edit</p>
            </div>
          )}
        </div>

        {/* Canvas settings */}
        <div className="p-3 border-t border-gray-200">
          <SectionHeader
            title="Canvas"
            isCollapsed={collapsedSections.canvas}
            onToggle={() => toggleSection('canvas')}
          />

          {!collapsedSections.canvas && (
            <div className="mt-2">
              {/* Paper size preset */}
              <div className="mb-2">
                <label className="text-[10px] text-gray-400">Paper Size</label>
                <select
                  value={findMatchingPreset(canvas.width, canvas.height)}
                  onChange={(e) => {
                    const preset = PAPER_PRESETS.find(p => p.name === e.target.value);
                    if (preset) {
                      const isLandscape = canvas.width > canvas.height;
                      if (isLandscape) {
                        setCanvas({ ...canvas, width: Math.max(preset.width, preset.height), height: Math.min(preset.width, preset.height) });
                      } else {
                        setCanvas({ ...canvas, width: Math.min(preset.width, preset.height), height: Math.max(preset.width, preset.height) });
                      }
                    }
                  }}
                  className="w-full px-2 py-1.5 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:border-gray-400"
                >
                  {PAPER_PRESETS.map((preset) => (
                    <option key={preset.name} value={preset.name}>
                      {preset.name} ({preset.width} × {preset.height} mm)
                    </option>
                  ))}
                  <option value="Custom">Custom</option>
                </select>
              </div>

              {/* Width/Height with orientation toggle */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400">Width (mm)</label>
                  <input
                    type="number"
                    value={canvas.width}
                    onChange={(e) =>
                      setCanvas({ ...canvas, width: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400">Height (mm)</label>
                  <input
                    type="number"
                    value={canvas.height}
                    onChange={(e) =>
                      setCanvas({ ...canvas, height: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-gray-400"
                  />
                </div>
                <button
                  onClick={() => setCanvas({ ...canvas, width: canvas.height, height: canvas.width })}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  title={canvas.width > canvas.height ? 'Switch to Portrait' : 'Switch to Landscape'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {canvas.width > canvas.height ? (
                      <>
                        <rect x="7" y="3" width="10" height="14" rx="1" strokeWidth="1.5" />
                        <path d="M10 20h4" strokeWidth="1.5" strokeLinecap="round" />
                      </>
                    ) : (
                      <>
                        <rect x="3" y="7" width="14" height="10" rx="1" strokeWidth="1.5" />
                        <path d="M20 10v4" strokeWidth="1.5" strokeLinecap="round" />
                      </>
                    )}
                  </svg>
                </button>
              </div>

              <div className="mt-1.5 text-[10px] text-gray-400">
                {canvas.width > canvas.height ? 'Landscape' : canvas.width < canvas.height ? 'Portrait' : 'Square'}
              </div>
            </div>
          )}
        </div>

        {/* Output Layers summary */}
        {outputLayers.length > 0 && (
          <div className="p-3 border-t border-gray-200">
            <div className="text-[11px] uppercase font-medium text-gray-500 tracking-wide mb-2">
              Output Layers
            </div>
            <div className="space-y-1">
              {outputLayers.map((layer) => (
                <div
                  key={layer.id}
                  className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded text-xs"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: layer.color }}
                  />
                  <span className="flex-1 truncate text-gray-700">{layer.name}</span>
                  <span className="text-gray-400">{layer.paths.length} paths</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export buttons */}
        <div className="p-3 border-t border-gray-200">
          <SectionHeader
            title="Export"
            isCollapsed={collapsedSections.export}
            onToggle={() => toggleSection('export')}
          />

          {!collapsedSections.export && (
            <div className="space-y-2 mt-2">
              <button
                onClick={handleExportOptimized}
                disabled={outputLayers.length === 0}
                className="w-full px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Export Plot-Ready SVG
              </button>
              <button
                onClick={handleExportRaw}
                disabled={outputLayers.length === 0}
                className="w-full px-4 py-2 bg-white text-black text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors disabled:border-gray-200 disabled:text-gray-300 disabled:cursor-not-allowed"
              >
                Export Raw SVG
              </button>
              {outputLayers.length > 1 && (
                <button
                  onClick={handleExportSeparate}
                  className="w-full px-4 py-2 bg-white text-black text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Export Layers Separately
                </button>
              )}
            </div>
          )}
        </div>
    </div>
  );
}
