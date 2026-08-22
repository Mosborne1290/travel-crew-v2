import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const filters:Record<string,string>={
  restaurants:'["amenity"="restaurant"]',
  cafes:'["amenity"="cafe"]',
  pharmacies:'["amenity"="pharmacy"]',
  supermarkets:'["shop"="supermarket"]',
  hospitals:'["amenity"="hospital"]',
  toilets:'["amenity"="toilets"]',
  fuel:'["amenity"="fuel"]',
  attractions:'["tourism"~"attraction|viewpoint|museum"]',
};

export async function GET(request:Request){
  const supabase=await createClient();
  const {data}=await supabase.auth.getUser();
  if(!data.user)return NextResponse.json({error:"Unauthorised"},{status:401});

  const url=new URL(request.url);
  const lat=Number(url.searchParams.get("lat")),lon=Number(url.searchParams.get("lon"));
  const category=url.searchParams.get("category")||"restaurants";
  const radius=Math.min(5000,Math.max(250,Number(url.searchParams.get("radius")||2000)));
  if(!Number.isFinite(lat)||!Number.isFinite(lon))return NextResponse.json({error:"Valid location is required."},{status:400});

  const filter=filters[category]||filters.restaurants;
  const q=`[out:json][timeout:18];(node${filter}(around:${radius},${lat},${lon});way${filter}(around:${radius},${lat},${lon});relation${filter}(around:${radius},${lat},${lon}););out center tags 30;`;

  try{
    const response=await fetch("https://overpass-api.de/api/interpreter",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({data:q}),next:{revalidate:600}});
    if(!response.ok)return NextResponse.json({error:"Nearby search is temporarily unavailable."},{status:502});
    const payload=await response.json();
    const places=(payload.elements??[]).map((e:any)=>{
      const latitude=e.lat??e.center?.lat,longitude=e.lon??e.center?.lon,name=e.tags?.name;
      if(latitude==null||longitude==null||!name)return null;
      const km=haversine(lat,lon,latitude,longitude);
      return {id:`${e.type}-${e.id}`,name,category,latitude,longitude,distance_km:km,address:[e.tags?.["addr:housenumber"],e.tags?.["addr:street"],e.tags?.["addr:suburb"]].filter(Boolean).join(" ")||null};
    }).filter(Boolean).sort((a:any,b:any)=>a.distance_km-b.distance_km).slice(0,20);
    return NextResponse.json({places});
  }catch{return NextResponse.json({error:"Nearby search is temporarily unavailable."},{status:502})}
}

function haversine(lat1:number,lon1:number,lat2:number,lon2:number){
  const R=6371,rad=(x:number)=>x*Math.PI/180;
  const dLat=rad(lat2-lat1),dLon=rad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
