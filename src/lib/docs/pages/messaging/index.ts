import type { DocGroup } from "../../types";
import { CALLS } from "./calls";
import { CHATS } from "./chats";
import { KHAAM, NOTE_TO_SELF, SEND_LATER, TASK_CARDS } from "./extras";
import { GROUPS } from "./groups";
import { LOCAL_SHARE } from "./local-share";
import { MESSAGES } from "./messages";

export const MESSAGING: DocGroup = {
  title: "Messaging",
  pages: [CHATS, MESSAGES, GROUPS, CALLS, SEND_LATER, TASK_CARDS, NOTE_TO_SELF, KHAAM, LOCAL_SHARE],
};
