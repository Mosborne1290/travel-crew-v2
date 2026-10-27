"use client";

import { useMemo,useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./trip-workspace.module.css";

type Place={
  id:string;
  name:string;
  category:string;
  latitude:number;
  longitude:number;
  distance_km:number;
  address:string|null;
  source?:string|null;
};

type LocationPoint={lat:number;lon:number;label?:string};

function geolocationMessage(error:GeolocationPositionError){
  if(error.code===error.PERMISSION_DENIED)return "Location access is blocked. Allow Location for Travel Crew in your browser settings, or search a city below.";
  if(error.code===error.POSITION_UNAVAILABLE)return "Your device could not determine its location. Search a city or suburb below instead.";
  if(error.code===error.TIMEOUT)return "Location lookup timed out. Try again or search a city below.";
  return "Travel Crew could not read your location. Search a city or suburb below instead.";
}

export function NearMe({tripId,userId}:{tripId?:string;userId?:string}){
  const supabase=useMemo(()=>createClient(),[]);
  const [location,setLocation]=useState<LocationPoint|null>(null);
  const [category,setCategory]=useState("restaurants");
  const [places,setPlaces]=useState<Place[]>([]);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [manualLocation,setManualLocation]=useState("");
  const [source,setSource]=useState("");

  const mainCats=[
    ["restaurants","Food","🍽️"],
    ["cafes","Coffee","☕"],
    ["attractions","Things to Do","🧭"],
    ["shopping","Shopping","🛍️"],
    ["pharmacies","Pharmacy","💊"],
    ["supermarkets","Supermarket","🛒"],
    ["transport","Transport","🚉"],
  ];

  const extraCats=[
    ["bars","Bars & Pubs","🍷"],
    ["landmarks","Landmarks","📸"],
    ["medical","Medical","🩺"],
    ["hospitals","Hospitals","🏥"],
    ["convenience","Convenience","🏪"],
    ["parking","Parking","🅿️"],
    ["toilets","Toilets","🚻"],
    ["fuel","Fuel","⛽"],
    ["laundromats","Laundry","🧺"],
  ];

  const allCats=[...mainCats,...extraCats];

  async function searchAt(loc:LocationPoint,next=category){
    setLocation(loc);setCategory(next);setBusy(true);setMessage("");
    try{
      const r=await fetch(`/api/near-me?lat=${loc.lat}&lon=${loc.lon}&category=${next}&radius=3000`);
      const p=await r.json();
      if(!r.ok)throw new Error(p.error||"Nearby search failed.");
      setPlaces(p.places??[]);
      setSource(p.source||"");
      if(!(p.places??[]).length){
        setMessage(`No ${allCats.find(c=>c[0]===next)?.[1]?.toLowerCase()||"results"} were found nearby. Try another category or a different location.`);
      }else{
        setMessage(`Showing ${p.places.length} nearby place${p.places.length===1?"":"s"} around ${loc.label||"this location"}.`);
      }
    }catch(e){
      setPlaces([]);
      setMessage(e instanceof Error?e.message:"Nearby search failed.");
    }finally{setBusy(false)}
  }

  async function useMyLocation(next=category){
    setCategory(next);setBusy(true);setMessage("");
    if(!window.isSecureContext){
      setMessage("Device location requires HTTPS. Search a city or suburb below instead.");
      setBusy(false);return;
    }
    if(!("geolocation" in navigator)){
      setMessage("This browser does not provide device location. Search a city or suburb below.");
      setBusy(false);return;
    }

    navigator.geolocation.getCurrentPosition(
      p=>searchAt({lat:p.coords.latitude,lon:p.coords.longitude,label:"your current location"},next),
      err=>{setMessage(geolocationMessage(err));setBusy(false)},
      {enableHighAccuracy:false,timeout:12000,maximumAge:300000}
    );
  }

  async function useManualLocation(){
    const q=manualLocation.trim();
    if(q.length<2){setMessage("Enter a city, suburb, postcode or destination first.");return}
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
    if(location)await searchAt(location,next);
    else await useMyLocation(next);
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
      const {data:created,error}=await supabase.from("itinerary_days").insert({trip_id:tripId,date:today,title:"Today"}).select("id").single();
      if(error){setMessage(error.message);return}
      day=created;
    }
    const {error}=await supabase.from("activities").insert({
      trip_id:tripId,itinerary_day_id:day.id,created_by:userId,title:place.name,
      activity_type:"attraction",venue_name:place.name,address:place.address,
      latitude:place.latitude,longitude:place.longitude,status:"planned"
    });
    setMessage(error?error.message:`${place.name} added to Today.`);
  }

  const isSuccess=message.includes("saved")||message.includes("added")||message.startsWith("Showing");

  function categoryButtons(items:string[][]){
    return items.map(([id,label,icon])=><button
      key={id}
      type="button"
      className={category===id?styles.categoryActive:""}
      onClick={()=>changeCategory(id)}
      disabled={busy}
    >{icon} {label}</button>);
  }

  return <div className={styles.nearPage}>
    <section className={styles.nearHero}>
      <div className={styles.nearHeroTop}>
        <div>
          <h2>Nearby</h2>
          <p>Find useful places around you or around any city on your trip.</p>
        </div>
        <button className={styles.locationButton} onClick={()=>useMyLocation()} disabled={busy}>
          {busy?"Finding places…":"📍 Use My Location"}
        </button>
      </div>

      <div className={styles.locationSearch}>
        <input
          value={manualLocation}
          onChange={e=>setManualLocation(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();useManualLocation();}}}
          placeholder="Search a city, suburb or destination"
        />
        <button type="button" onClick={useManualLocation} disabled={busy}>Search Location</button>
      </div>

      {location?<div className={styles.locationChip}>📍 {location.label||`${location.lat.toFixed(3)}, ${location.lon.toFixed(3)}`}</div>:null}

      <div className={styles.categoryWrap}>
        <div className={styles.categoryRow}>{categoryButtons(mainCats)}</div>
        <details className={styles.moreCategories}>
          <summary>More categories</summary>
          <div className={styles.categoryRow}>{categoryButtons(extraCats)}</div>
        </details>
      </div>

      {message?<div className={`${styles.nearNotice} ${isSuccess?styles.nearNoticeSuccess:styles.nearNoticeError}`}>{message}</div>:null}
    </section>

    <div className={styles.resultHeader}>
      <h3>{places.length?`${places.length} nearby places`:"Nearby results"}</h3>
      {source?<span>Search source: {source}</span>:null}
    </div>

    {places.length?<section className={styles.nearGrid}>
      {places.map(p=><article className={styles.placeCard} key={p.id}>
        <div className={styles.placeMeta}><span>📍 {p.distance_km.toFixed(1)} km</span><span>{allCats.find(c=>c[0]===p.category)?.[1]||p.category}</span></div>
        <h3>{p.name}</h3>
        <p className={styles.placeAddress}>{p.address||"Address not listed"}</p>
        <div className={styles.placeActions}>
          <a target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=18/${p.latitude}/${p.longitude}`}>Map ↗</a>
          {tripId?<button onClick={()=>save(p)}>Save</button>:null}
          {tripId?<button onClick={()=>addToday(p)}>Add Today</button>:null}
        </div>
      </article>)}
    </section>:<div className={styles.emptyResults}>Choose a category and location to find nearby places.</div>}

    <div className={styles.sourceNote}>Map data © OpenStreetMap contributors</div>
  </div>;
}
