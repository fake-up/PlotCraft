import { useRef, useCallback, useEffect, useLayoutEffect, useState, useMemo } from 'react';
import { useNodeStore, type GraphNode } from '../../store/nodeStore';
import { Node } from './Node';
import { Connection, DraggingConnection } from './Connection';
import { SelectionBox } from './SelectionBox';
import { NodeGroup } from './NodeGroup';

export function NodeCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const nodes = useNodeStore((s) => s.nodes);
  const connections = useNodeStore((s) => s.connections);
  const groups = useNodeStore((s) => s.groups);
  const panOffset = useNodeStore((s) => s.panOffset);
  const zoom = useNodeStore((s) => s.zoom);
  const setPanOffset = useNodeStore((s) => s.setPanOffset);
  const setZoom = useNodeStore((s) => s.setZoom);
  const addNode = useNodeStore((s) => s.addNode);
  const removeNodes = useNodeStore((s) => s.removeNodes);
  const selectedNodeIds = useNodeStore((s) => s.selectedNodeIds);
  const deselectAll = useNodeStore((s) => s.deselectAll);
  const selectNodes = useNodeStore((s) => s.selectNodes);
  const draggingConnection = useNodeStore((s) => s.draggingConnection);
  const setDraggingConnection = useNodeStore((s) => s.setDraggingConnection);
  const createGroup = useNodeStore((s) => s.createGroup);
  const copyNodes = useNodeStore((s) => s.copyNodes);
  const pasteNodes = useNodeStore((s) => s.pasteNodes);
  const showToast = useNodeStore((s) => s.showToast);

  const [isPanning, setIsPanning] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  // Force update counter to ensure connections render after DOM updates
  const [, forceUpdate] = useState(0);

  const panStart = useRef({ x: 0, y: 0 });
  const panOffsetStart = useRef({ x: 0, y: 0 });

  // Get port position in canvas coordinates
  const getPortPosition = useCallback(
    (nodeId: string, portName: string, direction: 'input' | 'output') => {
      if (!canvasRef.current) return null;

      const portEl = canvasRef.current.querySelector(
        `[data-node-id="${nodeId}"] [data-port][data-port-name="${portName}"][data-direction="${direction}"]`
      );

      if (!portEl) return null;

      const rect = portEl.getBoundingClientRect();
      const canvasRect = canvasRef.current.getBoundingClientRect();

      return {
        x: (rect.left + rect.width / 2 - canvasRect.left - panOffset.x) / zoom,
        y: (rect.top + rect.height / 2 - canvasRect.top - panOffset.y) / zoom,
      };
    },
    [panOffset, zoom]
  );

  // Handle mouse wheel for zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(zoom + delta);
    },
    [zoom, setZoom]
  );

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle mouse button or space+left click for panning
      if (e.button === 1 || (e.button === 0 && spacePressed)) {
        e.preventDefault();
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY };
        panOffsetStart.current = { ...panOffset };
        return;
      }

      // Left click on empty space - start selection or deselect
      if (e.button === 0 && e.target === canvasRef.current) {
        if (e.shiftKey) {
          // Shift+click starts marquee selection
          const rect = canvasRef.current!.getBoundingClientRect();
          const startX = (e.clientX - rect.left - panOffset.x) / zoom;
          const startY = (e.clientY - rect.top - panOffset.y) / zoom;
          setSelectionStart({ x: startX, y: startY });
          setSelectionEnd({ x: startX, y: startY });
          setIsSelecting(true);
        } else {
          deselectAll();
        }
      }
    },
    [spacePressed, panOffset, zoom, deselectAll]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        setMousePos({
          x: (e.clientX - canvasRect.left - panOffset.x) / zoom,
          y: (e.clientY - canvasRect.top - panOffset.y) / zoom,
        });
      }

      if (isPanning) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        setPanOffset({
          x: panOffsetStart.current.x + dx,
          y: panOffsetStart.current.y + dy,
        });
        return;
      }

      if (isSelecting && canvasRect) {
        const endX = (e.clientX - canvasRect.left - panOffset.x) / zoom;
        const endY = (e.clientY - canvasRect.top - panOffset.y) / zoom;
        setSelectionEnd({ x: endX, y: endY });
      }

      // Update dragging connection position
      if (draggingConnection) {
        setDraggingConnection({
          ...draggingConnection,
          mousePos: { x: e.clientX, y: e.clientY },
        });
      }
    },
    [isPanning, isSelecting, panOffset, zoom, setPanOffset, draggingConnection, setDraggingConnection]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (isSelecting) {
      // Calculate which nodes are in the selection box
      const minX = Math.min(selectionStart.x, selectionEnd.x);
      const maxX = Math.max(selectionStart.x, selectionEnd.x);
      const minY = Math.min(selectionStart.y, selectionEnd.y);
      const maxY = Math.max(selectionStart.y, selectionEnd.y);

      const selectedIds = nodes
        .filter((node) => {
          // Simple bounding box check (assumes ~180px node width, ~100px height)
          const nodeRight = node.x + 180;
          const nodeBottom = node.y + 100;
          return (
            node.x < maxX &&
            nodeRight > minX &&
            node.y < maxY &&
            nodeBottom > minY
          );
        })
        .map((n) => n.id);

      if (selectedIds.length > 0) {
        selectNodes(selectedIds);
      }

      setIsSelecting(false);
    }

    if (draggingConnection) {
      setDraggingConnection(null);
    }
  }, [
    isPanning,
    isSelecting,
    selectionStart,
    selectionEnd,
    nodes,
    selectNodes,
    draggingConnection,
    setDraggingConnection,
  ]);

  // Handle drop from library
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const nodeType = e.dataTransfer.getData('node-type');
      if (nodeType && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - panOffset.x) / zoom;
        const y = (e.clientY - rect.top - panOffset.y) / zoom;
        addNode(nodeType, x - 90, y - 30);
      }
    },
    [addNode, panOffset, zoom]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setSpacePressed(true);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeIds.length > 0) {
        if (document.activeElement?.tagName !== 'INPUT') {
          removeNodes(selectedNodeIds);
        }
      }
      if (e.key === 'Escape') {
        deselectAll();
        setDraggingConnection(null);
      }
      // Cmd+G / Ctrl+G to group selected nodes
      if ((e.metaKey || e.ctrlKey) && e.key === 'g' && selectedNodeIds.length > 1) {
        e.preventDefault();
        createGroup(selectedNodeIds);
        showToast(`Grouped ${selectedNodeIds.length} nodes`);
      }
      // Cmd+C / Ctrl+C to copy selected nodes
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedNodeIds.length > 0) {
        if (document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          copyNodes(selectedNodeIds);
          showToast(`Copied ${selectedNodeIds.length} node${selectedNodeIds.length > 1 ? 's' : ''}`);
        }
      }
      // Cmd+V / Ctrl+V to paste nodes
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        if (document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          const pasted = pasteNodes();
          if (pasted.length > 0) {
            showToast(`Pasted ${pasted.length} node${pasted.length > 1 ? 's' : ''}`);
          }
        }
      }
      // Cmd+D / Ctrl+D to duplicate selected nodes
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && selectedNodeIds.length > 0) {
        if (document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          copyNodes(selectedNodeIds);
          const pasted = pasteNodes();
          if (pasted.length > 0) {
            showToast(`Duplicated ${pasted.length} node${pasted.length > 1 ? 's' : ''}`);
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedNodeIds, removeNodes, deselectAll, setDraggingConnection, createGroup, copyNodes, pasteNodes, showToast]);

  // Wheel listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Force re-render after initial mount to ensure connections render correctly
  useEffect(() => {
    requestAnimationFrame(() => {
      forceUpdate((n) => n + 1);
    });
  }, []);

  // Force re-render when nodes change (e.g., collapsed state) to update connection positions
  // useLayoutEffect runs after DOM mutations, ensuring port positions are accurate
  useLayoutEffect(() => {
    // Schedule a re-render on the next frame to get updated port positions
    const frame = requestAnimationFrame(() => {
      forceUpdate((n) => n + 1);
    });
    return () => cancelAnimationFrame(frame);
  }, [nodes]);

  // Calculate dragging connection positions
  const draggingFromPos = draggingConnection
    ? getPortPosition(draggingConnection.fromNode, draggingConnection.fromPort, 'output')
    : null;

  const draggingToPos = draggingConnection
    ? mousePos
    : null;

  // Memoize node lookup for groups
  const nodeMap = useMemo(() => {
    const map = new Map(nodes.map((n) => [n.id, n]));
    return map;
  }, [nodes]);

  // Get nodes for each group
  const getNodesForGroup = useCallback(
    (nodeIds: string[]): GraphNode[] =>
      nodeIds.map((id) => nodeMap.get(id)).filter((n): n is GraphNode => n !== undefined),
    [nodeMap]
  );

  return (
    <div
      ref={canvasRef}
      className="w-full h-full relative overflow-hidden"
      style={{
        backgroundColor: '#1E1E1E',
        backgroundImage: `radial-gradient(circle, #444 1px, transparent 1px)`,
        backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
        backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
        cursor: isPanning || spacePressed ? 'grabbing' : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* SVG layer for connections */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Existing connections */}
        {connections.map((conn) => (
          <Connection
            key={conn.id}
            connection={conn}
            fromPos={getPortPosition(conn.fromNode, conn.fromPort, 'output')}
            toPos={getPortPosition(conn.toNode, conn.toPort, 'input')}
          />
        ))}

        {/* Dragging connection preview */}
        {draggingFromPos && draggingToPos && draggingConnection && (
          <DraggingConnection
            fromPos={draggingFromPos}
            toPos={draggingToPos}
            dataType={draggingConnection.dataType}
          />
        )}
      </svg>

      {/* Groups layer (rendered behind nodes) */}
      <div
        className="absolute pointer-events-none"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {groups.map((group) => (
          <NodeGroup
            key={group.id}
            group={group}
            nodes={getNodesForGroup(group.nodeIds)}
          />
        ))}
      </div>

      {/* Nodes layer */}
      <div
        className="absolute"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {nodes.map((node) => (
          <Node key={node.id} node={node} />
        ))}
      </div>

      {/* Selection box */}
      {isSelecting && (
        <SelectionBox
          start={selectionStart}
          end={selectionEnd}
          panOffset={panOffset}
          zoom={zoom}
        />
      )}

      {/* Canvas info */}
      <div className="absolute bottom-3 left-3 text-xs flex gap-4" style={{ color: '#999' }}>
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <span>Nodes: {nodes.length}</span>
        {groups.length > 0 && <span>Groups: {groups.length}</span>}
        <span>Connections: {connections.length}</span>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-3 right-3 text-xs" style={{ color: '#999' }}>
        <span className="px-1.5 py-0.5 rounded mr-1" style={{ backgroundColor: '#333' }}>Space</span>
        + drag to pan |
        <span className="px-1.5 py-0.5 rounded mx-1" style={{ backgroundColor: '#333' }}>Scroll</span>
        to zoom
      </div>
    </div>
  );
}
