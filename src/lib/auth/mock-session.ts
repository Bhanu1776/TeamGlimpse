"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "@/types/domain";
import { dataClient } from "@/lib/data/client";

export type SessionState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: User };

const PUBLIC_PATHS = ["/login", "/join"];

export function useSession() {
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const router = useRouter();
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    const user = await dataClient.getCurrentUser();
    if (!user) {
      setSession({ status: "unauthenticated" });
    } else {
      setSession({ status: "authenticated", user });
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh(); }, [refresh]);

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
