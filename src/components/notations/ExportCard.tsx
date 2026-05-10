import { createRoot } from "react-dom/client";
import { toPng } from "html-to-image";
import { format } from "date-fns";
import type { NotationEntry } from "@/lib/notations";

export type CardRatio = "square" | "portrait";

const DIMS: Record<CardRatio, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
  portrait: { w: 1080, h: 1350 },
};

function pickFontSize(len: number): number {
  if (len <= 140) return 56;
  if (len <= 320) return 44;
  return 32;
}

function CardView({ entry, ratio }: { entry: NotationEntry; ratio: CardRatio }) {
  const { w, h } = DIMS[ratio];
  const isQuote = entry.kind === "quote";
  const fontSize = pickFontSize(entry.body.length);
  const swatch = entry.book.cover_color ?? "#1f5266";
  const swatch2 = entry.book.cover_secondary_color ?? swatch;

  return (
    <div
      style={{
        width: w,
        height: h,
        background: "#fafbf3",
        color: "#1f2630",
        padding: 80,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 72,
            borderRadius: 6,
            background: `linear-gradient(135deg, ${swatch}, ${swatch2})`,
            boxShadow: "0 4px 12px rgba(31,38,48,0.18)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 18, color: "#5b6470", textTransform: "uppercase", letterSpacing: 1.5 }}>
            {isQuote ? "Quote" : "Note"}
          </div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{entry.book.title}</div>
          {entry.book.author && (
            <div style={{ fontSize: 18, color: "#5b6470" }}>{entry.book.author}</div>
          )}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 40,
          marginBottom: 40,
          paddingLeft: isQuote ? 40 : 0,
          borderLeft: isQuote ? "8px solid #d17648" : "none",
        }}
      >
        <div
          style={{
            fontSize,
            lineHeight: 1.25,
            fontStyle: isQuote ? "italic" : "normal",
            fontFamily: isQuote
              ? "Georgia, 'Times New Roman', serif"
              : "ui-sans-serif, system-ui, -apple-system, sans-serif",
            whiteSpace: "pre-wrap",
            textAlign: "left",
          }}
        >
          {isQuote ? `\u201C${entry.body}\u201D` : entry.body}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          fontSize: 16,
          color: "#5b6470",
        }}
      >
        <div>
          {isQuote && entry.pageNumber ? `p. ${entry.pageNumber} · ` : ""}
          {format(new Date(entry.createdAt), "MMM d, yyyy")}
        </div>
        <div style={{ fontWeight: 600, color: "#1f5266" }}>unshelved</div>
      </div>
    </div>
  );
}

export async function exportEntryCard(entry: NotationEntry, ratio: CardRatio = "square") {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-99999px";
  host.style.top = "0";
  host.style.pointerEvents = "none";
  document.body.appendChild(host);

  const root = createRoot(host);
  await new Promise<void>((resolve) => {
    root.render(<CardView entry={entry} ratio={ratio} />);
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const node = host.firstElementChild as HTMLElement;
    const dataUrl = await toPng(node, {
      width: DIMS[ratio].w,
      height: DIMS[ratio].h,
      pixelRatio: 1,
      cacheBust: true,
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `unshelved-${entry.kind}-${entry.id.slice(0, 8)}.png`;
    a.click();
  } finally {
    root.unmount();
    host.remove();
  }
}
