import { GITHUB_REPO_URL } from "@/lib/site";
import type { DocGroup } from "../types";
import { DATA_STORAGE } from "./account";

export const YOUR_DATA: DocGroup = {
  title: "Your data",
  pages: [
    {
      slug: "history",
      title: "Message history",
      description: "Our server keeps a message only until your devices have it. Your phone keeps everything.",
      sections: [
        {
          id: "two-clocks",
          heading: "Two places, two clocks",
          blocks: [
            {
              type: "p",
              text: "In DMs, groups and Note to Self, our server keeps each message only until every member's phones have saved it, then deletes it and its files. A message nobody's phone picks up is deleted after 30 days anyway. Your phone keeps its own copy for good, so your history lives with you, not with us.",
            },
            {
              type: "p",
              text: "On the web, you see what the server still holds plus what your phone sends this browser. Older messages say they are kept on your phone.",
            },
          ],
        },
        {
          id: "delete-chat",
          heading: "Deleting a chat",
          blocks: [
            {
              type: "p",
              text: "Deleting a chat removes it for you straight away. The messages and files are erased from our servers once everyone in it has deleted it too.",
            },
          ],
        },
      ],
    },
    {
      slug: "local-backup",
      title: "Local backup",
      description: "A sealed backup your phone writes to a folder you can see.",
      androidOnly: true,
      sections: [
        {
          id: "how-it-works",
          heading: "How it works",
          blocks: [
            {
              type: "p",
              text: "It is on by default. About twice a day, when you open the app, your phone writes a sealed backup to Documents/AbabilX, or to a folder you choose. Photos and files are stored once and reused.",
            },
          ],
        },
        {
          id: "restore",
          heading: "Restore",
          blocks: [
            {
              type: "p",
              text: "After a reinstall or a fresh start, AbabilX finds the backup and brings back your chats, photos, call log and settings.",
            },
            {
              type: "callout",
              tone: "warn",
              text: "The backup’s key is held by our server and the file by your phone. Together they open it, so this backup is not end-to-end encrypted. View-once and timed photos, files the sender did not allow saving, and locked chats' files are never included.",
            },
          ],
        },
      ],
    },
    DATA_STORAGE,
    {
      slug: "open-source",
      title: "Open source",
      description: "The AbabilX Chat Android app is open source. Read it, build it, check how it encrypts.",
      sections: [
        {
          id: "repo",
          heading: "The repository",
          blocks: [
            {
              type: "p",
              text: "The code of the AbabilX Chat Android app is public on GitHub under the GNU Affero General Public License v3.0 (AGPL-3.0). You can read exactly how it encrypts your messages, files and calls, build it yourself, and change it under the terms of that license.",
            },
            {
              type: "cards",
              items: [
                {
                  title: "AbabilX/ababilx-mobile",
                  text: "The Android app’s source on GitHub (AGPL-3.0).",
                  href: GITHUB_REPO_URL,
                },
              ],
            },
          ],
        },
        {
          id: "no-personal-details",
          heading: "No personal details needed",
          blocks: [
            {
              type: "p",
              text: "Most messengers start with your phone number or email address. AbabilX does not need either. Start New Chat creates your account from a key that stays on your phone, so you can talk to people without giving us your name, number or email.",
            },
            {
              type: "list",
              items: [
                "No phone number, no email and no name are required.",
                "Messages, calls and files are end-to-end encrypted. We cannot read them.",
                "Our server deletes each message once your devices have it.",
                "No ads, no trackers and no AI reading your chats.",
              ],
            },
          ],
        },
        {
          id: "what-is-public",
          heading: "What is public, and what is not yet",
          blocks: [
            {
              type: "list",
              items: [
                "Public: the Android app, including its encryption code.",
                "Coming next: our server, planned to be open-sourced in December 2026.",
                "Not public yet: the web client at chat.ababilx.com and the desktop app.",
              ],
            },
            {
              type: "callout",
              tone: "info",
              text: "Parts of the app are adapted from Signal’s open-source code, which is also AGPL-3.0. Third-party code keeps its own license; the full list is in THIRD_PARTY_NOTICES in the repository.",
            },
          ],
        },
      ],
    },
  ],
};
