import { usePlotCraftStore } from '../store';

export function Toast() {
  const { toast } = usePlotCraftStore();

  if (!toast.visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-black text-white text-sm px-4 py-2 rounded-lg shadow-lg animate-fade-in">
        {toast.message}
      </div>
    </div>
  );
}
