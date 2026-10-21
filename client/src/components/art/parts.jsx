// Building blocks shared by the facility scenes. Coordinates are in the
// scene's 320x180 viewBox; each part is drawn around its base at (0, 0).

export function TomatoPlant({ x, y, s = 1, delay = 0, fruit = true }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="a-sway" style={{ animationDelay: `${delay}s` }}>
        <path d="M0 0 V-32" className="s-stem" />
        <ellipse cx="-7" cy="-11" rx="7.5" ry="3.4" transform="rotate(-28 -7 -11)" className="f-leaf" />
        <ellipse cx="7" cy="-17" rx="7.5" ry="3.4" transform="rotate(26 7 -17)" className="f-leaf2" />
        <ellipse cx="-6" cy="-24" rx="6.5" ry="3" transform="rotate(-32 -6 -24)" className="f-leaf2" />
        <ellipse cx="5" cy="-30" rx="5.5" ry="2.8" transform="rotate(22 5 -30)" className="f-leaf" />
        <ellipse cx="0" cy="-34" rx="3.6" ry="2.4" className="f-leaf3" />
        {fruit && (
          <>
            <circle cx="-3" cy="-15" r="2.7" className="f-fruit" />
            <circle cx="2.6" cy="-8.5" r="2.3" className="f-fruit" />
            <circle cx="4" cy="-22" r="2" className="f-fruit" />
          </>
        )}
      </g>
    </g>
  );
}

// Rice: a clump of narrow, arching blades.
export function RicePlant({ x, y, s = 1, delay = 0 }) {
  const blades = [
    "M0 0 C-2 -10 -8 -18 -13 -21",
    "M0 0 C-1 -12 -4 -22 -6 -28",
    "M0 0 C0 -12 1 -24 0 -31",
    "M0 0 C1 -12 4 -22 7 -27",
    "M0 0 C2 -10 8 -17 13 -19",
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="a-sway" style={{ animationDelay: `${delay}s` }}>
        {blades.map((d, i) => (
          <path
            key={d}
            d={d}
            fill="none"
            strokeWidth="2.2"
            strokeLinecap="round"
            style={{ stroke: i % 2 ? "var(--art-leaf-2)" : "var(--art-leaf)" }}
          />
        ))}
      </g>
    </g>
  );
}

// Wheat: stalks topped with a grain ear, at heading stage.
export function WheatPlant({ x, y, s = 1, delay = 0 }) {
  const stalks = [
    { dx: -4, h: 34, tilt: -6 },
    { dx: 0, h: 40, tilt: 0 },
    { dx: 4, h: 36, tilt: 7 },
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="a-sway" style={{ animationDelay: `${delay}s` }}>
        <path d="M0 0 C-5 -6 -9 -9 -12 -10" className="s-stem" />
        <path d="M0 0 C5 -5 9 -8 12 -8" className="s-stem" />
        {stalks.map((k) => (
          <g key={k.dx} transform={`rotate(${k.tilt})`}>
            <path d={`M${k.dx} 0 V${-k.h}`} className="s-wheat" />
            {/* Ear: stacked grain pairs */}
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                <ellipse cx={k.dx - 1.6} cy={-k.h - 1 - i * 2.6} rx="1.5" ry="2.1" className="f-wheat" />
                <ellipse cx={k.dx + 1.6} cy={-k.h - 2.2 - i * 2.6} rx="1.5" ry="2.1" className="f-wheat2" />
              </g>
            ))}
            <path d={`M${k.dx} ${-k.h - 13} v-5`} className="s-wheat" />
          </g>
        ))}
      </g>
    </g>
  );
}

// IoT node on a stake: the board that reports to the API.
export function SensorNode({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 V-22" className="s-frame" />
      <rect x="-7" y="-33" width="14" height="11" rx="2.5" className="f-screen" />
      <circle cx="-2.5" cy="-27.5" r="1.4" className="a-blink" style={{ fill: "var(--accent)" }} />
      <circle cx="2.5" cy="-27.5" r="1.4" style={{ fill: "var(--art-screen-text)", opacity: 0.4 }} />
      {/* WiFi waves */}
      {[0, 0.7, 1.4].map((delay) => (
        <path
          key={delay}
          d="M-8 -38 Q0 -46 8 -38"
          className="a-wave s-accent"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </g>
  );
}

export function Pot({ x, y, w = 14 }) {
  return (
    <path
      d={`M${x - w / 2} ${y - 9} H${x + w / 2} L${x + w / 2 - 2} ${y} H${x - w / 2 + 2} Z`}
      style={{ fill: "var(--art-soil)" }}
    />
  );
}
