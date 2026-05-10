import type { NotationEntry } from "@/lib/notations";
import NoteEntry from "./NoteEntry";
import QuoteEntry from "./QuoteEntry";

export default function EntryShell({
  entry,
  selected,
}: {
  entry: NotationEntry;
  selected?: boolean;
}) {
  return entry.kind === "quote" ? (
    <QuoteEntry entry={entry} selected={selected} />
  ) : (
    <NoteEntry entry={entry} selected={selected} />
  );
}
