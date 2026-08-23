"use client";

import { FormEvent,useMemo,useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CruisePortDaySettings({day,canManage}:{day:any;canManage:boolean}){
  const supabase=useMemo(()=>createClient(),[]);
  const [open,setOpen]=useState(false);
  const [dangerOpen,setDangerOpen]=useState(false);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  if(!canManage)return null;

  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setMessage("");
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
      transport_notes:String(f.get("transport_notes")||"")||null,
      notes:String(f.get("notes")||"")||null,
      warning_amber_minutes:Number(f.get("warning_amber_minutes")||90),
      warning_orange_minutes:Number(f.get("warning_orange_minutes")||60),
      warning_red_minutes:Number(f.get("warning_red_minutes")||30),
      warning_critical_minutes:Number(f.get("warning_critical_minutes")||15),
      updated_at:new Date().toISOString(),
    };

    const {error}=await supabase.from("cruise_port_days").update(patch).eq("id",day.id);
    if(error)setMessage(error.message);
    else{
      setMessage("Cruise Port Day updated.");
      setTimeout(()=>window.location.reload(),500);
    }
    setBusy(false);
  }

  async function deleteDay(){
    if(!confirm(`Delete the ${day.port_name} Cruise Port Day and its cruise-day activities/shopping? This cannot be undone.`))return;
    const {error}=await supabase.from("cruise_port_days").delete().eq("id",day.id);
    if(error)setMessage(error.message);
    else window.location.href=`/trips/${day.trip_id}/cruise-days`;
  }

  return <section className="panel cruise-day-settings cruise-settings-10d">
    <div className="section-title-row">
      <div><div className="eyebrow">Owner / Admin</div><h2>⚙ Port Day Settings</h2><p className="muted">Critical ship, wharf and return information lives here so the travel screen stays clean.</p></div>
      <button className="secondary" onClick={()=>setOpen(!open)}>{open?"Close Settings":"Edit Port Day"}</button>
    </div>

    {open?<form className="form-stack cruise-settings-form" onSubmit={save}>
      <section className="settings-group">
        <div className="settings-group-title"><span>📍</span><div><h3>Port</h3><p>Destination identity and timezone.</p></div></div>
        <div className="form-grid"><div className="field"><label>Port *</label><input name="port_name" defaultValue={day.port_name} required/></div><div className="field"><label>Date *</label><input name="port_date" type="date" defaultValue={day.port_date} required/></div></div>
        <div className="form-grid"><div className="field"><label>Region</label><input name="region" defaultValue={day.region||""}/></div><div className="field"><label>Country</label><input name="country" defaultValue={day.country||""}/></div></div>
        <div className="field"><label>Destination timezone *</label><input name="timezone" defaultValue={day.timezone} required/><small>Keep this as the port timezone. Eden uses Australia/Sydney.</small></div>
      </section>

      <section className="settings-group">
        <div className="settings-group-title"><span>🚢</span><div><h3>Ship</h3><p>Ship and cruise line shown on the Port Day hero.</p></div></div>
        <div className="form-grid"><div className="field"><label>Ship</label><input name="cruise_ship" defaultValue={day.cruise_ship||""}/></div><div className="field"><label>Cruise line</label><input name="cruise_line" defaultValue={day.cruise_line||""}/></div></div>
        <label className="inline-check"><input name="tender_port" type="checkbox" defaultChecked={day.tender_port}/> Tender port</label>
      </section>

      <section className="settings-group">
        <div className="settings-group-title"><span>⚓</span><div><h3>Wharf</h3><p>Arrival point used by the map and Return to Ship directions.</p></div></div>
        <div className="form-grid"><div className="field"><label>Wharf name</label><input name="wharf_name" defaultValue={day.wharf_name||""}/></div><div className="field"><label>Wharf address</label><input name="wharf_address" defaultValue={day.wharf_address||""}/></div></div>
        <details className="cruise-more-fields"><summary>Advanced coordinates</summary>
          <div className="form-grid"><div className="field"><label>Latitude</label><input name="wharf_lat" type="number" step="any" defaultValue={day.wharf_lat??""}/></div><div className="field"><label>Longitude</label><input name="wharf_lng" type="number" step="any" defaultValue={day.wharf_lng??""}/></div></div>
        </details>
      </section>

      <section className="settings-group settings-times-group">
        <div className="settings-group-title"><span>⏰</span><div><h3>Ship Times</h3><p>These are destination-local times and must not be converted through the device timezone.</p></div></div>
        <div className="settings-time-grid">
          <div className="field"><label>Ship arrival</label><input name="ship_arrival_time" type="time" defaultValue={day.ship_arrival_time?.slice(0,5)||""}/></div>
          <div className="field"><label>Disembark</label><input name="disembark_time" type="time" defaultValue={day.disembark_time?.slice(0,5)||""}/></div>
          <div className="field return-field"><label>Recommended wharf arrival</label><input name="recommended_return_time" type="time" defaultValue={day.recommended_return_time?.slice(0,5)||""}/></div>
          <div className="field critical-field"><label>Required return</label><input name="required_return_time" type="time" defaultValue={day.required_return_time?.slice(0,5)||""}/></div>
          <div className="field"><label>Ship departure</label><input name="ship_departure_time" type="time" defaultValue={day.ship_departure_time?.slice(0,5)||""}/></div>
        </div>
      </section>

      <section className="settings-group">
        <div className="settings-group-title"><span>⚠</span><div><h3>Return Warning Levels</h3><p>Professional colour stages for the live return countdown.</p></div></div>
        <div className="warning-settings-grid">
          <div className="warning-setting amber"><label>Amber</label><input name="warning_amber_minutes" type="number" min="1" defaultValue={day.warning_amber_minutes??90}/><small>minutes</small></div>
          <div className="warning-setting orange"><label>Orange</label><input name="warning_orange_minutes" type="number" min="1" defaultValue={day.warning_orange_minutes??60}/><small>minutes</small></div>
          <div className="warning-setting red"><label>Red</label><input name="warning_red_minutes" type="number" min="1" defaultValue={day.warning_red_minutes??30}/><small>minutes</small></div>
          <div className="warning-setting critical"><label>Critical</label><input name="warning_critical_minutes" type="number" min="1" defaultValue={day.warning_critical_minutes??15}/><small>minutes</small></div>
        </div>
      </section>

      <section className="settings-group">
        <div className="settings-group-title"><span>📝</span><div><h3>Notes</h3><p>Useful information travellers can read without opening settings.</p></div></div>
        <div className="field"><label>Transport notes</label><textarea name="transport_notes" defaultValue={day.transport_notes||""}/></div>
        <div className="field"><label>General notes</label><textarea name="notes" defaultValue={day.notes||""}/></div>
      </section>

      <div className="settings-save-bar"><button className="primary" disabled={busy}>{busy?"Saving…":"Save Port Day Settings"}</button></div>

      <section className="danger-zone">
        <button type="button" className="danger-zone-toggle" onClick={()=>setDangerOpen(!dangerOpen)}>⚠ Danger Zone</button>
        {dangerOpen?<div className="danger-zone-body"><div><strong>Delete Cruise Port Day</strong><p>This removes the Cruise Port Day and its attached cruise-day activities and shopping list.</p></div><button className="danger-button" type="button" onClick={deleteDay}>Delete Port Day</button></div>:null}
      </section>
    </form>:null}

    {message?<div className={message.includes("updated")?"success":"error"}>{message}</div>:null}
  </section>;
}
