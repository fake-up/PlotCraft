import type { PlotStats as PlotStatsType } from '../svg/plotprep';

interface PlotStatsProps {
  stats: PlotStatsType;
}

function formatDistance(mm: number): string {
  if (mm >= 1000) {
    return `${(mm / 1000).toFixed(2)} m`;
  }
  return `${mm.toFixed(1)} mm`;
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (minutes < 60) {
    return `${minutes}m ${secs}s`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function formatReduction(before: number, after: number): string {
  if (before === 0) return '';
  const reduction = ((before - after) / before) * 100;
  if (reduction <= 0) return '';
  return `(-${reduction.toFixed(0)}%)`;
}

export function PlotStats({ stats }: PlotStatsProps) {
  const pathReduction = formatReduction(stats.pathCountBefore, stats.pathCountAfter);
  const pointReduction = formatReduction(stats.pointCountBefore, stats.pointCountAfter);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs">
      <h4 className="font-medium text-gray-700 mb-2">Optimization Results</h4>

      <div className="space-y-1.5 text-gray-600">
        <div className="flex justify-between">
          <span>Paths:</span>
          <span>
            {stats.pathCountBefore} → {stats.pathCountAfter}
            {pathReduction && (
              <span className="text-green-600 ml-1">{pathReduction}</span>
            )}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Points:</span>
          <span>
            {stats.pointCountBefore.toLocaleString()} → {stats.pointCountAfter.toLocaleString()}
            {pointReduction && (
              <span className="text-green-600 ml-1">{pointReduction}</span>
            )}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Draw distance:</span>
          <span>{formatDistance(stats.drawDistance)}</span>
        </div>

        <div className="flex justify-between">
          <span>Travel distance:</span>
          <span>{formatDistance(stats.travelDistance)}</span>
        </div>

        <div className="flex justify-between font-medium text-gray-700 pt-1 border-t border-gray-200">
          <span>Estimated time:</span>
          <span>{formatTime(stats.estimatedTime)}</span>
        </div>
      </div>
    </div>
  );
}
