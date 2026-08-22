import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { TripBudget } from "@/components/trip-budget";

export default async function TripBudgetPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [
    { data: tripData },
    { data: budgets },
    { data: expenses },
    { data: memberRows },
    { data: splits },
  ] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
    supabase.from("budgets").select("id,category,planned_amount,currency").eq("trip_id", tripId).order("category"),
    supabase.from("expenses").select("id,description,category,amount,currency,converted_amount,home_currency,expense_date,paid_by_user_id,receipt_document_id,notes").eq("trip_id", tripId).order("expense_date",{ascending:false}),
    supabase.from("trip_members").select("user_id").eq("trip_id", tripId),
    supabase.from("expense_splits").select("id,expense_id,user_id,amount,status"),
  ]);

  if (!tripData) notFound();

  const ids = (memberRows ?? []).map(m => m.user_id);
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id,display_name,first_name,last_name").in("id", ids)
    : { data: [] as any[] };

  const members = ids.map(id => {
    const p = (profiles ?? []).find(x => x.id === id);
    return { user_id: id, display_name: p?.display_name || [p?.first_name,p?.last_name].filter(Boolean).join(" ") || "Traveller" };
  });

  const expenseIds = new Set((expenses ?? []).map(e => e.id));
  const tripSplits = (splits ?? []).filter(s => expenseIds.has(s.expense_id));

  return (
    <>
      <TripWorkspaceHeader trip={tripData as Trip} active="budget" />
      <TripBudget
        tripId={tripId}
        userId={user.id}
        homeCurrency={tripData.home_currency || "AUD"}
        initialBudgets={budgets ?? []}
        initialExpenses={expenses ?? []}
        initialMembers={members}
        initialSplits={tripSplits}
      />
    </>
  );
}
