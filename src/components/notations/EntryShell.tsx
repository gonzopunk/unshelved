import type { NotationEntry, Display } from "@/lib/notations";
import NoteEntry from "./NoteEntry";
import QuoteEntry from "./QuoteEntry";

export default function EntryShell({ entry, display }: { entry: NotationEntry; display: Display }) {
  return entry.kind === "quote" ? <QuoteEntry entry={entry} display={display} /> : <NoteEntry entry={entry} display={display} />;
}
