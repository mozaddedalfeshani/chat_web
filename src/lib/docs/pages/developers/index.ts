import type { DocGroup } from "../../types";
import { FLOCKS } from "./flocks";
import { WEBHOOK_API } from "./webhook-api";
import { WEBHOOK_RECIPES } from "./webhook-recipes";
import { WEBHOOK_RESPONSES } from "./webhook-responses";

export const DEVELOPERS: DocGroup = {
  title: "Developers",
  pages: [FLOCKS, WEBHOOK_API, WEBHOOK_RESPONSES, WEBHOOK_RECIPES],
};
