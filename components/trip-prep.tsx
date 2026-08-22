"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Checklist={id:string;title:string;category:string};
type Item={id:string;checklist_id:string;title:string;assigned_to:string|null;due_date:string|null;completed:boolean;notes:string|null};
type Packing={id:string;traveller_user_id:string|null;title:string;category:string;quantity:number;packed:boolean;shared:boolean};
type Reminder={id:string;user_id:string;title:string;message:string|null;remind_at:string;target_url:string|null;completed:boolean};
type Member={user_id:string;display_name:string};

const packingCats=["Clothes","Shoes","Toiletries","Electronics","Travel Documents","Medication","Cruise","Cold Weather","Beach","Other"];
const checklistCats=["Before Leaving","Packing","Documents","Flight","Hotel","Cruise","Shopping","Custom"];

export function TripPrep({tripId,userId,tripEnd,members,initialChecklists,initialItems,initialPacking,initialReminders}:{
  tripId:string;userId:string;tripEnd:string|null;members:Member[];initialChecklists:Checklist[];initialItems:Item[];initialPacking:Packing[];initialReminders:Reminder[];
}){
  const supabase=useMemo(()=>createClient(),[]);
  const [checklists,setChecklists]=useState(initialChecklists),[items,setItems]=useState(initialItems),[packing,setPacking]=useState(initialPacking),[reminders,setReminders]=useState(initialReminders);
  const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);

  async function refresh(){
    const [{data:c},{data:i},{data:p},{data:r}]=await Promise.all([
      supabase.from("checklists").select("id,title,category").eq("trip_id",tripId).order("created_at"),
      supabase.from("checklist_items").select("id,checklist_id,title,assigned_to,due_date,completed,notes").eq("trip_id",tripId).order("sort_order"),
      supabase.from("packing_items").select("id,traveller_user_id,title,category,quantity,packed,shared").eq("trip_id",tripId).order("category"),
      supabase.from("trip_reminders").select("id,user_id,title,message,remind_at,target_url,completed").eq("trip_id",tripId).order("remind_at"),
    ]);setChecklists(c??[]);setItems(i??[]);setPacking(p??[]);setReminders(r??[]);
  }

  async function createChecklist(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);const {error}=await supabase.from("checklists").insert({trip_id:tripId,title:String(f.get("title")),category:String(f.get("category")),created_by:userId});if(error)setMessage(error.message);else{e.currentTarget.reset();await refresh();setMessage("Checklist created.");}setBusy(false)}
  async function addItem(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const checklistId=String(f.get("checklist_id")||"");if(!checklistId){setMessage("Create a checklist first.");return;}setBusy(true);const {error}=await supabase.from("checklist_items").insert({checklist_id:checklistId,trip_id:tripId,title:String(f.get("title")),assigned_to:String(f.get("assigned_to")||"")||null,due_date:String(f.get("due_date")||"")||null,notes:String(f.get("notes")||"")||null});if(error)setMessage(error.message);else{e.currentTarget.reset();await refresh();setMessage("Checklist item added.");}setBusy(false)}
  async function toggleItem(i:Item){const {error}=await supabase.from("checklist_items").update({completed:!i.completed,completed_at:!i.completed?new Date().toISOString():null}).eq("id",i.id);if(error)setMessage(error.message);else await refresh()}
  async function addPacking(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);const {error}=await supabase.from("packing_items").insert({trip_id:tripId,traveller_user_id:String(f.get("traveller_user_id")||"")||null,title:String(f.get("title")),category:String(f.get("category")),quantity:Number(f.get("quantity")||1),shared:f.get("shared")==="on",created_by:userId});if(error)setMessage(error.message);else{e.currentTarget.reset();await refresh();setMessage("Packing item added.");}setBusy(false)}
  async function togglePacked(p:Packing){const {error}=await supabase.from("packing_items").update({packed:!p.packed}).eq("id",p.id);if(error)setMessage(error.message);else await refresh()}
  async function suggestPacking(){
    const suggestions=[
      ["Travel Documents","Passport / ID"],["Travel Documents","Travel insurance"],["Electronics","Phone charger"],["Electronics","Power adaptor"],["Toiletries","Toiletries bag"],["Clothes","Comfortable travel outfit"],["Medication","Regular medication"],["Other","Reusable water bottle"]
    ];
    setBusy(true);
    const rows=suggestions.map(([category,title])=>({trip_id:tripId,traveller_user_id:userId,title,category,quantity:1,packed:false,shared:false,created_by:userId}));
    const {error}=await supabase.from("packing_items").insert(rows);if(error)setMessage(error.message);else{await refresh();setMessage("Starter packing list added.");}setBusy(false)
  }
  async function addReminder(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);const {error}=await supabase.from("trip_reminders").insert({trip_id:tripId,user_id:String(f.get("user_id")||userId),title:String(f.get("title")),message:String(f.get("message")||"")||null,remind_at:new Date(String(f.get("remind_at"))).toISOString(),target_url:`/trips/${tripId}/today`,reminder_type:String(f.get("reminder_type")||"custom"),created_by:userId});if(error)setMessage(error.message);else{e.currentTarget.reset();await refresh();setMessage("Reminder saved.");}setBusy(false)}
  const memberName=(id:string|null)=>members.find(m=>m.user_id===id)?.display_name||"Shared";

  return <div className="prep-stage6">
    <div className="stage6-tab-grid">
      <section className="panel">
        <div className="section-title-row"><div><h2>Checklists</h2><div className="muted">Assign tasks and tick them off together.</div></div><span className="badge">{items.filter(i=>i.completed).length}/{items.length}</span></div>
        {checklists.map(c=><div className="checklist-block" key={c.id}><h3>{c.title}</h3>{items.filter(i=>i.checklist_id===c.id).map(i=><label className={`check-item ${i.completed?"done":""}`} key={i.id}><input type="checkbox" checked={i.completed} onChange={()=>toggleItem(i)}/><span><strong>{i.title}</strong><small>{memberName(i.assigned_to)}{i.due_date?` · Due ${i.due_date}`:""}</small></span></label>)}</div>)}
        {!checklists.length?<div className="empty-mini">No checklists yet.</div>:null}
        <form className="mini-form" onSubmit={createChecklist}><input name="title" required placeholder="Checklist name"/><select name="category">{checklistCats.map(c=><option key={c}>{c}</option>)}</select><button className="secondary" disabled={busy}>Create</button></form>
        <form className="form-stack stage6-add-form" onSubmit={addItem}><h3>Add checklist item</h3><select name="checklist_id" required defaultValue=""><option value="">Choose checklist</option>{checklists.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select><input name="title" required placeholder="Task"/><div className="form-grid"><select name="assigned_to"><option value="">Shared</option>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</select><input name="due_date" type="date"/></div><textarea name="notes" placeholder="Notes"/><button className="secondary">Add Item</button></form>
      </section>

      <section className="panel">
        <div className="section-title-row"><div><h2>Packing</h2><div className="muted">Personal and shared packing lists.</div></div><button className="secondary compact" onClick={suggestPacking}>Suggest Starter List</button></div>
        <div className="packing-list">{packing.map(p=><label className={`packing-row ${p.packed?"done":""}`} key={p.id}><input type="checkbox" checked={p.packed} onChange={()=>togglePacked(p)}/><span><strong>{p.title}</strong><small>{p.category} · Qty {p.quantity} · {p.shared?"Shared":memberName(p.traveller_user_id)}</small></span></label>)}</div>
        {!packing.length?<div className="empty-mini">Nothing packed yet.</div>:null}
        <form className="form-stack stage6-add-form" onSubmit={addPacking}><h3>Add packing item</h3><input name="title" required placeholder="Item"/><div className="form-grid"><select name="category">{packingCats.map(c=><option key={c}>{c}</option>)}</select><input name="quantity" type="number" min="1" defaultValue="1"/></div><select name="traveller_user_id" defaultValue={userId}>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</select><label className="inline-check"><input name="shared" type="checkbox"/> Shared group item</label><button className="secondary">Add Packing Item</button></form>
      </section>
    </div>

    <section className="panel">
      <div className="section-title-row"><div><h2>Reminders</h2><div className="muted">In-app and browser reminders while Travel Crew is open.</div></div><span className="badge">{reminders.filter(r=>!r.completed).length} active</span></div>
      <div className="reminder-grid">{reminders.map(r=><article className="reminder-card" key={r.id}><strong>⏰ {r.title}</strong><span>{new Intl.DateTimeFormat("en-AU",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"}).format(new Date(r.remind_at))}</span>{r.message?<p>{r.message}</p>:null}<small>For {memberName(r.user_id)}</small></article>)}</div>
      <form className="form-grid stage6-reminder-form" onSubmit={addReminder}><div className="field span-2"><label>Reminder *</label><input name="title" required/></div><div className="field"><label>When</label><input name="remind_at" type="datetime-local" required/></div><div className="field"><label>Traveller</label><select name="user_id" defaultValue={userId}>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</select></div><div className="field span-2"><label>Message</label><textarea name="message"/></div><button className="primary">Save Reminder</button></form>
    </section>
    {message?<div className={message.includes("created")||message.includes("added")||message.includes("saved")?"success":"error"}>{message}</div>:null}
  </div>
}
