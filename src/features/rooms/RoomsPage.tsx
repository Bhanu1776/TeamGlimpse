"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/app-shell/AppShell";
import { dataClient } from "@/lib/data/client";
import type { Room } from "@/types/domain";
import { toast } from "sonner";

export function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const r = await dataClient.getRooms();
    setRooms(r);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!roomName.trim()) { toast.error("Enter a room name"); return; }
    setCreating(true);
    try {
      const room = await dataClient.createRoom(roomName.trim());
      toast.success(`Room "${room.name}" created!`);
      setRoomName("");
      setShowCreate(false);
      await load();
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-light italic tracking-tight">Rooms</h1>
          <Button size="sm" onClick={() => setShowCreate(true)} className="press gap-1.5">
            <Plus className="size-4" />
            New room
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center gap-4">
            <p className="text-muted-foreground text-sm">No rooms yet.</p>
            <Button variant="outline" onClick={() => setShowCreate(true)} className="press">
              Create your first room
            </Button>
            <Link href="/join/SETU01" className="text-xs text-primary hover:opacity-80 transition-opacity">
              Join with invite code
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rooms.map((room) => (
              <Link key={room.id} href={`/rooms/${room.id}`}>
                <Card className="hover:bg-accent/40 transition-colors press border-border/60">
                  <CardContent className="py-4 px-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{room.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {room.memberCount} {room.memberCount === 1 ? "member" : "members"}
                        <span className="mx-1.5 opacity-40">·</span>
                        <span className="font-mono tracking-widest text-[10px]">{room.inviteCode}</span>
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0 ml-2" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display font-light italic text-xl">Create a room</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-2">
              <Label htmlFor="newRoom" className="text-xs uppercase tracking-wider text-muted-foreground">Room name</Label>
              <Input
                id="newRoom"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Platform Team"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="press">Cancel</Button>
              <Button onClick={handleCreate} disabled={creating} className="press">
                {creating ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
