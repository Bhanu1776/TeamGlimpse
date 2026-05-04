"use client";

import { useSession } from "@/lib/auth/mock-session";

export default function RootPage() {
  useSession(); // handles all redirects
  return null;
}
