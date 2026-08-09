import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    if (location.pathname !== "/onboarding") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed, pseudonym_change_required, suspended_at")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile?.suspended_at) {
        await supabase.auth.signOut();
        throw redirect({ to: "/auth" });
      }
      if (profile && !profile.onboarding_completed) {
        throw redirect({ to: "/onboarding" });
      }
      if (profile?.pseudonym_change_required && location.pathname !== "/perfil") {
        throw redirect({ to: "/perfil" });
      }
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
