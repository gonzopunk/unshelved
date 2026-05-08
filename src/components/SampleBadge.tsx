type Props = {
  className?: string;
  /** "cover" sits absolutely in a cover wrapper; "inline" flows inline. */
  variant?: "cover" | "inline";
  title?: string;
};

export default function SampleBadge({ className = "", variant = "cover", title = "Starter sample — clear in Settings" }: Props) {
  const base =
    "text-[9px] font-mono uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-sm bg-paper/85 text-ink/75 border border-ink/10 backdrop-blur-sm pointer-events-none select-none";
  if (variant === "inline") {
    return <span title={title} className={`inline-flex items-center ${base} ${className}`}>Sample</span>;
  }
  return (
    <span
      title={title}
      className={`absolute top-1.5 right-1.5 z-10 ${base} ${className}`}
    >
      Sample
    </span>
  );
}
