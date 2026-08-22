"use client";
import { useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Feed={id:string;user_id:string|null;event_type:string;title:string;detail:string|null;target_url:string|null;created_at:string};
type Member={user_id:string;display_name:string};

export function TripActivityFeed({tripId,initialFeed,members}:{tripId:string;initialFeed:Feed[];members:Member[]}){
 const supabase=useMemo(()=>createClient(),[]);const [feed,setFeed]=useState(initialFeed);const names=new Map(members.map(m=>[m.user_id,m.display_name]));
 useEffect(()=>{const ch=supabase.channel(`trip-feed-${tripId}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"trip_activity_feed",filter:`trip_id=eq.${tripId}`},p=>setFeed(c=>[p.new as Feed,...c].slice(0,100))).subscribe();return()=>{supabase.removeChannel(ch)}},[supabase,tripId]);
 const icon=(t:string)=>t==="photo"?"📸":t==="expense"?"💳":t==="poll"?"🗳️":t==="booking"?"🎟️":t==="checklist"?"✅":t==="chat"?"💬":t==="place"?"📍":"✈️";
 return <section className="panel feed-stage7"><div className="section-title-row"><div><h2>Trip Activity Feed</h2><div className="muted">A live record of changes made by your Travel Crew.</div></div><span className="badge">{feed.length}</span></div>{feed.length?<div className="feed-list">{feed.map(f=><article key={f.id}><div className="feed-icon">{icon(f.event_type)}</div><div><strong>{f.title}</strong><div className="muted">{f.user_id?names.get(f.user_id)||"Traveller":"Travel Crew"} · {new Intl.DateTimeFormat("en-AU",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"}).format(new Date(f.created_at))}</div>{f.detail?<p>{f.detail}</p>:null}{f.target_url?<Link className="text-link" href={f.target_url}>Open →</Link>:null}</div></article>)}</div>:<div className="empty-mini">No trip activity has been logged yet.</div>}</section>
}
