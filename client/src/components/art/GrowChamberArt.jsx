import { useId } from "react";
import { useLiveScene } from "../../lib/useLiveScene";
import { Pot, RicePlant, SensorNode } from "./parts";

// Three shelves inside the cabinet, each with its own LED bar.
const SHELVES = [
  { led: 38, floor: 76 },
  { led: 82, floor: 120 },
  { led: 126, floor: 160 },
];
const POT_X = [118, 142, 166, 190];

export default function GrowChamberArt({ animated = true, className = "" }) {
  const id = useId().replace(/:/g, "");
  const [ref, live] = useLiveScene(animated);

  return (
    <svg
      viewBox="0 0 320 180"
      ref={ref}
      className={`art ${live ? "art-animated" : ""} ${className}`}
      role="img"
      aria-label="Walk-in grow chamber with LED-lit shelves of rice plants"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--art-wall)" }} />
          <stop offset="1" style={{ stopColor: "var(--art-wall-2)" }} />
        </linearGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--art-led-glow)" }} />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="320" height="180" fill={`url(#${id}-wall)`} />
      <rect y="168" width="320" height="12" className="f-wall2" />

      {/* CO2 cylinder feeding the chamber */}
      <g transform="translate(58 96)">
        <rect x="-9" y="0" width="18" height="72" rx="8" className="f-metal" />
        <rect x="-4" y="-8" width="8" height="10" rx="2" className="f-frame" />
        <text x="0" y="40" textAnchor="middle" className="t-ink">
          CO₂
        </text>
        <path d="M4 -4 C20 -14 30 -10 32 2" className="s-frame" />
      </g>

      {/* Cabinet */}
      <rect x="90" y="16" width="140" height="154" rx="9" className="f-metal" />
      <rect x="100" y="26" width="104" height="138" rx="5" className="f-interior" />

      {SHELVES.map((shelf, si) => (
        <g key={shelf.led}>
          {/* Light falling onto the shelf */}
          <path
            d={`M104 ${shelf.led + 3} H200 L204 ${shelf.floor - 2} H100 Z`}
            fill={`url(#${id}-beam)`}
            className="a-glow"
            style={{ animationDelay: `${si * 0.5}s` }}
          />
          <rect x="104" y={shelf.led} width="96" height="4" rx="2" className="f-led a-glow" style={{ animationDelay: `${si * 0.5}s` }} />

          {POT_X.map((x, pi) => (
            <g key={x}>
              <RicePlant x={x} y={shelf.floor - 8} s={0.78} delay={(si + pi) * 0.3} />
              <Pot x={x} y={shelf.floor} />
            </g>
          ))}
          <rect x="100" y={shelf.floor} width="104" height="3" className="f-metal2" />
        </g>
      ))}

      {/* Glass door over the interior */}
      <rect x="100" y="26" width="104" height="138" rx="5" className="f-glass" />
      <path d="M108 32 L130 32 L112 70 L104 70 Z" fill="#fff" opacity="0.18" />

      {/* Control panel */}
      <rect x="208" y="30" width="16" height="70" rx="3" className="f-metal2" />
      <rect x="210" y="34" width="12" height="16" rx="2" className="f-screen" />
      <text x="216" y="45" textAnchor="middle" className="t-screen" style={{ fontSize: "5.5px" }}>
        30°
      </text>
      <circle cx="216" cy="58" r="2" className="a-blink" style={{ fill: "var(--accent)" }} />
      {[68, 76, 84].map((y) => (
        <rect key={y} x="211" y={y} width="10" height="4" rx="1.5" className="f-metal" />
      ))}

      {/* Air handling fan on top */}
      <g transform="translate(160 16)">
        <rect x="-16" y="-9" width="32" height="9" rx="2" className="f-metal2" />
        <g transform="translate(0 -4.5)">
          <g className="a-spin">
            {[0, 90, 180, 270].map((a) => (
              <ellipse key={a} cx="0" cy="-2" rx="1.2" ry="2.6" className="f-frame" transform={`rotate(${a})`} />
            ))}
          </g>
        </g>
      </g>

      <SensorNode x={262} y={168} />
    </svg>
  );
}
