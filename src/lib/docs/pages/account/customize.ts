import type { DocPage } from "../../types";

export const CUSTOMIZE: DocPage = {
  slug: "customize",
  title: "Wallpaper, app icon and settings",
  description: "Chat wallpapers, a disguised app icon, your name, username, password and other settings.",
  keywords: ["chat wallpaper", "hide app icon", "disguise app", "change display name", "add password"],
  updated: "2026-10-19",
  sections: [
    {
      id: "wallpaper",
      heading: "Chat wallpaper",
      blocks: [{ type: "p", text: "Settings → Chat wallpaper sets a default for every chat; a chat's details can override it. Pick a preset or your own photo, and choose whether to dim it in dark theme. Wallpapers are kept on the device only, so each phone or browser has its own." }],
    },
    {
      id: "app-icon",
      heading: "App icon",
      blocks: [
        { type: "p", text: "On Android, Settings → App icon can make AbabilX look like a Calendar, Calculator or Notes app on your home screen." },
        { type: "callout", text: "While a disguise is on, your recent chats are not offered in the Android share sheet, so the launcher does not give the app away." },
      ],
    },
    {
      id: "account",
      heading: "Your account",
      blocks: [
        {
          type: "table",
          head: ["Setting", "What it does"],
          rows: [
            ["Name", "Your display name, 1–50 characters. Signing in with Google or GitHub never overwrites it."],
            ["Username", "Your unique handle, used for search and your QR code."],
            ["Password", "Add or change an email password with a code sent to your own address, so you can sign in without Google. Android and the AbabilX workspace site."],
            ["Discovery", "Who can find you by email, phone or username, and the typing indicator switch."],
            ["Privacy mode", "See Privacy mode."],
            ["Notifications", "Sounds and what notifications show."],
          ],
        },
      ],
    },
    {
      id: "languages",
      heading: "Languages",
      blocks: [{ type: "p", text: "The Android app is in English and Bangla (বাংলা). Switch in Settings." }],
    },
  ],
};
