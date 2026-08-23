"use client";
import { FormEvent,useMemo,useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CruisePortDaySettings({day,canManage}:{day:any;canManage:boolean}){
  const supabase=useMemo(()=>createClient(),[]);
  const [open,setOpen]=useState(false),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  if(!canManage)return null;

  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);
    const patch={
      port_name:String(f.get("port_name")),region:String(f.get("region")||"")||null,country:String(f.get("country")||"")||null,
      port_date:String(f.get("port_date")),timezone:String(f.get("timezone")),
      cruise_ship:String(f.get("cruise_ship")||"")||null,cruise_line:String(f.get("cruise_line")||"")||null,
      wharf_name:String(f.get("wharf_name")||"")||null,wharf_address:String(f.get("wharf_address")||"")||null,
      wharf_lat:String(f.get("wharf_lat")||"")?Number(f.get("wharf_lat")):null,
      wharf_lng:String(f.get("wharf_lng")||"")?Number(f.get("wharf_lng")):null,
      ship_arrival_time:String(f.get("ship_arrival_time")||"")||null,
      disembark_time:String(f.get("disembark_time")||"")||null,
      required_return_time:String(f.get("required_return_time")||"")||null,
      recommended_return_time:String(f.get("recommended_return_time")||"")||null,
      ship_departure_time:String(f.get("ship_departure_time")||"")||null,
      tender_port:f.get("tender_port")==="on",
      transport_notes:String(f.get("transport_notes")||"")||null,notes:String(f.get("notes")||"")||null,
      warning_amber_minutes:Number(f.get("warning_amber_minutes")||90),
      warning_orange_minutes:Number(f.get("warning_orange_minutes")||60),
      warning_red_minutes:Number(f.get("warning_red_minutes")||30),
      warning_critical_minutes:Number(f.get("warning_critical_minutes")||15),
      updated_at:new Date().toISOString(),
    };
    const {error}=await supabase.from("cruise_port_days").update(patch).eq("id",day.id);
    if(error)setMessage(error.message);else{setMessage("Cruise Port Day updated.");setTimeout(()=>window.location.reload(),500)}
    setBusy(false);
  }

  async function deleteDay(){
    if(!confirm(`Delete the ${day.port_name} Cruise Port Day and its cruise-day activities/shopping?`))return;
    const {error}=await supabase.from("cruise_port_days").delete().eq("id",day.id);
    if(error)setMessage(error.message);else window.location.href=`/trips/${day.trip_id}/cruise-days`;
  }

  return <section className="panel cruise-day-settings">
    <div className="section-title-row"><div><h2>Port Day Settings</h2><div className="muted">Owner/Admin/Organiser controls for critical ship and wharf information.</div></div><button className="secondary" onClick={()=>setOpen(!open)}>{open?"Close":"Edit Port Day"}</button></div>
    {open?<form className="form-stack" onSubmit={save}>
      <div className="form-grid"><div className="field"><label>Port *</label><input name="port_name" defaultValue={day.port_name} required/></div><div className="field"><label>Date *</label><input name="port_date" type="date" defaultValue={day.port_date} required/></div></div>
      <div className="form-grid"><div className="field"><label>Region</label><input name="region" defaultValue={day.region||""}/></div><div className="field"><label>Country</label><input name="country" defaultValue={day.country||""}/></div></div>
      <div className="field"><label>Destination timezone *</label><input name="timezone" defaultValue={day.timezone} required/><small>Times below remain local to this timezone.</small></div>
      <div className="form-grid"><div className="field"><label>Ship</label><input name="cruise_ship" defaultValue={day.cruise_ship||""}/></div><div className="field"><label>Cruise line</label><input name="cruise_line" defaultValue={day.cruise_line||""}/></div></div>
      <div className="form-grid"><div className="field"><label>Wharf</label><input name="wharf_name" defaultValue={day.wharf_name||""}/></div><div className="field"><label>Wharf address</label><input name="wharf_address" defaultValue={day.wharf_address||""}/></div></div>
      <div className="form-grid"><div className="field"><label>Wharf latitude</label><input name="wharf_lat" type="number" step="any" defaultValue={day.wharf_lat??""}/></div><div className="field"><label>Wharf longitude</label><input name="wharf_lng" type="number" step="any" defaultValue={day.wharf_lng??""}/></div></div>
      <div className="form-grid">
        <div className="field"><label>Ship arrival</label><input name="ship_arrival_time" type="time" defaultValue={day.ship_arrival_time?.slice(0,5)||""}/></div>
        <div className="field"><label>Disembark</label><input name="disembark_time" type="time" defaultValue={day.disembark_time?.slice(0,5)||""}/></div>
        <div className="field critical-field"><label>Required return</label><input name="required_return_time" type="time" defaultValue={day.required_return_time?.slice(0,5)||""}/></div>
        <div className="field critical-field"><label>Recommended wharf arrival</label><input name="recommended_return_time" type="time" defaultValue={day.recommended_return_time?.slice(0,5)||""}/></div>
        <div className="field"><label>Ship departure</label><input name="ship_departure_time" type="time" defaultValue={day.ship_departure_time?.slice(0,5)||""}/></div>
      </div>
      <label className="inline-check"><input name="tender_port" type="checkbox" defaultChecked={day.tender_port}/> Tender port</label>
      <details className="cruise-warning-settings"><summary>Return-to-ship warning levels</summary>
        <div className="form-grid">
          <div className="field"><label>Amber minutes</label><input name="warning_amber_minutes" type="number" min="1" defaultValue={day.warning_amber_minutes??90}/></div>
          <div className="field"><label>Orange minutes</label><input name="warning_orange_minutes" type="number" min="1" defaultValue={day.warning_orange_minutes??60}/></div>
          <div className="field"><label>Red minutes</label><input name="warning_red_minutes" type="number" min="1" defaultValue={day.warning_red_minutes??30}/></div>
          <div className="field"><label>Critical minutes</label><input name="warning_critical_minutes" type="number" min="1" defaultValue={day.warning_critical_minutes??15}/></div>
        </div>
      </details>
      <div className="field"><label>Transport notes</label><textarea name="transport_notes" defaultValue={day.transport_notes||""}/></div><div className="field"><label>General notes</label><textarea name="notes" defaultValue={day.notes||""}/></div>
      <div className="inline-actions"><button className="primary" disabled={busy}>{busy?"Saving…":"Save Port Day"}</button><button className="danger-button" type="button" onClick={deleteDay}>Delete Port Day</button></div>
    </form>:null}
    {message?<div className={message.includes("updated")?"success":"error"}>{message}</div>:null}
  </section>;
}
