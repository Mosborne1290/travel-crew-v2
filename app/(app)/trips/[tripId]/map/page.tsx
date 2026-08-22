import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { TripMap } from "@/components/trip-map";
import { RoutePlanner } from "@/components/route-planner";

export default async function TripMapPage({params}:{params:Promise<{tripId:string}>}){
  const {tripId}=await params;const supabase=await createClient();
  const [{data:tripData},{data:destinations},{data:places},{data:activities},{data:days}]=await Promise.all([
    supabase.from("trips").select("*").eq("id",tripId).maybeSingle(),
    supabase.from("destinations").select("id,name,city,country,latitude,longitude").eq("trip_id",tripId),
    supabase.from("saved_places").select("id,name,category,address,latitude,longitude").eq("trip_id",tripId),
    supabase.from("activities").select("id,itinerary_day_id,title,activity_type,venue_name,address,latitude,longitude").eq("trip_id",tripId),
    supabase.from("itinerary_days").select("id,date").eq("trip_id",tripId),
  ]);
  if(!tripData)notFound();
  const dayMap=new Map((days??[]).map(d=>[d.id,d.date]));
  const points=[
    ...(destinations??[]).filter(p=>p.latitude!=null&&p.longitude!=null).map(p=>({id:`destination-${p.id}`,kind:"destination" as const,category:"destination",name:p.name,latitude:Number(p.latitude),longitude:Number(p.longitude),detail:[p.city,p.country].filter(Boolean).join(", ")||null,date:null})),
    ...(places??[]).filter(p=>p.latitude!=null&&p.longitude!=null).map(p=>({id:`place-${p.id}`,kind:"place" as const,category:p.category,name:p.name,latitude:Number(p.latitude),longitude:Number(p.longitude),detail:p.address||p.category||null,date:null})),
    ...(activities??[]).filter(p=>p.latitude!=null&&p.longitude!=null).map(p=>({id:`activity-${p.id}`,kind:"activity" as const,category:p.activity_type,name:p.title,latitude:Number(p.latitude),longitude:Number(p.longitude),detail:p.venue_name||p.address||null,date:p.itinerary_day_id?dayMap.get(p.itinerary_day_id)||null:null})),
  ];
  return <><TripWorkspaceHeader trip={tripData as Trip} active="map"/><TripMap points={points}/><RoutePlanner points={points.map(p=>({id:p.id,name:p.name,latitude:p.latitude,longitude:p.longitude}))}/></>;
}
