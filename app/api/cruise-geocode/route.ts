import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request:Request){
  const supabase=await createClient();
  const {data}=await supabase.auth.getUser();
  if(!data.user)return NextResponse.json({error:"Unauthorised"},{status:401});

  const q=new URL(request.url).searchParams.get("q")?.trim()||"";
  if(q.length<2)return NextResponse.json({error:"Location query required."},{status:400});

  try{
    const u=new URL("https://nominatim.openstreetmap.org/search");
    u.searchParams.set("q",q);u.searchParams.set("format","jsonv2");u.searchParams.set("limit","1");
    const r=await fetch(u,{headers:{"Accept":"application/json","User-Agent":"Travel-Crew-V2/1.0"},next:{revalidate:86400}});
    if(!r.ok)return NextResponse.json({error:"Map lookup unavailable."},{status:502});
    const rows=await r.json();const p=rows?.[0];
    if(!p)return NextResponse.json({error:"Location not found."},{status:404});
    return NextResponse.json({latitude:Number(p.lat),longitude:Number(p.lon),display_name:p.display_name});
  }catch{return NextResponse.json({error:"Map lookup unavailable."},{status:502})}
}
