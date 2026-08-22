"use client";
import { useState } from "react";
type Point={id:string;name:string;latitude:number;longitude:number};
export function RoutePlanner({points}:{points:Point[]}){
 const [from,setFrom]=useState(points[0]?.id||""),[to,setTo]=useState(points[1]?.id||""),[result,setResult]=useState<any>(null),[message,setMessage]=useState("");
 async function calculate(){const a=points.find(p=>p.id===from),b=points.find(p=>p.id===to);if(!a||!b){setMessage("Choose two mapped locations.");return}const r=await fetch(`/api/route?fromLat=${a.latitude}&fromLon=${a.longitude}&toLat=${b.latitude}&toLon=${b.longitude}`);const p=await r.json();if(!r.ok){setMessage(p.error||"Route failed.");return}setResult(p);setMessage("")}
 return <section className="panel route-planner"><h2>Route Between Stops</h2><div className="route-form"><select value={from} onChange={e=>setFrom(e.target.value)}>{points.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><span>→</span><select value={to} onChange={e=>setTo(e.target.value)}>{points.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><button className="secondary" onClick={calculate}>Calculate</button></div>{result?<div className="route-result"><strong>{result.distance_km.toFixed(1)} km</strong><span>About {Math.round(result.duration_minutes)} minutes driving</span></div>:null}{message?<div className="error">{message}</div>:null}</section>
}
