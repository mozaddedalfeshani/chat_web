/** A docs page is data; the renderer in components/docs draws every page the same way. */
export type DocBlock =
  | { type: "p"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "list"; items: string[] }
  | { type: "callout"; tone?: "info" | "warn"; title?: string; text: string }
  | { type: "cards"; items: { title: string; text: string; href?: string }[] };

export type DocSection = {
  /** Anchor id, used by "On this page". */
  id: string;
  heading: string;
  blocks: DocBlock[];
};

export type DocPage = {
  slug: string;
  title: string;
  description: string;
  /** Lives only in the Android app (web and desktop do not have it yet). */
  androidOnly?: boolean;
  intro?: DocBlock[];
  sections: DocSection[];
};

export type DocGroup = { title: string; pages: DocPage[] };
