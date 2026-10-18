import type { Watch } from "../types";

const COLUMNS = ["video_id", "title", "channel", "started_at", "seconds_watched"];

/**
 * One CSV field, per RFC 4180: quoted if it contains a quote, comma or line
 * break, with quotes doubled. Text starting with = + - @ or a tab/CR is
 * prefixed with ' so spreadsheets don't run it as a formula, since titles
 * and channel names come from YouTube.
 */
export function csvField(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) value = `'${value}`;
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** CSV text with a header row and CRLF line endings, without a BOM. */
export function toCsv(watches: Watch[]): string {
  const rows = watches.map((watch) =>
    [
      csvField(watch.videoId),
      csvField(watch.title),
      csvField(watch.channel),
      new Date(watch.startedAt).toISOString(),
      String(watch.secondsWatched),
    ].join(","),
  );
  return [COLUMNS.join(","), ...rows].join("\r\n") + "\r\n";
}
