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
    .select("account_disabled")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.account_disabled) {
    await supabase.auth.signOut();
    redirect("/login?disabled=1");
  }

  await supabase.from("profiles").update({
    email: data.user.email ?? null,
    last_seen_at: new Date().toISOString()
  }).eq("id", data.user.id);
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
