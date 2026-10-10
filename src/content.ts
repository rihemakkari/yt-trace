import { saveWatch } from "./storage";
import type { Watch } from "./types";

const MIN_SECONDS = 10;
const SAVE_INTERVAL_MS = 15_000;
// timeupdate fires about 4 times a second while playing. A longer gap means the
// video was paused, stalled or seeked, so that time is not counted.
const MAX_TICK_SECONDS = 2;

// YouTube's markup changes from time to time; these are the selectors to update.
const PLAYER = "#movie_player";
const AD_CLASS = "ad-showing";
const WATCH_PAGE = "ytd-watch-flexy";
const TITLE = "ytd-watch-metadata h1";
const CHANNEL = "ytd-watch-metadata ytd-channel-name a";

let current: Watch | null = null;
let onWatchPage = false;
let lastUrl = "";
let lastTick: number | null = null;
let lastSave = 0;
let dirty = false;

function urlVideoId(): string | null {
  return location.pathname === "/watch" ? new URLSearchParams(location.search).get("v") : null;
}

function text(selector: string): string {
  return document.querySelector(selector)?.textContent?.trim() ?? "";
}

function readMetadata(watch: Watch): void {
  // After in-app navigation the page can still show another video's details.
  if (document.querySelector(WATCH_PAGE)?.getAttribute("video-id") !== watch.videoId) return;
  watch.title = text(TITLE) || watch.title;
  watch.channel = text(CHANNEL) || watch.channel;
}

function save(): void {
  if (!current || !dirty || current.secondsWatched < MIN_SECONDS) return;
  readMetadata(current);
  dirty = false;
  lastSave = performance.now();
  // Fails only if the extension was reloaded under this page; nothing to do then.
  saveWatch({ ...current, secondsWatched: Math.round(current.secondsWatched) }).catch(() => {});
}

/** Starts a new watch when the URL moves to a video. */
function checkUrl(): void {
  if (location.href === lastUrl) return;
  lastUrl = location.href;

  const videoId = urlVideoId();
  if (!videoId) {
    // Keep the current watch: it may carry on in the miniplayer.
    onWatchPage = false;
    return;
  }
  if (onWatchPage && videoId === current?.videoId) return;

  save();
  onWatchPage = true;
  const startedAt = Date.now();
  current = { id: `${startedAt}-${videoId}`, videoId, title: "", channel: "", startedAt, secondsWatched: 0 };
  lastTick = null;
  dirty = false;
}

function onTimeUpdate(event: Event): void {
  checkUrl();
  const video = event.target;
  if (!current || !(video instanceof HTMLVideoElement)) return;
  // Only the main player counts, not hover previews or Shorts.
  const player = video.closest(PLAYER);
  if (!player) return;

  if (video.paused || player.classList.contains(AD_CLASS)) {
    lastTick = null;
    return;
  }
  const now = performance.now();
  if (lastTick !== null) {
    const elapsed = (now - lastTick) / 1000;
    if (elapsed <= MAX_TICK_SECONDS) {
      current.secondsWatched += elapsed;
      dirty = true;
    }
  }
  lastTick = now;
  if (now - lastSave >= SAVE_INTERVAL_MS) save();
}

function onPause(): void {
  lastTick = null;
  save();
}

// Media events don't bubble, so listen in the capture phase. This also covers
// <video> elements that YouTube creates later.
document.addEventListener("timeupdate", onTimeUpdate, true);
document.addEventListener("pause", onPause, true);
document.addEventListener("yt-navigate-finish", checkUrl);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) save();
});
window.addEventListener("pagehide", save);
checkUrl();
