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

  const [{ data: profile }, { data: notifications }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, first_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("id,title,message,target_url,read_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const displayName =
    profile?.display_name ||
    profile?.first_name ||
    user.email?.split("@")[0] ||
    "Traveller";

  return (
    <AppShell
      displayName={displayName}
      role={role}
      userId={user.id}
      notifications={notifications ?? []}
    >
      {children}
    </AppShell>
  );
}
