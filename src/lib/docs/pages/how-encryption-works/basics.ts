import type { DocSection } from "../../types";

export const BASICS: DocSection[] = [
  {
    id: "big-picture",
    heading: "The big picture",
    blocks: [
      {
        type: "p",
        text: "A message is locked on the device that writes it and unlocked only on the devices of the people in the chat. Everything in between, including our servers, carries bytes that mean nothing to it.",
      },
      {
        type: "flow",
        caption: "Colour shows where each step runs. Only the amber box is ours.",
        steps: [
          {
            where: "you",
            title: "You write a message",
            text: "Plain text exists only here.",
          },
          {
            where: "you",
            title: "Sealed with the chat’s key",
            text: "AES-256-GCM with a fresh nonce. Nothing readable leaves the device.",
          },
          {
            where: "server",
            title: "Carried as ciphertext",
            text: "Stored and delivered as bytes. The server never holds a chat key or a private key.",
          },
          {
            where: "them",
            title: "Opened on their device",
            text: "Their private key opens their copy of the chat key, and the chat key opens the message.",
          },
        ],
      },
      {
        type: "p",
        text: "Two layers do the work. A chat has one key that locks its messages. That chat key is then sealed separately to each member’s personal key pair, so it can be handed to the right people over a network we run without us ever seeing it.",
      },
    ],
  },
  {
    id: "keys",
    heading: "The keys, and who holds them",
    blocks: [
      {
        type: "table",
        head: ["Key", "What it is", "Where it lives", "What our server sees"],
        rows: [
          [
            "Identity key pair",
            "A P-256 key pair made on your device. One per account.",
            "The private half stays on your devices. The public half is published so people can seal to you.",
            "The public half only",
          ],
          [
            "Recovery code",
            "256 random bits made on your device. Older accounts were shown it once; the phone now keeps it to itself.",
            "On your device, or written down by you. Never sent anywhere.",
            "Nothing",
          ],
          [
            "Wrapped identity",
            "Your private key encrypted by the recovery code.",
            "Stored on our server so a new device can get it back.",
            "Ciphertext against a 2^256 keyspace. It cannot open it.",
          ],
          [
            "Chat key",
            "One AES-256 key per chat, with a version number.",
            "Sealed separately to every member’s identity key.",
            "Sealed copies only",
          ],
          [
            "File key",
            "A random 32-byte key for one file.",
            "Sealed inside the message under the chat key.",
            "Never",
          ],
          [
            "Link key",
            "A throwaway key a new device makes for one sign-in.",
            "Memory of the new device only.",
            "Nothing. It travels by QR code, not through the server.",
          ],
        ],
      },
    ],
  },
  {
    id: "first-key",
    heading: "Your first key",
    blocks: [
      {
        type: "p",
        text: "The first time an account opens secure messages, the device builds everything itself.",
      },
      {
        type: "flow",
        steps: [
          {
            where: "you",
            title: "Ask for your vault",
            text: "A brand-new account has none.",
          },
          {
            where: "you",
            title: "Make an identity key pair",
            text: "A P-256 pair from the browser’s or phone’s own crypto. The private half is not exportable by the page.",
          },
          {
            where: "you",
            title: "Make a recovery code",
            text: "256 random bits. Nobody types it in, picks it or can shorten it.",
          },
          {
            where: "you",
            title: "Wrap the private key with the code",
            text: "HKDF-SHA256 over the code and a per-vault salt gives an AES-256 key, and AES-GCM seals the private key under it.",
          },
          {
            where: "server",
            title: "Store the public key and the wrapped blob",
            text: "Safe for us to hold forever, because without the code it is noise.",
          },
          {
            where: "you",
            title: "Keep the key locally",
            text: "This browser keeps the identity in IndexedDB, locked by a device key the page cannot export.",
          },
        ],
      },
      {
        type: "callout",
        text: "If two devices set up at the same moment, the server keeps whichever arrived first and the other one switches to the normal sign-in path.",
      },
    ],
  },
];
