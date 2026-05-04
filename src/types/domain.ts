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
  // Resolved for the active target date — components never deal with dateKeys
  status: DailyStatus;
  updatedAt: string | null;
}

export interface Room {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
}

export interface RoomDetail extends Room {
  members: RoomMember[];
  targetDate: string;    // YYYY-MM-DD
  isForTomorrow: boolean;
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
  targetDate: string;    // YYYY-MM-DD — the date statuses are being shown for
  isForTomorrow: boolean; // true when clock is past the evening cutoff
}

export interface ReminderPreference {
  enabled: boolean;
  time: string;            // "HH:MM" 24h, e.g. "09:00"
  eveningCutoffHour: number; // hour (0–23) after which app shows tomorrow's statuses
}

export type NotificationPermissionState =
  | "unsupported"
  | "default"
  | "granted"
  | "denied";
