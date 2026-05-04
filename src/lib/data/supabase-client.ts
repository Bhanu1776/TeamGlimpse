import type {
  User,
  Room,
  RoomDetail,
  HomeSummary,
  ReminderPreference,
  DailyStatus,
} from "@/types/domain";
import { createClient } from "@/lib/supabase/browser";
import { getTargetDateKey, isAfterHours } from "@/lib/utils/target-date";

// Cached cutoff hour so getHomeSummary/getRoomById don't need an extra round-trip.
// Updated on every getReminderPreference / updateReminderPreference call.
let cachedCutoffHour = 18;

function supabase() {
  return createClient();
}

async function getAuthUser() {
  const { data: { user } } = await supabase().auth.getUser();
  return user;
}

export const supabaseClient = {
  // Not used — login is handled by signInWithGoogle() in @/lib/auth/session.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async signInMock(..._args: unknown[]): Promise<User> {
    throw new Error("signInMock is not available. Use Google sign-in.");
  },

  async signOut(): Promise<void> {
    await supabase().auth.signOut();
  },

  async getCurrentUser(): Promise<User | null> {
    const authUser = await getAuthUser();
    if (!authUser) return null;

    const { data: profile } = await supabase()
      .from("profiles")
      .select("display_name, email, avatar_url, onboarding_complete")
      .eq("id", authUser.id)
      .single();

    if (!profile) return null;

    return {
      id: authUser.id,
      name: profile.display_name ?? profile.email,
      email: profile.email,
      avatarUrl: profile.avatar_url ?? "",
      onboardingComplete: profile.onboarding_complete,
    };
  },

  async completeOnboarding(displayName: string): Promise<void> {
    const authUser = await getAuthUser();
    if (!authUser) return;
    await supabase()
      .from("profiles")
      .update({ display_name: displayName, onboarding_complete: true })
      .eq("id", authUser.id);
  },

  async getHomeSummary(): Promise<HomeSummary | null> {
    const dateKey = getTargetDateKey(cachedCutoffHour);
    const forTomorrow = isAfterHours(cachedCutoffHour);

    const { data, error } = await supabase().rpc("get_home_summary", {
      p_target_date: dateKey,
    });

    if (error || !data) return null;

    // RPC returns jsonb — cast to HomeSummary shape
    const summary = data as unknown as HomeSummary & { isForTomorrow: boolean };
    return { ...summary, isForTomorrow: forTomorrow };
  },

  async getRooms(): Promise<Room[]> {
    const { data, error } = await supabase()
      .from("rooms")
      .select(`
        id,
        name,
        invite_code,
        room_members(count)
      `)
      .order("created_at");

    if (error || !data) return [];

    return data.map((r) => ({
      id: r.id,
      name: r.name,
      inviteCode: r.invite_code,
      memberCount: (r.room_members as unknown as { count: number }[])[0]?.count ?? 0,
    }));
  },

  async getRoomById(roomId: string): Promise<RoomDetail | null> {
    const dateKey = getTargetDateKey(cachedCutoffHour);
    const forTomorrow = isAfterHours(cachedCutoffHour);

    const { data, error } = await supabase().rpc("get_room_detail", {
      p_room_id: roomId,
      p_target_date: dateKey,
    });

    if (error || !data) return null;

    const detail = data as unknown as RoomDetail;
    return { ...detail, isForTomorrow: forTomorrow };
  },

  async updateTodayStatus(status: DailyStatus): Promise<void> {
    const authUser = await getAuthUser();
    if (!authUser) return;

    const dateKey = getTargetDateKey(cachedCutoffHour);
    await supabase().from("daily_statuses").upsert(
      { user_id: authUser.id, status_date: dateKey, status, updated_at: new Date().toISOString() },
      { onConflict: "user_id,status_date" }
    );
  },

  async pinPerson(userId: string): Promise<void> {
    const authUser = await getAuthUser();
    if (!authUser) return;
    await supabase()
      .from("pinned_people")
      .insert({ user_id: authUser.id, pinned_user_id: userId });
  },

  async unpinPerson(userId: string): Promise<void> {
    const authUser = await getAuthUser();
    if (!authUser) return;
    await supabase()
      .from("pinned_people")
      .delete()
      .eq("user_id", authUser.id)
      .eq("pinned_user_id", userId);
  },

  async isPinned(userId: string): Promise<boolean> {
    const authUser = await getAuthUser();
    if (!authUser) return false;
    const { count } = await supabase()
      .from("pinned_people")
      .select("*", { count: "exact", head: true })
      .eq("user_id", authUser.id)
      .eq("pinned_user_id", userId);
    return (count ?? 0) > 0;
  },

  async updateReminderPreference(pref: ReminderPreference): Promise<void> {
    const authUser = await getAuthUser();
    if (!authUser) return;

    // Cache the cutoff hour locally for use in date calculations
    cachedCutoffHour = pref.eveningCutoffHour;

    // reminder_time stored as "HH:MM" — Postgres `time` column accepts this
    await supabase().from("notification_preferences").upsert(
      {
        user_id: authUser.id,
        enabled: pref.enabled,
        reminder_time: pref.time,
        evening_cutoff_hour: pref.eveningCutoffHour,
      },
      { onConflict: "user_id" }
    );
  },

  async getReminderPreference(): Promise<ReminderPreference> {
    const authUser = await getAuthUser();
    const defaults: ReminderPreference = { enabled: true, time: "09:00", eveningCutoffHour: 18 };
    if (!authUser) return defaults;

    const { data } = await supabase()
      .from("notification_preferences")
      .select("enabled, reminder_time, evening_cutoff_hour")
      .eq("user_id", authUser.id)
      .single();

    if (!data) return defaults;

    const pref: ReminderPreference = {
      enabled: data.enabled,
      time: data.reminder_time,
      eveningCutoffHour: data.evening_cutoff_hour,
    };
    cachedCutoffHour = pref.eveningCutoffHour;
    return pref;
  },

  async createRoom(name: string): Promise<Room> {
    const { data, error } = await supabase().rpc("create_room", { p_name: name });
    if (error || !data) throw new Error(error?.message ?? "Failed to create room");
    return data as unknown as Room;
  },

  async joinRoomByCode(code: string): Promise<{ room: Room; alreadyMember: boolean } | null> {
    const { data, error } = await supabase().rpc("accept_invite", { p_code: code });
    if (error || !data) return null;
    return data as unknown as { room: Room; alreadyMember: boolean };
  },

  async resetMockData(): Promise<void> {
    // No-op in production — this was a dev-only mock helper.
  },
};

export type DataClient = typeof supabaseClient;
