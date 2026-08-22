"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Point = {
  id:string;
  kind:"destination"|"place"|"activity";
  category:string|null;
  name:string;
  latitude:number;
  longitude:number;
  detail:string|null;
  date:string|null;
};

type Filter = "all"|"today"|"hotels"|"food"|"attractions"|"saved";

export function TripMap({points}:{points:Point[]}) {
  const mapNode=useRef<HTMLDivElement|null>(null);
  const [filter,setFilter]=useState<Filter>("all");
  const [message,setMessage]=useState("");

  const filtered=useMemo(()=>{
    const today=new Date().toISOString().slice(0,10);
    return points.filter(p=>{
      if(filter==="all")return true;
      if(filter==="today")return p.date===today||p.kind==="destination";
      if(filter==="saved")return p.kind==="place"||p.kind==="destination";
      if(filter==="hotels")return p.category==="hotel"||p.category==="accommodation"||p.kind==="destination";
      if(filter==="food")return ["restaurant","cafe","food"].includes(p.category||"")||p.kind==="destination";
      if(filter==="attractions")return ["attraction","tour","museum","park","beach"].includes(p.category||"")||p.kind==="destination";
      return true;
    });
  },[points,filter]);

  useEffect(()=>{
    let map:any;let cancelled=false;
    async function init(){
      if(!mapNode.current||!filtered.length)return;
      try{
        const mod=await import("maplibre-gl");if(cancelled||!mapNode.current)return;
        const maplibregl=mod.default;const primary=filtered[0];
        map=new maplibregl.Map({
          container:mapNode.current,center:[primary.longitude,primary.latitude],zoom:filtered.length>1?10:11,
          style:{version:8,sources:{osm:{type:"raster",tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],tileSize:256,attribution:"© OpenStreetMap contributors"}},layers:[{id:"osm",type:"raster",source:"osm"}]},
        });
        map.addControl(new maplibregl.NavigationControl(),"top-right");
        const bounds=new maplibregl.LngLatBounds();
        filtered.forEach(point=>{
          const el=document.createElement("div");
          el.className=`travel-map-marker ${point.kind}`;
          el.textContent=point.kind==="destination"?"★":point.kind==="activity"?"•":"♥";
          const popup=new maplibregl.Popup({offset:18}).setHTML(`<strong>${escapeHtml(point.name)}</strong>${point.detail?`<div>${escapeHtml(point.detail)}</div>`:""}`);
          new maplibregl.Marker({element:el}).setLngLat([point.longitude,point.latitude]).setPopup(popup).addTo(map);
          bounds.extend([point.longitude,point.latitude]);
        });
        if(filtered.length>1)map.fitBounds(bounds,{padding:70,maxZoom:13});
      }catch{setMessage("The interactive map could not load.");}
    }
    init();return()=>{cancelled=true;map?.remove();};
  },[filtered]);

  if(!points.length)return <div className="empty-state"><h3>No mapped locations yet</h3><p className="muted">Confirm your destination under Weather, then save places or activities with an address.</p></div>;

  return <section className="panel">
    <div className="section-title-row"><div><h2>Trip Map</h2><div className="muted">Filter your route, places and itinerary pins.</div></div><span className="badge">{filtered.length} pin(s)</span></div>
    <div className="map-filter-row">
      {([["all","All"],["today","Today"],["hotels","Hotels"],["food","Food"],["attractions","Attractions"],["saved","Saved"]] as [Filter,string][]).map(([id,label])=>
        <button type="button" key={id} className={filter===id?"active":""} onClick={()=>setFilter(id)}>{label}</button>
      )}
    </div>
    {filtered.length?<div ref={mapNode} className="travel-map"/>:<div className="empty-mini">No pins match this filter.</div>}
    <div className="map-legend"><span><i className="legend-dot destination"/>Destination</span><span><i className="legend-dot place"/>Saved place</span><span><i className="legend-dot activity"/>Activity</span></div>
    {message?<div className="error">{message}</div>:null}
  </section>
}

function escapeHtml(value:string){return value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
