import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function findCoordinates(query: string) {
  if (!query.trim()) return null;

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`,
      { next: { revalidate: 86400 } },
    );

    if (!response.ok) return null;

    const payload = await response.json();
    const match = payload.results?.[0];

    return match
      ? {
          latitude: Number(match.latitude),
          longitude: Number(match.longitude),
          timezone: typeof match.timezone === "string" ? match.timezone : null,
        }
      : null;
  } catch {
    // Mapping is helpful, but must never prevent an activity being saved.
    return null;
  }
}

function validTime(value: unknown) {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

function safeTimeZone(value: unknown) {
  const candidate = String(value || "").trim() || "Australia/Sydney";
  try {
    new Intl.DateTimeFormat("en-AU", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return "Australia/Sydney";
  }
}

function timeZoneOffsetMs(instantMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instantMs));

  const values: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }

  const asUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );

  return asUtc - instantMs;
}

function localWallTimeToUtcIso(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    throw new Error("Invalid local date/time.");
  }

  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let candidate = wallClockAsUtc;

  // Two passes handle DST-offset changes around the requested instant.
  for (let i = 0; i < 2; i += 1) {
    const offset = timeZoneOffsetMs(candidate, timeZone);
    candidate = wallClockAsUtc - offset;
  }

  return new Date(candidate).toISOString();
}

function utcClockAsTime(value: string) {
  const d = new Date(value);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();

  if (authError || !auth.user) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  const body = await request.json();
  const title = String(body.title || "").trim();
  const dayId = String(body.itinerary_day_id || "");
  const dayDate = String(body.day_date || "");
  const startTime = String(body.start_time || "");
  const endTime = String(body.end_time || "");
  const venue = String(body.venue_name || "").trim();
  const address = String(body.address || "").trim();
  const destinationName = String(body.destination_name || "").trim();
  const requestedTimeZone = safeTimeZone(body.timezone);

  if (!title) {
    return NextResponse.json({ error: "Activity name is required." }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayDate)) {
    return NextResponse.json(
      { error: "Choose a valid date for the activity." },
      { status: 400 },
    );
  }

  let day: { id: string; date: string } | null = null;

  if (dayId) {
    const lookup = await supabase
      .from("itinerary_days")
      .select("id,date")
      .eq("id", dayId)
      .eq("trip_id", tripId)
      .maybeSingle();

    if (lookup.error) {
      return NextResponse.json({ error: lookup.error.message }, { status: 400 });
    }

    day = lookup.data;
  }

  // If there is no selected itinerary day, find/create one from the date.
  // This makes Add Activity work even on older trips where Stage 2 days
  // were never generated.
  if (!day) {
    const existing = await supabase
      .from("itinerary_days")
      .select("id,date")
      .eq("trip_id", tripId)
      .eq("date", dayDate)
      .maybeSingle();

    if (existing.error) {
      return NextResponse.json({ error: existing.error.message }, { status: 400 });
    }

    day = existing.data;
  }

  if (!day) {
    const { data: trip } = await supabase
      .from("trips")
      .select("start_date")
      .eq("id", tripId)
      .maybeSingle();

    let dayNumber = 1;
    if (trip?.start_date) {
      const start = new Date(`${trip.start_date}T00:00:00Z`);
      const current = new Date(`${dayDate}T00:00:00Z`);
      dayNumber = Math.max(
        1,
        Math.floor((current.getTime() - start.getTime()) / 86400000) + 1,
      );
    }

    const created = await supabase
      .from("itinerary_days")
      .insert({
        trip_id: tripId,
        date: dayDate,
        day_number: dayNumber,
        title: `Day ${dayNumber}`,
      })
      .select("id,date")
      .single();

    if (created.error || !created.data) {
      return NextResponse.json(
        { error: created.error?.message || "Could not create the itinerary day." },
        { status: 400 },
      );
    }

    day = created.data;
  }

  const { count } = await supabase
    .from("activities")
    .select("*", { count: "exact", head: true })
    .eq("trip_id", tripId)
    .eq("itinerary_day_id", day.id);

  const mapQuery =
    address ||
    [venue, destinationName].filter(Boolean).join(" ") ||
    [title, destinationName].filter(Boolean).join(" ");

  const coordinates = await findCoordinates(mapQuery);

  let startDatetime: string | null = null;
  let endDatetime: string | null = null;

  const activityTimeZone = safeTimeZone(coordinates?.timezone || requestedTimeZone);

  try {
    startDatetime = validTime(startTime)
      ? localWallTimeToUtcIso(day.date, startTime, activityTimeZone)
      : null;

    endDatetime = validTime(endTime)
      ? localWallTimeToUtcIso(day.date, endTime, activityTimeZone)
      : null;
  } catch {
    return NextResponse.json({ error: "The activity time is invalid." }, { status: 400 });
  }

  if (
    startDatetime &&
    endDatetime &&
    new Date(endDatetime).getTime() < new Date(startDatetime).getTime()
  ) {
    return NextResponse.json(
      { error: "End time cannot be before the start time." },
      { status: 400 },
    );
  }

  const { data: activity, error } = await supabase
    .from("activities")
    .insert({
      trip_id: tripId,
      itinerary_day_id: day.id,
      created_by: auth.user.id,
      title,
      activity_type: String(body.activity_type || "other"),
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      venue_name: venue || null,
      address: address || null,
      notes: String(body.notes || "").trim() || null,
      cost:
        body.cost === "" || body.cost == null
          ? null
          : Number(body.cost),
      currency: "AUD",
      status: "planned",
      sort_order: count ?? 0,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      timezone: activityTimeZone,
      time_storage_version: 2,
    })
    .select(
      "id,itinerary_day_id,title,activity_type,start_datetime,end_datetime,venue_name,address,notes,cost,currency,status,sort_order,latitude,longitude,timezone,time_storage_version",
    )
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ activity });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();

  if (authError || !auth.user) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  const body = await request.json();
  const activityId = String(body.activity_id || "");
  const title = String(body.title || "").trim();
  const dayId = String(body.itinerary_day_id || "");

  if (!activityId || !title || !dayId) {
    return NextResponse.json(
      { error: "Activity, title and itinerary day are required." },
      { status: 400 },
    );
  }

  const { data: day } = await supabase
    .from("itinerary_days")
    .select("id,date")
    .eq("id", dayId)
    .eq("trip_id", tripId)
    .maybeSingle();

  if (!day) {
    return NextResponse.json({ error: "Trip day could not be found." }, { status: 404 });
  }

  const startTime = String(body.start_time || "");
  const endTime = String(body.end_time || "");
  const venue = String(body.venue_name || "").trim();
  const address = String(body.address || "").trim();
  const destinationName = String(body.destination_name || "").trim();
  const requestedTimeZone = safeTimeZone(body.timezone);

  const coordinates = await findCoordinates(
    address ||
      [venue, destinationName].filter(Boolean).join(" ") ||
      [title, destinationName].filter(Boolean).join(" "),
  );

  const activityTimeZone = safeTimeZone(coordinates?.timezone || requestedTimeZone);
  const startDatetime = validTime(startTime)
    ? localWallTimeToUtcIso(day.date, startTime, activityTimeZone)
    : null;
  const endDatetime = validTime(endTime)
    ? localWallTimeToUtcIso(day.date, endTime, activityTimeZone)
    : null;

  if (
    startDatetime &&
    endDatetime &&
    new Date(endDatetime).getTime() < new Date(startDatetime).getTime()
  ) {
    return NextResponse.json(
      { error: "End time cannot be before the start time." },
      { status: 400 },
    );
  }

  const update: Record<string, unknown> = {
    itinerary_day_id: dayId,
    title,
    activity_type: String(body.activity_type || "other"),
    start_datetime: startDatetime,
    end_datetime: endDatetime,
    venue_name: venue || null,
    address: address || null,
    notes: String(body.notes || "").trim() || null,
    cost:
      body.cost === "" || body.cost == null
        ? null
        : Number(body.cost),
    timezone: activityTimeZone,
    time_storage_version: 2,
  };

  if (coordinates) {
    update.latitude = coordinates.latitude;
    update.longitude = coordinates.longitude;
  }

  const { data: activity, error } = await supabase
    .from("activities")
    .update(update)
    .eq("id", activityId)
    .eq("trip_id", tripId)
    .select(
      "id,itinerary_day_id,title,activity_type,start_datetime,end_datetime,venue_name,address,notes,cost,currency,status,sort_order,latitude,longitude,timezone,time_storage_version",
    )
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ activity });
}
