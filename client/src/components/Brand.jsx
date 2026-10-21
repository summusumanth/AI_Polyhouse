import { useId } from "react";

/*
  The Polyhouse brand mark, drawn as SVG rather than loaded as an image so it
  stays sharp at any size, recolours with the theme, and costs one network
  request fewer. It follows the supplied logo: an arched glass house with
  plants and a fan inside, a leaf curving behind it, a green swoosh at the
  base, and the three sensor badges (temperature, water, airflow) on an arc.
*/

export function BrandMark({ size = 40, className = "", detailed = false }) {
  const id = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`brand-svg ${className}`}
      role="img"
      aria-label="Polyhouse"
    >
      <defs>
        <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5fc94a" />
          <stop offset="1" stopColor="#1f8a3b" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dff1fb" stopOpacity="0.95" />
          <stop offset="1" stopColor="#bfe3f5" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id={`${id}-swoosh`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3fae46" />
          <stop offset="1" stopColor="#1d7f3a" />
        </linearGradient>
        <linearGradient id={`${id}-steel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f6e9e" />
          <stop offset="1" stopColor="#1d4e78" />
        </linearGradient>
      </defs>

      {/* Leaf curving up behind the house */}
      <path
        d="M34 74 C16 62 20 30 46 18 C44 38 40 56 34 74 Z"
        fill={`url(#${id}-leaf)`}
      />
      <path
        d="M30 78 C22 60 28 38 48 24"
        fill="none"
        stroke="#187a33"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* Glass house: arched roof on a square base */}
      <path
        d="M30 88 V52 A30 26 0 0 1 90 52 V88 Z"
        fill={`url(#${id}-glass)`}
        stroke={`url(#${id}-steel)`}
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      {/* Frame ribs */}
      <path d="M45 88 V40.5 M60 88 V34 M75 88 V40.5" stroke={`url(#${id}-steel)`} strokeWidth="2.2" />
      <path d="M30 60 H90" stroke={`url(#${id}-steel)`} strokeWidth="2" opacity="0.5" />

      {/* Rows of plants inside */}
      {[38, 52, 66, 80].map((x, i) => (
        <g key={x} transform={`translate(${x} 88)`}>
          <path d="M0 0 V-15" stroke="#1f8a3b" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="-4" cy="-8" rx="4.5" ry="2.4" transform="rotate(-30 -4 -8)" fill="#3fae46" />
          <ellipse cx="4" cy="-12" rx="4.5" ry="2.4" transform="rotate(28 4 -12)" fill="#55c257" />
          {i % 2 === 0 && <ellipse cx="0" cy="-17" rx="3.4" ry="2.2" fill="#2e9e4f" />}
        </g>
      ))}

      {/* Ventilation fan in the gable */}
      <circle cx="60" cy="46" r="8.5" fill="#eaf4fb" stroke={`url(#${id}-steel)`} strokeWidth="2" />
      {[0, 120, 240].map((a) => (
        <ellipse
          key={a}
          cx="60"
          cy="42"
          rx="2.2"
          ry="4"
          fill="#2f6e9e"
          transform={`rotate(${a} 60 46)`}
        />
      ))}

      {/* Green swoosh across the base */}
      <path
        d="M14 92 C34 80 56 96 76 86 C88 80 98 82 106 88 L106 96 C92 90 84 92 74 96 C54 104 32 94 14 100 Z"
        fill={`url(#${id}-swoosh)`}
      />

      {/* Sensor badges on an arc: temperature, water, airflow */}
      {detailed && (
        <g>
          <path
            d="M80 20 C96 24 107 40 107 57 C107 71 101 81 94 87"
            fill="none"
            stroke="#49b3e3"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
          <circle cx="96" cy="26" r="10.5" fill="#2e9e4f" />
          <path d="M96 21 v7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="96" cy="30.5" r="2.6" fill="#fff" />

          <circle cx="107" cy="54" r="10.5" fill="#2b7fc4" />
          <path d="M107 48 c3.8 4.8 4.8 6.8 4.8 8.6 a4.8 4.8 0 0 1 -9.6 0 c0 -1.8 1 -3.8 4.8 -8.6 Z" fill="#fff" />

          <circle cx="98" cy="84" r="10.5" fill="#2b7fc4" />
          {[0, 120, 240].map((a) => (
            <ellipse
              key={a}
              cx="98"
              cy="80.5"
              rx="1.9"
              ry="3.4"
              fill="#fff"
              transform={`rotate(${a} 98 84)`}
            />
          ))}
        </g>
      )}
    </svg>
  );
}

// "Polyhouse" set the way the logo does it: POLY in green, HOUSE in blue,
// with the leaf tucked into the O.
export function BrandWordmark({ className = "" }) {
  return (
    <span className={`wordmark ${className}`} aria-hidden="true">
      <span className="wordmark-poly">
        P
        <span className="wordmark-o">
          <svg viewBox="0 0 24 24" className="wordmark-leaf">
            <path
              d="M12 3c6 2 8 7 6 12-4-1-7-4-6-12Z"
              fill="currentColor"
              transform="rotate(-20 12 12)"
            />
          </svg>
        </span>
        LY
      </span>
      <span className="wordmark-house">HOUSE</span>
    </span>
  );
}

// The full lockup for the landing and sign-in pages.
export function BrandLockup({ markSize = 92, tagline = true }) {
  return (
    <div className="lockup">
      <BrandMark size={markSize} detailed />
      <div className="lockup-text">
        <BrandWordmark />
        {tagline && <span className="lockup-tagline">AI-Powered Smart Agriculture</span>}
      </div>
    </div>
  );
}
