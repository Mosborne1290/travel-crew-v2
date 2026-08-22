import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { TripPlannerStage5 } from "@/components/trip-planner-stage5";

export default async function TripPlanPage({ params }: { params: Promise<{ tripId:string }> }) {
  const { tripId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [{data:tripData},{data:days},{data:activities},{data:destination}] = await Promise.all([
    supabase.from("trips").select("*").eq("id",tripId).maybeSingle(),
    supabase.from("itinerary_days").select("id,date,day_number,title,notes").eq("trip_id",tripId).order("date"),
    supabase.from("activities").select("id,itinerary_day_id,title,activity_type,start_datetime,end_datetime,venue_name,address,notes,cost,currency,status,sort_order,latitude,longitude").eq("trip_id",tripId).order("sort_order"),
    supabase.from("destinations").select("id,name,latitude,longitude,timezone").eq("trip_id",tripId).order("sort_order").limit(1).maybeSingle(),
  ]);
  if(!tripData) notFound();

  return <>
    <TripWorkspaceHeader trip={tripData as Trip} active="plan"/>
    <TripPlannerStage5 tripId={tripId} userId={user.id} tripStart={tripData.start_date} tripEnd={tripData.end_date} initialDays={days??[]} initialActivities={activities??[]} destination={destination??null}/>
  </>;
}
