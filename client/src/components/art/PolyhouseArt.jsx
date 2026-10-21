import { useId } from "react";
import { useLiveScene } from "../../lib/useLiveScene";
import { SensorNode, TomatoPlant } from "./parts";

// Arc of the tunnel roof: an ellipse centred at (160, 98), 124 wide, 48 tall.
const RIBS = [76, 118, 160, 202, 244].map((x) => {
  const dx = (x - 160) / 124;
  return { x, top: 98 - 48 * Math.sqrt(1 - dx * dx) };
});

export default function PolyhouseArt({ animated = true, className = "" }) {
  const id = useId().replace(/:/g, "");
  const [ref, live] = useLiveScene(animated);

  return (
    <svg
      viewBox="0 0 320 180"
      ref={ref}
      className={`art ${live ? "art-animated" : ""} ${className}`}
      role="img"
      aria-label="Polyhouse tunnel with rows of tomato plants under a poly film roof"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--art-sky-top)" }} />
          <stop offset="1" style={{ stopColor: "var(--art-sky-bottom)" }} />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="320" height="180" fill={`url(#${id}-sky)`} />

      {/* Sun with slowly turning rays */}
      <g transform="translate(232 30)">
        <g className="a-spin-slow">
          {Array.from({ length: 10 }, (_, i) => (
            <line
              key={i}
              x1="0"
              y1="-19"
              x2="0"
              y2="-25"
              className="s-sun"
              transform={`rotate(${i * 36})`}
            />
          ))}
        </g>
        <circle r="13" className="f-sun" />
      </g>

      {/* Drifting clouds */}
      <g className="a-drift">
        <ellipse cx="64" cy="30" rx="20" ry="7" className="f-cloud" />
        <ellipse cx="78" cy="26" rx="13" ry="7" className="f-cloud" />
      </g>
      <g className="a-drift" style={{ animationDelay: "-6s" }}>
        <ellipse cx="190" cy="20" rx="16" ry="5.5" className="f-cloud" />
      </g>

      <rect y="148" width="320" height="32" className="f-ground" />

      {/* Back row, inside and behind the film */}
      {[70, 102, 134, 166, 198, 230].map((x, i) => (
        <TomatoPlant key={x} x={x} y={132} s={0.62} delay={i * 0.35} fruit={i % 2 === 0} />
      ))}

      {/* Front row, drip line and falling drops - all inside the tunnel */}
      <line x1="60" y1="152" x2="262" y2="152" className="s-rib" />
      {[84, 124, 164, 204, 244].map((x, i) => (
        <g key={x}>
          <TomatoPlant x={x} y={151} s={0.95} delay={i * 0.4 + 0.2} />
          <circle cx={x + 7} cy="154" r="1.3" className="a-drop" style={{ fill: "var(--cyan)", animationDelay: `${i * 0.35}s` }} />
        </g>
      ))}

      {/* Tunnel: film, ribs, base rail */}
      <path d="M36 150 V98 A124 48 0 0 1 284 98 V150 Z" className="f-film" />
      {RIBS.map((r) => (
        <line key={r.x} x1={r.x} y1="150" x2={r.x} y2={r.top} className="s-rib" />
      ))}
      <path d="M36 98 A124 48 0 0 1 284 98" fill="none" className="s-frame" />
      <path d="M50 92 A112 40 0 0 1 150 56" fill="none" stroke={`url(#${id}-sheen)`} strokeWidth="5" strokeLinecap="round" />
      <rect x="36" y="146" width="248" height="4" rx="1" className="f-frame" />

      {/* Exhaust fan on the end wall */}
      <g transform="translate(56 118)">
        <circle r="10" className="f-metal" />
        <g className="a-spin">
          {[0, 120, 240].map((a) => (
            <ellipse key={a} cx="0" cy="-4.5" rx="2.6" ry="5" className="f-frame" transform={`rotate(${a})`} />
          ))}
        </g>
        <circle r="1.8" className="f-frame" />
      </g>

      <SensorNode x={292} y={150} />
    </svg>
  );
}
