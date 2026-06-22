type LogoProps = {
  className?: string;
  title?: string;
};

/**
 * Unshelved brand logo as inline SVG.
 * A serif "U" cradling a reader-with-book mark, geometrically centered
 * inside a square viewBox so it stays perfectly aligned at any size.
 */
export default function Logo({ className, title = "Unshelved" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      {/* "U" — symmetric around x=60 */}
      <path
        d="M30 22
           h14
           v52
           a16 16 0 0 0 32 0
           v-52
           h14
           v54
           a30 30 0 0 1 -60 0
           z"
        fill="var(--terra, #d17648)"
      />
      {/* Book (centered at x=60) */}
      <path
        d="M44 78
           c5 -3 11 -3 16 0
           c5 -3 11 -3 16 0
           v6
           c-5 -3 -11 -3 -16 0
           c-5 -3 -11 -3 -16 0
           z"
        fill="var(--terra, #d17648)"
      />
      {/* Reader silhouette — head + shoulders, centered at x=60 */}
      <circle cx="60" cy="56" r="6.5" fill="#c79b85" />
      <path
        d="M48 78
           c0 -7 5.5 -12 12 -12
           s12 5 12 12
           z"
        fill="#c79b85"
      />
    </svg>
  );
}
