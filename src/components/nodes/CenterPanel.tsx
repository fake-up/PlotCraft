import { useState, useCallback, useEffect, useRef } from 'react';
import { PreviewPanel } from './PreviewPanel';
import { NodeCanvas } from './NodeCanvas';

const STORAGE_KEY = 'plotcraft-split-position';
const DEFAULT_SPLIT = 0.6; // 60% preview, 40% nodes
const MIN_PREVIEW_HEIGHT = 200;
const MIN_CANVAS_HEIGHT = 150;
const MAX_SPLIT = 0.85;
const MIN_SPLIT = 0.15;

function getStoredSplitPosition(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const value = parseFloat(stored);
      if (value >= MIN_SPLIT && value <= MAX_SPLIT) {
        return value;
      }
    }
  } catch {
    // localStorage not available
  }
  return DEFAULT_SPLIT;
}

function storeSplitPosition(position: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(position));
  } catch {
    // localStorage not available
  }
}

export function CenterPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [splitPosition, setSplitPosition] = useState(getStoredSplitPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const dragStartRef = useRef<{ y: number; split: number } | null>(null);

  // Handle divider drag start
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { y: e.clientY, split: splitPosition };
  }, [splitPosition]);

  // Handle double-click to reset
  const handleDividerDoubleClick = useCallback(() => {
    setSplitPosition(DEFAULT_SPLIT);
    storeSplitPosition(DEFAULT_SPLIT);
  }, []);

  // Handle drag
  useEffect(() => {
    if (!isDragging) return;

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerHeight = containerRect.height;
      const deltaY = e.clientY - dragStartRef.current.y;
      const deltaSplit = deltaY / containerHeight;

      let newSplit = dragStartRef.current.split + deltaSplit;

      // Apply constraints
      const minSplitFromPreview = MIN_PREVIEW_HEIGHT / containerHeight;
      const maxSplitFromCanvas = 1 - (MIN_CANVAS_HEIGHT / containerHeight);

      newSplit = Math.max(Math.max(MIN_SPLIT, minSplitFromPreview), newSplit);
      newSplit = Math.min(Math.min(MAX_SPLIT, maxSplitFromCanvas), newSplit);

      setSplitPosition(newSplit);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      storeSplitPosition(splitPosition);
      dragStartRef.current = null;
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
  }, [isDragging, splitPosition]);

  return (
    <div ref={containerRef} className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Preview Panel - Top */}
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{ height: `calc(${splitPosition * 100}% - 4px)` }}
      >
        <PreviewPanel className="h-full" />
      </div>

      {/* Divider */}
      <div
        className={`relative flex-shrink-0 h-2 cursor-row-resize group ${
          isDragging ? 'bg-blue-500' : 'bg-gray-300'
        }`}
        onMouseDown={handleDividerMouseDown}
        onDoubleClick={handleDividerDoubleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Visual line */}
        <div
          className={`absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 transition-colors ${
            isDragging ? 'bg-blue-600' : isHovering ? 'bg-gray-500' : 'bg-gray-400'
          }`}
        />
        {/* Grip dots */}
        <div className="absolute inset-0 flex items-center justify-center gap-1">
          <div
            className={`w-1 h-1 rounded-full transition-colors ${
              isDragging || isHovering ? 'bg-gray-600' : 'bg-gray-500'
            }`}
          />
          <div
            className={`w-1 h-1 rounded-full transition-colors ${
              isDragging || isHovering ? 'bg-gray-600' : 'bg-gray-500'
            }`}
          />
          <div
            className={`w-1 h-1 rounded-full transition-colors ${
              isDragging || isHovering ? 'bg-gray-600' : 'bg-gray-500'
            }`}
          />
          <div
            className={`w-1 h-1 rounded-full transition-colors ${
              isDragging || isHovering ? 'bg-gray-600' : 'bg-gray-500'
            }`}
          />
          <div
            className={`w-1 h-1 rounded-full transition-colors ${
              isDragging || isHovering ? 'bg-gray-600' : 'bg-gray-500'
            }`}
          />
        </div>
        {/* Hover highlight */}
        <div
          className={`absolute inset-0 transition-colors ${
            isHovering && !isDragging ? 'bg-blue-400/20' : ''
          }`}
        />
      </div>

      {/* Node Canvas - Bottom */}
      <div
        className="flex-1 overflow-hidden"
        style={{ height: `calc(${(1 - splitPosition) * 100}% - 4px)` }}
      >
        <NodeCanvas />
      </div>
    </div>
  );
}
