"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Photo = {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  caption: string | null;
  taken_at: string | null;
  uploaded_at: string;
  uploaded_by: string;
};

export function TripPhotos({
  tripId,
  userId,
  initialPhotos,
  signedUrls,
}: {
  tripId: string;
  userId: string;
  initialPhotos: Photo[];
  signedUrls: Record<string, string>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [photos, setPhotos] = useState(initialPhotos);
  const [urls, setUrls] = useState(signedUrls);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data } = await supabase
      .from("photos")
      .select("id,storage_path,thumbnail_path,caption,taken_at,uploaded_at,uploaded_by")
      .eq("trip_id", tripId)
      .order("uploaded_at", { ascending: false });

    const next = (data ?? []) as Photo[];
    setPhotos(next);

    const nextUrls: Record<string, string> = {};
    for (const photo of next) {
      const result = await supabase.storage
        .from("trip-photos")
        .createSignedUrl(photo.storage_path, 60 * 60);
      if (result.data?.signedUrl) nextUrls[photo.id] = result.data.signedUrl;
    }
    setUrls(nextUrls);
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setMessage("");
  }

  async function uploadPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setMessage("");

    if (!file) {
      setMessage("Choose a photo first.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setMessage("Photo must be under 15 MB.");
      return;
    }

    setBusy(true);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${tripId}/${userId}/${crypto.randomUUID()}-${safeName}`;

    const upload = await supabase.storage.from("trip-photos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

    if (upload.error) {
      setMessage(upload.error.message);
      setBusy(false);
      return;
    }

    const insert = await supabase.from("photos").insert({
      trip_id: tripId,
      uploaded_by: userId,
      storage_path: path,
      caption: caption.trim() || null,
      taken_at: null,
    });

    if (insert.error) {
      await supabase.storage.from("trip-photos").remove([path]);
      setMessage(insert.error.message);
      setBusy(false);
      return;
    }

    formElement.reset();
    setFile(null);
    setCaption("");
    await refresh();
    setMessage("Photo uploaded.");
    setBusy(false);
  }

  async function deletePhoto(photo: Photo) {
    if (!confirm("Delete this photo?")) return;

    const record = await supabase.from("photos").delete().eq("id", photo.id);
    if (record.error) {
      setMessage(record.error.message);
      return;
    }

    await supabase.storage.from("trip-photos").remove([photo.storage_path]);
    await refresh();
  }

  return (
    <div className="photo-stage3">
      <form className="panel form-stack" onSubmit={uploadPhoto}>
        <div className="section-title-row">
          <div>
            <h2>Add Trip Photo</h2>
            <div className="muted">Upload your own private holiday photos to this trip.</div>
          </div>
          <span className="badge">{photos.length} photo(s)</span>
        </div>

        <div className="form-grid">
          <div className="field span-2">
            <label htmlFor="trip-photo-file">Photo *</label>
            <input
              id="trip-photo-file"
              type="file"
              accept="image/*"
              onChange={chooseFile}
              required
            />
          </div>

          <div className="field span-2">
            <label htmlFor="trip-photo-caption">Caption</label>
            <input
              id="trip-photo-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Stanley Park on our first afternoon"
            />
          </div>
        </div>

        {message ? <div className={message.includes("uploaded") ? "success" : "error"}>{message}</div> : null}

        <button className="primary" type="submit" disabled={busy || !file}>
          {busy ? "Uploading…" : "Upload Photo"}
        </button>
      </form>

      <section className="photo-gallery">
        {photos.length ? (
          photos.map((photo) => (
            <article className="photo-tile" key={photo.id}>
              {urls[photo.id] ? (
                <img src={urls[photo.id]} alt={photo.caption || "Travel Crew trip photo"} />
              ) : (
                <div className="photo-placeholder">📸</div>
              )}
              <div className="photo-tile-body">
                <div>
                  <strong>{photo.caption || "Trip photo"}</strong>
                  <div className="muted">
                    {new Intl.DateTimeFormat("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }).format(new Date(photo.uploaded_at))}
                  </div>
                </div>
                {photo.uploaded_by === userId ? (
                  <button className="icon-danger" type="button" onClick={() => deletePhoto(photo)}>×</button>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <h3>No trip photos yet</h3>
            <p className="muted">Upload the first memory for this adventure.</p>
          </div>
        )}
      </section>
    </div>
  );
}
