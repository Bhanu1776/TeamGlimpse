"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pin, PinOff, ChevronLeft, MoonStar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/features/status/StatusChip";
import { AppShell } from "@/components/app-shell/AppShell";
import { dataClient } from "@/lib/data/client";
import { formatFreshness } from "@/lib/utils/dates";
import type { RoomDetail, RoomMember, DailyStatus } from "@/types/domain";

interface Props {
  params: Promise<{ roomId: string }>;
}

const STATUS_ORDER: DailyStatus[] = ["going", "wfh", "maybe", "undecided"];

const statusIndicator: Record<DailyStatus, string> = {
  going: "bg-[var(--status-going)]",
  wfh: "bg-[var(--status-wfh)]",
  maybe: "bg-[var(--status-maybe)]",
  undecided: "bg-[var(--status-undecided)]",
};

export function RoomDetailPage({ params }: Props) {
  const { roomId } = use(params);
  const router = useRouter();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      dataClient.getRoomById(roomId),
      dataClient.getCurrentUser(),
    ]).then(([r, user]) => {
      setRoom(r);
      setCurrentUserId(user?.id ?? null);
      if (r) {
        Promise.all(r.members.map((m) => dataClient.isPinned(m.userId))).then(
          (results) => {
            const pinned = new Set(r.members.filter((_, i) => results[i]).map((m) => m.userId));
            setPinnedIds(pinned);
          }
        );
      }
      setLoading(false);
    });
  }, [roomId]);

  const togglePin = async (member: RoomMember) => {
    const wasPinned = pinnedIds.has(member.userId);
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (wasPinned) next.delete(member.userId);
      else next.add(member.userId);
      return next;
    });
    if (wasPinned) {
      await dataClient.unpinPerson(member.userId);
      toast(`Unpinned ${member.name}`, {
        action: {
          label: "Undo",
          onClick: async () => {
            await dataClient.pinPerson(member.userId);
            setPinnedIds((prev) => new Set([...prev, member.userId]));
          },
        },
      });
    } else {
      await dataClient.pinPerson(member.userId);
      toast.success(`Pinned ${member.name}`);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-28" />
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      </AppShell>
    );
  }

  if (!room) {
    return (
      <AppShell>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-muted-foreground">Room not found.</p>
          <Button variant="outline" onClick={() => router.replace("/rooms")} className="press">Back to rooms</Button>
        </div>
      </AppShell>
    );
  }

  const grouped = STATUS_ORDER.reduce<Record<DailyStatus, RoomMember[]>>(
    (acc, s) => ({ ...acc, [s]: [] }),
    {} as Record<DailyStatus, RoomMember[]>
  );
  room.members.forEach((m) => grouped[m.status].push(m));

  const statusLabel: Record<DailyStatus, string> = {
    going: "Going",
    wfh: "WFH",
    maybe: "Maybe",
    undecided: "Not updated",
  };

  const summaryParts = STATUS_ORDER.filter((s) => grouped[s].length > 0 && s !== "undecided")
    .map((s) => `${grouped[s].length} ${statusLabel[s].toLowerCase()}`);
  const notUpdated = grouped.undecided.length;

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-xs text-muted-foreground tracking-wide uppercase mb-3 -ml-0.5 hover:text-foreground transition-colors press"
          >
            <ChevronLeft className="size-3.5" />
            Back
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-3xl font-light italic tracking-tight">{room.name}</h1>
            {room.isForTomorrow && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide"
                style={{ background: "var(--status-maybe-surface)", color: "var(--status-maybe)" }}>
                <MoonStar className="size-2.5" />
                tomorrow
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 tracking-wide">
            {summaryParts.join(" · ")}
            {notUpdated > 0 ? `${summaryParts.length ? " · " : ""}${notUpdated} not updated` : ""}
          </p>
        </div>

        {room.members.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            No members yet. Share the invite code{" "}
            <span className="font-mono font-semibold text-foreground">{room.inviteCode}</span>.
          </p>
        ) : (
          STATUS_ORDER.map((status) => {
            const members = grouped[status];
            if (!members.length) return null;
            return (
              <section key={status}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`size-1.5 rounded-full shrink-0 ${statusIndicator[status]}`} />
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                    {statusLabel[status]} · {members.length}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  {members.map((member) => {
                    const isMe = member.userId === currentUserId;
                    const pinned = pinnedIds.has(member.userId);
                    return (
                      <div
                        key={member.userId}
                        className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-accent/40 transition-colors"
                      >
                        <Avatar className="size-9 shrink-0 ring-1 ring-border">
                          <AvatarImage src={member.avatarUrl} alt={member.name} />
                          <AvatarFallback className="text-xs bg-accent">
                            {member.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.name}
                            {isMe && <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">you</span>}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {formatFreshness(member.updatedAt)}
                          </p>
                        </div>
                        <StatusChip status={member.status} size="sm" />
                        {!isMe && (
                          <button
                            onClick={() => togglePin(member)}
                            className={`ml-1 shrink-0 transition-colors press ${pinned ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                            title={pinned ? "Unpin" : "Pin to home"}
                          >
                            {pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
