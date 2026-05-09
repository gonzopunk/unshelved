import type { NotationEntry } from "@/lib/notations";
import { Meta } from "./NoteEntry";

export default function QuoteEntry({ entry }: { entry: NotationEntry }) {
  return (
    <article className="group rounded-2xl bg-card shadow-paper p-5 border-l-4 border-terra">
      <blockquote className="font-display italic text-lg leading-snug">
        “{entry.body}”
      </blockquote>
      <Meta entry={entry} />
    </article>
  );
}
