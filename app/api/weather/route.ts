import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  const timezone = url.searchParams.get("timezone") || "auto";

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "Valid coordinates are required." }, { status: 400 });
  }

  const endpoint =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&forecast_days=14&timezone=${encodeURIComponent(timezone)}`;

  const response = await fetch(endpoint, { next: { revalidate: 1800 } });

  if (!response.ok) {
    return NextResponse.json({ error: "Weather service is unavailable." }, { status: 502 });
  }

  return NextResponse.json(await response.json());
}
