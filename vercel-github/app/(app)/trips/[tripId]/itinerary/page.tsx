import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { VisualItinerary } from "@/components/visual-itinerary";

export default async function VisualItineraryPage({
  params,
}:{
  params:Promise<{tripId:string}>;
}){
  const {tripId}=await params;
  const supabase=await createClient();

  const [
    {data:trip},
    {data:days},
    {data:activities},
    {data:destinations},
    {data:bookings},
    {data:cruiseDays},
    {data:shopping},
    {data:expenses},
    {data:photos},
    {data:members},
  ]=await Promise.all([
    supabase.from("trips").select("*").eq("id",tripId).maybeSingle(),
    supabase.from("itinerary_days")
      .select("id,date,day_number,title,notes")
      .eq("trip_id",tripId).order("date"),
    supabase.from("activities")
      .select("id,itinerary_day_id,cruise_port_day_id,title,activity_type,start_datetime,end_datetime,cruise_local_start_time,cruise_local_end_time,venue_name,address,notes,cost,currency,status,latitude,longitude,timezone,priority,website,phone,booking_reference,estimated_cost,transport_method,estimated_travel_minutes,needs_confirmation,confirmation_date,weather_dependent,bad_weather_alternative,visited,sort_order")
      .eq("trip_id",tripId).order("sort_order"),
    supabase.from("destinations")
      .select("id,name,city,country,arrival_date,departure_date,latitude,longitude,timezone,sort_order")
      .eq("trip_id",tripId).order("sort_order"),
    supabase.from("bookings")
      .select("id,booking_type,provider,booking_reference,confirmation_number,start_datetime,end_datetime,total_amount,currency,payment_status,booking_status,notes")
      .eq("trip_id",tripId).order("start_datetime",{ascending:true,nullsFirst:false}),
    supabase.from("cruise_port_days")
      .select("id,port_name,region,country,port_date,timezone,cruise_ship,cruise_line,wharf_name,wharf_address,wharf_lat,wharf_lng,disembark_time,recommended_return_time,required_return_time,ship_departure_time,hero_image_url")
      .eq("trip_id",tripId).order("port_date"),
    supabase.from("cruise_port_shopping_items")
      .select("id,cruise_port_day_id,item_name,suggested_location,category,budget,actual_cost,currency,purchased")
      .eq("trip_id",tripId),
    supabase.from("expenses")
      .select("id,description,category,amount,currency,expense_date,cruise_port_day_id,activity_id")
      .eq("trip_id",tripId).order("expense_date"),
    supabase.from("photos")
      .select("id,storage_path,caption,taken_at,uploaded_at,itinerary_day_id,cruise_port_day_id,activity_id,is_favourite")
      .eq("trip_id",tripId).order("uploaded_at",{ascending:false}),
    supabase.from("trip_members").select("user_id").eq("trip_id",tripId),
  ]);

  if(!trip)notFound();

  const bookingIds=(bookings??[]).map(b=>b.id);
  const [
    {data:flights},
    {data:accommodation},
    {data:cruises},
  ]=bookingIds.length
    ? await Promise.all([
        supabase.from("flights").select("*").in("booking_id",bookingIds),
        supabase.from("accommodation").select("*").in("booking_id",bookingIds),
        supabase.from("cruises").select("*").in("booking_id",bookingIds),
      ])
    : [{data:[]},{data:[]},{data:[]}];

  const photoUrls:Record<string,string>={};
  for(const photo of photos??[]){
    const signed=await supabase.storage.from("trip-photos").createSignedUrl(photo.storage_path,60*60);
    if(signed.data?.signedUrl)photoUrls[photo.id]=signed.data.signedUrl;
  }

  return <>
    <TripWorkspaceHeader trip={trip as Trip} active="itinerary"/>
    <VisualItinerary
      trip={trip as any}
      days={(days??[]) as any}
      activities={(activities??[]) as any}
      destinations={(destinations??[]) as any}
      bookings={(bookings??[]) as any}
      flights={(flights??[]) as any}
      accommodation={(accommodation??[]) as any}
      cruises={(cruises??[]) as any}
      cruiseDays={(cruiseDays??[]) as any}
      shopping={(shopping??[]) as any}
      expenses={(expenses??[]) as any}
      photos={(photos??[]) as any}
      photoUrls={photoUrls}
      travellerCount={(members??[]).length}
    />
  </>;
}
