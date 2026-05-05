"use client";

import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/session";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { User } from "@/types/domain";

interface TopBarProps {
  user: User;
}

export function TopBar({ user }: TopBarProps) {
  const router = useRouter();
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border px-4 h-14 flex items-center justify-between glass">
      <Link href="/home" className="font-display text-xl font-light italic tracking-wide text-foreground">
        TeamGlimpse
      </Link>
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <Avatar className="size-8 ring-1 ring-border">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback className="text-xs bg-accent text-accent-foreground">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-2 py-2">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings" />} className="flex items-center gap-2">
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive focus:text-destructive flex items-center gap-2"
            >
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
