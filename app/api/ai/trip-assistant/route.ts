import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function outputText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  const parts: string[] = [];
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI is optional. Add OPENAI_API_KEY in Vercel to activate Ask Travel Crew." },
      { status: 503 },
    );
  }

  const body = await request.json();
  const tripId = String(body.tripId || "");
  const question = String(body.question || "").trim();

  if (!tripId || !question) {
    return NextResponse.json({ error: "Trip and question are required." }, { status: 400 });
  }

  const [{ data: trip }, { data: days }, { data: activities }, { data: bookings }, { data: destinations }, { data: places }] =
    await Promise.all([
      supabase.from("trips").select("id,name,start_date,end_date,primary_destination,home_currency,budget_amount").eq("id", tripId).maybeSingle(),
      supabase.from("itinerary_days").select("id,date,day_number,title,notes").eq("trip_id", tripId).order("date"),
      supabase.from("activities").select("title,activity_type,start_datetime,end_datetime,venue_name,address,notes,cost,currency").eq("trip_id", tripId).order("start_datetime"),
      supabase.from("bookings").select("booking_type,provider,start_datetime,end_datetime,total_amount,currency,booking_status,notes").eq("trip_id", tripId),
      supabase.from("destinations").select("name,city,country,latitude,longitude,timezone").eq("trip_id", tripId).order("sort_order"),
      supabase.from("saved_places").select("name,category,address,notes").eq("trip_id", tripId),
    ]);

  if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });

  let weather: any = null;
  const primary = destinations?.[0];
  if (primary?.latitude != null && primary?.longitude != null) {
    try {
      const endpoint =
        `https://api.open-meteo.com/v1/forecast?latitude=${primary.latitude}&longitude=${primary.longitude}` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
        `&forecast_days=14&timezone=${encodeURIComponent(primary.timezone || "auto")}`;
      const r = await fetch(endpoint, { next: { revalidate: 1800 } });
      if (r.ok) weather = await r.json();
    } catch {}
  }

  const tripContext = {
    trip,
    destinations,
    days,
    activities,
    bookings,
    saved_places: places,
    weather,
  };

  const instruction = `
You are the private Travel Crew trip-planning assistant.
Use ONLY the supplied trip context plus general travel-planning knowledge.
Do not claim live opening hours, prices, availability or reservations unless supplied.
Never modify the itinerary automatically.

Return ONLY valid JSON in this exact shape:
{
  "answer": "helpful concise answer",
  "suggestions": [
    {
      "title": "suggestion title",
      "description": "why it fits",
      "date": "YYYY-MM-DD or null",
      "time": "HH:MM or null",
      "activity_type": "attraction|restaurant|tour|transport|shopping|free_time|other",
      "venue_name": "place name or null",
      "address": null,
      "action": "itinerary|place|info"
    }
  ]
}
Use no more than 6 suggestions. If the question is informational, suggestions may be empty.
`;

  async function callOpenAI(model: string) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        instructions: instruction,
        input: `TRIP CONTEXT:\n${JSON.stringify(tripContext)}\n\nUSER QUESTION:\n${question}`,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  }

  const preferredModel =
    process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna";

  let attempt = await callOpenAI(preferredModel);

  // Some API projects may not have access to every model tier.
  // Fall back to the standard GPT-5.6 model instead of making the app fail.
  if (
    !attempt.response.ok &&
    preferredModel !== "gpt-5.6" &&
    (
      attempt.response.status === 404 ||
      attempt.payload?.error?.code === "model_not_found" ||
      String(attempt.payload?.error?.message || "").toLowerCase().includes("model")
    )
  ) {
    attempt = await callOpenAI("gpt-5.6");
  }

  const response = attempt.response;
  const payload = attempt.payload;

  if (!response.ok) {
    const apiMessage =
      payload?.error?.message ||
      "The Ask Travel Crew service could not complete the request.";

    const status =
      response.status === 401 ? 401 :
      response.status === 429 ? 429 :
      502;

    return NextResponse.json(
      {
        error:
          response.status === 401
            ? "The OpenAI API key in Vercel is invalid or belongs to the wrong project."
            : response.status === 429
              ? `OpenAI API limit/billing issue: ${apiMessage}`
              : apiMessage,
      },
      { status },
    );
  }

  const text = outputText(payload).trim();
  try {
    return NextResponse.json(JSON.parse(text.replace(/^```json\s*/i, "").replace(/```$/,"").trim()));
  } catch {
    return NextResponse.json({ answer: text || "No response was returned.", suggestions: [] });
  }
}
