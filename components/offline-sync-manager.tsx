"use client";
import { useEffect,useState } from "react";

export type OfflineMutation={client_mutation_id:string;trip_id:string;mutation_type:string;payload:any};
const KEY="travel-crew-offline-mutations-v1";

export function queueOfflineMutation(mutation:Omit<OfflineMutation,"client_mutation_id">){
  const current:OfflineMutation[]=JSON.parse(localStorage.getItem(KEY)||"[]");
  current.push({...mutation,client_mutation_id:crypto.randomUUID()});
  localStorage.setItem(KEY,JSON.stringify(current));
  window.dispatchEvent(new Event("travel-crew-offline-queue"));
}

export function OfflineSyncManager(){
 const [online,setOnline]=useState(true),[count,setCount]=useState(0),[syncing,setSyncing]=useState(false),[message,setMessage]=useState("");

 function read(){try{const q=JSON.parse(localStorage.getItem(KEY)||"[]");setCount(Array.isArray(q)?q.length:0)}catch{setCount(0)}}

 async function sync(){
  if(!navigator.onLine)return;
  let queue:OfflineMutation[]=[];
  try{queue=JSON.parse(localStorage.getItem(KEY)||"[]")}catch{}
  if(!queue.length){read();return}
  setSyncing(true);setMessage("");
  try{
    const r=await fetch("/api/offline-sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mutations:queue})});
    const p=await r.json();if(!r.ok)throw new Error(p.error||"Offline sync failed.");
    const failed=new Set((p.results??[]).filter((x:any)=>!x.ok).map((x:any)=>x.id));
    const remaining=queue.filter(m=>failed.has(m.client_mutation_id));
    localStorage.setItem(KEY,JSON.stringify(remaining));setCount(remaining.length);
    setMessage(remaining.length?`${remaining.length} change(s) still need attention.`:"Offline changes synced.");
  }catch(e){setMessage(e instanceof Error?e.message:"Offline sync failed.")}finally{setSyncing(false)}
 }

 useEffect(()=>{
  setOnline(navigator.onLine);read();
  const on=()=>{setOnline(true);sync()},off=()=>setOnline(false),queue=()=>read();
  window.addEventListener("online",on);window.addEventListener("offline",off);window.addEventListener("travel-crew-offline-queue",queue);
  if(navigator.onLine)sync();
  return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off);window.removeEventListener("travel-crew-offline-queue",queue)}
 },[]);

 return <div className={`sync-indicator ${online?"online":"offline"}`} title={message}>
   <span>{online?"●":"●"}</span>
   {online?(syncing?"Syncing…":count?`${count} pending`:"Synced"):"Offline"}
   {online&&count&&!syncing?<button onClick={sync}>Sync now</button>:null}
 </div>
}
