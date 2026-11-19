import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

interface ChartSpec {
  type: "bar" | "line" | "area" | "pie";
  title?: string;
  data: Record<string, string | number>[];
}

function parseSpec(source: string): ChartSpec | null {
  try {
    const raw = JSON.parse(source) as Partial<ChartSpec>;
    if (!raw || !Array.isArray(raw.data) || raw.data.length === 0) return null;
    const type = raw.type && ["bar", "line", "area", "pie"].includes(raw.type) ? raw.type : "bar";
    const spec: ChartSpec = { type, data: raw.data };
    if (typeof raw.title === "string") spec.title = raw.title;
    return spec;
  } catch {
    return null;
  }
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--popover-foreground)",
  fontSize: 12,
};

export function ChartBlock({ source }: { source: string }) {
  const spec = parseSpec(source);
  if (!spec) {
    return (
      <pre className="my-4 overflow-x-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">{source}</pre>
    );
  }
  const first = spec.data[0] ?? {};
  const series = Object.keys(first).filter((k) => k !== "label" && typeof first[k] === "number");
  const tick = { fill: "var(--muted-foreground)", fontSize: 12 };

  return (
    <figure className="not-prose my-5 rounded-lg border border-border bg-background/60 p-4">
      {spec.title && (
        <figcaption className="mb-3 font-display text-base font-semibold text-foreground">{spec.title}</figcaption>
      )}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {spec.type === "pie" ? (
            <PieChart>
              <Pie data={spec.data} dataKey={series[0] ?? "value"} nameKey="label" innerRadius="45%" outerRadius="80%" paddingAngle={2}>
                {spec.data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="var(--background)" />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          ) : spec.type === "line" ? (
            <LineChart data={spec.data}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={tick} stroke="var(--border)" />
              <YAxis tick={tick} stroke="var(--border)" />
              <Tooltip contentStyle={tooltipStyle} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
              {series.map((s, i) => (
                <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={{ r: 3 }} />
              ))}
            </LineChart>
          ) : spec.type === "area" ? (
            <AreaChart data={spec.data}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={tick} stroke="var(--border)" />
              <YAxis tick={tick} stroke="var(--border)" />
              <Tooltip contentStyle={tooltipStyle} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
              {series.map((s, i) => (
                <Area key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.2} strokeWidth={2} />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={spec.data}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={tick} stroke="var(--border)" />
              <YAxis tick={tick} stroke="var(--border)" />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
              {series.map((s, i) => (
                <Bar key={s} dataKey={s} fill={COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
