import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNodeStore, type NodeGroup as NodeGroupType, type GraphNode } from '../../store/nodeStore';

const GROUP_PADDING = 20;
const HEADER_HEIGHT = 28;
const NODE_WIDTH = 180; // Approximate node width
const NODE_HEIGHT = 100; // Approximate collapsed node height

interface NodeGroupProps {
  group: NodeGroupType;
  nodes: GraphNode[];
}

export function NodeGroup({ group, nodes }: NodeGroupProps) {
  const selectedGroupId = useNodeStore((s) => s.selectedGroupId);
  const selectGroup = useNodeStore((s) => s.selectGroup);
  const selectNodes = useNodeStore((s) => s.selectNodes);
  const updateGroup = useNodeStore((s) => s.updateGroup);
  const moveNodes = useNodeStore((s) => s.moveNodes);
  const ungroupNodes = useNodeStore((s) => s.ungroupNodes);
  const deleteGroup = useNodeStore((s) => s.deleteGroup);
  const zoom = useNodeStore((s) => s.zoom);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [isDragging, setIsDragging] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const isSelected = selectedGroupId === group.id;

  // Calculate group bounds from contained nodes
  const bounds = useMemo(() => {
    if (nodes.length === 0) return { x: 0, y: 0, width: 200, height: 100 };

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + NODE_WIDTH);
      maxY = Math.max(maxY, node.y + NODE_HEIGHT);
    }

    return {
      x: minX - GROUP_PADDING,
      y: minY - GROUP_PADDING - HEADER_HEIGHT,
      width: maxX - minX + GROUP_PADDING * 2,
      height: maxY - minY + GROUP_PADDING * 2 + HEADER_HEIGHT,
    };
  }, [nodes]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Close context menu on click outside
  useEffect(() => {
    if (!showContextMenu) return;
    const handleClick = () => setShowContextMenu(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [showContextMenu]);

  const handleHeaderClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectGroup(group.id);
  }, [group.id, selectGroup]);

  const handleHeaderDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Select all nodes in the group
    selectNodes(group.nodeIds);
  }, [group.nodeIds, selectNodes]);

  const handleNameDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(group.name);
    setIsEditing(true);
  }, [group.name]);

  const handleNameSubmit = useCallback(() => {
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== group.name) {
      updateGroup(group.id, { name: trimmedName });
    }
    setIsEditing(false);
  }, [editName, group.id, group.name, updateGroup]);

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(group.name);
    }
  }, [handleNameSubmit, group.name]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || isEditing) return;
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  }, [isEditing]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStartRef.current.x) / zoom;
      const dy = (e.clientY - dragStartRef.current.y) / zoom;

      // Move all nodes in the group
      moveNodes(group.nodeIds, dx, dy);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, group.nodeIds, moveNodes, zoom]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
    selectGroup(group.id);
  }, [group.id, selectGroup]);

  const handleRename = useCallback(() => {
    setEditName(group.name);
    setIsEditing(true);
    setShowContextMenu(false);
  }, [group.name]);

  const handleUngroup = useCallback(() => {
    ungroupNodes(group.id);
    setShowContextMenu(false);
  }, [group.id, ungroupNodes]);

  const handleDelete = useCallback(() => {
    if (confirm('Delete this group and all its nodes?')) {
      deleteGroup(group.id);
    }
    setShowContextMenu(false);
  }, [group.id, deleteGroup]);

  // Parse color to get RGB values for opacity
  const colorWithOpacity = `${group.color}1A`; // 10% opacity

  return (
    <>
      <div
        className="absolute rounded-lg pointer-events-auto"
        style={{
          left: bounds.x,
          top: bounds.y,
          width: bounds.width,
          height: bounds.height,
          backgroundColor: colorWithOpacity,
          border: `2px solid ${isSelected ? group.color : `${group.color}40`}`,
          transition: isDragging ? 'none' : 'border-color 0.15s',
        }}
        onContextMenu={handleContextMenu}
      >
        {/* Header bar */}
        <div
          className="absolute top-0 left-0 right-0 rounded-t-md flex items-center gap-2 px-2 cursor-move"
          style={{
            height: HEADER_HEIGHT,
            backgroundColor: `${group.color}40`,
          }}
          onClick={handleHeaderClick}
          onDoubleClick={handleHeaderDoubleClick}
          onMouseDown={handleDragStart}
        >
          {/* Color indicator */}
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: group.color }}
          />

          {/* Group name */}
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={handleNameKeyDown}
              className="flex-1 px-1 py-0.5 text-xs font-medium bg-white rounded border-none outline-none text-gray-800"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="flex-1 text-xs font-medium text-white truncate cursor-text"
              onDoubleClick={handleNameDoubleClick}
            >
              {group.name}
            </span>
          )}

          {/* Node count */}
          <span className="text-[10px] text-white/70">
            {nodes.length} node{nodes.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Context menu */}
      {showContextMenu && (
        <div
          className="fixed z-50 bg-gray-800 rounded-lg shadow-xl py-1 min-w-[140px] border border-gray-700"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-1.5 text-left text-xs text-gray-200 hover:bg-gray-700"
            onClick={handleRename}
          >
            Rename Group
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-xs text-gray-200 hover:bg-gray-700"
            onClick={handleUngroup}
          >
            Ungroup
          </button>
          <div className="border-t border-gray-700 my-1" />
          <button
            className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-gray-700"
            onClick={handleDelete}
          >
            Delete Group
          </button>
        </div>
      )}
    </>
  );
}
