import { useId } from "react";
import { useLiveScene } from "../../lib/useLiveScene";
import { SensorNode, WheatPlant } from "./parts";

const PANELS = [
  { x: 28, w: 120 },
  { x: 172, w: 120 },
];

// 22 of 24 hours lit: the arc length of the clock badge's light ring.
const RING_R = 15;
const RING_C = 2 * Math.PI * RING_R;
const LIT = (22 / 24) * RING_C;

export default function SpeedBreedingArt({ animated = true, className = "" }) {
  const id = useId().replace(/:/g, "");
  const [ref, live] = useLiveScene(animated);

  return (
    <svg
      viewBox="0 0 320 180"
      ref={ref}
      className={`art ${live ? "art-animated" : ""} ${className}`}
      role="img"
      aria-label="Speed breeding room with wheat under pink LED panels on a 22 hour photoperiod"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${id}-room`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--art-sb-room)" }} />
          <stop offset="1" style={{ stopColor: "var(--art-sb-room-2)" }} />
        </linearGradient>
        <linearGradient id={`${id}-cone`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--art-sb-glow)" }} />
          <stop offset="1" style={{ stopColor: "var(--art-sb-glow)", stopOpacity: 0 }} />
        </linearGradient>
      </defs>

      <rect width="320" height="180" fill={`url(#${id}-room)`} />

      {/* LED panels and the light they throw */}
      {PANELS.map((p, i) => (
        <g key={p.x}>
          <path
            d={`M${p.x + 6} 30 H${p.x + p.w - 6} L${p.x + p.w + 10} 150 H${p.x - 10} Z`}
            fill={`url(#${id}-cone)`}
            className="a-glow"
            style={{ animationDelay: `${i * 0.6}s` }}
          />
          <line x1={p.x + 20} y1="0" x2={p.x + 20} y2="22" stroke="#7c6a99" strokeWidth="1.2" />
          <line x1={p.x + p.w - 20} y1="0" x2={p.x + p.w - 20} y2="22" stroke="#7c6a99" strokeWidth="1.2" />
          <rect x={p.x} y="22" width={p.w} height="9" rx="3" fill="#3d2f57" />
          {Array.from({ length: 10 }, (_, k) => (
            <circle
              key={k}
              cx={p.x + 8 + k * ((p.w - 16) / 9)}
              cy="28"
              r="2"
              className="f-sbled a-glow"
              style={{ animationDelay: `${(k % 3) * 0.25 + i * 0.6}s` }}
            />
          ))}
        </g>
      ))}

      {/* Trays of wheat at heading */}
      {[18, 166].map((tx) => (
        <g key={tx}>
          <rect x={tx} y="150" width="136" height="10" rx="2" fill="#5a4535" />
          {Array.from({ length: 7 }, (_, k) => (
            <WheatPlant key={k} x={tx + 12 + k * 18.5} y={150} s={0.95} delay={k * 0.28 + tx * 0.002} />
          ))}
        </g>
      ))}
      <rect y="160" width="320" height="20" fill="#1a1328" />

      {/* Photoperiod clock: 22 h light, 2 h dark */}
      <g transform="translate(160 66)">
        <circle r="22" fill="rgba(20, 12, 32, 0.78)" stroke="rgba(240,171,252,0.35)" />
        <circle r={RING_R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
        <circle
          r={RING_R}
          fill="none"
          stroke="var(--art-sb-led)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${LIT} ${RING_C}`}
          transform="rotate(-90)"
        />
        <text y="2.5" textAnchor="middle" fill="#fdf4ff" style={{ font: "600 8px var(--mono)" }}>
          22h
        </text>
        <text y="10" textAnchor="middle" fill="#e9d5ff" style={{ font: "5px var(--mono)" }}>
          light
        </text>
      </g>

      <SensorNode x={300} y={160} />
    </svg>
  );
}
