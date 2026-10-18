import type { DocGroup } from "../../types";
import { FLOCKS } from "./flocks";
import { WEBHOOK_API } from "./webhook-api";

export const DEVELOPERS: DocGroup = {
  title: "Developers",
  pages: [FLOCKS, WEBHOOK_API],
};
