import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { TripTravellers } from "@/components/trip-travellers";

export default async function TravellersPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: tripData }, { data: memberRows }, { data: invites }] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
    supabase.from("trip_members").select("id,user_id,role").eq("trip_id", tripId).order("joined_at"),
    supabase
      .from("trip_invites")
      .select("id,email,role,invite_token,expires_at,accepted_at")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false }),
  ]);

  if (!tripData) notFound();

  const userIds = (memberRows ?? []).map((m) => m.user_id);
  let profileMap = new Map<string, string>();

  if (userIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,display_name,first_name,last_name")
      .in("id", userIds);

    profileMap = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        p.display_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Traveller",
      ]),
    );
  }

  const members = (memberRows ?? []).map((m) => ({
    ...m,
    display_name: profileMap.get(m.user_id) || "Traveller",
  }));

  return (
    <>
      <TripWorkspaceHeader trip={tripData as Trip} active="travellers" />
      <TripTravellers
        tripId={tripId}
        userId={user.id}
        initialMembers={members}
        initialInvites={invites ?? []}
      />
    </>
  );
}
