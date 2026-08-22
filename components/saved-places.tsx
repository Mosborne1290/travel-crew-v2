"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Place = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  address: string | null;
  website_url: string | null;
  notes: string | null;
};

export function SavedPlaces({
  tripId,
  userId,
  initialPlaces,
}: {
  tripId: string;
  userId: string;
  initialPlaces: Place[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [places, setPlaces] = useState(initialPlaces);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data } = await supabase
      .from("saved_places")
      .select("id,name,description,category,address,website_url,notes")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });
    setPlaces((data ?? []) as Place[]);
  }

  async function addPlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();

    if (!name) {
      setMessage("Place name is required.");
      setBusy(false);
      return;
    }

    const { error } = await supabase.from("saved_places").insert({
      trip_id: tripId,
      created_by: userId,
      name,
      category: String(form.get("category") || "attraction"),
      description: String(form.get("description") || "").trim() || null,
      address: String(form.get("address") || "").trim() || null,
      website_url: String(form.get("website_url") || "").trim() || null,
      notes: String(form.get("notes") || "").trim() || null,
    });

    if (error) setMessage(error.message);
    else {
      event.currentTarget.reset();
      await refresh();
      setMessage("Place saved.");
    }
    setBusy(false);
  }

  async function remove(id: string) {
    const { error } = await supabase.from("saved_places").delete().eq("id", id);
    if (error) setMessage(error.message);
    await refresh();
  }

  return (
    <div className="two-col stage-two-grid">
      <section className="panel">
        <div className="section-title-row">
          <div>
            <h2>Saved Places</h2>
            <div className="muted">Restaurants, attractions and ideas worth remembering.</div>
          </div>
          <span className="badge">{places.length} saved</span>
        </div>

        {places.length ? (
          <div className="place-grid">
            {places.map((place) => (
              <article className="place-card" key={place.id}>
                <div className="place-symbol">
                  {place.category === "restaurant" ? "🍽️" :
                   place.category === "cafe" ? "☕" :
                   place.category === "shopping" ? "🛍️" :
                   place.category === "beach" ? "🏖️" :
                   place.category === "tour" ? "🎟️" : "📍"}
                </div>
                <div className="place-copy">
                  <strong>{place.name}</strong>
                  <span className="badge">{place.category || "place"}</span>
                  {place.address ? <div className="muted">{place.address}</div> : null}
                  {place.description ? <p>{place.description}</p> : null}
                  {place.website_url ? (
                    <a className="text-link" href={place.website_url} target="_blank" rel="noreferrer">
                      Visit website ↗
                    </a>
                  ) : null}
                </div>
                <button className="icon-danger" type="button" onClick={() => remove(place.id)}>×</button>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-mini">No saved places yet.</div>
        )}
      </section>

      <form className="panel form-stack" onSubmit={addPlace}>
        <div>
          <h3>Add a place</h3>
          <div className="muted">Save somewhere you want to visit later.</div>
        </div>
        <div className="field">
          <label htmlFor="place-name">Name *</label>
          <input id="place-name" name="name" required placeholder="Miku Vancouver" />
        </div>
        <div className="field">
          <label htmlFor="place-category">Category</label>
          <select id="place-category" name="category" defaultValue="restaurant">
            <option value="restaurant">Restaurant</option>
            <option value="cafe">Cafe</option>
            <option value="attraction">Attraction</option>
            <option value="tour">Tour</option>
            <option value="shopping">Shopping</option>
            <option value="beach">Beach</option>
            <option value="museum">Museum</option>
            <option value="park">Park</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="place-address">Address</label>
          <input id="place-address" name="address" />
        </div>
        <div className="field">
          <label htmlFor="place-url">Website</label>
          <input id="place-url" name="website_url" type="url" placeholder="https://…" />
        </div>
        <div className="field">
          <label htmlFor="place-description">Description</label>
          <textarea id="place-description" name="description" />
        </div>
        <div className="field">
          <label htmlFor="place-notes">Notes</label>
          <textarea id="place-notes" name="notes" />
        </div>
        {message ? <div className={message.includes("saved") ? "success" : "error"}>{message}</div> : null}
        <button className="primary" type="submit" disabled={busy}>Save place</button>
      </form>
    </div>
  );
}
