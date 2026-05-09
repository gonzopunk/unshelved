import { createFileRoute } from "@tanstack/react-router";
import { NotationsView } from "@/components/notations/NotationsView";

export const Route = createFileRoute("/_authenticated/notations/commonplace")({
  component: () => <NotationsView forcedKind="both" defaultDisplay="scroll" defaultGrouping="book" />,
});
