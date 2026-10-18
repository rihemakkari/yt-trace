# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

YT Trace is a Manifest V3 Chrome extension that records the user's own YouTube watch history in `chrome.storage.local` and shows it on a dashboard page. It is deliberately local-only.

## Hard constraints

These are product requirements, not defaults to revisit:

- No network requests, no server, no analytics. This includes fetching thumbnails or fonts.
- No remote code or CDN scripts (MV3 forbids them). The chart is hand-written SVG.
- Permissions stay at `storage` plus the `https://www.youtube.com/*` content script match. Don't add `tabs`, `downloads`, `host_permissions` or a background service worker; the current features work without them (dashboard opens via a plain link, export uses a Blob and `<a download>`).
- No runtime dependencies. `package.json` has devDependencies only.
- Keep it small and readable; the repo is published on GitHub.

## Commands

```sh
npm run build      # bundle to dist/ (load this folder via chrome://extensions → Load unpacked)
npm run watch      # rebuild TypeScript on change
npm run typecheck  # tsc, noEmit
npm test           # vitest run (unit tests for stats.ts)
npm run lint       # eslint with typescript-eslint
```

- esbuild does not type-check, so run `npm run typecheck` as well as the build.
- Tests cover only pure logic: `src/stats.ts` and `src/dashboard/csv.ts`, each with a `.test.ts` next to it. Build test dates with the local-time `Date` constructor so they pass in any time zone.
- TypeScript is pinned to 6.x because typescript-eslint doesn't support TypeScript 7 yet.
- CI (`.github/workflows/ci.yml`) runs typecheck, lint, test and build on push and pull request, and uploads `dist/`.
- `build.mjs` copies the static files (`manifest.json`, HTML, CSS) once at startup, so in watch mode changes to those need a restart. A new static file must be added to the `statics` list there, and a new script to `entryPoints`.
- `dist/` is flat: HTML files reference `popup.js`, `dashboard.js` and `dashboard.css` by bare name, and the manifest references `content.js`.
- After rebuilding, the extension must be reloaded in Chrome and open YouTube tabs refreshed; this can't be verified from the command line.

## Architecture

Three bundles share `src/types.ts`, `src/storage.ts` and `src/stats.ts`:

- `src/content.ts` runs on YouTube and writes watches.
- `src/popup/` shows today's total and links to the dashboard.
- `src/dashboard/` reads watches and renders the timeline, chart (`chart.ts`) and top channels. `csv.ts` builds the CSV export and is pure, like `stats.ts`.

`storage.ts` is the only module that touches `chrome.storage.local`. `stats.ts` is pure (no DOM, no `chrome`), and takes watches already sorted newest first, which is how `loadWatches()` returns them.

### Storage model

Each watch is its own key, `w:<id>` with `id = ${startedAt}-${videoId}`, rather than one array. A tab only ever writes its own key, so several YouTube tabs can't clobber each other. Keep this property: don't introduce read-modify-write of shared keys from the content script.

Days are never stored. They are derived from `startedAt` in local time at render, and a watch belongs to the day it started.

The JSON export is `{ version: 1, exportedAt, watches }`. Bump `version` if the `Watch` shape changes. The CSV export (`video_id,title,channel,started_at,seconds_watched`) has no version field, so keep its columns stable; it is written with a UTF-8 BOM for Excel, and `csvField` also neutralises formula-like text.

### Watch tracking (`content.ts`)

- All state is module-level and there are no timers. Everything is driven by `timeupdate`, listened for on `document` in the capture phase (media events don't bubble), which also covers `<video>` elements created later.
- Only videos inside `#movie_player` count, which excludes hover previews and Shorts.
- Watch time is wall-clock time between consecutive `timeupdate` events while playing. Gaps over `MAX_TICK_SECONDS` (pause, stall, seek, throttling) are dropped, and nothing is counted while the player has the `ad-showing` class. Playback speed therefore doesn't inflate the total.
- A new watch starts when the URL moves to a `/watch?v=` video, detected by `yt-navigate-finish` and by a URL comparison on every `timeupdate` as a fallback. Navigating to a non-video URL does not end the watch, because playback may continue in the miniplayer.
- Nothing is written until a watch passes `MIN_SECONDS` (10). After that the record is rewritten every `SAVE_INTERVAL_MS` while playing, and on pause, tab hide, `pagehide` and before the next watch starts.
- Title and channel are read from the DOM at save time, not at navigation, and only when `ytd-watch-flexy[video-id]` matches the watch. Right after an in-app navigation the page still shows the previous video's details.
- The YouTube selectors are constants at the top of the file. They are the part most likely to break when YouTube changes its markup.

### Dashboard

- Rendering uses `textContent` and DOM/SVG node creation only, never `innerHTML`, since titles and channel names come from the page.
- The page re-renders on `chrome.storage.onChanged`, so "Delete all" and live updates need no explicit refresh.
- Colours are CSS custom properties in `dashboard.css` with a `prefers-color-scheme: dark` override; SVG elements are styled by class from there, not with inline colours.
