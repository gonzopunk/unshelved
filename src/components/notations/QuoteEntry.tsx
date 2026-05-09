import type { NotationEntry, Display } from "@/lib/notations";
import { Meta } from "./NoteEntry";

export default function QuoteEntry({ entry, display }: { entry: NotationEntry; display: Display }) {
  const isScroll = display === "scroll";
  return (
    <article
      className={`group rounded-2xl bg-card shadow-paper p-5 border-l-4 border-terra ${
        isScroll ? "px-7 py-7" : ""
      }`}
    >
      <blockquote
        className={`font-display italic ${
          isScroll ? "text-2xl leading-relaxed" : "text-lg leading-snug"
        }`}
      >
        \u201C{entry.body}\u201D
      </blockquote>
      <Meta entry={entry} />
    </article>
  );
}
