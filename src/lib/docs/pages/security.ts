import type { DocGroup } from "../types";
import { DEVICES, RECOVERY_CODE } from "./account";
import { HOW_ENCRYPTION_WORKS } from "./how-encryption-works";

export const SECURITY: DocGroup = {
  title: "Security",
  pages: [
    {
      slug: "encryption",
      title: "End-to-end encryption",
      description: "Your messages are sealed on your device before they leave it.",
      sections: [
        {
          id: "how-it-works",
          heading: "How it works",
          blocks: [
            {
              type: "p",
              text: "Your phone makes its own key pair. Each chat gets a key of its own, sealed separately to every member. Messages are encrypted with it before they are sent, so our servers only ever carry text they cannot open.",
            },
            {
              type: "p",
              text: "Direct messages and groups both work this way. When someone joins or leaves a group, the group gets a new key, so a person who left cannot read what comes after.",
            },
          ],
        },
        {
          id: "what-we-see",
          heading: "What our servers can see",
          blocks: [
            {
              type: "list",
              items: [
                "Who is in a chat, and when messages are sent.",
                "How large a message or file is.",
                "Never the text of an encrypted message, and never your key.",
                "Encrypted messages only until your phones have them: then they are deleted from our servers.",
              ],
            },
            {
              type: "callout",
              tone: "warn",
              title: "Files",
              text: "In DMs and groups, the phone and this web client encrypt every file before upload; our storage holds only ciphertext. Files sent before that change stay readable by our storage until they are deleted. Flocks (webhook feeds) are not end-to-end encrypted.",
            },
          ],
        },
        {
          id: "deep-dive",
          heading: "The full flow",
          blocks: [
            {
              type: "cards",
              items: [
                {
                  title: "How encryption works",
                  text: "Every key, who holds it, and each step with flowcharts.",
                  href: "/docs/how-encryption-works",
                },
              ],
            },
          ],
        },
        {
          id: "new-members",
          heading: "New group members",
          blocks: [
            {
              type: "p",
              text: "Someone added to a group sees messages from the moment they joined, not the history before it.",
            },
          ],
        },
      ],
    },
    HOW_ENCRYPTION_WORKS,
    RECOVERY_CODE,
    {
      slug: "safety-numbers",
      title: "Safety numbers",
      description: "Check that nobody sits between you and the person you talk to.",
      sections: [
        {
          id: "compare",
          heading: "Compare the numbers",
          blocks: [
            {
              type: "steps",
              items: [
                "Open the chat and its details.",
                "Open the safety number. You both see the same 60 digits.",
                "Compare them in person or on a call. If they match, your chat is private.",
              ],
            },
          ],
        },
        {
          id: "change-warning",
          heading: "When a key changes",
          blocks: [
            {
              type: "p",
              text: "Your app remembers each contact’s key. If it changes, for example after they reinstall and start fresh, the chat shows a warning so you can compare again.",
            },
          ],
        },
      ],
    },
    {
      slug: "message-requests",
      title: "Message requests",
      description: "Strangers can write to you, but you decide whether to answer.",
      sections: [
        {
          id: "requests",
          heading: "How requests work",
          blocks: [
            {
              type: "p",
              text: "A first message from someone you have not connected with arrives as a request. Accept, delete or block it from inside the chat. Replying accepts it too.",
            },
            {
              type: "p",
              text: "Until you accept, they cannot see that you are typing or that you read it.",
            },
          ],
        },
        {
          id: "groups",
          heading: "Being added to groups",
          blocks: [
            {
              type: "p",
              text: "Only people you have connected with can add you to a group.",
            },
          ],
        },
        {
          id: "discovery",
          heading: "Who can find you",
          blocks: [
            {
              type: "p",
              text: "People can find you by exact email or phone number. Search by username is off for new accounts; turn it on in Settings → Discovery.",
            },
          ],
        },
      ],
    },
    DEVICES,
  ],
};
