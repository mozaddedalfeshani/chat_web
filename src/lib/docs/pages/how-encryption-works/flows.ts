import type { DocSection } from "../../types";

export const FLOWS: DocSection[] = [
  {
    id: "sending",
    heading: "Sending a message",
    blocks: [
      {
        type: "flow",
        steps: [
          {
            where: "you",
            title: "Find the chat’s key",
            text: "Ask the server for the newest chat key version and open your own sealed copy with your private key.",
          },
          {
            branches: [
              {
                label: "The chat has no key yet",
                steps: [
                  {
                    where: "you",
                    title: "Get the roster",
                    text: "The public identity key of every member.",
                  },
                  {
                    where: "you",
                    title: "Mint the chat key",
                    text: "A new random AES-256 key, version 1.",
                  },
                  {
                    where: "you",
                    title: "Seal a copy to each member",
                    text: "A one-time ECDH exchange with their public key, hashed into an AES-GCM key. The recipient’s id is bound in.",
                  },
                  {
                    where: "server",
                    title: "Store the envelopes",
                    text: "One sealed copy per member.",
                  },
                ],
              },
              {
                label: "The chat already has one",
                steps: [
                  {
                    where: "you",
                    title: "Reuse it",
                    text: "Nothing to mint. If someone joined or left since, the key is replaced first (see below).",
                  },
                ],
              },
            ],
          },
          {
            where: "you",
            title: "Encrypt the message",
            text: "AES-256-GCM, fresh 12-byte nonce. The chat id, key version and your user id are bound in as associated data.",
          },
          {
            where: "server",
            title: "Receive ciphertext, nonce and key version",
            text: "The body field is empty. It checks that every member can read that key version, then stores and delivers it. Pushes carry the ciphertext too, so the phone decrypts the notification itself.",
          },
          {
            where: "them",
            title: "Open and read",
            text: "Fetch the envelope for the version the message names, open it, decrypt. Wrong chat, wrong sender or a changed byte and it refuses to open.",
          },
        ],
      },
      {
        type: "callout",
        title: "Why the associated data matters.",
        text: "A message is bound to its chat, its key version and its sender. The server cannot move it into another chat or put a different name on it without the check failing.",
      },
    ],
  },
  {
    id: "new-device",
    heading: "Signing in on a new device",
    blocks: [
      {
        type: "p",
        text: "Signing in proves who you are. It does not carry your message key. A new device has to be given the key, and there are exactly two ways.",
      },
      {
        type: "flow",
        steps: [
          {
            where: "new",
            title: "Sign in",
            text: "Google, email or phone scan. The account is open, but this device holds no key yet.",
          },
          {
            branches: [
              {
                label: "One scan",
                steps: [
                  {
                    where: "new",
                    title: "Make a throwaway key pair",
                    text: "The QR carries a sign-in token and its public half. The private half stays in this tab’s memory.",
                  },
                  {
                    where: "you",
                    title: "Phone scans the QR",
                    text: "It reads the key off the camera, never from the server. Both screens show the same six digits.",
                  },
                  {
                    where: "you",
                    title: "Phone seals your identity to that key",
                    text: "The identity envelope is posted for the new device.",
                  },
                  {
                    where: "server",
                    title: "Relay the envelope",
                    text: "Handed out once. It cannot open it.",
                  },
                  {
                    where: "new",
                    title: "Open and adopt",
                    text: "Your key arrives, history decrypts.",
                  },
                ],
              },
              {
                label: "Recovery code",
                steps: [
                  {
                    where: "new",
                    title: "Paste the code",
                    text: "Case and spacing do not matter.",
                  },
                  {
                    where: "server",
                    title: "Send back the wrapped blob",
                    text: "The same ciphertext stored at setup.",
                  },
                  {
                    where: "new",
                    title: "Unwrap locally",
                    text: "HKDF from the code, AES-GCM open. The code never leaves the device.",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "callout",
        title: "Why the QR is safe.",
        text: "The key that seals your identity is read off the camera, so the server cannot swap it. All it relays is a sealed envelope for a key it never saw. The six digits are there so a swapped QR is visible before you approve.",
      },
    ],
  },
];
