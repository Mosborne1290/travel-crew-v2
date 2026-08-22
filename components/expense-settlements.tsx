"use client";
import { FormEvent,useMemo,useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Member={user_id:string;display_name:string};
type Expense={id:string;description:string;currency:string;paid_by_user_id:string|null};
type Split={id:string;expense_id:string;user_id:string;amount:number;status:string};
type Settlement={id:string;from_user_id:string;to_user_id:string;amount:number;currency:string;note:string|null;settled_at:string};

export function ExpenseSettlements({tripId,userId,homeCurrency,members,expenses,splits,initialSettlements}:{tripId:string;userId:string;homeCurrency:string;members:Member[];expenses:Expense[];splits:Split[];initialSettlements:Settlement[]}){
 const supabase=useMemo(()=>createClient(),[]);const [settlements,setSettlements]=useState(initialSettlements),[message,setMessage]=useState("");
 const name=(id:string)=>members.find(m=>m.user_id===id)?.display_name||"Traveller";

 const balances=useMemo(()=>{
  const map=new Map<string,number>();
  for(const expense of expenses){
    if(!expense.paid_by_user_id)continue;
    for(const split of splits.filter(s=>s.expense_id===expense.id&&s.user_id!==expense.paid_by_user_id&&s.status!=="settled")){
      const key=`${split.user_id}|${expense.paid_by_user_id}`;map.set(key,(map.get(key)||0)+Number(split.amount));
    }
  }
  for(const s of settlements){
    const key=`${s.from_user_id}|${s.to_user_id}`;map.set(key,Math.max(0,(map.get(key)||0)-Number(s.amount)));
  }
  return Array.from(map.entries()).filter(([,amount])=>amount>0.005).map(([key,amount])=>{const [from,to]=key.split("|");return{from,to,amount}});
 },[expenses,splits,settlements]);

 async function refresh(){const {data}=await supabase.from("expense_settlements").select("id,from_user_id,to_user_id,amount,currency,note,settled_at").eq("trip_id",tripId).order("settled_at",{ascending:false});setSettlements(data??[])}

 async function settle(e:FormEvent<HTMLFormElement>){e.preventDefault();const el=e.currentTarget;const f=new FormData(el);const from=String(f.get("from_user_id")),to=String(f.get("to_user_id")),amount=Number(f.get("amount")||0);if(from===to){setMessage("From and To travellers must be different.");return}const {error}=await supabase.from("expense_settlements").insert({trip_id:tripId,from_user_id:from,to_user_id:to,amount,currency:homeCurrency,note:String(f.get("note")||"")||null,created_by:userId});if(error)setMessage(error.message);else{el.reset();await refresh();setMessage("Settlement recorded.");}}

 return <div className="settlements-stage7"><section className="panel"><div className="section-title-row"><div><h2>Who Owes Who</h2><div className="muted">Net group balances based on expense splits and recorded settlements.</div></div></div>{balances.length?<div className="balance-list">{balances.map((b,i)=><article key={`${b.from}-${b.to}-${i}`}><div><strong>{name(b.from)} owes {name(b.to)}</strong><span>{homeCurrency} ${b.amount.toFixed(2)}</span></div></article>)}</div>:<div className="success">Everyone is settled up.</div>}</section>
 <form className="panel form-stack" onSubmit={settle}><h2>Record Settlement</h2><div className="field"><label>From</label><select name="from_user_id" defaultValue={balances[0]?.from||userId}>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</select></div><div className="field"><label>To</label><select name="to_user_id" defaultValue={balances[0]?.to||""}>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</select></div><div className="field"><label>Amount ({homeCurrency})</label><input name="amount" type="number" min="0" step="0.01" required/></div><div className="field"><label>Note</label><input name="note" placeholder="Bank transfer"/></div><button className="primary">Record Settlement</button>{message?<div className={message.includes("recorded")?"success":"error"}>{message}</div>:null}</form>
 <section className="panel"><h2>Settlement History</h2>{settlements.length?<div className="list">{settlements.map(s=><div className="list-row" key={s.id}><div><strong>{name(s.from_user_id)} → {name(s.to_user_id)}</strong><div className="muted">{new Date(s.settled_at).toLocaleDateString("en-AU")} {s.note||""}</div></div><strong>${Number(s.amount).toFixed(2)} {s.currency}</strong></div>)}</div>:<p className="muted">No settlements recorded yet.</p>}</section></div>
}
