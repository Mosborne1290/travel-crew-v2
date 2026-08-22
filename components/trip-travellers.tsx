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
  invite_token: string;
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
  const [newInviteUrl, setNewInviteUrl] = useState("");

  async function refreshInvites() {
    const { data } = await supabase
      .from("trip_invites")
      .select("id,email,role,invite_token,expires_at,accepted_at")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });
    setInvites((data ?? []) as Invite[]);
  }

  function inviteUrl(token: string) {
    if (typeof window === "undefined") return `/invite/${token}`;
    return `${window.location.origin}/invite/${token}`;
  }

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setMessage("");
    setNewInviteUrl("");
    setBusy(true);

    const form = new FormData(formElement);
    const email = String(form.get("email") || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      setMessage("Enter a valid email address.");
      setBusy(false);
      return;
    }

    const { data, error } = await supabase
      .from("trip_invites")
      .insert({
        trip_id: tripId,
        email,
        role: String(form.get("role") || "member"),
        created_by: userId,
      })
      .select("id,email,role,invite_token,expires_at,accepted_at")
      .single();

    if (error || !data) {
      setMessage(error?.message || "Could not create the invitation.");
    } else {
      formElement.reset();
      await refreshInvites();
      setNewInviteUrl(inviteUrl(data.invite_token));
      setMessage("Invitation link created.");
    }
    setBusy(false);
  }

  async function deleteInvite(id: string) {
    const { error } = await supabase.from("trip_invites").delete().eq("id", id);
    if (error) setMessage(error.message);
    await refreshInvites();
  }

  async function copyLink(token: string) {
    const url = inviteUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Invitation link copied.");
    } catch {
      setNewInviteUrl(url);
      setMessage("Copy the invitation link shown below.");
    }
  }

  return (
    <div className="two-col stage-two-grid">
      <section className="panel">
        <div className="section-title-row">
          <div>
            <h2>Travellers</h2>
            <div className="muted">People who are already members of this trip.</div>
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
            <h3>Invitations</h3>
            <div className="muted">
              Share the secure link. The traveller creates or signs into their Travel Crew account,
              then joins this trip automatically.
            </div>
          </div>
        </div>

        {invites.length ? (
          <div className="invite-stack">
            {invites.map((invite) => (
              <div className="invite-row stage4-invite-row" key={invite.id}>
                <div>
                  <strong>{invite.email}</strong>
                  <div className="muted">
                    {invite.role} · {invite.accepted_at ? "accepted" : "pending"}
                  </div>
                </div>
                <div className="invite-actions">
                  {!invite.accepted_at ? (
                    <button className="secondary compact" type="button" onClick={() => copyLink(invite.invite_token)}>
                      Copy link
                    </button>
                  ) : null}
                  {!invite.accepted_at ? (
                    <button className="icon-danger" type="button" onClick={() => deleteInvite(invite.id)}>×</button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-mini">No invitations yet.</div>
        )}
      </section>

      <form className="panel form-stack" onSubmit={createInvite}>
        <div>
          <h3>Invite traveller</h3>
          <div className="muted">
            The link is valid for seven days and only works for the email address entered here.
          </div>
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

        {newInviteUrl ? (
          <div className="invite-link-box">
            <strong>Share this link</strong>
            <input value={newInviteUrl} readOnly aria-label="Invitation link" />
          </div>
        ) : null}

        {message ? <div className={message.includes("created") || message.includes("copied") ? "success" : "error"}>{message}</div> : null}

        <button className="primary" type="submit" disabled={busy}>Create invitation link</button>
      </form>
    </div>
  );
}
