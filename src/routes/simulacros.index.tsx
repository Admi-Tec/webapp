import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/simulacros/")({
  beforeLoad: () => {
    throw redirect({ to: "/examenes", statusCode: 301 });
  },
});
