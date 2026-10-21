/**
 * Feature cards beside the sign-in QR. Every one is something this web
 * client does: chats, calls, groups, task cards and flocks.
 */
export type FeatureSlide = "chat" | "calls" | "groups" | "tasks" | "flocks";

export const FEATURE_SLIDES: readonly FeatureSlide[] = ["chat", "calls", "groups", "tasks", "flocks"];

export type FeatureMessage = { mine: boolean; text: string };

export const FEATURE_COPY = {
  show: "Show",
  headings: {
    chat: { label: "Only you two", title: "We cannot read a personal chat.", name: "Chat" },
    calls: { label: "The call stays yours", title: "Voice and video go between the two devices.", name: "Calls" },
    groups: { label: "Sealed to the group", title: "Only the people in it can open it.", name: "Groups" },
    tasks: { label: "The words stay sealed", title: "We see the status, never the task.", name: "Tasks" },
    flocks: { label: "Not a private chat", title: "A flock is plain text, so a tool can post it.", name: "Flocks" },
  } satisfies Record<FeatureSlide, { label: string; title: string; name: string }>,
  chat: {
    peer: "Ayesha",
    status: "online",
    encrypted: "End-to-end encrypted",
    messages: [
      { mine: false, text: "Reached home? 🏠" },
      { mine: true, text: "Just now. Sending the photos tonight." },
      { mine: false, text: "Perfect, thank you!" },
    ] satisfies FeatureMessage[],
  },
  calls: {
    peer: "Ayesha",
    duration: "12:48",
    sharing: "You are sharing your screen",
  },
  groups: {
    name: "Family",
    members: "12 members",
    messages: [
      { mine: false, text: "Dinner at 8?" },
      { mine: true, text: "I will be there." },
    ] satisfies FeatureMessage[],
  },
  tasks: {
    peer: "Nadia",
    where: "Direct message",
    kind: "Task",
    title: "Book tickets for Eid",
    body: "Two seats, morning train.",
    priority: "High",
    status: "In progress",
    change: "Nadia marked it In progress",
  },
  flocks: {
    name: "Orders",
    from: "Store",
    body: "Order #1042 shipped",
    reply: "Reply in the thread",
  },
} as const;
