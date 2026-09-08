import { formatDuration } from "../lib/scoring";
import type { SessionSummary } from "../data/types";

interface ChartProps {
  sessions: SessionSummary[];
  metric: "adjustedMs" | "penalties" | "pace" | "completion";
  title: string;
}

function values(sessions: SessionSummary[], metric: ChartProps["metric"]): number[] {
  const chronological = [...sessions].reverse();
  return chronological.map((session) => {
    if (metric === "adjustedMs") return session.adjustedMs / 1000;
    if (metric === "penalties") return session.penalties;
    if (metric === "pace") {
      return session.elapsedMs > 0 ? (session.collected * 60_000) / session.elapsedMs : 0;
    }
    return session.total > 0 ? (session.collected / session.total) * 100 : 0;
  });
}

function formatTick(metric: ChartProps["metric"], value: number): string {
  if (metric === "adjustedMs") return formatDuration(value * 1000);
  if (metric === "completion") return `${Math.round(value)}%`;
  if (metric === "pace") return value.toFixed(1);
  return String(Math.round(value));
}

export function Chart({ sessions, metric, title }: ChartProps) {
  const points = values(sessions, metric);
  const width = 320;
  const height = 140;
  const pad = 12;
  if (points.length === 0) {
    return (
      <section className="chart-card">
        <h3>{title}</h3>
        <p className="muted">No attempts yet. Finish a practice run to plot progress.</p>
      </section>
    );
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coords = points.map((value, index) => {
    const x = pad + (index * (width - pad * 2)) / Math.max(points.length - 1, 1);
    const y = height - pad - ((value - min) / span) * (height - pad * 2);
    return `${x},${y}`;
  });
  const last = points[points.length - 1] ?? 0;
  return (
    <section className="chart-card">
      <div className="chart-head">
        <h3>{title}</h3>
        <strong>{formatTick(metric, last)}</strong>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart" role="img" aria-label={title}>
        <polyline fill="none" stroke="currentColor" strokeWidth="2.5" points={coords.join(" ")} />
        {points.map((value, index) => {
          const x = pad + (index * (width - pad * 2)) / Math.max(points.length - 1, 1);
          const y = height - pad - ((value - min) / span) * (height - pad * 2);
          return <circle key={`${metric}-${index}`} cx={x} cy={y} r="3.2" />;
        })}
      </svg>
      <p className="muted chart-caption">
        {points.length} attempt{points.length === 1 ? "" : "s"} · oldest left, newest right
      </p>
    </section>
  );
}
