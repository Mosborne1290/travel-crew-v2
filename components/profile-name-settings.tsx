"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ProfileNameSettings({
  initialDisplayName,
  initialFirstName,
}: {
  initialDisplayName: string;
  initialFirstName: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const displayName = String(form.get("display_name") || "").trim();
    const firstName = String(form.get("first_name") || "").trim();

    if (!displayName) {
      setMessage("Enter the nickname or preferred name you want Travel Crew to use.");
      return;
    }

    setBusy(true);
    setMessage("");

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setMessage("Please sign in again before updating your profile.");
      setBusy(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        first_name: firstName || displayName,
      })
      .eq("id", auth.user.id);

    if (profileError) {
      setMessage(profileError.message);
      setBusy(false);
      return;
    }

    // Supabase Auth's dashboard Display name is sourced from user metadata.
    // Set the common metadata keys so it displays consistently.
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        display_name: displayName,
        name: displayName,
        full_name: displayName,
        first_name: firstName || displayName,
      },
    });

    if (authError) {
      setMessage(`Travel Crew name saved, but Supabase Auth metadata needs attention: ${authError.message}`);
    } else {
      setMessage("Preferred name saved. Travel Crew and Supabase Auth are now using it.");
    }

    setBusy(false);
    router.refresh();
  }

  return (
    <form className="profile-name-form" onSubmit={save}>
      <div className="form-grid">
        <div className="field">
          <label>Nickname / preferred name *</label>
          <input
            name="display_name"
            required
            maxLength={80}
            defaultValue={initialDisplayName}
            placeholder="Melinda"
          />
          <small>This is the name shown throughout Travel Crew.</small>
        </div>
        <div className="field">
          <label>First name</label>
          <input
            name="first_name"
            maxLength={80}
            defaultValue={initialFirstName}
            placeholder="Melinda"
          />
        </div>
      </div>
      <button className="secondary" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save Name"}
      </button>
      {message ? <div className={message.includes("saved") || message.includes("now using") ? "success" : "error"}>{message}</div> : null}
    </form>
  );
}
