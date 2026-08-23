"use client";

import { ChangeEvent,useMemo,useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CruisePortDayHeroUpload({
  tripId,cruiseDayId,currentUrl,canManage,
}:{
  tripId:string;cruiseDayId:string;currentUrl:string|null;canManage:boolean;
}){
  const supabase=useMemo(()=>createClient(),[]);
  const [file,setFile]=useState<File|null>(null);
  const [open,setOpen]=useState(false);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  if(!canManage)return null;

  async function upload(){
    if(!file)return;
    setBusy(true);setMessage("");

    if(file.size>15*1024*1024){
      setMessage("Hero image must be 15 MB or smaller.");
      setBusy(false);return;
    }

    const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=`${tripId}/cruise-days/${cruiseDayId}/${crypto.randomUUID()}-${safe}`;
    const up=await supabase.storage.from("trip-covers").upload(path,file,{contentType:file.type,upsert:false});

    if(up.error){
      setMessage(up.error.message);setBusy(false);return;
    }

    const {data}=supabase.storage.from("trip-covers").getPublicUrl(path);
    const {error}=await supabase.from("cruise_port_days")
      .update({hero_image_url:data.publicUrl,updated_at:new Date().toISOString()})
      .eq("id",cruiseDayId);

    if(error)setMessage(error.message);
    else{
      setMessage("Cover photo updated.");
      setTimeout(()=>window.location.reload(),500);
    }
    setBusy(false);
  }

  async function remove(){
    if(!confirm("Remove the custom Port Day cover? Travel Crew will fall back to the trip cover image."))return;
    const {error}=await supabase.from("cruise_port_days")
      .update({hero_image_url:null,updated_at:new Date().toISOString()})
      .eq("id",cruiseDayId);

    if(error)setMessage(error.message);
    else window.location.reload();
  }

  return <section className="panel cruise-cover-editor">
    <div className="section-title-row">
      <div><div className="eyebrow">Visuals</div><h2>🖼 Port Day Cover Photo</h2><p className="muted">Use your own destination photo, or keep the existing trip image.</p></div>
      <button className="secondary" onClick={()=>setOpen(!open)}>{open?"Close":"Edit Cover Photo"}</button>
    </div>

    {open?<div className="cover-editor-body">
      {currentUrl?<div className="cover-preview" style={{backgroundImage:`url("${currentUrl}")`}}><span>Current cover</span></div>:null}
      <div className="cover-upload-actions">
        <label className="file-picker-button">
          Choose Image
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e:ChangeEvent<HTMLInputElement>)=>setFile(e.target.files?.[0]??null)}/>
        </label>
        <span>{file?.name||"JPG, PNG or WebP · max 15 MB"}</span>
        <button className="primary" onClick={upload} disabled={!file||busy}>{busy?"Uploading…":"Use as Cover Photo"}</button>
        {currentUrl?<button className="ghost" onClick={remove} type="button">Remove Custom Cover</button>:null}
      </div>
    </div>:null}

    {message?<div className={message.includes("updated")?"success":"error"}>{message}</div>:null}
  </section>;
}
