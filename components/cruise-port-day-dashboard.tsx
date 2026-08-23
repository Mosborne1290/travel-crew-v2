"use client";

import { FormEvent,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TripMap } from "@/components/trip-map";

type CruiseDay={
  id:string;trip_id:string;port_name:string;region:string|null;country:string|null;port_date:string;timezone:string;
  cruise_ship:string|null;cruise_line:string|null;wharf_name:string|null;wharf_address:string|null;
  wharf_lat:number|null;wharf_lng:number|null;ship_arrival_time:string|null;disembark_time:string|null;
  required_return_time:string|null;recommended_return_time:string|null;ship_departure_time:string|null;
  tender_port:boolean;transport_notes:string|null;notes:string|null;hero_image_url:string|null;
  warning_green_minutes?:number;warning_amber_minutes?:number;warning_orange_minutes?:number;warning_red_minutes?:number;warning_critical_minutes?:number;
};
type Activity={
  id:string;title:string;activity_type:string;priority:string|null;cruise_local_start_time:string|null;
  cruise_local_end_time:string|null;description?:string|null;address:string|null;latitude:number|null;longitude:number|null;
  website:string|null;phone:string|null;booking_reference:string|null;estimated_cost:number|null;currency:string|null;
  transport_method:string|null;estimated_travel_minutes:number|null;notes:string|null;needs_confirmation:boolean;
  confirmation_date:string|null;confirmation_source:string|null;weather_dependent:boolean;bad_weather_alternative:string|null;
  is_indoor:boolean|null;visited:boolean;sort_order:number;market_open_time:string|null;market_close_time:string|null;
  market_website:string|null;market_notes:string|null;
};
type Shopping={
  id:string;activity_id:string|null;item_name:string;suggested_location:string|null;category:string|null;
  budget:number|null;actual_cost:number|null;currency:string;purchased:boolean;purchased_by:string|null;notes:string|null;photo_url:string|null;
};
type Expense={id:string;description:string;amount:number;currency:string;expense_date:string;activity_id:string|null;paid_by_user_id:string|null};
type Photo={id:string;storage_path:string;caption:string|null;activity_id:string|null;uploaded_by:string;uploaded_at:string};
type Member={user_id:string;display_name:string};

function wallClockEpoch(date:string,time:string|null,timeZone:string){
  if(!time)return null;
  const [y,m,d]=date.split("-").map(Number);
  const [hh,mm]=time.slice(0,5).split(":").map(Number);
  const wall=Date.UTC(y,m-1,d,hh,mm,0);
  let candidate=wall;
  for(let i=0;i<2;i++){
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(new Date(candidate));
    const v:Record<string,number>={};
    for(const p of parts)if(p.type!=="literal")v[p.type]=Number(p.value);
    const asUtc=Date.UTC(v.year,v.month-1,v.day,v.hour,v.minute,v.second);
    candidate=wall-(asUtc-candidate);
  }
  return candidate;
}
function prettyTime(value:string|null){
  if(!value)return "TBC";
  const [h,m]=value.slice(0,5).split(":").map(Number);
  const suffix=h>=12?"PM":"AM";const hour=h%12||12;
  return `${hour}:${String(m).padStart(2,"0")} ${suffix}`;
}
function categoryIcon(c:string){
  const x=c.toLowerCase();
  if(x.includes("wharf"))return "🚢";if(x.includes("market")||x.includes("shopping"))return "🛍️";
  if(x.includes("food")||x.includes("restaurant")||x.includes("cafe"))return "🍽️";
  if(x.includes("museum")||x.includes("historic"))return "🏛️";if(x.includes("beach"))return "🏖️";
  if(x.includes("lookout")||x.includes("photography"))return "📸";if(x.includes("transport"))return "🚐";
  if(x.includes("nature")||x.includes("walk"))return "🌿";return "📍";
}
function priorityClass(p:string|null){return p==="Must Do"?"must":p==="Optional"?"optional":"recommended"}

export function CruisePortDayDashboard({
  initialDay,initialActivities,initialShopping,initialExpenses,initialPhotos,members,userId,canManage,
}:{
  initialDay:CruiseDay;initialActivities:Activity[];initialShopping:Shopping[];initialExpenses:Expense[];
  initialPhotos:Photo[];members:Member[];userId:string;canManage:boolean;
}){
  const supabase=useMemo(()=>createClient(),[]);
  const [day,setDay]=useState(initialDay),[activities,setActivities]=useState(initialActivities),[shopping,setShopping]=useState(initialShopping);
  const [expenses,setExpenses]=useState(initialExpenses),[photos,setPhotos]=useState(initialPhotos);
  const [now,setNow]=useState(Date.now()),[message,setMessage]=useState(""),[weather,setWeather]=useState<any>(null);
  const [showReturn,setShowReturn]=useState(false),[busy,setBusy]=useState(false),[signedUrls,setSignedUrls]=useState<Record<string,string>>({});
  const [returnEstimate,setReturnEstimate]=useState<{minutes:number;distance:number;buffer:number|null}|null>(null);
  const [draggedId,setDraggedId]=useState<string|null>(null);

  useEffect(()=>{const t=window.setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(t)},[]);
  useEffect(()=>{loadWeather();loadPhotoUrls()},[]);
  useEffect(()=>{
    const ch=supabase.channel(`cruise-day-${day.id}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"cruise_port_shopping_items",filter:`cruise_port_day_id=eq.${day.id}`},()=>refreshShopping())
      .on("postgres_changes",{event:"*",schema:"public",table:"activities",filter:`cruise_port_day_id=eq.${day.id}`},()=>refreshActivities())
      .subscribe();
    return()=>{supabase.removeChannel(ch)};
  },[day.id,supabase]);

  async function refreshActivities(){const {data}=await supabase.from("activities").select("id,title,activity_type,priority,cruise_local_start_time,cruise_local_end_time,address,latitude,longitude,website,phone,booking_reference,estimated_cost,currency,transport_method,estimated_travel_minutes,notes,needs_confirmation,confirmation_date,confirmation_source,weather_dependent,bad_weather_alternative,is_indoor,visited,sort_order,market_open_time,market_close_time,market_website,market_notes").eq("cruise_port_day_id",day.id).order("sort_order");setActivities((data??[]) as Activity[])}
  async function refreshShopping(){const {data}=await supabase.from("cruise_port_shopping_items").select("*").eq("cruise_port_day_id",day.id).order("created_at");setShopping((data??[]) as Shopping[])}
  async function refreshExpenses(){const {data}=await supabase.from("expenses").select("id,description,amount,currency,expense_date,activity_id,paid_by_user_id").eq("cruise_port_day_id",day.id).order("created_at",{ascending:false});setExpenses((data??[]) as Expense[])}
  async function loadPhotoUrls(){const map:Record<string,string>={};for(const p of photos){const r=await supabase.storage.from("trip-photos").createSignedUrl(p.storage_path,3600);if(r.data?.signedUrl)map[p.id]=r.data.signedUrl}setSignedUrls(map)}
  async function loadWeather(){if(day.wharf_lat==null||day.wharf_lng==null)return;try{const r=await fetch(`/api/cruise-weather?lat=${day.wharf_lat}&lon=${day.wharf_lng}&date=${day.port_date}&timezone=${encodeURIComponent(day.timezone)}`);if(r.ok)setWeather(await r.json())}catch{}}

  const requiredEpoch=wallClockEpoch(day.port_date,day.required_return_time,day.timezone);
  const remain=requiredEpoch==null?null:requiredEpoch-now;
  const mins=remain==null?null:Math.floor(remain/60000);
  const critical=day.warning_critical_minutes??15,red=day.warning_red_minutes??30,orange=day.warning_orange_minutes??60,amber=day.warning_amber_minutes??90;
  const warning=mins==null?"green":mins<=critical?"critical":mins<=red?"red":mins<=orange?"orange":mins<=amber?"amber":"green";
  const countdown=remain==null?"Return time TBC":remain<=0?"RETURN TIME REACHED":`${Math.max(0,Math.floor(remain/3600000))} hrs ${Math.max(0,Math.floor((remain%3600000)/60000))} mins`;
  const purchasedCount=shopping.filter(i=>i.purchased).length;
  const spendTotal=expenses.reduce((sum,e)=>sum+Number(e.amount||0),0);
  const photoCount=photos.length;
  const visitedCount=activities.filter(a=>a.visited).length;

  const mapPoints=[
    ...(day.wharf_lat!=null&&day.wharf_lng!=null?[{
      id:`wharf-${day.id}`,kind:"destination" as const,category:"destination",
      name:day.wharf_name||`${day.port_name} Cruise Wharf`,latitude:Number(day.wharf_lat),longitude:Number(day.wharf_lng),
      detail:day.wharf_address||"Cruise Wharf",date:day.port_date
    }]:[]),
    ...activities.filter(a=>a.latitude!=null&&a.longitude!=null).map((a,i)=>({
      id:a.id,kind:"activity" as const,category:(a.activity_type||"Other").toLowerCase(),
      name:`${i+1}. ${a.title}`,latitude:Number(a.latitude),longitude:Number(a.longitude),
      detail:a.address||`${prettyTime(a.cruise_local_start_time)} – ${prettyTime(a.cruise_local_end_time)}`,date:day.port_date
    }))
  ];


  async function reorderActivity(targetId:string){
    if(!canManage||!draggedId||draggedId===targetId)return;
    const ordered=[...activities];
    const from=ordered.findIndex(a=>a.id===draggedId),to=ordered.findIndex(a=>a.id===targetId);
    if(from<0||to<0)return;
    const [moved]=ordered.splice(from,1);ordered.splice(to,0,moved);
    setActivities(ordered.map((a,i)=>({...a,sort_order:i+1})));
    for(let i=0;i<ordered.length;i++){
      await supabase.from("activities").update({sort_order:i+1}).eq("id",ordered[i].id);
    }
    setDraggedId(null);setMessage("Activity order updated.");
  }

  async function markVisited(a:Activity){const {error}=await supabase.rpc("cruise_member_mark_visited",{p_activity_id:a.id,p_visited:!a.visited});if(error)setMessage(error.message);else await refreshActivities()}
  async function addNote(a:Activity){const note=prompt(`Add a note to ${a.title}`);if(!note)return;const {error}=await supabase.rpc("cruise_member_append_note",{p_activity_id:a.id,p_note:note});if(error)setMessage(error.message);else{setMessage("Note added.");await refreshActivities()}}
  async function confirmActivity(a:Activity){
    if(!canManage)return;
    const source=prompt("Confirmation source (website, phone, market page)",a.confirmation_source||"")||null;
    const {error}=await supabase.from("activities").update({needs_confirmation:false,confirmation_date:new Date().toISOString(),confirmation_source:source}).eq("id",a.id);
    if(error)setMessage(error.message);else{setMessage(`${a.title} confirmed.`);await refreshActivities()}
  }
  async function deleteActivity(a:Activity){if(!canManage||!confirm(`Delete ${a.title}?`))return;const {error}=await supabase.from("activities").delete().eq("id",a.id);if(error)setMessage(error.message);else await refreshActivities()}
  async function quickEdit(a:Activity){if(!canManage)return;const title=prompt("Activity name",a.title);if(!title)return;const start=prompt("Start time (HH:MM)",a.cruise_local_start_time?.slice(0,5)||"");const end=prompt("End time (HH:MM)",a.cruise_local_end_time?.slice(0,5)||"");const {error}=await supabase.from("activities").update({title,cruise_local_start_time:start||null,cruise_local_end_time:end||null}).eq("id",a.id);if(error)setMessage(error.message);else await refreshActivities()}
  async function duplicate(a:Activity){if(!canManage)return;const {id,...copy}:any=a;copy.title=`${a.title} (copy)`;copy.sort_order=Math.max(0,...activities.map(x=>x.sort_order))+1;copy.trip_id=day.trip_id;copy.cruise_port_day_id=day.id;copy.created_by=userId;const {error}=await supabase.from("activities").insert(copy);if(error)setMessage(error.message);else await refreshActivities()}

  async function geocode(query:string){
    if(!query.trim())return null;
    try{const r=await fetch(`/api/cruise-geocode?q=${encodeURIComponent(query)}`);if(!r.ok)return null;return await r.json()}catch{return null}
  }

  async function mapMissingStops(){
    if(!canManage)return;setBusy(true);let mapped=0;
    for(const a of activities.filter(x=>x.latitude==null||x.longitude==null)){
      const place=await geocode([a.address||a.title,day.port_name,day.region,day.country].filter(Boolean).join(", "));
      if(place){await supabase.from("activities").update({latitude:place.latitude,longitude:place.longitude}).eq("id",a.id);mapped++}
    }
    if((day.wharf_lat==null||day.wharf_lng==null)&&day.wharf_name){
      const place=await geocode([day.wharf_address||day.wharf_name,day.port_name,day.region,day.country].filter(Boolean).join(", "));
      if(place)await supabase.from("cruise_port_days").update({wharf_lat:place.latitude,wharf_lng:place.longitude}).eq("id",day.id);
    }
    await refreshActivities();setBusy(false);setMessage(`${mapped} itinerary stop(s) mapped. Reload to refresh the map/wharf location.`);
  }

  async function addActivity(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!canManage)return;const el=e.currentTarget,f=new FormData(el);const address=String(f.get("address")||"")||null;const place=address?await geocode([address,day.port_name,day.region,day.country].filter(Boolean).join(", ")):null;const {error}=await supabase.from("activities").insert({
    trip_id:day.trip_id,cruise_port_day_id:day.id,created_by:userId,title:String(f.get("title")),activity_type:String(f.get("category")||"Other"),
    priority:String(f.get("priority")||"Recommended"),cruise_local_start_time:String(f.get("start")||"")||null,cruise_local_end_time:String(f.get("end")||"")||null,
    address,latitude:place?.latitude??null,longitude:place?.longitude??null,
    website:String(f.get("website")||"")||null,phone:String(f.get("phone")||"")||null,
    booking_reference:String(f.get("booking_reference")||"")||null,
    estimated_cost:Number(f.get("estimated_cost")||0)||null,currency:String(f.get("currency")||"AUD"),
    transport_method:String(f.get("transport_method")||"")||null,
    estimated_travel_minutes:Number(f.get("estimated_travel_minutes")||0)||null,
    notes:String(f.get("notes")||"")||null,needs_confirmation:f.get("needs_confirmation")==="on",
    confirmation_source:String(f.get("confirmation_source")||"")||null,
    weather_dependent:f.get("weather_dependent")==="on",bad_weather_alternative:String(f.get("bad_weather_alternative")||"")||null,
    is_indoor:f.get("is_indoor")==="on"?true:null,
    market_open_time:String(f.get("market_open_time")||"")||null,market_close_time:String(f.get("market_close_time")||"")||null,
    market_website:String(f.get("market_website")||"")||null,market_notes:String(f.get("market_notes")||"")||null,
    visited:false,
    sort_order:Math.max(0,...activities.map(a=>a.sort_order))+1,status:"planned",timezone:day.timezone,time_storage_version:2
  });if(error)setMessage(error.message);else{el.reset();await refreshActivities();setMessage("Activity added.")}}

  async function toggleShopping(i:Shopping){
    const next=!i.purchased;
    let actual=i.actual_cost;
    if(next){
      const entered=prompt(`Actual cost for ${i.item_name} (${i.currency}) — leave blank if unknown`,i.actual_cost!=null?String(i.actual_cost):"");
      if(entered&&Number.isFinite(Number(entered)))actual=Number(entered);
    }
    const {error}=await supabase.from("cruise_port_shopping_items").update({purchased:next,purchased_by:next?userId:null,actual_cost:next?actual:null}).eq("id",i.id);
    if(error)setMessage(error.message);else await refreshShopping();
  }
  async function addShopping(e:FormEvent<HTMLFormElement>){e.preventDefault();const el=e.currentTarget,f=new FormData(el);const {error}=await supabase.from("cruise_port_shopping_items").insert({cruise_port_day_id:day.id,trip_id:day.trip_id,item_name:String(f.get("item")),suggested_location:String(f.get("location")||"")||null,category:String(f.get("category")||"Souvenir"),budget:Number(f.get("budget")||0)||null,currency:String(f.get("currency")||"AUD"),notes:String(f.get("notes")||"")||null});if(error)setMessage(error.message);else{el.reset();await refreshShopping()}}

  async function addExpense(a?:Activity){
    const amount=prompt(`Amount (${a?.currency||"AUD"})`);if(!amount)return;
    const description=prompt("Expense description",a?.title||"Cruise day expense")||"Cruise day expense";
    const num=Number(amount);if(!Number.isFinite(num))return;
    const splitAll=confirm("Split this expense equally between all trip travellers?\n\nOK = split between everyone\nCancel = paid/owned by you only");
    const currency=a?.currency||"AUD";
    const {data,error}=await supabase.from("expenses").insert({
      trip_id:day.trip_id,cruise_port_day_id:day.id,activity_id:a?.id||null,created_by:userId,
      description,category:a?.activity_type||"Cruise Port Day",amount:num,currency,
      converted_amount:num,home_currency:currency,expense_date:day.port_date,paid_by_user_id:userId
    }).select("id").single();
    if(error){setMessage(error.message);return}
    if(data?.id){
      if(splitAll&&members.length){
        const each=Math.round((num/members.length)*100)/100;
        await supabase.from("expense_splits").insert(members.map((m,i)=>({
          expense_id:data.id,user_id:m.user_id,
          amount:i===members.length-1?Number((num-each*(members.length-1)).toFixed(2)):each,
          status:m.user_id===userId?"paid":"owed"
        })));
      }else{
        await supabase.from("expense_splits").insert({expense_id:data.id,user_id:userId,amount:num,status:"paid"});
      }
    }
    await refreshExpenses();setMessage("Expense added.");
  }

  async function uploadPhoto(a:Activity,file:File){setBusy(true);const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const path=`${day.trip_id}/cruise-days/${day.id}/${a.id}/${crypto.randomUUID()}-${safe}`;const up=await supabase.storage.from("trip-photos").upload(path,file,{contentType:file.type});if(up.error){setMessage(up.error.message);setBusy(false);return}const {error}=await supabase.from("photos").insert({trip_id:day.trip_id,cruise_port_day_id:day.id,activity_id:a.id,uploaded_by:userId,storage_path:path,caption:a.title});if(error)setMessage(error.message);else setMessage("Photo added to trip photos.");setBusy(false)}


  async function openReturnPanel(){
    setShowReturn(true);setReturnEstimate(null);
    if(day.wharf_lat==null||day.wharf_lng==null||!("geolocation" in navigator))return;
    navigator.geolocation.getCurrentPosition(async pos=>{
      try{
        const r=await fetch(`/api/route?fromLat=${pos.coords.latitude}&fromLon=${pos.coords.longitude}&toLat=${day.wharf_lat}&toLon=${day.wharf_lng}&mode=drive`);
        if(!r.ok)return;const route=await r.json();const rec=wallClockEpoch(day.port_date,day.recommended_return_time,day.timezone);
        const buffer=rec==null?null:Math.floor((rec-Date.now())/60000-Number(route.duration_minutes));
        setReturnEstimate({minutes:Math.round(route.duration_minutes),distance:Number(route.distance_km),buffer});
      }catch{}
    },()=>{}, {timeout:8000,maximumAge:120000});
  }

  async function createReturnReminders(){const {data,error}=await supabase.rpc("create_cruise_day_reminders",{p_cruise_day_id:day.id});setMessage(error?error.message:`${data??0} Cruise Port Day reminder(s) created.`)}

  function directions(a:Activity){if(a.latitude==null||a.longitude==null)return "#";return `https://www.openstreetmap.org/directions?to=${a.latitude},${a.longitude}`}
  function wharfDirections(){if(day.wharf_lat==null||day.wharf_lng==null)return "#";return `https://www.openstreetmap.org/directions?to=${day.wharf_lat},${day.wharf_lng}`}

  return <div className="cruise-day-dashboard">
    <section className="cruise-day-hero" style={day.hero_image_url?{backgroundImage:`linear-gradient(rgba(9,24,55,.30),rgba(9,24,55,.72)),url("${day.hero_image_url}")`}:undefined}>
      <div><div className="eyebrow">Cruise Port Day</div><h1>{day.port_name.toUpperCase()}</h1><p>{new Date(`${day.port_date}T00:00:00`).toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p><span>{day.cruise_ship||"Cruise ship"}{day.cruise_line?` · ${day.cruise_line}`:""}</span></div>
      <div className="cruise-hero-facts"><span>🌐 {day.timezone}</span>{day.tender_port?<span>🛥 Tender port</span>:null}{weather?<span>☀️ {weather.temperature_max}° / {weather.temperature_min}°</span>:null}</div>
    </section>

    <nav className="cruise-day-tabs" aria-label="Cruise Port Day sections">
      <a href="#cruise-overview">Overview</a>
      <a href="#cruise-itinerary">Itinerary</a>
      <a href="#cruise-map">Map</a>
      <a href="#cruise-shopping">Shopping</a>
      <a href="#cruise-photos">Photos</a>
      <a href="#cruise-budget">Budget</a>
      <a href="#cruise-notes">Notes</a>
    </nav>

    <section className="cruise-summary-grid" aria-label="Cruise day summary">
      <div><span>🗺</span><strong>{activities.length}</strong><small>Planned Stops</small></div>
      <div><span>✓</span><strong>{visitedCount}/{activities.length}</strong><small>Visited</small></div>
      <div><span>🛍</span><strong>{purchasedCount}/{shopping.length}</strong><small>Shopping</small></div>
      <div><span>💰</span><strong>${spendTotal.toFixed(2)}</strong><small>Spent Today</small></div>
      <div><span>📸</span><strong>{photoCount}</strong><small>Photos</small></div>
    </section>

    <section id="cruise-overview" className={`return-ship-banner ${warning}`}>
      <div><div className="eyebrow">🚢 RETURN TO SHIP</div><strong>{prettyTime(day.required_return_time)}</strong><span>Recommended wharf arrival: {prettyTime(day.recommended_return_time)}</span></div>
      <div className="return-countdown"><small>Time remaining</small><b>{countdown}</b></div>
      <div className="return-actions"><button onClick={()=>showReturn?setShowReturn(false):openReturnPanel()}>🚢 RETURN TO SHIP</button>{canManage?<button onClick={createReturnReminders}>Create Reminders</button>:null}</div>
    </section>

    {showReturn?<section className="panel return-detail"><div><h2>{day.wharf_name||`${day.port_name} Cruise Wharf`}</h2><p>{day.wharf_address||"Wharf address not entered"}</p></div><div className="return-detail-times"><span>Required <strong>{prettyTime(day.required_return_time)}</strong></span><span>Recommended <strong>{prettyTime(day.recommended_return_time)}</strong></span>{returnEstimate?<><span>Journey estimate <strong>{returnEstimate.minutes} min</strong></span><span>Distance <strong>{returnEstimate.distance.toFixed(1)} km</strong></span><span>Remaining buffer <strong>{returnEstimate.buffer==null?"TBC":`${returnEstimate.buffer} min`}</strong></span></>:<span>Journey estimate <strong>Allow location to calculate</strong></span>}</div>{day.wharf_lat!=null&&day.wharf_lng!=null?<a className="primary" target="_blank" rel="noreferrer" href={wharfDirections()}>Open Directions to Wharf</a>:<div className="muted">Add wharf coordinates to enable directions.</div>}</section>:null}

    {weather?<section className="panel cruise-weather-strip"><div><strong>Weather</strong><span>{weather.summary||"Forecast"}</span></div><b>{weather.temperature_max}°C</b><span>Low {weather.temperature_min}°C · Rain {weather.precipitation_probability_max??0}%</span></section>:<section className="panel muted">Unable to load weather or wharf coordinates are not yet entered. Your itinerary remains available.</section>}

    <div className="cruise-day-layout">
      <main className="cruise-timeline">
        <section id="cruise-itinerary" className="panel cruise-timeline-panel"><div className="section-title-row"><div><div className="eyebrow">Today’s Plan</div><h2>Itinerary Timeline</h2><div className="muted">{activities.length} planned stops · times shown in {day.timezone}</div></div>{canManage?<button className="secondary compact" onClick={mapMissingStops} disabled={busy}>Find Missing Map Locations</button>:null}</div>
          <div className="cruise-activity-list">{activities.map((a,index)=><article className={`cruise-activity-card ${a.visited?"visited":""}`} key={a.id}
            draggable={canManage}
            onDragStart={()=>setDraggedId(a.id)}
            onDragOver={e=>{if(canManage)e.preventDefault()}}
            onDrop={()=>reorderActivity(a.id)}>
            <div className="cruise-stop-number" title={canManage?"Drag to reorder":undefined}>{index+1}</div><div className="cruise-activity-time"><strong>{prettyTime(a.cruise_local_start_time)}</strong><span>– {prettyTime(a.cruise_local_end_time)}</span></div><div className="cruise-activity-icon">{categoryIcon(a.activity_type)}</div>
            <div className="cruise-activity-copy"><div className="activity-badge-row"><span className={`priority-badge ${priorityClass(a.priority)}`}>{a.priority||"Recommended"}</span><span className="badge">{a.activity_type}</span>{a.needs_confirmation?<span className="confirm-badge">⚠ Confirm before trip</span>:null}{a.weather_dependent?<span className="weather-badge">☁ Weather dependent</span>:null}</div><h3>{a.title}</h3>{a.address?<p>{a.address}</p>:null}
              <div className="activity-detail-pills">
                {a.transport_method?<span>🚐 {a.transport_method}</span>:null}
                {a.estimated_travel_minutes?<span>⏱ {a.estimated_travel_minutes} min travel</span>:null}
                {a.estimated_cost!=null?<span>💳 {a.currency||"AUD"} ${Number(a.estimated_cost).toFixed(2)}</span>:null}
                {a.booking_reference?<span>🎟 Ref {a.booking_reference}</span>:null}
                {a.phone?<span>☎ {a.phone}</span>:null}
                {a.confirmation_date?<span>✓ Confirmed {new Date(a.confirmation_date).toLocaleDateString("en-AU")}</span>:null}
              </div>
              {a.activity_type==="Market"?(<div className="market-details"><strong>Market details</strong><span>{a.market_open_time?`${prettyTime(a.market_open_time)} – ${prettyTime(a.market_close_time)}`:"Opening hours TBC"}</span>{a.market_notes?<small>{a.market_notes}</small>:null}</div>):null}
              {a.notes?<small>{a.notes}</small>:null}{a.weather_dependent&&a.bad_weather_alternative?<div className="weather-alternative"><strong>Bad weather alternative:</strong> {a.bad_weather_alternative}</div>:null}
              <div className="cruise-activity-actions">
                {a.latitude!=null&&a.longitude!=null?<><a target="_blank" rel="noreferrer" href={directions(a)}>Directions</a><a target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${a.latitude}&mlon=${a.longitude}#map=18/${a.latitude}/${a.longitude}`}>Map</a></>:null}
                {a.website?<a target="_blank" rel="noreferrer" href={a.website}>Website</a>:null}
                <label className="photo-action">Add Photo<input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)uploadPhoto(a,f)}}/></label>
                <Link href={`/trips/${day.trip_id}/photos`}>View Photos</Link>
                <button onClick={()=>addNote(a)}>Add Note</button><button onClick={()=>addExpense(a)}>Expense</button>
                <button className={a.visited?"active":""} onClick={()=>markVisited(a)}>{a.visited?"✓ Visited":"Mark Visited"}</button>
                {canManage&&a.needs_confirmation?<button onClick={()=>confirmActivity(a)}>Confirm</button>:null}
                {canManage?<><button onClick={()=>quickEdit(a)}>Edit</button><button onClick={()=>duplicate(a)}>Duplicate</button><button className="danger-link" onClick={()=>deleteActivity(a)}>Delete</button></>:null}
              </div>
            </div>
          </article>)}</div>
        </section>

        {canManage?<form className="panel form-stack cruise-add-activity" onSubmit={addActivity}><div className="eyebrow">Planner Tools</div><h2>+ Add Activity</h2><div className="form-grid"><div className="field"><label>Activity *</label><input name="title" required/></div><div className="field"><label>Category</label><select name="category">{["Cruise Wharf","Attraction","Shopping","Market","Food","Cafe","Restaurant","Museum","Beach","Lookout","Walk","Tour","Transport","Historic Site","Nature","Photography","Other"].map(c=><option key={c}>{c}</option>)}</select></div></div><div className="form-grid"><div className="field"><label>Start</label><input name="start" type="time"/></div><div className="field"><label>End</label><input name="end" type="time"/></div><div className="field"><label>Priority</label><select name="priority"><option>Must Do</option><option>Recommended</option><option>Optional</option></select></div></div><div className="field"><label>Address</label><input name="address"/></div>
        <details className="cruise-more-fields"><summary>More activity details</summary>
          <div className="form-grid"><div className="field"><label>Website</label><input name="website" type="url"/></div><div className="field"><label>Phone</label><input name="phone"/></div></div>
          <div className="form-grid"><div className="field"><label>Booking reference</label><input name="booking_reference"/></div><div className="field"><label>Estimated cost</label><input name="estimated_cost" type="number" step="0.01"/></div><div className="field"><label>Currency</label><input name="currency" defaultValue="AUD"/></div></div>
          <div className="form-grid"><div className="field"><label>Transport method</label><input name="transport_method" placeholder="Walk / shuttle / taxi"/></div><div className="field"><label>Travel minutes</label><input name="estimated_travel_minutes" type="number" min="0"/></div></div>
          <div className="field"><label>Confirmation source</label><input name="confirmation_source" placeholder="Website / phone / market page"/></div>
          <div className="form-grid"><div className="field"><label>Market opens</label><input name="market_open_time" type="time"/></div><div className="field"><label>Market closes</label><input name="market_close_time" type="time"/></div></div>
          <div className="field"><label>Market website</label><input name="market_website" type="url"/></div><div className="field"><label>Market notes</label><textarea name="market_notes"/></div>
          <label className="inline-check"><input name="is_indoor" type="checkbox"/> Indoor activity</label>
        </details>
        <div className="field"><label>Notes</label><textarea name="notes"/></div><label className="inline-check"><input name="needs_confirmation" type="checkbox"/> Needs confirmation</label><label className="inline-check"><input name="weather_dependent" type="checkbox"/> Weather dependent</label><div className="field"><label>Bad-weather alternative</label><input name="bad_weather_alternative"/></div><button className="primary">Add Activity</button></form>:null}
      </main>

      <aside className="cruise-day-side">
        <section className="panel port-info-card"><div className="eyebrow">At a Glance</div><h2>Port Information</h2><div className="info-list"><span><b>Wharf</b>{day.wharf_name||"TBC"}</span><span><b>Disembark</b>{prettyTime(day.disembark_time)}</span><span><b>Wharf target</b>{prettyTime(day.recommended_return_time)}</span><span><b>Ship return</b>{prettyTime(day.required_return_time)}</span><span><b>Departure</b>{prettyTime(day.ship_departure_time)}</span></div></section>
        <section id="cruise-notes" className="panel cruise-notes-panel"><div className="eyebrow">Useful Information</div><h2>Port Day Notes</h2>{day.transport_notes?<div className="note-view-card"><strong>🚐 Transport</strong><p>{day.transport_notes}</p></div>:null}{day.notes?<div className="note-view-card"><strong>📝 General Notes</strong><p>{day.notes}</p></div>:null}{!day.transport_notes&&!day.notes?<p className="muted">No port-day notes have been added yet.</p>:null}</section>

        <section id="cruise-shopping" className="panel cruise-shopping-panel"><div className="section-title-row"><div><div className="eyebrow">Souvenirs & Gifts</div><h2>Shopping List</h2></div><span className="badge">{purchasedCount}/{shopping.length} purchased</span></div>
        <div className="shopping-progress"><span style={{width:`${shopping.length?Math.round((purchasedCount/shopping.length)*100):0}%`}}/></div>
        <div className="cruise-shopping">{shopping.map(i=><label className={i.purchased?"done":""} key={i.id}><input type="checkbox" checked={i.purchased} onChange={()=>toggleShopping(i)}/><span><strong>{i.item_name}</strong><small>{i.suggested_location||i.category||"Shopping"}{i.budget?` · Budget ${i.currency} $${i.budget}`:""}{i.actual_cost!=null?` · Paid $${Number(i.actual_cost).toFixed(2)}`:""}</small></span></label>)}</div><form className="form-stack cruise-shopping-add" onSubmit={addShopping}>
          <input name="item" required placeholder="Shopping item"/>
          <input name="location" placeholder="Suggested shop / location"/>
          <div className="form-grid"><input name="category" placeholder="Category" defaultValue="Souvenir"/><input name="budget" type="number" step="0.01" placeholder="Budget"/><input name="currency" defaultValue="AUD"/></div>
          <input name="notes" placeholder="Notes"/>
          <button className="secondary">Add Shopping Item</button>
        </form></section>

        <section id="cruise-budget" className="panel cruise-budget-panel"><div className="section-title-row"><div><div className="eyebrow">Today’s Spending</div><h2>Port Day Budget</h2></div><button className="secondary compact" onClick={()=>addExpense()}>+ Expense</button></div><div className="cruise-expenses">{expenses.slice(0,8).map(e=><div key={e.id}><span>{e.description}</span><strong>{e.currency} ${Number(e.amount).toFixed(2)}</strong></div>)}</div><div className="expense-total"><span>Port day total</span><strong>${expenses.reduce((s,e)=>s+Number(e.amount),0).toFixed(2)}</strong></div><Link className="text-link" href={`/trips/${day.trip_id}/budget`}>Open trip budget →</Link></section>

        <section id="cruise-photos" className="panel cruise-photos-panel"><div className="section-title-row"><div><div className="eyebrow">Memories</div><h2>Port Day Photos</h2></div><span className="badge">{photoCount}</span></div><div className="cruise-photo-grid">{photos.slice(0,6).map(p=>signedUrls[p.id]?<img src={signedUrls[p.id]} alt={p.caption||"Cruise day photo"} key={p.id}/>:null)}</div><Link className="text-link" href={`/trips/${day.trip_id}/photos`}>View all trip photos →</Link></section>
      </aside>
    </div>

    <section id="cruise-map" className="panel cruise-day-map"><div className="section-title-row"><div><h2>Port Day Map</h2><div className="muted">Wharf and mapped itinerary stops in plan order.</div></div></div>{mapPoints.length?<TripMap points={mapPoints as any}/>:<div className="empty-mini">Add wharf/activity coordinates to display the map.</div>}</section>
    {message?<div className={message.includes("added")||message.includes("created")?"success":"error"}>{message}</div>:null}
  </div>;
}
