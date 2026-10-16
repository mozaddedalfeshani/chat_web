import type { DocSection } from "../../types";

export const MORE: DocSection[] = [
  {
    id: "membership",
    heading: "Groups and key changes",
    blocks: [
      {
        type: "p",
        text: "Groups use the same scheme as DMs. The only new problem is that the set of people changes under the key.",
      },
      {
        type: "table",
        head: ["What happens", "What the chat does"],
        rows: [
          [
            "Someone joins",
            "They hold no envelope, so the chat gets a new key version. They read from the moment they joined, not the history before it.",
          ],
          [
            "Someone leaves or is removed",
            "The old key is retired and a new one is sealed to the people left. Everyone still has a valid copy of the old key, so the retirement is what forces the change.",
          ],
          [
            "Someone starts fresh",
            "Their old messages stay sealed for good. Chats are re-keyed from both sides so nobody keeps sealing to a key they can no longer open.",
          ],
          [
            "Someone has no key yet",
            "They cannot be added to an encrypted group until they open AbabilX once. Otherwise the group would stall for everybody.",
          ],
          [
            "Someone is added back",
            "They start again from that moment, as new.",
          ],
        ],
      },
      {
        type: "p",
        text: "A message is always read with the key version it names, never just the newest. That is how older messages stay readable after the key has moved on.",
      },
    ],
  },
  {
    id: "files",
    heading: "Files",
    blocks: [
      {
        type: "flow",
        steps: [
          {
            where: "you",
            title: "Pick a fresh key for the file",
            text: "32 random bytes, used for this file only.",
          },
          {
            where: "you",
            title: "Encrypt in chunks",
            text: "64 KiB blocks of AES-256-GCM. The chunk number and a last-chunk flag are bound in, so blocks cannot be reordered or cut off. The result is padded to a size bucket.",
          },
          {
            where: "server",
            title: "Store an opaque object",
            text: "A generic binary file. It sees roughly how big, never the name or type.",
          },
          {
            where: "you",
            title: "Seal the file’s key with the message",
            text: "The key, real name, type and size go under the chat key, beside the message.",
          },
          {
            where: "them",
            title: "Open, download, decrypt",
            text: "Open the sealed details, fetch the object, decrypt it on this device.",
          },
        ],
      },
      {
        type: "callout",
        tone: "warn",
        title: "Rolling out.",
        text: "File encryption is switched on gradually. Files sent before it reached your account stay readable by our storage until they expire. Workspace channels and webhook feeds are never end-to-end encrypted.",
      },
    ],
  },
  {
    id: "verify",
    heading: "Checking nobody is in the middle",
    blocks: [
      {
        type: "p",
        text: "One question cryptography cannot answer from the inside: is this public key really your friend’s? Our server hands out public keys, so a hostile one could hand out its own. Safety numbers are how two people check.",
      },
      {
        type: "list",
        items: [
          "Each person’s key is hashed 5,200 times with SHA-512, so grinding a look-alike key is expensive.",
          "The two results become one 60-digit number that is the same for both of you.",
          "The digits are identical on web, desktop and phone, and tests pin the same vector on each.",
          "Your app remembers each contact’s key and warns in the chat when it changes, because nobody compares digits twice.",
        ],
      },
    ],
  },
  {
    id: "limits",
    heading: "What this does not do",
    blocks: [
      {
        type: "list",
        items: [
          "Metadata is visible to us: who is in a chat, when messages are sent, and how big they are.",
          "There is no forward secrecy for ordinary chats. Someone who got a chat key could read what it sealed. Ghost Chat adds it, because its keys are throwaway.",
          "A modified client or a camera pointed at a screen cannot be stopped by any of this.",
          "Who is in a group is still our server’s word, so check safety numbers with people you care about.",
          "Lose the recovery code and every device, and old messages cannot be opened by anyone. That is on purpose: the alternative is a key we hold.",
        ],
      },
    ],
  },
];
