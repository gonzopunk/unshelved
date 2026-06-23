import { useState } from "react";
import { Star } from "lucide-react";

type Props = {
  value: number | null | undefined;
  size?: number;
  onChange?: (value: number) => void;
  className?: string;
};

export default function StarRating({ value, size = 16, onChange, className }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const numericValue = value == null ? 0 : Number(value);
  const displayValue = onChange ? (hovered ?? numericValue) : numericValue;

  const getHoveredValue = (e: React.MouseEvent, n: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientX - rect.left < rect.width / 2 ? n - 0.5 : n;
  };

  const interactive = !!onChange;

  return (
    <div
      className={"inline-flex items-center gap-0.5" + (className ? " " + className : "")}
      onMouseLeave={() => setHovered(null)}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const full = displayValue >= n;
        const half = !full && displayValue >= n - 0.5;
        return (
          <span
            key={n}
            role={interactive ? "button" : undefined}
            aria-label={interactive ? `Rate ${n} stars` : undefined}
            tabIndex={interactive ? 0 : undefined}
            onMouseMove={(e) => interactive && setHovered(getHoveredValue(e, n))}
            onClick={(e) => {
              if (!interactive) return;
              e.preventDefault();
              e.stopPropagation();
              onChange!(getHoveredValue(e, n));
            }}
            style={{
              position: "relative",
              display: "inline-block",
              width: size,
              height: size,
              padding: interactive ? 6 : 0,
              cursor: interactive ? "pointer" : "default",
              boxSizing: "content-box",
              lineHeight: 0,
            }}
          >
            <Star size={size} strokeWidth={1.5} className="text-mist" />
            {(full || half) && (
              <span
                style={{
                  position: "absolute",
                  top: interactive ? 6 : 0,
                  left: interactive ? 6 : 0,
                  width: size,
                  height: size,
                  overflow: "hidden",
                  clipPath: half ? "inset(0 50% 0 0)" : undefined,
                  pointerEvents: "none",
                  lineHeight: 0,
                }}
              >
                <Star size={size} strokeWidth={1.5} className="fill-terra text-terra" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
