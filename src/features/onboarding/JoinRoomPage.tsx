"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { dataClient } from "@/lib/data/client";
import type { Room } from "@/types/domain";

interface Props {
  params: Promise<{ inviteCode: string }>;
}

export function JoinRoomPage({ params }: Props) {
  const { inviteCode } = use(params);
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    dataClient.joinRoomByCode(inviteCode).then((result) => {
      if (!result) {
        setInvalid(true);
      } else {
        setRoom(result.room);
        if (result.alreadyMember) {
          toast.info("You're already in this room.");
        }
      }
      setLoading(false);
    });
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!room) return;
    setJoining(true);
    try {
      await dataClient.joinRoomByCode(inviteCode);
      toast.success(`Joined ${room.name}!`);
      router.replace(`/rooms/${room.id}`);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-11 w-40" />
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-4xl">🚫</div>
        <h1 className="text-xl font-semibold">Invite not found</h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          This invite code is invalid or has expired. Ask someone in the room to
          share a fresh link.
        </p>
        <Button variant="outline" onClick={() => router.replace("/home")}>
          Back to home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Users className="size-7 text-primary" />
        </div>
        <h1 className="text-xl font-semibold">{room?.name}</h1>
        <Badge variant="secondary">
          {room?.memberCount} {room?.memberCount === 1 ? "member" : "members"}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground max-w-xs">
        You&apos;ve been invited to join this room. You&apos;ll see everyone&apos;s daily
        status here.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button onClick={handleJoin} disabled={joining} size="lg" className="w-full">
          {joining ? "Joining…" : `Join ${room?.name}`}
        </Button>
        <Button variant="ghost" onClick={() => router.replace("/home")} className="w-full">
          Maybe later
        </Button>
      </div>
    </div>
  );
}
