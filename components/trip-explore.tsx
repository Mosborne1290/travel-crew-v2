"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Place={id:string;name:string;latitude:number;longitude:number;address:string|null;website:string|null;category:string;description:string|null};

export function TripExplore({tripId,userId,destination}:{tripId:string;userId:string;destination:{name:string;latitude:number|null;longitude:number|null}|null}){
  const supabase=useMemo(()=>createClient(),[]);
  const [category,setCategory]=useState("attractions");const [places,setPlaces]=useState<Place[]>([]);
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");

  async function search(next=category){
    setCategory(next);setBusy(true);setMessage("");
    if(destination?.latitude==null||destination.longitude==null){setMessage("Confirm the destination under Weather first so Travel Crew knows where to search.");setBusy(false);return;}
    try{
      const r=await fetch(`/api/explore?lat=${destination.latitude}&lon=${destination.longitude}&category=${next}&radius=5000`);
      const p=await r.json();if(!r.ok)throw new Error(p.error||"Explore failed.");
      setPlaces(p.places??[]);if(!(p.places??[]).length)setMessage("No results found in this category.");
    }catch(e){setMessage(e instanceof Error?e.message:"Explore failed.");}
    finally{setBusy(false);}
  }

  async function save(p:Place){
    const {error}=await supabase.from("saved_places").insert({
      trip_id:tripId,created_by:userId,name:p.name,category:p.category==="restaurants"?"restaurant":p.category==="cafes"?"cafe":p.category==="museums"?"museum":p.category==="parks"?"park":"attraction",
      address:p.address,website_url:p.website,description:p.description,latitude:p.latitude,longitude:p.longitude,notes:"Saved from Explore",
    });
    setMessage(error?error.message:`${p.name} saved to Places and Map.`);
  }

  async function share(p:Place){
    const {error}=await supabase.rpc("share_trip_item_to_chat",{p_trip_id:tripId,p_message_text:`📍 ${p.name}${p.address?` · ${p.address}`:""}`,p_message_type:"place"});
    setMessage(error?error.message:`${p.name} shared to chat.`);
  }

  const cats=[["attractions","Things To Do"],["restaurants","Restaurants"],["cafes","Cafés"],["museums","Museums"],["parks","Parks & Gardens"]];
  return <div className="explore-stage5">
    <section className="explore-hero panel"><div><div className="eyebrow">Explore {destination?.name||"your destination"}</div><h2>Find places around your trip</h2><p className="muted">Free OpenStreetMap-based discovery within about 5 km of the saved destination.</p></div>
      <div className="explore-cats">{cats.map(([id,label])=><button key={id} className={category===id?"active":""} onClick={()=>search(id)} disabled={busy}>{label}</button>)}</div>
    </section>
    {!places.length&&!busy?<div className="empty-state"><h3>Choose a category to explore</h3><p className="muted">Results can be saved directly to Saved Places and the Trip Map.</p></div>:null}
    {busy?<div className="empty-mini">Finding nearby places…</div>:null}
    <section className="explore-grid">{places.map(p=><article className="explore-card" key={p.id}><div className="explore-pin">📍</div><h3>{p.name}</h3>{p.description?<div className="badge">{p.description}</div>:null}{p.address?<p className="muted">{p.address}</p>:null}<div className="inline-actions"><button onClick={()=>save(p)}>Save Place</button><button onClick={()=>share(p)}>Share to Chat</button>{p.website?<a href={p.website} target="_blank" rel="noreferrer">Website ↗</a>:null}</div></article>)}</section>
    {message?<div className={message.includes("saved")||message.includes("shared")?"success":"error"}>{message}</div>:null}
  </div>
}
