"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function TripHeroImage({
  tripId,
  currentUrl,
  currentSource,
}:{
  tripId:string;
  currentUrl:string|null;
  currentSource?:string|null;
}){
  const supabase=useMemo(()=>createClient(),[]);
  const router=useRouter();
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState<string|null>(null);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  function choose(e:ChangeEvent<HTMLInputElement>){
    const next=e.target.files?.[0]??null;
    setFile(next);
    if(preview)URL.revokeObjectURL(preview);
    setPreview(next?URL.createObjectURL(next):null);
    setMessage("");
  }

  async function upload(){
    if(!file){setMessage("Choose an image first.");return}
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){
      setMessage("Use a JPG, PNG or WebP image.");return;
    }
    if(file.size>15*1024*1024){setMessage("Hero images must be 15 MB or smaller.");return}

    setBusy(true);setMessage("");
    const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
    const path=`${tripId}/hero-${Date.now()}.${ext}`;

    const uploaded=await supabase.storage.from("trip-covers").upload(path,file,{contentType:file.type,upsert:false});
    if(uploaded.error){setMessage(uploaded.error.message);setBusy(false);return}

    const {data:publicData}=supabase.storage.from("trip-covers").getPublicUrl(path);
    const url=publicData.publicUrl;

    const {error}=await supabase.from("trips").update({cover_image_url:url,cover_image_source:"upload"}).eq("id",tripId);
    if(error){
      await supabase.storage.from("trip-covers").remove([path]);
      setMessage(error.message);setBusy(false);return;
    }

    // Best-effort cleanup of the prior uploaded cover.
    if(currentSource==="upload"&&currentUrl?.includes("/storage/v1/object/public/trip-covers/")){
      const marker="/storage/v1/object/public/trip-covers/";
      const oldPath=decodeURIComponent(currentUrl.split(marker)[1]||"");
      if(oldPath&&oldPath!==path)await supabase.storage.from("trip-covers").remove([oldPath]);
    }

    setMessage("Trip hero image updated.");
    setFile(null);setPreview(null);setBusy(false);
    router.refresh();
  }

  async function remove(){
    if(!confirm("Remove the current trip hero image?"))return;
    setBusy(true);setMessage("");
    const {error}=await supabase.from("trips").update({cover_image_url:null,cover_image_source:null}).eq("id",tripId);
    if(error){setMessage(error.message);setBusy(false);return}
    if(currentSource==="upload"&&currentUrl?.includes("/storage/v1/object/public/trip-covers/")){
      const marker="/storage/v1/object/public/trip-covers/";
      const oldPath=decodeURIComponent(currentUrl.split(marker)[1]||"");
      if(oldPath)await supabase.storage.from("trip-covers").remove([oldPath]);
    }
    setMessage("Hero image removed.");setBusy(false);router.refresh();
  }

  return <section className="panel trip-hero-upload">
    <div className="section-title-row">
      <div><h2>Trip Hero Image</h2><div className="muted">Upload your own photo to use as the main trip cover.</div></div>
      {currentSource?<span className="badge">{currentSource==="upload"?"Your photo":"Automatic photo"}</span>:null}
    </div>
    <div className="trip-hero-editor">
      <div className="trip-hero-preview" style={(preview||currentUrl)?{backgroundImage:`url("${preview||currentUrl}")`}:undefined}>
        {!preview&&!currentUrl?<span>🖼️ No hero image</span>:null}
      </div>
      <div className="form-stack">
        <div className="field"><label>Choose photo</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={choose}/><small>JPG, PNG or WebP · maximum 15 MB.</small></div>
        <div className="inline-actions"><button className="primary" type="button" disabled={!file||busy} onClick={upload}>{busy?"Saving…":"Use as Hero Image"}</button>{currentUrl?<button className="secondary" type="button" disabled={busy} onClick={remove}>Remove Hero</button>:null}</div>
        {message?<div className={message.includes("updated")||message.includes("removed")?"success":"error"}>{message}</div>:null}
      </div>
    </div>
  </section>;
}
