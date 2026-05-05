"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { MapPin, Users, MoonStar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/features/status/StatusChip";
import { AppShell } from "@/components/app-shell/AppShell";
import { dataClient } from "@/lib/data/client";
import { formatFreshness } from "@/lib/utils/dates";
import type { HomeSummary, DailyStatus } from "@/types/domain";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: DailyStatus; label: string }[] = [
  { value: "going", label: "Going" },
  { value: "wfh", label: "WFH" },
  { value: "maybe", label: "Maybe" },
  { value: "undecided", label: "Not decided" },
];

const statusButtonStyle: Record<DailyStatus, { idle: string; active: string }> = {
  going: {
    idle: "border-[var(--status-going-surface)] text-[var(--status-going)] bg-[var(--status-going-surface)]",
    active: "border-[var(--status-going)] bg-[var(--status-going)] text-[var(--status-going-fg)]",
  },
  wfh: {
    idle: "border-[var(--status-wfh-surface)] text-[var(--status-wfh)] bg-[var(--status-wfh-surface)]",
    active: "border-[var(--status-wfh)] bg-[var(--status-wfh)] text-[var(--status-wfh-fg)]",
  },
  maybe: {
    idle: "border-[var(--status-maybe-surface)] text-[var(--status-maybe)] bg-[var(--status-maybe-surface)]",
    active: "border-[var(--status-maybe)] bg-[var(--status-maybe)] text-[var(--status-maybe-fg)]",
  },
  undecided: {
    idle: "border-[var(--status-undecided-surface)] text-[var(--status-undecided-fg)] bg-[var(--status-undecided-surface)]",
    active: "border-[var(--status-undecided)] bg-[var(--status-undecided)] text-[var(--status-undecided-fg)]",
  },
};

const PWA_BANNER_KEY = "tg_pwa_banner_dismissed";

export function HomePage() {
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<DailyStatus | null>(null);
  const [showPwaBanner, setShowPwaBanner] = useState(() => {
    if (typeof window === "undefined") return false;
    const dismissed = localStorage.getItem(PWA_BANNER_KEY) === "true";
    return !dismissed && !window.matchMedia("(display-mode: standalone)").matches;
  });

  useEffect(() => {
    dataClient.getHomeSummary().then((s) => {
      setSummary(s);
      setLoading(false);
    });
  }, []);

  const dismissPwaBanner = () => {
    localStorage.setItem(PWA_BANNER_KEY, "true");
    setShowPwaBanner(false);
  };

  const handleStatusUpdate = async (status: DailyStatus) => {
    if (!summary) return;
    setUpdatingStatus(status);
    const prev = summary.todayStatus;
    setSummary({ ...summary, todayStatus: status, todayStatusUpdatedAt: new Date().toISOString() });
    try {
      await dataClient.updateTodayStatus(status);
      const label = STATUS_OPTIONS.find((o) => o.value === status)?.label;
      toast.success(summary.isForTomorrow ? `Set for tomorrow: ${label}` : `Status: ${label}`);
    } catch {
      setSummary({ ...summary, todayStatus: prev });
      toast.error("Couldn't update status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (loading) return <AppShell><HomeLoadingSkeleton /></AppShell>;

  const targetDateObj = summary?.targetDate ? parseISO(summary.targetDate) : new Date();
  const weekday = format(targetDateObj, "EEEE");
  const date = format(targetDateObj, "MMMM d");
  const isForTomorrow = summary?.isForTomorrow ?? false;

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">

        {/* Date header */}
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-xs text-muted-foreground tracking-widest uppercase">{weekday}</p>
            {isForTomorrow && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide"
                style={{ background: "var(--status-maybe-surface)", color: "var(--status-maybe)" }}
              >
                <MoonStar className="size-2.5" />
                tomorrow
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl font-light italic tracking-tight text-foreground">{date}</h1>
          {summary?.todayStatus && summary.todayStatus !== "undecided" && (
            <div className="mt-2 flex items-center gap-2">
              <StatusChip status={summary.todayStatus} size="sm" />
              {summary.todayStatusUpdatedAt && (
                <span className="text-[10px] text-muted-foreground">{formatFreshness(summary.todayStatusUpdatedAt)}</span>
              )}
            </div>
          )}
        </div>

        {/* Status control */}
        <div>
          <p className="text-xs font-medium text-muted-foreground tracking-wider uppercase mb-3">
            {isForTomorrow ? "Tomorrow's plan" : "Today's plan"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map(({ value, label }) => {
              const isActive = summary?.todayStatus === value;
              const style = statusButtonStyle[value];
              return (
                <button
                  key={value}
                  onClick={() => handleStatusUpdate(value)}
                  disabled={updatingStatus !== null}
                  className={cn(
                    "h-12 rounded-xl border-2 text-sm font-medium transition-all press",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                    isActive ? style.active : style.idle
                  )}
                >
                  {updatingStatus === value ? "…" : label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pinned people */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-muted-foreground tracking-wider uppercase flex items-center gap-1.5">
              <MapPin className="size-3" />
              Pinned
              {isForTomorrow && <span className="font-normal">(tomorrow)</span>}
            </h2>
          </div>
          {!summary?.pinnedPeople.length ? (
            <p className="text-sm text-muted-foreground">
              No pinned people yet — open a room to pin someone.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {summary.pinnedPeople.map((p) => (
                <div key={p.userId} className="flex items-center gap-3">
                  <Avatar className="size-9 ring-1 ring-border shrink-0">
                    <AvatarImage src={p.avatarUrl} alt={p.name} />
                    <AvatarFallback className="text-xs bg-accent">{p.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.roomName} · {formatFreshness(p.updatedAt)}
                    </p>
                  </div>
                  <StatusChip status={p.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Room summaries */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-muted-foreground tracking-wider uppercase flex items-center gap-1.5">
              <Users className="size-3" />
              Rooms
              {isForTomorrow && <span className="font-normal">(tomorrow)</span>}
            </h2>
            <Link href="/rooms" className="text-xs text-primary hover:opacity-80 transition-opacity">
              See all
            </Link>
          </div>
          {!summary?.rooms.length ? (
            <p className="text-sm text-muted-foreground">
              You&apos;re not in any rooms yet.{" "}
              <Link href="/rooms" className="text-primary underline underline-offset-4">
                Create or join one.
              </Link>
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {summary.rooms.map((room) => (
                <Link key={room.id} href={`/rooms/${room.id}`}>
                  <Card className="hover:bg-accent/40 transition-colors press border-border/60">
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                      <p className="font-medium text-sm">{room.name}</p>
                      <div className="flex items-center gap-1.5">
                        {room.goingCount > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 font-medium"
                            style={{ background: "var(--status-going-surface)", color: "var(--status-going)" }}>
                            {room.goingCount} going
                          </Badge>
                        )}
                        {room.wfhCount > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 font-medium"
                            style={{ background: "var(--status-wfh-surface)", color: "var(--status-wfh)" }}>
                            {room.wfhCount} WFH
                          </Badge>
                        )}
                        {room.notUpdatedCount > 0 && (
                          <span className="text-[10px] text-muted-foreground">{room.notUpdatedCount} pending</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* PWA banner */}
        {showPwaBanner && (
          <Card className="border-primary/20" style={{ background: "oklch(72% 0.14 52 / 8%)" }}>
            <CardContent className="py-3 px-4 flex items-start gap-3">
              <div className="size-6 rounded-full shrink-0 mt-0.5 flex items-center justify-center"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                <MapPin className="size-3" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Add to home screen</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Install TeamGlimpse for quick access and reminders.
                </p>
              </div>
              <button onClick={dismissPwaBanner} className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 pt-0.5">
                Dismiss
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function HomeLoadingSkeleton() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-16" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
      </div>
    </div>
  );
}
