"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserRow={
  id:string;
  display_name:string;
  first_name?:string|null;
  email:string|null;
  role:string;
  account_disabled:boolean;
  last_seen_at:string|null;
};

export function OwnerUserManagement({
  currentUserId,
  initialUsers,
}:{
  currentUserId:string;
  initialUsers:UserRow[];
}){
 const supabase=useMemo(()=>createClient(),[]);
 const [users,setUsers]=useState(initialUsers);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState<string|null>(null);
 const [names,setNames]=useState<Record<string,string>>(Object.fromEntries(initialUsers.map(u=>[u.id,u.display_name])));

 async function toggle(user:UserRow){
   setBusy(user.id);
   const {error}=await supabase.rpc("owner_set_user_disabled",{p_user_id:user.id,p_disabled:!user.account_disabled});
   if(error)setMessage(error.message);
   else{
     setUsers(c=>c.map(x=>x.id===user.id?{...x,account_disabled:!x.account_disabled}:x));
     setMessage(`${user.display_name} ${user.account_disabled?"enabled":"disabled"}.`);
   }
   setBusy(null);
 }

 async function role(user:UserRow,next:string){
   setBusy(user.id);
   const {error}=await supabase.rpc("owner_set_user_role",{p_user_id:user.id,p_role:next});
   if(error)setMessage(error.message);
   else{
     setUsers(c=>c.map(x=>x.id===user.id?{...x,role:next}:x));
     setMessage(`${user.display_name} role changed to ${next}.`);
   }
   setBusy(null);
 }

 async function saveName(user:UserRow){
   const next=(names[user.id]||"").trim();
   if(!next){setMessage("Preferred name cannot be blank.");return}
   setBusy(user.id);
   const {error}=await supabase.rpc("owner_set_user_display_name",{
     p_user_id:user.id,
     p_display_name:next,
     p_first_name:next,
   });
   if(error)setMessage(error.message);
   else{
     setUsers(c=>c.map(x=>x.id===user.id?{...x,display_name:next,first_name:next}:x));
     setMessage(`${next} is now the preferred Travel Crew name. Supabase Auth will sync when that user next opens Travel Crew.`);
   }
   setBusy(null);
 }

 return <section className="panel owner-users-stage8">
   <div className="section-title-row">
     <div>
       <h2>User Management</h2>
       <div className="muted">Owner-only account access, preferred names and role controls.</div>
     </div>
     <span className="badge">{users.length} users</span>
   </div>

   <div className="owner-user-list owner-user-list-names">
     {users.map(u=><article key={u.id}>
       <div className="avatar-circle">{u.display_name.slice(0,1).toUpperCase()}</div>
       <div className="owner-user-copy">
         <strong>{u.display_name}</strong>
         <span>{u.email||"No email stored"}</span>
         <small>{u.last_seen_at?`Last active ${new Date(u.last_seen_at).toLocaleString("en-AU")}`:"No recent activity recorded"}</small>
       </div>
       <div className="owner-name-edit">
         <input
           value={names[u.id]??u.display_name}
           onChange={e=>setNames(c=>({...c,[u.id]:e.target.value}))}
           placeholder="Nickname / first name"
           maxLength={80}
         />
         <button className="secondary compact" disabled={busy===u.id} onClick={()=>saveName(u)}>Save Name</button>
       </div>
       <select value={u.role} disabled={busy===u.id} onChange={e=>role(u,e.target.value)}>
         <option value="owner">Owner</option>
         <option value="admin">Admin</option>
         <option value="member">Member</option>
       </select>
       <button className={u.account_disabled?"secondary":"danger-button"} disabled={busy===u.id||u.id===currentUserId} onClick={()=>toggle(u)}>{u.account_disabled?"Enable":"Disable"}</button>
     </article>)}
   </div>
   {message?<div className={message.includes("changed")||message.includes("enabled")||message.includes("disabled")||message.includes("preferred")?"success":"error"}>{message}</div>:null}
 </section>;
}
