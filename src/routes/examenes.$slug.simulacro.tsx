import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/examenes/$slug/simulacro")({
  loader: async ({ params }) => {
    throw redirect({ to: "/examenes/$slug", params: { slug: params.slug } });
  },
  component: () => null,
});
