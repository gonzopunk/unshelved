import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/notations/")({
  beforeLoad: () => {
    throw redirect({ to: "/notations/commonplace" });
  },
});
