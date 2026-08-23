"use client";

import { useMemo,useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Place={
  id:string;
  name:string;
  category:string;
  latitude:number;
  longitude:number;
  distance_km:number;
  address:string|null;
};

type LocationPoint={
  lat:number;
  lon:number;
  label?:string;
};

function geolocationMessage(error:GeolocationPositionError){
  if(error.code===error.PERMISSION_DENIED){
    return "Location access is blocked for Travel Crew. Allow Location in your browser/site settings, then tap Try My Location Again — or use the manual location box below.";
  }
  if(error.code===error.POSITION_UNAVAILABLE){
    return "Your device could not determine its location. Check that Location Services are switched on, or enter a city/suburb manually below.";
  }
  if(error.code===error.TIMEOUT){
    return "Location lookup timed out. Try again in an area with a better GPS/network signal, or enter a city/suburb manually below.";
  }
  return "Travel Crew could not read your device location. You can enter a city/suburb manually below.";
}

export function NearMe({tripId,userId}:{tripId?:string;userId?:string}){
 const supabase=useMemo(()=>createClient(),[]);
 const [location,setLocation]=useState<LocationPoint|null>(null);
 const [category,setCategory]=useState("restaurants");
 const [places,setPlaces]=useState<Place[]>([]);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [manualLocation,setManualLocation]=useState("");

 const cats=[
  ["restaurants","Restaurants"],["cafes","Cafés"],["bars","Bars & Pubs"],
  ["attractions","Attractions"],["landmarks","Landmarks"],["shopping","Shopping"],
  ["pharmacies","Pharmacies"],["medical","Medical"],["hospitals","Hospitals"],
  ["supermarkets","Supermarkets"],["convenience","Convenience"],["transport","Transport"],
  ["parking","Parking"],["toilets","Toilets"],["fuel","Fuel"],["laundromats","Laundry"]
 ];

 async function searchAt(loc:LocationPoint,next=category){
   setLocation(loc);setCategory(next);setBusy(true);setMessage("");
   try{
     const r=await fetch(`/api/near-me?lat=${loc.lat}&lon=${loc.lon}&category=${next}&radius=3000`);
     const p=await r.json();
     if(!r.ok)throw new Error(p.error||"Nearby search failed.");
     setPlaces(p.places??[]);
     if(!(p.places??[]).length){
       setMessage(`No ${cats.find(c=>c[0]===next)?.[1]?.toLowerCase()||"results"} were found within about 3 km of ${loc.label||"this location"}.`);
     }else if(loc.label){
       setMessage(`Showing ${p.places.length} nearby result(s) around ${loc.label}.`);
     }
   }catch(e){
     setMessage(e instanceof Error?e.message:"Nearby search failed.");
   }finally{
     setBusy(false);
   }
 }

 async function useMyLocation(next=category){
   setCategory(next);
   setBusy(true);
   setMessage("");

   if(!window.isSecureContext){
     setMessage("Device location requires the secure HTTPS version of Travel Crew. You can still use the manual location box below.");
     setBusy(false);
     return;
   }

   if(!("geolocation" in navigator)){
     setMessage("This browser does not provide device location. Enter a city/suburb manually below.");
     setBusy(false);
     return;
   }

   try{
     if("permissions" in navigator && navigator.permissions?.query){
       try{
         const permission=await navigator.permissions.query({name:"geolocation"});
         if(permission.state==="denied"){
           setMessage("Location is currently blocked for this site. Click the padlock/site icon beside the browser address → Site settings/Permissions → Location → Allow, then return here and tap Try My Location Again. Or use the manual location box below.");
           setBusy(false);
           return;
         }
       }catch{}
     }

     navigator.geolocation.getCurrentPosition(
       p=>{
         searchAt({
           lat:p.coords.latitude,
           lon:p.coords.longitude,
           label:"your current location"
         },next);
       },
       err=>{
         setMessage(geolocationMessage(err));
         setBusy(false);
       },
       {
         enableHighAccuracy:false,
         timeout:15000,
         maximumAge:300000
       }
     );
   }catch(e){
     setMessage(e instanceof Error?e.message:"Travel Crew could not request your device location.");
     setBusy(false);
   }
 }

 async function useManualLocation(){
   const q=manualLocation.trim();
   if(q.length<2){
     setMessage("Enter a city, suburb, postcode or destination first.");
     return;
   }
   setBusy(true);setMessage("");
   try{
     const r=await fetch(`/api/near-me/geocode?q=${encodeURIComponent(q)}`);
     const p=await r.json();
     if(!r.ok)throw new Error(p.error||"Location could not be found.");
     await searchAt({lat:p.latitude,lon:p.longitude,label:p.label||q},category);
   }catch(e){
     setMessage(e instanceof Error?e.message:"Location could not be found.");
     setBusy(false);
   }
 }

 async function changeCategory(next:string){
   setCategory(next);
   if(location){
     await searchAt(location,next);
   }else{
     await useMyLocation(next);
   }
 }

 async function save(place:Place){
   if(!tripId||!userId)return;
   const {error}=await supabase.from("saved_places").insert({
     trip_id:tripId,created_by:userId,name:place.name,category:place.category,
     address:place.address,latitude:place.latitude,longitude:place.longitude,
     notes:"Saved from Near Me"
   });
   setMessage(error?error.message:`${place.name} saved to this trip.`);
 }

 async function addToday(place:Place){
   if(!tripId||!userId)return;
   const today=new Date().toISOString().slice(0,10);
   let {data:day}=await supabase.from("itinerary_days").select("id").eq("trip_id",tripId).eq("date",today).maybeSingle();
   if(!day){
     const {data:created,error}=await supabase.from("itinerary_days").insert({
       trip_id:tripId,date:today,title:"Today"
     }).select("id").single();
     if(error){setMessage(error.message);return}
     day=created;
   }
   const {error}=await supabase.from("activities").insert({
     trip_id:tripId,itinerary_day_id:day.id,created_by:userId,title:place.name,
     activity_type:place.category,venue_name:place.name,address:place.address,
     latitude:place.latitude,longitude:place.longitude,status:"planned"
   });
   setMessage(error?error.message:`${place.name} added to Today.`);
 }

 const isSuccess=message.includes("saved")||message.includes("added")||message.startsWith("Showing");

 return <div className="near-me-stage7">
   <section className="panel">
     <div className="section-title-row">
       <div>
         <h2>Near Me</h2>
         <div className="muted">Use your device location, or enter a city/suburb manually.</div>
       </div>
       <button className="primary" onClick={()=>useMyLocation()} disabled={busy}>
         {busy?"Searching…":location?.label==="your current location"?"Try My Location Again":"Use My Location"}
       </button>
     </div>

     <div className="near-me-manual">
       <div>
         <strong>Can’t use device location?</strong>
         <span>Enter a city, suburb, postcode or destination instead.</span>
       </div>
       <div className="near-me-manual-form">
         <input
           value={manualLocation}
           onChange={e=>setManualLocation(e.target.value)}
           onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();useManualLocation();}}}
           placeholder="e.g. Vancouver, BC or Circular Quay"
         />
         <button className="secondary" type="button" onClick={useManualLocation} disabled={busy}>
           Search Location
         </button>
       </div>
     </div>

     {location?<div className="near-me-location-badge">📍 Searching around <strong>{location.label||`${location.lat.toFixed(3)}, ${location.lon.toFixed(3)}`}</strong></div>:null}

     <div className="explore-cats">
       {cats.map(([id,label])=><button key={id} className={category===id?"active":""} onClick={()=>changeCategory(id)} disabled={busy}>{label}</button>)}
     </div>

     {message?<div className={isSuccess?"success":"error"}>{message}</div>:null}
   </section>

   <section className="near-me-grid">
     {places.map(p=><article className="explore-card" key={p.id}>
       <div className="explore-pin">📍</div>
       <h3>{p.name}</h3>
       <div className="badge">{p.distance_km.toFixed(1)} km away</div>
       {p.address?<p className="muted">{p.address}</p>:null}
       <div className="inline-actions">
         <a className="text-link" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=18/${p.latitude}/${p.longitude}`}>Map ↗</a>
         {tripId?<button onClick={()=>save(p)}>Save Place</button>:null}
         {tripId?<button onClick={()=>addToday(p)}>Add Today</button>:null}
       </div>
     </article>)}
   </section>
 </div>;
}
