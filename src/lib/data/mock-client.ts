import { z } from "zod";
import type {
  User,
  Room,
  RoomDetail,
  RoomMember,
  HomeSummary,
  PinnedPerson,
  ReminderPreference,
  DailyStatus,
} from "@/types/domain";
import { storageGet, storageSet, storageClear } from "./storage";

// ---------------------------------------------------------------------------
// Zod schemas for localStorage validation
// ---------------------------------------------------------------------------

const DailyStatusSchema = z.enum(["going", "wfh", "maybe", "undecided"]);

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  avatarUrl: z.string(),
  onboardingComplete: z.boolean(),
});

const RoomMemberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  avatarUrl: z.string(),
  status: DailyStatusSchema,
  updatedAt: z.string().nullable(),
});

const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  inviteCode: z.string(),
  memberCount: z.number(),
});

const StoreSchema = z.object({
  currentUserId: z.string().nullable(),
  users: z.array(UserSchema),
  rooms: z.array(RoomSchema),
  roomMembers: z.record(z.string(), z.array(RoomMemberSchema)), // roomId -> members
  pinnedUserIds: z.array(z.string()),
  reminderPreference: z.object({ enabled: z.boolean(), time: z.string() }),
});

type Store = z.infer<typeof StoreSchema>;

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const HOUR = (h: number) =>
  new Date(new Date().setHours(h, 0, 0, 0)).toISOString();

function buildSeed(): Store {
  const users: User[] = [
    {
      id: "u1",
      name: "You (Bhanu)",
      email: "bhanu@setu.co",
      avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Bhanu",
      onboardingComplete: true,
    },
    {
      id: "u2",
      name: "Priya S",
      email: "priya@setu.co",
      avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Priya",
      onboardingComplete: true,
    },
    {
      id: "u3",
      name: "Arjun K",
      email: "arjun@setu.co",
      avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Arjun",
      onboardingComplete: true,
    },
    {
      id: "u4",
      name: "Divya M",
      email: "divya@setu.co",
      avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Divya",
      onboardingComplete: true,
    },
    {
      id: "u5",
      name: "Karan B",
      email: "karan@setu.co",
      avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Karan",
      onboardingComplete: true,
    },
    {
      id: "u6",
      name: "Sneha R",
      email: "sneha@setu.co",
      avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Sneha",
      onboardingComplete: true,
    },
    {
      id: "u7",
      name: "Ravi T",
      email: "ravi@setu.co",
      avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Ravi",
      onboardingComplete: true,
    },
    {
      id: "u8",
      name: "Ananya P",
      email: "ananya@setu.co",
      avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Ananya",
      onboardingComplete: true,
    },
    {
      id: "u9",
      name: "Vikram J",
      email: "vikram@setu.co",
      avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Vikram",
      onboardingComplete: true,
    },
    {
      id: "u10",
      name: "Meera N",
      email: "meera@setu.co",
      avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Meera",
      onboardingComplete: true,
    },
    {
      id: "u11",
      name: "Suraj D",
      email: "suraj@setu.co",
      avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Suraj",
      onboardingComplete: true,
    },
    {
      id: "u12",
      name: "Lakshmi V",
      email: "lakshmi@setu.co",
      avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Lakshmi",
      onboardingComplete: true,
    },
  ];

  const rooms: Room[] = [
    { id: "r1", name: "Platform Team", inviteCode: "SETU01", memberCount: 5 },
    { id: "r2", name: "Design Guild", inviteCode: "SETU02", memberCount: 4 },
    { id: "r3", name: "Leadership", inviteCode: "SETU03", memberCount: 3 },
  ];

  const toMember = (u: User, status: DailyStatus, hoursAgo?: number): RoomMember => ({
    userId: u.id,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl,
    status,
    updatedAt: hoursAgo != null ? HOUR(new Date().getHours() - hoursAgo) : null,
  });

  const roomMembers: Record<string, RoomMember[]> = {
    r1: [
      toMember(users[0], "undecided", undefined),
      toMember(users[1], "going", 2),
      toMember(users[2], "wfh", 1),
      toMember(users[3], "going", 3),
      toMember(users[4], "maybe", 0),
    ],
    r2: [
      toMember(users[0], "undecided", undefined),
      toMember(users[5], "going", 1),
      toMember(users[6], "going", 2),
      toMember(users[7], "undecided", undefined),
    ],
    r3: [
      toMember(users[0], "undecided", undefined),
      toMember(users[10], "going", 1),
      toMember(users[11], "wfh", 2),
    ],
  };

  return {
    currentUserId: null,
    users,
    rooms,
    roomMembers,
    pinnedUserIds: [],
    reminderPreference: { enabled: true, time: "09:00" },
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

// ---------------------------------------------------------------------------
// Helper to sync memberCount from actual member arrays
// ---------------------------------------------------------------------------

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

    const allRoomMembers = Object.values(store.roomMembers).flat();
    const myStatuses = allRoomMembers.filter((m) => m.userId === user.id);
    const myStatus = myStatuses.length > 0 ? myStatuses[0].status : "undecided";
    const myUpdatedAt = myStatuses.length > 0 ? myStatuses[0].updatedAt : null;

    const pinned: PinnedPerson[] = store.pinnedUserIds.flatMap((uid) => {
      const roomEntries = Object.entries(store.roomMembers);
      const found = roomEntries.flatMap(([roomId, members]) => {
        const member = members.find((m) => m.userId === uid);
        if (!member) return [];
        const room = store.rooms.find((r) => r.id === roomId);
        if (!room) return [];
        return [
          {
            userId: uid,
            name: member.name,
            avatarUrl: member.avatarUrl,
            status: member.status,
            updatedAt: member.updatedAt,
            roomId,
            roomName: room.name,
          },
        ];
      });
      return found.slice(0, 1);
    });

    const roomsWithCounts = store.rooms
      .filter((r) => Object.keys(store.roomMembers).includes(r.id))
      .map((r) => {
        const members = store.roomMembers[r.id] ?? [];
        return {
          ...r,
          memberCount: members.length,
          goingCount: members.filter((m) => m.status === "going").length,
          wfhCount: members.filter((m) => m.status === "wfh").length,
          maybeCount: members.filter((m) => m.status === "maybe").length,
          notUpdatedCount: members.filter((m) => m.status === "undecided").length,
        };
      });

    return {
      currentUser: user,
      todayStatus: myStatus,
      todayStatusUpdatedAt: myUpdatedAt,
      pinnedPeople: pinned,
      rooms: roomsWithCounts,
    };
  },

  async getRooms(): Promise<Room[]> {
    const store = getStore();
    return syncMemberCounts(store).rooms;
  },

  async getRoomById(roomId: string): Promise<RoomDetail | null> {
    const store = getStore();
    const room = store.rooms.find((r) => r.id === roomId);
    if (!room) return null;
    const members = store.roomMembers[roomId] ?? [];
    return { ...room, memberCount: members.length, members };
  },

  async updateTodayStatus(status: DailyStatus): Promise<void> {
    const store = getStore();
    const uid = store.currentUserId;
    if (!uid) return;
    const now = new Date().toISOString();
    Object.values(store.roomMembers).forEach((members) => {
      const m = members.find((m) => m.userId === uid);
      if (m) {
        m.status = status;
        m.updatedAt = now;
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
    const store = getStore();
    return store.pinnedUserIds.includes(userId);
  },

  async updateReminderPreference(pref: ReminderPreference): Promise<void> {
    const store = getStore();
    store.reminderPreference = pref;
    setStore(store);
  },

  async getReminderPreference(): Promise<ReminderPreference> {
    const store = getStore();
    return store.reminderPreference;
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
        store.roomMembers[newRoom.id] = [
          {
            userId: uid,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            status: "undecided",
            updatedAt: null,
          },
        ];
      }
    }
    setStore(store);
    return newRoom;
  },

  async joinRoomByCode(
    code: string
  ): Promise<{ room: Room; alreadyMember: boolean } | null> {
    const invalidCodes = ["BAD", "EXPIRED", "INVALID"];
    if (invalidCodes.includes(code.toUpperCase())) return null;

    const store = getStore();
    const room = store.rooms.find(
      (r) => r.inviteCode.toUpperCase() === code.toUpperCase()
    );
    if (!room) return null;

    const uid = store.currentUserId;
    if (!uid) return null;
    const members = store.roomMembers[room.id] ?? [];
    const alreadyMember = members.some((m) => m.userId === uid);
    if (!alreadyMember) {
      const user = store.users.find((u) => u.id === uid);
      if (user) {
        members.push({
          userId: uid,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          status: "undecided",
          updatedAt: null,
        });
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
