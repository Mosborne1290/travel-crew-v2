"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PexelsPhoto = {
  id: number;
  imageUrl: string;
  thumbnailUrl: string;
  photographer: string;
  photographerUrl: string;
  alt: string;
};

export function NewTripForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [photos, setPhotos] = useState<PexelsPhoto[]>([]);
  const [selected, setSelected] = useState<PexelsPhoto | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  async function searchPhotos() {
    setMessage("");
    if (!destination.trim()) {
      setMessage("Enter a destination first.");
      return;
    }

    setSearching(true);
    setPhotos([]);
    setSelected(null);

    try {
      const response = await fetch(
        `/api/pexels/search?query=${encodeURIComponent(destination.trim() + " travel")}`,
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Photo search failed.");
      }

      setPhotos(payload.photos ?? []);
      if ((payload.photos ?? []).length === 0) {
        setMessage("No destination photos were found. You can create the trip without one.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Photo search failed.");
    } finally {
      setSearching(false);
    }
  }

  function chooseCover(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setCoverFile(next);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(next ? URL.createObjectURL(next) : null);
    if (next) setSelected(null);
  }

  async function createTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSaving(true);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const startDate = String(form.get("start_date") || "") || null;
    const endDate = String(form.get("end_date") || "") || null;

    if (!name || !destination.trim()) {
      setSaving(false);
      setMessage("Trip name and primary destination are required.");
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      setSaving(false);
      setMessage("The end date cannot be before the start date.");
      return;
    }

    const supabase = createClient();

    const { data: trip, error } = await supabase
      .from("trips")
      .insert({
        created_by: userId,
        name,
        description: String(form.get("description") || "").trim() || null,
        trip_type: String(form.get("trip_type") || "holiday"),
        status: String(form.get("status") || "planning"),
        start_date: startDate,
        end_date: endDate,
        primary_destination: destination.trim(),
        home_currency: "AUD",
        budget_amount: form.get("budget_amount")
          ? Number(form.get("budget_amount"))
          : null,
        cover_image_url: selected?.imageUrl ?? null,
        cover_image_source: selected ? "pexels" : null,
      })
      .select("id")
      .single();

    if (error || !trip) {
      setSaving(false);
      setMessage(error?.message || "Could not create the trip.");
      return;
    }

    // Make the creator the trip organiser. The RLS installer allows the
    // trip creator to do this immediately after the trip is created.
    const { error: memberError } = await supabase.from("trip_members").insert({
      trip_id: trip.id,
      user_id: userId,
      role: "organiser",
    });

    if (memberError) {
      setMessage(
        `Trip created, but organiser membership needs attention: ${memberError.message}`,
      );
    }

    // If the traveller supplied their own cover, upload it after organiser
    // membership exists so the trip-covers RLS policy allows the upload.
    if (!memberError && coverFile) {
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (allowed.includes(coverFile.type) && coverFile.size <= 15 * 1024 * 1024) {
        const ext = (coverFile.name.split(".").pop() || "jpg")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `${trip.id}/hero-${Date.now()}.${ext}`;
        const upload = await supabase.storage
          .from("trip-covers")
          .upload(path, coverFile, { contentType: coverFile.type, upsert: false });

        if (!upload.error) {
          const { data: coverData } = supabase.storage.from("trip-covers").getPublicUrl(path);
          await supabase
            .from("trips")
            .update({ cover_image_url: coverData.publicUrl, cover_image_source: "upload" })
            .eq("id", trip.id);
        } else {
          setMessage(`Trip created, but the custom hero image could not be uploaded: ${upload.error.message}`);
        }
      }
    }

    // Create the primary destination record so itinerary/weather/map features
    // have a destination to attach to during later build stages.
    await supabase.from("destinations").insert({
      trip_id: trip.id,
      name: destination.trim(),
      city: destination.trim(),
      sort_order: 0,
    });

    if (selected) {
      const { data: destinationRow } = await supabase
        .from("destinations")
        .select("id")
        .eq("trip_id", trip.id)
        .order("sort_order")
        .limit(1)
        .maybeSingle();

      if (destinationRow) {
        await supabase.from("destination_images").insert({
          destination_id: destinationRow.id,
          provider: "pexels",
          provider_image_id: String(selected.id),
          image_url: selected.imageUrl,
          thumbnail_url: selected.thumbnailUrl,
          photographer_name: selected.photographer,
          photographer_url: selected.photographerUrl,
          alt_text: selected.alt,
          selected: true,
        });
      }
    }

    setSaving(false);
    router.push(`/trips/${trip.id}`);
    router.refresh();
  }

  return (
    <form className="form-card form-stack" onSubmit={createTrip}>
      <div className="form-grid">
        <div className="field span-2">
          <label htmlFor="name">Trip name *</label>
          <input id="name" name="name" required placeholder="Alaska & Hawaii 2027" />
        </div>

        <div className="field span-2">
          <label htmlFor="destination">Primary destination *</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              id="destination"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Vancouver, Canada"
              style={{ flex: "1 1 300px" }}
            />
            <button className="secondary" type="button" onClick={searchPhotos} disabled={searching}>
              {searching ? "Finding photos…" : "Find free photos"}
            </button>
          </div>
        </div>

        {photos.length ? (
          <div className="field span-2">
            <label>Choose a Pexels cover photo</label>
            <div className="image-search-results">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  className={`image-choice ${selected?.id === photo.id ? "selected" : ""}`}
                  onClick={() => setSelected(photo)}
                >
                  <img src={photo.thumbnailUrl} alt={photo.alt || destination} />
                  <div className="image-credit">Photo by {photo.photographer} · Pexels</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="field span-2">
          <label>Or upload your own trip hero image</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseCover} />
          <small>JPG, PNG or WebP · maximum 15 MB. Your uploaded photo takes priority over a Pexels selection.</small>
          {coverPreview ? <div className="new-trip-cover-preview" style={{ backgroundImage: `url("${coverPreview}")` }} /> : null}
        </div>

        <div className="field">
          <label htmlFor="start_date">Start date</label>
          <input id="start_date" name="start_date" type="date" />
        </div>

        <div className="field">
          <label htmlFor="end_date">End date</label>
          <input id="end_date" name="end_date" type="date" />
        </div>

        <div className="field">
          <label htmlFor="trip_type">Trip type</label>
          <select id="trip_type" name="trip_type" defaultValue="holiday">
            <option value="holiday">Holiday</option>
            <option value="cruise">Cruise</option>
            <option value="road_trip">Road Trip</option>
            <option value="weekend">Weekend</option>
            <option value="business">Business</option>
            <option value="group_trip">Group Trip</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue="planning">
            <option value="dreaming">Dreaming</option>
            <option value="planning">Planning</option>
            <option value="booked">Booked</option>
            <option value="travelling">Travelling</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="budget_amount">Trip budget (AUD)</label>
          <input id="budget_amount" name="budget_amount" type="number" min="0" step="0.01" />
        </div>

        <div className="field span-2">
          <label htmlFor="description">Notes</label>
          <textarea
            id="description"
            name="description"
            placeholder="What are you planning for this trip?"
          />
        </div>
      </div>

      {message ? <div className={message.includes("created, but") ? "error" : "error"}>{message}</div> : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="primary" type="submit" disabled={saving}>
          {saving ? "Creating trip…" : "Create Trip"}
        </button>
      </div>
    </form>
  );
}
