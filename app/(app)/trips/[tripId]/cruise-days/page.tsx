import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { CruisePortDayList } from "@/components/cruise-port-day-list";

export default async function CruiseDaysPage({params}:{params:Promise<{tripId:string}>}){
  const {tripId}=await params;
  const user=await requireUser();
  const supabase=await createClient();

  const [
    {data:trip},
    {data:days},
    {data:templates},
    {data:canManage},
  ]=await Promise.all([
    supabase.from("trips").select("*").eq("id",tripId).maybeSingle(),
    supabase.from("cruise_port_days")
      .select("id,port_name,region,country,port_date,timezone,cruise_ship,required_return_time,recommended_return_time,hero_image_url")
      .eq("trip_id",tripId).order("port_date"),
    supabase.from("cruise_port_day_templates")
      .select("template_key,title,port_name,region,country")
      .order("title"),
    supabase.rpc("can_manage_cruise_day",{p_trip_id:tripId}),
  ]);

  if(!trip)notFound();

  return <>
    <TripWorkspaceHeader trip={trip as Trip} active="plan"/>
    <div className="cruise-port-page-heading">
      <div><div className="eyebrow">Plan My Trip</div><h1>Cruise Port Day</h1><p className="muted">Create shore-day plans with a live return-to-ship safety window.</p></div>
    </div>
    <CruisePortDayList tripId={tripId} userId={user.id} initialDays={days??[]} templates={templates??[]} canManage={Boolean(canManage)}/>
  </>;
}
