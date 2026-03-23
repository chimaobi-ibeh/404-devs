/**
 * Vyral brand logo components — SVG reproductions of the official assets.
 *
 * VyralIcon   — standalone V-mark (app icons, favicons, small placements)
 * VyralLogo   — integrated wordmark (nav, headers, marketing)
 */

/** The gradient V-mark with three signal arcs */
export function VyralIcon({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  // Unique IDs so multiple instances don't fight over the same gradient id
  const id = "vi";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 118"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Main V gradient — red-coral → gold, left to right */}
        <linearGradient
          id={`${id}-vg`}
          x1="8"
          y1="75"
          x2="92"
          y2="75"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FF4B36" />
          <stop offset="50%" stopColor="#FF3C5F" />
          <stop offset="100%" stopColor="#FFD166" />
        </linearGradient>
      </defs>

      {/* ── Signal arcs (outermost → innermost, fading in intensity) ── */}
      {/* Outer — darkest / brownish */}
      <path
        d="M16 48 Q50 20 84 48"
        stroke="#7A3030"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Middle — salmon */}
      <path
        d="M24 57 Q50 32 76 57"
        stroke="#C05050"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Inner — vivid pink-red */}
      <path
        d="M33 67 Q50 50 67 67"
        stroke="#FF4D6A"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* ── V shape ── */}
      <path
        d="M9 72 L50 114 L91 72"
        stroke={`url(#${id}-vg)`}
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Full wordmark — V icon + "YRAL" in Warm White */
export function VyralLogo({
  height = 36,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center ${className ?? ""}`}
      style={{ gap: height * 0.05 }}
    >
      <VyralIcon size={height} />
      <span
        style={{
          fontFamily: '"DM Sans", ui-sans-serif, sans-serif',
          fontWeight: 700,
          fontSize: height * 0.72,
          color: "#F5F2EC",
          letterSpacing: "-0.01em",
          lineHeight: 1,
        }}
      >
        YRAL
      </span>
    </span>
  );
}
