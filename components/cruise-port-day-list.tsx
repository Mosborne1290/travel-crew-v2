"use client";

import Link from "next/link";
import { FormEvent,useMemo,useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Day={
  id:string;port_name:string;region:string|null;country:string|null;port_date:string;
  timezone:string;cruise_ship:string|null;required_return_time:string|null;
  recommended_return_time:string|null;hero_image_url:string|null;
};
type Template={template_key:string;title:string;port_name:string;region:string|null;country:string|null};

export function CruisePortDayList({
  tripId,userId,initialDays,templates,canManage,
}:{
  tripId:string;userId:string;initialDays:Day[];templates:Template[];canManage:boolean;
}){
  const supabase=useMemo(()=>createClient(),[]);
  const [days,setDays]=useState(initialDays);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  async function refresh(){
    const {data}=await supabase.from("cruise_port_days")
      .select("id,port_name,region,country,port_date,timezone,cruise_ship,required_return_time,recommended_return_time,hero_image_url")
      .eq("trip_id",tripId).order("port_date");
    setDays(data??[]);
  }

  async function createManual(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const el=e.currentTarget;const f=new FormData(el);setBusy(true);setMessage("");
    const {data,error}=await supabase.from("cruise_port_days").insert({
      trip_id:tripId,created_by:userId,
      port_name:String(f.get("port_name")||"").trim(),
      region:String(f.get("region")||"").trim()||null,
      country:String(f.get("country")||"").trim()||null,
      port_date:String(f.get("port_date")),
      timezone:String(f.get("timezone")||"Australia/Sydney").trim(),
      cruise_ship:String(f.get("cruise_ship")||"").trim()||null,
      cruise_line:String(f.get("cruise_line")||"").trim()||null,
      wharf_name:String(f.get("wharf_name")||"").trim()||null,
      wharf_address:String(f.get("wharf_address")||"").trim()||null,
      wharf_lat:String(f.get("wharf_lat")||"")?Number(f.get("wharf_lat")):null,
      wharf_lng:String(f.get("wharf_lng")||"")?Number(f.get("wharf_lng")):null,
      ship_arrival_time:String(f.get("ship_arrival_time")||"")||null,
      disembark_time:String(f.get("disembark_time")||"")||null,
      required_return_time:String(f.get("required_return_time")||"")||null,
      recommended_return_time:String(f.get("recommended_return_time")||"")||null,
      ship_departure_time:String(f.get("ship_departure_time")||"")||null,
      tender_port:f.get("tender_port")==="on",
      transport_notes:String(f.get("transport_notes")||"").trim()||null,
      notes:String(f.get("notes")||"").trim()||null,
    }).select("id").single();
    if(error)setMessage(error.message);
    else{el.reset();await refresh();setMessage("Cruise Port Day created.");if(data?.id)window.location.href=`/trips/${tripId}/cruise-days/${data.id}`}
    setBusy(false);
  }

  async function attachTemplate(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setMessage("");
    const {data,error}=await supabase.rpc("attach_cruise_port_template",{
      p_template_key:String(f.get("template_key")),
      p_trip_id:tripId,
      p_cruise_ship:String(f.get("ship")||"")||null,
      p_cruise_line:String(f.get("line")||"")||null,
      p_wharf_name:String(f.get("wharf")||"")||null,
      p_wharf_address:String(f.get("wharf_address")||"")||null,
    });
    if(error)setMessage(error.message);
    else{await refresh();setMessage("Cruise Port Day template attached.");if(data)window.location.href=`/trips/${tripId}/cruise-days/${data}`}
    setBusy(false);
  }

  return <div className="cruise-days-list">
    <section className="panel">
      <div className="section-title-row"><div><h2>Cruise Port Days</h2><div className="muted">Shore-day plans with a safe return-to-ship deadline.</div></div><span className="badge">{days.length}</span></div>
      {days.length?<div className="cruise-day-cards">{days.map(d=><Link href={`/trips/${tripId}/cruise-days/${d.id}`} key={d.id} className="cruise-day-card" style={d.hero_image_url?{backgroundImage:`linear-gradient(90deg,rgba(10,26,60,.82),rgba(10,26,60,.25)),url("${d.hero_image_url}")`}:undefined}><div><span className="eyebrow">Cruise Port Day</span><h3>{d.port_name}</h3><p>{new Date(`${d.port_date}T00:00:00`).toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p><small>{d.cruise_ship||"Cruise ship"} · Return {d.required_return_time?.slice(0,5)||"TBC"}</small></div></Link>)}</div>:<div className="empty-mini">No cruise port days yet.</div>}
    </section>

    {canManage?<div className="cruise-create-grid">
      <form className="panel form-stack" onSubmit={createManual}>
        <h2>Create Cruise Port Day</h2>
        <div className="form-grid"><div className="field"><label>Port / Destination *</label><input name="port_name" required/></div><div className="field"><label>Date *</label><input name="port_date" type="date" required/></div></div>
        <div className="form-grid"><div className="field"><label>State / Region</label><input name="region"/></div><div className="field"><label>Country</label><input name="country"/></div></div>
        <div className="field"><label>Destination timezone *</label><input name="timezone" defaultValue="Australia/Sydney" required/><small>Example: Australia/Sydney</small></div>
        <div className="form-grid"><div className="field"><label>Cruise ship</label><input name="cruise_ship"/></div><div className="field"><label>Cruise line</label><input name="cruise_line"/></div></div>
        <div className="form-grid"><div className="field"><label>Wharf / arrival point</label><input name="wharf_name"/></div><div className="field"><label>Wharf address</label><input name="wharf_address"/></div></div>
        <div className="form-grid"><div className="field"><label>Wharf latitude</label><input name="wharf_lat" type="number" step="any"/></div><div className="field"><label>Wharf longitude</label><input name="wharf_lng" type="number" step="any"/></div></div>
        <div className="form-grid"><div className="field"><label>Ship arrival</label><input name="ship_arrival_time" type="time"/></div><div className="field"><label>Disembark</label><input name="disembark_time" type="time"/></div><div className="field"><label>Required return</label><input name="required_return_time" type="time"/></div><div className="field"><label>Recommended wharf arrival</label><input name="recommended_return_time" type="time"/></div><div className="field"><label>Ship departure</label><input name="ship_departure_time" type="time"/></div></div>
        <label className="inline-check"><input name="tender_port" type="checkbox"/> Tender port</label>
        <div className="field"><label>Transport notes</label><textarea name="transport_notes"/></div><div className="field"><label>General notes</label><textarea name="notes"/></div>
        <button className="primary" disabled={busy}>{busy?"Creating…":"Create Port Day"}</button>
      </form>

      {templates.length?<form className="panel form-stack" onSubmit={attachTemplate}><h2>Use a Port Day Template</h2><div className="field"><label>Template</label><select name="template_key">{templates.map(t=><option value={t.template_key} key={t.template_key}>{t.title}</option>)}</select></div><div className="field"><label>Ship</label><input name="ship" placeholder="Royal Princess"/></div><div className="field"><label>Cruise line</label><input name="line"/></div><div className="field"><label>Wharf name</label><input name="wharf"/></div><div className="field"><label>Wharf address</label><input name="wharf_address"/></div><button className="secondary" disabled={busy}>Attach Template to This Trip</button><p className="muted">The Eden 19 December 2026 itinerary is included as a draft template so it will not create a duplicate trip.</p></form>:null}
    </div>:null}
    {message?<div className={message.includes("created")||message.includes("attached")?"success":"error"}>{message}</div>:null}
  </div>
}
