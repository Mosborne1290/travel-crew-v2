import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request:Request){
  const supabase=await createClient();
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user)return NextResponse.json({error:"Unauthorised"},{status:401});

  const body=await request.json();
  const endpoint=String(body?.endpoint||"");
  const p256dh=String(body?.keys?.p256dh||"");
  const authKey=String(body?.keys?.auth||"");

  if(!endpoint||!p256dh||!authKey){
    return NextResponse.json({error:"Invalid push subscription."},{status:400});
  }

  const {error}=await supabase.from("push_subscriptions").upsert({
    user_id:auth.user.id,
    endpoint,
    p256dh,
    auth_key:authKey,
    user_agent:request.headers.get("user-agent"),
    updated_at:new Date().toISOString(),
  },{onConflict:"user_id,endpoint"});

  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({ok:true});
}

export async function DELETE(request:Request){
  const supabase=await createClient();
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user)return NextResponse.json({error:"Unauthorised"},{status:401});
  const {endpoint}=await request.json();
  const {error}=await supabase.from("push_subscriptions").delete().eq("user_id",auth.user.id).eq("endpoint",String(endpoint||""));
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({ok:true});
}
