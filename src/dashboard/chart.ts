import { formatDuration, type DayTotal } from "../stats";

const NS = "http://www.w3.org/2000/svg";
const WIDTH = 720;
const HEIGHT = 220;
const MARGIN = { top: 12, right: 8, bottom: 24, left: 40 };
const BAR_WIDTH = 24;
const BAR_RADIUS = 4;
const TICKS = 4;
// Candidate gaps between y-axis ticks, in minutes.
const TICK_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 180, 240, 360];

function svg(name: string, attrs: Record<string, string | number>, text = ""): SVGElement {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  node.textContent = text;
  return node;
}

const tickLabel = (minutes: number): string => (minutes < 60 ? `${minutes}m` : `${minutes / 60}h`);

const dayLabel = (date: Date): string =>
  date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Draws minutes watched per day as an SVG column chart, replacing the container's content. */
export function renderBarChart(container: HTMLElement, days: DayTotal[]): void {
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const baseline = MARGIN.top + plotHeight;
  const band = plotWidth / days.length;

  const maxMinutes = Math.max(...days.map((day) => day.seconds / 60));
  const step = TICK_STEPS.find((s) => s * TICKS >= maxMinutes) ?? Math.ceil(maxMinutes / TICKS / 60) * 60;
  const top = step * TICKS;
  const y = (minutes: number): number => baseline - (minutes / top) * plotHeight;

  const root = svg("svg", { viewBox: `0 0 ${WIDTH} ${HEIGHT}`, role: "img" });
  root.setAttribute("aria-label", "Minutes watched per day, last 14 days");

  for (let i = 0; i <= TICKS; i++) {
    const minutes = step * i;
    root.append(
      svg("line", {
        class: i === 0 ? "baseline" : "grid",
        x1: MARGIN.left,
        x2: WIDTH - MARGIN.right,
        y1: y(minutes),
        y2: y(minutes),
      }),
      svg("text", { x: MARGIN.left - 8, y: y(minutes) + 4, "text-anchor": "end" }, tickLabel(minutes)),
    );
  }

  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  tooltip.hidden = true;

  days.forEach((day, i) => {
    const center = MARGIN.left + band * (i + 0.5);
    const barTop = y(day.seconds / 60);

    if (day.seconds > 0) {
      const left = center - BAR_WIDTH / 2;
      const right = center + BAR_WIDTH / 2;
      const r = Math.min(BAR_RADIUS, baseline - barTop);
      // Rounded at the data end, square at the baseline.
      const d = `M${left},${baseline} V${barTop + r} Q${left},${barTop} ${left + r},${barTop} H${right - r} Q${right},${barTop} ${right},${barTop + r} V${baseline} Z`;
      root.append(svg("path", { class: "bar", d }));
    }
    root.append(svg("text", { x: center, y: HEIGHT - 6, "text-anchor": "middle" }, dayLabel(day.date)));

    // The whole column is the hover target, not just the bar.
    const hit = svg("rect", { class: "hit", x: center - band / 2, y: MARGIN.top, width: band, height: plotHeight });
    hit.addEventListener("mouseenter", () => {
      const scale = root.getBoundingClientRect().width / WIDTH;
      const weekday = day.date.toLocaleDateString(undefined, { weekday: "short" });
      tooltip.textContent = `${weekday}, ${dayLabel(day.date)}: ${formatDuration(day.seconds)}`;
      tooltip.style.left = `${center * scale}px`;
      tooltip.style.top = `${barTop * scale}px`;
      tooltip.hidden = false;
    });
    hit.addEventListener("mouseleave", () => (tooltip.hidden = true));
    root.append(hit);
  });

  container.replaceChildren(root, tooltip);
}
