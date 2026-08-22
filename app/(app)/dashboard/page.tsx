import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";

function formatDate(value:string|null){if(!value)return"Date not set";return new Intl.DateTimeFormat("en-AU",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(`${value}T00:00:00Z`))}
function daysUntil(value:string|null){if(!value)return null;const start=new Date(`${value}T00:00:00Z`).getTime();const now=new Date();const today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());return Math.ceil((start-today)/86400000)}

export default async function DashboardPage(){
 const user=await requireUser();const supabase=await createClient();
 const [{data:profile},{data:trips},{count:unread}]=await Promise.all([
  supabase.from("profiles").select("display_name,first_name").eq("id",user.id).maybeSingle(),
  supabase.from("trips").select("*").order("start_date",{ascending:true,nullsFirst:false}),
  supabase.from("notifications").select("*",{count:"exact",head:true}).eq("user_id",user.id).is("read_at",null),
 ]);
 const allTrips=(trips??[]) as Trip[];const upcoming=allTrips.find(t=>!t.end_date||new Date(`${t.end_date}T23:59:59Z`)>=new Date());const name=profile?.first_name||profile?.display_name||"Traveller";const countdown=upcoming?daysUntil(upcoming.start_date):null;
 let tasks=0;let budget:any=null;let todayActivities=0;
 if(upcoming){
  await supabase.rpc("sync_trip_status",{p_trip_id:upcoming.id});
  const today=new Date().toISOString().slice(0,10);
  const [{count},{data:summary},{data:day}]=await Promise.all([
   supabase.from("checklist_items").select("*",{count:"exact",head:true}).eq("trip_id",upcoming.id).eq("completed",false),
   supabase.rpc("get_trip_budget_summary",{p_trip_id:upcoming.id}),
   supabase.from("itinerary_days").select("id").eq("trip_id",upcoming.id).eq("date",today).maybeSingle(),
  ]);tasks=count??0;budget=summary?.[0]??null;
  if(day){const r=await supabase.from("activities").select("*",{count:"exact",head:true}).eq("trip_id",upcoming.id).eq("itinerary_day_id",day.id);todayActivities=r.count??0}
 }
 return <>
  <header className="page-header"><div><h1>Good to see you, {name}</h1><div className="muted">Your Travel Crew dashboard now follows the trip from planning through travelling.</div></div><div className="header-actions"><Link className="primary" href="/trips/new">＋ New Trip</Link></div></header>
  {upcoming?<Link href={`/trips/${upcoming.id}`} className="hero-card" style={upcoming.cover_image_url?{backgroundImage:`url("${upcoming.cover_image_url}")`}:undefined}><div className="hero-copy"><div className="eyebrow">{upcoming.status==="travelling"?"You are travelling":"Next adventure"}</div><h2>{upcoming.name}</h2><p>{upcoming.primary_destination||"Destination being planned"} · {formatDate(upcoming.start_date)} – {formatDate(upcoming.end_date)}</p><div>{countdown!==null?countdown>0?`${countdown} days to go`:countdown===0?"Your trip starts today":"Trip underway":"Dates to be confirmed"}</div></div></Link>:<div className="empty-state"><h2>Create your first trip</h2><Link className="primary" href="/trips/new">Create a trip</Link></div>}
  {upcoming?<section className="dashboard-stage6-stats">
   <Link href={`/trips/${upcoming.id}/today`}><strong>{todayActivities}</strong><span>Today</span></Link>
   <Link href={`/trips/${upcoming.id}/checklists`}><strong>{tasks}</strong><span>Outstanding Tasks</span></Link>
   <Link href={`/trips/${upcoming.id}/chat`}><strong>{unread??0}</strong><span>Unread Alerts</span></Link>
   <Link href={`/trips/${upcoming.id}/budget`}><strong>{budget?`$${Number(budget.remaining).toLocaleString("en-AU",{maximumFractionDigits:0})}`:"—"}</strong><span>Budget Remaining</span></Link>
  </section>:null}
  <section className="quick-grid">
   <Link className="quick-card" href="/trips"><div className="quick-icon">🧳</div><strong>My Trips</strong><small>Open and manage adventures</small></Link>
   {upcoming?<Link className="quick-card" href={`/trips/${upcoming.id}/today`}><div className="quick-icon">☀️</div><strong>Today</strong><small>Daily trip companion</small></Link>:null}
   {upcoming?<Link className="quick-card" href={`/trips/${upcoming.id}/chat`}><div className="quick-icon">💬</div><strong>Trip Chat</strong><small>Replies, reactions and updates</small></Link>:null}
   {upcoming?<Link className="quick-card" href={`/trips/${upcoming.id}/checklists`}><div className="quick-icon">✅</div><strong>Trip Prep</strong><small>Checklists, packing & reminders</small></Link>:null}
  </section>
  <section className="two-col"><div className="panel"><h2>Trips</h2><div className="list">{allTrips.slice(0,5).map(t=><Link className="list-row" href={`/trips/${t.id}`} key={t.id}><div><strong>{t.name}</strong><div className="muted">{t.primary_destination||"Destination not set"}</div></div><span className="badge">{t.status}</span></Link>)}</div></div><div className="panel"><h2>Stage 6 Companion</h2><div className="list"><div className="list-row"><span>Notifications</span><strong>{unread??0} unread</strong></div><div className="list-row"><span>Browser alerts</span><strong>Available</strong></div><div className="list-row"><span>Offline trip copies</span><strong>Ready</strong></div></div></div></section>
 </>;
}
