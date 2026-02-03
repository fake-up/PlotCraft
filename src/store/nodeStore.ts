import { create } from 'zustand';
import type { CanvasSettings, OutputLayer } from '../types';
import { randomSeed } from '../engine/rng';

// Data types for node connections
export type DataType = 'paths' | 'number' | 'vector' | 'boolean' | 'numberArray';

export interface Vector2 {
  x: number;
  y: number;
}

export interface Port {
  id: string;
  name: string;
  type: DataType;
  direction: 'input' | 'output';
}

export interface NodeDefinition {
  type: string;
  category: 'generator' | 'modifier' | 'select' | 'value' | 'data' | 'output';
  name: string;
  description?: string;
  inputs: Omit<Port, 'id' | 'direction'>[];
  outputs: Omit<Port, 'id' | 'direction'>[];
  parameters: ParameterDefinition[];
}

export interface ParameterDefinition {
  name: string;
  type: 'number' | 'select' | 'boolean' | 'vector' | 'button';
  label: string;
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  showWhen?: { param: string; value: unknown };
  dataType?: DataType; // For parameter inputs (can be driven by connections)
}

export interface GraphNode {
  id: string;
  type: string;
  x: number;
  y: number;
  params: Record<string, unknown>;
  collapsed: boolean;
  promotedParams?: string[]; // Parameter names that are promoted to input ports
}

export interface Connection {
  id: string;
  fromNode: string;
  fromPort: string;
  toNode: string;
  toPort: string;
  dataType: DataType;
}

// Node groups
export interface NodeGroup {
  id: string;
  name: string;
  color: string;
  nodeIds: string[];
}

// Project file format
export interface ProjectFile {
  version: string;
  name: string;
  savedAt: string;
  canvas: CanvasSettings;
  seed: number;
  nodes: GraphNode[];
  connections: Connection[];
  groups?: NodeGroup[];
}

export const PROJECT_FILE_VERSION = '1.0';

export interface NodeGraphState {
  // Canvas
  canvas: CanvasSettings;
  setCanvas: (canvas: CanvasSettings) => void;

  // Seed
  seed: number;
  setSeed: (seed: number) => void;
  randomizeSeed: () => void;

  // Graph
  nodes: GraphNode[];
  connections: Connection[];
  groups: NodeGroup[];

  // Groups
  selectedGroupId: string | null;
  selectGroup: (groupId: string | null) => void;
  createGroup: (nodeIds: string[], name?: string) => string;
  ungroupNodes: (groupId: string) => void;
  updateGroup: (groupId: string, updates: Partial<NodeGroup>) => void;
  deleteGroup: (groupId: string) => void;
  addNodesToGroup: (groupId: string, nodeIds: string[]) => void;
  removeNodesFromGroup: (groupId: string, nodeIds: string[]) => void;
  getGroupForNode: (nodeId: string) => NodeGroup | undefined;

  // Selection
  selectedNodeIds: string[];
  selectNode: (id: string, additive?: boolean) => void;
  selectNodes: (ids: string[]) => void;
  deselectAll: () => void;

  // Node operations
  addNode: (type: string, x: number, y: number) => string;
  removeNodes: (ids: string[]) => void;
  moveNodes: (ids: string[], dx: number, dy: number) => void;
  updateNodeParams: (id: string, params: Record<string, unknown>) => void;
  toggleNodeCollapsed: (id: string) => void;

  // Promoted parameters (parameters that become input ports)
  promoteParam: (nodeId: string, paramName: string) => void;
  demoteParam: (nodeId: string, paramName: string) => void;
  isParamPromoted: (nodeId: string, paramName: string) => boolean;
  getPromotedParams: (nodeId: string) => string[];

  // Connection operations
  addConnection: (fromNode: string, fromPort: string, toNode: string, toPort: string, dataType: DataType) => boolean;
  removeConnection: (id: string) => void;
  removeConnectionsForNode: (nodeId: string) => void;
  getConnectionToPort: (nodeId: string, portId: string) => Connection | undefined;

  // Project save/load
  saveProject: (name?: string) => ProjectFile;
  loadProject: (data: ProjectFile) => { success: boolean; error?: string };
  newProject: () => void;

  // Execution result
  outputLayers: OutputLayer[];
  setOutputLayers: (layers: OutputLayer[]) => void;

  // Execution trigger
  executionVersion: number;
  triggerExecution: () => void;

  // Pan/Zoom
  panOffset: Vector2;
  zoom: number;
  setPanOffset: (offset: Vector2) => void;
  setZoom: (zoom: number) => void;

  // UI State
  isDraggingConnection: boolean;
  draggingConnection: {
    fromNode: string;
    fromPort: string;
    dataType: DataType;
    mousePos: Vector2;
  } | null;
  setDraggingConnection: (conn: NodeGraphState['draggingConnection']) => void;

  // Toast
  toast: { message: string; visible: boolean };
  showToast: (message: string) => void;
  hideToast: () => void;

  // Preview
  previewStrokeWidth: number;
  setPreviewStrokeWidth: (width: number) => void;
}

let nodeIdCounter = 0;
let connectionIdCounter = 0;
let groupIdCounter = 0;
let groupNameCounter = 0;

function generateNodeId(): string {
  return `node-${++nodeIdCounter}-${Date.now()}`;
}

function generateConnectionId(): string {
  return `conn-${++connectionIdCounter}-${Date.now()}`;
}

function generateGroupId(): string {
  return `group-${++groupIdCounter}-${Date.now()}`;
}

function generateGroupName(): string {
  return `Group ${++groupNameCounter}`;
}

// Create initial demo nodes
function createInitialNodes(): { nodes: GraphNode[]; connections: Connection[] } {
  const gridNode: GraphNode = {
    id: 'node-initial-1',
    type: 'grid',
    x: 100,
    y: 150,
    params: {
      rows: 10,
      cols: 10,
      spacing: 20,
      lineWeight: 0.3,
      margin: 20,
    },
    collapsed: false,
  };

  const outputNode: GraphNode = {
    id: 'node-initial-2',
    type: 'output',
    x: 400,
    y: 180,
    params: {
      layerName: 'Layer 1',
      layerColor: '#000000',
      penNumber: 1,
      enabled: true,
    },
    collapsed: false,
  };

  const connection: Connection = {
    id: 'conn-initial-1',
    fromNode: 'node-initial-1',
    fromPort: 'paths',
    toNode: 'node-initial-2',
    toPort: 'paths',
    dataType: 'paths',
  };

  return {
    nodes: [gridNode, outputNode],
    connections: [connection],
  };
}

const initialState = createInitialNodes();

export const useNodeStore = create<NodeGraphState>((set, get) => ({
  // Canvas
  canvas: { width: 210, height: 297, units: 'mm' },
  setCanvas: (canvas) => {
    set({ canvas });
    get().triggerExecution();
  },

  // Seed
  seed: randomSeed(),
  setSeed: (seed) => {
    set({ seed });
    get().triggerExecution();
  },
  randomizeSeed: () => {
    set({ seed: randomSeed() });
    get().triggerExecution();
  },

  // Graph
  nodes: initialState.nodes,
  connections: initialState.connections,
  groups: [],

  // Groups
  selectedGroupId: null,
  selectGroup: (groupId) => set({ selectedGroupId: groupId, selectedNodeIds: [] }),

  createGroup: (nodeIds, name) => {
    if (nodeIds.length === 0) return '';
    const id = generateGroupId();
    const group: NodeGroup = {
      id,
      name: name || generateGroupName(),
      color: '#3B82F6',
      nodeIds: [...nodeIds],
    };
    // Remove nodes from any existing groups
    set((state) => ({
      groups: [
        ...state.groups.map((g) => ({
          ...g,
          nodeIds: g.nodeIds.filter((nid) => !nodeIds.includes(nid)),
        })).filter((g) => g.nodeIds.length > 0),
        group,
      ],
      selectedGroupId: id,
      selectedNodeIds: [],
    }));
    return id;
  },

  ungroupNodes: (groupId) => {
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== groupId),
      selectedGroupId: state.selectedGroupId === groupId ? null : state.selectedGroupId,
    }));
  },

  updateGroup: (groupId, updates) => {
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, ...updates } : g
      ),
    }));
  },

  deleteGroup: (groupId) => {
    const group = get().groups.find((g) => g.id === groupId);
    if (!group) return;
    // Remove the group and its nodes
    const nodeIdsToRemove = new Set(group.nodeIds);
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== groupId),
      nodes: state.nodes.filter((n) => !nodeIdsToRemove.has(n.id)),
      connections: state.connections.filter(
        (c) => !nodeIdsToRemove.has(c.fromNode) && !nodeIdsToRemove.has(c.toNode)
      ),
      selectedGroupId: state.selectedGroupId === groupId ? null : state.selectedGroupId,
      selectedNodeIds: state.selectedNodeIds.filter((id) => !nodeIdsToRemove.has(id)),
    }));
    get().triggerExecution();
  },

  addNodesToGroup: (groupId, nodeIds) => {
    set((state) => ({
      groups: state.groups.map((g) => {
        if (g.id === groupId) {
          const newIds = nodeIds.filter((nid) => !g.nodeIds.includes(nid));
          return { ...g, nodeIds: [...g.nodeIds, ...newIds] };
        }
        // Remove from other groups
        return { ...g, nodeIds: g.nodeIds.filter((nid) => !nodeIds.includes(nid)) };
      }),
    }));
  },

  removeNodesFromGroup: (groupId, nodeIds) => {
    const nodeIdSet = new Set(nodeIds);
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? { ...g, nodeIds: g.nodeIds.filter((nid) => !nodeIdSet.has(nid)) }
          : g
      ).filter((g) => g.nodeIds.length > 0),
    }));
  },

  getGroupForNode: (nodeId) => {
    return get().groups.find((g) => g.nodeIds.includes(nodeId));
  },

  // Selection
  selectedNodeIds: [],
  selectNode: (id, additive = false) => {
    set((state) => {
      if (additive) {
        const isSelected = state.selectedNodeIds.includes(id);
        if (isSelected) {
          return { selectedNodeIds: state.selectedNodeIds.filter((nid) => nid !== id) };
        } else {
          return { selectedNodeIds: [...state.selectedNodeIds, id] };
        }
      } else {
        return { selectedNodeIds: [id] };
      }
    });
  },
  selectNodes: (ids) => set({ selectedNodeIds: ids, selectedGroupId: null }),
  deselectAll: () => set({ selectedNodeIds: [], selectedGroupId: null }),

  // Node operations
  addNode: (type, x, y) => {
    const id = generateNodeId();
    const node: GraphNode = {
      id,
      type,
      x,
      y,
      params: {},
      collapsed: false,
    };
    set((state) => ({
      nodes: [...state.nodes, node],
      selectedNodeIds: [id],
    }));
    get().triggerExecution();
    return id;
  },

  removeNodes: (ids) => {
    const idSet = new Set(ids);
    set((state) => ({
      nodes: state.nodes.filter((n) => !idSet.has(n.id)),
      connections: state.connections.filter(
        (c) => !idSet.has(c.fromNode) && !idSet.has(c.toNode)
      ),
      groups: state.groups
        .map((g) => ({ ...g, nodeIds: g.nodeIds.filter((nid) => !idSet.has(nid)) }))
        .filter((g) => g.nodeIds.length > 0),
      selectedNodeIds: state.selectedNodeIds.filter((id) => !idSet.has(id)),
    }));
    get().triggerExecution();
  },

  moveNodes: (ids, dx, dy) => {
    const idSet = new Set(ids);
    set((state) => ({
      nodes: state.nodes.map((n) =>
        idSet.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n
      ),
    }));
  },

  updateNodeParams: (id, params) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, params: { ...n.params, ...params } } : n
      ),
    }));
    get().triggerExecution();
  },

  toggleNodeCollapsed: (id) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, collapsed: !n.collapsed } : n
      ),
    }));
  },

  // Promoted parameters
  promoteParam: (nodeId, paramName) => {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId) return n;
        const promoted = n.promotedParams || [];
        if (promoted.includes(paramName)) return n;
        return { ...n, promotedParams: [...promoted, paramName] };
      }),
    }));
    get().triggerExecution();
  },

  demoteParam: (nodeId, paramName) => {
    // Remove any connections to this parameter port
    const portId = `param:${paramName}`;
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId) return n;
        const promoted = n.promotedParams || [];
        return { ...n, promotedParams: promoted.filter((p) => p !== paramName) };
      }),
      connections: state.connections.filter(
        (c) => !(c.toNode === nodeId && c.toPort === portId)
      ),
    }));
    get().triggerExecution();
  },

  isParamPromoted: (nodeId, paramName) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    return node?.promotedParams?.includes(paramName) ?? false;
  },

  getPromotedParams: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    return node?.promotedParams || [];
  },

  // Connection operations
  addConnection: (fromNode, fromPort, toNode, toPort, dataType) => {
    // Check if connection already exists
    const exists = get().connections.some(
      (c) =>
        c.fromNode === fromNode &&
        c.fromPort === fromPort &&
        c.toNode === toNode &&
        c.toPort === toPort
    );
    if (exists) return false;

    // Remove any existing connection to this input
    set((state) => ({
      connections: state.connections.filter(
        (c) => !(c.toNode === toNode && c.toPort === toPort)
      ),
    }));

    const connection: Connection = {
      id: generateConnectionId(),
      fromNode,
      fromPort,
      toNode,
      toPort,
      dataType,
    };

    set((state) => ({
      connections: [...state.connections, connection],
    }));
    get().triggerExecution();
    return true;
  },

  removeConnection: (id) => {
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
    }));
    get().triggerExecution();
  },

  removeConnectionsForNode: (nodeId) => {
    set((state) => ({
      connections: state.connections.filter(
        (c) => c.fromNode !== nodeId && c.toNode !== nodeId
      ),
    }));
    get().triggerExecution();
  },

  getConnectionToPort: (nodeId, portId) => {
    return get().connections.find(
      (c) => c.toNode === nodeId && c.toPort === portId
    );
  },

  // Project save/load
  saveProject: (name = 'Untitled') => {
    const state = get();
    const project: ProjectFile = {
      version: PROJECT_FILE_VERSION,
      name,
      savedAt: new Date().toISOString(),
      canvas: state.canvas,
      seed: state.seed,
      nodes: state.nodes,
      connections: state.connections,
      groups: state.groups,
    };
    return project;
  },

  loadProject: (data: ProjectFile) => {
    // Version check
    if (!data.version) {
      return { success: false, error: 'Invalid project file: missing version' };
    }

    // Basic validation
    if (!Array.isArray(data.nodes) || !Array.isArray(data.connections)) {
      return { success: false, error: 'Invalid project file: missing nodes or connections' };
    }

    if (!data.canvas || typeof data.canvas.width !== 'number' || typeof data.canvas.height !== 'number') {
      return { success: false, error: 'Invalid project file: missing or invalid canvas settings' };
    }

    // Load the project
    set({
      canvas: data.canvas,
      seed: data.seed ?? randomSeed(),
      nodes: data.nodes,
      connections: data.connections,
      groups: data.groups || [],
      selectedNodeIds: [],
      selectedGroupId: null,
      panOffset: { x: 0, y: 0 },
      zoom: 1,
    });

    get().triggerExecution();
    return { success: true };
  },

  newProject: () => {
    const initial = createInitialNodes();
    groupNameCounter = 0; // Reset group name counter
    set({
      canvas: { width: 210, height: 297, units: 'mm' },
      seed: randomSeed(),
      nodes: initial.nodes,
      connections: initial.connections,
      groups: [],
      selectedNodeIds: [],
      selectedGroupId: null,
      panOffset: { x: 0, y: 0 },
      zoom: 1,
      outputLayers: [],
    });
    get().triggerExecution();
  },

  // Execution result
  outputLayers: [],
  setOutputLayers: (layers) => set({ outputLayers: layers }),

  // Execution trigger
  executionVersion: 0,
  triggerExecution: () => {
    set((state) => ({ executionVersion: state.executionVersion + 1 }));
  },

  // Pan/Zoom
  panOffset: { x: 0, y: 0 },
  zoom: 1,
  setPanOffset: (offset) => set({ panOffset: offset }),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(2, zoom)) }),

  // Dragging connection
  isDraggingConnection: false,
  draggingConnection: null,
  setDraggingConnection: (conn) =>
    set({
      isDraggingConnection: conn !== null,
      draggingConnection: conn,
    }),

  // Toast
  toast: { message: '', visible: false },
  showToast: (message) => {
    set({ toast: { message, visible: true } });
    setTimeout(() => get().hideToast(), 2000);
  },
  hideToast: () => set({ toast: { message: '', visible: false } }),

  // Preview
  previewStrokeWidth: 0.3,
  setPreviewStrokeWidth: (width) => set({ previewStrokeWidth: width }),
}));
