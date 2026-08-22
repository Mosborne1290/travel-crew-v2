"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type InviteInfo = {
  invite_id: string;
  trip_id: string;
  trip_name: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
};

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const supabase = useMemo(() => createClient(), []);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const [{ data: inviteRows, error }, { data: authData }] = await Promise.all([
        supabase.rpc("get_trip_invite", { p_token: token }),
        supabase.auth.getUser(),
      ]);

      if (!active) return;

      if (error || !inviteRows?.length) {
        setMessage("This invitation is invalid or has expired.");
      } else {
        setInvite(inviteRows[0] as InviteInfo);
      }

      setSignedIn(Boolean(authData.user));
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [supabase, token]);

  async function acceptNow() {
    setBusy(true);
    setMessage("");

    const { data, error } = await supabase.rpc("accept_trip_invite", {
      p_token: token,
    });

    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.replace(`/trips/${data}`);
    router.refresh();
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invite) return;
    setBusy(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: invite.email,
      password,
    });

    if (error) {
      setBusy(false);
      setMessage(error.message);
      return;
    }

    setSignedIn(true);
    setBusy(false);
    await acceptNow();
  }

  async function createAccount() {
    if (!invite || password.length < 6) {
      setMessage("Choose a password with at least 6 characters.");
      return;
    }

    setBusy(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email: invite.email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/invite/${token}`,
      },
    });

    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session) {
      setSignedIn(true);
      await acceptNow();
    } else {
      setMessage(
        "Account created. Check your email to confirm your address, then return through the confirmation link to join the trip.",
      );
    }
  }

  if (loading) {
    return <main className="invite-public-page"><div className="invite-public-card">Loading invitation…</div></main>;
  }

  if (!invite) {
    return (
      <main className="invite-public-page">
        <div className="invite-public-card">
          <div className="brand-mark">✈</div>
          <h1>Travel Crew Invitation</h1>
          <div className="error">{message || "Invitation not found."}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="invite-public-page">
      <section className="invite-public-card">
        <div className="brand-lockup">
          <div className="brand-mark">✈</div>
          <div>
            <div className="brand-name">Travel Crew</div>
            <div className="muted">Private trip invitation</div>
          </div>
        </div>

        <div className="invite-trip-banner">
          <div className="eyebrow">You're invited</div>
          <h1>{invite.trip_name}</h1>
          <p>
            Join as <strong>{invite.role}</strong> using <strong>{invite.email}</strong>.
          </p>
        </div>

        {invite.accepted_at ? (
          <div className="success">This invitation has already been accepted.</div>
        ) : signedIn ? (
          <>
            <p className="muted">You are signed in. Add this trip to your Travel Crew account.</p>
            <button className="primary" type="button" onClick={acceptNow} disabled={busy}>
              {busy ? "Joining…" : "Join Trip"}
            </button>
          </>
        ) : (
          <form className="form-stack" onSubmit={signIn}>
            <div className="field">
              <label>Email</label>
              <input value={invite.email} readOnly />
            </div>
            <div className="field">
              <label htmlFor="invite-password">Password</label>
              <input
                id="invite-password"
                type="password"
                minLength={6}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button className="primary" type="submit" disabled={busy}>
              Sign in & Join
            </button>

            <button className="secondary" type="button" onClick={createAccount} disabled={busy}>
              Create New Travel Crew Account
            </button>
          </form>
        )}

        {message ? (
          <div className={message.startsWith("Account created") ? "success" : "error"}>{message}</div>
        ) : null}
      </section>
    </main>
  );
}
