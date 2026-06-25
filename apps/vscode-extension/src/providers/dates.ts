const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function clampResetDay(resetDay: number): number {
  if (!Number.isFinite(resetDay)) {
    return 1;
  }
  return Math.max(1, Math.min(28, Math.floor(resetDay)));
}

export function calculateCurrentCycleStart(resetDay: number, now = new Date()): Date {
  const day = clampResetDay(resetDay);
  const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 0, 0, 0, 0));
  if (now.getTime() >= thisMonth.getTime()) {
    return thisMonth;
  }
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, day, 0, 0, 0, 0));
}

export function calculateNextResetAt(resetDay: number, now = new Date()): Date {
  const day = clampResetDay(resetDay);
  const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 0, 0, 0, 0));
  if (now.getTime() < thisMonth.getTime()) {
    return thisMonth;
  }
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, day, 0, 0, 0, 0));
}

export function hasResetDatePassed(nextResetAt: string | undefined, now = new Date()): boolean {
  if (!nextResetAt) {
    return false;
  }
  const resetAt = new Date(nextResetAt);
  return Number.isFinite(resetAt.getTime()) && resetAt.getTime() <= now.getTime();
}

export function addOneDay(date: Date): Date {
  return new Date(date.getTime() + MS_PER_DAY);
}
