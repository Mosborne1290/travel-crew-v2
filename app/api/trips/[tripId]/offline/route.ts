import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(_:Request,{params}:{params:Promise<{tripId:string}>}){const {tripId}=await params;const supabase=await createClient();const {data:auth}=await supabase.auth.getUser();if(!auth.user)return NextResponse.json({error:"Unauthorised"},{status:401});
 const [{data:trip},{data:days},{data:activities},{data:bookings},{data:destinations},{data:reminders},{data:documents}]=await Promise.all([
  supabase.from("trips").select("id,name,start_date,end_date,primary_destination,home_currency,status").eq("id",tripId).maybeSingle(),
  supabase.from("itinerary_days").select("id,date,day_number,title").eq("trip_id",tripId).order("date"),
  supabase.from("activities").select("id,itinerary_day_id,title,activity_type,start_datetime,end_datetime,venue_name,address,notes").eq("trip_id",tripId).order("start_datetime"),
  supabase.from("bookings").select("id,booking_type,provider,booking_reference,start_datetime,end_datetime,notes").eq("trip_id",tripId).order("start_datetime"),
  supabase.from("destinations").select("name,city,country,latitude,longitude").eq("trip_id",tripId).order("sort_order"),
  supabase.from("trip_reminders").select("title,message,remind_at").eq("trip_id",tripId).eq("user_id",auth.user.id).eq("completed",false),
  supabase.from("documents").select("id,document_type,name,booking_reference,expiry_date,needed_date").eq("trip_id",tripId),
 ]);if(!trip)return NextResponse.json({error:"Trip not found"},{status:404});return NextResponse.json({saved_at:new Date().toISOString(),trip,days,activities,bookings,destinations,reminders,documents})}
