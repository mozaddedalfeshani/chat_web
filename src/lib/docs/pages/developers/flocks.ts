import type { DocPage } from "../../types";

export const FLOCKS: DocPage = {
  slug: "flocks",
  title: "Flocks (webhook feeds)",
  description:
    "A chat that apps post into over a URL. Use it from any server, script, automation tool or website.",
  intro: [
    {
      type: "p",
      text: "A flock is a one-way chat. Anything that can send an HTTP request can post into it: your deploy pipeline, a monitoring alert, a contact form, Zapier, a cron job or a page on your own site. People in the flock read the messages and discuss them in threads. Nobody types into the flock itself.",
    },
    {
      type: "callout",
      title: "Same thing, two names.",
      text: "The Android app calls it a Flock. The web app calls it a feed (New feed). The URL you get is called a webhook URL.",
    },
  ],
  sections: [
    {
      id: "create",
      heading: "Create one",
      blocks: [
        {
          type: "steps",
          items: [
            "Android: Chats, then New, then New flock. Web: the ⋯ menu above the chat list, then New feed.",
            "Give it a name and, if you like, a picture. The name and picture appear as the sender of every message.",
            "Copy the webhook URL when it appears.",
          ],
        },
        {
          type: "callout",
          tone: "warn",
          title: "The URL is shown once.",
          text: "AbabilX keeps only a hash of its secret, so it cannot show the URL again. If you lose it, generate a new one; the old one stops working at that moment.",
        },
      ],
    },
    {
      id: "who-can-use",
      heading: "Who can use the URL",
      blocks: [
        {
          type: "p",
          text: "Anyone who holds the URL can post, from anywhere: a server, a laptop, or JavaScript running in a browser on any website. The secret in the URL is the only credential, so treat it like a password. Do not put it in public code or in a page whose source strangers can read unless you accept that they can post to your flock.",
        },
        {
          type: "p",
          text: "Browsers are allowed to call the URL directly. It sends no cookies and needs no login, and it answers cross-origin requests from every origin.",
        },
      ],
    },
    {
      id: "members",
      heading: "Who reads it",
      blocks: [
        {
          type: "p",
          text: "A new flock starts with only you in it. Add people from its details screen. Members read the feed and can react to a message or open its thread to discuss it. Only the owner and admins can rename it, change the picture or replace the URL.",
        },
      ],
    },
    {
      id: "rotate",
      heading: "Replace the URL",
      blocks: [
        {
          type: "p",
          text: "Open the flock's details and choose Generate new URL. The previous URL is disabled immediately, so update whatever was posting to it. Do this whenever a URL may have leaked.",
        },
      ],
    },
    {
      id: "keeping",
      heading: "How long messages stay",
      blocks: [
        {
          type: "p",
          text: "Our server keeps the newest 10 messages of a flock, plus any that one of your signed-in devices has not received yet. Your phone keeps its own copy of everything it has received. Files go with the messages that held them.",
        },
        {
          type: "callout",
          text: "Flocks are not end-to-end encrypted. The server has to read what an app posts, so it can show it. Do not post secrets you would not give a server.",
        },
      ],
    },
  ],
};
