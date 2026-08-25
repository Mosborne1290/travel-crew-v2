"use client";

import Link from "next/link";
import { useEffect,useMemo,useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Trip={
  id:string;name:string;description:string|null;trip_type:string;status:string;
  start_date:string|null;end_date:string|null;primary_destination:string|null;
  home_currency:string;cover_image_url:string|null;budget_amount:number|null;
};
type Day={id:string;date:string;day_number:number|null;title:string|null;notes:string|null};
type Activity={
  id:string;itinerary_day_id:string|null;cruise_port_day_id:string|null;title:string;activity_type:string;
  start_datetime:string|null;end_datetime:string|null;cruise_local_start_time:string|null;cruise_local_end_time:string|null;
  venue_name:string|null;address:string|null;notes:string|null;cost:number|null;currency:string|null;status:string;
  latitude:number|null;longitude:number|null;timezone:string|null;priority:string|null;website:string|null;phone:string|null;
  booking_reference:string|null;estimated_cost:number|null;transport_method:string|null;estimated_travel_minutes:number|null;
  needs_confirmation:boolean;confirmation_date:string|null;weather_dependent:boolean;bad_weather_alternative:string|null;
  visited:boolean;sort_order:number;
};
type Destination={
  id:string;name:string;city:string|null;country:string|null;arrival_date:string|null;departure_date:string|null;
  latitude:number|null;longitude:number|null;timezone:string|null;sort_order:number;
};
type Booking={
  id:string;booking_type:string;provider:string|null;booking_reference:string|null;confirmation_number:string|null;
  start_datetime:string|null;end_datetime:string|null;total_amount:number|null;currency:string|null;
  payment_status:string;booking_status:string;notes:string|null;
};
type CruiseDay={
  id:string;port_name:string;region:string|null;country:string|null;port_date:string;timezone:string;
  cruise_ship:string|null;cruise_line:string|null;wharf_name:string|null;wharf_address:string|null;
  wharf_lat:number|null;wharf_lng:number|null;disembark_time:string|null;recommended_return_time:string|null;
  required_return_time:string|null;ship_departure_time:string|null;hero_image_url:string|null;
};
type Shopping={id:string;cruise_port_day_id:string;item_name:string;suggested_location:string|null;category:string|null;budget:number|null;actual_cost:number|null;currency:string;purchased:boolean};
type Expense={id:string;description:string;category:string|null;amount:number;currency:string;expense_date:string;cruise_port_day_id:string|null;activity_id:string|null};
type Photo={id:string;storage_path:string;caption:string|null;taken_at:string|null;uploaded_at:string;itinerary_day_id:string|null;cruise_port_day_id:string|null;activity_id:string|null;is_favourite:boolean};

type WeatherDaily={
  time:string[];
  temperature_2m_max:number[];
  temperature_2m_min:number[];
  precipitation_probability_max:number[];
  weather_code:number[];
};

function dateRange(start:string|null,end:string|null){
  if(!start||!end)return [];
  const out:string[]=[];
  const s=new Date(`${start}T00:00:00Z`),e=new Date(`${end}T00:00:00Z`);
  if(Number.isNaN(s.getTime())||Number.isNaN(e.getTime()))return [];
  for(let d=new Date(s),guard=0;d<=e&&guard<120;d.setUTCDate(d.getUTCDate()+1),guard++){
    out.push(d.toISOString().slice(0,10));
  }
  return out;
}
function niceDate(value:string){
  return new Intl.DateTimeFormat("en-AU",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(`${value}T00:00:00Z`));
}
function shortDate(value:string){
  return new Intl.DateTimeFormat("en-AU",{weekday:"short",day:"numeric",month:"short",timeZone:"UTC"}).format(new Date(`${value}T00:00:00Z`));
}
function dateInZone(value:string,timeZone?:string|null){
  try{
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:timeZone||"UTC",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(value));
    const get=(type:string)=>parts.find(p=>p.type===type)?.value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  }catch{return value.slice(0,10)}
}
function clock(value:string|null,timeZone?:string|null){
  if(!value)return null;
  try{
    return new Intl.DateTimeFormat("en-AU",{hour:"numeric",minute:"2-digit",timeZone:timeZone||undefined}).format(new Date(value));
  }catch{return null}
}
function localClock(value:string|null){
  if(!value)return null;
  const [h,m]=value.slice(0,5).split(":").map(Number);
  if(!Number.isFinite(h)||!Number.isFinite(m))return null;
  return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`;
}

function wallClockEpoch(date:string,time:string|null,timeZone:string){
  if(!time)return null;
  const [y,m,d]=date.split("-").map(Number);
  const [hh,mm]=time.slice(0,5).split(":").map(Number);
  if(![y,m,d,hh,mm].every(Number.isFinite))return null;
  const wall=Date.UTC(y,m-1,d,hh,mm,0);
  let candidate=wall;
  for(let i=0;i<2;i++){
    const parts=new Intl.DateTimeFormat("en-CA",{
      timeZone,year:"numeric",month:"2-digit",day:"2-digit",
      hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"
    }).formatToParts(new Date(candidate));
    const v:Record<string,number>={};
    for(const p of parts)if(p.type!=="literal")v[p.type]=Number(p.value);
    const asUtc=Date.UTC(v.year,v.month-1,v.day,v.hour,v.minute,v.second);
    candidate=wall-(asUtc-candidate);
  }
  return candidate;
}
function activityIcon(type:string){
  const x=type.toLowerCase();
  if(x==="flight")return "✈️";if(x==="hotel")return "🏨";if(x==="cruise")return "🚢";
  if(x==="restaurant"||x==="food"||x==="cafe")return "🍽️";if(x==="shopping")return "🛍️";
  if(x==="transport")return "🚐";if(x==="tour")return "🗺️";if(x==="event")return "🎟️";
  if(x==="free_time")return "🌿";return "📍";
}
function weatherEmoji(code:number|undefined){
  if(code==null)return "🌤️";if(code===0)return "☀️";if([1,2,3].includes(code))return "🌤️";
  if([45,48].includes(code))return "🌫️";if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return "🌧️";
  if([71,73,75,77,85,86].includes(code))return "❄️";if([95,96,99].includes(code))return "⛈️";return "🌤️";
}
function weatherLabel(code:number|undefined){
  if(code==null)return "Forecast";if(code===0)return "Clear";if([1,2,3].includes(code))return "Partly cloudy";
  if([45,48].includes(code))return "Fog";if([51,53,55,56,57].includes(code))return "Drizzle";
  if([61,63,65,66,67].includes(code))return "Rain";if([80,81,82].includes(code))return "Showers";
  if([95,96,99].includes(code))return "Thunderstorm";return "Forecast";
}
function priorityClass(value:string|null){
  return value==="Must Do"?"must":value==="Optional"?"optional":"recommended";
}
function safeHref(url:string|null){
  if(!url)return null;
  return /^https?:\/\//i.test(url)?url:`https://${url}`;
}

export function VisualItinerary({
  trip,days,activities,destinations,bookings,flights,accommodation,cruises,cruiseDays,shopping,expenses,photos,photoUrls,travellerCount,
}:{
  trip:Trip;days:Day[];activities:Activity[];destinations:Destination[];bookings:Booking[];
  flights:any[];accommodation:any[];cruises:any[];cruiseDays:CruiseDay[];shopping:Shopping[];
  expenses:Expense[];photos:Photo[];photoUrls:Record<string,string>;travellerCount:number;
}){
  const supabase=useMemo(()=>createClient(),[]);
  const allDates=useMemo(()=>{
    const set=new Set<string>([
      ...dateRange(trip.start_date,trip.end_date),
      ...days.map(d=>d.date),
      ...cruiseDays.map(d=>d.port_date),
      ...bookings.filter(b=>b.start_datetime).map(b=>b.start_datetime!.slice(0,10)),
    ]);
    return Array.from(set).sort();
  },[trip.start_date,trip.end_date,days,cruiseDays,bookings]);

  const browserToday=new Date().toISOString().slice(0,10);
  const defaultDate=allDates.includes(browserToday)?browserToday:allDates[0]||browserToday;
  const [selectedDate,setSelectedDate]=useState(defaultDate);
  const [forecast,setForecast]=useState<WeatherDaily|null>(null);
  const [message,setMessage]=useState("");
  const [,setTick]=useState(0);

  const day=days.find(d=>d.date===selectedDate)||null;
  const cruiseDay=cruiseDays.find(d=>d.port_date===selectedDate)||null;
  const destination=destinations.find(d=>
    (!d.arrival_date||selectedDate>=d.arrival_date)&&(!d.departure_date||selectedDate<=d.departure_date)
  )||destinations[0]||null;
  const tz=cruiseDay?.timezone||destination?.timezone||"Australia/Sydney";
  const today=dateInZone(new Date().toISOString(),tz);

  const selectedActivities=activities
    .filter(a=>
      (day&&a.itinerary_day_id===day.id)||
      (cruiseDay&&a.cruise_port_day_id===cruiseDay.id)
    )
    .sort((a,b)=>{
      const aa=a.cruise_local_start_time||a.start_datetime||"99";
      const bb=b.cruise_local_start_time||b.start_datetime||"99";
      return aa.localeCompare(bb)||a.sort_order-b.sort_order;
    });

  const selectedBookings=bookings.filter(b=>{
    if(!b.start_datetime)return false;
    const detail=flights.find(x=>x.booking_id===b.id);
    const zone=detail?.departure_timezone||tz;
    return dateInZone(b.start_datetime,zone)===selectedDate;
  });
  const selectedExpenses=expenses.filter(e=>e.expense_date===selectedDate||Boolean(cruiseDay&&e.cruise_port_day_id===cruiseDay.id));
  const selectedPhotos=photos.filter(p=>
    (day&&p.itinerary_day_id===day.id)||
    (cruiseDay&&p.cruise_port_day_id===cruiseDay.id)||
    (!p.itinerary_day_id&&!p.cruise_port_day_id&&(p.taken_at?.slice(0,10)||p.uploaded_at.slice(0,10))===selectedDate)
  );
  const selectedShopping=cruiseDay?shopping.filter(s=>s.cruise_port_day_id===cruiseDay.id):[];
  const spending=selectedExpenses.reduce((sum,e)=>sum+Number(e.amount||0),0);

  const weatherIndex=forecast?.time.indexOf(selectedDate)??-1;
  const weather=weatherIndex>=0&&forecast?{
    code:forecast.weather_code[weatherIndex],
    max:forecast.temperature_2m_max[weatherIndex],
    min:forecast.temperature_2m_min[weatherIndex],
    rain:forecast.precipitation_probability_max[weatherIndex],
  }:null;

  useEffect(()=>{
    const timer=window.setInterval(()=>setTick(x=>x+1),60000);
    return()=>window.clearInterval(timer);
  },[]);

  useEffect(()=>{
    setForecast(null);
    if(destination?.latitude==null||destination.longitude==null)return;
    fetch(`/api/weather?lat=${destination.latitude}&lon=${destination.longitude}&timezone=${encodeURIComponent(destination.timezone||"auto")}`)
      .then(r=>r.ok?r.json():null)
      .then(p=>setForecast(p?.daily??null))
      .catch(()=>setForecast(null));
  },[destination?.id,destination?.latitude,destination?.longitude,destination?.timezone]);

  function activityTime(a:Activity){
    if(a.cruise_port_day_id)return localClock(a.cruise_local_start_time);
    return clock(a.start_datetime,a.timezone||tz);
  }
  function activityEnd(a:Activity){
    if(a.cruise_port_day_id)return localClock(a.cruise_local_end_time);
    return clock(a.end_datetime,a.timezone||tz);
  }
  function activityEpoch(a:Activity){
    if(a.cruise_port_day_id&&a.cruise_local_start_time){
      const cd=cruiseDays.find(d=>d.id===a.cruise_port_day_id);
      return wallClockEpoch(cd?.port_date||selectedDate,a.cruise_local_start_time,cd?.timezone||tz);
    }
    if(!a.start_datetime)return null;
    return new Date(a.start_datetime).getTime();
  }

  const nowMs=Date.now();
  const timed=selectedActivities.filter(a=>activityEpoch(a)!=null);
  const happening=selectedDate===today?timed.find(a=>{
    const start=activityEpoch(a)!;
    const end=a.end_datetime?new Date(a.end_datetime).getTime():start+60*60*1000;
    return nowMs>=start&&nowMs<end;
  }):null;
  const next=selectedDate===today?timed.find(a=>activityEpoch(a)!>nowMs):null;

  const hero=cruiseDay?.hero_image_url||trip.cover_image_url;
  const selectedIndex=allDates.indexOf(selectedDate);

  async function markCruiseVisited(activity:Activity){
    if(!activity.cruise_port_day_id)return;
    const {error}=await supabase.rpc("cruise_member_mark_visited",{p_activity_id:activity.id,p_visited:!activity.visited});
    if(error){setMessage(error.message);return}
    activity.visited=!activity.visited;
    setMessage(activity.visited?`${activity.title} marked visited.`:`${activity.title} marked not visited.`);
    setTick(x=>x+1);
  }

  function copyItinerary(){
    navigator.clipboard.writeText(window.location.href)
      .then(()=>setMessage("Itinerary link copied. Signed-in trip members can open it."))
      .catch(()=>setMessage("Copy the browser address to share this itinerary with a trip member."));
  }

  return <div className="visual-itinerary-stage11">
    <div className="itinerary-mode-switch">
      <Link href={`/trips/${trip.id}/plan`}>✏️ Plan</Link>
      <span className="active">✨ Itinerary</span>
      <Link href={`/trips/${trip.id}/map`}>🗺 Map</Link>
    </div>

    <section className="itinerary-trip-hero" style={hero?{backgroundImage:`linear-gradient(180deg,rgba(8,23,55,.12),rgba(8,23,55,.82)),url("${hero}")`}:undefined}>
      <div>
        <div className="eyebrow">Your Travel Itinerary</div>
        <h1>{trip.name}</h1>
        <p>{trip.primary_destination||"Adventure ahead"}</p>
        <div className="itinerary-hero-chips">
          {trip.start_date&&trip.end_date?<span>📅 {shortDate(trip.start_date)} – {shortDate(trip.end_date)}</span>:null}
          <span>👥 {travellerCount} traveller{travellerCount===1?"":"s"}</span>
          <span>🗓 {allDates.length} day{allDates.length===1?"":"s"}</span>
          <span>💳 {trip.home_currency}</span>
        </div>
      </div>
      <div className="itinerary-hero-actions">
        <button onClick={copyItinerary}>↗ Share with Trip Member</button>
        <Link href={`/trips/${trip.id}/print`} target="_blank">🖨 Print / PDF</Link>
      </div>
    </section>

    <div className="itinerary-date-strip" aria-label="Trip days">
      {allDates.map((date,index)=><button key={date} className={selectedDate===date?"active":""} onClick={()=>setSelectedDate(date)}>
        <small>Day {index+1}</small><strong>{new Intl.DateTimeFormat("en-AU",{weekday:"short",timeZone:"UTC"}).format(new Date(`${date}T00:00:00Z`))}</strong><span>{new Intl.DateTimeFormat("en-AU",{day:"numeric",month:"short",timeZone:"UTC"}).format(new Date(`${date}T00:00:00Z`))}</span>
      </button>)}
    </div>

    <section className="itinerary-day-heading">
      <div>
        <div className="eyebrow">Day {Math.max(1,selectedIndex+1)} of {Math.max(1,allDates.length)}</div>
        <h2>{day?.title||cruiseDay?.port_name||destination?.name||"Trip Day"}</h2>
        <p>{niceDate(selectedDate)}{cruiseDay?" · Cruise Port Day":""}</p>
      </div>
      <div className="itinerary-day-weather">
        {weather?<><span className="weather-emoji">{weatherEmoji(weather.code)}</span><div><strong>{Math.round(weather.max)}°C</strong><small>{weatherLabel(weather.code)} · Low {Math.round(weather.min)}° · Rain {Math.round(weather.rain||0)}%</small></div></>:<><span className="weather-emoji">🌤️</span><div><strong>Forecast</strong><small>Not available yet for this date.</small></div></>}
      </div>
    </section>

    {cruiseDay?<section className="itinerary-cruise-safety">
      <div className="safety-icon">🚢</div>
      <div><div className="eyebrow">Return to Ship</div><strong>Wharf by {localClock(cruiseDay.recommended_return_time)||"TBC"}</strong><span>Required return {localClock(cruiseDay.required_return_time)||"TBC"}</span></div>
      <Link href={`/trips/${trip.id}/cruise-days/${cruiseDay.id}`}>Open Live Cruise Day →</Link>
    </section>:null}

    {selectedDate===today&&(happening||next)?<section className="now-next-grid">
      <div className="now-card">
        <div className="eyebrow">Happening Now</div>
        {happening?<><span>{activityIcon(happening.activity_type)}</span><strong>{happening.title}</strong><small>{activityTime(happening)}{activityEnd(happening)?` – ${activityEnd(happening)}`:""}</small></>:<p className="muted">Nothing scheduled right now.</p>}
      </div>
      <div className="next-card">
        <div className="eyebrow">Up Next</div>
        {next?<><span>{activityIcon(next.activity_type)}</span><strong>{next.title}</strong><small>{activityTime(next)}</small></>:<p className="muted">No more timed activities today.</p>}
      </div>
    </section>:null}

    {selectedBookings.length?<section className="itinerary-booking-section">
      <div className="section-title-row"><div><div className="eyebrow">Travel & Stay</div><h2>Bookings Today</h2></div><Link className="text-link" href={`/trips/${trip.id}/bookings`}>All Bookings →</Link></div>
      <div className="visual-booking-grid">
        {selectedBookings.map(b=>{
          const flight=flights.find(x=>x.booking_id===b.id);
          const hotel=accommodation.find(x=>x.booking_id===b.id);
          const cruise=cruises.find(x=>x.booking_id===b.id);
          if(b.booking_type==="flight")return <article className="visual-booking-card flight" key={b.id}>
            <div className="visual-booking-icon">✈️</div>
            <div><div className="eyebrow">Flight</div><h3>{flight?.airline||b.provider||"Flight"} {flight?.flight_number||""}</h3>
              <div className="flight-route"><strong>{flight?.departure_airport||"DEP"}</strong><span>→</span><strong>{flight?.arrival_airport||"ARR"}</strong></div>
              <div className="booking-facts">
                {flight?.departure_datetime?<span>Departs {clock(flight.departure_datetime,flight.departure_timezone)}</span>:null}
                {flight?.boarding_datetime?<span>Boarding {clock(flight.boarding_datetime,flight.departure_timezone)}</span>:null}
                {flight?.gate_departure?<span>Gate {flight.gate_departure}</span>:null}
                {flight?.seat?<span>Seat {flight.seat}</span>:null}
                {flight?.baggage_allowance?<span>{flight.baggage_allowance}</span>:null}
              </div>
            </div>
          </article>;
          if(b.booking_type==="hotel")return <article className="visual-booking-card hotel" key={b.id}>
            <div className="visual-booking-icon">🏨</div><div><div className="eyebrow">Accommodation</div><h3>{hotel?.property_name||b.provider||"Hotel"}</h3><p>{hotel?.address||""}</p><div className="booking-facts">{hotel?.check_in?<span>Check-in {clock(hotel.check_in,tz)}</span>:null}{hotel?.room_type?<span>{hotel.room_type}</span>:null}{b.booking_reference?<span>Ref {b.booking_reference}</span>:null}</div></div>
          </article>;
          if(b.booking_type==="cruise")return <article className="visual-booking-card cruise" key={b.id}>
            <div className="visual-booking-icon">🚢</div><div><div className="eyebrow">Cruise</div><h3>{cruise?.ship_name||b.provider||"Cruise"}</h3><p>{cruise?.cruise_line||""}</p><div className="booking-facts">{cruise?.departure_port?<span>{cruise.departure_port} → {cruise.arrival_port||"Cruise"}</span>:null}{cruise?.cabin_number?<span>Cabin {cruise.cabin_number}</span>:null}{b.booking_reference?<span>Ref {b.booking_reference}</span>:null}</div></div>
          </article>;
          return <article className="visual-booking-card" key={b.id}><div className="visual-booking-icon">🎟️</div><div><div className="eyebrow">{b.booking_type}</div><h3>{b.provider||"Booking"}</h3>{b.booking_reference?<span>Ref {b.booking_reference}</span>:null}</div></article>;
        })}
      </div>
    </section>:null}

    <section className="visual-timeline-section">
      <div className="section-title-row">
        <div><div className="eyebrow">Your Day</div><h2>Visual Itinerary</h2><p className="muted">Follow the day from top to bottom. Plan remains available for editing.</p></div>
        <Link className="secondary visual-edit-plan" href={`/trips/${trip.id}/plan`}>✏️ Edit Plan</Link>
      </div>

      {selectedActivities.length?<div className="visual-itinerary-timeline">
        {selectedActivities.map((a,index)=>{
          const start=activityTime(a),end=activityEnd(a);
          const directions=a.latitude!=null&&a.longitude!=null?`https://www.openstreetmap.org/directions?to=${a.latitude},${a.longitude}`:null;
          const web=safeHref(a.website);
          return <article className={`visual-activity-card ${a.visited?"visited":""}`} key={a.id}>
            <div className="visual-time-column"><strong>{start||"Flexible"}</strong>{end?<span>{end}</span>:null}</div>
            <div className="visual-timeline-node"><span>{activityIcon(a.activity_type)}</span></div>
            <div className="visual-activity-content">
              <div className="visual-activity-badges">
                {a.priority?<span className={`priority-badge ${priorityClass(a.priority)}`}>{a.priority}</span>:null}
                <span className="badge">{a.activity_type.replace("_"," ")}</span>
                {a.needs_confirmation?<span className="confirm-badge">⚠ Confirm before trip</span>:null}
                {a.visited?<span className="visited-badge">✓ Visited</span>:null}
              </div>
              <h3>{a.title}</h3>
              {(a.venue_name||a.address)?<p className="visual-location">📍 {[a.venue_name,a.address].filter(Boolean).join(" · ")}</p>:null}
              {a.notes?<p className="visual-description">{a.notes}</p>:null}
              <div className="visual-detail-chips">
                {a.transport_method?<span>🚐 {a.transport_method}</span>:null}
                {a.estimated_travel_minutes?<span>⏱ {a.estimated_travel_minutes} min</span>:null}
                {(a.estimated_cost??a.cost)!=null?<span>💳 {a.currency||trip.home_currency} ${Number(a.estimated_cost??a.cost).toFixed(2)}</span>:null}
                {a.booking_reference?<span>🎟 Ref {a.booking_reference}</span>:null}
              </div>
              {a.weather_dependent&&a.bad_weather_alternative?<div className="visual-weather-alternative"><strong>☁ Weather alternative</strong><span>{a.bad_weather_alternative}</span></div>:null}
              <div className="visual-primary-actions">
                {directions?<a target="_blank" rel="noreferrer" href={directions}>📍 Directions</a>:null}
                {a.cruise_port_day_id?<button className={a.visited?"visited":""} onClick={()=>markCruiseVisited(a)}>{a.visited?"✓ Visited":"✓ Mark Visited"}</button>:null}
                <details className="visual-more-menu"><summary>••• More</summary><div>
                  <Link href={`/trips/${trip.id}/map`}>🗺 Trip Map</Link>
                  {web?<a target="_blank" rel="noreferrer" href={web}>🌐 Website</a>:null}
                  <Link href={`/trips/${trip.id}/photos`}>📷 Photos</Link>
                  <Link href={`/trips/${trip.id}/budget`}>💳 Budget</Link>
                  {a.cruise_port_day_id?<Link href={`/trips/${trip.id}/cruise-days/${a.cruise_port_day_id}`}>🚢 Live Cruise Day</Link>:null}
                </div></details>
              </div>
            </div>
          </article>
        })}
      </div>:<div className="empty-state visual-empty-day"><span>🌿</span><h3>Free day</h3><p className="muted">Nothing is scheduled yet. Enjoy the flexibility or add something from Plan or Explore.</p><div className="inline-actions"><Link className="primary" href={`/trips/${trip.id}/plan`}>Add to Plan</Link><Link className="secondary" href={`/trips/${trip.id}/explore`}>Explore Ideas</Link></div></div>}
    </section>

    <section className="visual-day-extras">
      {selectedShopping.length?<article className="visual-extra-card">
        <div className="section-title-row"><div><span className="extra-icon">🛍️</span><h3>Today's Shopping</h3></div><strong>{selectedShopping.filter(s=>s.purchased).length}/{selectedShopping.length}</strong></div>
        <div className="mini-progress"><span style={{width:`${Math.round(selectedShopping.filter(s=>s.purchased).length/selectedShopping.length*100)}%`}}/></div>
        <div className="visual-shopping-mini">{selectedShopping.slice(0,5).map(s=><div className={s.purchased?"done":""} key={s.id}><span>{s.purchased?"✓":"○"}</span><div><strong>{s.item_name}</strong><small>{s.suggested_location||s.category||"Shopping"}</small></div></div>)}</div>
        {cruiseDay?<Link className="text-link" href={`/trips/${trip.id}/cruise-days/${cruiseDay.id}`}>Open Shopping List →</Link>:null}
      </article>:null}

      <article className="visual-extra-card">
        <div className="section-title-row"><div><span className="extra-icon">💰</span><h3>Today's Spending</h3></div><strong>{trip.home_currency} ${spending.toFixed(2)}</strong></div>
        {selectedExpenses.length?<div className="visual-expense-mini">{selectedExpenses.slice(0,5).map(e=><div key={e.id}><span>{e.description}</span><strong>${Number(e.amount).toFixed(2)}</strong></div>)}</div>:<p className="muted">No expenses recorded for this day.</p>}
        <Link className="text-link" href={`/trips/${trip.id}/budget`}>View Full Budget →</Link>
      </article>

      <article className="visual-extra-card">
        <div className="section-title-row"><div><span className="extra-icon">📸</span><h3>Today's Memories</h3></div><strong>{selectedPhotos.length}</strong></div>
        {selectedPhotos.length?<div className="visual-photo-strip">{selectedPhotos.slice(0,6).map(p=>photoUrls[p.id]?<img src={photoUrls[p.id]} alt={p.caption||"Trip memory"} key={p.id}/>:null)}</div>:<p className="muted">No photos have been added to this day yet.</p>}
        <Link className="text-link" href={`/trips/${trip.id}/photos`}>{selectedPhotos.length?"View Photos":"Add Photo"} →</Link>
      </article>
    </section>

    <nav className="itinerary-day-footer">
      {selectedIndex>0?<button onClick={()=>setSelectedDate(allDates[selectedIndex-1])}>← {shortDate(allDates[selectedIndex-1])}</button>:<span/>}
      <Link href={`/trips/${trip.id}`}>Trip Overview</Link>
      {selectedIndex>=0&&selectedIndex<allDates.length-1?<button onClick={()=>setSelectedDate(allDates[selectedIndex+1])}>{shortDate(allDates[selectedIndex+1])} →</button>:<span/>}
    </nav>

    {message?<div className={message.includes("marked")||message.includes("copied")?"success":"error"}>{message}</div>:null}
  </div>;
}
