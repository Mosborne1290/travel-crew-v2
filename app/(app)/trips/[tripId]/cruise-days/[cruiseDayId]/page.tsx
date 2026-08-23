import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { CruisePortDayDashboard } from "@/components/cruise-port-day-dashboard";
import { CruisePortDayHeroUpload } from "@/components/cruise-port-day-hero-upload";
import { CruisePortDayAIBuilder } from "@/components/cruise-port-day-ai-builder";
import { CruisePortDaySettings } from "@/components/cruise-port-day-settings";

export default async function CruiseDayPage({params}:{params:Promise<{tripId:string;cruiseDayId:string}>}){
  const {tripId,cruiseDayId}=await params;
  const user=await requireUser();
  const supabase=await createClient();

  const [
    {data:trip},
    {data:day},
    {data:activities},
    {data:shopping},
    {data:expenses},
    {data:photos},
    {data:memberRows},
    {data:canManage},
  ]=await Promise.all([
    supabase.from("trips").select("*").eq("id",tripId).maybeSingle(),
    supabase.from("cruise_port_days").select("*").eq("id",cruiseDayId).eq("trip_id",tripId).maybeSingle(),
    supabase.from("activities").select("id,title,activity_type,priority,cruise_local_start_time,cruise_local_end_time,address,latitude,longitude,website,phone,booking_reference,estimated_cost,currency,transport_method,estimated_travel_minutes,notes,needs_confirmation,confirmation_date,confirmation_source,weather_dependent,bad_weather_alternative,is_indoor,visited,sort_order,market_open_time,market_close_time,market_website,market_notes").eq("cruise_port_day_id",cruiseDayId).order("sort_order"),
    supabase.from("cruise_port_shopping_items").select("*").eq("cruise_port_day_id",cruiseDayId).order("created_at"),
    supabase.from("expenses").select("id,description,amount,currency,expense_date,activity_id,paid_by_user_id").eq("cruise_port_day_id",cruiseDayId).order("created_at",{ascending:false}),
    supabase.from("photos").select("id,storage_path,caption,activity_id,uploaded_by,uploaded_at").eq("cruise_port_day_id",cruiseDayId).order("uploaded_at",{ascending:false}),
    supabase.from("trip_members").select("user_id").eq("trip_id",tripId),
    supabase.rpc("can_manage_cruise_day",{p_trip_id:tripId}),
  ]);

  if(!trip||!day)notFound();

  const ids=(memberRows??[]).map(m=>m.user_id);
  const {data:profiles}=ids.length
    ?await supabase.from("profiles").select("id,display_name,first_name,last_name").in("id",ids)
    :{data:[] as any[]};

  const members=ids.map(id=>{
    const p=(profiles??[]).find(x=>x.id===id);
    return {user_id:id,display_name:p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(" ")||"Traveller"};
  });

  const displayDay={...day,hero_image_url:day.hero_image_url||trip.cover_image_url||null};

  return <>
    <TripWorkspaceHeader trip={trip as Trip} active="plan"/>
    <CruisePortDaySettings day={displayDay} canManage={Boolean(canManage)}/>
    <CruisePortDayHeroUpload tripId={tripId} cruiseDayId={cruiseDayId} currentUrl={displayDay.hero_image_url} canManage={Boolean(canManage)}/>
    <CruisePortDayAIBuilder tripId={tripId} cruiseDay={displayDay} canManage={Boolean(canManage)}/>
    <CruisePortDayDashboard
      initialDay={displayDay as any}
      initialActivities={(activities??[]) as any}
      initialShopping={(shopping??[]) as any}
      initialExpenses={(expenses??[]) as any}
      initialPhotos={(photos??[]) as any}
      members={members}
      userId={user.id}
      canManage={Boolean(canManage)}
    />
  </>;
}
