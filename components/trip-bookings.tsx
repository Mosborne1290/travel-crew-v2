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

function niceDate(value: string | null) {
  if (!value) return "Date TBC";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function TripBookings({
  tripId,
  userId,
  initialBookings,
}: {
  tripId: string;
  userId: string;
  initialBookings: Booking[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [bookings, setBookings] = useState(initialBookings);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    const { data } = await supabase
      .from("bookings")
      .select("id,booking_type,provider,booking_reference,confirmation_number,start_datetime,end_datetime,total_amount,currency,payment_status,booking_status,notes")
      .eq("trip_id", tripId)
      .order("start_datetime", { ascending: true, nullsFirst: false });

    setBookings((data ?? []) as Booking[]);
  }

  async function addBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setMessage("");
    setBusy(true);

    const form = new FormData(formElement);
    const provider = String(form.get("provider") || "").trim();
    const start = String(form.get("start_datetime") || "");
    const end = String(form.get("end_datetime") || "");

    if (!provider) {
      setBusy(false);
      setMessage("Provider / booking name is required.");
      return;
    }

    const { error } = await supabase.from("bookings").insert({
      trip_id: tripId,
      created_by: userId,
      booking_type: String(form.get("booking_type") || "other"),
      provider,
      booking_reference: String(form.get("booking_reference") || "").trim() || null,
      confirmation_number: String(form.get("confirmation_number") || "").trim() || null,
      start_datetime: start ? new Date(start).toISOString() : null,
      end_datetime: end ? new Date(end).toISOString() : null,
      total_amount: form.get("total_amount") ? Number(form.get("total_amount")) : null,
      currency: "AUD",
      payment_status: String(form.get("payment_status") || "unpaid"),
      booking_status: String(form.get("booking_status") || "confirmed"),
      notes: String(form.get("notes") || "").trim() || null,
    });

    if (error) setMessage(error.message);
    else {
      formElement.reset();
      await refresh();
      setMessage("Booking saved.");
    }
    setBusy(false);
  }

  async function removeBooking(id: string) {
    if (!confirm("Delete this booking?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) setMessage(error.message);
    await refresh();
  }

  return (
    <div className="two-col stage-two-grid">
      <section className="panel">
        <div className="section-title-row">
          <div>
            <h2>Bookings</h2>
            <div className="muted">Flights, hotels, cruises, tours and transport.</div>
          </div>
          <span className="badge">{bookings.length} saved</span>
        </div>

        {bookings.length ? (
          <div className="booking-stack">
            {bookings.map((booking) => (
              <article className="booking-card" key={booking.id}>
                <div className="booking-icon">
                  {booking.booking_type === "flight" ? "✈️" :
                   booking.booking_type === "hotel" ? "🏨" :
                   booking.booking_type === "cruise" ? "🚢" :
                   booking.booking_type === "tour" ? "🎟️" :
                   booking.booking_type === "transport" ? "🚕" :
                   booking.booking_type === "restaurant" ? "🍽️" : "📌"}
                </div>
                <div className="booking-main">
                  <div className="booking-title-row">
                    <div>
                      <strong>{booking.provider || booking.booking_type}</strong>
                      <div className="muted">{booking.booking_type}</div>
                    </div>
                    <span className="badge">{booking.booking_status}</span>
                  </div>
                  <div className="booking-meta">
                    <span>📅 {niceDate(booking.start_datetime)}</span>
                    {booking.booking_reference ? <span>Ref: {booking.booking_reference}</span> : null}
                    {booking.total_amount != null ? <span>${Number(booking.total_amount).toLocaleString("en-AU")} {booking.currency || "AUD"}</span> : null}
                    <span>{booking.payment_status.replace("_", " ")}</span>
                  </div>
                  {booking.notes ? <p>{booking.notes}</p> : null}
                </div>
                <button className="icon-danger" type="button" onClick={() => removeBooking(booking.id)}>×</button>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-mini">No bookings saved yet.</div>
        )}
      </section>

      <form className="panel form-stack" onSubmit={addBooking}>
        <div>
          <h3>Add booking</h3>
          <div className="muted">Save the important confirmation details.</div>
        </div>

        <div className="field">
          <label htmlFor="booking-type">Type</label>
          <select id="booking-type" name="booking_type" defaultValue="hotel">
            <option value="flight">Flight</option>
            <option value="hotel">Hotel</option>
            <option value="cruise">Cruise</option>
            <option value="tour">Tour</option>
            <option value="transport">Transport</option>
            <option value="restaurant">Restaurant</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="provider">Provider / booking name *</label>
          <input id="provider" name="provider" required placeholder="Royal Caribbean, Qantas, hotel name…" />
        </div>

        <div className="field">
          <label htmlFor="booking-ref">Booking reference</label>
          <input id="booking-ref" name="booking_reference" />
        </div>

        <div className="field">
          <label htmlFor="confirmation">Confirmation number</label>
          <input id="confirmation" name="confirmation_number" />
        </div>

        <div className="field">
          <label htmlFor="booking-start">Start</label>
          <input id="booking-start" name="start_datetime" type="datetime-local" />
        </div>

        <div className="field">
          <label htmlFor="booking-end">End</label>
          <input id="booking-end" name="end_datetime" type="datetime-local" />
        </div>

        <div className="field">
          <label htmlFor="booking-total">Total (AUD)</label>
          <input id="booking-total" name="total_amount" type="number" min="0" step="0.01" />
        </div>

        <div className="field">
          <label htmlFor="payment-status">Payment</label>
          <select id="payment-status" name="payment_status" defaultValue="unpaid">
            <option value="unpaid">Unpaid</option>
            <option value="deposit_paid">Deposit paid</option>
            <option value="part_paid">Part paid</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="booking-status">Booking status</label>
          <select id="booking-status" name="booking_status" defaultValue="confirmed">
            <option value="planned">Planned</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="booking-notes">Notes</label>
          <textarea id="booking-notes" name="notes" />
        </div>

        {message ? <div className={message.includes("saved") ? "success" : "error"}>{message}</div> : null}
        <button className="primary" disabled={busy} type="submit">Save booking</button>
      </form>
    </div>
  );
}
