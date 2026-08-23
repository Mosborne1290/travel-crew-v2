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

function prettyDate(value:string){
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-AU",{
    weekday:"long",day:"numeric",month:"long",year:"numeric"
  });
}
function shortTime(value:string|null){
  if(!value)return "TBC";
  const [h,m]=value.slice(0,5).split(":").map(Number);
  const suffix=h>=12?"PM":"AM";return `${h%12||12}:${String(m).padStart(2,"0")} ${suffix}`;
}

export function CruisePortDayList({
  tripId,userId,initialDays,templates,canManage,
}:{
  tripId:string;userId:string;initialDays:Day[];templates:Template[];canManage:boolean;
}){
  const supabase=useMemo(()=>createClient(),[]);
  const [days,setDays]=useState(initialDays);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [showManual,setShowManual]=useState(false);

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
    else{
      el.reset();await refresh();setMessage("Cruise Port Day created.");
      if(data?.id)window.location.href=`/trips/${tripId}/cruise-days/${data.id}`;
    }
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
    else{
      await refresh();setMessage("Cruise Port Day template attached.");
      if(data)window.location.href=`/trips/${tripId}/cruise-days/${data}`;
    }
    setBusy(false);
  }

  const eden=templates.find(t=>t.template_key==="eden-nsw-2026-12-19");

  return <div className="cruise-days-list cruise-ux10d">
    {days.length?<section className="cruise-existing-days">
      <div className="section-title-row">
        <div><div className="eyebrow">Your Shore Days</div><h2>Cruise Port Days</h2><p className="muted">Open a port day to see the live itinerary, return countdown, map, shopping and spending.</p></div>
        <span className="badge">{days.length} planned</span>
      </div>
      <div className="cruise-day-cards">
        {days.map(d=><Link href={`/trips/${tripId}/cruise-days/${d.id}`} key={d.id} className="cruise-day-card cruise-day-card-premium" style={d.hero_image_url?{backgroundImage:`linear-gradient(180deg,rgba(10,24,55,.12),rgba(10,24,55,.82)),url("${d.hero_image_url}")`}:undefined}>
          <div className="cruise-card-top"><span className="cruise-card-type">🚢 Cruise Port Day</span></div>
          <div className="cruise-card-bottom">
            <h3>{d.port_name}</h3>
            <p>{prettyDate(d.port_date)}</p>
            <div className="cruise-card-chips">
              <span>⚓ {d.cruise_ship||"Cruise ship"}</span>
              <span>⏰ Wharf {shortTime(d.recommended_return_time)}</span>
              <span>🚢 Ship {shortTime(d.required_return_time)}</span>
            </div>
            <b>Open Port Day →</b>
          </div>
        </Link>)}
      </div>
    </section>:null}

    {canManage&&eden?<section className="port-template-showcase panel">
      <div className="port-template-visual">
        <div className="template-icon">🚢</div>
        <div className="eyebrow">Ready-made Cruise Port Day</div>
        <h1>EDEN</h1>
        <p>New South Wales, Australia</p>
        <strong>Saturday 19 December 2026</strong>
        <div className="template-time-strip">
          <span><b>9:00 AM</b><small>Disembark</small></span>
          <span className="template-arrow">→</span>
          <span><b>2:45 PM</b><small>Back at wharf</small></span>
          <span className="template-arrow">→</span>
          <span><b>3:00 PM</b><small>Required return</small></span>
        </div>
        <div className="template-highlights">
          <span>🗺 11 planned stops</span><span>🛍 Shopping</span><span>🏛 Museum</span>
          <span>🌊 Beach</span><span>📸 Lookout</span><span>⚠ Return safety plan</span>
        </div>
      </div>

      <form className="port-template-guided" onSubmit={attachTemplate}>
        <input type="hidden" name="template_key" value={eden.template_key}/>
        <div className="template-step">
          <span className="step-number">1</span>
          <div><h3>Confirm Cruise Details</h3><p>Tell Travel Crew which ship is visiting Eden.</p></div>
        </div>
        <div className="form-grid">
          <div className="field"><label>Ship</label><input name="ship" defaultValue="Royal Princess" placeholder="Royal Princess"/></div>
          <div className="field"><label>Cruise line</label><input name="line" defaultValue="Princess Cruises" placeholder="Princess Cruises"/></div>
        </div>

        <div className="template-step">
          <span className="step-number">2</span>
          <div><h3>Port Arrival</h3><p>Add the wharf details now, or update them later in Port Day Settings.</p></div>
        </div>
        <div className="form-grid">
          <div className="field"><label>Wharf name</label><input name="wharf" placeholder="Eden Cruise Wharf"/></div>
          <div className="field"><label>Wharf address</label><input name="wharf_address" placeholder="Wharf / Snug Cove address"/></div>
        </div>

        <div className="template-safety">
          <div>🕘 <span><b>Disembark</b><small>9:00 AM</small></span></div>
          <div>🛟 <span><b>Recommended wharf arrival</b><small>2:45 PM</small></span></div>
          <div>🚢 <span><b>Required return</b><small>3:00 PM</small></span></div>
          <div>🌐 <span><b>Timezone</b><small>Australia/Sydney</small></span></div>
        </div>

        <button className="primary template-attach-cta" disabled={busy}>
          {busy?"Attaching Eden Plan…":"Attach Eden Plan to This Trip"}
        </button>

        <div className="what-next-card">
          <strong>What happens next?</strong>
          <span>✓ Adds the Eden Cruise Port Day to this trip</span>
          <span>✓ Does not create another trip</span>
          <span>✓ Activities can be edited afterwards</span>
          <span>✓ All trip members can view the plan</span>
          <span>✓ Shopping, photos and expenses stay shared</span>
        </div>
      </form>
    </section>:null}

    {canManage?<section className="panel manual-port-day-card">
      <div className="section-title-row">
        <div><div className="eyebrow">Create Your Own</div><h2>Manual Cruise Port Day</h2><p className="muted">Use this for another port when you do not have a ready-made template.</p></div>
        <button className="secondary" onClick={()=>setShowManual(!showManual)}>{showManual?"Close":"Create Manually"}</button>
      </div>

      {showManual?<form className="form-stack" onSubmit={createManual}>
        <div className="form-grid"><div className="field"><label>Port / Destination *</label><input name="port_name" required/></div><div className="field"><label>Date *</label><input name="port_date" type="date" required/></div></div>
        <div className="form-grid"><div className="field"><label>State / Region</label><input name="region"/></div><div className="field"><label>Country</label><input name="country"/></div></div>
        <div className="field"><label>Destination timezone *</label><input name="timezone" defaultValue="Australia/Sydney" required/><small>Example: Australia/Sydney</small></div>
        <div className="form-grid"><div className="field"><label>Cruise ship</label><input name="cruise_ship"/></div><div className="field"><label>Cruise line</label><input name="cruise_line"/></div></div>
        <div className="form-grid"><div className="field"><label>Wharf / arrival point</label><input name="wharf_name"/></div><div className="field"><label>Wharf address</label><input name="wharf_address"/></div></div>
        <details className="cruise-more-fields"><summary>Advanced wharf & ship details</summary>
          <div className="form-grid"><div className="field"><label>Wharf latitude</label><input name="wharf_lat" type="number" step="any"/></div><div className="field"><label>Wharf longitude</label><input name="wharf_lng" type="number" step="any"/></div></div>
          <div className="form-grid"><div className="field"><label>Ship arrival</label><input name="ship_arrival_time" type="time"/></div><div className="field"><label>Disembark</label><input name="disembark_time" type="time"/></div><div className="field"><label>Recommended wharf arrival</label><input name="recommended_return_time" type="time"/></div><div className="field"><label>Required return</label><input name="required_return_time" type="time"/></div><div className="field"><label>Ship departure</label><input name="ship_departure_time" type="time"/></div></div>
          <label className="inline-check"><input name="tender_port" type="checkbox"/> Tender port</label>
          <div className="field"><label>Transport notes</label><textarea name="transport_notes"/></div><div className="field"><label>General notes</label><textarea name="notes"/></div>
        </details>
        <button className="primary" disabled={busy}>{busy?"Creating…":"Create Port Day"}</button>
      </form>:null}
    </section>:null}

    {message?<div className={message.includes("created")||message.includes("attached")?"success":"error"}>{message}</div>:null}
  </div>
}
