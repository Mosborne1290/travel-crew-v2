import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Content-Type": "application/json",
};

Deno.serve(async (request) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const supplied = request.headers.get("x-cron-secret");

  if (!cronSecret || supplied !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorised" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT");

  if (!supabaseUrl || !serviceRole || !publicKey || !privateKey || !subject) {
    return new Response(
      JSON.stringify({ error: "Push-reminder function secrets are incomplete." }),
      { status: 503, headers: corsHeaders },
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const from = new Date(Date.now() - 5 * 60_000).toISOString();
  const to = new Date(Date.now() + 15 * 60_000).toISOString();

  const { data: reminders, error } = await supabase
    .from("trip_reminders")
    .select("id,user_id,title,message,target_url,remind_at")
    .eq("completed", false)
    .is("notified_at", null)
    .gte("remind_at", from)
    .lte("remind_at", to)
    .limit(100);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  let delivered = 0;
  let expired = 0;

  for (const reminder of reminders ?? []) {
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth_key")
      .eq("user_id", reminder.user_id);

    for (const subscription of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth_key,
            },
          },
          JSON.stringify({
            title: `Travel Crew · ${reminder.title}`,
            body: reminder.message || "You have a trip reminder.",
            url: reminder.target_url || "/dashboard",
            tag: `reminder-${reminder.id}`,
          }),
        );
        delivered++;
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          expired++;
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
        }
      }
    }

    await supabase
      .from("trip_reminders")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", reminder.id);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      reminders: reminders?.length ?? 0,
      delivered,
      expired,
    }),
    { headers: corsHeaders },
  );
});
