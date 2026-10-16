import type { DocPage } from "../../types";
import { BASICS } from "./basics";
import { FLOWS } from "./flows";
import { MORE } from "./more";

export const HOW_ENCRYPTION_WORKS: DocPage = {
  slug: "how-encryption-works",
  title: "How encryption works",
  description: "The full flow, from your first key to a message on someone else’s screen.",
  intro: [
    {
      type: "p",
      text: "This is the long version of end-to-end encryption: every key, who holds it, and what happens at each step, with the code you can read on GitHub.",
    },
  ],
  sections: [...BASICS, ...FLOWS, ...MORE],
};
