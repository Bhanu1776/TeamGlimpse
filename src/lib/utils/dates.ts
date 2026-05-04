import { isToday, isYesterday, format, formatDistanceToNowStrict } from "date-fns";

export function formatFreshness(isoString: string | null): string {
  if (!isoString) return "not updated yet";
  const date = new Date(isoString);
  if (isToday(date)) {
    const now = new Date();
    if (date.getHours() === now.getHours() && date.getMinutes() === now.getMinutes()) {
      return "just now";
    }
    return `updated ${format(date, "h:mm a")}`;
  }
  if (isYesterday(date)) return "updated last night";
  return `updated ${formatDistanceToNowStrict(date, { addSuffix: true })}`;

}

export function formatTodayHeader(): { date: string; weekday: string } {
  const now = new Date();
  return {
    date: format(now, "MMMM d"),
    weekday: format(now, "EEEE"),
  };
}
