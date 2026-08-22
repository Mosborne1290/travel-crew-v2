import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { TripPlanner } from "@/components/trip-planner";

export default async function TripPlanPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: tripData }, { data: days }, { data: activities }] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
    supabase
      .from("itinerary_days")
      .select("id,date,day_number,title,notes")
      .eq("trip_id", tripId)
      .order("date"),
    supabase
      .from("activities")
      .select("id,itinerary_day_id,title,activity_type,start_datetime,end_datetime,venue_name,address,notes,cost,currency,status")
      .eq("trip_id", tripId)
      .order("start_datetime"),
  ]);

  if (!tripData) notFound();

  return (
    <>
      <TripWorkspaceHeader trip={tripData as Trip} active="plan" />
      <TripPlanner
        tripId={tripId}
        userId={user.id}
        tripStart={tripData.start_date}
        tripEnd={tripData.end_date}
        initialDays={days ?? []}
        initialActivities={activities ?? []}
      />
    </>
  );
}
