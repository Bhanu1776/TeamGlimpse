"use client";

import { useSession } from "@/lib/auth/mock-session";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { Skeleton } from "@/components/ui/skeleton";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session } = useSession();

  if (session.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  if (session.status !== "authenticated") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar user={session.user} />
      <main className="flex-1 pb-20 md:pb-6">{children}</main>
      <BottomNav />
    </div>
  );
}
