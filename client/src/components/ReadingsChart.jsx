import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useRef } from "react";
import { useTheme } from "../lib/theme";
<<<<<<< HEAD
import { CHANNELS } from "../lib/facility";

const seriesFor = (keys) =>
  keys.map((key) => ({
    key,
    label: `${CHANNELS[key].label}${CHANNELS[key].unit ? ` (${CHANNELS[key].unit})` : ""}`,
    color: CHANNELS[key].color,
  }));
=======

const CLIMATE = [
  { key: "temp", label: "Temperature °C", color: "#f59e0b" },
  { key: "humidity", label: "Humidity %", color: "#0ea5e9" },
  { key: "moisture", label: "Soil moisture %", color: "#10b981" },
];

const LIGHT = [{ key: "lightInt", label: "Light (PPFD)", color: "#d946ef" }];

const NUTRIENTS = [
  { key: "N", label: "Nitrogen", color: "#10b981" },
  { key: "P", label: "Phosphorus", color: "#0ea5e9" },
  { key: "K", label: "Potassium", color: "#8b5cf6" },
];
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f

// Recharts needs real colour values, not CSS variables.
function useChartColors() {
  const { theme } = useTheme();
  return theme === "light"
    ? { axis: "#7d978b", grid: "rgba(6,95,70,0.1)" }
    : { axis: "#6b8779", grid: "rgba(110,231,183,0.09)" };
}

function formatTick(value, hours) {
  const d = new Date(value);
  if (hours <= 24) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString(undefined, { weekday: "short", hour: "2-digit" });
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="faint" style={{ marginBottom: 6 }}>
        {new Date(label).toLocaleString(undefined, {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="chart-tooltip-row">
          <span className="chart-swatch" style={{ background: entry.color }} aria-hidden="true" />
          {entry.name}: <strong>{entry.value}</strong>
        </div>
      ))}
    </div>
  );
}

function Legend({ series }) {
  return (
    <div className="chart-legend">
      {series.map((s) => (
        <span key={s.key} className="row" style={{ gap: 7 }}>
          <span className="chart-swatch" style={{ background: s.color }} aria-hidden="true" />
          <span className="muted">{s.label}</span>
        </span>
      ))}
    </div>
  );
}

// Draw the lines in once; later refreshes (every 20 s) update in place
// instead of replaying the animation.
function useFirstRender() {
  const first = useRef(true);
  useEffect(() => {
    first.current = false;
  }, []);
  return first.current;
}

function SeriesChart({ data, series, hours, height }) {
  const colors = useChartColors();
  const animate = useFirstRender();
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.32} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => formatTick(v, hours)}
            tick={{ fill: colors.axis, fontSize: 11 }}
            stroke={colors.grid}
            tickLine={false}
            minTickGap={36}
          />
          <YAxis tick={{ fill: colors.axis, fontSize: 11 }} stroke={colors.grid} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#fill-${s.key})`}
              dot={false}
              isAnimationActive={animate}
              animationDuration={900}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

<<<<<<< HEAD
// Any set of channels on one chart. Channels the board never reported are
// left out, and the legend only lists what is drawn.
export function ChannelChart({ data, keys, hours, height = 220 }) {
  const present = keys.filter((k) => data.some((row) => row[k] !== null && row[k] !== undefined));
  if (!data.length || !present.length) return <EmptyChart />;
  const series = seriesFor(present);
  return (
    <>
      <Legend series={series} />
      <SeriesChart data={data} series={series} hours={hours} height={height} />
=======
export function ClimateChart({ data, hours }) {
  if (!data.length) return <EmptyChart />;
  return (
    <>
      <Legend series={CLIMATE} />
      <SeriesChart data={data} series={CLIMATE} hours={hours} height={260} />
    </>
  );
}

// The light curve is where facilities differ most: a sun-shaped bell in a
// polyhouse, a square wave in a chamber, and a near-flat line under speed
// breeding with only a short dark gap.
export function LightChart({ data, hours }) {
  if (!data.length) return <EmptyChart />;
  return (
    <>
      <Legend series={LIGHT} />
      <SeriesChart data={data} series={LIGHT} hours={hours} height={150} />
    </>
  );
}

export function NutrientChart({ data, hours }) {
  if (!data.length) return <EmptyChart />;
  return (
    <>
      <Legend series={NUTRIENTS} />
      <SeriesChart data={data} series={NUTRIENTS} hours={hours} height={240} />
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
    </>
  );
}

function EmptyChart() {
  return (
    <div className="empty">
      <span>No readings in this window.</span>
      <span className="faint">Charts appear as soon as a sensor node reports in.</span>
    </div>
  );
}
