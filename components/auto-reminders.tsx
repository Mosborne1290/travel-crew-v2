"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
export function AutoReminders({tripId}:{tripId:string}){const supabase=createClient();const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);async function generate(){setBusy(true);const {data,error}=await supabase.rpc("create_automatic_trip_reminders",{p_trip_id:tripId});setMessage(error?error.message:`Automatic reminders checked. ${data??0} new reminder(s) created.`);setBusy(false)}return <div className="auto-reminders"><button className="secondary" onClick={generate} disabled={busy}>{busy?"Checking…":"Create Automatic Reminders"}</button>{message?<small>{message}</small>:null}</div>}
