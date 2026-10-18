import { describe, expect, it } from "vitest";
import { formatDuration, groupByDay, secondsPerDay, topChannels, totalSeconds } from "./stats";
import type { Watch } from "./types";

// Dates are built with the local-time Date constructor, so the tests pass in
// any time zone, matching how stats.ts derives days.
function watch(start: Date, secondsWatched: number, channel = "Channel"): Watch {
  const startedAt = start.getTime();
  return { id: `${startedAt}-vid`, videoId: "vid", title: "Title", channel, startedAt, secondsWatched };
}

const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);

describe("totalSeconds", () => {
  it("sums seconds watched", () => {
    expect(totalSeconds([watch(at(1, 9), 30), watch(at(2, 9), 45)])).toBe(75);
  });

  it("is 0 for no watches", () => {
    expect(totalSeconds([])).toBe(0);
  });
});

describe("groupByDay", () => {
  it("groups by local calendar day, preserving order", () => {
    const watches = [watch(at(18, 23, 59), 10), watch(at(18, 0, 0), 20), watch(at(17, 23, 59), 30)];
    const groups = groupByDay(watches);

    expect(groups).toHaveLength(2);
    expect(groups[0].date.toDateString()).toBe(at(18, 0).toDateString());
    expect(groups[0].watches).toEqual([watches[0], watches[1]]);
    expect(groups[1].date.toDateString()).toBe(at(17, 0).toDateString());
    expect(groups[1].watches).toEqual([watches[2]]);
  });

  it("puts a watch on the day it started, even if it ran past midnight", () => {
    const groups = groupByDay([watch(at(17, 23, 50), 3600)]);
    expect(groups[0].date.toDateString()).toBe(at(17, 0).toDateString());
  });

  it("returns no groups for no watches", () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe("secondsPerDay", () => {
  const now = at(18, 15);

  it("returns one entry per day, oldest first, including empty days", () => {
    const totals = secondsPerDay([watch(at(18, 9), 60), watch(at(18, 8), 30), watch(at(16, 20), 120)], 3, now);

    expect(totals.map((t) => t.date.toDateString())).toEqual([
      at(16, 0).toDateString(),
      at(17, 0).toDateString(),
      at(18, 0).toDateString(),
    ]);
    expect(totals.map((t) => t.seconds)).toEqual([120, 0, 90]);
  });

  it("returns dates at local midnight", () => {
    const [total] = secondsPerDay([], 1, now);
    expect(total.date).toEqual(at(18, 0));
  });

  it("ignores watches outside the range", () => {
    const totals = secondsPerDay([watch(at(10, 12), 500), watch(at(19, 12), 500)], 7, now);
    expect(totals.every((t) => t.seconds === 0)).toBe(true);
  });

  it("crosses month boundaries", () => {
    const totals = secondsPerDay([watch(new Date(2026, 8, 30, 12), 40)], 3, new Date(2026, 9, 1, 12));
    expect(totals.map((t) => t.date.getDate())).toEqual([29, 30, 1]);
    expect(totals.map((t) => t.seconds)).toEqual([0, 40, 0]);
  });
});

describe("topChannels", () => {
  it("sums per channel and sorts by total, descending", () => {
    const watches = [watch(at(1, 9), 10, "A"), watch(at(1, 10), 50, "B"), watch(at(2, 9), 30, "A")];
    expect(topChannels(watches, 5)).toEqual([
      { channel: "B", seconds: 50 },
      { channel: "A", seconds: 40 },
    ]);
  });

  it("limits the result to count", () => {
    const watches = [watch(at(1, 9), 3, "A"), watch(at(1, 9), 2, "B"), watch(at(1, 9), 1, "C")];
    expect(topChannels(watches, 2).map((c) => c.channel)).toEqual(["A", "B"]);
  });

  it("groups watches with no channel under a placeholder", () => {
    const watches = [watch(at(1, 9), 10, ""), watch(at(1, 10), 5, "")];
    expect(topChannels(watches, 5)).toEqual([{ channel: "Unknown channel", seconds: 15 }]);
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0s"],
    [45, "45s"],
    [59.4, "59s"],
    [60, "1m"],
    [12 * 60, "12m"],
    [59 * 60, "59m"],
    [3600, "1h 00m"],
    [3600 + 5 * 60, "1h 05m"],
    [25 * 3600, "25h 00m"],
  ])("formats %s seconds as %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});
