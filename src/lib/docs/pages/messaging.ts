import type { DocGroup } from "../types";

export const MESSAGING: DocGroup = {
  title: "Messaging",
  pages: [
    {
      slug: "groups",
      title: "Groups",
      description: "Encrypted groups with admins, permissions and group privacy.",
      sections: [
        {
          id: "create",
          heading: "Create a group",
          blocks: [
            {
              type: "p",
              text: "Pick people you are connected with and name the group. You become its admin. Groups are end-to-end encrypted like DMs.",
            },
          ],
        },
        {
          id: "permissions",
          heading: "Member permissions",
          blocks: [
            {
              type: "p",
              text: "Admins choose what members can do: send messages, photos, videos, files or voice notes, add people, pin, change the group’s info, start calls and forward. Set it for the whole group, or make an exception for one person.",
            },
            {
              type: "callout",
              text: "Changing permissions is in the Android app. The web shows the result.",
            },
          ],
        },
        {
          id: "group-privacy",
          heading: "Group privacy",
          blocks: [
            {
              type: "p",
              text: "An admin switch that stops forwarding and saving for everyone, hides the member list from non-admins, and blocks screenshots on Android.",
            },
          ],
        },
      ],
    },
    {
      slug: "calls",
      title: "Voice and video calls",
      description: "Calls go device to device whenever the network allows.",
      sections: [
        {
          id: "one-to-one",
          heading: "One-to-one calls",
          blocks: [
            {
              type: "p",
              text: "Tap Call in a DM. Turn on your camera once you are connected. Audio and video travel directly between the two devices; our server only helps them find each other.",
            },
            {
              type: "p",
              text: "Either side can share their screen. Pressing Share while the other person shares takes it over.",
            },
          ],
        },
        {
          id: "group-calls",
          heading: "Group calls",
          blocks: [
            {
              type: "list",
              items: [
                "Free, with no minute limits.",
                "A lobby to choose your microphone before you join.",
                "Screen sharing, raised hands in order, and reactions.",
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "send-later",
      title: "Send later",
      description: "Write now, deliver at the time you pick.",
      androidOnly: true,
      sections: [
        {
          id: "schedule",
          heading: "Schedule a message",
          blocks: [
            {
              type: "steps",
              items: [
                "Write the message.",
                "Hold the send button.",
                "Pick a time: in an hour, tonight, tomorrow, or your own.",
              ],
            },
            {
              type: "p",
              text: "It waits on our server, still encrypted, and goes out on time. A capsule above the composer lists what is waiting: send now, change the time or delete.",
            },
          ],
        },
      ],
    },
    {
      slug: "task-cards",
      title: "Task cards",
      description: "Turn a DM message into a task you both can track.",
      sections: [
        {
          id: "create",
          heading: "Create a task",
          blocks: [
            {
              type: "p",
              text: "In a DM, tap + and choose Task. Give it a title, a description, a priority and any files. It is sent as an encrypted message.",
            },
          ],
        },
        {
          id: "track",
          heading: "Track it",
          blocks: [
            {
              type: "p",
              text: "Either of you can change its status (to do, in progress, review, blocked, done, cancelled) or its priority. Each change shows in the chat and notifies the other person. Every task in the chat is listed under Tasks.",
            },
          ],
        },
      ],
    },
    {
      slug: "note-to-self",
      title: "Note to Self",
      description: "A private chat with only you in it.",
      sections: [
        {
          id: "use",
          heading: "Use it",
          blocks: [
            {
              type: "p",
              text: "Everyone has one in their chat list. Send yourself notes, links and files; they are encrypted like any DM and show up on every device you sign in to.",
            },
          ],
        },
      ],
    },
  ],
};
