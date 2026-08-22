"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Place = {
  id:string; name:string; description:string|null; category:string|null; address:string|null;
  website_url:string|null; notes:string|null; latitude:number|null; longitude:number|null;
};

export function SavedPlacesStage5({
  tripId,userId,destinationName,initialPlaces,
}:{
  tripId:string;userId:string;destinationName:string;initialPlaces:Place[];
}) {
  const supabase=useMemo(()=>createClient(),[]);
  const [places,setPlaces]=useState(initialPlaces);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  async function refresh(){
    const {data}=await supabase.from("saved_places").select("id,name,description,category,address,website_url,notes,latitude,longitude").eq("trip_id",tripId).order("created_at",{ascending:false});
    setPlaces((data??[]) as Place[]);
  }

  async function geocode(query:string){
    try{
      const r=await fetch(`/api/location/search?q=${encodeURIComponent(query)}`);
      const p=await r.json();
      return r.ok&&p.results?.[0]?p.results[0]:null;
    }catch{return null}
  }

  async function add(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const formEl=event.currentTarget;const f=new FormData(formEl);
    setBusy(true);setMessage("");
    try{
      const name=String(f.get("name")||"").trim();
      const address=String(f.get("address")||"").trim();
      const loc=await geocode(address||`${name} ${destinationName}`);
      const {error}=await supabase.from("saved_places").insert({
        trip_id:tripId,created_by:userId,name,
        category:String(f.get("category")||"attraction"),
        description:String(f.get("description")||"").trim()||null,
        address:address||([loc?.name,loc?.admin1,loc?.country].filter(Boolean).join(", ")||null),
        website_url:String(f.get("website_url")||"").trim()||null,
        notes:String(f.get("notes")||"").trim()||null,
        latitude:loc?.latitude??null,longitude:loc?.longitude??null,
      });
      if(error)throw error;
      formEl.reset();await refresh();
      setMessage(loc?"Place saved and mapped.":"Place saved. Travel Crew could not map it automatically; add a more specific address if needed.");
    }catch(e){setMessage(e instanceof Error?e.message:"Could not save place.");}
    finally{setBusy(false);}
  }

  async function remap(p:Place){
    setBusy(true);setMessage("");
    const loc=await geocode(p.address||`${p.name} ${destinationName}`);
    if(!loc){setMessage("No map match found. Try editing the address.");setBusy(false);return;}
    const {error}=await supabase.from("saved_places").update({
      latitude:loc.latitude,longitude:loc.longitude,
      address:p.address||[loc.name,loc.admin1,loc.country].filter(Boolean).join(", "),
    }).eq("id",p.id);
    if(error)setMessage(error.message);else{await refresh();setMessage("Location mapped.");}
    setBusy(false);
  }

  async function share(p:Place){
    const {error}=await supabase.rpc("share_trip_item_to_chat",{
      p_trip_id:tripId,
      p_message_text:`📍 ${p.name}${p.address?` · ${p.address}`:""}`,
      p_message_type:"place",
    });
    setMessage(error?error.message:"Place shared to trip chat.");
  }

  async function remove(id:string){
    if(!confirm("Delete this saved place?"))return;
    const {error}=await supabase.from("saved_places").delete().eq("id",id);
    if(error)setMessage(error.message);else await refresh();
  }

  return <div className="two-col stage-two-grid">
    <section className="panel">
      <div className="section-title-row"><div><h2>Saved Places</h2><div className="muted">Places now map automatically when possible.</div></div><span className="badge">{places.length}</span></div>
      {places.length?<div className="place-grid">{places.map(p=><article className="place-card stage5-place" key={p.id}>
        <div className="place-symbol">{p.category==="restaurant"?"🍽️":p.category==="cafe"?"☕":p.category==="shopping"?"🛍️":p.category==="beach"?"🏖️":p.category==="tour"?"🎟️":"📍"}</div>
        <div className="place-copy">
          <strong>{p.name}</strong><span className="badge">{p.category||"place"}</span>
          {p.address?<div className="muted">{p.address}</div>:null}
          <div className="map-status">{p.latitude!=null&&p.longitude!=null?"🗺 Mapped":"⚠ Not mapped"}</div>
          {p.description?<p>{p.description}</p>:null}
          <div className="inline-actions">
            {p.website_url?<a href={p.website_url} target="_blank" rel="noreferrer">Website ↗</a>:null}
            <button type="button" onClick={()=>remap(p)}>Find Location</button>
            <button type="button" onClick={()=>share(p)}>Share to Chat</button>
          </div>
        </div>
        <button className="icon-danger" type="button" onClick={()=>remove(p.id)}>×</button>
      </article>)}</div>:<div className="empty-mini">No saved places yet.</div>}
    </section>

    <form className="panel form-stack" onSubmit={add}>
      <div><h3>Add a Place</h3><div className="muted">Travel Crew will search for coordinates so it appears on the trip map.</div></div>
      <div className="field"><label>Name *</label><input name="name" required placeholder="Miku Vancouver"/></div>
      <div className="field"><label>Category</label><select name="category"><option value="restaurant">Restaurant</option><option value="cafe">Cafe</option><option value="attraction">Attraction</option><option value="tour">Tour</option><option value="shopping">Shopping</option><option value="beach">Beach</option><option value="museum">Museum</option><option value="park">Park</option><option value="other">Other</option></select></div>
      <div className="field"><label>Address</label><input name="address" placeholder="Specific address gives the best map result"/></div>
      <div className="field"><label>Website</label><input name="website_url" type="url"/></div>
      <div className="field"><label>Description</label><textarea name="description"/></div>
      <div className="field"><label>Notes</label><textarea name="notes"/></div>
      <button className="primary" disabled={busy}>{busy?"Saving…":"Save & Map Place"}</button>
      {message?<div className={message.includes("saved")||message.includes("mapped")||message.includes("shared")?"success":"error"}>{message}</div>:null}
    </form>
  </div>
}
