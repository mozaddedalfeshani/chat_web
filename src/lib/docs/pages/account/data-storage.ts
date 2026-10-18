import type { DocPage } from "../../types";

export const DATA_STORAGE: DocPage = {
  slug: "data-storage",
  title: "Data and storage",
  description: "See what AbabilX stores on your phone, free up space, and choose what downloads on Wi-Fi, mobile data and roaming.",
  androidOnly: true,
  keywords: ["manage storage", "auto-download", "roaming data", "media quality", "free up space"],
  updated: "2026-10-19",
  sections: [
    {
      id: "manage",
      heading: "Manage storage",
      blocks: [
        { type: "p", text: "Settings → Data and storage → Manage storage shows how much photos, videos, files and voice notes take, the biggest chats, and Review storage for the largest files. You can delete media older than 30 days, 6 months or a year, or all of it." },
        { type: "callout", tone: "warn", text: "Clearing a file removes the copy on this phone and the message shows a download button. In DMs, groups and Note to Self our server deletes each file once every member's phones have it, so a cleared file usually cannot come back, except from your local backup." },
      ],
    },
    {
      id: "auto-download",
      heading: "Media auto-download",
      blocks: [
        { type: "callout", text: "In DMs, groups and Note to Self, every file is downloaded as soon as its message arrives, whatever these settings say. Our server deletes its copy once your phones have it, so waiting for a tap could lose the file." },
        { type: "p", text: "The settings below apply to the rest, such as flocks (webhook feeds). Choose, per type, whether it downloads on Wi-Fi, on mobile data and while roaming." },
        {
          type: "table",
          head: ["Type", "Wi-Fi", "Mobile data", "Roaming"],
          rows: [
            ["Photos", "On", "On", "Off"],
            ["Voice notes", "On", "On", "Off"],
            ["Videos", "Your choice", "Your choice", "Off"],
            ["Documents", "Your choice", "Your choice", "Off"],
          ],
        },
        { type: "p", text: "Defaults shown. Auto-download never fetches a file over 5 MB; tap those to download." },
      ],
    },
    {
      id: "quality",
      heading: "Sent media quality",
      blocks: [{ type: "p", text: "Standard sends smaller photos and videos; High keeps more detail. A photo that is already small enough is sent as it is." }],
    },
  ],
};
