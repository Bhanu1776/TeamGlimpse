import { format, addDays } from "date-fns";

export function getTargetDate(cutoffHour: number): Date {
  const now = new Date();
  return now.getHours() >= cutoffHour ? addDays(now, 1) : now;
}

export function getTargetDateKey(cutoffHour: number): string {
  return format(getTargetDate(cutoffHour), "yyyy-MM-dd");
}

export function isAfterHours(cutoffHour: number): boolean {
  return new Date().getHours() >= cutoffHour;
}

export function todayKey(): string {
  return format(new Date(), "yyyy-MM-dd");
}
