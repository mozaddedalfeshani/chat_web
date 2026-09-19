/**
 * Built-in chat backgrounds. Ids align with mobile (`chat_wallpaper_presets.dart`)
 * so the three clients name the same thing.
 *
 * The leading `mobile` preset is a light/dark art pair (seamless doodle). Solids
 * and gradients follow for the picker grid.
 */

export const CHAT_WALLPAPER_MOBILE_ID = "mobile";

export type ChatWallpaperPreset = {
  id: string;
  colors: string[];
  /** Light-theme (and dark when `darkAsset` is absent) painting. */
  asset?: string;
  /** Dark-theme painting — swaps with theme instead of dimming. */
  darkAsset?: string;
};

export const chatWallpaperPresets: ChatWallpaperPreset[] = [
  {
    id: CHAT_WALLPAPER_MOBILE_ID,
    colors: ["#E6E2DA", "#1A3D2E"],
    asset: "/wallpapers/webs_light.jpg",
    darkAsset: "/wallpapers/webs_dark.jpg",
  },
  { id: "slate", colors: ["#1F2430"] },
  { id: "ink", colors: ["#0F172A"] },
  { id: "sand", colors: ["#EFE7DA"] },
  { id: "mist", colors: ["#E6ECF5"] },
  { id: "sage", colors: ["#DDE9DF"] },
  { id: "rose", colors: ["#F6E2E6"] },
  { id: "indigo", colors: ["#6366F1", "#312E81"] },
  { id: "dusk", colors: ["#7C3AED", "#DB2777"] },
  { id: "ocean", colors: ["#0EA5E9", "#1E3A8A"] },
  { id: "forest", colors: ["#34D399", "#065F46"] },
  { id: "ember", colors: ["#F97316", "#9A3412"] },
  { id: "graphite", colors: ["#334155", "#0B1120"] },
];

export function chatWallpaperPresetById(
  id: string,
): ChatWallpaperPreset | null {
  return chatWallpaperPresets.find((p) => p.id === id) ?? null;
}

export function isThemePairPreset(preset: ChatWallpaperPreset): boolean {
  return Boolean(preset.asset && preset.darkAsset);
}

/**
 * CSS `background` for a preset. Art pairs tile (seamless doodles on a wide
 * pane); solids/gradients match Signal's diagonal swatches.
 */
export function presetBackground(
  preset: ChatWallpaperPreset,
  dark = false,
): string {
  const asset =
    dark && preset.darkAsset ? preset.darkAsset : (preset.asset ?? null);
  if (asset) {
    return `center / 420px auto repeat url("${asset}")`;
  }
  if (preset.colors.length < 2) return preset.colors[0];
  return `linear-gradient(135deg, ${preset.colors.join(", ")})`;
}
