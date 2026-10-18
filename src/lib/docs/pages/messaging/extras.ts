import type { DocPage } from "../../types";

export const SEND_LATER: DocPage = {
  slug: "send-later",
  title: "Send later",
  description: "Write now, deliver at the time you pick, up to 120 days ahead. The message waits on our server, still encrypted.",
  androidOnly: true,
  keywords: ["schedule message", "send later", "scheduled message encrypted"],
  updated: "2026-10-19",
  sections: [
    {
      id: "schedule",
      heading: "Schedule a message",
      blocks: [
        { type: "steps", items: ["Write the message (text, files, a voice note, a snippet or a task).", "Hold the send button.", "Pick In 1 hour, Today 9 PM, Tomorrow 9 AM, Tomorrow 9 PM, or Custom."] },
        { type: "p", text: "Files upload now; the message goes out at the time you chose and arrives as an ordinary message. A capsule above the composer (“2 scheduled”) lists what is waiting: Send now, Change time or Delete." },
      ],
    },
    {
      id: "limits",
      heading: "Where and how many",
      blocks: [
        {
          type: "list",
          items: [
            "DMs, groups and thread replies. Not in Note to Self, flocks or private chats, and not for view-once photos.",
            "From 1 minute to 120 days ahead; up to 50 waiting per chat and 200 per account.",
            "If the group's members change before the time, your phone re-seals the message for the new key next time the app is open. A phone that stays closed sends it late.",
            "If it cannot be sent (you left, or were blocked), it shows in red as “not sent” and you get a notification.",
          ],
        },
      ],
    },
  ],
};

export const TASK_CARDS: DocPage = {
  slug: "task-cards",
  title: "Task cards",
  description: "Turn a DM message into a task with a priority and status that both of you can change.",
  keywords: ["task card chat", "tasks in DM", "task status priority"],
  updated: "2026-10-19",
  sections: [
    {
      id: "create",
      heading: "Create a task",
      blocks: [{ type: "p", text: "In a DM (or Note to Self), tap + and choose Task. Give it a title, a description, a priority (low, medium, high, urgent) and any photos or files. It is sent as an encrypted message; only the priority and status are visible to our server." }],
    },
    {
      id: "track",
      heading: "Track it",
      blocks: [
        { type: "p", text: "Either of you can change the status (to do, in progress, review, blocked, done, cancelled) or the priority. Each change shows as a line in the chat and notifies the other person. Every task is listed under Tasks in the chat's details, filtered by All, Open or Closed." },
        { type: "callout", text: "Tasks work in the Android app, on the web and in the desktop app. Not available in groups, private chats or threads." },
      ],
    },
  ],
};

export const NOTE_TO_SELF: DocPage = {
  slug: "note-to-self",
  title: "Note to Self",
  description: "A private, end-to-end encrypted chat with only you in it, on every device you sign in to.",
  keywords: ["Note to Self", "message yourself", "private notes chat"],
  updated: "2026-10-19",
  sections: [
    {
      id: "use",
      heading: "Use it",
      blocks: [{ type: "p", text: "Everyone has one in their chat list. Send yourself notes, links, files and task cards; they are encrypted like any DM and show up on every device you sign in to." }],
    },
  ],
};

export const KHAAM: DocPage = {
  slug: "khaam",
  title: "Khaam",
  description: "A greeting card in a chat: pick a cover, write a message, and the other person scratches the foil to reveal it.",
  androidOnly: true,
  keywords: ["Khaam", "greeting card", "Eid card", "birthday card", "scratch card message"],
  updated: "2026-10-19",
  sections: [
    {
      id: "send",
      heading: "Send a Khaam",
      blocks: [
        { type: "steps", items: ["In a chat, tap + and choose Khaam.", "Pick a cover (search Eid, birthday, wedding…).", "Write your own message, or roll the dice for one, then send."] },
        { type: "p", text: "The receiver opens it full screen and scratches the foil, or taps Reveal all, to see the message, with confetti. Opening it again later shows it without the foil." },
      ],
    },
  ],
};
