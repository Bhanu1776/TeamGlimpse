"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { MapPin, Users, Bell, MoonStar } from "lucide-react";
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

const statusColors: Record<DailyStatus, string> = {
  going: "border-emerald-300 bg-emerald-50 text-emerald-800 data-[active=true]:bg-emerald-500 data-[active=true]:text-white data-[active=true]:border-emerald-500",
  wfh: "border-sky-300 bg-sky-50 text-sky-800 data-[active=true]:bg-sky-500 data-[active=true]:text-white data-[active=true]:border-sky-500",
  maybe: "border-amber-300 bg-amber-50 text-amber-800 data-[active=true]:bg-amber-500 data-[active=true]:text-white data-[active=true]:border-amber-500",
  undecided: "border-border bg-muted text-muted-foreground data-[active=true]:bg-secondary data-[active=true]:text-secondary-foreground data-[active=true]:border-secondary",
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

  // Derive date header from targetDate so it's always in sync with what we're showing
  const targetDateObj = summary?.targetDate ? parseISO(summary.targetDate) : new Date();
  const weekday = format(targetDateObj, "EEEE");
  const date = format(targetDateObj, "MMMM d");
  const isForTomorrow = summary?.isForTomorrow ?? false;

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground text-sm">{weekday}</p>
            {isForTomorrow && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                <MoonStar className="size-3" />
                tomorrow
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{date}</h1>
          {summary?.todayStatus && summary.todayStatus !== "undecided" && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <StatusChip status={summary.todayStatus} size="sm" />
              {summary.todayStatusUpdatedAt && (
                <span>{formatFreshness(summary.todayStatusUpdatedAt)}</span>
              )}
            </div>
          )}
        </div>

        {/* Status control */}
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-3">
              {isForTomorrow
                ? "What’s your plan for tomorrow?"
                : "What’s your plan today?"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  data-active={summary?.todayStatus === value}
                  onClick={() => handleStatusUpdate(value)}
                  disabled={updatingStatus !== null}
                  className={cn(
                    "h-11 rounded-lg border-2 text-sm font-medium transition-all",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    statusColors[value]
                  )}
                >
                  {updatingStatus === value ? "…" : label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pinned people */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              <MapPin className="size-4 text-muted-foreground" />
              Your pinned people
              {isForTomorrow && (
                <span className="text-xs font-normal text-muted-foreground">(tomorrow)</span>
              )}
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
                  <Avatar className="size-9">
                    <AvatarImage src={p.avatarUrl} alt={p.name} />
                    <AvatarFallback className="text-xs">
                      {p.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
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
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              <Users className="size-4 text-muted-foreground" />
              Rooms
              {isForTomorrow && (
                <span className="text-xs font-normal text-muted-foreground">(tomorrow)</span>
              )}
            </h2>
            <Link href="/rooms" className="text-xs text-primary underline underline-offset-4">
              See all
            </Link>
          </div>
          {!summary?.rooms.length ? (
            <p className="text-sm text-muted-foreground">
              You&apos;re not in any rooms yet.{" "}
              <Link href="/rooms" className="underline underline-offset-4">
                Create or join one.
              </Link>
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {summary.rooms.map((room) => (
                <Link key={room.id} href={`/rooms/${room.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                      <p className="font-medium text-sm">{room.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {room.goingCount > 0 && (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">
                            {room.goingCount} going
                          </Badge>
                        )}
                        {room.wfhCount > 0 && (
                          <Badge variant="secondary" className="bg-sky-100 text-sky-700 text-xs">
                            {room.wfhCount} WFH
                          </Badge>
                        )}
                        {room.notUpdatedCount > 0 && (
                          <span>{room.notUpdatedCount} not updated</span>
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
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-3 px-4 flex items-start gap-3">
              <Bell className="size-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Add to home screen</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Install TeamGlimpse for quick access and reminders.
                </p>
              </div>
              <button onClick={dismissPwaBanner} className="text-xs text-muted-foreground underline underline-offset-4 shrink-0">
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
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
