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
      description: "The web client is public. Read it, build it, check it.",
      sections: [
        {
          id: "repo",
          heading: "The repository",
          blocks: [
            {
              type: "p",
              text: "The code behind chat.ababilx.com is on GitHub. You can see exactly what runs in your browser, including how it encrypts.",
            },
            {
              type: "cards",
              items: [
                {
                  title: "AbabilX/chat_web",
                  text: "The web client’s source on GitHub.",
                  href: GITHUB_REPO_URL,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
