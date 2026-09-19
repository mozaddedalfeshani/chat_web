"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  logout as endSession,
  getStoredToken,
  sessionPlanUser,
  type AppUser,
} from "@/lib/api";
import { initAccent } from "@/lib/accent";
import { applyTheme, getStoredTheme } from "@/lib/theme";
import { shipDefaultIfFreshInstall } from "@/lib/chat/chat-wallpaper";

export function useUserSession() {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    Promise.all([api.getMeSession(), api.getMePlan()])
      .then(([session, plan]) => {
        if (cancelled) return;
        setUser(sessionPlanUser(session, plan));
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof Error && err.message === "unauthorized") {
          endSession();
          router.replace("/");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    function handleUserUpdated(event: Event) {
      const patch = (event as CustomEvent<Partial<AppUser>>).detail;
      if (!patch) return;
      setUser((current) =>
        current ? { ...current, ...patch } : (patch as AppUser),
      );
    }

    window.addEventListener("ababilx:user-updated", handleUserUpdated);
    return () => {
      window.removeEventListener("ababilx:user-updated", handleUserUpdated);
    };
  }, []);

  useEffect(() => {
    applyTheme(getStoredTheme());
    initAccent();
    // Fresh installs only — upgrades keep plain / existing wallpaper choices.
    shipDefaultIfFreshInstall();
  }, []);

  return { user };
}
