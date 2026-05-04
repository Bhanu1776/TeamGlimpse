"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, BellOff, LogOut, RefreshCcw, Smartphone } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AppShell } from "@/components/app-shell/AppShell";
import { dataClient } from "@/lib/data/client";
import {
  getNotificationPermissionState,
  requestNotificationPermission,
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

export function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [reminder, setReminder] = useState<ReminderPreference>({ enabled: true, time: "09:00" });
  const [notifState, setNotifState] = useState<NotificationPermissionState>("default");
  const [isStandalone, setIsStandalone] = useState(false);
  const [showReset, setShowReset] = useState(false);
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

  const handleNotifRequest = async () => {
    const state = await requestNotificationPermission();
    setNotifState(state);
    if (state === "granted") toast.success("Notifications enabled!");
    else if (state === "denied") toast.error("Notifications blocked. Enable in browser settings.");
  };

  const handleSignOut = async () => {
    await dataClient.signOut();
    router.replace("/login");
  };

  const handleReset = async () => {
    await dataClient.resetMockData();
    toast("Mock data reset.");
    setTimeout(() => window.location.replace("/login"), 500);
  };

  const initials = user?.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>

        {/* Profile */}
        {!loading && user && (
          <Card>
            <CardContent className="py-4 px-4 flex items-center gap-4">
              <Avatar className="size-12">
                <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold truncate">{user.name}</p>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reminder */}
        <Card>
          <CardContent className="py-4 px-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
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
                <Separator />
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Remind me at</Label>
                  <Select value={reminder.time} onValueChange={(v) => v && handleReminderTime(v)}>
                    <SelectTrigger className="w-32 h-8 text-sm">
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
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardContent className="py-4 px-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              {notifState === "granted" ? (
                <Bell className="size-4 text-emerald-600" />
              ) : (
                <BellOff className="size-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">Push notifications</span>
            </div>
            {notifState === "unsupported" && (
              <p className="text-sm text-muted-foreground">Push notifications are not supported in this browser.</p>
            )}
            {notifState === "default" && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">Allow notifications to receive daily reminders.</p>
                <Button variant="outline" size="sm" onClick={handleNotifRequest} className="self-start">
                  Enable notifications
                </Button>
              </div>
            )}
            {notifState === "granted" && (
              <p className="text-sm text-emerald-700">Notifications are enabled.</p>
            )}
            {notifState === "denied" && (
              <div className="flex flex-col gap-1">
                <p className="text-sm text-destructive">Notifications are blocked.</p>
                <p className="text-xs text-muted-foreground">Go to your browser settings to re-enable them.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PWA install */}
        {!isStandalone && (
          <Card>
            <CardContent className="py-4 px-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Install app</span>
              </div>
              <p className="text-sm text-muted-foreground">
                On iOS Safari: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.
                On Android Chrome: tap the menu → <strong>Install app</strong>.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Account actions */}
        <div className="flex flex-col gap-2 pt-2">
          <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2">
            <LogOut className="size-4" />
            Sign out
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowReset(true)}
            className="flex items-center gap-2 text-destructive hover:text-destructive"
          >
            <RefreshCcw className="size-4" />
            Reset mock data
          </Button>
        </div>
      </div>

      <Dialog open={showReset} onOpenChange={setShowReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset mock data?</DialogTitle>
            <DialogDescription>
              This clears all localStorage state and returns to the login screen. Useful for testing
              fresh flows.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReset(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReset}>Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
