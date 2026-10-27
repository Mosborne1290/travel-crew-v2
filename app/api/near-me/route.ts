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

const photonTags:Record<string,string>={
  restaurants:"amenity:restaurant",
  cafes:"amenity:cafe",
  bars:"amenity:pub",
  pharmacies:"amenity:pharmacy",
  supermarkets:"shop:supermarket",
  convenience:"shop:convenience",
  hospitals:"amenity:hospital",
  medical:"amenity:clinic",
  toilets:"amenity:toilets",
  fuel:"amenity:fuel",
  parking:"amenity:parking",
  transport:"public_transport:station",
  laundromats:"shop:laundry",
  shopping:"shop",
  attractions:"tourism",
  landmarks:"historic",
};

const OVERPASS_ENDPOINTS=[
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

export async function GET(request:Request){
  const supabase=await createClient();
  const {data}=await supabase.auth.getUser();
  if(!data.user)return NextResponse.json({error:"Unauthorised"},{status:401});

  const url=new URL(request.url);
  const lat=Number(url.searchParams.get("lat"));
  const lon=Number(url.searchParams.get("lon"));
  const category=url.searchParams.get("category")||"restaurants";
  const radius=Math.min(5000,Math.max(250,Number(url.searchParams.get("radius")||3000)));

  if(!Number.isFinite(lat)||!Number.isFinite(lon)){
    return NextResponse.json({error:"Valid location is required."},{status:400});
  }

  const filter=filters[category]||filters.restaurants;
  const q=`[out:json][timeout:15];(
    node${filter}(around:${radius},${lat},${lon});
    way${filter}(around:${radius},${lat},${lon});
    relation${filter}(around:${radius},${lat},${lon});
  );out center tags 40;`;

  for(const endpoint of OVERPASS_ENDPOINTS){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),8500);
    try{
      const response=await fetch(endpoint,{
        method:"POST",
        headers:{
          "Content-Type":"application/x-www-form-urlencoded;charset=UTF-8",
          "Accept":"application/json",
          "User-Agent":"Travel-Crew-V2/1.0",
        },
        body:new URLSearchParams({data:q}),
        signal:controller.signal,
        cache:"no-store",
      });
      clearTimeout(timer);
      if(!response.ok)continue;

      const payload=await response.json();
      const places=(payload.elements??[])
        .map((e:any)=>{
          const latitude=e.lat??e.center?.lat;
          const longitude=e.lon??e.center?.lon;
          const name=e.tags?.name;
          if(latitude==null||longitude==null||!name)return null;
          const address=[
            e.tags?.["addr:housenumber"],
            e.tags?.["addr:street"],
            e.tags?.["addr:suburb"]||e.tags?.["addr:city"]||e.tags?.["addr:town"],
          ].filter(Boolean).join(" ")||null;
          return {
            id:`${e.type}-${e.id}`,
            name,
            category,
            latitude,
            longitude,
            distance_km:haversine(lat,lon,latitude,longitude),
            address,
          };
        })
        .filter(Boolean)
        .sort((a:any,b:any)=>a.distance_km-b.distance_km)
        .slice(0,24);

      if(places.length){
        return NextResponse.json({places,source:"OpenStreetMap nearby search"},{headers:{"Cache-Control":"private, max-age=120"}});
      }
    }catch{
      clearTimeout(timer);
    }
  }

  try{
    const photonTag=photonTags[category]||photonTags.restaurants;
    const params=new URLSearchParams({
      lat:String(lat),
      lon:String(lon),
      radius:String(Math.max(1,Math.ceil(radius/1000))),
      limit:"24",
      osm_tag:photonTag,
    });
    const response=await fetch(`https://photon.komoot.io/reverse?${params.toString()}`,{
      headers:{"Accept":"application/json","User-Agent":"Travel-Crew-V2/1.0"},
      cache:"no-store",
    });

    if(response.ok){
      const payload=await response.json();
      const places=(payload.features??[])
        .map((feature:any,index:number)=>{
          const coordinates=feature.geometry?.coordinates;
          const props=feature.properties??{};
          if(!Array.isArray(coordinates)||coordinates.length<2)return null;
          const longitude=Number(coordinates[0]),latitude=Number(coordinates[1]);
          if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return null;
          const name=props.name||props.street||props.city||props.locality;
          if(!name)return null;
          const address=[
            props.housenumber,
            props.street,
            props.district||props.city||props.locality,
            props.state,
          ].filter(Boolean).join(" ")||null;
          return {
            id:`photon-${props.osm_type||"p"}-${props.osm_id||index}`,
            name,
            category,
            latitude,
            longitude,
            distance_km:haversine(lat,lon,latitude,longitude),
            address,
          };
        })
        .filter(Boolean)
        .sort((a:any,b:any)=>a.distance_km-b.distance_km)
        .slice(0,20);

      if(places.length){
        return NextResponse.json({places,source:"OpenStreetMap fallback"},{headers:{"Cache-Control":"private, max-age=120"}});
      }
    }
  }catch{}

  return NextResponse.json({
    error:"Nearby search is temporarily unavailable. Try a different location or try again shortly."
  },{status:503});
}

function haversine(lat1:number,lon1:number,lat2:number,lon2:number){
  const R=6371;
  const rad=(x:number)=>x*Math.PI/180;
  const dLat=rad(lat2-lat1);
  const dLon=rad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
