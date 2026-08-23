"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CruisePortDayAIBuilder({tripId,cruiseDay,canManage}:{tripId:string;cruiseDay:any;canManage:boolean}){
  const supabase=createClient();
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[result,setResult]=useState<any>(null),[message,setMessage]=useState("");
  const [interests,setInterests]=useState<string[]>(["Shopping","Markets","Food","History","Scenery","Souvenirs"]);
  const options=["Shopping","Markets","Food","History","Museums","Scenery","Beaches","Wildlife","Photography","Local culture","Easy walking","Souvenirs"];

  if(!canManage)return null;

  function toggle(x:string){setInterests(c=>c.includes(x)?c.filter(i=>i!==x):[...c,x])}

  async function build(){
    setBusy(true);setMessage("");
    const r=await fetch("/api/ai/cruise-port-day",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      port:cruiseDay.port_name,date:cruiseDay.port_date,
      disembark_time:cruiseDay.disembark_time,
      required_return_time:cruiseDay.required_return_time,
      recommended_return_time:cruiseDay.recommended_return_time,
      interests,pace:(document.querySelector("#cruise-ai-pace") as HTMLSelectElement)?.value||"Moderate"
    })});
    const p=await r.json();if(!r.ok)setMessage(p.error||"Could not build draft.");else setResult(p);setBusy(false);
  }

  async function addOne(s:any){
    const {error}=await supabase.from("activities").insert({
      trip_id:tripId,cruise_port_day_id:cruiseDay.id,created_by:(await supabase.auth.getUser()).data.user?.id,
      title:s.title,activity_type:s.category,priority:s.priority,cruise_local_start_time:s.start,cruise_local_end_time:s.end,
      notes:s.notes,weather_dependent:Boolean(s.weather_dependent),bad_weather_alternative:s.bad_weather_alternative||null,
      visited:false,sort_order:100,status:"planned",timezone:cruiseDay.timezone,time_storage_version:2
    });
    if(error)setMessage(error.message);else setMessage(`${s.title} added. Refreshing…`);
  }

  async function acceptAll(){if(!result?.suggestions?.length)return;for(const s of result.suggestions)await addOne(s);window.location.reload()}

  return <section className="panel cruise-ai-builder">
    <div className="section-title-row"><div><h2>✨ Build My Port Day with AI</h2><div className="muted">Creates a suggested schedule only. Nothing is saved until you approve it.</div></div><button className="secondary" onClick={()=>setOpen(!open)}>{open?"Close":"Open Builder"}</button></div>
    {open?<div className="cruise-ai-body"><div className="interest-chips">{options.map(x=><button className={interests.includes(x)?"active":""} onClick={()=>toggle(x)} key={x}>{x}</button>)}</div><div className="field"><label>Pace</label><select id="cruise-ai-pace" defaultValue="Moderate"><option>Relaxed</option><option>Moderate</option><option>Busy</option></select></div><button className="primary" onClick={build} disabled={busy}>{busy?"Building…":"✨ Build Suggested Port Day"}</button>
    {result?<div className="ai-port-suggestions"><div className="success">{result.source} · {result.safety_note}</div>{result.suggestions.map((s:any,i:number)=><article key={i}><div><strong>{s.start}–{s.end} · {s.title}</strong><span>{s.category} · {s.priority}</span><small>{s.notes}</small></div><button className="secondary compact" onClick={()=>addOne(s)}>Add to Day</button></article>)}<button className="primary" onClick={acceptAll}>Accept All</button></div>:null}</div>:null}
    {message?<div className={message.includes("added")?"success":"error"}>{message}</div>:null}
  </section>;
}
