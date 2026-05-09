import { createFileRoute } from "@tanstack/react-router";
import { NotationsView } from "@/components/notations/NotationsView";

export const Route = createFileRoute("/_authenticated/notations/quotes")({
  component: () => <NotationsView forcedKind="quotes" defaultDisplay="stream" defaultGrouping="newest" />,
});
