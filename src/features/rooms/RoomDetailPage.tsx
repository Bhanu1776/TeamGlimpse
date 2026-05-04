"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pin, PinOff, ChevronLeft } from "lucide-react";
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
          <Skeleton className="h-5 w-24" />
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      </AppShell>
    );
  }

  if (!room) {
    return (
      <AppShell>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-muted-foreground">Room not found.</p>
          <Button variant="outline" onClick={() => router.replace("/rooms")}>Back to rooms</Button>
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
            className="flex items-center gap-1 text-sm text-muted-foreground mb-3 -ml-1"
          >
            <ChevronLeft className="size-4" />
            Back
          </button>
          <h1 className="text-xl font-bold tracking-tight">{room.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {summaryParts.join(" · ")}
            {notUpdated > 0 ? ` · ${notUpdated} not updated` : ""}
          </p>
        </div>

        {room.members.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No members yet. Share the invite code{" "}
            <span className="font-mono font-medium">{room.inviteCode}</span>.
          </p>
        ) : (
          STATUS_ORDER.map((status) => {
            const members = grouped[status];
            if (!members.length) return null;
            return (
              <section key={status}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {statusLabel[status]} · {members.length}
                </p>
                <div className="flex flex-col gap-1.5">
                  {members.map((member) => {
                    const isMe = member.userId === currentUserId;
                    const pinned = pinnedIds.has(member.userId);
                    return (
                      <div
                        key={member.userId}
                        className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-muted/50 transition-colors"
                      >
                        <Avatar className="size-9 shrink-0">
                          <AvatarImage src={member.avatarUrl} alt={member.name} />
                          <AvatarFallback className="text-xs">
                            {member.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.name}
                            {isMe && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {formatFreshness(member.updatedAt)}
                          </p>
                        </div>
                        <StatusChip status={member.status} size="sm" />
                        {!isMe && (
                          <button
                            onClick={() => togglePin(member)}
                            className="text-muted-foreground hover:text-primary transition-colors ml-1 shrink-0"
                            title={pinned ? "Unpin" : "Pin to home"}
                          >
                            {pinned ? (
                              <PinOff className="size-4" />
                            ) : (
                              <Pin className="size-4" />
                            )}
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
