import { LogoutButton } from "@/components/logout-button";
import { getCurrentRole, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const user = await requireUser();
  const role = await getCurrentRole(user.id);
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, first_name, last_name, default_currency, timezone")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <div className="muted">Your Travel Crew account.</div>
        </div>
      </header>

      <section className="panel" style={{ maxWidth: 720 }}>
        <h2>Profile</h2>
        <div className="list">
          <div className="list-row"><span>Name</span><strong>{profile?.display_name || profile?.first_name || "Traveller"}</strong></div>
          <div className="list-row"><span>Email</span><strong>{user.email}</strong></div>
          <div className="list-row"><span>Role</span><span className="badge">{role}</span></div>
          <div className="list-row"><span>Currency</span><strong>{profile?.default_currency || "AUD"}</strong></div>
          <div className="list-row"><span>Timezone</span><strong>{profile?.timezone || "Australia/Sydney"}</strong></div>
        </div>
        <div style={{ marginTop: 18 }}><LogoutButton /></div>
      </section>
    </>
  );
}
