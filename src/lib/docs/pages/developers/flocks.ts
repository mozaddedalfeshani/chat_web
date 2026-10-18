import type { DocPage } from "../../types";
import { URL_SHAPE, WEBHOOK_KEYWORDS, WEBHOOK_UPDATED } from "./shared";

export const FLOCKS: DocPage = {
  slug: "flocks",
  title: "Flocks (webhook feeds)",
  description:
    "A flock is a read-only AbabilX chat that your apps post into through a secret webhook URL. It works from servers, scripts, automation tools and browsers on any site.",
  keywords: [...WEBHOOK_KEYWORDS, "read-only channel", "bot channel"],
  updated: WEBHOOK_UPDATED,
  intro: [
    {
      type: "p",
      text: "A flock is a one-way chat. Anything that can send an HTTP POST can post into it: a deploy pipeline, a monitoring alert, a contact form, a cron job, Zapier, Make, n8n, or JavaScript on your own website. People in the flock read the messages, react to them and discuss each one in its thread. Nobody types into the flock itself.",
    },
    {
      type: "callout",
      title: "Same thing, three names.",
      text: "The Android app calls it a Flock. The web app calls it a feed (New feed). The address you post to is the webhook URL.",
    },
  ],
  sections: [
    {
      id: "how-it-works",
      heading: "How a message travels",
      blocks: [
        {
          type: "flow",
          caption: "One POST becomes one message for every member.",
          steps: [
            { where: "app", title: "POST to the webhook URL", text: "JSON, or multipart with files. The secret in the URL is the only credential." },
            { where: "server", title: "Check the URL and limits", text: "Unknown or replaced URL: 401. Too fast: 429. Bad body: 400." },
            {
              branches: [
                { label: "event_id seen in the last 7 days", steps: [{ where: "server", title: "Store nothing", text: "Answers 200 with duplicate: true." }] },
                { label: "New message", steps: [{ where: "server", title: "Store it", text: "Files are saved, the message is written, answers 201." }] },
              ],
            },
            { where: "them", title: "Members see it", text: "Live in open apps, plus a push notification unless they muted the flock." },
          ],
        },
      ],
    },
    {
      id: "create",
      heading: "Create a flock",
      blocks: [
        {
          type: "steps",
          items: [
            "Android: Chats → New → New flock. Web: the ⋯ menu above the chat list → New feed.",
            "Type a name and, if you like, pick a picture. Both appear as the sender of every message.",
            "Copy the webhook URL the moment it appears. Its shape is " + URL_SHAPE + ".",
            "Store it somewhere safe, such as a secret store or an environment variable.",
          ],
        },
        {
          type: "callout",
          tone: "warn",
          title: "The URL is shown once.",
          text: "AbabilX keeps only a hash of the secret, so nobody can show the URL again, including us. Lost it? Generate a new one; the old one stops working that moment.",
        },
      ],
    },
    {
      id: "who-can-post",
      heading: "Who can post",
      blocks: [
        {
          type: "p",
          text: "Whoever holds the URL, from anywhere. The server does not care whether the request comes from a server, a phone, a laptop or a web page on another site: browsers may call the URL directly (it answers cross-origin requests from every origin, sends no cookies and needs no login).",
        },
        {
          type: "callout",
          tone: "warn",
          title: "A URL in public code is a public URL.",
          text: "If you call it from a web page, anyone who opens that page can read the URL and post too. That is fine for a contact form you are happy to receive spam on; for anything else, call it from your server.",
        },
      ],
    },
    {
      id: "members",
      heading: "Who reads it",
      blocks: [
        {
          type: "table",
          head: ["Who", "Can"],
          rows: [
            ["Owner (whoever created it)", "Everything below, plus rename, change the picture, replace the URL, add and remove people, delete the flock."],
            ["Admins", "Same as the owner."],
            ["Members", "Read, react, and reply inside a message's thread. They cannot post at the top level."],
            ["Your app", "Post top-level messages through the URL. It cannot read anything back."],
          ],
        },
        { type: "p", text: "A new flock starts with only you in it. Add people from its details screen." },
      ],
    },
    {
      id: "rotate",
      heading: "Replace the URL",
      blocks: [
        {
          type: "p",
          text: "Open the flock's details and choose Generate new URL. The previous URL answers 401 from that moment, so update whatever was posting to it. Do it whenever a URL may have leaked or someone who knew it left.",
        },
      ],
    },
    {
      id: "keeping",
      heading: "What is kept, and for how long",
      blocks: [
        {
          type: "list",
          items: [
            "Our server keeps the newest 10 messages of a flock, plus any that a signed-in device of a member has not received yet, plus any message that has a thread.",
            "Members' phones keep their own copy of everything they received.",
            "Files go when the message that held them goes.",
            "An event_id is remembered for 7 days, per flock, to stop duplicates.",
          ],
        },
        {
          type: "callout",
          text: "Flocks are not end-to-end encrypted. The server reads what your app posts so it can show it and send notifications. Do not post passwords, keys or anything you would not hand to a server.",
        },
      ],
    },
    {
      id: "not-supported",
      heading: "What a flock does not do",
      blocks: [
        {
          type: "list",
          items: [
            "No outgoing events: replies and reactions are not sent back to your app.",
            "No per-message sender name or avatar: every message uses the flock's name and picture.",
            "No editing or deleting a posted message through the URL.",
            "No HTML form posts (application/x-www-form-urlencoded). Send JSON or multipart.",
          ],
        },
      ],
    },
  ],
};
