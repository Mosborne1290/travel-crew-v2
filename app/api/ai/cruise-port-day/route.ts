import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function minutes(value:string){
  const [h,m]=value.split(":").map(Number);return h*60+m;
}
function hhmm(total:number){
  const h=Math.floor(total/60)%24,m=total%60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

export async function POST(request:Request){
  const supabase=await createClient();
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user)return NextResponse.json({error:"Unauthorised"},{status:401});

  const body=await request.json();
  const port=String(body.port||"").trim();
  const start=String(body.disembark_time||"09:00").slice(0,5);
  const safeReturn=String(body.recommended_return_time||body.required_return_time||"15:00").slice(0,5);
  const interests=(Array.isArray(body.interests)?body.interests:[]).map(String);
  const pace=String(body.pace||"Moderate");

  if(!port)return NextResponse.json({error:"Port/city is required."},{status:400});

  // Free safe fallback. It proposes rather than saves.
  const categories=interests.length?interests:["Local culture","Food","Scenery","Shopping"];
  const duration=pace==="Relaxed"?75:pace==="Busy"?45:60;
  let cursor=minutes(start)+15;
  const latest=minutes(safeReturn)-30; // preserve return travel/safety buffer
  const suggestions:any[]=[];

  for(const interest of categories){
    if(cursor+duration>latest)break;
    suggestions.push({
      title:`${interest} stop in ${port}`,
      category:
        /shop|souvenir|market/i.test(interest)?"Shopping":
        /food/i.test(interest)?"Food":
        /museum|history/i.test(interest)?"Museum":
        /beach/i.test(interest)?"Beach":
        /photo|scenery/i.test(interest)?"Lookout":"Attraction",
      priority:suggestions.length<2?"Must Do":"Recommended",
      start:hhmm(cursor),
      end:hhmm(cursor+duration),
      notes:`Suggested ${interest.toLowerCase()} activity. Confirm opening hours and travel time before accepting.`,
      weather_dependent:/beach|scenery|photography|wildlife/i.test(interest),
      bad_weather_alternative:/beach|scenery|photography|wildlife/i.test(interest)?"Indoor museum, shopping or cafe alternative":null,
    });
    cursor+=duration+15;
  }

  return NextResponse.json({
    source:"Free Smart Draft",
    safety_note:`Nothing is scheduled after ${safeReturn}. A return-to-port buffer is preserved.`,
    suggestions
  });
}
