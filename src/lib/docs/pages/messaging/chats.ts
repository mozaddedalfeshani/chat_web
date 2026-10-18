import type { DocPage } from "../../types";

export const CHATS: DocPage = {
  slug: "chats",
  title: "Your chat list",
  description:
    "Pin, mute, lock, mark as read and delete chats; filter the list; and control what notifications show.",
  keywords: ["pin chat", "mute chat", "chat lock", "delete chat", "notifications", "hide notification text"],
  updated: "2026-10-19",
  sections: [
    {
      id: "long-press",
      heading: "Long press a chat",
      blocks: [
        { type: "p", text: "In the Android app, hold a chat in the list to open its menu: Pin or Unpin, Mute or Unmute, Mark as read, and Delete (or Leave, for a group). Swiping a row offers the same delete." },
        {
          type: "list",
          items: [
            "Pinned chats sit at the top, up to four. A pinned chat still moves up inside the pinned block when a message arrives.",
            "Filters above the list: All, Unread, and Flock for webhook feeds.",
            "On the web, pins made on the phone are shown in the normal order for now.",
          ],
        },
      ],
    },
    {
      id: "mute",
      heading: "Mute",
      blocks: [
        { type: "p", text: "Tap Mute (in the long-press menu or the chat's details) and choose how long: 1 hour, 8 hours, 1 day, 1 week, Always, or a custom date and time. In a group you can also choose Only mentions: you are notified only when someone @mentions you or replies to you." },
        {
          type: "list",
          items: [
            "Tap again while muted to unmute at once.",
            "A timed mute ends by itself; nothing needs to be switched back.",
            "Muting is set in the Android app. The web shows a bell-off (or @) badge beside a muted chat and when the mute ends.",
          ],
        },
      ],
    },
    {
      id: "notifications",
      heading: "Notifications",
      blocks: [
        {
          type: "list",
          items: [
            "On Android, encrypted messages are decrypted on your phone, so the notification shows the real text. Our server never sees it.",
            "Reply or mark as read straight from the notification.",
            "Per DM, Hide notification text shows only “AbabilX · New message”. Locked chats always hide it.",
          ],
        },
      ],
    },
    {
      id: "chat-lock",
      heading: "Lock a chat",
      blocks: [
        {
          type: "steps",
          items: [
            "Open the chat's details and tap Chat lock.",
            "Choose Phone lock (fingerprint, face or screen lock) or Password (at least 4 characters).",
            "The chat leaves your chat list. Hold the AbabilX title above the list, or go to Settings → Locked chats, to find it.",
          ],
        },
        { type: "callout", text: "A lock lives on this phone only. Its notifications never show the sender or text, and its files are not put in your local backup." },
      ],
    },
    {
      id: "delete",
      heading: "Delete a chat",
      blocks: [
        { type: "p", text: "Delete removes the chat and its messages for you, on our server and on this phone, including downloaded files. The other person keeps their copy. When everyone in it has deleted it, the messages and files are erased from our servers." },
        { type: "p", text: "Leaving a group works the same way for you. When the last member leaves, the group is erased." },
        { type: "callout", text: "Deleting a chat is in the Android app." },
      ],
    },
    {
      id: "search",
      heading: "Search",
      blocks: [
        { type: "p", text: "Search on the web or in the app lists chats whose name matches first, then messages that contain your words. Inside a chat, search from its details." },
      ],
    },
  ],
};
