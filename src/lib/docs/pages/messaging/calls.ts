import type { DocPage } from "../../types";

export const CALLS: DocPage = {
  slug: "calls",
  title: "Voice and video calls",
  description:
    "One-to-one voice and video calls go device to device. Group calls are free, unmetered, with screen sharing, raised hands and a choice of who to ring.",
  keywords: ["encrypted voice call", "video call", "group call", "screen sharing", "free group calls", "ring list"],
  updated: "2026-10-19",
  sections: [
    {
      id: "one-to-one",
      heading: "One-to-one calls",
      blocks: [
        {
          type: "list",
          items: [
            "Tap Call in a DM. Calls start as voice; turn your camera on from the call controls once connected.",
            "Audio and video travel directly between the two devices. When a network blocks that, they go through a relay server that passes along encrypted media it cannot read.",
            "Either side can share their screen. Pressing Share while the other person shares takes it over.",
            "A dropped connection reconnects by itself (“Reconnecting…”) instead of ending the call.",
            "The callee's “Ringing…” shows once their device rings, unless they use privacy mode.",
          ],
        },
      ],
    },
    {
      id: "answering",
      heading: "Answering",
      blocks: [
        {
          type: "list",
          items: [
            "Every signed-in device rings. Answering on one stops the others, and the call stays on that device.",
            "On Android, answering from the lock screen keeps the phone locked; only the call is shown.",
            "Press a volume key, or Silence, to stop the ringing without declining.",
            "Decline with a message: pick a quick reply or type one, and it is sent to the DM, encrypted.",
          ],
        },
      ],
    },
    {
      id: "group-calls",
      heading: "Group calls",
      blocks: [
        {
          type: "list",
          items: [
            "Free and unmetered, on any plan.",
            "Voice and screen sharing. Group calls have no camera video.",
            "In the Android and desktop apps, a lobby lets you pick your microphone and see who is in before joining.",
            "Raise your hand: hands are listed in the order they went up. Send quick reactions too.",
            "A shared screen always takes the main stage; otherwise switch between grid and speaker view.",
          ],
        },
      ],
    },
    {
      id: "who-rings",
      heading: "Choose who to ring",
      blocks: [
        { type: "p", text: "When you start a group call, Ring · Everyone › opens a list of members. Untick anyone you do not want to disturb. Everyone can still see the call in the chat and join it; only the people you picked are rung." },
        { type: "p", text: "On the web, starting a call in a group opens the same choice first. Joining a call that is already running joins straight away." },
      ],
    },
    {
      id: "history",
      heading: "Call history",
      blocks: [
        { type: "p", text: "Calls appear in the chat as call events (several in a row fold into one line) and in the Calls tab. Private chat keeps no call history." },
      ],
    },
  ],
};
