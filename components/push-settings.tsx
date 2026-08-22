"use client";
import { useEffect,useState } from "react";

function urlBase64ToUint8Array(input:string){
  const base64String=input.trim().replace(/^["']|["']$/g,"");
  if(!/^[A-Za-z0-9_-]+$/.test(base64String)){
    throw new Error("The VAPID public key contains invalid characters. In Vercel, save only the raw public key without quotes or labels.");
  }
  const padding="=".repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
  try{
    const rawData=window.atob(base64);
    return Uint8Array.from([...rawData].map(c=>c.charCodeAt(0)));
  }catch{
    throw new Error("The VAPID public key is not valid Base64URL. Re-copy only the public key value and redeploy Vercel.");
  }
}

export function PushSettings(){
 const [status,setStatus]=useState("Checking…");const [busy,setBusy]=useState(false);
 useEffect(()=>{(async()=>{if(!("serviceWorker" in navigator)||!("PushManager" in window)){setStatus("Push is not supported on this browser.");return}const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();setStatus(sub?"Push enabled on this device.":"Push not enabled.");})()},[]);
 async function enable(){setBusy(true);try{
  if(!("Notification" in window))throw new Error("Notifications are not supported.");
  const permission=await Notification.requestPermission();if(permission!=="granted")throw new Error("Notification permission was not granted.");
  const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;if(!publicKey)throw new Error("VAPID public key is not configured.");
  const reg=await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(publicKey)});
  const r=await fetch("/api/push/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(sub.toJSON())});const p=await r.json();if(!r.ok)throw new Error(p.error||"Could not register push.");
  setStatus("Push enabled on this device.");
 }catch(e){setStatus(e instanceof Error?e.message:"Could not enable push.");}finally{setBusy(false)}}
 async function test(){setBusy(true);try{const r=await fetch("/api/push/test",{method:"POST"});const p=await r.json();if(!r.ok)throw new Error(p.error||"Push test failed.");setStatus(`Test push sent to ${p.sent} subscription(s).`)}catch(e){setStatus(e instanceof Error?e.message:"Push test failed.")}finally{setBusy(false)}}
 return <section className="panel push-settings"><h2>Push Notifications</h2><p className="muted">Opt in to receive Travel Crew reminders even when the app is closed, where supported by the device/browser.</p><div className="inline-actions"><button onClick={enable} disabled={busy}>Enable Push</button><button onClick={test} disabled={busy}>Send Test Push</button></div><div className="push-status">{status}</div></section>
}
