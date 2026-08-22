import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_:Request,{params}:{params:Promise<{tripId:string}>}){
  const {tripId}=await params;const supabase=await createClient();
  const {data:auth}=await supabase.auth.getUser();if(!auth.user)return NextResponse.json({error:"Unauthorised"},{status:401});

  const [{data:activities},{data:bookings}]=await Promise.all([
    supabase.from("activities").select("id,title,start_datetime,end_datetime,venue_name,address,latitude,longitude,itinerary_day_id").eq("trip_id",tripId).not("start_datetime","is",null).order("start_datetime"),
    supabase.from("bookings").select("id,booking_type,provider,start_datetime,end_datetime").eq("trip_id",tripId).not("start_datetime","is",null).order("start_datetime"),
  ]);
  const issues:any[]=[];
  const rows=activities??[];

  for(let i=0;i<rows.length;i++){
    const a=rows[i],b=rows[i+1];if(!b)continue;
    const aStart=new Date(a.start_datetime).getTime(),aEnd=a.end_datetime?new Date(a.end_datetime).getTime():aStart;
    const bStart=new Date(b.start_datetime).getTime();
    if(bStart<aEnd){
      issues.push({type:"overlap",severity:"high",title:"Activities overlap",detail:`${a.title} overlaps ${b.title}.`,activity_ids:[a.id,b.id]});
      continue;
    }
    const gap=(bStart-aEnd)/60000;
    if(a.latitude!=null&&a.longitude!=null&&b.latitude!=null&&b.longitude!=null){
      const km=haversine(Number(a.latitude),Number(a.longitude),Number(b.latitude),Number(b.longitude));
      const estimated=Math.max(10,km/30*60+10);
      if(gap<estimated)issues.push({type:"travel_time",severity:"medium",title:"Travel time may be tight",detail:`Only ${Math.round(gap)} minutes between ${a.title} and ${b.title}; estimated local transfer allowance is about ${Math.round(estimated)} minutes.`,activity_ids:[a.id,b.id]});
    }
    if(gap>240)issues.push({type:"long_gap",severity:"low",title:"Long gap in itinerary",detail:`There is a ${Math.round(gap/60)} hour gap between ${a.title} and ${b.title}.`,activity_ids:[a.id,b.id]});
  }

  // Booking overlaps with activities.
  for(const booking of bookings??[]){
    const bs=new Date(booking.start_datetime).getTime();
    const be=booking.end_datetime?new Date(booking.end_datetime).getTime():bs+60*60000;
    for(const a of rows){
      const as=new Date(a.start_datetime).getTime();
      const ae=a.end_datetime?new Date(a.end_datetime).getTime():as+60*60000;
      if(Math.max(bs,as)<Math.min(be,ae) && !String(a.title).toLowerCase().includes(String(booking.provider||"").toLowerCase())){
        issues.push({type:"booking_overlap",severity:"high",title:"Booking conflict",detail:`${booking.booking_type} ${booking.provider||""} overlaps ${a.title}.`,activity_ids:[a.id],booking_id:booking.id});
      }
    }
  }

  return NextResponse.json({issues});
}

function haversine(lat1:number,lon1:number,lat2:number,lon2:number){
 const R=6371,rad=(x:number)=>x*Math.PI/180,dLat=rad(lat2-lat1),dLon=rad(lon2-lon1);
 const x=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2;
 return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
