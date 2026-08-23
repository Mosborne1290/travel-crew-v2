import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request:Request){
  const supabase=await createClient();
  const {data}=await supabase.auth.getUser();
  if(!data.user)return NextResponse.json({error:"Unauthorised"},{status:401});

  const u=new URL(request.url);
  const lat=Number(u.searchParams.get("lat")),lon=Number(u.searchParams.get("lon"));
  const date=u.searchParams.get("date")||"";
  const timezone=u.searchParams.get("timezone")||"Australia/Sydney";
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({error:"Valid cruise-day coordinates and date are required."},{status:400});

  try{
    const api=new URL("https://api.open-meteo.com/v1/forecast");
    api.searchParams.set("latitude",String(lat));api.searchParams.set("longitude",String(lon));
    api.searchParams.set("daily","weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
    api.searchParams.set("timezone",timezone);api.searchParams.set("start_date",date);api.searchParams.set("end_date",date);
    const r=await fetch(api,{next:{revalidate:1800}});
    if(!r.ok)return NextResponse.json({error:"Unable to load weather."},{status:502});
    const p=await r.json();const code=p.daily?.weather_code?.[0];
    const summary=code===0?"Clear":code<=3?"Partly cloudy":code<=48?"Cloudy / fog":code<=67?"Rain possible":code<=82?"Showers":code<=99?"Storm risk":"Forecast";
    return NextResponse.json({
      summary,
      temperature_max:p.daily?.temperature_2m_max?.[0]??null,
      temperature_min:p.daily?.temperature_2m_min?.[0]??null,
      precipitation_probability_max:p.daily?.precipitation_probability_max?.[0]??null,
    });
  }catch{return NextResponse.json({error:"Unable to load weather. Your itinerary is still available."},{status:502})}
}
