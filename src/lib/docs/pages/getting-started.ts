import type { DocGroup } from "../types";

export const GETTING_STARTED: DocGroup = {
  title: "Getting started",
  pages: [
    {
      slug: "introduction",
      title: "Introduction",
      description:
        "AbabilX Chat is an end-to-end encrypted messenger for people and groups.",
      intro: [
        {
          type: "callout",
          title: "New here?",
          text: "Install the Android app first. Your phone makes your message key, and it signs this browser in with one scan.",
        },
        {
          type: "p",
          text: "These docs explain how each feature works: what it does, how to use it, and what it keeps from us as well as from everyone else.",
        },
      ],
      sections: [
        {
          id: "where-to-start",
          heading: "Where to start",
          blocks: [
            {
              type: "cards",
              items: [
                {
                  title: "Sign in",
                  text: "Scan once with your phone. The web has no other way in.",
                  href: "/docs/sign-in",
                },
                {
                  title: "Get the app",
                  text: "The Android app holds your key and has every feature.",
                  href: "/docs/get-the-app",
                },
                {
                  title: "Encryption",
                  text: "What is sealed on your device, and what our servers can see.",
                  href: "/docs/encryption",
                },
              ],
            },
          ],
        },
        {
          id: "what-you-get",
          heading: "What you get",
          blocks: [
            {
              type: "list",
              items: [
                "Direct messages and groups, end-to-end encrypted.",
                "Voice and video calls, and free group calls.",
                "Privacy mode, private chat, Ghost Chat and view-once photos on Android.",
                "Task cards, send later and Note to Self.",
                "A web client at chat.ababilx.com, open source on GitHub.",
              ],
            },
          ],
        },
        {
          id: "made-by",
          heading: "Who makes it",
          blocks: [
            {
              type: "p",
              text: "AbabilX Chat is built by AbabilX. No ads, no trackers, and nothing in your messages is ours to read.",
            },
          ],
        },
      ],
    },
    {
      slug: "sign-in",
      title: "Sign in",
      description: "One way into AbabilX Chat on the web: a scan from your phone.",
      intro: [
        {
          type: "p",
          text: "One scan signs this browser in and brings your message key and your recent chats with it.",
        },
      ],
      sections: [
        {
          id: "one-scan",
          heading: "One scan with your phone",
          blocks: [
            {
              type: "steps",
              items: [
                "Open chat.ababilx.com. A QR code appears.",
                "On your phone, open AbabilX and scan it.",
                "Check that the six-digit code on the phone matches the browser, then approve.",
                "Your chats follow on their own: the newest messages first, older ones as you scroll.",
              ],
            },
            {
              type: "p",
              text: "The code carries a key made for this browser alone. Your phone seals your message key to it, so our server passes along something it cannot open.",
            },
          ],
        },
        {
          id: "phone-only",
          heading: "Why only a scan",
          blocks: [
            {
              type: "p",
              text: "The web signs in with your phone and nothing else. A scan is the one sign-in that also brings your message key and your chats; Google or a password would open the account and leave every chat unreadable.",
            },
            {
              type: "callout",
              tone: "warn",
              text: "No phone nearby means no web sign-in. Sign in on the AbabilX app first, then scan.",
            },
          ],
        },
        {
          id: "sessions",
          heading: "Signed-in devices",
          blocks: [
            {
              type: "p",
              text: "Each device is its own session. You can sign one out from another, and the change takes effect within seconds.",
            },
          ],
        },
      ],
    },
    {
      slug: "get-the-app",
      title: "Get the app",
      description: "The Android app is where your key lives and every feature works.",
      sections: [
        {
          id: "android",
          heading: "Android",
          blocks: [
            {
              type: "steps",
              items: [
                "Install AbabilX from Google Play.",
                "Sign in with Google or email.",
                "Write down the recovery code it shows you. It is shown once.",
              ],
            },
          ],
        },
        {
          id: "web-and-desktop",
          heading: "Web and desktop",
          blocks: [
            {
              type: "p",
              text: "The web client covers chats, groups and calls. Features marked “Android app” in these docs are on the phone only for now.",
            },
          ],
        },
        {
          id: "iphone",
          heading: "iPhone",
          blocks: [
            {
              type: "p",
              text: "There is no iPhone app yet. Use the web client in Safari meanwhile.",
            },
          ],
        },
      ],
    },
  ],
};
