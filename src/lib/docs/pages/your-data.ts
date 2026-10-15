import { GITHUB_REPO_URL } from "@/lib/site";
import type { DocGroup } from "../types";

export const YOUR_DATA: DocGroup = {
  title: "Your data",
  pages: [
    {
      slug: "history",
      title: "Message history",
      description: "Our server keeps 120 days. Your phone keeps everything.",
      sections: [
        {
          id: "two-clocks",
          heading: "Two places, two clocks",
          blocks: [
            {
              type: "p",
              text: "Our servers delete messages after 120 days. Your phone keeps its own copy for good, so your history lives with you, not with us.",
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
              text: "The backup’s key is held by our server and the file by your phone. Together they open it, so this backup is not end-to-end encrypted. Private chats and view-once photos are never included.",
            },
          ],
        },
      ],
    },
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
