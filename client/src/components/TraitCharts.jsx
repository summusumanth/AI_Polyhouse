import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "../lib/theme";
import { GENOTYPE_COLORS, TRAITS, formatTrait } from "../lib/facility";

function useChartColors() {
  const { theme } = useTheme();
  return theme === "light"
    ? { axis: "#7d978b", grid: "rgba(6,95,70,0.1)" }
    : { axis: "#6b8779", grid: "rgba(110,231,183,0.09)" };
}

export function genotypeColor(genotypes, name) {
  const i = genotypes.indexOf(name);
  return GENOTYPE_COLORS[(i < 0 ? 0 : i) % GENOTYPE_COLORS.length];
}

const shortDate = (v) =>
  new Date(v).toLocaleDateString(undefined, { day: "2-digit", month: "short" });

function TraitTooltip({ active, payload, label, trait }) {
  if (!active || !payload?.length) return null;
  const meta = TRAITS[trait];
  return (
    <div className="chart-tooltip">
      <div className="faint" style={{ marginBottom: 6 }}>
        {shortDate(label)}
      </div>
      {[...payload]
        .sort((a, b) => b.value - a.value)
        .map((entry) => (
          <div key={entry.dataKey} className="chart-tooltip-row">
            <span className="chart-swatch" style={{ background: entry.color }} aria-hidden="true" />
            {entry.dataKey}: <strong>{formatTrait(trait, entry.value)}</strong> {meta?.unit}
          </div>
        ))}
    </div>
  );
}

// One line per genotype: how a trait develops over the trial.
export function GrowthCurves({ observations, trait, genotypes }) {
  const colors = useChartColors();

  // Pivot [{date, genotype, value}] into [{date, "IR64": 81, "N22": 75}]
  const byDate = new Map();
  for (const o of observations) {
    if (o[trait] === null || o[trait] === undefined) continue;
    const key = new Date(o.date).toISOString().slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, { date: key });
    byDate.get(key)[o.genotype] = o[trait];
  }
  const data = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  if (!data.length) {
    return <div className="empty faint">No observations recorded for this trait.</div>;
  }

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 10, left: -14, bottom: 0 }}>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fill: colors.axis, fontSize: 11 }}
            stroke={colors.grid}
            tickLine={false}
          />
          <YAxis tick={{ fill: colors.axis, fontSize: 11 }} stroke={colors.grid} tickLine={false} />
          <Tooltip content={<TraitTooltip trait={trait} />} />
          {genotypes.map((g) => (
            <Line
              key={g}
              type="monotone"
              dataKey={g}
              stroke={genotypeColor(genotypes, g)}
              strokeWidth={2.4}
              dot={{ r: 3.5, strokeWidth: 0, fill: genotypeColor(genotypes, g) }}
              activeDot={{ r: 5.5 }}
              animationDuration={1100}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Latest value per genotype, best first.
export function TraitRanking({ rows, trait }) {
  const colors = useChartColors();
  const meta = TRAITS[trait];
  const data = rows
    .filter((r) => r[trait] !== null && r[trait] !== undefined)
    .map((r) => ({ name: r.genotype, facility: r.facilityName, value: r[trait] }))
    .sort((a, b) => b.value - a.value);

  if (!data.length) {
    return <div className="empty faint">No values for this trait yet.</div>;
  }

  const names = data.map((d) => d.name);

  return (
    <div style={{ width: "100%", height: Math.max(200, data.length * 34 + 30) }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 10, bottom: 0 }}>
          <CartesianGrid stroke={colors.grid} horizontal={false} />
          <XAxis type="number" tick={{ fill: colors.axis, fontSize: 11 }} stroke={colors.grid} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={104}
            tick={{ fill: colors.axis, fontSize: 12 }}
            stroke={colors.grid}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(16,185,129,0.06)" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="chart-tooltip">
                  <strong>{payload[0].payload.name}</strong>
                  <div className="faint">{payload[0].payload.facility}</div>
                  <div className="mono" style={{ marginTop: 4 }}>
                    {meta.label}: {formatTrait(trait, payload[0].value)} {meta.unit}
                  </div>
                </div>
              ) : null
            }
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={900}>
            {data.map((d) => (
              <Cell key={`${d.facility}-${d.name}`} fill={genotypeColor(names, d.name)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
