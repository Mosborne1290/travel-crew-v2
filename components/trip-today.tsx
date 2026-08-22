"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Activity={id:string;title:string;activity_type:string;start_datetime:string|null;end_datetime:string|null;venue_name:string|null;address:string|null;notes:string|null};
type Booking={id:string;booking_type:string;provider:string|null;start_datetime:string|null;end_datetime:string|null;booking_reference:string|null};
type Reminder={id:string;title:string;message:string|null;remind_at:string;target_url:string|null;completed:boolean};
type ChecklistItem={id:string;title:string;completed:boolean};

function t(value:string|null){
  if(!value)return "";
  return new Intl.DateTimeFormat("en-AU",{hour:"numeric",minute:"2-digit"}).format(new Date(value));
}
function icon(type:string){
  return type==="flight"?"✈️":type==="hotel"?"🏨":type==="cruise"?"🚢":type==="restaurant"?"🍽️":type==="tour"?"🎟️":type==="transport"?"🚕":"📍";
}

export function TripToday({
  tripId,
  tripDate,
  destination,
  activities,
  bookings,
  reminders,
  checklistItems,
  currency,
}:{
  tripId:string;
  tripDate:string;
  destination:string;
  activities:Activity[];
  bookings:Booking[];
  reminders:Reminder[];
  checklistItems:ChecklistItem[];
  currency:string;
}){
  const [now,setNow]=useState(new Date());
  useEffect(()=>{const id=window.setInterval(()=>setNow(new Date()),60000);return()=>window.clearInterval(id)},[]);

  const next=useMemo(()=>activities
    .filter(a=>a.start_datetime && new Date(a.start_datetime).getTime()>now.getTime())
    .sort((a,b)=>String(a.start_datetime).localeCompare(String(b.start_datetime)))[0]??null,[activities,now]);

  const countdown=next?.start_datetime?Math.max(0,new Date(next.start_datetime).getTime()-now.getTime()):0;
  const hrs=Math.floor(countdown/3600000), mins=Math.floor((countdown%3600000)/60000);

  return <div className="today-stage6">
    <section className="today-hero">
      <div><div className="eyebrow">Today · {tripDate}</div><h2>{destination}</h2>
        <p>{next?<>Next: <strong>{next.title}</strong> in {hrs?`${hrs}h `:""}{mins}m</>:"Nothing else scheduled today."}</p>
      </div>
      <div className="today-quick-actions">
        <Link href={`/trips/${tripId}/weather`}>☀ Weather</Link>
        <Link href={`/trips/${tripId}/map`}>🗺 Map</Link>
        <Link href={`/trips/${tripId}/money`}>💱 {currency}</Link>
        <Link href={`/trips/${tripId}/chat`}>💬 Chat</Link>
      </div>
    </section>

    <div className="today-grid">
      <section className="panel today-schedule">
        <div className="section-title-row"><div><h2>Today’s Schedule</h2><div className="muted">{activities.length} planned item(s)</div></div></div>
        {activities.length?<div className="timeline-stage6">{activities.map(a=><article key={a.id}>
          <div className="timeline-time">{t(a.start_datetime)||"Any time"}</div>
          <div className="timeline-dot">{icon(a.activity_type)}</div>
          <div><strong>{a.title}</strong><div className="muted">{[a.venue_name,a.address].filter(Boolean).join(" · ")}</div>{a.notes?<small>{a.notes}</small>:null}</div>
        </article>)}</div>:<div className="empty-mini">No activities scheduled today.</div>}
      </section>

      <aside className="today-side">
        <section className="panel"><h3>Bookings Today</h3>{bookings.length?bookings.map(b=><div className="today-mini-card" key={b.id}><strong>{icon(b.booking_type)} {b.provider||b.booking_type}</strong><span>{t(b.start_datetime)}{b.booking_reference?` · Ref ${b.booking_reference}`:""}</span></div>):<p className="muted">No booking starts today.</p>}</section>
        <section className="panel"><h3>Reminders</h3>{reminders.length?reminders.map(r=><div className="today-mini-card" key={r.id}><strong>⏰ {r.title}</strong><span>{t(r.remind_at)} {r.message||""}</span></div>):<p className="muted">No reminders due today.</p>}</section>
        <section className="panel"><h3>Still To Do</h3>{checklistItems.length?checklistItems.slice(0,6).map(i=><div className="today-task" key={i.id}>☐ {i.title}</div>):<p className="muted">No outstanding checklist items.</p>}<Link className="text-link" href={`/trips/${tripId}/checklists`}>Open checklists →</Link></section>
      </aside>
    </div>
  </div>
}
