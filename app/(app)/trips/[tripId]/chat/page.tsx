import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { TripChat } from "@/components/trip-chat";

export default async function TripChatPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: tripData } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .maybeSingle();

  if (!tripData) notFound();

  let { data: room } = await supabase
    .from("chat_rooms")
    .select("id,name")
    .eq("trip_id", tripId)
    .eq("room_type", "trip")
    .maybeSingle();

  if (!room) {
    const created = await supabase
      .from("chat_rooms")
      .insert({
        trip_id: tripId,
        name: `${tripData.name} Chat`,
        room_type: "trip",
        created_by: user.id,
      })
      .select("id,name")
      .single();

    if (created.error || !created.data) {
      throw new Error(created.error?.message || "Could not create trip chat.");
    }

    room = created.data;

    const { data: tripMembers } = await supabase
      .from("trip_members")
      .select("user_id")
      .eq("trip_id", tripId);

    const rows = (tripMembers ?? []).map((m) => ({
      room_id: room!.id,
      user_id: m.user_id,
    }));

    if (!rows.some((r) => r.user_id === user.id)) {
      rows.push({ room_id: room.id, user_id: user.id });
    }

    if (rows.length) {
      await supabase.from("chat_members").upsert(rows, { onConflict: "room_id,user_id" });
    }
  } else {
    await supabase.from("chat_members").upsert(
      { room_id: room.id, user_id: user.id },
      { onConflict: "room_id,user_id" },
    );
  }

  const [{ data: messages }, { data: memberRows }] = await Promise.all([
    supabase
      .from("messages")
      .select("id,room_id,user_id,message_text,message_type,created_at,edited_at,deleted_at")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true })
      .limit(500),
    supabase
      .from("trip_members")
      .select("user_id")
      .eq("trip_id", tripId),
  ]);

  const userIds = Array.from(new Set([
    ...(memberRows ?? []).map((m) => m.user_id),
    user.id,
  ]));

  let profiles: Array<{ id: string; display_name: string | null; first_name: string | null; last_name: string | null }> = [];

  if (userIds.length) {
    const result = await supabase
      .from("profiles")
      .select("id,display_name,first_name,last_name")
      .in("id", userIds);
    profiles = result.data ?? [];
  }

  const members = userIds.map((id) => {
    const profile = profiles.find((p) => p.id === id);
    return {
      user_id: id,
      display_name:
        profile?.display_name ||
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
        "Traveller",
    };
  });

  return (
    <>
      <TripWorkspaceHeader trip={tripData as Trip} active="chat" />
      <TripChat
        tripId={tripId}
        userId={user.id}
        roomId={room.id}
        initialMessages={messages ?? []}
        members={members}
      />
    </>
  );
}
