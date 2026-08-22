"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
type Doc={id:string;name:string;document_type:string;expiry_date:string|null;needed_date:string|null;alert_days:number;traveller_user_id:string|null};
type Traveller={user_id:string;display_name:string};
export function DocumentHealth({tripId,documents,travellers}:{tripId:string;documents:Doc[];travellers:Traveller[]}){
 const supabase=createClient();const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const today=new Date();today.setHours(0,0,0,0);
 const expiring=documents.filter(d=>d.expiry_date).map(d=>({...d,days:Math.ceil((new Date(`${d.expiry_date}T00:00:00`).getTime()-today.getTime())/86400000)})).sort((a,b)=>a.days-b.days);
 async function createAlerts(){setBusy(true);const {data,error}=await supabase.rpc("create_document_expiry_reminders",{p_trip_id:tripId});setMessage(error?error.message:`Expiry check complete. ${data??0} new reminder(s) created.`);setBusy(false)}
 const traveller=(id:string|null)=>travellers.find(t=>t.user_id===id)?.display_name || (id?"Traveller":"Shared");
 return <section className="panel document-health-stage8"><div className="section-title-row"><div><h2>Document Health</h2><div className="muted">Passport, visa, insurance and other expiry monitoring.</div></div><button className="secondary" onClick={createAlerts} disabled={busy}>{busy?"Checking…":"Create Expiry Reminders"}</button></div>
 <div className="document-health-grid"><div><strong>{documents.length}</strong><span>Total documents</span></div><div><strong>{expiring.filter(d=>d.days>=0&&d.days<=90).length}</strong><span>Expire within 90 days</span></div><div><strong>{expiring.filter(d=>d.days<0).length}</strong><span>Already expired</span></div><div><strong>{documents.filter(d=>d.needed_date).length}</strong><span>Linked to a trip date</span></div></div>
 {expiring.length?<div className="expiry-list">{expiring.slice(0,8).map(d=><article className={d.days<0?"expired":d.days<=30?"urgent":""} key={d.id}><div><strong>{d.name}</strong><span>{d.document_type} · {traveller(d.traveller_user_id)}</span></div><b>{d.days<0?`Expired ${Math.abs(d.days)}d ago`:d.days===0?"Expires today":`${d.days} days`}</b></article>)}</div>:<p className="muted">No document expiry dates have been entered yet.</p>}{message?<div className={message.includes("complete")?"success":"error"}>{message}</div>:null}</section>
}
