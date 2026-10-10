import type { Watch } from "./types";

export interface DayGroup {
  date: Date;
  watches: Watch[];
}

export interface DayTotal {
  date: Date;
  seconds: number;
}

export interface ChannelTotal {
  channel: string;
  seconds: number;
}

// Days are local-time calendar days; a watch belongs to the day it started.
const dayKey = (date: Date): string => date.toDateString();

export function totalSeconds(watches: Watch[]): number {
  return watches.reduce((sum, watch) => sum + watch.secondsWatched, 0);
}

/** Groups watches by day, preserving the input order. */
export function groupByDay(watches: Watch[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const watch of watches) {
    const date = new Date(watch.startedAt);
    const key = dayKey(date);
    let group = groups.get(key);
    if (!group) groups.set(key, (group = { date, watches: [] }));
    group.watches.push(watch);
  }
  return [...groups.values()];
}

/** One entry per day for the last `days` days, oldest first, including empty days. */
export function secondsPerDay(watches: Watch[], days: number, now = new Date()): DayTotal[] {
  const byDay = new Map<string, number>();
  for (const watch of watches) {
    const key = dayKey(new Date(watch.startedAt));
    byDay.set(key, (byDay.get(key) ?? 0) + watch.secondsWatched);
  }
  const totals: DayTotal[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    totals.push({ date, seconds: byDay.get(dayKey(date)) ?? 0 });
  }
  return totals;
}

export function topChannels(watches: Watch[], count: number): ChannelTotal[] {
  const byChannel = new Map<string, number>();
  for (const watch of watches) {
    const channel = watch.channel || "Unknown channel";
    byChannel.set(channel, (byChannel.get(channel) ?? 0) + watch.secondsWatched);
  }
  return [...byChannel]
    .map(([channel, seconds]) => ({ channel, seconds }))
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, count);
}

/** "45s", "12m" or "1h 05m". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}
