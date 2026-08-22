"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Day = {
  id: string;
  date: string;
  day_number: number | null;
  title: string | null;
  notes: string | null;
};

type Activity = {
  id: string;
  itinerary_day_id: string | null;
  title: string;
  activity_type: string;
  start_datetime: string | null;
  end_datetime: string | null;
  venue_name: string | null;
  address: string | null;
  notes: string | null;
  cost: number | null;
  currency: string | null;
  status: string;
};

function addDaysUTC(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function formatDay(date: string) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function timeOnly(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function TripPlanner({
  tripId,
  userId,
  tripStart,
  tripEnd,
  initialDays,
  initialActivities,
}: {
  tripId: string;
  userId: string;
  tripStart: string | null;
  tripEnd: string | null;
  initialDays: Day[];
  initialActivities: Activity[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [days, setDays] = useState(initialDays);
  const [activities, setActivities] = useState(initialActivities);
  const [selectedDayId, setSelectedDayId] = useState(initialDays[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const selectedDay = days.find((d) => d.id === selectedDayId) ?? days[0] ?? null;
  const selectedActivities = selectedDay
    ? activities
        .filter((a) => a.itinerary_day_id === selectedDay.id)
        .sort((a, b) => (a.start_datetime || "").localeCompare(b.start_datetime || ""))
    : [];

  async function refresh() {
    const [{ data: dayRows }, { data: activityRows }] = await Promise.all([
      supabase
        .from("itinerary_days")
        .select("id,date,day_number,title,notes")
        .eq("trip_id", tripId)
        .order("date"),
      supabase
        .from("activities")
        .select("id,itinerary_day_id,title,activity_type,start_datetime,end_datetime,venue_name,address,notes,cost,currency,status")
        .eq("trip_id", tripId)
        .order("start_datetime"),
    ]);

    setDays((dayRows ?? []) as Day[]);
    setActivities((activityRows ?? []) as Activity[]);
    if (!selectedDayId && dayRows?.[0]?.id) setSelectedDayId(dayRows[0].id);
  }

  async function generateDays() {
    setMessage("");
    if (!tripStart || !tripEnd) {
      setMessage("Set trip start and end dates before generating itinerary days.");
      return;
    }

    const start = new Date(`${tripStart}T00:00:00Z`);
    const end = new Date(`${tripEnd}T00:00:00Z`);
    const count = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;

    if (count < 1 || count > 120) {
      setMessage("Trip dates need to cover between 1 and 120 days.");
      return;
    }

    setBusy(true);

    const rows = Array.from({ length: count }, (_, i) => ({
      trip_id: tripId,
      date: addDaysUTC(tripStart, i),
      day_number: i + 1,
      title: `Day ${i + 1}`,
    }));

    const { error } = await supabase
      .from("itinerary_days")
      .upsert(rows, { onConflict: "trip_id,date" });

    if (error) {
      setMessage(error.message);
    } else {
      await refresh();
      setMessage("Itinerary days created.");
    }
    setBusy(false);
  }

  async function addActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!selectedDay) {
      setMessage("Create itinerary days first.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    const startTime = String(form.get("start_time") || "");
    const endTime = String(form.get("end_time") || "");

    if (!title) {
      setMessage("Activity name is required.");
      return;
    }

    setBusy(true);

    const startDatetime = startTime
      ? new Date(`${selectedDay.date}T${startTime}:00`).toISOString()
      : null;
    const endDatetime = endTime
      ? new Date(`${selectedDay.date}T${endTime}:00`).toISOString()
      : null;

    const { error } = await supabase.from("activities").insert({
      trip_id: tripId,
      itinerary_day_id: selectedDay.id,
      created_by: userId,
      title,
      activity_type: String(form.get("activity_type") || "other"),
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      venue_name: String(form.get("venue_name") || "").trim() || null,
      address: String(form.get("address") || "").trim() || null,
      notes: String(form.get("notes") || "").trim() || null,
      cost: form.get("cost") ? Number(form.get("cost")) : null,
      currency: "AUD",
      status: "planned",
    });

    if (error) {
      setMessage(error.message);
    } else {
      event.currentTarget.reset();
      await refresh();
      setMessage("Activity added.");
    }
    setBusy(false);
  }

  async function deleteActivity(id: string) {
    if (!confirm("Remove this activity from the itinerary?")) return;
    setBusy(true);
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) setMessage(error.message);
    await refresh();
    setBusy(false);
  }

  return (
    <div className="planner-shell">
      <aside className="planner-days panel">
        <div className="section-title-row">
          <div>
            <h3>Trip days</h3>
            <div className="muted">Choose a day to plan</div>
          </div>
        </div>

        {days.length ? (
          <div className="day-stack">
            {days.map((day) => (
              <button
                key={day.id}
                type="button"
                className={`day-card ${selectedDay?.id === day.id ? "active" : ""}`}
                onClick={() => setSelectedDayId(day.id)}
              >
                <strong>Day {day.day_number ?? "—"}</strong>
                <small>{formatDay(day.date)}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-mini">No itinerary days yet.</div>
        )}

        <button className="secondary full-width" type="button" disabled={busy} onClick={generateDays}>
          {busy ? "Working…" : days.length ? "Refresh trip days" : "Generate trip days"}
        </button>
      </aside>

      <section className="planner-main">
        <div className="panel">
          <div className="section-title-row">
            <div>
              <h2>{selectedDay ? `Day ${selectedDay.day_number} · ${formatDay(selectedDay.date)}` : "Plan My Trip"}</h2>
              <div className="muted">Build the day in the order you want to experience it.</div>
            </div>
          </div>

          {selectedDay ? (
            selectedActivities.length ? (
              <div className="activity-stack">
                {selectedActivities.map((activity) => (
                  <article className="activity-row" key={activity.id}>
                    <div className="activity-time">{timeOnly(activity.start_datetime) || "Any time"}</div>
                    <div className="activity-symbol">
                      {activity.activity_type === "flight" ? "✈️" :
                       activity.activity_type === "hotel" ? "🏨" :
                       activity.activity_type === "cruise" ? "🚢" :
                       activity.activity_type === "restaurant" ? "🍽️" :
                       activity.activity_type === "tour" ? "🎟️" :
                       activity.activity_type === "transport" ? "🚕" :
                       activity.activity_type === "shopping" ? "🛍️" : "📍"}
                    </div>
                    <div className="activity-copy">
                      <strong>{activity.title}</strong>
                      <div className="muted">
                        {[activity.venue_name, activity.address].filter(Boolean).join(" · ") || activity.activity_type}
                      </div>
                      {activity.notes ? <small>{activity.notes}</small> : null}
                    </div>
                    <button className="icon-danger" type="button" onClick={() => deleteActivity(activity.id)}>×</button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-mini">Nothing planned for this day yet.</div>
            )
          ) : (
            <div className="empty-mini">Generate your itinerary days to begin.</div>
          )}
        </div>

        <form className="panel form-stack" onSubmit={addActivity}>
          <div className="section-title-row">
            <div>
              <h3>Add activity</h3>
              <div className="muted">Add sightseeing, meals, transport, tours or free time.</div>
            </div>
          </div>

          <div className="form-grid">
            <div className="field span-2">
              <label htmlFor="activity-title">Activity name *</label>
              <input id="activity-title" name="title" required placeholder="Stanley Park" />
            </div>

            <div className="field">
              <label htmlFor="activity-type">Type</label>
              <select id="activity-type" name="activity_type" defaultValue="attraction">
                <option value="attraction">Attraction</option>
                <option value="restaurant">Restaurant</option>
                <option value="tour">Tour</option>
                <option value="flight">Flight</option>
                <option value="hotel">Hotel</option>
                <option value="cruise">Cruise</option>
                <option value="transport">Transport</option>
                <option value="shopping">Shopping</option>
                <option value="event">Event</option>
                <option value="free_time">Free Time</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="venue-name">Venue / place</label>
              <input id="venue-name" name="venue_name" placeholder="Stanley Park" />
            </div>

            <div className="field">
              <label htmlFor="start-time">Start time</label>
              <input id="start-time" name="start_time" type="time" />
            </div>

            <div className="field">
              <label htmlFor="end-time">End time</label>
              <input id="end-time" name="end_time" type="time" />
            </div>

            <div className="field span-2">
              <label htmlFor="activity-address">Address</label>
              <input id="activity-address" name="address" placeholder="Optional address" />
            </div>

            <div className="field">
              <label htmlFor="activity-cost">Estimated cost (AUD)</label>
              <input id="activity-cost" name="cost" type="number" min="0" step="0.01" />
            </div>

            <div className="field span-2">
              <label htmlFor="activity-notes">Notes</label>
              <textarea id="activity-notes" name="notes" placeholder="Booking details, reminders or what to bring…" />
            </div>
          </div>

          {message ? <div className={message.includes("created") || message.includes("added") ? "success" : "error"}>{message}</div> : null}

          <button className="primary" type="submit" disabled={busy || !selectedDay}>
            Add to itinerary
          </button>
        </form>
      </section>
    </div>
  );
}
