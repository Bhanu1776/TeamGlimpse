export type DailyStatus = "going" | "wfh" | "maybe" | "undecided";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  onboardingComplete: boolean;
}

export interface RoomMember {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string;
  status: DailyStatus;
  updatedAt: string | null; // ISO string, null = not yet updated today
}

export interface Room {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
}

export interface RoomDetail extends Room {
  members: RoomMember[];
}

export interface PinnedPerson {
  userId: string;
  name: string;
  avatarUrl: string;
  status: DailyStatus;
  updatedAt: string | null;
  roomId: string;
  roomName: string;
}

export interface HomeSummary {
  currentUser: User;
  todayStatus: DailyStatus;
  todayStatusUpdatedAt: string | null;
  pinnedPeople: PinnedPerson[];
  rooms: (Room & {
    goingCount: number;
    wfhCount: number;
    maybeCount: number;
    notUpdatedCount: number;
  })[];
}

export interface ReminderPreference {
  enabled: boolean;
  time: string; // "HH:MM" 24h format, e.g. "09:00"
}

export type NotificationPermissionState =
  | "unsupported"
  | "default"
  | "granted"
  | "denied";
