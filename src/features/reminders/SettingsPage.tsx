"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, BellOff, LogOut, MoonStar, Smartphone } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AppShell } from "@/components/app-shell/AppShell";
import { dataClient } from "@/lib/data/client";
import { signOut } from "@/lib/auth/session";
import {
  getNotificationPermissionState,
  requestNotificationPermission,
  subscribeToPush,
} from "@/lib/push/permissions";
import type { User, ReminderPreference, NotificationPermissionState } from "@/types/domain";

const REMINDER_TIMES = Array.from({ length: 9 }, (_, i) => {
  const totalMinutes = 7 * 60 + i * 30;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const hh = h.toString().padStart(2, "0");
  const mm = m.toString().padStart(2, "0");
  const ampm = h < 12 ? "AM" : "PM";
  const displayH = h > 12 ? h - 12 : h;
  return { value: `${hh}:${mm}`, label: `${displayH}:${mm} ${ampm}` };
});

const CUTOFF_OPTIONS = [15, 16, 17, 18, 19, 20, 21].map((h) => {
  const ampm = h < 12 ? "AM" : "PM";
  const display = h > 12 ? h - 12 : h;
  return { value: h, label: `${display}:00 ${ampm}` };
});

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest px-1 mb-2">
      {children}
    </p>
  );
}

export function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [reminder, setReminder] = useState<ReminderPreference>({ enabled: true, time: "09:00", eveningCutoffHour: 18 });
  const [notifState, setNotifState] = useState<NotificationPermissionState>("default");
  const [isStandalone, setIsStandalone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([dataClient.getCurrentUser(), dataClient.getReminderPreference()]).then(
      ([u, r]) => {
        setUser(u);
        setReminder(r);
        setNotifState(getNotificationPermissionState());
        setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
        setLoading(false);
      }
    );
  }, []);

  const handleReminderToggle = async (enabled: boolean) => {
    const updated = { ...reminder, enabled };
    setReminder(updated);
    await dataClient.updateReminderPreference(updated);
    toast.success(enabled ? "Reminder enabled" : "Reminder disabled");
  };

  const handleReminderTime = async (time: string) => {
    const updated = { ...reminder, time };
    setReminder(updated);
    await dataClient.updateReminderPreference(updated);
    toast.success("Reminder time updated");
  };

  const handleCutoffHour = async (hour: number) => {
    const updated = { ...reminder, eveningCutoffHour: hour };
    setReminder(updated);
    await dataClient.updateReminderPreference(updated);
    const label = CUTOFF_OPTIONS.find((o) => o.value === hour)?.label;
    toast.success(`Tomorrow view flips after ${label}`);
  };

  const handleNotifRequest = async () => {
    const state = await requestNotificationPermission();
    setNotifState(state);
    if (state === "granted") {
      await subscribeToPush();
      toast.success("Notifications enabled!");
    } else if (state === "denied") {
      toast.error("Notifications blocked. Enable in browser settings.");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  const initials = user?.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">
        <h1 className="font-display text-3xl font-light italic tracking-tight">Settings</h1>

        {/* Profile */}
        {!loading && user && (
          <>
            <SectionLabel>Account</SectionLabel>
            <Card className="border-border/60">
              <CardContent className="py-4 px-4 flex items-center gap-4">
                <Avatar className="size-12 ring-1 ring-border">
                  <AvatarFallback className="text-sm font-medium bg-accent text-accent-foreground">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{user.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Reminder */}
        <div>
          <SectionLabel>Reminders</SectionLabel>
          <Card className="border-border/60">
            <CardContent className="py-4 px-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Bell className="size-4 text-muted-foreground" />
                  <Label htmlFor="reminder-toggle" className="text-sm font-medium cursor-pointer">
                    Daily reminder
                  </Label>
                </div>
                <Switch
                  id="reminder-toggle"
                  checked={reminder.enabled}
                  onCheckedChange={handleReminderToggle}
                />
              </div>
              {reminder.enabled && (
                <>
                  <Separator className="opacity-50" />
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">Remind me at</Label>
                    <Select value={reminder.time} onValueChange={(v) => v && handleReminderTime(v)}>
                      <SelectTrigger className="w-28 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REMINDER_TIMES.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <Separator className="opacity-50" />
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MoonStar className="size-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Show tomorrow after</Label>
                  </div>
                  <Select
                    value={String(reminder.eveningCutoffHour)}
                    onValueChange={(v) => v && handleCutoffHour(Number(v))}
                  >
                    <SelectTrigger className="w-24 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUTOFF_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={String(value)}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground pl-7 leading-relaxed">
                  After this time the app shows tomorrow&apos;s statuses so you can plan ahead.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications */}
        <div>
          <SectionLabel>Push notifications</SectionLabel>
          <Card className="border-border/60">
            <CardContent className="py-4 px-4 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                {notifState === "granted" ? (
                  <Bell className="size-4" style={{ color: "var(--status-going)" }} />
                ) : (
                  <BellOff className="size-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">
                  {notifState === "granted" ? "Notifications on" : "Push notifications"}
                </span>
              </div>
              {notifState === "unsupported" && (
                <p className="text-sm text-muted-foreground">Not supported in this browser.</p>
              )}
              {notifState === "default" && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">Allow notifications to receive daily reminders.</p>
                  <Button variant="outline" size="sm" onClick={handleNotifRequest} className="self-start press">
                    Enable notifications
                  </Button>
                </div>
              )}
              {notifState === "granted" && (
                <p className="text-sm" style={{ color: "var(--status-going)" }}>Notifications are enabled.</p>
              )}
              {notifState === "denied" && (
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-destructive">Notifications are blocked.</p>
                  <p className="text-xs text-muted-foreground">Go to browser settings to re-enable them.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* PWA install */}
        {!isStandalone && (
          <div>
            <SectionLabel>Install app</SectionLabel>
            <Card className="border-border/60">
              <CardContent className="py-4 px-4 flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Add to home screen</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  iOS Safari: tap <strong className="text-foreground">Share</strong> → <strong className="text-foreground">Add to Home Screen</strong>.
                  Android Chrome: tap the menu → <strong className="text-foreground">Install app</strong>.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sign out */}
        <div className="pt-2 pb-4">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 press text-muted-foreground hover:text-foreground border-border/60"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
