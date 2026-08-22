"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Booking = {
  id: string;
  booking_type: string;
  provider: string | null;
  booking_reference: string | null;
  confirmation_number: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  total_amount: number | null;
  currency: string | null;
  payment_status: string;
  booking_status: string;
  notes: string | null;
};

type Detail = Record<string, any>;

export function AdvancedBookings({
  tripId,
  userId,
  initialBookings,
  initialDetails,
}: {
  tripId: string;
  userId: string;
  initialBookings: Booking[];
  initialDetails: Record<string, Detail>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [bookings, setBookings] = useState(initialBookings);
  const [details, setDetails] = useState(initialDetails);
  const [type, setType] = useState("flight");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data: rows } = await supabase
      .from("bookings")
      .select("id,booking_type,provider,booking_reference,confirmation_number,start_datetime,end_datetime,total_amount,currency,payment_status,booking_status,notes")
      .eq("trip_id", tripId)
      .order("start_datetime", { ascending: true, nullsFirst: false });

    const next = (rows ?? []) as Booking[];
    setBookings(next);

    const map: Record<string, Detail> = {};
    const flightIds = next.filter(x => x.booking_type === "flight").map(x => x.id);
    const hotelIds = next.filter(x => x.booking_type === "hotel").map(x => x.id);
    const cruiseIds = next.filter(x => x.booking_type === "cruise").map(x => x.id);

    if (flightIds.length) {
      const { data } = await supabase.from("flights").select("*").in("booking_id", flightIds);
      for (const d of data ?? []) map[d.booking_id] = d;
    }
    if (hotelIds.length) {
      const { data } = await supabase.from("accommodation").select("*").in("booking_id", hotelIds);
      for (const d of data ?? []) map[d.booking_id] = d;
    }
    if (cruiseIds.length) {
      const { data } = await supabase.from("cruises").select("*").in("booking_id", cruiseIds);
      for (const d of data ?? []) map[d.booking_id] = d;
    }
    setDetails(map);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setBusy(true);
    setMessage("");

    const start = String(form.get("start_datetime") || "");
    const end = String(form.get("end_datetime") || "");

    const booking = await supabase.from("bookings").insert({
      trip_id: tripId,
      created_by: userId,
      booking_type: type,
      provider: String(form.get("provider") || "").trim(),
      booking_reference: String(form.get("booking_reference") || "").trim() || null,
      confirmation_number: String(form.get("confirmation_number") || "").trim() || null,
      start_datetime: start ? new Date(start).toISOString() : null,
      end_datetime: end ? new Date(end).toISOString() : null,
      total_amount: form.get("total_amount") ? Number(form.get("total_amount")) : null,
      currency: String(form.get("currency") || "AUD"),
      payment_status: String(form.get("payment_status") || "unpaid"),
      booking_status: String(form.get("booking_status") || "confirmed"),
      notes: String(form.get("notes") || "").trim() || null,
    }).select("id").single();

    if (booking.error || !booking.data) {
      setMessage(booking.error?.message || "Could not save booking.");
      setBusy(false);
      return;
    }

    const id = booking.data.id;
    let childError: any = null;

    if (type === "flight") {
      childError = (await supabase.from("flights").insert({
        booking_id: id,
        airline: String(form.get("airline") || "").trim() || null,
        flight_number: String(form.get("flight_number") || "").trim() || null,
        departure_airport: String(form.get("departure_airport") || "").trim() || null,
        arrival_airport: String(form.get("arrival_airport") || "").trim() || null,
        departure_datetime: start ? new Date(start).toISOString() : null,
        arrival_datetime: end ? new Date(end).toISOString() : null,
        terminal_departure: String(form.get("terminal_departure") || "").trim() || null,
        terminal_arrival: String(form.get("terminal_arrival") || "").trim() || null,
        seat: String(form.get("seat") || "").trim() || null,
        cabin_class: String(form.get("cabin_class") || "").trim() || null,
        gate_departure: String(form.get("gate_departure") || "").trim() || null,
        gate_arrival: String(form.get("gate_arrival") || "").trim() || null,
        boarding_datetime: form.get("boarding_datetime") ? new Date(String(form.get("boarding_datetime"))).toISOString() : null,
        checkin_opens_datetime: form.get("checkin_opens_datetime") ? new Date(String(form.get("checkin_opens_datetime"))).toISOString() : null,
        baggage_allowance: String(form.get("baggage_allowance") || "").trim() || null,
        departure_timezone: String(form.get("departure_timezone") || "").trim() || null,
        arrival_timezone: String(form.get("arrival_timezone") || "").trim() || null,
      })).error;
    }

    if (type === "hotel") {
      childError = (await supabase.from("accommodation").insert({
        booking_id: id,
        property_name: String(form.get("property_name") || form.get("provider") || "").trim(),
        address: String(form.get("address") || "").trim() || null,
        check_in: start ? new Date(start).toISOString() : null,
        check_out: end ? new Date(end).toISOString() : null,
        room_type: String(form.get("room_type") || "").trim() || null,
        room_number: String(form.get("room_number") || "").trim() || null,
        contact_phone: String(form.get("contact_phone") || "").trim() || null,
        contact_email: String(form.get("contact_email") || "").trim() || null,
        website_url: String(form.get("website_url") || "").trim() || null,
      })).error;
    }

    if (type === "cruise") {
      childError = (await supabase.from("cruises").insert({
        booking_id: id,
        cruise_line: String(form.get("cruise_line") || form.get("provider") || "").trim() || null,
        ship_name: String(form.get("ship_name") || "").trim() || null,
        departure_port: String(form.get("departure_port") || "").trim() || null,
        arrival_port: String(form.get("arrival_port") || "").trim() || null,
        cabin_number: String(form.get("cabin_number") || "").trim() || null,
        cabin_type: String(form.get("cabin_type") || "").trim() || null,
        embarkation_datetime: start ? new Date(start).toISOString() : null,
        disembarkation_datetime: end ? new Date(end).toISOString() : null,
      })).error;
    }

    // Add the booking to the matching itinerary day when its start date
    // falls inside the trip and that day already exists.
    if (start) {
      const bookingDate = start.slice(0, 10);
      const { data: day } = await supabase
        .from("itinerary_days")
        .select("id")
        .eq("trip_id", tripId)
        .eq("date", bookingDate)
        .maybeSingle();

      if (day) {
        const title =
          type === "flight" ? `Flight · ${String(form.get("airline") || form.get("provider") || "").trim()} ${String(form.get("flight_number") || "").trim()}` :
          type === "hotel" ? `Hotel · ${String(form.get("property_name") || form.get("provider") || "").trim()}` :
          type === "cruise" ? `Cruise · ${String(form.get("ship_name") || form.get("provider") || "").trim()}` :
          `${type[0].toUpperCase() + type.slice(1)} · ${String(form.get("provider") || "").trim()}`;

        await supabase.from("activities").insert({
          trip_id: tripId,
          itinerary_day_id: day.id,
          created_by: userId,
          title,
          activity_type: type === "hotel" ? "hotel" : type === "flight" ? "flight" : type === "cruise" ? "cruise" : type,
          start_datetime: start ? new Date(start).toISOString() : null,
          end_datetime: end ? new Date(end).toISOString() : null,
          booking_reference: String(form.get("booking_reference") || "").trim() || null,
          notes: "Created from booking",
          status: "booked",
        });
      }
    }

    if (childError) {
      setMessage(`Booking saved, but detail record failed: ${childError.message}`);
    } else {
      formEl.reset();
      setMessage("Booking saved and added to the itinerary when a matching day exists.");
    }
    await refresh();
    setBusy(false);
  }

  async function remove(id: string) {
    if (!confirm("Delete this booking?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) setMessage(error.message);
    else await refresh();
  }

  async function share(booking: Booking) {
    const d = details[booking.id];
    const extra =
      booking.booking_type === "flight" ? `${d?.airline || booking.provider || ""} ${d?.flight_number || ""} ${d?.departure_airport || ""} → ${d?.arrival_airport || ""}` :
      booking.booking_type === "hotel" ? `${d?.property_name || booking.provider || ""}${d?.address ? ` · ${d.address}` : ""}` :
      booking.booking_type === "cruise" ? `${d?.cruise_line || booking.provider || ""} ${d?.ship_name || ""}` :
      booking.provider || "Booking";
    const { error } = await supabase.rpc("share_trip_item_to_chat", {
      p_trip_id: tripId,
      p_message_text: `🎟 ${extra}${booking.booking_reference ? ` · Ref ${booking.booking_reference}` : ""}`,
      p_message_type: "booking",
    });
    setMessage(error ? error.message : "Booking shared to trip chat.");
  }

  return (
    <div className="advanced-bookings-stage5">
      <section className="panel">
        <div className="section-title-row"><div><h2>Bookings</h2><div className="muted">Full flight, hotel and cruise details.</div></div><span className="badge">{bookings.length}</span></div>
        {bookings.length ? <div className="booking-stack">
          {bookings.map(b => {
            const d = details[b.id];
            return <article className="booking-card advanced-booking-card" key={b.id}>
              <div className="booking-icon">{b.booking_type === "flight" ? "✈️" : b.booking_type === "hotel" ? "🏨" : b.booking_type === "cruise" ? "🚢" : "🎟️"}</div>
              <div className="booking-main">
                <div className="booking-title-row"><div><strong>{b.provider || b.booking_type}</strong><div className="muted">{b.booking_type}</div></div><span className="badge">{b.booking_status}</span></div>
                {b.booking_type === "flight" && d ? <div className="booking-detail-grid"><span>{d.airline} {d.flight_number}</span><span>{d.departure_airport} → {d.arrival_airport}</span><span>Seat {d.seat || "TBC"}{d.gate_departure?` · Gate ${d.gate_departure}`:""}</span><span>{d.cabin_class || ""}{d.baggage_allowance?` · ${d.baggage_allowance}`:""}</span>{d.boarding_datetime?<span>Boarding {new Date(d.boarding_datetime).toLocaleString("en-AU")}</span>:null}{d.checkin_opens_datetime?<span>Check-in opens {new Date(d.checkin_opens_datetime).toLocaleString("en-AU")}</span>:null}</div> : null}
                {b.booking_type === "hotel" && d ? <div className="booking-detail-grid"><span>{d.property_name}</span><span>{d.address}</span><span>{d.room_type || "Room TBC"}</span><span>{d.contact_phone || ""}</span></div> : null}
                {b.booking_type === "cruise" && d ? <div className="booking-detail-grid"><span>{d.cruise_line} · {d.ship_name}</span><span>{d.departure_port} → {d.arrival_port}</span><span>{d.cabin_type || "Cabin"} {d.cabin_number || ""}</span></div> : null}
                <div className="booking-meta">
                  {b.booking_reference ? <span>Ref: {b.booking_reference}</span> : null}
                  {b.total_amount != null ? <span>{Number(b.total_amount).toLocaleString("en-AU")} {b.currency}</span> : null}
                  <span>{b.payment_status.replaceAll("_"," ")}</span>
                </div>
                <div className="inline-actions"><button type="button" onClick={() => share(b)}>Share to Chat</button></div>
              </div>
              <button className="icon-danger" type="button" onClick={() => remove(b.id)}>×</button>
            </article>
          })}
        </div> : <div className="empty-mini">No bookings yet.</div>}
      </section>

      <form className="panel form-stack" onSubmit={save}>
        <div><h2>Add Detailed Booking</h2><div className="muted">Fields change automatically by booking type.</div></div>
        <div className="field"><label>Type</label><select value={type} onChange={e => setType(e.target.value)}><option value="flight">Flight</option><option value="hotel">Hotel</option><option value="cruise">Cruise</option><option value="tour">Tour</option><option value="transport">Transport</option><option value="restaurant">Restaurant</option><option value="other">Other</option></select></div>
        <div className="field"><label>Provider / booking name *</label><input name="provider" required /></div>
        <div className="form-grid">
          <div className="field"><label>Start</label><input name="start_datetime" type="datetime-local" /></div>
          <div className="field"><label>End</label><input name="end_datetime" type="datetime-local" /></div>
        </div>

        {type === "flight" ? <>
          <div className="form-grid">
            <div className="field"><label>Airline</label><input name="airline" /></div>
            <div className="field"><label>Flight number</label><input name="flight_number" /></div>
            <div className="field"><label>Departure airport</label><input name="departure_airport" placeholder="SYD" /></div>
            <div className="field"><label>Arrival airport</label><input name="arrival_airport" placeholder="YVR" /></div>
            <div className="field"><label>Departure terminal</label><input name="terminal_departure" /></div>
            <div className="field"><label>Arrival terminal</label><input name="terminal_arrival" /></div>
            <div className="field"><label>Seat</label><input name="seat" /></div>
            <div className="field"><label>Cabin class</label><input name="cabin_class" placeholder="Business / Premium Economy" /></div>
            <div className="field"><label>Departure gate</label><input name="gate_departure" /></div>
            <div className="field"><label>Arrival gate</label><input name="gate_arrival" /></div>
            <div className="field"><label>Baggage allowance</label><input name="baggage_allowance" placeholder="2 x 32 kg" /></div>
            <div className="field"><label>Departure timezone</label><input name="departure_timezone" placeholder="Australia/Sydney" /></div>
            <div className="field"><label>Arrival timezone</label><input name="arrival_timezone" placeholder="America/Vancouver" /></div>
          </div>
          <div className="form-grid">
            <div className="field"><label>Check-in opens</label><input name="checkin_opens_datetime" type="datetime-local" /></div>
            <div className="field"><label>Boarding time</label><input name="boarding_datetime" type="datetime-local" /></div>
          </div>
        </> : null}

        {type === "hotel" ? <>
          <div className="field"><label>Property name</label><input name="property_name" /></div>
          <div className="field"><label>Address</label><input name="address" /></div>
          <div className="form-grid">
            <div className="field"><label>Room type</label><input name="room_type" /></div>
            <div className="field"><label>Room number</label><input name="room_number" /></div>
            <div className="field"><label>Phone</label><input name="contact_phone" /></div>
            <div className="field"><label>Email</label><input name="contact_email" type="email" /></div>
          </div>
          <div className="field"><label>Website</label><input name="website_url" type="url" /></div>
        </> : null}

        {type === "cruise" ? <>
          <div className="form-grid">
            <div className="field"><label>Cruise line</label><input name="cruise_line" /></div>
            <div className="field"><label>Ship name</label><input name="ship_name" /></div>
            <div className="field"><label>Embarkation port</label><input name="departure_port" /></div>
            <div className="field"><label>Disembarkation port</label><input name="arrival_port" /></div>
            <div className="field"><label>Cabin number</label><input name="cabin_number" /></div>
            <div className="field"><label>Cabin type</label><input name="cabin_type" /></div>
          </div>
        </> : null}

        <div className="form-grid">
          <div className="field"><label>Booking reference</label><input name="booking_reference" /></div>
          <div className="field"><label>Confirmation number</label><input name="confirmation_number" /></div>
          <div className="field"><label>Total</label><input name="total_amount" type="number" min="0" step="0.01" /></div>
          <div className="field"><label>Currency</label><select name="currency" defaultValue="AUD">{["AUD","USD","CAD","NZD","EUR","GBP","JPY"].map(c => <option key={c}>{c}</option>)}</select></div>
          <div className="field"><label>Payment</label><select name="payment_status"><option value="unpaid">Unpaid</option><option value="deposit_paid">Deposit paid</option><option value="part_paid">Part paid</option><option value="paid">Paid</option></select></div>
          <div className="field"><label>Status</label><select name="booking_status" defaultValue="confirmed"><option value="planned">Planned</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option></select></div>
        </div>
        <div className="field"><label>Notes</label><textarea name="notes" /></div>
        {message ? <div className={message.includes("saved") || message.includes("shared") ? "success" : "error"}>{message}</div> : null}
        <button className="primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save Booking"}</button>
      </form>
    </div>
  );
}
