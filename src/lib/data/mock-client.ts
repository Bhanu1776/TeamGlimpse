import { z } from "zod";
import type {
  User,
  Room,
  RoomDetail,
  HomeSummary,
  PinnedPerson,
  ReminderPreference,
  DailyStatus,
} from "@/types/domain";
import { storageGet, storageSet, storageClear } from "./storage";
import { getTargetDateKey, isAfterHours, todayKey } from "@/lib/utils/target-date";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const DailyStatusSchema = z.enum(["going", "wfh", "maybe", "undecided"]);

const DateEntrySchema = z.object({
  status: DailyStatusSchema,
  updatedAt: z.string().nullable(),
});

// Internal stored member — statuses keyed by YYYY-MM-DD
const StoredMemberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  avatarUrl: z.string(),
  statusByDate: z.record(z.string(), DateEntrySchema),
});

type StoredMember = z.infer<typeof StoredMemberSchema>;

const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  inviteCode: z.string(),
  memberCount: z.number(),
});

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  avatarUrl: z.string(),
  onboardingComplete: z.boolean(),
});

const ReminderPrefSchema = z.object({
  enabled: z.boolean(),
  time: z.string(),
  eveningCutoffHour: z.number(),
});

const StoreSchema = z.object({
  currentUserId: z.string().nullable(),
  users: z.array(UserSchema),
  rooms: z.array(RoomSchema),
  roomMembers: z.record(z.string(), z.array(StoredMemberSchema)),
  pinnedUserIds: z.array(z.string()),
  reminderPreference: ReminderPrefSchema,
});

type Store = z.infer<typeof StoreSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveStatus(
  member: StoredMember,
  dateKey: string
): { status: DailyStatus; updatedAt: string | null } {
  return member.statusByDate[dateKey] ?? { status: "undecided", updatedAt: null };
}

function toPublicMember(
  member: StoredMember,
  dateKey: string
) {
  const { status, updatedAt } = resolveStatus(member, dateKey);
  return {
    userId: member.userId,
    name: member.name,
    email: member.email,
    avatarUrl: member.avatarUrl,
    status,
    updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Seed data — pre-populate statuses for today so the demo looks alive
// ---------------------------------------------------------------------------

const HOUR_ISO = (h: number) =>
  new Date(new Date().setHours(h, 0, 0, 0)).toISOString();

function buildSeed(): Store {
  const today = todayKey();

  const users: User[] = [
    { id: "u1",  name: "You (Bhanu)", email: "bhanu@setu.co",   avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Bhanu",   onboardingComplete: true },
    { id: "u2",  name: "Priya S",     email: "priya@setu.co",   avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Priya",   onboardingComplete: true },
    { id: "u3",  name: "Arjun K",     email: "arjun@setu.co",   avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Arjun",   onboardingComplete: true },
    { id: "u4",  name: "Divya M",     email: "divya@setu.co",   avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Divya",   onboardingComplete: true },
    { id: "u5",  name: "Karan B",     email: "karan@setu.co",   avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Karan",   onboardingComplete: true },
    { id: "u6",  name: "Sneha R",     email: "sneha@setu.co",   avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Sneha",   onboardingComplete: true },
    { id: "u7",  name: "Ravi T",      email: "ravi@setu.co",    avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Ravi",    onboardingComplete: true },
    { id: "u8",  name: "Ananya P",    email: "ananya@setu.co",  avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Ananya",  onboardingComplete: true },
    { id: "u9",  name: "Vikram J",    email: "vikram@setu.co",  avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Vikram",  onboardingComplete: true },
    { id: "u10", name: "Meera N",     email: "meera@setu.co",   avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Meera",   onboardingComplete: true },
    { id: "u11", name: "Suraj D",     email: "suraj@setu.co",   avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Suraj",   onboardingComplete: true },
    { id: "u12", name: "Lakshmi V",   email: "lakshmi@setu.co", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Lakshmi", onboardingComplete: true },
  ];

  const rooms: Room[] = [
    { id: "r1", name: "Platform Team", inviteCode: "SETU01", memberCount: 5 },
    { id: "r2", name: "Design Guild",  inviteCode: "SETU02", memberCount: 4 },
    { id: "r3", name: "Leadership",    inviteCode: "SETU03", memberCount: 3 },
  ];

  const mk = (
    u: User,
    status: DailyStatus,
    hoursAgo?: number
  ): StoredMember => ({
    userId: u.id,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl,
    statusByDate: {
      [today]: {
        status,
        updatedAt: hoursAgo != null ? HOUR_ISO(new Date().getHours() - hoursAgo) : null,
      },
    },
  });

  const roomMembers: Record<string, StoredMember[]> = {
    r1: [
      mk(users[0],  "undecided"),
      mk(users[1],  "going",  2),
      mk(users[2],  "wfh",    1),
      mk(users[3],  "going",  3),
      mk(users[4],  "maybe",  0),
    ],
    r2: [
      mk(users[0],  "undecided"),
      mk(users[5],  "going",  1),
      mk(users[6],  "going",  2),
      mk(users[7],  "undecided"),
    ],
    r3: [
      mk(users[0],  "undecided"),
      mk(users[10], "going",  1),
      mk(users[11], "wfh",    2),
    ],
  };

  return {
    currentUserId: null,
    users,
    rooms,
    roomMembers,
    pinnedUserIds: [],
    reminderPreference: { enabled: true, time: "09:00", eveningCutoffHour: 18 },
  };
}

// ---------------------------------------------------------------------------
// Store access
// ---------------------------------------------------------------------------

const STORE_KEY = "teamglimpse_store";

function getStore(): Store {
  const existing = storageGet(STORE_KEY, StoreSchema);
  if (existing) return existing;
  const seed = buildSeed();
  storageSet(STORE_KEY, seed);
  return seed;
}

function setStore(store: Store): void {
  storageSet(STORE_KEY, store);
}

function syncMemberCounts(store: Store): Store {
  return {
    ...store,
    rooms: store.rooms.map((r) => ({
      ...r,
      memberCount: (store.roomMembers[r.id] ?? []).length,
    })),
  };
}

// ---------------------------------------------------------------------------
// Public mock client
// ---------------------------------------------------------------------------

export const mockClient = {
  async signInMock(name: string, email: string): Promise<User> {
    const store = getStore();
    let user = store.users.find((u) => u.email === email);
    if (!user) {
      user = {
        id: `u_${Date.now()}`,
        name,
        email,
        avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`,
        onboardingComplete: false,
      };
      store.users.push(user);
    }
    store.currentUserId = user.id;
    setStore(store);
    return user;
  },

  async signOut(): Promise<void> {
    const store = getStore();
    store.currentUserId = null;
    setStore(store);
  },

  async getCurrentUser(): Promise<User | null> {
    const store = getStore();
    if (!store.currentUserId) return null;
    return store.users.find((u) => u.id === store.currentUserId) ?? null;
  },

  async completeOnboarding(displayName: string): Promise<void> {
    const store = getStore();
    const user = store.users.find((u) => u.id === store.currentUserId);
    if (!user) return;
    user.name = displayName;
    user.onboardingComplete = true;
    setStore(store);
  },

  async getHomeSummary(): Promise<HomeSummary | null> {
    const store = getStore();
    const user = store.users.find((u) => u.id === store.currentUserId);
    if (!user) return null;

    const { eveningCutoffHour } = store.reminderPreference;
    const dateKey = getTargetDateKey(eveningCutoffHour);
    const forTomorrow = isAfterHours(eveningCutoffHour);

    // Current user's status for the target date
    const myEntry = Object.values(store.roomMembers)
      .flat()
      .find((m) => m.userId === user.id);
    const { status: myStatus, updatedAt: myUpdatedAt } = myEntry
      ? resolveStatus(myEntry, dateKey)
      : { status: "undecided" as DailyStatus, updatedAt: null };

    const pinned: PinnedPerson[] = store.pinnedUserIds.flatMap((uid) => {
      const found = Object.entries(store.roomMembers).flatMap(([roomId, members]) => {
        const member = members.find((m) => m.userId === uid);
        if (!member) return [];
        const room = store.rooms.find((r) => r.id === roomId);
        if (!room) return [];
        const { status, updatedAt } = resolveStatus(member, dateKey);
        return [{ userId: uid, name: member.name, avatarUrl: member.avatarUrl, status, updatedAt, roomId, roomName: room.name }];
      });
      return found.slice(0, 1);
    });

    const roomsWithCounts = store.rooms
      .filter((r) => r.id in store.roomMembers)
      .map((r) => {
        const members = store.roomMembers[r.id] ?? [];
        const resolved = members.map((m) => resolveStatus(m, dateKey));
        return {
          ...r,
          memberCount: members.length,
          goingCount: resolved.filter((s) => s.status === "going").length,
          wfhCount: resolved.filter((s) => s.status === "wfh").length,
          maybeCount: resolved.filter((s) => s.status === "maybe").length,
          notUpdatedCount: resolved.filter((s) => s.status === "undecided").length,
        };
      });

    return {
      currentUser: user,
      todayStatus: myStatus,
      todayStatusUpdatedAt: myUpdatedAt,
      pinnedPeople: pinned,
      rooms: roomsWithCounts,
      targetDate: dateKey,
      isForTomorrow: forTomorrow,
    };
  },

  async getRooms(): Promise<Room[]> {
    return syncMemberCounts(getStore()).rooms;
  },

  async getRoomById(roomId: string): Promise<RoomDetail | null> {
    const store = getStore();
    const room = store.rooms.find((r) => r.id === roomId);
    if (!room) return null;

    const { eveningCutoffHour } = store.reminderPreference;
    const dateKey = getTargetDateKey(eveningCutoffHour);
    const forTomorrow = isAfterHours(eveningCutoffHour);

    const storedMembers = store.roomMembers[roomId] ?? [];
    const members = storedMembers.map((m) => toPublicMember(m, dateKey));

    return {
      ...room,
      memberCount: members.length,
      members,
      targetDate: dateKey,
      isForTomorrow: forTomorrow,
    };
  },

  async updateTodayStatus(status: DailyStatus): Promise<void> {
    const store = getStore();
    const uid = store.currentUserId;
    if (!uid) return;

    const { eveningCutoffHour } = store.reminderPreference;
    const dateKey = getTargetDateKey(eveningCutoffHour);
    const now = new Date().toISOString();

    Object.values(store.roomMembers).forEach((members) => {
      const m = members.find((m) => m.userId === uid);
      if (m) {
        m.statusByDate[dateKey] = { status, updatedAt: now };
      }
    });
    setStore(store);
  },

  async pinPerson(userId: string): Promise<void> {
    const store = getStore();
    if (!store.pinnedUserIds.includes(userId)) {
      store.pinnedUserIds.push(userId);
      setStore(store);
    }
  },

  async unpinPerson(userId: string): Promise<void> {
    const store = getStore();
    store.pinnedUserIds = store.pinnedUserIds.filter((id) => id !== userId);
    setStore(store);
  },

  async isPinned(userId: string): Promise<boolean> {
    return getStore().pinnedUserIds.includes(userId);
  },

  async updateReminderPreference(pref: ReminderPreference): Promise<void> {
    const store = getStore();
    store.reminderPreference = pref;
    setStore(store);
  },

  async getReminderPreference(): Promise<ReminderPreference> {
    return getStore().reminderPreference;
  },

  async createRoom(name: string): Promise<Room> {
    const store = getStore();
    const uid = store.currentUserId;
    const newRoom: Room = {
      id: `r_${Date.now()}`,
      name,
      inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      memberCount: 1,
    };
    store.rooms.push(newRoom);
    if (uid) {
      const user = store.users.find((u) => u.id === uid);
      if (user) {
        store.roomMembers[newRoom.id] = [{
          userId: uid,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          statusByDate: {},
        }];
      }
    }
    setStore(store);
    return newRoom;
  },

  async joinRoomByCode(code: string): Promise<{ room: Room; alreadyMember: boolean } | null> {
    const invalidCodes = ["BAD", "EXPIRED", "INVALID"];
    if (invalidCodes.includes(code.toUpperCase())) return null;

    const store = getStore();
    const room = store.rooms.find((r) => r.inviteCode.toUpperCase() === code.toUpperCase());
    if (!room) return null;

    const uid = store.currentUserId;
    if (!uid) return null;
    const members = store.roomMembers[room.id] ?? [];
    const alreadyMember = members.some((m) => m.userId === uid);
    if (!alreadyMember) {
      const user = store.users.find((u) => u.id === uid);
      if (user) {
        members.push({ userId: uid, name: user.name, email: user.email, avatarUrl: user.avatarUrl, statusByDate: {} });
        store.roomMembers[room.id] = members;
        setStore(store);
      }
    }
    return { room: syncMemberCounts(store).rooms.find((r) => r.id === room.id)!, alreadyMember };
  },

  async resetMockData(): Promise<void> {
    storageClear();
  },
};

export type DataClient = typeof mockClient;
