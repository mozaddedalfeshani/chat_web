import type { DocPage } from "../../types";

export const DEVICES: DocPage = {
  slug: "devices",
  title: "Linked devices and sessions",
  description: "See every device signed in to your account, link a computer with one scan, and sign devices out.",
  keywords: ["linked devices", "sign out other devices", "AbabilX sessions", "link computer"],
  updated: "2026-10-19",
  sections: [
    {
      id: "link",
      heading: "Link a computer",
      blocks: [
        { type: "steps", items: ["Open chat.ababilx.com or the desktop app and show the QR code.", "Scan it from the AbabilX app on your phone.", "Check the six digits match and approve. The computer gets your message key and your recent chats in the same step."] },
        { type: "p", text: "Your phone sends a linked computer the last 3 months of history; older messages stay on the phone. A linked computer then receives new messages and files directly." },
      ],
    },
    {
      id: "limits",
      heading: "Limits",
      blocks: [
        {
          type: "list",
          items: [
            "Up to 5 linked computers. Linking a sixth asks you to sign one out first, right on the phone.",
            "A linked computer not used for 14 days is signed out by itself.",
            "If none of your phones has been used for 14 days, linked computers are signed out too, since the phone is where your chats live.",
          ],
        },
      ],
    },
    {
      id: "manage",
      heading: "See and sign out devices",
      blocks: [
        { type: "p", text: "On Android, Settings → Linked devices lists every device, when it was linked and when it was last active; computers that keep your chats say “Keeps chats”. Use the ⋮ on a row to rename or sign it out, or Sign out all other devices at the top." },
        { type: "p", text: "Signing a device out takes effect within seconds, everywhere. Changing your password does not sign other devices out." },
      ],
    },
  ],
};
