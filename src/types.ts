export interface Watch {
  /** `${startedAt}-${videoId}` */
  id: string;
  videoId: string;
  title: string;
  channel: string;
  /** Epoch milliseconds. */
  startedAt: number;
  /** Wall-clock seconds the video was actually playing (ads excluded). */
  secondsWatched: number;
}

export interface ExportFile {
  version: 1;
  exportedAt: string;
  watches: Watch[];
}
