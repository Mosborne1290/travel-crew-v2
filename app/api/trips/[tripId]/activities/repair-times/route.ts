import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  return Date.UTC(
    values.year, values.month - 1, values.day,
    values.hour, values.minute, values.second,
  ) - instantMs;
}

function localWallTimeToUtcIso(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let candidate = wallClockAsUtc;

  for (let i = 0; i < 2; i += 1) {
    candidate = wallClockAsUtc - timeZoneOffsetMs(candidate, timeZone);
  }

  return new Date(candidate).toISOString();
}

function originalEnteredClock(value: string) {
  const d = new Date(value);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export async function POST(
  _: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  const [{ data: destination }, { data: activities }] = await Promise.all([
    supabase
      .from("destinations")
      .select("timezone")
      .eq("trip_id", tripId)
      .order("sort_order")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("activities")
      .select("id,itinerary_day_id,start_datetime,end_datetime,notes,timezone,time_storage_version")
      .eq("trip_id", tripId)
      .eq("time_storage_version", 1),
  ]);

  const dayIds = Array.from(
    new Set((activities ?? []).map(a => a.itinerary_day_id).filter(Boolean)),
  );

  const { data: days } = dayIds.length
    ? await supabase
        .from("itinerary_days")
        .select("id,date")
        .in("id", dayIds)
    : { data: [] as { id: string; date: string }[] };

  let repaired = 0;
  let skipped = 0;

  for (const activity of activities ?? []) {
    // Booking-created activities were already created from the browser with
    // a real UTC instant, so do not reinterpret those values.
    if (/created from booking/i.test(activity.notes || "")) {
      await supabase
        .from("activities")
        .update({ time_storage_version: 2 })
        .eq("id", activity.id);
      skipped += 1;
      continue;
    }

    const day = (days ?? []).find(d => d.id === activity.itinerary_day_id);
    if (!day) {
      skipped += 1;
      continue;
    }

    const timeZone = safeTimeZone(activity.timezone || destination?.timezone);
    const update: Record<string, unknown> = {
      timezone: timeZone,
      time_storage_version: 2,
    };

    if (activity.start_datetime) {
      update.start_datetime = localWallTimeToUtcIso(
        day.date,
        originalEnteredClock(activity.start_datetime),
        timeZone,
      );
    }

    if (activity.end_datetime) {
      update.end_datetime = localWallTimeToUtcIso(
        day.date,
        originalEnteredClock(activity.end_datetime),
        timeZone,
      );
    }

    const { error } = await supabase
      .from("activities")
      .update(update)
      .eq("id", activity.id)
      .eq("trip_id", tripId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    repaired += 1;
  }

  return NextResponse.json({ repaired, skipped });
}
