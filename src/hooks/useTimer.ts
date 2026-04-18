import { useEffect, useState } from "react";

// Emits elapsed milliseconds since `startedAt`, stopping at `stoppedAt` if set.
// Ticks every 100ms while running.
export const useElapsed = (
  startedAt: number | null,
  stoppedAt: number | null,
): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt == null || stoppedAt != null) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [startedAt, stoppedAt]);

  if (startedAt == null) return 0;
  const end = stoppedAt ?? now;
  return Math.max(0, end - startedAt);
};

export const formatElapsed = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
};
