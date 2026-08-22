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

  const [{ data: profile }, { data: notifications }, { data: reminders }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, first_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("id,title,message,target_url,read_at,created_at,notification_type")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("trip_reminders")
      .select("id,title,message,remind_at,target_url")
      .eq("user_id", user.id)
      .eq("completed", false)
      .gte("remind_at", new Date(Date.now() - 3600000).toISOString())
      .lte("remind_at", new Date(Date.now() + 7 * 86400000).toISOString())
      .order("remind_at"),
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
      reminders={reminders ?? []}
    >
      {children}
    </AppShell>
  );
}
