import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { TripExplore } from "@/components/trip-explore";

export default async function ExplorePage({params}:{params:Promise<{tripId:string}>}){
  const {tripId}=await params;const user=await requireUser();const supabase=await createClient();
  const [{data:trip},{data:destination}]=await Promise.all([
    supabase.from("trips").select("*").eq("id",tripId).maybeSingle(),
    supabase.from("destinations").select("name,latitude,longitude").eq("trip_id",tripId).order("sort_order").limit(1).maybeSingle(),
  ]);
  if(!trip)notFound();
  return <><TripWorkspaceHeader trip={trip as Trip} active="explore"/><TripExplore tripId={tripId} userId={user.id} destination={destination??null}/></>;
}
