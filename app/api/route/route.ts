import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const endpoints:Record<string,string>={
  drive:"https://routing.openstreetmap.de/routed-car/route/v1/driving",
  walk:"https://routing.openstreetmap.de/routed-foot/route/v1/driving",
  cycle:"https://routing.openstreetmap.de/routed-bike/route/v1/driving",
};

export async function GET(request:Request){
  const supabase=await createClient();
  const {data}=await supabase.auth.getUser();
  if(!data.user)return NextResponse.json({error:"Unauthorised"},{status:401});

  const url=new URL(request.url);
  const fromLat=Number(url.searchParams.get("fromLat")),fromLon=Number(url.searchParams.get("fromLon"));
  const toLat=Number(url.searchParams.get("toLat")),toLon=Number(url.searchParams.get("toLon"));
  const mode=url.searchParams.get("mode")||"drive";
  if(![fromLat,fromLon,toLat,toLon].every(Number.isFinite))return NextResponse.json({error:"Valid route coordinates are required."},{status:400});
  const base=endpoints[mode]||endpoints.drive;

  try{
    const endpoint=`${base}/${fromLon},${fromLat};${toLon},${toLat}?overview=false&steps=true`;
    const response=await fetch(endpoint,{next:{revalidate:3600}});
    if(!response.ok)return NextResponse.json({error:"Route service is unavailable."},{status:502});
    const payload=await response.json();const r=payload.routes?.[0];
    if(!r)return NextResponse.json({error:"No route found."},{status:404});
    return NextResponse.json({mode,distance_km:r.distance/1000,duration_minutes:r.duration/60,steps:(r.legs?.[0]?.steps??[]).slice(0,12).map((s:any)=>({instruction:s.maneuver?.instruction||s.name,distance_m:s.distance,duration_s:s.duration}))});
  }catch{return NextResponse.json({error:"Route service is unavailable."},{status:502})}
}
