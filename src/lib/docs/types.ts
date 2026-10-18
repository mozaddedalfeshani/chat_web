/** A docs page is data; the renderer in components/docs draws every page the same way. */
export type DocBlock =
  | { type: "p"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "list"; items: string[] }
  | { type: "callout"; tone?: "info" | "warn"; title?: string; text: string }
  | { type: "cards"; items: { title: string; text: string; href?: string }[] }
  | { type: "flow"; caption?: string; steps: FlowStep[] }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "code"; lang?: string; title?: string; code: string };

/** Where a flowchart step happens. Drawn as a coloured chip on the box. */
export type FlowWhere = "you" | "server" | "them" | "new" | "app";

export type FlowNode = { title: string; text?: string; where?: FlowWhere };

/** One box, or a fork where each branch is its own chain of boxes. */
export type FlowStep =
  | FlowNode
  | { branches: { label: string; steps: FlowNode[] }[] };

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
  /** Extra search terms for this page (meta keywords + JSON-LD). */
  keywords?: string[];
  /** Last real content change, ISO date. Feeds the sitemap and JSON-LD. */
  updated?: string;
  /** Lives only in the Android app (web and desktop do not have it yet). */
  androidOnly?: boolean;
  intro?: DocBlock[];
  sections: DocSection[];
};

export type DocGroup = { title: string; pages: DocPage[] };
