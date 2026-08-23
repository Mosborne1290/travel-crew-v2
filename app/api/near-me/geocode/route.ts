import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request:Request){
  const supabase=await createClient();
  const {data}=await supabase.auth.getUser();
  if(!data.user)return NextResponse.json({error:"Unauthorised"},{status:401});

  const q=new URL(request.url).searchParams.get("q")?.trim()||"";
  if(q.length<2)return NextResponse.json({error:"Enter a city, suburb, postcode or destination."},{status:400});

  try{
    const endpoint=new URL("https://nominatim.openstreetmap.org/search");
    endpoint.searchParams.set("q",q);
    endpoint.searchParams.set("format","jsonv2");
    endpoint.searchParams.set("limit","1");
    endpoint.searchParams.set("addressdetails","1");

    const response=await fetch(endpoint,{
      headers:{
        "Accept":"application/json",
        "User-Agent":"Travel-Crew-V2/1.0"
      },
      next:{revalidate:86400}
    });

    if(!response.ok){
      return NextResponse.json({error:"Location search is temporarily unavailable."},{status:502});
    }

    const rows=await response.json();
    const first=rows?.[0];

    if(!first){
      return NextResponse.json({error:`Travel Crew could not find "${q}". Try adding the city, state/province or country.`},{status:404});
    }

    return NextResponse.json({
      latitude:Number(first.lat),
      longitude:Number(first.lon),
      label:first.display_name||q
    });
  }catch{
    return NextResponse.json({error:"Location search is temporarily unavailable."},{status:502});
  }
}
