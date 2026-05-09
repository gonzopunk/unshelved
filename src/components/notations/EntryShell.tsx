import type { NotationEntry } from "@/lib/notations";
import NoteEntry from "./NoteEntry";
import QuoteEntry from "./QuoteEntry";

export default function EntryShell({ entry }: { entry: NotationEntry }) {
  return entry.kind === "quote" ? <QuoteEntry entry={entry} /> : <NoteEntry entry={entry} />;
}
