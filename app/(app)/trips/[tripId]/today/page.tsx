import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { TripToday } from "@/components/trip-today";

export default async function TodayPage({params}:{params:Promise<{tripId:string}>}){
  const {tripId}=await params; const supabase=await createClient();
  await supabase.rpc("sync_trip_status",{p_trip_id:tripId});

  const today=new Date().toISOString().slice(0,10);
  const [{data:trip},{data:day},{data:bookings},{data:reminders},{data:tasks}]=await Promise.all([
    supabase.from("trips").select("*").eq("id",tripId).maybeSingle(),
    supabase.from("itinerary_days").select("id,date,day_number").eq("trip_id",tripId).eq("date",today).maybeSingle(),
    supabase.from("bookings").select("id,booking_type,provider,start_datetime,end_datetime,booking_reference").eq("trip_id",tripId).gte("start_datetime",`${today}T00:00:00`).lt("start_datetime",`${today}T23:59:59`),
    supabase.from("trip_reminders").select("id,title,message,remind_at,target_url,completed").eq("trip_id",tripId).eq("completed",false).gte("remind_at",`${today}T00:00:00`).lt("remind_at",`${today}T23:59:59`).order("remind_at"),
    supabase.from("checklist_items").select("id,title,completed").eq("trip_id",tripId).eq("completed",false).order("due_date",{ascending:true,nullsFirst:false}),
  ]);
  if(!trip)notFound();

  let activities:any[]=[];
  if(day){
    const {data}=await supabase.from("activities").select("id,title,activity_type,start_datetime,end_datetime,venue_name,address,notes").eq("trip_id",tripId).eq("itinerary_day_id",day.id).order("start_datetime",{ascending:true,nullsFirst:false});
    activities=data??[];
  }

  return <><TripWorkspaceHeader trip={trip as Trip} active="today"/><TripToday tripId={tripId} tripDate={today} destination={trip.primary_destination||"Trip Day"} activities={activities} bookings={bookings??[]} reminders={reminders??[]} checklistItems={tasks??[]} currency={trip.home_currency||"AUD"}/></>;
}
