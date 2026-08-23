import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const filters:Record<string,string>={
  restaurants:'["amenity"="restaurant"]',
  cafes:'["amenity"="cafe"]',
  bars:'["amenity"~"bar|pub"]',
  pharmacies:'["amenity"="pharmacy"]',
  supermarkets:'["shop"="supermarket"]',
  convenience:'["shop"="convenience"]',
  hospitals:'["amenity"="hospital"]',
  medical:'["amenity"~"clinic|doctors"]',
  toilets:'["amenity"="toilets"]',
  fuel:'["amenity"="fuel"]',
  parking:'["amenity"="parking"]',
  transport:'["public_transport"~"station|platform"]',
  laundromats:'["shop"="laundry"]',
  shopping:'["shop"~"mall|department_store|clothes|jewelry|gift"]',
  attractions:'["tourism"~"attraction|viewpoint|museum"]',
  landmarks:'["historic"]',
};

const overpassServers = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
];

export async function GET(request:Request){
  const supabase=await createClient();
  const {data}=await supabase.auth.getUser();

  if(!data.user){
    return NextResponse.json({error:"Unauthorised"},{status:401});
  }

  const url=new URL(request.url);
  const lat=Number(url.searchParams.get("lat"));
  const lon=Number(url.searchParams.get("lon"));
  const category=url.searchParams.get("category")||"restaurants";
  const radius=Math.min(5000,Math.max(250,Number(url.searchParams.get("radius")||2000)));

  if(!Number.isFinite(lat)||!Number.isFinite(lon)){
    return NextResponse.json({error:"Valid location is required."},{status:400});
  }

  const filter=filters[category]||filters.restaurants;
  const query=`[out:json][timeout:12];
(
  node${filter}(around:${radius},${lat},${lon});
  way${filter}(around:${radius},${lat},${lon});
  relation${filter}(around:${radius},${lat},${lon});
);
out center tags 40;`;

  let lastError="";

  for(const server of overpassServers){
    try{
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),14000);

      const response=await fetch(server,{
        method:"POST",
        headers:{
          "Content-Type":"application/x-www-form-urlencoded;charset=UTF-8",
          "Accept":"application/json",
          "User-Agent":"TravelCrewV2/1.0"
        },
        body:new URLSearchParams({data:query}),
        cache:"no-store",
        signal:controller.signal,
      });

      clearTimeout(timeout);

      if(!response.ok){
        lastError=`${response.status} ${response.statusText}`;
        continue;
      }

      const payload=await response.json();

      const places=(payload.elements??[])
        .map((e:any)=>{
          const latitude=e.lat??e.center?.lat;
          const longitude=e.lon??e.center?.lon;
          const name=e.tags?.name;

          if(latitude==null||longitude==null||!name)return null;

          const km=haversine(lat,lon,latitude,longitude);

          return {
            id:`${e.type}-${e.id}`,
            name,
            category,
            latitude,
            longitude,
            distance_km:km,
            address:[
              e.tags?.["addr:housenumber"],
              e.tags?.["addr:street"],
              e.tags?.["addr:suburb"],
              e.tags?.["addr:city"]
            ].filter(Boolean).join(" ")||null,
          };
        })
        .filter(Boolean)
        .sort((a:any,b:any)=>a.distance_km-b.distance_km)
        .slice(0,25);

      return NextResponse.json({
        places,
        provider:new URL(server).hostname
      },{
        headers:{
          "Cache-Control":"private, max-age=60"
        }
      });

    }catch(error:any){
      lastError=error?.name==="AbortError"
        ?"request timed out"
        : error?.message||"unknown provider error";
    }
  }

  return NextResponse.json({
    error:"Nearby search providers are temporarily busy. Please wait a moment and try again.",
    technical_detail:lastError
  },{status:503});
}

function haversine(lat1:number,lon1:number,lat2:number,lon2:number){
  const R=6371;
  const rad=(x:number)=>x*Math.PI/180;
  const dLat=rad(lat2-lat1);
  const dLon=rad(lon2-lon1);

  const a=
    Math.sin(dLat/2)**2+
    Math.cos(rad(lat1))*
    Math.cos(rad(lat2))*
    Math.sin(dLon/2)**2;

  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
