"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Suggestion = {
  title:string; description:string; date:string|null; time:string|null;
  activity_type:string; venue_name:string|null; address:string|null;
  action:"itinerary"|"place"|"info";
};

export function AiTripAssistant({tripId,userId}:{tripId:string;userId:string}) {
  const supabase=useMemo(()=>createClient(),[]);
  const [question,setQuestion]=useState("");
  const [answer,setAnswer]=useState("");
  const [suggestions,setSuggestions]=useState<Suggestion[]>([]);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  async function ask(event:FormEvent){
    event.preventDefault();if(!question.trim())return;
    setBusy(true);setMessage("");setAnswer("");setSuggestions([]);
    try{
      const r=await fetch("/api/ai/trip-assistant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tripId,question})});
      const p=await r.json();if(!r.ok)throw new Error(p.error||"AI request failed.");
      setAnswer(p.answer||"");setSuggestions(p.suggestions||[]);
    }catch(e){setMessage(e instanceof Error?e.message:"AI request failed.");}
    finally{setBusy(false);}
  }

  async function addItinerary(s:Suggestion){
    if(!s.date){setMessage("This suggestion has no trip date. Ask the assistant to suggest it for a specific day.");return;}
    const {data:day}=await supabase.from("itinerary_days").select("id").eq("trip_id",tripId).eq("date",s.date).maybeSingle();
    if(!day){setMessage(`No itinerary day exists for ${s.date}.`);return;}
    const start=s.time?new Date(`${s.date}T${s.time}:00`).toISOString():null;
    const {error}=await supabase.from("activities").insert({
      trip_id:tripId,itinerary_day_id:day.id,created_by:userId,title:s.title,
      description:s.description,activity_type:s.activity_type||"other",start_datetime:start,
      venue_name:s.venue_name,address:s.address,notes:"Suggested by Ask Travel Crew",status:"planned",
    });
    setMessage(error?error.message:"Suggestion added to itinerary.");
  }

  async function savePlace(s:Suggestion){
    const {error}=await supabase.from("saved_places").insert({
      trip_id:tripId,created_by:userId,name:s.venue_name||s.title,description:s.description,
      category:s.activity_type||"other",address:s.address,notes:"Suggested by Ask Travel Crew",
    });
    setMessage(error?error.message:"Suggestion saved to places.");
  }

  async function share(s:Suggestion){
    const {error}=await supabase.rpc("share_trip_item_to_chat",{
      p_trip_id:tripId,p_message_text:`✨ ${s.title} · ${s.description}`,p_message_type:"activity",
    });
    setMessage(error?error.message:"Suggestion shared to trip chat.");
  }

  const prompts=[
    "Plan a relaxed day using my current itinerary.",
    "What could we do near our existing activities?",
    "Look at the weather and suggest any itinerary changes.",
    "Suggest a good free-time activity for this trip.",
  ];

  return <div className="ai-stage5">
    <section className="ai-hero">
      <div><div className="eyebrow">✨ Ask Travel Crew</div><h2>Your trip-aware planning assistant</h2><p>It can read this trip’s itinerary, bookings, saved places and available weather. It never changes anything unless you choose an action.</p></div>
    </section>
    <section className="panel">
      <div className="ai-prompt-chips">{prompts.map(p=><button type="button" key={p} onClick={()=>setQuestion(p)}>{p}</button>)}</div>
      <form className="ai-form" onSubmit={ask}><textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask something about this trip…" rows={4}/><button className="primary" disabled={busy}>{busy?"Thinking…":"Ask Travel Crew"}</button></form>
      {message?<div className={message.includes("added")||message.includes("saved")||message.includes("shared")?"success":"error"}>{message}</div>:null}
    </section>
    {answer?<section className="panel ai-answer"><h3>Travel Crew suggests</h3><p>{answer}</p></section>:null}
    {suggestions.length?<section className="ai-suggestion-grid">{suggestions.map((s,i)=><article className="ai-suggestion" key={`${s.title}-${i}`}>
      <div className="eyebrow">{s.date||"Idea"}{s.time?` · ${s.time}`:""}</div><h3>{s.title}</h3><p>{s.description}</p>{s.venue_name?<div className="muted">📍 {s.venue_name}</div>:null}
      <div className="inline-actions">
        {s.action==="itinerary"?<button type="button" onClick={()=>addItinerary(s)}>Add to Itinerary</button>:null}
        <button type="button" onClick={()=>savePlace(s)}>Save Place</button>
        <button type="button" onClick={()=>share(s)}>Share to Chat</button>
      </div>
    </article>)}</section>:null}
  </div>
}
