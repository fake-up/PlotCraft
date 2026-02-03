import { useCallback, useState, useEffect } from 'react';
import { useNodeStore } from '../../store/nodeStore';
import { nodeDefinitions } from '../../engine/nodeDefinitions';
import { hasFalloffEnabled } from '../../engine/falloff';

interface NodeFalloffControlProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  previewZoom: number;
  panOffset: { x: number; y: number };
}

export function NodeFalloffControl({
  containerRef,
  canvasRef,
  previewZoom,
  panOffset,
}: NodeFalloffControlProps) {
  const nodes = useNodeStore((s) => s.nodes);
  const selectedNodeIds = useNodeStore((s) => s.selectedNodeIds);
  const updateNodeParams = useNodeStore((s) => s.updateNodeParams);
  const canvas = useNodeStore((s) => s.canvas);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [isDraggingCenter, setIsDraggingCenter] = useState(false);
  const [isDraggingRadius, setIsDraggingRadius] = useState(false);
  const [overlayPosition, setOverlayPosition] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  // Find the selected node (only support single selection for falloff)
  const selectedNode = selectedNodeIds.length === 1
    ? nodes.find(n => n.id === selectedNodeIds[0])
    : null;

  // Check if the node has falloff parameters
  const nodeDef = selectedNode ? nodeDefinitions.get(selectedNode.type) : null;
  const hasFalloffParams = nodeDef?.parameters.some(p => p.name === 'enableFalloff') ?? false;

  // Check if falloff is enabled
  const falloffEnabled = selectedNode && hasFalloffParams && hasFalloffEnabled(selectedNode.params);


  // Get falloff values (use defaults if not available)
  const falloffX = falloffEnabled ? ((selectedNode.params.falloffX as number) ?? 50) : 50;
  const falloffY = falloffEnabled ? ((selectedNode.params.falloffY as number) ?? 50) : 50;
  const falloffRadius = falloffEnabled ? ((selectedNode.params.falloffRadius as number) ?? 100) : 100;

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

    // Only run animation loop when there's falloff to show
    if (falloffEnabled) {
      animationId = requestAnimationFrame(animateUpdate);
    }

    return () => {
      observer.disconnect();
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [canvasRef, containerRef, previewZoom, panOffset, falloffEnabled]);

  // Calculate scale factors (display size / canvas size in mm)
  const displayWidth = overlayPosition?.width ?? 0;
  const displayHeight = overlayPosition?.height ?? 0;
  const scaleX = displayWidth / canvas.width;
  const scaleY = displayHeight / canvas.height;

  // Calculate center position in screen coords (relative to canvas element)
  const centerCanvasX = (falloffX / 100) * canvas.width;
  const centerCanvasY = (falloffY / 100) * canvas.height;
  const centerScreenX = centerCanvasX * scaleX;
  const centerScreenY = centerCanvasY * scaleY;

  // Calculate radius in screen coords
  const radiusScreen = falloffRadius * scaleX;

  const handleCenterMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingCenter(true);
  }, []);

  const handleRadiusMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingRadius(true);
  }, []);

  useEffect(() => {
    // Early exit if not dragging or no falloff enabled
    if (!isDraggingCenter && !isDraggingRadius) return;
    if (!falloffEnabled || !selectedNode) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;

      const rect = canvasEl.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      if (isDraggingCenter) {
        // Convert screen coords to canvas percentage
        const canvasX = screenX / scaleX;
        const canvasY = screenY / scaleY;
        const percentX = Math.max(0, Math.min(100, (canvasX / canvas.width) * 100));
        const percentY = Math.max(0, Math.min(100, (canvasY / canvas.height) * 100));

        updateNodeParams(selectedNode.id, {
          falloffX: Math.round(percentX),
          falloffY: Math.round(percentY),
        });
      } else if (isDraggingRadius) {
        // Calculate distance from center in screen coords
        const dx = screenX - centerScreenX;
        const dy = screenY - centerScreenY;
        const screenDist = Math.sqrt(dx * dx + dy * dy);
        // Convert to mm
        const radiusMm = Math.max(5, Math.min(500, Math.round(screenDist / scaleX)));
        updateNodeParams(selectedNode.id, {
          falloffRadius: radiusMm,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingCenter(false);
      setIsDraggingRadius(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isDraggingCenter,
    isDraggingRadius,
    falloffEnabled,
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
  if (!falloffEnabled || !overlayPosition || overlayPosition.width === 0) {
    return null;
  }

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
      {/* Radius circle (dashed) */}
      <circle
        cx={centerScreenX}
        cy={centerScreenY}
        r={radiusScreen}
        fill="none"
        stroke="rgba(59, 130, 246, 0.6)"
        strokeWidth={2}
        strokeDasharray="8 4"
        className="pointer-events-none"
      />

      {/* Radius drag handle (invisible larger area) */}
      <circle
        cx={centerScreenX + radiusScreen}
        cy={centerScreenY}
        r={14}
        fill="transparent"
        className="pointer-events-auto cursor-ew-resize"
        onMouseDown={handleRadiusMouseDown}
      />

      {/* Radius drag handle (visible) */}
      <circle
        cx={centerScreenX + radiusScreen}
        cy={centerScreenY}
        r={6}
        fill="white"
        stroke="rgba(59, 130, 246, 0.9)"
        strokeWidth={2}
        className="pointer-events-none"
      />

      {/* Center crosshair */}
      <g className="pointer-events-none">
        <line
          x1={centerScreenX - 12}
          y1={centerScreenY}
          x2={centerScreenX + 12}
          y2={centerScreenY}
          stroke="rgba(59, 130, 246, 0.9)"
          strokeWidth={2}
        />
        <line
          x1={centerScreenX}
          y1={centerScreenY - 12}
          x2={centerScreenX}
          y2={centerScreenY + 12}
          stroke="rgba(59, 130, 246, 0.9)"
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
        fill="rgba(59, 130, 246, 0.9)"
        stroke="white"
        strokeWidth={2}
        className="pointer-events-none"
      />
    </svg>
  );
}
