"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dataClient } from "@/lib/data/client";
import { useSession } from "@/lib/auth/mock-session";

export function OnboardingPage() {
  const { session, refresh } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<"name" | "room">("name");
  const [displayName, setDisplayName] = useState(
    session.status === "authenticated" ? session.user.name : ""
  );
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNameContinue = () => {
    if (!displayName.trim()) {
      toast.error("Enter your display name");
      return;
    }
    setStep("room");
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      toast.error("Enter a room name");
      return;
    }
    setLoading(true);
    try {
      await dataClient.completeOnboarding(displayName.trim());
      await dataClient.createRoom(roomName.trim());
      await refresh();
      toast.success("Room created! Welcome to TeamGlimpse.");
      router.replace("/home");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipRoom = async () => {
    setLoading(true);
    try {
      await dataClient.completeOnboarding(displayName.trim());
      await refresh();
      router.replace("/home");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-8">
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="text-2xl font-bold tracking-tight">
          {step === "name" ? "Set up your profile" : "Join or create a room"}
        </div>
        <p className="text-muted-foreground text-sm">
          {step === "name"
            ? "How should teammates see your name?"
            : "Rooms are groups of people you check in with daily."}
        </p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        {step === "name" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Bhanu"
                autoFocus
              />
            </div>
            <Button onClick={handleNameContinue} className="w-full" size="lg">
              Continue
            </Button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="roomName">Create a room</Label>
              <Input
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Platform Team"
                autoFocus
              />
            </div>
            <Button onClick={handleCreateRoom} disabled={loading} className="w-full" size="lg">
              {loading ? "Creating…" : "Create room"}
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={() => router.push("/join/SETU01")}>
              Join with invite code
            </Button>
            <button
              onClick={handleSkipRoom}
              disabled={loading}
              className="text-xs text-muted-foreground text-center underline underline-offset-4"
            >
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
