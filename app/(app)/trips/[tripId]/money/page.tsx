import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { CurrencyConverter } from "@/components/currency-converter";

export default async function TripMoneyPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = await createClient();

  const [{ data: tripData }, { data: destination }] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
    supabase
      .from("destinations")
      .select("currency_code")
      .eq("trip_id", tripId)
      .order("sort_order")
      .limit(1)
      .maybeSingle(),
  ]);

  if (!tripData) notFound();

  return (
    <>
      <TripWorkspaceHeader trip={tripData as Trip} active="money" />
      <CurrencyConverter
        defaultFrom={tripData.home_currency || "AUD"}
        defaultTo={destination?.currency_code || "USD"}
      />
    </>
  );
}
