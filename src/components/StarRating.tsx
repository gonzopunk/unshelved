import { Star } from "lucide-react";

export default function StarRating({ value, size = 16 }: { value: number | null | undefined; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= (value ?? 0) ? "fill-terra text-terra" : "text-mist"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}
