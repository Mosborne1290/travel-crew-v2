import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const filters: Record<string, string> = {
  attractions: '["tourism"~"attraction|viewpoint|gallery|zoo|theme_park"]',
  restaurants: '["amenity"="restaurant"]',
  cafes: '["amenity"="cafe"]',
  museums: '["tourism"="museum"]',
  parks: '["leisure"~"park|garden"]',
};

export async function GET(request:Request){
  const supabase=await createClient();
  const {data}=await supabase.auth.getUser();
  if(!data.user)return NextResponse.json({error:"Unauthorised"},{status:401});

  const url=new URL(request.url);
  const lat=Number(url.searchParams.get("lat")),lon=Number(url.searchParams.get("lon"));
  const category=url.searchParams.get("category")||"attractions";
  const radius=Math.min(10000,Math.max(1000,Number(url.searchParams.get("radius")||5000)));
  if(!Number.isFinite(lat)||!Number.isFinite(lon))return NextResponse.json({error:"Valid coordinates are required."},{status:400});

  const filter=filters[category]||filters.attractions;
  const q=`[out:json][timeout:20];(node${filter}(around:${radius},${lat},${lon});way${filter}(around:${radius},${lat},${lon});relation${filter}(around:${radius},${lat},${lon}););out center tags 35;`;

  try{
    const response=await fetch("https://overpass-api.de/api/interpreter",{
      method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({data:q}),
      next:{revalidate:3600},
    });
    if(!response.ok)return NextResponse.json({error:"Explore service is temporarily unavailable."},{status:502});
    const payload=await response.json();
    const seen=new Set<string>();
    const places=(payload.elements??[]).map((e:any)=>{
      const name=e.tags?.name;
      const latitude=e.lat??e.center?.lat;
      const longitude=e.lon??e.center?.lon;
      if(!name||latitude==null||longitude==null)return null;
      const key=`${name}-${latitude.toFixed(4)}-${longitude.toFixed(4)}`;
      if(seen.has(key))return null;seen.add(key);
      const address=[
        e.tags?.["addr:housenumber"],e.tags?.["addr:street"],e.tags?.["addr:suburb"],e.tags?.["addr:city"]
      ].filter(Boolean).join(" ");
      return {
        id:`${e.type}-${e.id}`,name,latitude,longitude,address:address||null,
        website:e.tags?.website||e.tags?.["contact:website"]||null,
        category,
        description:e.tags?.description||e.tags?.tourism||e.tags?.amenity||e.tags?.leisure||null,
      };
    }).filter(Boolean).slice(0,24);
    return NextResponse.json({places});
  }catch{
    return NextResponse.json({error:"Explore service is temporarily unavailable."},{status:502});
  }
}
