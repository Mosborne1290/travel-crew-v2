"use client";
import { ChangeEvent,useMemo,useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CruisePortDayHeroUpload({tripId,cruiseDayId,currentUrl,canManage}:{tripId:string;cruiseDayId:string;currentUrl:string|null;canManage:boolean}){
  const supabase=useMemo(()=>createClient(),[]);
  const [file,setFile]=useState<File|null>(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);

  if(!canManage)return null;

  async function upload(){
    if(!file)return;setBusy(true);setMessage("");
    if(file.size>15*1024*1024){setMessage("Hero image must be 15 MB or smaller.");setBusy(false);return}
    const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=`${tripId}/cruise-days/${cruiseDayId}/${crypto.randomUUID()}-${safe}`;
    const up=await supabase.storage.from("trip-covers").upload(path,file,{contentType:file.type,upsert:false});
    if(up.error){setMessage(up.error.message);setBusy(false);return}
    const {data}=supabase.storage.from("trip-covers").getPublicUrl(path);
    const {error}=await supabase.from("cruise_port_days").update({hero_image_url:data.publicUrl,updated_at:new Date().toISOString()}).eq("id",cruiseDayId);
    if(error)setMessage(error.message);else{setMessage("Cruise Port Day hero image updated.");window.location.reload()}
    setBusy(false);
  }

  return <section className="panel cruise-hero-uploader">
    <div><strong>Port Day Hero Image</strong><span>Upload your own destination/wharf photo. Existing trip imagery can remain if you do nothing.</span></div>
    <div className="inline-actions"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e:ChangeEvent<HTMLInputElement>)=>setFile(e.target.files?.[0]??null)}/><button className="secondary" onClick={upload} disabled={!file||busy}>{busy?"Uploading…":"Use as Hero Image"}</button></div>
    {message?<small>{message}</small>:null}
  </section>;
}
