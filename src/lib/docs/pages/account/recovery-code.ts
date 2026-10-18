import type { DocPage } from "../../types";

export const RECOVERY_CODE: DocPage = {
  slug: "recovery-code",
  title: "Recovery code",
  description: "How your message key and history reach a new phone or browser, and where the old recovery code fits in.",
  sections: [
    {
      id: "what-changed",
      heading: "What changed",
      blocks: [
        {
          type: "p",
          text: "The Android app no longer shows a recovery code. Your phone is the archive of your chats, and Local backup is how that archive comes back after a reinstall or on a new phone.",
        },
        {
          type: "callout",
          text: "Already wrote one down? It still works on the web: when the browser asks for your messages, choose the recovery code instead of scanning.",
        },
      ],
    },
    {
      id: "new-browser",
      heading: "A new browser or computer",
      blocks: [
        {
          type: "steps",
          items: [
            "Open chat.ababilx.com.",
            "Scan the QR code with the AbabilX app on your phone and approve.",
            "Your key arrives sealed to that browser, and your recent chats follow.",
          ],
        },
      ],
    },
    {
      id: "new-phone",
      heading: "A new or reset phone",
      blocks: [
        {
          type: "steps",
          items: [
            "Install AbabilX and sign in.",
            "Choose Continue with local backup. After a reinstall, Android asks you to pick the backup folder once (Documents/AbabilX).",
            "Your chats, photos, call log and settings come back. Or choose Continue without restoring to start fresh.",
          ],
        },
        {
          type: "callout",
          tone: "warn",
          text: "Starting fresh makes a new key. Messages that were only on the old phone, and not in a backup, cannot be opened by anyone, us included.",
        },
      ],
    },
  ],
};
