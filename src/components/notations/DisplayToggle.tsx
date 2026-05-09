import { useNavigate, useSearch } from "@tanstack/react-router";
import { ScrollText, AlignLeft } from "lucide-react";
import type { Display } from "@/lib/notations";

export default function DisplayToggle({ defaultDisplay }: { defaultDisplay: Display }) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { display?: Display };
  const current: Display = search.display ?? defaultDisplay;
  const set = (d: Display) =>
    navigate({ to: ".", search: (prev: Record<string, unknown>) => ({ ...prev, display: d }), replace: true } as never);
  return (
    <div className="inline-flex items-center rounded-full bg-muted p-1 text-xs">
      <button
        onClick={() => set("stream")}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition ${
          current === "stream" ? "bg-card shadow-paper text-ink" : "text-muted-foreground"
        }`}
      >
        <AlignLeft className="h-3.5 w-3.5" /> Stream
      </button>
      <button
        onClick={() => set("scroll")}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition ${
          current === "scroll" ? "bg-card shadow-paper text-ink" : "text-muted-foreground"
        }`}
      >
        <ScrollText className="h-3.5 w-3.5" /> Scroll
      </button>
    </div>
  );
}
