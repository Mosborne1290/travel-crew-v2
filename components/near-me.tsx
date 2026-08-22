"use client";
import { useState } from "react";
type Place={id:string;name:string;category:string;latitude:number;longitude:number;distance_km:number;address:string|null};

export function NearMe(){
 const [location,setLocation]=useState<{lat:number;lon:number}|null>(null),[category,setCategory]=useState("restaurants"),[places,setPlaces]=useState<Place[]>([]),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const cats=[["restaurants","Restaurants"],["cafes","Cafés"],["pharmacies","Pharmacies"],["supermarkets","Supermarkets"],["hospitals","Hospitals"],["toilets","Toilets"],["fuel","Fuel"],["attractions","Attractions"]];
 async function find(next=category){setCategory(next);setBusy(true);setMessage("");
  let loc=location;
  if(!loc){loc=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lon:p.coords.longitude}),()=>reject(new Error("Location permission is required.")),{enableHighAccuracy:true,timeout:10000})).catch(e=>{setMessage(e.message);return null}) as any}
  if(!loc){setBusy(false);return}setLocation(loc);
  try{const r=await fetch(`/api/near-me?lat=${loc.lat}&lon=${loc.lon}&category=${next}&radius=2000`);const p=await r.json();if(!r.ok)throw new Error(p.error||"Nearby search failed.");setPlaces(p.places??[]);if(!(p.places??[]).length)setMessage("No nearby results found.");}catch(e){setMessage(e instanceof Error?e.message:"Nearby search failed.")}finally{setBusy(false)}
 }
 return <div className="near-me-stage7"><section className="panel"><div className="section-title-row"><div><h2>Near Me</h2><div className="muted">Uses your device location only when you choose to search.</div></div><button className="primary" onClick={()=>find()} disabled={busy}>{busy?"Searching…":"Use My Location"}</button></div><div className="explore-cats">{cats.map(([id,label])=><button key={id} className={category===id?"active":""} onClick={()=>find(id)}>{label}</button>)}</div>{message?<div className="error">{message}</div>:null}</section><section className="near-me-grid">{places.map(p=><article className="explore-card" key={p.id}><div className="explore-pin">📍</div><h3>{p.name}</h3><div className="badge">{p.distance_km.toFixed(1)} km away</div>{p.address?<p className="muted">{p.address}</p>:null}<a className="text-link" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=18/${p.latitude}/${p.longitude}`}>Open map ↗</a></article>)}</section></div>
}
