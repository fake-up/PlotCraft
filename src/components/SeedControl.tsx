import { usePlotCraftStore } from '../store';

export function SeedControl() {
  const {
    seed,
    setSeed,
    randomizeSeed,
    autoRegenerate,
    setAutoRegenerate,
    pendingRegenerate,
    regenerate,
  } = usePlotCraftStore();

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] uppercase text-[#888] font-medium">
          Random Seed
        </h3>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRegenerate}
            onChange={(e) => setAutoRegenerate(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-300"
          />
          <span className="text-[10px] text-gray-500">Auto</span>
        </label>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          value={seed}
          onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
          className="flex-1 px-3 py-2 text-sm border border-[#E5E5E5] rounded-md font-mono"
        />
        <button
          onClick={randomizeSeed}
          className="px-3 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
          title="Generate new random seed"
        >
          Dice
        </button>
        {!autoRegenerate && (
          <button
            onClick={regenerate}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              pendingRegenerate
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title="Regenerate preview"
          >
            {pendingRegenerate ? 'Apply' : 'Regen'}
          </button>
        )}
      </div>
    </div>
  );
}
