interface SelectionBoxProps {
  start: { x: number; y: number };
  end: { x: number; y: number };
  panOffset: { x: number; y: number };
  zoom: number;
}

export function SelectionBox({ start, end, panOffset, zoom }: SelectionBoxProps) {
  const left = Math.min(start.x, end.x) * zoom + panOffset.x;
  const top = Math.min(start.y, end.y) * zoom + panOffset.y;
  const width = Math.abs(end.x - start.x) * zoom;
  const height = Math.abs(end.y - start.y) * zoom;

  if (width < 5 && height < 5) return null;

  return (
    <div
      className="absolute border-2 pointer-events-none"
      style={{
        left,
        top,
        width,
        height,
        borderColor: '#60A5FA',
        backgroundColor: 'rgba(96, 165, 250, 0.15)',
      }}
    />
  );
}
