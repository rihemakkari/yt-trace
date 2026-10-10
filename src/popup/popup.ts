import { formatDuration, secondsPerDay } from "../stats";
import { loadWatches } from "../storage";

async function render(): Promise<void> {
  const [today] = secondsPerDay(await loadWatches(), 1);
  document.getElementById("today")!.textContent = `Today: ${formatDuration(today.seconds)}`;
}

void render();
