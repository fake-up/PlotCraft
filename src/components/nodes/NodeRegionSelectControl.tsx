import { useCallback, useState, useEffect } from 'react';
import { useNodeStore } from '../../store/nodeStore';

interface NodeRegionSelectControlProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  previewZoom: number;
  panOffset: { x: number; y: number };
}

type DragTarget = null | 'center' | 'radius' | 'width' | 'height';

export function NodeRegionSelectControl({
  containerRef,
  canvasRef,
  previewZoom,
  panOffset,
}: NodeRegionSelectControlProps) {
  const nodes = useNodeStore((s) => s.nodes);
  const selectedNodeIds = useNodeStore((s) => s.selectedNodeIds);
  const updateNodeParams = useNodeStore((s) => s.updateNodeParams);
  const canvas = useNodeStore((s) => s.canvas);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [overlayPosition, setOverlayPosition] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  // Find the selected node (only support single selection)
  const selectedNode = selectedNodeIds.length === 1
    ? nodes.find(n => n.id === selectedNodeIds[0])
    : null;

  // Check if the selected node is a regionSelect
  const isRegionSelect = selectedNode?.type === 'regionSelect';

  // Get region values (use defaults if not available)
  const shape = isRegionSelect ? ((selectedNode.params.shape as string) ?? 'circle') : 'circle';
  const centerX = isRegionSelect ? ((selectedNode.params.centerX as number) ?? 50) : 50;
  const centerY = isRegionSelect ? ((selectedNode.params.centerY as number) ?? 50) : 50;
  const regionRadius = isRegionSelect ? ((selectedNode.params.regionRadius as number) ?? 25) : 25;
  const regionWidth = isRegionSelect ? ((selectedNode.params.regionWidth as number) ?? 30) : 30;
  const regionHeight = isRegionSelect ? ((selectedNode.params.regionHeight as number) ?? 30) : 30;
  const falloff = isRegionSelect ? ((selectedNode.params.falloff as number) ?? 0) : 0;

  // Update overlay position when canvas position changes
  useEffect(() => {
    const updatePosition = () => {
      const canvasEl = canvasRef.current;
      const containerEl = containerRef.current;
      if (!canvasEl || !containerEl) {
        setOverlayPosition(null);
        return;
      }

      const canvasRect = canvasEl.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();

      setOverlayPosition({
        left: canvasRect.left - containerRect.left,
        top: canvasRect.top - containerRect.top,
        width: canvasRect.width,
        height: canvasRect.height,
      });
    };

    updatePosition();

    // Update on resize
    const observer = new ResizeObserver(updatePosition);
    if (canvasRef.current) {
      observer.observe(canvasRef.current);
    }
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Also update on animation frames for smooth tracking during pan/zoom
    let animationId: number;
    const animateUpdate = () => {
      updatePosition();
      animationId = requestAnimationFrame(animateUpdate);
    };

    if (isRegionSelect) {
      animationId = requestAnimationFrame(animateUpdate);
    }

    return () => {
      observer.disconnect();
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [canvasRef, containerRef, previewZoom, panOffset, isRegionSelect]);

  // Calculate scale factors (display size / canvas size in mm)
  const displayWidth = overlayPosition?.width ?? 0;
  const displayHeight = overlayPosition?.height ?? 0;
  const scaleX = displayWidth / canvas.width;
  const scaleY = displayHeight / canvas.height;

  // Calculate center position in screen coords
  const centerScreenX = (centerX / 100) * canvas.width * scaleX;
  const centerScreenY = (centerY / 100) * canvas.height * scaleY;

  // Calculate region dimensions in screen coords
  const radiusScreenX = (regionRadius / 100) * canvas.width * scaleX;
  const radiusScreenY = (regionRadius / 100) * canvas.width * scaleY;
  const rectHalfW = (regionWidth / 100) * canvas.width * scaleX / 2;
  const rectHalfH = (regionHeight / 100) * canvas.height * scaleY / 2;

  // Falloff dimensions in screen coords
  const falloffScreenX = (falloff / 100) * canvas.width * scaleX;
  const falloffScreenY = (falloff / 100) * canvas.width * scaleY;

  const handleCenterMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragTarget('center');
  }, []);

  const handleRadiusMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragTarget('radius');
  }, []);

  const handleWidthMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragTarget('width');
  }, []);

  const handleHeightMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragTarget('height');
  }, []);

  useEffect(() => {
    if (!dragTarget) return;
    if (!isRegionSelect || !selectedNode) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;

      const rect = canvasEl.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      if (dragTarget === 'center') {
        const canvasXmm = screenX / scaleX;
        const canvasYmm = screenY / scaleY;
        const percentX = Math.max(0, Math.min(100, (canvasXmm / canvas.width) * 100));
        const percentY = Math.max(0, Math.min(100, (canvasYmm / canvas.height) * 100));

        updateNodeParams(selectedNode.id, {
          centerX: Math.round(percentX),
          centerY: Math.round(percentY),
        });
      } else if (dragTarget === 'radius') {
        // Distance from center in screen coords
        const dx = screenX - centerScreenX;
        const dy = screenY - centerScreenY;
        const screenDist = Math.sqrt(dx * dx + dy * dy);
        // Convert to percentage of canvas width
        const radiusMm = screenDist / scaleX;
        const radiusPct = Math.max(1, Math.min(100, Math.round((radiusMm / canvas.width) * 100)));
        updateNodeParams(selectedNode.id, {
          regionRadius: radiusPct,
        });
      } else if (dragTarget === 'width') {
        // Distance from center along X
        const dx = Math.abs(screenX - centerScreenX);
        const widthMm = (dx * 2) / scaleX;
        const widthPct = Math.max(1, Math.min(100, Math.round((widthMm / canvas.width) * 100)));
        updateNodeParams(selectedNode.id, {
          regionWidth: widthPct,
        });
      } else if (dragTarget === 'height') {
        // Distance from center along Y
        const dy = Math.abs(screenY - centerScreenY);
        const heightMm = (dy * 2) / scaleY;
        const heightPct = Math.max(1, Math.min(100, Math.round((heightMm / canvas.height) * 100)));
        updateNodeParams(selectedNode.id, {
          regionHeight: heightPct,
        });
      }
    };

    const handleMouseUp = () => {
      setDragTarget(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    dragTarget,
    isRegionSelect,
    selectedNode,
    canvasRef,
    updateNodeParams,
    canvas.width,
    canvas.height,
    scaleX,
    scaleY,
    centerScreenX,
    centerScreenY,
  ]);

  // CONDITIONAL RETURN AFTER ALL HOOKS
  if (!isRegionSelect || !overlayPosition || overlayPosition.width === 0) {
    return null;
  }

  // Amber color scheme for Select category
  const strokeColor = 'rgba(245, 158, 11, 0.7)';
  const fillColor = 'rgba(245, 158, 11, 0.08)';
  const handleStroke = 'rgba(245, 158, 11, 0.9)';
  const handleFill = 'rgba(245, 158, 11, 0.9)';
  const falloffStroke = 'rgba(245, 158, 11, 0.35)';

  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        width: overlayPosition.width,
        height: overlayPosition.height,
        left: overlayPosition.left,
        top: overlayPosition.top,
        zIndex: 10,
      }}
    >
      {shape === 'circle' ? (
        <>
          {/* Falloff zone (outer dashed circle) */}
          {falloff > 0 && (
            <ellipse
              cx={centerScreenX}
              cy={centerScreenY}
              rx={radiusScreenX + falloffScreenX}
              ry={radiusScreenY + falloffScreenY}
              fill="none"
              stroke={falloffStroke}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              className="pointer-events-none"
            />
          )}

          {/* Main region circle */}
          <ellipse
            cx={centerScreenX}
            cy={centerScreenY}
            rx={radiusScreenX}
            ry={radiusScreenY}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={2}
            strokeDasharray="8 4"
            className="pointer-events-none"
          />

          {/* Radius drag handle (invisible larger area) */}
          <circle
            cx={centerScreenX + radiusScreenX}
            cy={centerScreenY}
            r={14}
            fill="transparent"
            className="pointer-events-auto cursor-ew-resize"
            onMouseDown={handleRadiusMouseDown}
          />

          {/* Radius drag handle (visible) */}
          <circle
            cx={centerScreenX + radiusScreenX}
            cy={centerScreenY}
            r={6}
            fill="white"
            stroke={handleStroke}
            strokeWidth={2}
            className="pointer-events-none"
          />
        </>
      ) : (
        <>
          {/* Falloff zone (outer dashed rectangle) */}
          {falloff > 0 && (
            <rect
              x={centerScreenX - rectHalfW - falloffScreenX}
              y={centerScreenY - rectHalfH - falloffScreenY}
              width={(rectHalfW + falloffScreenX) * 2}
              height={(rectHalfH + falloffScreenY) * 2}
              fill="none"
              stroke={falloffStroke}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              className="pointer-events-none"
            />
          )}

          {/* Main region rectangle */}
          <rect
            x={centerScreenX - rectHalfW}
            y={centerScreenY - rectHalfH}
            width={rectHalfW * 2}
            height={rectHalfH * 2}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={2}
            strokeDasharray="8 4"
            className="pointer-events-none"
          />

          {/* Width drag handle (right edge) - invisible larger area */}
          <circle
            cx={centerScreenX + rectHalfW}
            cy={centerScreenY}
            r={14}
            fill="transparent"
            className="pointer-events-auto cursor-ew-resize"
            onMouseDown={handleWidthMouseDown}
          />

          {/* Width drag handle (visible) */}
          <circle
            cx={centerScreenX + rectHalfW}
            cy={centerScreenY}
            r={6}
            fill="white"
            stroke={handleStroke}
            strokeWidth={2}
            className="pointer-events-none"
          />

          {/* Height drag handle (bottom edge) - invisible larger area */}
          <circle
            cx={centerScreenX}
            cy={centerScreenY + rectHalfH}
            r={14}
            fill="transparent"
            className="pointer-events-auto cursor-ns-resize"
            onMouseDown={handleHeightMouseDown}
          />

          {/* Height drag handle (visible) */}
          <circle
            cx={centerScreenX}
            cy={centerScreenY + rectHalfH}
            r={6}
            fill="white"
            stroke={handleStroke}
            strokeWidth={2}
            className="pointer-events-none"
          />
        </>
      )}

      {/* Center crosshair */}
      <g className="pointer-events-none">
        <line
          x1={centerScreenX - 12}
          y1={centerScreenY}
          x2={centerScreenX + 12}
          y2={centerScreenY}
          stroke={handleStroke}
          strokeWidth={2}
        />
        <line
          x1={centerScreenX}
          y1={centerScreenY - 12}
          x2={centerScreenX}
          y2={centerScreenY + 12}
          stroke={handleStroke}
          strokeWidth={2}
        />
      </g>

      {/* Center drag handle (invisible larger area) */}
      <circle
        cx={centerScreenX}
        cy={centerScreenY}
        r={16}
        fill="transparent"
        className="pointer-events-auto cursor-move"
        onMouseDown={handleCenterMouseDown}
      />

      {/* Center point */}
      <circle
        cx={centerScreenX}
        cy={centerScreenY}
        r={7}
        fill={handleFill}
        stroke="white"
        strokeWidth={2}
        className="pointer-events-none"
      />
    </svg>
  );
}
