# YT Trace

A small Chrome extension (Manifest V3) that records **your own** YouTube watch
history in your browser and shows it as a timeline and a chart.

Everything stays in `chrome.storage.local`. There is no server, the extension
makes no network requests, and there are no analytics.

## What it does

- Records each video you watch on `www.youtube.com`: video ID, title, channel,
  start time and the seconds it was actually playing.
- Ignores watches shorter than 10 seconds.
- Dashboard (toolbar icon → **Open dashboard**) with:
  - a timeline grouped by day, newest first,
  - minutes watched per day for the last 14 days,
  - top 5 channels by watch time,
  - **Export JSON** and **Delete all data** buttons.

## Install

```sh
npm install
npm run build
```

Then open `chrome://extensions`, turn on **Developer mode**, click
**Load unpacked** and pick the `dist/` folder.

`npm run watch` rebuilds on change; `npm run typecheck` runs the TypeScript
compiler. After a rebuild, reload the extension and any open YouTube tabs.

## Permissions

- `storage`, to keep the history locally.
- A content script on `https://www.youtube.com/*`.

Nothing else.

## How watch time is counted

- Wall-clock time while the video is playing, so 10 minutes at 2x speed counts
  as 10 minutes. Pauses, buffering and seeking add nothing.
- Time is not counted while an ad is showing.
- Every navigation to a video starts a new entry; replaying in place extends
  the current one.
- Shorts, hover previews, embedded players and `music.youtube.com` are not
  tracked.

## Data format

Each watch is stored under its own key, `w:<id>`:

```ts
interface Watch {
  id: string; // `${startedAt}-${videoId}`
  videoId: string;
  title: string;
  channel: string;
  startedAt: number; // epoch milliseconds
  secondsWatched: number;
}
```

The export is `{ "version": 1, "exportedAt": "<ISO date>", "watches": Watch[] }`.

## Project layout

```
src/
  manifest.json
  types.ts        Watch type and export format
  storage.ts      the only module that touches chrome.storage.local
  stats.ts        pure functions for grouping and totals
  content.ts      watch tracker that runs on YouTube
  popup/          toolbar popup
  dashboard/      dashboard page and SVG chart
build.mjs         esbuild script, outputs to dist/
```

Title and channel are read from YouTube's page markup. If YouTube changes it,
the selectors to update are at the top of `src/content.ts`.

## License

MIT
