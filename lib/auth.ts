import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_disabled,display_name,first_name")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.account_disabled) {
    await supabase.auth.signOut();
    redirect("/login?disabled=1");
  }

  const preferredName = profile?.display_name || profile?.first_name || null;

  await supabase.from("profiles").update({
    email: data.user.email ?? null,
    last_seen_at: new Date().toISOString()
  }).eq("id", data.user.id);

  // Keep Supabase Auth's Display name aligned with the Travel Crew profile.
  // This runs only when the metadata does not already match.
  if (preferredName && (
    data.user.user_metadata?.display_name !== preferredName ||
    data.user.user_metadata?.full_name !== preferredName
  )) {
    await supabase.auth.updateUser({
      data: {
        display_name: preferredName,
        name: preferredName,
        full_name: preferredName,
        first_name: profile?.first_name || preferredName,
      },
    });
  }

  return data.user;
}

export async function getCurrentRole(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.role ?? "member";
}
