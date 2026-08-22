"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { queueOfflineMutation } from "@/components/offline-sync-manager";

type Entry={id:string;entry_date:string;title:string|null;notes:string|null;highlight:string|null;favourite_moment:string|null;user_id:string};
type Photo={id:string;caption:string|null;uploaded_at:string;itinerary_day_id:string|null;is_favourite:boolean};

export function TripJournal({tripId,userId,initialEntries,photos}:{tripId:string;userId:string;initialEntries:Entry[];photos:Photo[]}){
 const supabase=useMemo(()=>createClient(),[]);const [entries,setEntries]=useState(initialEntries),[date,setDate]=useState(new Date().toISOString().slice(0,10)),[message,setMessage]=useState("");
 const current=entries.find(e=>e.entry_date===date&&e.user_id===userId);
 async function refresh(){const {data}=await supabase.from("journal_entries").select("id,entry_date,title,notes,highlight,favourite_moment,user_id").eq("trip_id",tripId).order("entry_date");setEntries(data??[])}
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const f=new FormData(e.currentTarget);
  const payload={entry_date:date,title:String(f.get("title")||"")||null,notes:String(f.get("notes")||"")||null,highlight:String(f.get("highlight")||"")||null,favourite_moment:String(f.get("favourite_moment")||"")||null};
  if(!navigator.onLine){
    queueOfflineMutation({trip_id:tripId,mutation_type:"journal_upsert",payload});
    setEntries(current=>[...current.filter(x=>!(x.entry_date===date&&x.user_id===userId)),{id:`offline-${date}`,user_id:userId,...payload} as Entry].sort((a,b)=>a.entry_date.localeCompare(b.entry_date)));
    setMessage("Journal saved offline and will sync automatically.");
    return;
  }
  const {error}=await supabase.from("journal_entries").upsert({trip_id:tripId,user_id:userId,...payload,updated_at:new Date().toISOString()},{onConflict:"trip_id,user_id,entry_date"});
  if(error)setMessage(error.message);else{await refresh();setMessage("Journal saved.");}
 }
 return <div className="journal-stage6"><section className="panel journal-editor"><div className="section-title-row"><div><h2>Travel Journal</h2><div className="muted">Capture the story of each trip day.</div></div><div className="journal-tools"><Link className="secondary compact" href={`/trips/${tripId}/memory`} target="_blank">Memory Book</Link><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div></div><form key={`${date}-${current?.id||"new"}`} className="form-stack" onSubmit={save}><div className="field"><label>Day title</label><input name="title" defaultValue={current?.title||""} placeholder="Our first full day in Vancouver"/></div><div className="field"><label>What happened today?</label><textarea name="notes" defaultValue={current?.notes||""} rows={8}/></div><div className="form-grid"><div className="field"><label>Highlight</label><textarea name="highlight" defaultValue={current?.highlight||""}/></div><div className="field"><label>Favourite moment</label><textarea name="favourite_moment" defaultValue={current?.favourite_moment||""}/></div></div><button className="primary">Save Journal Entry</button></form>{message?<div className={message.includes("saved")?"success":"error"}>{message}</div>:null}</section>
 <section className="panel"><h2>Journal Timeline</h2>{entries.length?<div className="journal-timeline">{entries.map(e=><article key={e.id}><div className="journal-date">{e.entry_date}</div><div><h3>{e.title||"Trip Day"}</h3>{e.highlight?<p><strong>Highlight:</strong> {e.highlight}</p>:null}{e.favourite_moment?<p><strong>Favourite:</strong> {e.favourite_moment}</p>:null}{e.notes?<p>{e.notes}</p>:null}</div></article>)}</div>:<div className="empty-mini">No journal entries yet.</div>}</section></div>
}
