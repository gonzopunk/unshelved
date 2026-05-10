import type { NotationEntry } from "@/lib/notations";
import { Meta } from "./NoteEntry";

export default function QuoteEntry({
  entry,
  selected,
}: {
  entry: NotationEntry;
  selected?: boolean;
}) {
  return (
    <article
      data-entry-id={entry.id}
      className={`group rounded-2xl bg-card shadow-paper p-5 border-l-4 border-terra transition ${
        selected ? "ring-1 ring-terra/50" : ""
      }`}
    >
      <blockquote className="font-display italic text-lg leading-snug">
        “{entry.body}”
      </blockquote>
      <Meta entry={entry} />
    </article>
  );
}
