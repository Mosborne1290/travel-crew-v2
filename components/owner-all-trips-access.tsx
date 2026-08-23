"use client";

import { FormEvent,useMemo,useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserOption={
  id:string;
  display_name:string;
  email:string|null;
};

type AccessRow={
  id:string;
  user_id:string|null;
  email:string;
  preferred_name:string;
  trip_role:string;
  include_future_trips:boolean;
  invite_token:string;
  expires_at:string;
  accepted_at:string|null;
};

export function OwnerAllTripsAccess({
  users,
  initialAccess,
  tripCount,
}:{
  users:UserOption[];
  initialAccess:AccessRow[];
  tripCount:number;
}){
  const supabase=useMemo(()=>createClient(),[]);
  const [rows,setRows]=useState(initialAccess);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [newLink,setNewLink]=useState("");
  const [email,setEmail]=useState("");
  const [name,setName]=useState("");

  function inviteUrl(token:string){
    if(typeof window==="undefined")return `/all-trips-invite/${token}`;
    return `${window.location.origin}/all-trips-invite/${token}`;
  }

  async function refresh(){
    const {data,error}=await supabase
      .from("all_trip_travellers")
      .select("id,user_id,email,preferred_name,trip_role,include_future_trips,invite_token,expires_at,accepted_at")
      .order("created_at",{ascending:false});

    if(error){setMessage(error.message);return}
    setRows(data??[]);
  }

  function chooseExisting(userId:string){
    const selected=users.find(u=>u.id===userId);
    if(!selected)return;
    setEmail(selected.email||"");
    setName(selected.display_name||"");
  }

  async function add(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const f=new FormData(e.currentTarget);

    const preferredName=name.trim();
    const cleanEmail=email.trim().toLowerCase();

    if(!preferredName){setMessage("Enter the traveller preferred name.");return}
    if(!cleanEmail||!cleanEmail.includes("@")){setMessage("Enter a valid email address.");return}

    setBusy(true);setMessage("");setNewLink("");

    const {data,error}=await supabase.rpc("owner_create_all_trips_access",{
      p_email:cleanEmail,
      p_preferred_name:preferredName,
      p_trip_role:String(f.get("trip_role")||"member"),
      p_include_future:f.get("include_future")==="on",
      p_valid_days:Number(f.get("valid_days")||7),
    });

    if(error||!data?.length){
      setMessage(error?.message||"Could not add all-trips access.");
      setBusy(false);
      return;
    }

    const result=data[0] as any;

    if(result.status==="added"){
      setMessage(`${preferredName} now has access to all ${tripCount} existing trip${tripCount===1?"":"s"}${f.get("include_future")==="on"?" and will be added automatically to future trips.":"."}`);
    }else{
      const link=inviteUrl(result.invite_token);
      setNewLink(link);
      setMessage(`One all-trips invitation link has been created for ${preferredName}.`);
    }

    await refresh();
    setBusy(false);
  }

  async function copy(token:string){
    const link=inviteUrl(token);
    try{
      await navigator.clipboard.writeText(link);
      setMessage("All-trips invitation link copied.");
    }catch{
      setNewLink(link);
      setMessage("Copy the invitation link shown below.");
    }
  }

  async function remove(row:AccessRow){
    const removeExisting=confirm(
      `Remove ${row.preferred_name} from the All Trips list?\n\nChoose OK to ALSO remove them from every existing trip.\nChoose Cancel to keep their current trip memberships.`,
    );

    // If user clicked Cancel on first dialog, ask whether they only want future auto-access removed.
    if(!removeExisting){
      const futureOnly=confirm(
        `Keep ${row.preferred_name} on current trips but stop All Trips / future-trip access?`,
      );
      if(!futureOnly)return;
    }

    setBusy(true);
    const {error}=await supabase.rpc("owner_remove_all_trips_access",{
      p_access_id:row.id,
      p_remove_existing:removeExisting,
    });

    if(error)setMessage(error.message);
    else{
      setMessage(
        removeExisting
          ? `${row.preferred_name} was removed from All Trips and from existing trips.`
          : `${row.preferred_name} keeps current trips but will no longer receive automatic All Trips access.`,
      );
      await refresh();
    }
    setBusy(false);
  }

  return <section className="panel owner-all-trips-stage8">
    <div className="section-title-row">
      <div>
        <h2>Regular Travellers — All Trips Access</h2>
        <div className="muted">
          Add someone once — such as Robert — and give them access to every trip instead of inviting them trip by trip.
        </div>
      </div>
      <span className="badge">{rows.filter(r=>r.accepted_at).length} active</span>
    </div>

    <div className="all-trips-callout">
      <strong>One button access</strong>
      <span>
        Existing Travel Crew users are added immediately. New users receive one invitation link.
        Leave <b>Automatically add to future trips</b> ticked for people who normally travel with you.
      </span>
    </div>

    <form className="form-stack all-trips-form" onSubmit={add}>
      {users.length?<div className="field">
        <label>Choose an existing Travel Crew user (optional)</label>
        <select defaultValue="" onChange={e=>chooseExisting(e.target.value)}>
          <option value="">Enter a new traveller below</option>
          {users.filter(u=>u.email).map(u=>
            <option value={u.id} key={u.id}>{u.display_name} — {u.email}</option>
          )}
        </select>
      </div>:null}

      <div className="form-grid">
        <div className="field">
          <label>Preferred name / nickname *</label>
          <input
            value={name}
            onChange={e=>setName(e.target.value)}
            required
            placeholder="Robert"
            maxLength={80}
          />
        </div>
        <div className="field">
          <label>Email *</label>
          <input
            value={email}
            onChange={e=>setEmail(e.target.value)}
            type="email"
            required
            placeholder="robert@example.com"
          />
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label>Trip access role</label>
          <select name="trip_role" defaultValue="member">
            <option value="organiser">Organiser</option>
            <option value="member">Member</option>
            <option value="guest">Guest</option>
          </select>
        </div>
        <div className="field">
          <label>Invitation valid for new users</label>
          <select name="valid_days" defaultValue="7">
            <option value="1">1 day</option>
            <option value="3">3 days</option>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
          </select>
        </div>
      </div>

      <label className="all-trips-checkbox">
        <input type="checkbox" name="include_future" defaultChecked/>
        <span>
          <strong>Automatically add to future trips</strong>
          <small>Recommended for regular travellers such as Robert.</small>
        </span>
      </label>

      <button className="primary all-trips-main-button" disabled={busy}>
        {busy?"Working…":"Add / Invite to ALL Trips"}
      </button>
    </form>

    {newLink?<div className="invite-link-box all-trips-new-link">
      <strong>Single All Trips invitation link</strong>
      <input value={newLink} readOnly onFocus={e=>e.currentTarget.select()}/>
      <button className="secondary compact" type="button" onClick={()=>navigator.clipboard.writeText(newLink).then(()=>setMessage("All-trips invitation link copied."))}>
        Copy Link
      </button>
    </div>:null}

    <div className="all-trips-current">
      <h3>People with All Trips access</h3>
      {rows.length?<div className="all-trips-list">
        {rows.map(row=>{
          const expired=!row.accepted_at&&new Date(row.expires_at)<new Date();
          return <article key={row.id}>
            <div className="avatar-circle">{row.preferred_name.slice(0,1).toUpperCase()}</div>
            <div className="all-trips-person">
              <strong>{row.preferred_name}</strong>
              <span>{row.email}</span>
              <small>
                {row.trip_role} · {row.accepted_at?"Active":expired?"Invite expired":"Invite pending"}
                {" · "}{row.include_future_trips?"Existing + future trips":"Existing trips only"}
              </small>
            </div>
            <div className="all-trips-actions">
              {!row.accepted_at&&!expired?
                <button className="secondary compact" type="button" onClick={()=>copy(row.invite_token)}>Copy Link</button>
              :null}
              <button className="danger-button compact" type="button" onClick={()=>remove(row)} disabled={busy}>
                Remove
              </button>
            </div>
          </article>
        })}
      </div>:<div className="empty-mini">No regular All Trips travellers have been added yet.</div>}
    </div>

    {message?<div className={
      message.includes("access")||
      message.includes("created")||
      message.includes("copied")||
      message.includes("removed")||
      message.includes("keeps")
        ?"success":"error"
    }>{message}</div>:null}
  </section>;
}
