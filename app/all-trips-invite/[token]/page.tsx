"use client";

import { FormEvent,useEffect,useMemo,useState } from "react";
import { useParams,useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type InviteInfo={
  invite_id:string;
  email:string;
  preferred_name:string;
  trip_role:string;
  include_future_trips:boolean;
  expires_at:string;
  accepted_at:string|null;
};

export default function AllTripsInvitePage(){
  const params=useParams<{token:string}>();
  const router=useRouter();
  const token=params.token;
  const supabase=useMemo(()=>createClient(),[]);

  const [invite,setInvite]=useState<InviteInfo|null>(null);
  const [loading,setLoading]=useState(true);
  const [password,setPassword]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [signedIn,setSignedIn]=useState(false);

  useEffect(()=>{
    let active=true;

    async function load(){
      const [
        {data:inviteRows,error},
        {data:authData},
      ]=await Promise.all([
        supabase.rpc("get_all_trips_invite",{p_token:token}),
        supabase.auth.getUser(),
      ]);

      if(!active)return;

      if(error||!inviteRows?.length){
        setMessage("This All Trips invitation is invalid or has expired.");
      }else{
        setInvite(inviteRows[0] as InviteInfo);
      }

      setSignedIn(Boolean(authData.user));
      setLoading(false);
    }

    load();
    return()=>{active=false};
  },[supabase,token]);

  async function acceptNow(){
    setBusy(true);setMessage("");

    const {data,error}=await supabase.rpc(
      "accept_all_trips_invite",
      {p_token:token},
    );

    setBusy(false);

    if(error){
      setMessage(error.message);
      return;
    }

    setMessage(`Welcome ${invite?.preferred_name||""}. You now have access to ${data??0} Travel Crew trip(s).`);
    setTimeout(()=>{
      router.replace("/trips");
      router.refresh();
    },900);
  }

  async function signIn(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!invite)return;

    setBusy(true);setMessage("");

    const {error}=await supabase.auth.signInWithPassword({
      email:invite.email,
      password,
    });

    if(error){
      setBusy(false);
      setMessage(error.message);
      return;
    }

    setSignedIn(true);
    setBusy(false);
    await acceptNow();
  }

  async function createAccount(){
    if(!invite||password.length<6){
      setMessage("Choose a password with at least 6 characters.");
      return;
    }

    setBusy(true);setMessage("");

    const {data,error}=await supabase.auth.signUp({
      email:invite.email,
      password,
      options:{
        data:{
          display_name:invite.preferred_name,
          name:invite.preferred_name,
          first_name:invite.preferred_name,
        },
        emailRedirectTo:
          `${window.location.origin}/auth/callback?next=/all-trips-invite/${token}`,
      },
    });

    setBusy(false);

    if(error){
      setMessage(error.message);
      return;
    }

    if(data.session){
      setSignedIn(true);
      await acceptNow();
    }else{
      setMessage(
        "Account created. Check your email to confirm your address, then use the confirmation link to complete your All Trips access.",
      );
    }
  }

  if(loading){
    return <main className="invite-public-page">
      <div className="invite-public-card">Loading All Trips invitation…</div>
    </main>;
  }

  if(!invite){
    return <main className="invite-public-page">
      <section className="invite-public-card">
        <div className="brand-mark">✈</div>
        <h1>Travel Crew Invitation</h1>
        <div className="error">{message||"Invitation not found."}</div>
      </section>
    </main>;
  }

  return <main className="invite-public-page">
    <section className="invite-public-card">
      <div className="brand-lockup">
        <div className="brand-mark">✈</div>
        <div>
          <div className="brand-name">Travel Crew</div>
          <div className="muted">Regular traveller invitation</div>
        </div>
      </div>

      <div className="invite-trip-banner all-trips-invite-banner">
        <div className="eyebrow">You’re invited to Travel Crew</div>
        <h1>Welcome {invite.preferred_name}</h1>
        <p>
          This invitation gives you access to <strong>all current trips</strong>
          {invite.include_future_trips
            ? <> and automatically adds you to <strong>future trips</strong>.</>
            : "."}
        </p>
        <p>
          Trip role: <strong>{invite.trip_role}</strong>
        </p>
      </div>

      {invite.accepted_at?(
        <div className="success">
          This All Trips invitation has already been accepted.
        </div>
      ):signedIn?(
        <>
          <p className="muted">
            You are signed in. Click below to add all available trips to your account.
          </p>
          <button
            className="primary"
            type="button"
            onClick={acceptNow}
            disabled={busy}
          >
            {busy?"Adding Trips…":"Join ALL Trips"}
          </button>
        </>
      ):(
        <form className="form-stack" onSubmit={signIn}>
          <div className="field">
            <label>Preferred name</label>
            <input value={invite.preferred_name} readOnly/>
          </div>

          <div className="field">
            <label>Email</label>
            <input value={invite.email} readOnly/>
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              placeholder="Your Travel Crew password"
              minLength={6}
              required
            />
          </div>

          <button className="primary" disabled={busy}>
            {busy?"Signing in…":"Sign In & Join ALL Trips"}
          </button>

          <div className="invite-divider"><span>or</span></div>

          <button
            className="secondary"
            type="button"
            onClick={createAccount}
            disabled={busy}
          >
            Create New Travel Crew Account
          </button>
        </form>
      )}

      {message?<div className={
        message.startsWith("Welcome")||
        message.startsWith("Account created")
          ?"success":"error"
      }>{message}</div>:null}
    </section>
  </main>;
}
