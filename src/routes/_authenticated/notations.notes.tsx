import { createFileRoute } from "@tanstack/react-router";
import { NotationsView } from "@/components/notations/NotationsView";

export const Route = createFileRoute("/_authenticated/notations/notes")({
  component: () => <NotationsView forcedKind="notes" defaultDisplay="stream" defaultGrouping="newest" />,
});
