export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function sessionElapsedMs(input: {
  startedAt: number;
  pausedMs: number;
  pausedAt?: number;
  finishedAt?: number;
  now?: number;
}): number {
  const now = input.finishedAt ?? input.now ?? Date.now();
  const pausedNow = input.pausedAt ? now - input.pausedAt : 0;
  return Math.max(0, now - input.startedAt - input.pausedMs - pausedNow);
}

export function adjustedMs(elapsedMs: number, penaltySeconds: number): number {
  return elapsedMs + penaltySeconds * 1000;
}

export function checksPerMinute(collected: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return (collected * 60_000) / elapsedMs;
}

export function completionRate(collected: number, total: number): number {
  if (total <= 0) return 0;
  return collected / total;
}
