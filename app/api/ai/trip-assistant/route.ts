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

function smartPlannerFallback(
  question: string,
  trip: any,
  days: any[],
  activities: any[],
  places: any[],
  weather: any,
) {
  const suggestions: any[] = [];
  const q = question.toLowerCase();

  const activityDates = new Set(
    activities
      .map((a) => a.start_datetime?.slice(0, 10))
      .filter(Boolean),
  );

  const availableDays = (days || []).filter((d) => !activityDates.has(d.date));

  const saved = (places || []).slice(0, 4);
  for (const place of saved) {
    suggestions.push({
      title: place.name,
      description:
        place.notes ||
        `A saved ${place.category || "place"} that could fit into a free part of your itinerary.`,
      date: availableDays[0]?.date || days?.[0]?.date || null,
      time: null,
      activity_type:
        place.category === "restaurant"
          ? "restaurant"
          : place.category === "tour"
            ? "tour"
            : "attraction",
      venue_name: place.name,
      address: place.address || null,
      action: "itinerary",
    });
  }

  if (suggestions.length < 4) {
    const destination = trip.primary_destination || "your destination";
    const templates = [
      {
        title: `Easy local exploring in ${destination}`,
        description:
          "Keep a flexible two-to-three hour block for a walk, waterfront, neighbourhood or central sightseeing close to your existing plans.",
        activity_type: "attraction",
      },
      {
        title: "Relaxed meal break",
        description:
          "Leave a comfortable meal window near your other activities rather than over-scheduling the day.",
        activity_type: "restaurant",
      },
      {
        title: "Flexible free time",
        description:
          "Keep one unstructured block for shopping, resting, weather changes or something you discover during the trip.",
        activity_type: "free_time",
      },
    ];

    for (const item of templates) {
      if (suggestions.length >= 5) break;
      suggestions.push({
        ...item,
        date: availableDays[suggestions.length]?.date || days?.[0]?.date || null,
        time: null,
        venue_name: null,
        address: null,
        action: "itinerary",
      });
    }
  }

  let weatherNote = "";
  if (weather?.daily?.time?.length) {
    const rainy = weather.daily.time
      .map((date: string, i: number) => ({
        date,
        rain: weather.daily.precipitation_probability_max?.[i] ?? 0,
      }))
      .filter((d: any) => d.rain >= 60);

    if (rainy.length) {
      weatherNote =
        ` I can see a higher rain chance on ${rainy
          .slice(0, 3)
          .map((d: any) => `${d.date} (${Math.round(d.rain)}%)`)
          .join(", ")}, so keep those days more flexible or favour indoor options.`;
    }
  }

  const modeNote =
    "OpenAI API credit is not currently available, so Travel Crew used its free Smart Planner mode instead.";

  return {
    answer:
      `${modeNote} Based on the trip information already saved, these are practical options that fit without changing anything automatically.${weatherNote}`,
    suggestions: suggestions.slice(0, 6),
    planner_mode: "free_smart",
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const hasOpenAI = Boolean(apiKey);

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

  if (!hasOpenAI) {
    return NextResponse.json(
      smartPlannerFallback(
        question,
        trip,
        days ?? [],
        activities ?? [],
        places ?? [],
        weather,
      ),
    );
  }

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

    if (
      response.status === 429 ||
      String(apiMessage).toLowerCase().includes("quota") ||
      String(apiMessage).toLowerCase().includes("billing")
    ) {
      return NextResponse.json(
        smartPlannerFallback(
          question,
          trip,
          days ?? [],
          activities ?? [],
          places ?? [],
          weather,
        ),
      );
    }

    return NextResponse.json(
      {
        error:
          response.status === 401
            ? "The OpenAI API key in Vercel is invalid or belongs to the wrong project."
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
