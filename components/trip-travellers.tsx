"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Member = {
  id: string;
  user_id: string;
  role: string;
  display_name: string;
};

type Invite = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
};

export function TripTravellers({
  tripId,
  userId,
  initialMembers,
  initialInvites,
}: {
  tripId: string;
  userId: string;
  initialMembers: Member[];
  initialInvites: Invite[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [members] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function refreshInvites() {
    const { data } = await supabase
      .from("trip_invites")
      .select("id,email,role,expires_at,accepted_at")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });
    setInvites((data ?? []) as Invite[]);
  }

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      setMessage("Enter a valid email address.");
      setBusy(false);
      return;
    }

    const { error } = await supabase.from("trip_invites").insert({
      trip_id: tripId,
      email,
      role: String(form.get("role") || "member"),
      created_by: userId,
    });

    if (error) setMessage(error.message);
    else {
      event.currentTarget.reset();
      await refreshInvites();
      setMessage("Traveller invitation prepared.");
    }
    setBusy(false);
  }

  async function deleteInvite(id: string) {
    const { error } = await supabase.from("trip_invites").delete().eq("id", id);
    if (error) setMessage(error.message);
    await refreshInvites();
  }

  return (
    <div className="two-col stage-two-grid">
      <section className="panel">
        <div className="section-title-row">
          <div>
            <h2>Travellers</h2>
            <div className="muted">People already connected to this trip.</div>
          </div>
          <span className="badge">{members.length} member(s)</span>
        </div>

        <div className="traveller-stack">
          {members.map((member) => (
            <div className="traveller-card" key={member.id}>
              <div className="avatar-circle">
                {(member.display_name || "T").slice(0, 1).toUpperCase()}
              </div>
              <div>
                <strong>{member.display_name || "Traveller"}</strong>
                <div className="muted">{member.role}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="section-title-row" style={{ marginTop: 26 }}>
          <div>
            <h3>Pending invitations</h3>
            <div className="muted">Stage 2 stores invitations ready for automated email sending later.</div>
          </div>
        </div>

        {invites.length ? (
          <div className="invite-stack">
            {invites.map((invite) => (
              <div className="invite-row" key={invite.id}>
                <div>
                  <strong>{invite.email}</strong>
                  <div className="muted">{invite.role} · {invite.accepted_at ? "accepted" : "pending"}</div>
                </div>
                {!invite.accepted_at ? (
                  <button className="icon-danger" type="button" onClick={() => deleteInvite(invite.id)}>×</button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-mini">No pending invitations.</div>
        )}
      </section>

      <form className="panel form-stack" onSubmit={createInvite}>
        <div>
          <h3>Invite traveller</h3>
          <div className="muted">Add the traveller now. Automatic invitation emails come in Stage 3.</div>
        </div>

        <div className="field">
          <label htmlFor="traveller-email">Email *</label>
          <input id="traveller-email" name="email" type="email" required placeholder="friend@example.com" />
        </div>

        <div className="field">
          <label htmlFor="traveller-role">Trip role</label>
          <select id="traveller-role" name="role" defaultValue="member">
            <option value="organiser">Organiser</option>
            <option value="member">Member</option>
            <option value="guest">Guest</option>
          </select>
        </div>

        {message ? <div className={message.includes("prepared") ? "success" : "error"}>{message}</div> : null}
        <button className="primary" type="submit" disabled={busy}>Add invitation</button>
      </form>
    </div>
  );
}
