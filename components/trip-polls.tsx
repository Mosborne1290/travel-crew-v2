"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Poll={id:string;question:string;status:string;created_by:string;closes_at:string|null};
type Option={id:string;poll_id:string;label:string;sort_order:number};
type Vote={id:string;poll_id:string;option_id:string;user_id:string};

export function TripPolls({tripId,userId,initialPolls,initialOptions,initialVotes}:{
  tripId:string;userId:string;initialPolls:Poll[];initialOptions:Option[];initialVotes:Vote[];
}){
  const supabase=useMemo(()=>createClient(),[]);
  const [polls,setPolls]=useState(initialPolls),[options,setOptions]=useState(initialOptions),[votes,setVotes]=useState(initialVotes),[message,setMessage]=useState("");

  async function refresh(){
    const [{data:p},{data:o},{data:v}]=await Promise.all([
      supabase.from("polls").select("id,question,status,created_by,closes_at").eq("trip_id",tripId).order("created_at",{ascending:false}),
      supabase.from("poll_options").select("id,poll_id,label,sort_order").order("sort_order"),
      supabase.from("poll_votes").select("id,poll_id,option_id,user_id"),
    ]);setPolls(p??[]);const ids=new Set((p??[]).map(x=>x.id));setOptions((o??[]).filter(x=>ids.has(x.poll_id)));setVotes((v??[]).filter(x=>ids.has(x.poll_id)));
  }

  async function create(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const el=e.currentTarget;const f=new FormData(el);const labels=String(f.get("options")||"").split("\n").map(x=>x.trim()).filter(Boolean);
    if(labels.length<2){setMessage("Enter at least two choices, one per line.");return;}
    const {data:poll,error}=await supabase.from("polls").insert({trip_id:tripId,question:String(f.get("question")),created_by:userId,status:"open"}).select("id").single();
    if(error||!poll){setMessage(error?.message||"Could not create poll.");return;}
    const result=await supabase.from("poll_options").insert(labels.map((label,i)=>({poll_id:poll.id,label,sort_order:i})));
    if(result.error)setMessage(result.error.message);else{el.reset();await refresh();setMessage("Poll created.");}
  }

  async function vote(pollId:string,optionId:string){
    const {error}=await supabase.from("poll_votes").upsert({poll_id:pollId,option_id:optionId,user_id:userId},{onConflict:"poll_id,user_id"});
    if(error)setMessage(error.message);else await refresh();
  }

  async function close(pollId:string){const {error}=await supabase.from("polls").update({status:"closed"}).eq("id",pollId);if(error)setMessage(error.message);else await refresh()}

  async function saveWinner(poll:Poll){
    const opts=options.filter(o=>o.poll_id===poll.id);
    const ranked=opts.map(o=>({...o,count:votes.filter(v=>v.option_id===o.id).length})).sort((a,b)=>b.count-a.count);
    const winner=ranked[0];if(!winner){setMessage("No poll options.");return;}
    const {error}=await supabase.from("saved_places").insert({trip_id:tripId,created_by:userId,name:winner.label,category:"other",notes:`Winner of poll: ${poll.question}`});
    setMessage(error?error.message:`Saved winning option "${winner.label}" to Saved Places.`);
  }

  return <div className="polls-stage6">
    <section className="panel">
      <div className="section-title-row"><div><h2>Group Polls</h2><div className="muted">Vote together on meals, tours, activities and timing.</div></div></div>
      <div className="poll-grid">{polls.map(p=>{
        const opts=options.filter(o=>o.poll_id===p.id);const mine=votes.find(v=>v.poll_id===p.id&&v.user_id===userId);
        const total=votes.filter(v=>v.poll_id===p.id).length;
        return <article className="poll-card" key={p.id}><div className="section-title-row"><div><h3>{p.question}</h3><span className="badge">{p.status}</span></div>{p.created_by===userId&&p.status==="open"?<button className="ghost compact" onClick={()=>close(p.id)}>Close</button>:null}</div>
          <div className="poll-options">{opts.map(o=>{const count=votes.filter(v=>v.option_id===o.id).length;const pct=total?Math.round(count/total*100):0;return <button key={o.id} className={mine?.option_id===o.id?"selected":""} disabled={p.status!=="open"} onClick={()=>vote(p.id,o.id)}><div><strong>{o.label}</strong><span>{count} vote{count===1?"":"s"}</span></div><i style={{width:`${pct}%`}}/></button>})}</div>
          {p.status==="closed"?<button className="secondary compact" onClick={()=>saveWinner(p)}>Save Winning Option</button>:null}
        </article>})}</div>
      {!polls.length?<div className="empty-mini">No group polls yet.</div>:null}
    </section>

    <form className="panel form-stack poll-create" onSubmit={create}><h2>Create Poll</h2><div className="field"><label>Question *</label><input name="question" required placeholder="Where should we have dinner?"/></div><div className="field"><label>Choices *</label><textarea name="options" required placeholder={"Miku Vancouver\nSpaghetti House\nGastown option"}/><small>One option per line.</small></div><button className="primary">Create Poll</button></form>
    {message?<div className={message.includes("created")||message.includes("Saved")?"success":"error"}>{message}</div>:null}
  </div>
}
