import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { SavedPlacesStage5 } from "@/components/saved-places-stage5";

export default async function SavedPlacesPage({params}:{params:Promise<{tripId:string}>}){
  const {tripId}=await params;const user=await requireUser();const supabase=await createClient();
  const [{data:tripData},{data:places}]=await Promise.all([
    supabase.from("trips").select("*").eq("id",tripId).maybeSingle(),
    supabase.from("saved_places").select("id,name,description,category,address,website_url,notes,latitude,longitude").eq("trip_id",tripId).order("created_at",{ascending:false}),
  ]);
  if(!tripData)notFound();
  return <><TripWorkspaceHeader trip={tripData as Trip} active="places"/><SavedPlacesStage5 tripId={tripId} userId={user.id} destinationName={tripData.primary_destination||""} initialPlaces={places??[]}/></>;
}
