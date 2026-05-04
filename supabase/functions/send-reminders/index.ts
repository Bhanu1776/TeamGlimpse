// Supabase Edge Function: send daily reminder push notifications
// Triggered by pg_cron every 15 minutes.
// Deploy: supabase functions deploy send-reminders
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webPush from "npm:web-push@3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

webPush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

Deno.serve(async () => {
  const now = new Date();

  // Find users whose reminder is due (within ±7 minutes of now in their local time)
  const { data: prefs, error } = await supabase
    .from("notification_preferences")
    .select("user_id, reminder_time, evening_cutoff_hour, tz, enabled")
    .eq("enabled", true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const results: string[] = [];

  for (const pref of prefs ?? []) {
    // Compute user's local time
    const localTimeStr = now.toLocaleTimeString("en-GB", {
      timeZone: pref.tz,
      hour: "2-digit",
      minute: "2-digit",
    });
    const [localH, localM] = localTimeStr.split(":").map(Number);
    const localMinutes = localH * 60 + localM;

    const [prefH, prefM] = pref.reminder_time.split(":").map(Number);
    const prefMinutes = prefH * 60 + prefM;

    // Only fire within a ±7 minute window
    if (Math.abs(localMinutes - prefMinutes) > 7) continue;

    // Compute target date in user's timezone
    const localDateStr = now.toLocaleDateString("en-CA", { timeZone: pref.tz });
    const localDate = new Date(localDateStr);
    const targetDate =
      localH >= pref.evening_cutoff_hour
        ? new Date(localDate.getTime() + 86_400_000).toISOString().slice(0, 10)
        : localDateStr;

    // Skip if the user has already set a non-undecided status for targetDate
    const { data: existing } = await supabase
      .from("daily_statuses")
      .select("status")
      .eq("user_id", pref.user_id)
      .eq("status_date", targetDate)
      .single();

    if (existing && existing.status !== "undecided") continue;

    // Dedupe: insert delivery record; skip if already sent today
    const { error: insertErr } = await supabase.from("notification_deliveries").insert({
      user_id: pref.user_id,
      kind: "evening_reminder",
      target_date: targetDate,
      status: "pending",
    });
    if (insertErr) continue; // unique constraint hit = already sent

    // Fetch push subscriptions for this user
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth_key")
      .eq("user_id", pref.user_id);

    for (const sub of subs ?? []) {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify({
            title: "TeamGlimpse",
            body: "What's your plan today? Tap to set your status.",
            data: { url: "/home" },
          })
        );
        results.push(`sent:${pref.user_id}`);
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // Subscription expired — remove it
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
        await supabase
          .from("notification_deliveries")
          .update({ status: "failed", error: String(err) })
          .eq("user_id", pref.user_id)
          .eq("kind", "evening_reminder")
          .eq("target_date", targetDate);
      }
    }

    // Mark delivery as sent
    await supabase
      .from("notification_deliveries")
      .update({ status: "sent" })
      .eq("user_id", pref.user_id)
      .eq("kind", "evening_reminder")
      .eq("target_date", targetDate)
      .eq("status", "pending");
  }

  return new Response(JSON.stringify({ processed: results.length, results }), { status: 200 });
});
