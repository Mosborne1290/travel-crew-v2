import { redirect } from "next/navigation";
import { requireUser,getCurrentRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OwnerUserManagement } from "@/components/owner-user-management";
import { OwnerInvitations } from "@/components/owner-invitations";

export default async function OwnerUsersPage(){
  const user=await requireUser();
  const role=await getCurrentRole(user.id);
  if(role!=="owner")redirect("/dashboard");

  const supabase=await createClient();

  const [
    {data:profiles},
    {data:roles},
    {data:trips},
    {data:invites},
  ]=await Promise.all([
    supabase
      .from("profiles")
      .select("id,display_name,first_name,last_name,email,account_disabled,last_seen_at")
      .order("display_name"),
    supabase.from("user_roles").select("user_id,role"),
    supabase
      .from("trips")
      .select("id,name,primary_destination,start_date")
      .order("start_date",{ascending:true,nullsFirst:false}),
    supabase
      .from("trip_invites")
      .select("id,trip_id,email,role,invite_token,expires_at,accepted_at")
      .order("created_at",{ascending:false})
      .limit(100),
  ]);

  const users=(profiles??[]).map(p=>({
    id:p.id,
    display_name:p.display_name||[p.first_name,p.last_name].filter(Boolean).join(" ")||p.email||"Traveller",
    email:p.email||null,
    role:(roles??[]).find(r=>r.user_id===p.id)?.role||"member",
    account_disabled:Boolean(p.account_disabled),
    last_seen_at:p.last_seen_at||null,
  }));

  const tripRows=(trips??[]).map(t=>({
    id:t.id,
    name:t.name,
    primary_destination:t.primary_destination||null,
    start_date:t.start_date||null,
  }));

  const inviteRows=(invites??[]).map(i=>({
    ...i,
    trip_name:tripRows.find(t=>t.id===i.trip_id)?.name||"Trip",
  }));

  return <>
    <header className="page-header">
      <div>
        <h1>Owner Administration</h1>
        <div className="muted">Manage users, access roles and secure trip invitation links.</div>
      </div>
    </header>

    <OwnerInvitations trips={tripRows} initialInvites={inviteRows}/>
    <OwnerUserManagement currentUserId={user.id} initialUsers={users}/>
  </>;
}
