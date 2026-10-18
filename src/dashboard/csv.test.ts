import { describe, expect, it } from "vitest";
import type { Watch } from "../types";
import { csvField, toCsv } from "./csv";

describe("csvField", () => {
  it.each([
    ["plain", "plain"],
    ["", ""],
    ["Café déjà vu", "Café déjà vu"],
    ["a, b", '"a, b"'],
    ['say "hi"', '"say ""hi"""'],
    ['"', '""""'],
    ["line\nbreak", '"line\nbreak"'],
    ["line\r\nbreak", '"line\r\nbreak"'],
  ])("escapes %j as %j", (value, expected) => {
    expect(csvField(value)).toBe(expected);
  });

  it.each([
    ["=HYPERLINK(1)", "'=HYPERLINK(1)"],
    ["+1", "'+1"],
    ["-5 tips", "'-5 tips"],
    ["@user", "'@user"],
    ["\tTab", "'\tTab"],
    ['=A1,"x"', `"'=A1,""x"""`],
  ])("neutralises formula-like %j as %j", (value, expected) => {
    expect(csvField(value)).toBe(expected);
  });
});

describe("toCsv", () => {
  const watch: Watch = {
    id: "1760000000000-abc",
    videoId: "abc",
    title: 'Rock, "Paper"',
    channel: "Chaîne",
    startedAt: Date.UTC(2026, 9, 18, 14, 30),
    secondsWatched: 125,
  };

  it("writes a header and one row per watch with CRLF line endings", () => {
    expect(toCsv([watch])).toBe(
      "video_id,title,channel,started_at,seconds_watched\r\n" +
        'abc,"Rock, ""Paper""",Chaîne,2026-10-18T14:30:00.000Z,125\r\n',
    );
  });

  it("writes only the header for no watches", () => {
    expect(toCsv([])).toBe("video_id,title,channel,started_at,seconds_watched\r\n");
  });
});
