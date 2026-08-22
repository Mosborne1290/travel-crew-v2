"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Message={id:string;room_id:string;user_id:string;message_text:string|null;message_type:string;created_at:string;edited_at:string|null;deleted_at:string|null;reply_to_message_id:string|null;pinned_at:string|null};
type Member={user_id:string;display_name:string};
type Reaction={id:string;message_id:string;user_id:string;emoji:string};

function niceTime(value:string){return new Intl.DateTimeFormat("en-AU",{hour:"numeric",minute:"2-digit"}).format(new Date(value))}

export function TripChat({tripId,userId,roomId,initialMessages,members,initialReactions=[]}:{tripId:string;userId:string;roomId:string;initialMessages:Message[];members:Member[];initialReactions?:Reaction[]}){
 const supabase=useMemo(()=>createClient(),[]);const [messages,setMessages]=useState(initialMessages),[reactions,setReactions]=useState(initialReactions),[text,setText]=useState(""),[message,setMessage]=useState(""),[sending,setSending]=useState(false),[replyTo,setReplyTo]=useState<Message|null>(null),[typing,setTyping]=useState<string[]>([]);
 const endRef=useRef<HTMLDivElement|null>(null);const typingTimer=useRef<number|null>(null);
 const names=useMemo(()=>new Map(members.map(m=>[m.user_id,m.display_name])),[members]);

 useEffect(()=>{
  const channel=supabase.channel(`trip-room-${roomId}`,{config:{presence:{key:userId}}})
   .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`room_id=eq.${roomId}`},payload=>{const next=payload.new as Message;setMessages(c=>c.some(m=>m.id===next.id)?c:[...c,next])})
   .on("postgres_changes",{event:"UPDATE",schema:"public",table:"messages",filter:`room_id=eq.${roomId}`},payload=>{const next=payload.new as Message;setMessages(c=>c.map(m=>m.id===next.id?next:m))})
   .on("postgres_changes",{event:"*",schema:"public",table:"message_reactions"},async()=>{const {data}=await supabase.from("message_reactions").select("id,message_id,user_id,emoji").in("message_id",messages.map(m=>m.id));setReactions(data??[])})
   .on("presence",{event:"sync"},()=>{const state=channel.presenceState();const active=Object.values(state).flat().filter((p:any)=>p.user_id!==userId&&p.typing).map((p:any)=>names.get(p.user_id)||"Traveller");setTyping(active)})
   .subscribe(async status=>{if(status==="SUBSCRIBED")await channel.track({user_id:userId,typing:false})});
  return()=>{supabase.removeChannel(channel)}
 },[roomId,supabase,userId,names,messages.length]);

 useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth",block:"nearest"})},[messages.length]);

 async function setTypingState(active:boolean){
  const ch=supabase.getChannels().find(c=>c.topic.includes(`trip-room-${roomId}`));if(ch)await ch.track({user_id:userId,typing:active});
 }
 function onText(value:string){setText(value);setTypingState(Boolean(value.trim()));if(typingTimer.current)window.clearTimeout(typingTimer.current);typingTimer.current=window.setTimeout(()=>setTypingState(false),1500)}

 async function sendMessage(e:FormEvent<HTMLFormElement>){e.preventDefault();const body=text.trim();if(!body||sending)return;setSending(true);setMessage("");
  const {data,error}=await supabase.from("messages").insert({room_id:roomId,user_id:userId,message_text:body,message_type:"text",reply_to_message_id:replyTo?.id||null}).select("id,room_id,user_id,message_text,message_type,created_at,edited_at,deleted_at,reply_to_message_id,pinned_at").single();
  if(error)setMessage(error.message);else if(data){setMessages(c=>c.some(m=>m.id===data.id)?c:[...c,data as Message]);setText("");setReplyTo(null);setTypingState(false)}setSending(false)
 }
 async function react(item:Message,emoji:string){const mine=reactions.find(r=>r.message_id===item.id&&r.user_id===userId&&r.emoji===emoji);const result=mine?await supabase.from("message_reactions").delete().eq("id",mine.id):await supabase.from("message_reactions").insert({message_id:item.id,user_id:userId,emoji});if(result.error)setMessage(result.error.message);else{const {data}=await supabase.from("message_reactions").select("id,message_id,user_id,emoji").in("message_id",messages.map(m=>m.id));setReactions(data??[])}}
 async function del(id:string){if(!confirm("Delete this message?"))return;const {error}=await supabase.from("messages").update({message_text:null,deleted_at:new Date().toISOString()}).eq("id",id).eq("user_id",userId);if(error)setMessage(error.message)}
 const replied=(id:string|null)=>messages.find(m=>m.id===id);

 return <section className="chat-stage3"><div className="panel chat-panel"><div className="section-title-row"><div><h2>Trip Chat</h2><div className="muted">{members.length} traveller(s) · replies, reactions and live typing</div></div><span className="badge">Live</span></div>
  <div className="message-stream" aria-live="polite">{messages.length?messages.map(item=>{const mine=item.user_id===userId;const reply=replied(item.reply_to_message_id);const rs=reactions.filter(r=>r.message_id===item.id);const grouped=Array.from(new Set(rs.map(r=>r.emoji)));
   return <article className={`chat-message ${mine?"mine":""}`} key={item.id}><div className="chat-avatar">{(names.get(item.user_id)||"T").slice(0,1).toUpperCase()}</div><div className="chat-bubble-wrap"><div className="chat-meta"><strong>{mine?"You":names.get(item.user_id)||"Traveller"}</strong><span>{niceTime(item.created_at)}</span></div>
    <div className={`chat-bubble ${mine?"mine":""}`}>{reply?<div className="reply-preview"><strong>{names.get(reply.user_id)||"Traveller"}</strong><span>{reply.message_text||"Deleted message"}</span></div>:null}{item.deleted_at?<em>Message deleted</em>:item.message_text}</div>
    {!item.deleted_at?<><div className="reaction-row">{["👍","❤️","😂","😮"].map(e=><button key={e} className={rs.some(r=>r.emoji===e&&r.user_id===userId)?"active":""} onClick={()=>react(item,e)}>{e}{rs.filter(r=>r.emoji===e).length||""}</button>)}<button onClick={()=>setReplyTo(item)}>↩ Reply</button>{mine?<button onClick={()=>del(item.id)}>Delete</button>:null}</div>{grouped.length?null:null}</>:null}
   </div></article>}):<div className="empty-mini">No messages yet. Start the conversation.</div>}<div ref={endRef}/></div>
  {typing.length?<div className="typing-indicator">{typing.join(", ")} {typing.length===1?"is":"are"} typing…</div>:null}
  {replyTo?<div className="reply-compose"><div><strong>Replying to {names.get(replyTo.user_id)||"Traveller"}</strong><span>{replyTo.message_text}</span></div><button onClick={()=>setReplyTo(null)}>×</button></div>:null}
  <form className="chat-composer" onSubmit={sendMessage}><textarea value={text} onChange={e=>onText(e.target.value)} placeholder="Message your Travel Crew… use @name to mention someone" rows={2} maxLength={4000}/><button className="primary" disabled={sending||!text.trim()}>{sending?"Sending…":"Send"}</button></form>
  {message?<div className="error">{message}</div>:null}
 </div></section>
}
