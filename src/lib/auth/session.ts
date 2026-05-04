"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "@/types/domain";
import { createClient } from "@/lib/supabase/browser";

export type SessionState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: User };

const PUBLIC_PATHS = ["/login", "/join"];

export function useSession() {
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const refresh = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      setSession({ status: "unauthenticated" });
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email, avatar_url, onboarding_complete")
      .eq("id", authUser.id)
      .single();

    if (!profile) {
      setSession({ status: "unauthenticated" });
      return;
    }

    setSession({
      status: "authenticated",
      user: {
        id: authUser.id,
        name: profile.display_name ?? profile.email,
        email: profile.email,
        avatarUrl: profile.avatar_url ?? "",
        onboardingComplete: profile.onboarding_complete,
      },
    });
  }, [supabase]);

  useEffect(() => {
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh, supabase]);

  useEffect(() => {
    if (session.status === "loading") return;

    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

    if (session.status === "unauthenticated" && !isPublic) {
      router.replace("/login");
      return;
    }

    if (session.status === "authenticated") {
      if (!session.user.onboardingComplete && pathname !== "/onboarding") {
        router.replace("/onboarding");
        return;
      }
      if (
        session.user.onboardingComplete &&
        (pathname === "/login" || pathname === "/onboarding" || pathname === "/")
      ) {
        router.replace("/home");
      }
    }
  }, [session, pathname, router]);

  return { session, refresh };
}

export async function signInWithGoogle() {
  const supabase = createClient();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
}

export async function signOut() {
  const supabase = createClient();
  return supabase.auth.signOut();
}
