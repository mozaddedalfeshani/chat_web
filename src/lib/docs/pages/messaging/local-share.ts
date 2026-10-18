import type { DocPage } from "../../types";

export const LOCAL_SHARE: DocPage = {
  slug: "local-share",
  title: "Local Share",
  description: "Send text, files, folders and voice notes between AbabilX devices on the same Wi-Fi, without our servers.",
  keywords: ["Local Share", "share files on Wi-Fi", "LAN file transfer", "phone to computer transfer"],
  updated: "2026-10-19",
  sections: [
    {
      id: "use",
      heading: "Use it",
      blocks: [
        { type: "steps", items: ["Open Local Share: on Android from the You sheet, on desktop from the side rail (⌘4).", "Give this device a name (required the first time).", "Pick a nearby device and send a pair request. The other side taps Accept once; after that the two devices know each other.", "Each device gets its own chat-style thread: text, files, folders and voice notes. Large transfers resume if interrupted."] },
        { type: "p", text: "You can also show a Local Share thread in your normal chat list (thread menu → Show in chat list)." },
      ],
    },
    {
      id: "limits",
      heading: "Good to know",
      blocks: [
        {
          type: "list",
          items: [
            "Both devices must be on the same Wi-Fi network. Nothing goes through the internet or our servers.",
            "Android app and desktop app only; the web has no Local Share.",
            "Pairing always needs a tap on the other device; a device asking again gets a new pairing.",
            "Delete a message for you or for both, or forward it to a chat.",
          ],
        },
        { type: "callout", tone: "warn", text: "Local Share is not encrypted on the network. Use it on networks you trust, such as home or office Wi-Fi, not public hotspots." },
      ],
    },
  ],
};
