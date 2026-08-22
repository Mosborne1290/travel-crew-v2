"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Suggestion = {
  title:string;
  description:string;
  date:string|null;
  time:string|null;
  activity_type:string;
  venue_name:string|null;
  address:string|null;
  action:"itinerary"|"place"|"info";
};

export function AiTripAssistant({
  tripId,
  userId,
}:{
  tripId:string;
  userId:string;
}) {
  const supabase=useMemo(()=>createClient(),[]);
  const [question,setQuestion]=useState("");
  const [answer,setAnswer]=useState("");
  const [suggestions,setSuggestions]=useState<Suggestion[]>([]);
  const [message,setMessage]=useState("");
  const [toast,setToast]=useState("");
  const [busy,setBusy]=useState(false);
  const [plannerMode,setPlannerMode]=useState("");
  const [workingAction,setWorkingAction]=useState("");

  function showToast(text:string){
    setToast(text);
    window.setTimeout(()=>setToast(""),3200);
  }

  async function ask(event:FormEvent){
    event.preventDefault();
    if(!question.trim())return;

    setBusy(true);
    setMessage("");
    setAnswer("");
    setSuggestions([]);

    try{
      const r=await fetch("/api/ai/trip-assistant",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({tripId,question}),
      });

      const p=await r.json();

      if(!r.ok){
        throw new Error(p.error||"Travel Crew could not complete the request.");
      }

      setAnswer(p.answer||"");
      setSuggestions(p.suggestions||[]);
      setPlannerMode(p.planner_mode||"openai");
    }catch(e){
      setMessage(e instanceof Error?e.message:"Travel Crew could not complete the request.");
    }finally{
      setBusy(false);
    }
  }

  async function addItinerary(s:Suggestion,index:number){
    if(!s.date){
      showToast("This suggestion has no trip date. Ask Travel Crew for a specific day.");
      return;
    }

    const actionKey=`itinerary-${index}`;
    setWorkingAction(actionKey);
    setMessage("");

    try{
      const response=await fetch(`/api/trips/${tripId}/activities`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          itinerary_day_id:"",
          day_date:s.date,
          destination_name:"",
          title:s.title,
          activity_type:s.activity_type||"other",
          venue_name:s.venue_name||"",
          address:s.address||"",
          start_time:s.time||"",
          end_time:"",
          cost:"",
          notes:`${s.description}\n\nSuggested by Ask Travel Crew`,
        }),
      });

      const payload=await response.json();

      if(!response.ok){
        throw new Error(payload.error||"Could not add this suggestion.");
      }

      showToast(`Added "${s.title}" to the itinerary.`);
    }catch(e){
      const error=e instanceof Error?e.message:"Could not add this suggestion.";
      setMessage(error);
      showToast(error);
    }finally{
      setWorkingAction("");
    }
  }

  async function savePlace(s:Suggestion,index:number){
    const actionKey=`place-${index}`;
    setWorkingAction(actionKey);
    setMessage("");

    try{
      const name=(s.venue_name||s.title).trim();

      // Avoid adding the same suggestion repeatedly.
      const existing=await supabase
        .from("saved_places")
        .select("id")
        .eq("trip_id",tripId)
        .ilike("name",name)
        .limit(1);

      if(existing.error)throw existing.error;

      if(existing.data?.length){
        showToast(`"${name}" is already in Saved Places.`);
        return;
      }

      let latitude:number|null=null;
      let longitude:number|null=null;
      let resolvedAddress=s.address||null;

      try{
        const locationQuery=[s.address,s.venue_name||s.title].filter(Boolean).join(" ");
        if(locationQuery){
          const response=await fetch(`/api/location/search?q=${encodeURIComponent(locationQuery)}`);
          const payload=await response.json();
          const match=response.ok?payload.results?.[0]:null;
          if(match){
            latitude=match.latitude??null;
            longitude=match.longitude??null;
            if(!resolvedAddress){
              resolvedAddress=[match.name,match.admin1,match.country].filter(Boolean).join(", ");
            }
          }
        }
      }catch{
        // Saving the place must still work if mapping does not.
      }

      const {error}=await supabase.from("saved_places").insert({
        trip_id:tripId,
        created_by:userId,
        name,
        description:s.description,
        category:s.activity_type||"other",
        address:resolvedAddress,
        notes:"Suggested by Ask Travel Crew",
        latitude,
        longitude,
      });

      if(error)throw error;

      showToast(`Saved "${name}" to Saved Places.`);
    }catch(e){
      const error=e instanceof Error?e.message:"Could not save this place.";
      setMessage(error);
      showToast(error);
    }finally{
      setWorkingAction("");
    }
  }

  async function share(s:Suggestion,index:number){
    const actionKey=`chat-${index}`;
    setWorkingAction(actionKey);
    setMessage("");

    try{
      const {error}=await supabase.rpc("share_trip_item_to_chat",{
        p_trip_id:tripId,
        p_message_text:`✨ ${s.title} · ${s.description}`,
        p_message_type:s.action==="place"?"place":"activity",
      });

      if(error)throw error;

      showToast(`Shared "${s.title}" to Trip Chat.`);
    }catch(e){
      const error=e instanceof Error?e.message:"Could not share to chat.";
      setMessage(error);
      showToast(error);
    }finally{
      setWorkingAction("");
    }
  }

  const prompts=[
    "Plan a relaxed day using my current itinerary.",
    "What could we do near our existing activities?",
    "Look at the weather and suggest any itinerary changes.",
    "Suggest a good free-time activity for this trip.",
  ];

  return <div className="ai-stage5">
    {toast?<div className="travel-toast">{toast}</div>:null}

    <section className="ai-hero">
      <div>
        <div className="eyebrow">✨ Ask Travel Crew</div>
        <h2>Your trip-aware planning assistant</h2>
        <p>
          It can read this trip’s itinerary, bookings, saved places and available weather.
          It never changes anything unless you choose an action.
        </p>
      </div>
    </section>

    <section className="panel">
      <div className="ai-prompt-chips">
        {prompts.map(p=>
          <button type="button" key={p} onClick={()=>setQuestion(p)}>{p}</button>
        )}
      </div>

      <form className="ai-form" onSubmit={ask}>
        <textarea
          value={question}
          onChange={e=>setQuestion(e.target.value)}
          placeholder="Ask something about this trip…"
          rows={4}
        />
        <button className="primary" disabled={busy}>
          {busy?"Thinking…":"Ask Travel Crew"}
        </button>
      </form>

      {message?<div className="error">{message}</div>:null}
    </section>

    {answer?
      <section className="panel ai-answer">
        <div className="section-title-row">
          <h3>Travel Crew suggests</h3>
          {plannerMode==="free_smart"
            ?<span className="badge">Free Smart Planner</span>
            :<span className="badge">AI</span>}
        </div>
        <p>{answer}</p>
      </section>
      :null}

    {suggestions.length?
      <section className="ai-suggestion-grid">
        {suggestions.map((s,i)=>
          <article className="ai-suggestion" key={`${s.title}-${i}`}>
            <div className="eyebrow">
              {s.date||"Idea"}{s.time?` · ${s.time}`:""}
            </div>
            <h3>{s.title}</h3>
            <p>{s.description}</p>

            {s.venue_name?
              <div className="muted">📍 {s.venue_name}</div>
              :null}

            <div className="inline-actions">
              {s.action==="itinerary"?
                <button
                  type="button"
                  disabled={Boolean(workingAction)}
                  onClick={()=>addItinerary(s,i)}
                >
                  {workingAction===`itinerary-${i}`?"Adding…":"Add to Itinerary"}
                </button>
                :null}

              <button
                type="button"
                disabled={Boolean(workingAction)}
                onClick={()=>savePlace(s,i)}
              >
                {workingAction===`place-${i}`?"Saving…":"Save Place"}
              </button>

              <button
                type="button"
                disabled={Boolean(workingAction)}
                onClick={()=>share(s,i)}
              >
                {workingAction===`chat-${i}`?"Sharing…":"Share to Chat"}
              </button>
            </div>
          </article>
        )}
      </section>
      :null}
  </div>
}
