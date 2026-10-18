import type { DocPage } from "../../types";

export const FIND_PEOPLE: DocPage = {
  slug: "find-people",
  title: "Find people and your QR code",
  description: "Find people by username, email or phone number, share your own QR code, and choose who can find you.",
  keywords: ["AbabilX username", "QR code contact", "find friends", "discovery settings", "phone number search"],
  updated: "2026-10-19",
  sections: [
    {
      id: "search",
      heading: "Search",
      blocks: [
        {
          type: "table",
          head: ["Search by", "How it matches", "Who can be found"],
          rows: [
            ["Email", "The exact address", "Everyone, unless they turned it off"],
            ["Phone number", "The exact number, with country code (+8801712345678). Without it you are asked to add one.", "Everyone who added a number, unless they turned it off"],
            ["Username", "Starts with what you type", "Only people who turned username search on (off by default for new accounts)"],
          ],
        },
        { type: "p", text: "Your phone number is only used to be found. It is never verified and never used to sign in or recover anything." },
      ],
    },
    {
      id: "qr",
      heading: "Your QR code",
      blocks: [
        {
          type: "steps",
          items: [
            "Set a username in Settings → Username (3–32 letters, numbers, dots, dashes or underscores; unique).",
            "Tap the QR button beside your name in Settings to show your code.",
            "Someone scans it with the scanner at the top of their chat list, and a DM with you opens.",
          ],
        },
        { type: "p", text: "A scanned code always works, even if username search is off: you chose to show it. Blocked people see “no such account”." },
      ],
    },
    {
      id: "discovery",
      heading: "Choose who can find you",
      blocks: [
        { type: "p", text: "Settings → Discovery has a switch each for email, phone number and username, and a field for your phone number. Privacy mode hides you from every search and QR lookup while it is on." },
      ],
    },
    {
      id: "connections",
      heading: "Connections and requests",
      blocks: [
        { type: "p", text: "Anyone you can find can send you a first message, which arrives as a request. Accepting (or replying) makes you connected. Being connected is what lets someone add you to a group. See Message requests for Accept, Delete and Block." },
      ],
    },
  ],
};
