import type { Watch } from "./types";

// One key per watch, so tabs never overwrite each other's records.
const PREFIX = "w:";

export async function saveWatch(watch: Watch): Promise<void> {
  await chrome.storage.local.set({ [PREFIX + watch.id]: watch });
}

/** All watches, newest first. */
export async function loadWatches(): Promise<Watch[]> {
  const all = await chrome.storage.local.get(null);
  return Object.entries(all)
    .filter(([key]) => key.startsWith(PREFIX))
    .map(([, value]) => value as Watch)
    .sort((a, b) => b.startedAt - a.startedAt);
}

export async function deleteAllWatches(): Promise<void> {
  const all = await chrome.storage.local.get(null);
  await chrome.storage.local.remove(Object.keys(all).filter((key) => key.startsWith(PREFIX)));
}
