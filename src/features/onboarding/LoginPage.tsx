"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/auth/session";

export function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error.message || "Sign-in failed. Try again.");
      setLoading(false);
    }
    // On success, Supabase redirects to /auth/callback which routes to /home or /onboarding
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
        <Button onClick={handleSignIn} disabled={loading} className="w-full" size="lg">
          {loading ? "Redirecting…" : "Continue with Google"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Sign in with your office Google account to continue.
        </p>
      </div>
    </div>
  );
}
