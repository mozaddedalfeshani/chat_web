import type { DocPage } from "../../types";

export const MESSAGES: DocPage = {
  slug: "messages",
  title: "Messages",
  description:
    "Reply, quote, react, edit, delete, forward, select several messages, send files and voice notes, long text as snippets, and link previews.",
  keywords: ["reply to message", "react", "edit message", "forward message", "voice note", "snippet", "link preview", "markdown chat"],
  updated: "2026-10-19",
  sections: [
    {
      id: "basics",
      heading: "The basics",
      blocks: [
        {
          type: "table",
          head: ["Action", "How"],
          rows: [
            ["Reply with a quote", "Swipe a message right (Android), or hover and choose Reply (web). The quote stays in the main chat."],
            ["Reply in a thread", "Open a message's thread from its menu for a side conversation under it. Replies show as a count under the message."],
            ["React", "Press and hold, then pick an emoji. Tap a reaction to add or remove yours."],
            ["Edit", "Your own messages, from the message menu."],
            ["Delete", "Your own messages, for everyone in the chat."],
            ["Forward", "To one or more chats. Files are re-sealed for each chat they go to."],
            ["Copy", "Copies the text."],
          ],
        },
      ],
    },
    {
      id: "select",
      heading: "Select several messages",
      blocks: [
        { type: "p", text: "In the Android app, hold a message and choose Select. Tap others to add them. The bar at the bottom offers Forward, Save, Copy and Delete. Reply, Edit and Save need exactly one message, and Delete only shows when every selected message is yours." },
      ],
    },
    {
      id: "formatting",
      heading: "Formatting",
      blocks: [
        { type: "p", text: "Messages render Markdown: **bold**, _italic_, `code`, code blocks, lists, quotes and links. Type @ to mention someone in a group. Links, email addresses and phone numbers become tappable." },
        { type: "p", text: "A message can be up to about 6,000 words. Much longer text is better sent as a snippet." },
      ],
    },
    {
      id: "snippets",
      heading: "Snippets",
      blocks: [
        { type: "p", text: "For long text, code or notes, choose + → Snippet. Give it an optional title, paste the content and choose Markdown (.md) or Plain text (.txt). It is sent as an encrypted file of up to 10 MB that opens formatted, with a Show source switch. Every snippet in a chat is listed under Snippets in its details." },
      ],
    },
    {
      id: "files",
      heading: "Photos, videos, files and voice notes",
      blocks: [
        {
          type: "list",
          items: [
            "Tap + for recent photos, the gallery, the camera or a file. Up to 10 files per message, 350 MB in total.",
            "On Android you can draw on, crop, rotate and blur a photo before sending, and choose Standard or High quality in Settings → Data and storage.",
            "Hold the microphone to record a voice note.",
            "In DMs and groups, files are encrypted on your phone or in this browser before upload.",
            "Share from any Android app into AbabilX; recent chats appear as direct targets in the share sheet.",
          ],
        },
      ],
    },
    {
      id: "link-previews",
      heading: "Link previews",
      blocks: [
        { type: "p", text: "A message with a link shows a card with the page's title, description and picture. The Android and desktop apps fetch the page themselves, on your device. The web app asks our server to fetch it, so the site never sees your browser's address." },
        { type: "callout", text: "Because the phone fetches previews itself, the website in a link can see your phone's IP address when the preview loads." },
      ],
    },
    {
      id: "ticks",
      heading: "Ticks and typing",
      blocks: [
        {
          type: "list",
          items: [
            "Ticks show sent, delivered and read.",
            "Per DM, Hide ticks in the chat's details turns ticks off for both of you: you stop sending yours and stop seeing theirs. If the other person turned it on, the row says so.",
            "Typing shows as a bubble in the chat, in DMs and groups. Turn it off in Settings → Discovery; then you neither send nor see typing.",
            "Typing is only shared in a DM once you have accepted each other.",
          ],
        },
      ],
    },
  ],
};
