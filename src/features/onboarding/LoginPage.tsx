"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dataClient } from "@/lib/data/client";

export function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("Bhanu");
  const [email, setEmail] = useState("bhanu@setu.co");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Enter your name and email to continue");
      return;
    }
    setLoading(true);
    try {
      const user = await dataClient.signInMock(name.trim(), email.trim());
      if (!user.onboardingComplete) {
        router.replace("/onboarding");
      } else {
        router.replace("/home");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="text-4xl font-bold tracking-tight">TeamGlimpse</div>
        <p className="text-muted-foreground text-sm max-w-xs">
          See who&apos;s in today, at a glance.
        </p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bhanu"
            autoComplete="name"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.co"
            autoComplete="email"
          />
        </div>
        <Button onClick={handleSignIn} disabled={loading} className="w-full mt-2" size="lg">
          {loading ? "Signing in…" : "Continue with mock login"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          No real auth in this preview — any email works.
        </p>
      </div>
    </div>
  );
}
