import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ results: [] });

  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`,
    { next: { revalidate: 86400 } },
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Location search is unavailable." }, { status: 502 });
  }

  const payload = await response.json();
  const results = (payload.results ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    admin1: r.admin1 ?? null,
    country: r.country ?? null,
    country_code: r.country_code ?? null,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone ?? null,
  }));

  return NextResponse.json({ results });
}
