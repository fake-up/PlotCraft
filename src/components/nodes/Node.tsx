import { useCallback, useRef } from 'react';
import { useNodeStore, type GraphNode, type DataType } from '../../store/nodeStore';
import { nodeDefinitions, categoryColors, dataTypeColors, getParamPortLabel } from '../../engine/nodeDefinitions';
import { getNodeIcon } from './nodeIcons';

interface NodeProps {
  node: GraphNode;
}

interface PortProps {
  nodeId: string;
  portName: string;
  portType: DataType;
  direction: 'input' | 'output';
  label: string;
  isConnected: boolean;
  isParamPort?: boolean; // Whether this is a promoted parameter port
  compact?: boolean; // For more compact display
}

function Port({ nodeId, portName, portType, direction, label, isConnected, isParamPort, compact }: PortProps) {
  const setDraggingConnection = useNodeStore((s) => s.setDraggingConnection);
  const addConnection = useNodeStore((s) => s.addConnection);
  const draggingConnection = useNodeStore((s) => s.draggingConnection);
  const connections = useNodeStore((s) => s.connections);
  const removeConnection = useNodeStore((s) => s.removeConnection);

  const color = dataTypeColors[portType];

  // Check if this port could potentially receive a connection
  const isDragging = draggingConnection && direction === 'input' && draggingConnection.fromNode !== nodeId;
  const isCompatible = isDragging && draggingConnection.dataType === portType;
  const isIncompatible = isDragging && draggingConnection.dataType !== portType;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (direction === 'output') {
      // Start dragging from output
      setDraggingConnection({
        fromNode: nodeId,
        fromPort: portName,
        dataType: portType,
        mousePos: { x: e.clientX, y: e.clientY },
      });
    } else {
      // Check if there's an existing connection to disconnect
      const existingConn = connections.find(
        (c) => c.toNode === nodeId && c.toPort === portName
      );
      if (existingConn) {
        removeConnection(existingConn.id);
        // Start dragging from the source
        setDraggingConnection({
          fromNode: existingConn.fromNode,
          fromPort: existingConn.fromPort,
          dataType: existingConn.dataType,
          mousePos: { x: e.clientX, y: e.clientY },
        });
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (draggingConnection && direction === 'input' && isCompatible) {
      addConnection(
        draggingConnection.fromNode,
        draggingConnection.fromPort,
        nodeId,
        portName,
        portType
      );
      setDraggingConnection(null);
    }
  };

  return (
    <div
      className={`flex items-center ${compact ? 'gap-1' : 'gap-1.5'} ${
        direction === 'output' ? 'flex-row-reverse' : ''
      }`}
    >
      <div
        data-port
        data-node-id={nodeId}
        data-port-name={portName}
        data-port-type={portType}
        data-direction={direction}
        data-param-port={isParamPort ? 'true' : undefined}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} rounded-full border-2 cursor-crosshair transition-all hover:scale-125 ${
          isCompatible ? 'scale-125 ring-2 ring-offset-1' : ''
        } ${isIncompatible ? 'opacity-40' : ''}`}
        style={{
          backgroundColor: isConnected ? color : isIncompatible ? '#fee2e2' : 'white',
          borderColor: isIncompatible ? '#ef4444' : color,
          '--tw-ring-color': isCompatible ? color : undefined,
        } as React.CSSProperties}
      />
      <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} ${isParamPort ? 'text-gray-400 italic' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}

export function Node({ node }: NodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const selectedNodeIds = useNodeStore((s) => s.selectedNodeIds);
  const selectNode = useNodeStore((s) => s.selectNode);
  const moveNodes = useNodeStore((s) => s.moveNodes);
  const toggleNodeCollapsed = useNodeStore((s) => s.toggleNodeCollapsed);
  const connections = useNodeStore((s) => s.connections);
  const zoom = useNodeStore((s) => s.zoom);

  const isSelected = selectedNodeIds.includes(node.id);
  const def = nodeDefinitions.get(node.type);

  if (!def) return null;

  const categoryColor = categoryColors[def.category];

  // Get promoted params for this node
  const promotedParams = node.promotedParams || [];

  // Get parameter definitions for promoted params
  const promotedParamDefs = def.parameters.filter(
    (p) => promotedParams.includes(p.name) && p.dataType
  );

  // Check which ports are connected (including param ports)
  const connectedInputs = new Set(
    connections.filter((c) => c.toNode === node.id).map((c) => c.toPort)
  );
  const connectedOutputs = new Set(
    connections.filter((c) => c.fromNode === node.id).map((c) => c.fromPort)
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-port]')) return;

      e.stopPropagation();
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };

      if (!isSelected) {
        selectNode(node.id, e.shiftKey);
      }

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current) return;

        const dx = (moveEvent.clientX - dragStart.current.x) / zoom;
        const dy = (moveEvent.clientY - dragStart.current.y) / zoom;
        dragStart.current = { x: moveEvent.clientX, y: moveEvent.clientY };

        moveNodes(selectedNodeIds.includes(node.id) ? selectedNodeIds : [node.id], dx, dy);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [isSelected, node.id, selectNode, moveNodes, selectedNodeIds, zoom]
  );

  // Get a few key parameters to show on the node
  const keyParams = def.parameters.slice(0, 3);

  // Get the icon for this node type
  const NodeIcon = getNodeIcon(node.type);

  // Get layer color for output nodes
  const isOutputNode = node.type === 'output';
  const layerColor = isOutputNode ? (node.params.layerColor as string) || '#000000' : null;

  return (
    <div
      ref={nodeRef}
      data-node-id={node.id}
      className={`absolute bg-white rounded-lg min-w-[180px] select-none ${
        isSelected ? 'ring-2 ring-blue-400' : ''
      }`}
      style={{
        left: node.x,
        top: node.y,
        border: `2px solid ${isSelected ? '#3B82F6' : '#E5E5E5'}`,
        boxShadow: isSelected
          ? '0 0 0 3px rgba(59, 130, 246, 0.3), 0 4px 20px rgba(0, 0, 0, 0.4)'
          : '0 4px 20px rgba(0, 0, 0, 0.3)',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div
        className="px-3 py-2 rounded-t-md border-b border-gray-100 cursor-grab active:cursor-grabbing flex items-center justify-between"
        style={{ backgroundColor: `${categoryColor}10` }}
      >
        <div className="flex items-center gap-2">
          {NodeIcon ? (
            <NodeIcon className="flex-shrink-0" style={{ color: categoryColor }} />
          ) : (
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: categoryColor }}
            />
          )}
          <span className="font-semibold text-sm text-gray-900">{def.name}</span>
          {/* Layer color indicator for output nodes */}
          {layerColor && (
            <div
              className="w-4 h-4 rounded-sm border border-gray-300 flex-shrink-0"
              style={{ backgroundColor: layerColor }}
              title="Layer color"
            />
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleNodeCollapsed(node.id);
          }}
          className="p-0.5 hover:bg-gray-200 rounded transition-colors"
        >
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${
              node.collapsed ? '-rotate-90' : ''
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
      </div>

      {/* Input/Output ports - always visible even when collapsed */}
      <div className={`flex justify-between px-3 py-2 ${node.collapsed && promotedParamDefs.length === 0 ? '' : 'border-b border-gray-100'}`}>
        {/* Inputs (main inputs + promoted params) */}
        <div className="space-y-1.5">
          {def.inputs.map((input) => (
            <Port
              key={input.name}
              nodeId={node.id}
              portName={input.name}
              portType={input.type}
              direction="input"
              label={node.collapsed ? '' : input.name}
              isConnected={connectedInputs.has(input.name)}
            />
          ))}
          {/* Promoted parameter ports */}
          {promotedParamDefs.map((param) => (
            <Port
              key={`param:${param.name}`}
              nodeId={node.id}
              portName={`param:${param.name}`}
              portType={param.dataType!}
              direction="input"
              label={node.collapsed ? '' : getParamPortLabel(param)}
              isConnected={connectedInputs.has(`param:${param.name}`)}
              isParamPort
              compact
            />
          ))}
        </div>

        {/* Outputs */}
        <div className="space-y-1.5">
          {def.outputs.map((output) => (
            <Port
              key={output.name}
              nodeId={node.id}
              portName={output.name}
              portType={output.type}
              direction="output"
              label={node.collapsed ? '' : output.name}
              isConnected={connectedOutputs.has(output.name)}
            />
          ))}
        </div>
      </div>

      {/* Key parameters preview - only shown when expanded */}
      {!node.collapsed && keyParams.length > 0 && (
        <div className="px-3 py-2 space-y-1">
          {keyParams.map((param) => {
            const isPromoted = promotedParams.includes(param.name);
            const isParamConnected = connectedInputs.has(`param:${param.name}`);
            const value = node.params[param.name] ?? param.default;
            const displayValue = isPromoted
              ? isParamConnected
                ? '◀ linked'
                : '○ —'
              : typeof value === 'number'
                ? value.toFixed(param.step && param.step < 1 ? 2 : 0)
                : String(value);

            return (
              <div
                key={param.name}
                className="flex justify-between text-[11px]"
              >
                <span className={`${isPromoted ? 'text-gray-400 italic' : 'text-gray-500'}`}>
                  {param.label}
                </span>
                <span className={`font-medium ${isPromoted ? 'text-gray-400' : 'text-gray-800'}`}>
                  {displayValue}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
