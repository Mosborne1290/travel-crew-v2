import { AppShell } from "@/components/app-shell";
import { getCurrentRole, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const role = await getCurrentRole(user.id);
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, first_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name ||
    profile?.first_name ||
    user.email?.split("@")[0] ||
    "Traveller";

  return (
    <AppShell displayName={displayName} role={role}>
      {children}
    </AppShell>
  );
}
