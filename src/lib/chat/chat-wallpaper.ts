import { useSyncExternalStore } from "react";
import {
  CHAT_WALLPAPER_MOBILE_ID,
  chatWallpaperPresetById,
  isThemePairPreset,
  presetBackground,
} from "./chat-wallpaper-presets";

/**
 * Device-local chat wallpaper. Same storage keys / JSON shape as mobile and
 * desktop so a choice means the same thing on every client.
 */
export type ChatWallpaper = {
  kind: "none" | "preset" | "photo";
  preset: string;
  photo: string;
  dim: boolean;
};

export const noWallpaper: ChatWallpaper = {
  kind: "none",
  preset: "",
  photo: "",
  dim: true,
};

const GLOBAL_KEY = "ababilx_chat_wallpaper_global";
const PREFIX = "ababilx_chat_wallpaper_";
const SHIPPED_KEY = "ababilx_chat_wallpaper_shipped_default_v1";

const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version += 1;
  for (const fn of listeners) fn();
}

function decode(raw: string | null): ChatWallpaper {
  if (!raw) return noWallpaper;
  try {
    const json = JSON.parse(raw) as Partial<ChatWallpaper>;
    const kind =
      json.kind === "preset" || json.kind === "photo" ? json.kind : "none";
    return {
      kind,
      preset: json.preset ?? "",
      photo: json.photo ?? "",
      dim: json.dim ?? true,
    };
  } catch {
    return noWallpaper;
  }
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: ChatWallpaper | null) {
  try {
    if (!value || value.kind === "none") window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
  emit();
}

/**
 * Fresh installs get the theme-aware mobile pair. Upgrades keep plain (or
 * whatever they already chose). Call once from the signed-in shell before chat
 * prefs hydrate and look like a returning install.
 */
export function shipDefaultIfFreshInstall() {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(SHIPPED_KEY)) return;
    const keys = Object.keys(window.localStorage);
    const returning = keys.some(
      (k) =>
        k.startsWith("ababilx_") ||
        k.startsWith("chat-deletions:") ||
        k === "messaging_onboarding_v1_seen",
    );
    if (!returning) {
      window.localStorage.setItem(
        GLOBAL_KEY,
        JSON.stringify({
          kind: "preset",
          preset: CHAT_WALLPAPER_MOBILE_ID,
          photo: "",
          dim: false,
        } satisfies ChatWallpaper),
      );
    }
    window.localStorage.setItem(SHIPPED_KEY, "1");
    emit();
  } catch {
    // Private mode / quota — leave plain.
  }
}

export function getGlobalWallpaper(): ChatWallpaper {
  if (typeof window === "undefined") return noWallpaper;
  return decode(read(GLOBAL_KEY));
}

export function setGlobalWallpaper(wallpaper: ChatWallpaper | null) {
  write(GLOBAL_KEY, wallpaper);
}

/** `null` = follow global. Stored `none` = plain for this chat only. */
export function getChatWallpaperOverride(
  conversationId: string,
): ChatWallpaper | null {
  if (typeof window === "undefined") return null;
  const raw = read(PREFIX + conversationId);
  return raw === null ? null : decode(raw);
}

export function setChatWallpaperOverride(
  conversationId: string,
  wallpaper: ChatWallpaper | null,
) {
  const key = PREFIX + conversationId;
  if (wallpaper === null) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      return;
    }
    emit();
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(wallpaper));
  } catch {
    return;
  }
  emit();
}

export function resolveChatWallpaper(
  conversationId: string | null,
): ChatWallpaper {
  if (!conversationId) return getGlobalWallpaper();
  return getChatWallpaperOverride(conversationId) ?? getGlobalWallpaper();
}

/** CSS `background`, or null when nothing should paint. */
export function wallpaperBackground(
  wallpaper: ChatWallpaper,
  dark: boolean,
): string | null {
  if (wallpaper.kind === "photo" && wallpaper.photo) {
    return `center / cover no-repeat url("${wallpaper.photo}")`;
  }
  if (wallpaper.kind !== "preset") return null;
  const preset = chatWallpaperPresetById(wallpaper.preset);
  return preset ? presetBackground(preset, dark) : null;
}

export function wallpaperIsThemePair(wallpaper: ChatWallpaper): boolean {
  if (wallpaper.kind !== "preset") return false;
  const preset = chatWallpaperPresetById(wallpaper.preset);
  return preset ? isThemePairPreset(preset) : false;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key.startsWith(PREFIX) || e.key === GLOBAL_KEY) {
      version += 1;
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useChatWallpaper(conversationId: string | null): ChatWallpaper {
  useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
  return resolveChatWallpaper(conversationId);
}
