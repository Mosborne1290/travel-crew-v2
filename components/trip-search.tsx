"use client";
import Link from "next/link";
import { FormEvent,useState } from "react";

type Result={kind:string;id:string;title:string;detail:string;url:string};
const icons:Record<string,string>={activity:"📍",booking:"🎟️",place:"⭐",document:"📄",expense:"💳",journal:"📔",chat:"💬"};

export function TripSearch({tripId}:{tripId:string}){
 const [query,setQuery]=useState(""),[results,setResults]=useState<Result[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function run(e?:FormEvent){e?.preventDefault();const q=query.trim();if(q.length<2){setMessage("Enter at least 2 characters.");return}setBusy(true);setMessage("");try{const r=await fetch(`/api/trips/${tripId}/search?q=${encodeURIComponent(q)}`);const p=await r.json();if(!r.ok)throw new Error(p.error||"Search failed.");setResults(p.results??[]);if(!(p.results??[]).length)setMessage("No matches found in this trip.");}catch(e){setMessage(e instanceof Error?e.message:"Search failed.")}finally{setBusy(false)}}
 const groups=Array.from(new Set(results.map(r=>r.kind)));
 return <div className="trip-search-stage8">
  <form className="panel search-hero-stage8" onSubmit={run}><div><h2>Search This Trip</h2><p className="muted">Find itinerary items, bookings, places, documents, expenses, journal entries and chat messages.</p></div><div className="trip-search-bar"><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try: passport, Miku, flight, insurance…"/><button className="primary" disabled={busy}>{busy?"Searching…":"Search"}</button></div></form>
  {groups.map(kind=><section className="panel search-group" key={kind}><h3>{icons[kind]||"🔎"} {kind[0].toUpperCase()+kind.slice(1)}</h3><div className="search-results">{results.filter(r=>r.kind===kind).map(r=><Link href={r.url} key={`${r.kind}-${r.id}`}><strong>{r.title}</strong>{r.detail?<span>{r.detail}</span>:null}<b>Open →</b></Link>)}</div></section>)}
  {message?<div className={message.startsWith("No matches")?"empty-mini":"error"}>{message}</div>:null}
 </div>
}
