"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Trip={id:string;name:string;primary_destination:string|null;start_date:string|null};
type Invite={
  id:string;
  trip_id:string;
  email:string;
  role:string;
  invite_token:string;
  expires_at:string;
  accepted_at:string|null;
  trip_name?:string;
};

export function OwnerInvitations({
  trips,
  initialInvites,
}:{
  trips:Trip[];
  initialInvites:Invite[];
}){
  const supabase=useMemo(()=>createClient(),[]);
  const [invites,setInvites]=useState(initialInvites);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [newLink,setNewLink]=useState("");

  function url(token:string){
    if(typeof window==="undefined")return `/invite/${token}`;
    return `${window.location.origin}/invite/${token}`;
  }

  async function refresh(){
    const {data,error}=await supabase
      .from("trip_invites")
      .select("id,trip_id,email,role,invite_token,expires_at,accepted_at")
      .order("created_at",{ascending:false});
    if(error){setMessage(error.message);return}
    setInvites((data??[]).map((i:any)=>({
      ...i,
      trip_name:trips.find(t=>t.id===i.trip_id)?.name||"Trip"
    })));
  }

  async function createInvite(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const el=e.currentTarget;
    const f=new FormData(el);
    const tripId=String(f.get("trip_id")||"");
    const email=String(f.get("email")||"").trim().toLowerCase();
    const role=String(f.get("role")||"member");
    const validDays=Number(f.get("valid_days")||7);

    if(!tripId){setMessage("Choose a trip.");return}
    if(!email||!email.includes("@")){setMessage("Enter a valid email address.");return}

    setBusy(true);setMessage("");setNewLink("");

    const {data,error}=await supabase.rpc("owner_create_trip_invite",{
      p_trip_id:tripId,
      p_email:email,
      p_role:role,
      p_valid_days:validDays
    });

    if(error||!data?.length){
      setMessage(error?.message||"Could not create invitation.");
    }else{
      const item=data[0] as any;
      const link=url(item.invite_token);
      setNewLink(link);
      setMessage("Invitation link created.");
      el.reset();
      await refresh();
    }
    setBusy(false);
  }

  async function copy(token:string){
    const link=url(token);
    try{
      await navigator.clipboard.writeText(link);
      setMessage("Invitation link copied.");
    }catch{
      setNewLink(link);
      setMessage("Copy the invitation link shown below.");
    }
  }

  async function revoke(id:string){
    if(!confirm("Revoke this pending invitation link?"))return;
    const {error}=await supabase.rpc("owner_revoke_trip_invite",{p_invite_id:id});
    if(error)setMessage(error.message);
    else{setMessage("Invitation revoked.");await refresh()}
  }

  function tripName(id:string){
    return trips.find(t=>t.id===id)?.name||"Trip";
  }

  return <section className="panel owner-invites-stage8">
    <div className="section-title-row">
      <div>
        <h2>Invitation Links</h2>
        <div className="muted">
          Create secure trip invitation links from one Owner screen, then copy and send the link to the traveller.
        </div>
      </div>
      <span className="badge">{invites.filter(i=>!i.accepted_at).length} pending</span>
    </div>

    <div className="owner-invite-layout">
      <form className="form-stack owner-invite-form" onSubmit={createInvite}>
        <h3>Create invitation</h3>

        <div className="field">
          <label>Trip *</label>
          <select name="trip_id" required defaultValue="">
            <option value="">Choose a trip</option>
            {trips.map(t=><option key={t.id} value={t.id}>
              {t.name}{t.primary_destination?` — ${t.primary_destination}`:""}
            </option>)}
          </select>
        </div>

        <div className="field">
          <label>Email address *</label>
          <input name="email" type="email" required placeholder="traveller@example.com"/>
        </div>

        <div className="form-grid">
          <div className="field">
            <label>Trip role</label>
            <select name="role" defaultValue="member">
              <option value="organiser">Organiser</option>
              <option value="member">Member</option>
              <option value="guest">Guest</option>
            </select>
          </div>
          <div className="field">
            <label>Link valid for</label>
            <select name="valid_days" defaultValue="7">
              <option value="1">1 day</option>
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </select>
          </div>
        </div>

        <button className="primary" type="submit" disabled={busy}>
          {busy?"Generating…":"Generate Invitation Link"}
        </button>

        {newLink?<div className="invite-link-box">
          <strong>New invitation link</strong>
          <input value={newLink} readOnly onFocus={e=>e.currentTarget.select()}/>
          <button type="button" className="secondary compact" onClick={()=>navigator.clipboard.writeText(newLink).then(()=>setMessage("Invitation link copied."))}>
            Copy Link
          </button>
        </div>:null}
      </form>

      <div>
        <h3>Existing invitations</h3>
        {invites.length?<div className="owner-invite-list">
          {invites.map(i=>{
            const expired=!i.accepted_at&&new Date(i.expires_at)<new Date();
            return <article key={i.id} className={expired?"expired":""}>
              <div className="owner-invite-main">
                <strong>{i.email}</strong>
                <span>{tripName(i.trip_id)}</span>
                <small>
                  {i.role} · {i.accepted_at?"Accepted":expired?"Expired":"Pending"} ·
                  {" "}expires {new Date(i.expires_at).toLocaleDateString("en-AU")}
                </small>
              </div>
              <div className="owner-invite-actions">
                {!i.accepted_at&&!expired?<button className="secondary compact" type="button" onClick={()=>copy(i.invite_token)}>Copy Link</button>:null}
                {!i.accepted_at?<button className="icon-danger" type="button" title="Revoke invitation" onClick={()=>revoke(i.id)}>×</button>:null}
              </div>
            </article>
          })}
        </div>:<div className="empty-mini">No invitation links have been created yet.</div>}
      </div>
    </div>

    {message?<div className={
      message.includes("created")||message.includes("copied")||message.includes("revoked")
        ?"success":"error"
    }>{message}</div>:null}
  </section>;
}
