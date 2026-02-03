import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useNodeStore } from '../../store/nodeStore';
import { buildSVG } from '../../svg/builder';
import { NodeFalloffControl } from './NodeFalloffControl';
import { NodeAttractorControl } from './NodeAttractorControl';
import { NodeRegionSelectControl } from './NodeRegionSelectControl';

interface PreviewPanelProps {
  className?: string;
}

export function PreviewPanel({ className = '' }: PreviewPanelProps) {
  const canvas = useNodeStore((s) => s.canvas);
  const outputLayers = useNodeStore((s) => s.outputLayers);
  const previewStrokeWidth = useNodeStore((s) => s.previewStrokeWidth);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  // Generate SVG for preview
  const previewSvg = useMemo(() => {
    if (outputLayers.length === 0) return '';
    return buildSVG(outputLayers, canvas, {
      strokeWidth: previewStrokeWidth,
      forExport: false,
    });
  }, [outputLayers, canvas, previewStrokeWidth]);

  // Canvas aspect ratio
  const canvasAspectRatio = useMemo(() => {
    return canvas.width / canvas.height;
  }, [canvas.width, canvas.height]);

  // Count paths
  const pathCount = useMemo(() => {
    return outputLayers.reduce((sum, layer) => sum + layer.paths.length, 0);
  }, [outputLayers]);

  const handleZoomIn = useCallback(() => {
    setPreviewZoom((z) => Math.min(4, z * 1.25));
  }, []);

  const handleZoomOut = useCallback(() => {
    setPreviewZoom((z) => Math.max(0.25, z / 1.25));
  }, []);

  const handleZoomFit = useCallback(() => {
    setPreviewZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Handle mouse wheel for zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setPreviewZoom((z) => Math.max(0.25, Math.min(4, z + delta)));
  }, []);

  // Handle pan start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: panOffset.x,
        offsetY: panOffset.y,
      };
    }
  }, [panOffset]);

  // Handle pan move
  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPanOffset({
        x: panStartRef.current.offsetX + dx,
        y: panStartRef.current.offsetY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning]);

  // Attach wheel listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  return (
    <div className={`flex flex-col bg-[#E0E0E0] ${className}`}>
      {/* Preview area - fills available space */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center"
        style={{ cursor: isPanning ? 'grabbing' : previewZoom > 1 ? 'grab' : 'default' }}
        onMouseDown={handleMouseDown}
      >
        <div
          className="flex items-center justify-center p-4"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${previewZoom})`,
            transformOrigin: 'center center',
          }}
        >
          {previewSvg ? (
            <div
              ref={canvasRef}
              className="bg-white flex items-center justify-center"
              style={{
                aspectRatio: `${canvasAspectRatio}`,
                width: canvasAspectRatio >= 1 ? '80%' : 'auto',
                height: canvasAspectRatio < 1 ? '80%' : 'auto',
                maxWidth: '90%',
                maxHeight: '90%',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.1)',
              }}
              dangerouslySetInnerHTML={{ __html: previewSvg }}
            />
          ) : (
            <div
              ref={canvasRef}
              className="flex items-center justify-center bg-white"
              style={{
                aspectRatio: `${canvasAspectRatio}`,
                width: canvasAspectRatio >= 1 ? '60%' : 'auto',
                height: canvasAspectRatio < 1 ? '60%' : 'auto',
                maxWidth: '90%',
                maxHeight: '90%',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.1)',
              }}
            >
              <span className="text-gray-400 text-sm">Add an Output node</span>
            </div>
          )}
        </div>

        {/* Falloff control overlay */}
        <NodeFalloffControl
          containerRef={containerRef}
          canvasRef={canvasRef}
          previewZoom={previewZoom}
          panOffset={panOffset}
        />

        {/* Attractor control overlay */}
        <NodeAttractorControl
          containerRef={containerRef}
          canvasRef={canvasRef}
          previewZoom={previewZoom}
          panOffset={panOffset}
        />

        {/* Region Select control overlay */}
        <NodeRegionSelectControl
          containerRef={containerRef}
          canvasRef={canvasRef}
          previewZoom={previewZoom}
          panOffset={panOffset}
        />

        {/* Info overlay - top left */}
        <div className="absolute top-3 left-3 flex items-center gap-3 text-xs pointer-events-none">
          <span className="px-2 py-1 bg-white/90 rounded shadow-sm text-gray-600">
            {canvas.width} x {canvas.height} mm
          </span>
          <span className="px-2 py-1 bg-white/90 rounded shadow-sm text-gray-600">
            {pathCount} paths
          </span>
          {outputLayers.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-white/90 rounded shadow-sm">
              {outputLayers.map((layer) => (
                <div
                  key={layer.id}
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: layer.color }}
                  title={`${layer.name}: ${layer.paths.length} paths`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Zoom controls - bottom right */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/90 rounded-lg shadow-sm p-1">
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Zoom out"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={handleZoomFit}
            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors min-w-[48px]"
            title="Reset to fit"
          >
            {Math.round(previewZoom * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Zoom in"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            onClick={handleZoomFit}
            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Reset to fit"
          >
            Fit
          </button>
        </div>
      </div>
    </div>
  );
}
