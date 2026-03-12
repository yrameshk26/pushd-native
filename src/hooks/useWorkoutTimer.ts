import { useEffect } from 'react';
import { useWorkoutStore } from '../store/workout';

export function useWorkoutTimer() {
  const tick = useWorkoutStore((s) => s.tick);
  const active = useWorkoutStore((s) => s.active);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [active, tick]);
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
