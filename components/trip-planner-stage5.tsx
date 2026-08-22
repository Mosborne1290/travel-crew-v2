"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Day = { id:string; date:string; day_number:number|null; title:string|null; notes:string|null };
type Activity = {
  id:string; itinerary_day_id:string|null; title:string; activity_type:string;
  start_datetime:string|null; end_datetime:string|null; venue_name:string|null;
  address:string|null; notes:string|null; cost:number|null; currency:string|null;
  status:string; sort_order:number; latitude:number|null; longitude:number|null;
};
type Destination = { id:string; name:string; latitude:number|null; longitude:number|null; timezone:string|null };

type ForecastDay = {
  date:string; max:number; min:number; rain:number; code:number;
};

function formatDay(date:string) {
  return new Intl.DateTimeFormat("en-AU",{weekday:"short",day:"numeric",month:"short",timeZone:"UTC"}).format(new Date(`${date}T00:00:00Z`));
}
function localTime(value:string|null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-AU",{hour:"numeric",minute:"2-digit"}).format(new Date(value));
}
function icon(type:string) {
  return type==="flight"?"✈️":type==="hotel"?"🏨":type==="cruise"?"🚢":type==="restaurant"?"🍽️":type==="tour"?"🎟️":type==="transport"?"🚕":type==="shopping"?"🛍️":type==="free_time"?"🕒":"📍";
}
function weatherEmoji(code:number|undefined) {
  if (code===0) return "☀️";
  if ([1,2,3].includes(code ?? -1)) return "🌤️";
  if ([61,63,65,80,81,82].includes(code ?? -1)) return "🌧️";
  if ([95,96,99].includes(code ?? -1)) return "⛈️";
  if ([71,73,75,85,86].includes(code ?? -1)) return "❄️";
  return "🌤️";
}

export function TripPlannerStage5({
  tripId,userId,tripStart,tripEnd,initialDays,initialActivities,destination,
}:{
  tripId:string; userId:string; tripStart:string|null; tripEnd:string|null;
  initialDays:Day[]; initialActivities:Activity[]; destination:Destination|null;
}) {
  const supabase = useMemo(()=>createClient(),[]);
  const [days,setDays]=useState(initialDays);
  const [activities,setActivities]=useState(initialActivities);
  const [selectedDayId,setSelectedDayId]=useState(initialDays[0]?.id ?? "");
  const [view,setView]=useState<"day"|"calendar"|"full">("day");
  const [editing,setEditing]=useState<Activity|null>(null);
  const [dragId,setDragId]=useState<string|null>(null);
  const [forecast,setForecast]=useState<ForecastDay[]>([]);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  const selectedDay=days.find(d=>d.id===selectedDayId) ?? days[0] ?? null;
  const dayActivities=(dayId:string)=>activities.filter(a=>a.itinerary_day_id===dayId).sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)||String(a.start_datetime||"").localeCompare(String(b.start_datetime||"")));

  useEffect(()=>{
    async function loadWeather(){
      if (!destination?.latitude || !destination?.longitude) return;
      try{
        const response=await fetch(`/api/weather?lat=${destination.latitude}&lon=${destination.longitude}&timezone=${encodeURIComponent(destination.timezone||"auto")}`);
        const payload=await response.json();
        if (!response.ok || !payload.daily) return;
        setForecast(payload.daily.time.map((date:string,i:number)=>({
          date,max:payload.daily.temperature_2m_max[i],min:payload.daily.temperature_2m_min[i],
          rain:payload.daily.precipitation_probability_max[i],code:payload.daily.weather_code[i],
        })));
      }catch{}
    }
    loadWeather();
  },[destination]);

  async function refresh(){
    const [{data:d},{data:a}]=await Promise.all([
      supabase.from("itinerary_days").select("id,date,day_number,title,notes").eq("trip_id",tripId).order("date"),
      supabase.from("activities").select("id,itinerary_day_id,title,activity_type,start_datetime,end_datetime,venue_name,address,notes,cost,currency,status,sort_order,latitude,longitude").eq("trip_id",tripId).order("sort_order"),
    ]);
    setDays((d??[]) as Day[]);
    setActivities((a??[]) as Activity[]);
  }

  async function generateDays(){
    if(!tripStart||!tripEnd){setMessage("Set trip start and end dates before generating itinerary days.");return;}
    const start=new Date(`${tripStart}T00:00:00Z`),end=new Date(`${tripEnd}T00:00:00Z`);
    const count=Math.floor((end.getTime()-start.getTime())/86400000)+1;
    if(count<1||count>180){setMessage("Trip dates must cover between 1 and 180 days.");return;}
    setBusy(true);setMessage("");
    const rows=Array.from({length:count},(_,i)=>{
      const d=new Date(start.getTime()+i*86400000).toISOString().slice(0,10);
      return {trip_id:tripId,date:d,day_number:i+1,title:`Day ${i+1}`};
    });
    const {error}=await supabase.from("itinerary_days").upsert(rows,{onConflict:"trip_id,date"});
    if(error)setMessage(error.message);else{await refresh();setMessage("Trip days generated.");}
    setBusy(false);
  }

  async function geocode(query:string){
    if (!query.trim()) return null;
    try{
      const r=await fetch(`/api/location/search?q=${encodeURIComponent(query)}`);
      const p=await r.json();
      return r.ok && p.results?.[0] ? p.results[0] : null;
    }catch{return null}
  }

  async function addActivity(event:FormEvent<HTMLFormElement>){
    event.preventDefault();

    if (!selectedDay) {
      setMessage("Choose or generate a trip day before adding an activity.");
      return;
    }

    const formEl = event.currentTarget;
    const f = new FormData(formEl);
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/trips/${tripId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itinerary_day_id: selectedDay.id,
          day_date: selectedDay.date,
          destination_name: destination?.name || "",
          title: String(f.get("title") || "").trim(),
          activity_type: String(f.get("activity_type") || "other"),
          venue_name: String(f.get("venue_name") || "").trim(),
          address: String(f.get("address") || "").trim(),
          start_time: String(f.get("start_time") || ""),
          end_time: String(f.get("end_time") || ""),
          cost: String(f.get("cost") || ""),
          notes: String(f.get("notes") || "").trim(),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error ||
          payload.details ||
          "Could not save the activity."
        );
      }

      formEl.reset();
      await refresh();
      setMessage("Activity added.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not add activity."
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if (!editing) return;

    const f = new FormData(event.currentTarget);
    const targetDay = days.find(
      d => d.id === String(f.get("day_id"))
    ) ?? selectedDay;

    if (!targetDay) {
      setMessage("Choose a valid itinerary day.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/trips/${tripId}/activities`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_id: editing.id,
          itinerary_day_id: targetDay.id,
          destination_name: destination?.name || "",
          title: String(f.get("title") || "").trim(),
          activity_type: String(f.get("activity_type") || "other"),
          venue_name: String(f.get("venue_name") || "").trim(),
          address: String(f.get("address") || "").trim(),
          start_time: String(f.get("start_time") || ""),
          end_time: String(f.get("end_time") || ""),
          cost: String(f.get("cost") || ""),
          notes: String(f.get("notes") || "").trim(),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Could not update activity.");
      }

      setEditing(null);
      await refresh();
      setMessage("Activity updated.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not update activity."
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id:string){
    if(!confirm("Delete this activity?"))return;
    const {error}=await supabase.from("activities").delete().eq("id",id);
    if(error)setMessage(error.message); else await refresh();
  }

  async function duplicate(a:Activity){
    const {id,...copy}=a;
    const {error}=await supabase.from("activities").insert({...copy,created_by:userId,trip_id:tripId,title:`${a.title} (copy)`,sort_order:(a.sort_order??0)+1});
    if(error)setMessage(error.message); else {await refresh();setMessage("Activity duplicated.");}
  }

  async function share(a:Activity){
    const {error}=await supabase.rpc("share_trip_item_to_chat",{
      p_trip_id:tripId,p_message_text:`${icon(a.activity_type)} ${a.title}${a.venue_name?` · ${a.venue_name}`:""}${a.start_datetime?` · ${localTime(a.start_datetime)}`:""}`,
      p_message_type:"activity",
    });
    setMessage(error?error.message:"Activity shared to trip chat.");
  }

  async function reorder(sourceId:string,targetId:string){
    if(sourceId===targetId)return;
    const source=activities.find(a=>a.id===sourceId), target=activities.find(a=>a.id===targetId);
    if(!source||!target||source.itinerary_day_id!==target.itinerary_day_id)return;
    const list=dayActivities(source.itinerary_day_id!);
    const from=list.findIndex(a=>a.id===sourceId), to=list.findIndex(a=>a.id===targetId);
    const next=[...list]; const [moved]=next.splice(from,1); next.splice(to,0,moved);
    setActivities(current=>current.map(a=>{
      const idx=next.findIndex(n=>n.id===a.id);
      return idx>=0?{...a,sort_order:idx}:a;
    }));
    await Promise.all(next.map((a,i)=>supabase.from("activities").update({sort_order:i}).eq("id",a.id)));
  }

  const weatherFor=(date:string)=>forecast.find(f=>f.date===date);

  function ActivityCard({a}:{a:Activity}){
    return <article
      className="activity-row stage5-activity"
      draggable
      onDragStart={()=>setDragId(a.id)}
      onDragOver={e=>e.preventDefault()}
      onDrop={()=>{if(dragId)reorder(dragId,a.id);setDragId(null)}}
    >
      <div className="drag-handle">⋮⋮</div>
      <div className="activity-time">{localTime(a.start_datetime)||"Any time"}</div>
      <div className="activity-symbol">{icon(a.activity_type)}</div>
      <div className="activity-copy">
        <strong>{a.title}</strong>
        <div className="muted">{[a.venue_name,a.address].filter(Boolean).join(" · ")||a.activity_type}</div>
        {a.notes?<small>{a.notes}</small>:null}
      </div>
      <div className="activity-action-menu">
        <button type="button" onClick={()=>setEditing(a)}>Edit</button>
        <button type="button" onClick={()=>duplicate(a)}>Duplicate</button>
        <button type="button" onClick={()=>share(a)}>Chat</button>
        <button type="button" className="danger-text" onClick={()=>remove(a.id)}>Delete</button>
      </div>
    </article>
  }

  return <div className="planner-stage5">
    <div className="planner-toolbar panel">
      <div className="view-switch">
        <button className={view==="day"?"active":""} onClick={()=>setView("day")}>Day</button>
        <button className={view==="calendar"?"active":""} onClick={()=>setView("calendar")}>Calendar</button>
        <button className={view==="full"?"active":""} onClick={()=>setView("full")}>Full Trip</button>
      </div>
      <div className="muted">Drag activities to reorder them within a day.</div>
    </div>

    {view==="day"?<div className="planner-shell">
      <aside className="planner-days panel">
        <div className="section-title-row"><h3>Trip days</h3>{!days.length?<span className="badge">Not generated</span>:null}</div>
        {!days.length?<button className="primary full-width" type="button" onClick={generateDays} disabled={busy}>Generate Trip Days</button>:null}
        <div className="day-stack">{days.map(d=>{
          const w=weatherFor(d.date);
          return <button key={d.id} className={`day-card ${selectedDay?.id===d.id?"active":""}`} onClick={()=>setSelectedDayId(d.id)}>
            <strong>Day {d.day_number}</strong><small>{formatDay(d.date)}</small>
            {w?<small>{weatherEmoji(w.code)} {Math.round(w.max)}° / {Math.round(w.min)}° · {Math.round(w.rain)}% rain</small>:null}
          </button>
        })}</div>
      </aside>
      <section className="planner-main">
        <div className="panel">
          <div className="section-title-row"><div><h2>{selectedDay?`Day ${selectedDay.day_number} · ${formatDay(selectedDay.date)}`:"Plan My Trip"}</h2>
          {selectedDay && !weatherFor(selectedDay.date)?<div className="muted">Weather will appear here when this date is within the 14-day forecast window.</div>:null}</div></div>
          <div className="activity-stack">{selectedDay&&dayActivities(selectedDay.id).length?dayActivities(selectedDay.id).map(a=><ActivityCard a={a} key={a.id}/>):<div className="empty-mini">Nothing planned yet.</div>}</div>
        </div>
        <form className="panel form-stack" onSubmit={addActivity}>
          <h3>Add Activity</h3>
          <div className="form-grid">
            <div className="field span-2"><label>Activity *</label><input name="title" required /></div>
            <div className="field"><label>Type</label><select name="activity_type"><option value="attraction">Attraction</option><option value="restaurant">Restaurant</option><option value="tour">Tour</option><option value="transport">Transport</option><option value="shopping">Shopping</option><option value="free_time">Free Time</option><option value="flight">Flight</option><option value="hotel">Hotel</option><option value="cruise">Cruise</option><option value="other">Other</option></select></div>
            <div className="field"><label>Venue</label><input name="venue_name" /></div>
            <div className="field"><label>Start</label><input name="start_time" type="time" /></div>
            <div className="field"><label>End</label><input name="end_time" type="time" /></div>
            <div className="field span-2"><label>Address</label><input name="address" placeholder="Travel Crew will try to map this automatically" /></div>
            <div className="field"><label>Cost AUD</label><input name="cost" type="number" min="0" step="0.01" /></div>
            <div className="field span-2"><label>Notes</label><textarea name="notes"/></div>
          </div>
          <button className="primary" disabled={busy||!selectedDay}>Add to itinerary</button>
        </form>
      </section>
    </div>:null}

    {view==="calendar"?<section className="calendar-stage5">
      {days.map(d=>{const w=weatherFor(d.date);return <article className="calendar-day-card" key={d.id}>
        <header><div><strong>Day {d.day_number}</strong><span>{formatDay(d.date)}</span></div>{w?<span>{weatherEmoji(w.code)} {Math.round(w.max)}°</span>:null}</header>
        <div>{dayActivities(d.id).map(a=><button key={a.id} onClick={()=>{setSelectedDayId(d.id);setEditing(a)}}><span>{localTime(a.start_datetime)||"—"}</span>{icon(a.activity_type)} {a.title}</button>)}</div>
      </article>})}
    </section>:null}

    {view==="full"?<section className="full-trip-stage5">
      {days.map(d=><article className="panel" key={d.id}><div className="section-title-row"><div><h3>Day {d.day_number} · {formatDay(d.date)}</h3></div>{weatherFor(d.date)?<span>{weatherEmoji(weatherFor(d.date)?.code)} {Math.round(weatherFor(d.date)!.max)}° · Rain {Math.round(weatherFor(d.date)!.rain)}%</span>:null}</div>
      <div className="activity-stack">{dayActivities(d.id).map(a=><ActivityCard a={a} key={a.id}/>)}</div></article>)}
    </section>:null}

    {editing?<div className="modal-backdrop"><form className="modal-card form-stack" onSubmit={saveEdit}>
      <div className="section-title-row"><h2>Edit Activity</h2><button type="button" className="ghost" onClick={()=>setEditing(null)}>Close</button></div>
      <div className="field"><label>Day</label><select name="day_id" defaultValue={editing.itinerary_day_id||""}>{days.map(d=><option key={d.id} value={d.id}>Day {d.day_number} · {formatDay(d.date)}</option>)}</select></div>
      <div className="field"><label>Title</label><input name="title" defaultValue={editing.title} required /></div>
      <div className="form-grid">
        <div className="field"><label>Type</label><select name="activity_type" defaultValue={editing.activity_type}><option value="attraction">Attraction</option><option value="restaurant">Restaurant</option><option value="tour">Tour</option><option value="transport">Transport</option><option value="shopping">Shopping</option><option value="free_time">Free Time</option><option value="flight">Flight</option><option value="hotel">Hotel</option><option value="cruise">Cruise</option><option value="other">Other</option></select></div>
        <div className="field"><label>Venue</label><input name="venue_name" defaultValue={editing.venue_name||""}/></div>
        <div className="field"><label>Start</label><input name="start_time" type="time" defaultValue={editing.start_datetime?new Date(editing.start_datetime).toTimeString().slice(0,5):""}/></div>
        <div className="field"><label>End</label><input name="end_time" type="time" defaultValue={editing.end_datetime?new Date(editing.end_datetime).toTimeString().slice(0,5):""}/></div>
      </div>
      <div className="field"><label>Address</label><input name="address" defaultValue={editing.address||""}/></div>
      <div className="field"><label>Cost AUD</label><input name="cost" type="number" min="0" step="0.01" defaultValue={editing.cost??""}/></div>
      <div className="field"><label>Notes</label><textarea name="notes" defaultValue={editing.notes||""}/></div>
      <button className="primary" disabled={busy}>Save changes</button>
    </form></div>:null}

    {message?<div className={message.includes("added")||message.includes("updated")||message.includes("duplicated")||message.includes("shared")?"success":"error"}>{message}</div>:null}
  </div>
}
