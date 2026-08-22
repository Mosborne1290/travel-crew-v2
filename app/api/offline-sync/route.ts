import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Mutation={client_mutation_id:string;trip_id:string;mutation_type:string;payload:any};

export async function POST(request:Request){
  const supabase=await createClient();
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user)return NextResponse.json({error:"Unauthorised"},{status:401});

  const body=await request.json();
  const mutations=(Array.isArray(body?.mutations)?body.mutations:[]) as Mutation[];
  if(mutations.length>100)return NextResponse.json({error:"Too many offline changes in one sync."},{status:400});

  const results:any[]=[];
  for(const m of mutations){
    if(!m.client_mutation_id||!m.trip_id||!m.mutation_type){results.push({id:m.client_mutation_id,error:"Invalid mutation"});continue}

    const existing=await supabase.from("offline_mutations").select("id,applied_at,error_text").eq("user_id",auth.user.id).eq("client_mutation_id",m.client_mutation_id).maybeSingle();
    if(existing.data?.applied_at){results.push({id:m.client_mutation_id,ok:true,duplicate:true});continue}

    const record=existing.data??(await supabase.from("offline_mutations").insert({trip_id:m.trip_id,user_id:auth.user.id,client_mutation_id:m.client_mutation_id,mutation_type:m.mutation_type,payload:m.payload}).select("id").single()).data;
    let error:string|null=null;

    try{
      if(m.mutation_type==="checklist_toggle"){
        const r=await supabase.from("checklist_items").update({completed:Boolean(m.payload.completed),completed_at:m.payload.completed?new Date().toISOString():null}).eq("id",String(m.payload.id)).eq("trip_id",m.trip_id);
        if(r.error)throw r.error;
      }else if(m.mutation_type==="packing_toggle"){
        const r=await supabase.from("packing_items").update({packed:Boolean(m.payload.packed)}).eq("id",String(m.payload.id)).eq("trip_id",m.trip_id);
        if(r.error)throw r.error;
      }else if(m.mutation_type==="journal_upsert"){
        const r=await supabase.from("journal_entries").upsert({trip_id:m.trip_id,user_id:auth.user.id,entry_date:String(m.payload.entry_date),title:m.payload.title||null,notes:m.payload.notes||null,highlight:m.payload.highlight||null,favourite_moment:m.payload.favourite_moment||null,updated_at:new Date().toISOString()},{onConflict:"trip_id,user_id,entry_date"});
        if(r.error)throw r.error;
      }else{
        throw new Error(`Unsupported offline mutation: ${m.mutation_type}`);
      }
      await supabase.from("offline_mutations").update({applied_at:new Date().toISOString(),error_text:null}).eq("id",record?.id);
      results.push({id:m.client_mutation_id,ok:true});
    }catch(e){
      error=e instanceof Error?e.message:"Sync failed";
      if(record?.id)await supabase.from("offline_mutations").update({error_text:error}).eq("id",record.id);
      results.push({id:m.client_mutation_id,ok:false,error});
    }
  }

  return NextResponse.json({results});
}
