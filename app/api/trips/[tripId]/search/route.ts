import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request:Request,{params}:{params:Promise<{tripId:string}>}){
  const {tripId}=await params;
  const supabase=await createClient();
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user)return NextResponse.json({error:"Unauthorised"},{status:401});

  const q=new URL(request.url).searchParams.get("q")?.trim()||"";
  if(q.length<2)return NextResponse.json({results:[]});

  const like=`%${q.replace(/[%_]/g,"")}%`;

  const [{data:activities},{data:bookings},{data:places},{data:documents},{data:expenses},{data:journal},{data:rooms}]=await Promise.all([
    supabase.from("activities").select("id,title,activity_type,start_datetime,venue_name,address,notes").eq("trip_id",tripId).or(`title.ilike.${like},venue_name.ilike.${like},address.ilike.${like},notes.ilike.${like}`).limit(20),
    supabase.from("bookings").select("id,booking_type,provider,booking_reference,confirmation_number,start_datetime,notes").eq("trip_id",tripId).or(`provider.ilike.${like},booking_reference.ilike.${like},confirmation_number.ilike.${like},notes.ilike.${like}`).limit(20),
    supabase.from("saved_places").select("id,name,category,address,notes").eq("trip_id",tripId).or(`name.ilike.${like},address.ilike.${like},notes.ilike.${like}`).limit(20),
    supabase.from("documents").select("id,name,document_type,booking_reference,expiry_date,notes").eq("trip_id",tripId).or(`name.ilike.${like},booking_reference.ilike.${like},notes.ilike.${like}`).limit(20),
    supabase.from("expenses").select("id,description,category,amount,currency,expense_date,notes").eq("trip_id",tripId).or(`description.ilike.${like},category.ilike.${like},notes.ilike.${like}`).limit(20),
    supabase.from("journal_entries").select("id,entry_date,title,notes,highlight,favourite_moment").eq("trip_id",tripId).or(`title.ilike.${like},notes.ilike.${like},highlight.ilike.${like},favourite_moment.ilike.${like}`).limit(20),
    supabase.from("chat_rooms").select("id").eq("trip_id",tripId),
  ]);

  const roomIds=(rooms??[]).map(r=>r.id);
  let messages:any[]=[];
  if(roomIds.length){
    const {data}=await supabase.from("messages").select("id,room_id,message_text,created_at,user_id").in("room_id",roomIds).ilike("message_text",like).is("deleted_at",null).order("created_at",{ascending:false}).limit(20);
    messages=data??[];
  }

  const results=[
    ...(activities??[]).map(x=>({kind:"activity",id:x.id,title:x.title,detail:[x.activity_type,x.venue_name,x.address].filter(Boolean).join(" · "),url:`/trips/${tripId}/plan`})),
    ...(bookings??[]).map(x=>({kind:"booking",id:x.id,title:x.provider||x.booking_type,detail:[x.booking_type,x.booking_reference].filter(Boolean).join(" · "),url:`/trips/${tripId}/bookings`})),
    ...(places??[]).map(x=>({kind:"place",id:x.id,title:x.name,detail:[x.category,x.address].filter(Boolean).join(" · "),url:`/trips/${tripId}/places`})),
    ...(documents??[]).map(x=>({kind:"document",id:x.id,title:x.name,detail:[x.document_type,x.expiry_date?`Expires ${x.expiry_date}`:null].filter(Boolean).join(" · "),url:`/trips/${tripId}/documents`})),
    ...(expenses??[]).map(x=>({kind:"expense",id:x.id,title:x.description,detail:`${x.currency} ${Number(x.amount).toFixed(2)} · ${x.category}`,url:`/trips/${tripId}/budget`})),
    ...(journal??[]).map(x=>({kind:"journal",id:x.id,title:x.title||`Journal · ${x.entry_date}`,detail:x.highlight||x.favourite_moment||"",url:`/trips/${tripId}/journal`})),
    ...messages.map(x=>({kind:"chat",id:x.id,title:"Trip Chat",detail:x.message_text||"",url:`/trips/${tripId}/chat`})),
  ];

  return NextResponse.json({results:results.slice(0,80)});
}
