"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa/register-sw";

export function SWRegistrar() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}
