"use client";
import { useState } from "react";
export function OfflineTripButton({tripId}:{tripId:string}){const [message,setMessage]=useState("");
 async function download(){setMessage("Saving…");try{const r=await fetch(`/api/trips/${tripId}/offline`);const data=await r.json();if(!r.ok)throw new Error(data.error||"Could not download trip.");localStorage.setItem(`travel-crew-offline-${tripId}`,JSON.stringify(data));if("caches" in window){const page=await fetch(`/offline-trip/${tripId}`);const cache=await caches.open("travel-crew-offline-trips-v1");await cache.put(`/offline-trip/${tripId}`,page.clone())}setMessage("Trip downloaded for offline use.");}catch(e){setMessage(e instanceof Error?e.message:"Could not download trip.")}}
 return <div className="offline-download"><button className="secondary" type="button" onClick={download}>⬇ Download Trip for Offline Use</button>{message?<small>{message}</small>:null}</div>}
