import { formatDuration, groupByDay, secondsPerDay, topChannels, totalSeconds } from "../stats";
import { deleteAllWatches, loadWatches } from "../storage";
import type { ExportFile, Watch } from "../types";
import { renderBarChart } from "./chart";

const CHART_DAYS = 14;
const TOP_CHANNELS = 5;

const $ = (id: string): HTMLElement => document.getElementById(id)!;

function h<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function renderChannels(watches: Watch[]): void {
  const channels = topChannels(watches, TOP_CHANNELS);
  if (channels.length === 0) {
    $("channels").replaceChildren(h("li", "empty", "Nothing yet."));
    return;
  }
  const max = channels[0].seconds;
  $("channels").replaceChildren(
    ...channels.map(({ channel, seconds }) => {
      const row = h("li");
      const track = h("div");
      const bar = h("div", "channel-bar");
      bar.style.width = `${(seconds / max) * 100}%`;
      track.append(bar);
      row.append(h("span", "channel-name", channel), track, h("span", "channel-time", formatDuration(seconds)));
      return row;
    }),
  );
}

function renderTimeline(watches: Watch[]): void {
  if (watches.length === 0) {
    $("timeline").replaceChildren(h("p", "empty", "Nothing yet. Watch a video on YouTube for at least 10 seconds."));
    return;
  }
  $("timeline").replaceChildren(
    ...groupByDay(watches).map((group) => {
      const day = h("div", "day");
      const heading = h(
        "h3",
        "",
        group.date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
      );
      heading.append(h("span", "", formatDuration(totalSeconds(group.watches))));

      const list = h("ul");
      for (const watch of group.watches) {
        const time = new Date(watch.startedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
        const title = h("a", "watch-title", watch.title || watch.videoId);
        title.href = `https://www.youtube.com/watch?v=${encodeURIComponent(watch.videoId)}`;
        title.target = "_blank";
        title.rel = "noreferrer";
        const details = h("div");
        details.append(title, h("span", "watch-channel", watch.channel || "Unknown channel"));

        const row = h("li");
        row.append(h("span", "watch-time", time), details, h("span", "watch-duration", formatDuration(watch.secondsWatched)));
        list.append(row);
      }
      day.append(heading, list);
      return day;
    }),
  );
}

async function render(): Promise<void> {
  const watches = await loadWatches();
  $("summary").textContent = `${watches.length} videos, ${formatDuration(totalSeconds(watches))} watched`;
  renderBarChart($("chart"), secondsPerDay(watches, CHART_DAYS));
  renderChannels(watches);
  renderTimeline(watches);
}

async function exportJson(): Promise<void> {
  const file: ExportFile = { version: 1, exportedAt: new Date().toISOString(), watches: await loadWatches() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
  const link = h("a");
  link.href = url;
  link.download = `yt-trace-${file.exportedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function deleteAll(): Promise<void> {
  if (!confirm("Delete all recorded watch history? This cannot be undone.")) return;
  await deleteAllWatches();
}

$("export").addEventListener("click", () => void exportJson());
$("delete").addEventListener("click", () => void deleteAll());
// Also keeps the page live while a video is playing in another tab.
chrome.storage.onChanged.addListener(() => void render());
void render();
