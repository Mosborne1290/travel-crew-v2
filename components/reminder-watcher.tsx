"use client";
import { useEffect, useState } from "react";

type Reminder={id:string;title:string;message:string|null;remind_at:string;target_url:string|null};

export function ReminderWatcher({reminders}:{reminders:Reminder[]}){
 useEffect(()=>{
  const timers:number[]=[];
  for(const r of reminders){
   const delay=new Date(r.remind_at).getTime()-Date.now();
   if(delay< -3600000)continue;
   const show=()=>{
    if("Notification" in window&&Notification.permission==="granted"){
      const n=new Notification(`Travel Crew · ${r.title}`,{body:r.message||"You have a trip reminder.",icon:"/icons/icon-192.png"});
      n.onclick=()=>{window.focus();if(r.target_url)window.location.href=r.target_url};
    }
   };
   if(delay<=0)show();else timers.push(window.setTimeout(show,Math.min(delay,2147483647)));
  }
  return()=>timers.forEach(id=>window.clearTimeout(id));
 },[reminders]);
 return null;
}

export function NotificationPermissionButton(){
 const [available,setAvailable]=useState(false);
 useEffect(()=>{setAvailable("Notification" in window&&Notification.permission==="default")},[]);
 async function request(){
  if("Notification" in window&&Notification.permission==="default"){
   const result=await Notification.requestPermission();
   setAvailable(result==="default");
  }
 }
 if(!available)return null;
 return <button className="secondary compact" type="button" onClick={request}>Enable Browser Alerts</button>;
}
