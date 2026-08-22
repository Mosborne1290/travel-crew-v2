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

function friendlyPushError(error:unknown){
  const raw=error instanceof Error?error.message:String(error||"");
  const name=(error as any)?.name||"";

  if(name==="NotAllowedError"){
    return "Notifications are blocked for Travel Crew in this browser. Open the site permissions, allow Notifications, then try Repair Push.";
  }
  if(name==="AbortError" || /could not connect to push server/i.test(raw)){
    return "This browser could not connect to its push service. This is usually a local browser/network issue. Try Repair Push, then check that notifications are allowed and that no VPN, firewall or security software is blocking browser push.";
  }
  if(name==="InvalidStateError"){
    return "The browser has a stale push subscription. Use Repair Push to clear it and register this device again.";
  }
  if(/service worker/i.test(raw)){
    return "The Travel Crew service worker is not ready on this device. Refresh the app once, then use Repair Push.";
  }
  return raw||"Push registration failed.";
}

export function PushSettings(){
 const [status,setStatus]=useState("Checking…");
 const [busy,setBusy]=useState(false);
 const [details,setDetails]=useState<string[]>([]);

 useEffect(()=>{check()},[]);

 async function check(){
   const items:string[]=[];
   try{
     items.push(`Secure connection: ${window.isSecureContext?"Yes":"No"}`);
     items.push(`Notifications supported: ${"Notification" in window?"Yes":"No"}`);
     items.push(`Service worker supported: ${"serviceWorker" in navigator?"Yes":"No"}`);
     items.push(`Push supported: ${"PushManager" in window?"Yes":"No"}`);
     if("Notification" in window)items.push(`Notification permission: ${Notification.permission}`);

     if(!("serviceWorker" in navigator)||!("PushManager" in window)){
       setStatus("Push is not supported on this browser.");
       setDetails(items);
       return;
     }

     const reg=await navigator.serviceWorker.ready;
     items.push(`Service worker ready: ${reg.active?"Yes":"No"}`);
     const sub=await reg.pushManager.getSubscription();
     items.push(`Device subscription: ${sub?"Registered":"Not registered"}`);
     setStatus(sub?"Push enabled on this device.":"Push not enabled.");
   }catch(e){
     setStatus(friendlyPushError(e));
   }
   setDetails(items);
 }

 async function registerFresh(forceRepair=false){
   setBusy(true);setStatus(forceRepair?"Repairing push…":"Enabling push…");
   try{
     if(!window.isSecureContext)throw new Error("Push requires a secure HTTPS connection.");
     if(!("Notification" in window))throw new Error("Notifications are not supported.");
     if(!("serviceWorker" in navigator))throw new Error("Service workers are not supported.");
     if(!("PushManager" in window))throw new Error("Web Push is not supported.");

     const permission=await Notification.requestPermission();
     if(permission!=="granted")throw Object.assign(new Error("Notification permission was not granted."),{name:"NotAllowedError"});

     const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
     if(!publicKey)throw new Error("VAPID public key is not configured.");

     // Make sure the current Travel Crew worker is installed and active.
     let reg=await navigator.serviceWorker.getRegistration("/");
     if(!reg){
       reg=await navigator.serviceWorker.register("/sw.js",{scope:"/"});
     }
     await navigator.serviceWorker.ready;
     await reg.update().catch(()=>undefined);

     let sub=await reg.pushManager.getSubscription();

     if(forceRepair && sub){
       // Best-effort remove server copy, then remove local browser subscription.
       try{
         await fetch("/api/push/subscribe",{
           method:"DELETE",
           headers:{"Content-Type":"application/json"},
           body:JSON.stringify({endpoint:sub.endpoint})
         });
       }catch{}
       await sub.unsubscribe().catch(()=>false);
       sub=null;
     }

     if(!sub){
       try{
         sub=await reg.pushManager.subscribe({
           userVisibleOnly:true,
           applicationServerKey:urlBase64ToUint8Array(publicKey)
         });
       }catch(firstError){
         // A browser can retain a corrupted push registration even after
         // getSubscription() returns null. Re-register the service worker once.
         if(forceRepair){
           const registrations=await navigator.serviceWorker.getRegistrations();
           for(const existing of registrations){
             if(existing.scope.startsWith(window.location.origin)){
               await existing.unregister().catch(()=>false);
             }
           }
           const fresh=await navigator.serviceWorker.register("/sw.js",{scope:"/"});
           await navigator.serviceWorker.ready;
           sub=await fresh.pushManager.subscribe({
             userVisibleOnly:true,
             applicationServerKey:urlBase64ToUint8Array(publicKey)
           });
           reg=fresh;
         }else{
           throw firstError;
         }
       }
     }

     const response=await fetch("/api/push/subscribe",{
       method:"POST",
       headers:{"Content-Type":"application/json"},
       body:JSON.stringify(sub.toJSON())
     });
     const payload=await response.json();
     if(!response.ok)throw new Error(payload.error||"Could not save the push subscription.");

     setStatus(forceRepair?"Push repaired and enabled on this device.":"Push enabled on this device.");
     await check();
   }catch(e){
     setStatus(friendlyPushError(e));
     await check().catch(()=>undefined);
   }finally{
     setBusy(false);
   }
 }

 async function test(){
   setBusy(true);setStatus("Sending test push…");
   try{
     const r=await fetch("/api/push/test",{method:"POST"});
     const p=await r.json();
     if(!r.ok)throw new Error(p.error||"Push test failed.");
     setStatus(`Test push sent to ${p.sent} subscription(s).`);
   }catch(e){
     setStatus(friendlyPushError(e));
   }finally{
     setBusy(false);
   }
 }

 return <section className="panel push-settings">
   <h2>Push Notifications</h2>
   <p className="muted">Opt in to receive Travel Crew reminders even when the app is closed, where supported by the device/browser.</p>

   <div className="inline-actions">
     <button onClick={()=>registerFresh(false)} disabled={busy}>Enable Push</button>
     <button className="secondary" onClick={()=>registerFresh(true)} disabled={busy}>Repair Push</button>
     <button onClick={test} disabled={busy}>Send Test Push</button>
   </div>

   <div className="push-status">{status}</div>

   <details className="push-diagnostics">
     <summary>Push diagnostics</summary>
     <div>{details.map((d,i)=><div key={i}>{d}</div>)}</div>
   </details>
 </section>
}
