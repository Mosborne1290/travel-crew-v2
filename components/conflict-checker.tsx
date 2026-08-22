"use client";
import { useState } from "react";
type Issue={type:string;severity:string;title:string;detail:string};
export function ConflictChecker({tripId}:{tripId:string}){
 const [issues,setIssues]=useState<Issue[]>([]),[busy,setBusy]=useState(false),[ran,setRan]=useState(false),[message,setMessage]=useState("");
 async function check(){setBusy(true);setMessage("");try{const r=await fetch(`/api/trips/${tripId}/conflicts`);const p=await r.json();if(!r.ok)throw new Error(p.error||"Conflict check failed.");setIssues(p.issues??[]);setRan(true)}catch(e){setMessage(e instanceof Error?e.message:"Conflict check failed.")}finally{setBusy(false)}}
 return <section className="panel conflict-checker"><div className="section-title-row"><div><h2>Itinerary Check</h2><div className="muted">Checks overlaps, tight transfers, booking clashes and long gaps.</div></div><button className="secondary" onClick={check} disabled={busy}>{busy?"Checking…":"Check My Trip"}</button></div>{ran&&!issues.length?<div className="success">No obvious itinerary conflicts found.</div>:null}{issues.length?<div className="conflict-list">{issues.map((i,n)=><article className={`conflict ${i.severity}`} key={`${i.type}-${n}`}><strong>{i.title}</strong><p>{i.detail}</p><span className="badge">{i.severity}</span></article>)}</div>:null}{message?<div className="error">{message}</div>:null}</section>
}
