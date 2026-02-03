import { useCallback, useState, useEffect } from 'react';
import { usePlotCraftStore } from '../store';
import { hasFalloffEnabled } from '../engine/falloff';

interface FalloffControlProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  displayWidth: number;
  displayHeight: number;
  panX: number;
  panY: number;
}

export function FalloffControl({
  containerRef,
  displayWidth,
  displayHeight,
  panX,
  panY,
}: FalloffControlProps) {
  const {
    modules,
    focusedModuleId,
    updateModuleParams,
    canvas,
  } = usePlotCraftStore();

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [isDraggingCenter, setIsDraggingCenter] = useState(false);
  const [isDraggingRadius, setIsDraggingRadius] = useState(false);

  // Find the focused module
  const focusedModule = modules.find(m => m.instanceId === focusedModuleId);

  // Check if falloff is enabled (used for conditional rendering and in effects)
  const falloffEnabled = focusedModule && hasFalloffEnabled(focusedModule.params);

  // Get falloff values (use defaults if not available)
  const falloffX = falloffEnabled ? ((focusedModule.params.falloffX as number) ?? 50) : 50;
  const falloffY = falloffEnabled ? ((focusedModule.params.falloffY as number) ?? 50) : 50;
  const falloffRadius = falloffEnabled ? ((focusedModule.params.falloffRadius as number) ?? 100) : 100;

  // Scale factors
  const scaleX = displayWidth / canvas.width;
  const scaleY = displayHeight / canvas.height;

  // Calculate center position in screen coords (relative to canvas)
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
    if (!falloffEnabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container || !focusedModuleId) return;

      const rect = container.getBoundingClientRect();
      const canvasLeft = rect.width / 2 - displayWidth / 2 + panX;
      const canvasTop = rect.height / 2 - displayHeight / 2 + panY;

      const screenX = e.clientX - rect.left - canvasLeft;
      const screenY = e.clientY - rect.top - canvasTop;

      if (isDraggingCenter) {
        // Convert screen coords to canvas percentage
        const canvasX = screenX / scaleX;
        const canvasY = screenY / scaleY;
        const percentX = Math.max(0, Math.min(100, (canvasX / canvas.width) * 100));
        const percentY = Math.max(0, Math.min(100, (canvasY / canvas.height) * 100));

        updateModuleParams(focusedModuleId, {
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
        updateModuleParams(focusedModuleId, {
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
    containerRef,
    displayWidth,
    displayHeight,
    panX,
    panY,
    focusedModuleId,
    updateModuleParams,
    canvas.width,
    canvas.height,
    scaleX,
    scaleY,
    centerScreenX,
    centerScreenY,
  ]);

  // CONDITIONAL RETURN AFTER ALL HOOKS
  if (!falloffEnabled) {
    return null;
  }

  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        width: displayWidth,
        height: displayHeight,
        left: '50%',
        top: '50%',
        transform: `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px))`,
      }}
    >
      {/* Radius circle (dashed) */}
      <circle
        cx={centerScreenX}
        cy={centerScreenY}
        r={radiusScreen}
        fill="none"
        stroke="rgba(59, 130, 246, 0.5)"
        strokeWidth={2}
        strokeDasharray="6 4"
        className="pointer-events-none"
      />

      {/* Radius drag handle (invisible larger area) */}
      <circle
        cx={centerScreenX + radiusScreen}
        cy={centerScreenY}
        r={12}
        fill="transparent"
        className="pointer-events-auto cursor-ew-resize"
        onMouseDown={handleRadiusMouseDown}
      />

      {/* Radius drag handle (visible) */}
      <circle
        cx={centerScreenX + radiusScreen}
        cy={centerScreenY}
        r={5}
        fill="white"
        stroke="rgba(59, 130, 246, 0.8)"
        strokeWidth={2}
        className="pointer-events-none"
      />

      {/* Center crosshair */}
      <g className="pointer-events-none">
        <line
          x1={centerScreenX - 10}
          y1={centerScreenY}
          x2={centerScreenX + 10}
          y2={centerScreenY}
          stroke="rgba(59, 130, 246, 0.8)"
          strokeWidth={2}
        />
        <line
          x1={centerScreenX}
          y1={centerScreenY - 10}
          x2={centerScreenX}
          y2={centerScreenY + 10}
          stroke="rgba(59, 130, 246, 0.8)"
          strokeWidth={2}
        />
      </g>

      {/* Center drag handle (invisible larger area) */}
      <circle
        cx={centerScreenX}
        cy={centerScreenY}
        r={15}
        fill="transparent"
        className="pointer-events-auto cursor-move"
        onMouseDown={handleCenterMouseDown}
      />

      {/* Center point */}
      <circle
        cx={centerScreenX}
        cy={centerScreenY}
        r={6}
        fill="rgba(59, 130, 246, 0.9)"
        stroke="white"
        strokeWidth={2}
        className="pointer-events-none"
      />
    </svg>
  );
}
