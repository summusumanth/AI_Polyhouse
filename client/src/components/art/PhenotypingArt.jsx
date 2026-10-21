import { useId } from "react";
import { useLiveScene } from "../../lib/useLiveScene";
import { Pot, TomatoPlant } from "./parts";

const PLANTS = [
  { x: 80, s: 0.8, h: "28 cm" },
  { x: 128, s: 1.05, h: "37 cm" },
  { x: 176, s: 0.92, h: "33 cm" },
  { x: 224, s: 1.15, h: "41 cm" },
];

export default function PhenotypingArt({ animated = true, className = "" }) {
  const id = useId().replace(/:/g, "");
  const [ref, live] = useLiveScene(animated);

  return (
    <svg
      viewBox="0 0 320 180"
      ref={ref}
      className={`art ${live ? "art-animated" : ""} ${className}`}
      role="img"
      aria-label="Imaging gantry scanning a row of plants and measuring their height"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--art-wall)" }} />
          <stop offset="1" style={{ stopColor: "var(--art-wall-2)" }} />
        </linearGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--art-scan)" }} />
          <stop offset="1" style={{ stopColor: "var(--art-scan)", stopOpacity: 0 }} />
        </linearGradient>
      </defs>

      <rect width="320" height="180" fill={`url(#${id}-wall)`} />

      {/* Gantry frame */}
      <rect x="36" y="20" width="248" height="6" rx="2" className="f-metal" />
      <rect x="40" y="26" width="5" height="128" className="f-metal2" />
      <rect x="275" y="26" width="5" height="128" className="f-metal2" />

      {/* Plants on the bench, each with a measured bounding box */}
      {PLANTS.map((p, i) => {
        const top = 140 - 36 * p.s;
        return (
          <g key={p.x}>
            <TomatoPlant x={p.x} y={140} s={p.s} delay={i * 0.4} fruit={i % 2 === 1} />
            <Pot x={p.x} y={149} w={18} />
            <rect
              x={p.x - 13 * p.s}
              y={top - 2}
              width={26 * p.s}
              height={142 - top}
              className="s-accent s-dash"
              rx="2"
            />
            <text x={p.x} y={top - 6} textAnchor="middle" className="t-ink">
              {p.h}
            </text>
          </g>
        );
      })}
      <rect x="44" y="149" width="232" height="6" rx="2" className="f-metal" />
      <rect y="155" width="320" height="25" className="f-wall2" />

      {/* Camera carriage riding the gantry, with its imaging beam */}
      <g className="a-gantry">
        <path d="M70 34 L54 140 H112 L96 34 Z" fill={`url(#${id}-beam)`} opacity="0.55" />
        <line x1="56" y1="58" x2="110" y2="58" className="s-scan a-scanline" />
        <rect x="68" y="18" width="30" height="16" rx="3" className="f-screen" />
        <circle cx="83" cy="34" r="5" className="f-metal" />
        <circle cx="83" cy="34" r="2.6" style={{ fill: "var(--cyan)" }} />
        <circle cx="93" cy="23" r="1.4" className="a-blink" style={{ fill: "var(--rose)" }} />
      </g>

      {/* Measurements rising into a growth chart */}
      <g transform="translate(250 62)">
        <rect x="-26" y="-14" width="58" height="40" rx="5" className="f-metal" />
        <polyline points="-20,18 -10,12 0,6 10,-2 20,-7" className="s-accent" strokeLinecap="round" />
        {[-20, -10, 0, 10, 20].map((x, i) => (
          <circle key={x} cx={x} cy={[18, 12, 6, -2, -7][i]} r="1.8" className="f-accent" />
        ))}
      </g>
      {[0, 1.1, 2.2].map((delay, i) => (
        <circle
          key={delay}
          cx={190 + i * 14}
          cy="80"
          r="2"
          className="a-rise"
          style={{ fill: "var(--accent)", animationDelay: `${delay}s` }}
        />
      ))}
    </svg>
  );
}
