import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const url = new URL(request.url);
  const from = (url.searchParams.get("from") || "AUD").toUpperCase();
  const to = (url.searchParams.get("to") || "USD").toUpperCase();
  const amount = Number(url.searchParams.get("amount") || "1");

  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to) || !Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "Invalid currency request." }, { status: 400 });
  }

  if (from === to) {
    return NextResponse.json({ amount, from, to, result: amount, rate: 1 });
  }

  const response = await fetch(
    `https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`,
    { next: { revalidate: 3600 } },
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Currency service is unavailable." }, { status: 502 });
  }

  const payload = await response.json();
  const result = payload.rates?.[to];
  return NextResponse.json({
    amount,
    from,
    to,
    result,
    rate: amount ? result / amount : null,
    date: payload.date,
  });
}
