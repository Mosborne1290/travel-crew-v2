import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

function configure(){
  const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey=process.env.VAPID_PRIVATE_KEY;
  const subject=process.env.VAPID_SUBJECT;
  if(!publicKey||!privateKey||!subject)throw new Error("VAPID push keys are not configured.");
  webpush.setVapidDetails(subject,publicKey,privateKey);
}

export async function POST(){
  const supabase=await createClient();
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user)return NextResponse.json({error:"Unauthorised"},{status:401});

  try{configure()}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Push is not configured."},{status:503})}

  const {data:subs,error}=await supabase.from("push_subscriptions").select("id,endpoint,p256dh,auth_key").eq("user_id",auth.user.id);
  if(error)return NextResponse.json({error:error.message},{status:400});
  if(!subs?.length)return NextResponse.json({error:"No push subscription is registered for this device."},{status:400});

  let sent=0;
  for(const s of subs){
    try{
      await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth_key}},
        JSON.stringify({title:"Travel Crew",body:"Push notifications are working.",url:"/dashboard",tag:"travel-crew-test"}));
      sent++;
    }catch(err:any){
      if(err?.statusCode===404||err?.statusCode===410)await supabase.from("push_subscriptions").delete().eq("id",s.id);
    }
  }
  return NextResponse.json({ok:true,sent});
}
