import type { DocGroup } from "../types";

export const PRIVACY: DocGroup = {
  title: "Privacy controls",
  pages: [
    {
      slug: "privacy-mode",
      title: "Privacy mode",
      description: "One switch that makes you quiet in your direct messages.",
      androidOnly: true,
      sections: [
        {
          id: "what-it-hides",
          heading: "What it hides",
          blocks: [
            {
              type: "list",
              items: [
                "Your typing, read ticks and online status, from everyone you DM.",
                "“Ringing” when someone calls you.",
                "Connected calls, from the other person’s call history.",
                "You, from search. Nobody can find you or add you to a new group.",
              ],
            },
            {
              type: "p",
              text: "It is one-way: you still see theirs. Groups are not affected.",
            },
          ],
        },
        {
          id: "per-person",
          heading: "Per person",
          blocks: [
            {
              type: "p",
              text: "In a DM’s details, choose Always private, Never private, or Follow my setting for that one person.",
            },
          ],
        },
        {
          id: "screenshots",
          heading: "Screenshots",
          blocks: [
            {
              type: "p",
              text: "While you are private, the other person’s Android app blocks screenshots of your chat and calls.",
            },
          ],
        },
      ],
    },
    {
      slug: "private-chat",
      title: "Private chat",
      description: "A per-DM switch that hides typing, ticks and online status both ways and stops saving and forwarding.",
      androidOnly: true,
      sections: [
        {
          id: "turn-on",
          heading: "Turn it on",
          blocks: [
            {
              type: "steps",
              items: [
                "Open a DM with someone you are connected to.",
                "Open its details and switch on Private chat.",
                "It applies to both of you. Either of you can turn it off.",
              ],
            },
          ],
        },
        {
          id: "how-it-works",
          heading: "How it works",
          blocks: [
            {
              type: "p",
              text: "Every chat is already deleted from our server once your phones have the messages (see Message history). Private chat adds privacy on top, for both people:",
            },
            {
              type: "list",
              items: [
                "No call history is kept, and calls do not show “Ringing”.",
                "Notifications say “New private message” without the text.",
                "No threads; reply with a quote instead.",
                "Photos and files cannot be saved or forwarded.",
                "Typing, ticks and online status are hidden both ways.",
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "ghost-chat",
      title: "Ghost Chat",
      description: "A side chat that goes straight from phone to phone and is never stored.",
      androidOnly: true,
      sections: [
        {
          id: "start",
          heading: "Start one",
          blocks: [
            {
              type: "steps",
              items: [
                "In a DM, tap + and choose Ghost Chat.",
                "The other person’s phone shows an invite. They tap Join.",
                "Text and files now travel directly between your phones.",
              ],
            },
          ],
        },
        {
          id: "burn",
          heading: "Burn it",
          blocks: [
            {
              type: "p",
              text: "Tap the flame and both phones are wiped at once. Leaving, closing the app or losing the connection burns it too.",
            },
            {
              type: "callout",
              text: "Nothing is written to our servers or to your phone’s storage. Screenshots are blocked for the whole session.",
            },
          ],
        },
      ],
    },
    {
      slug: "view-once",
      title: "View-once photos",
      description: "Send a photo that disappears after it is opened.",
      androidOnly: true,
      sections: [
        {
          id: "send",
          heading: "Send one",
          blocks: [
            {
              type: "steps",
              items: [
                "Pick a photo in a DM.",
                "Tap the eye, or choose a timer: once, 5, 10 or 30 seconds.",
                "Choose whether it may be saved, then send.",
              ],
            },
          ],
        },
        {
          id: "after",
          heading: "After it is opened",
          blocks: [
            {
              type: "p",
              text: "The timer starts when they open it. When it ends, the photo is deleted from our server and the chat shows “Photo expired”. A timed photo can never be saved or forwarded.",
            },
          ],
        },
      ],
    },
  ],
};
