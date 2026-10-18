import type { DocPage } from "../../types";
import { BROWSER, GITHUB_ACTIONS, GO, NODE, PHP, PYTHON, SHELL } from "./recipe-code";
import { URL_VAR, WEBHOOK_KEYWORDS, WEBHOOK_UPDATED } from "./shared";

export const WEBHOOK_RECIPES: DocPage = {
  slug: "webhook-recipes",
  title: "Webhook recipes",
  description:
    "Copy-paste examples for posting to an AbabilX flock from Node.js, Python, Go, PHP, shell, GitHub Actions, a website contact form, Zapier, Make and n8n.",
  keywords: [...WEBHOOK_KEYWORDS, "GitHub Actions notification", "contact form to chat", "Zapier webhook", "n8n webhook", "Make webhook"],
  updated: WEBHOOK_UPDATED,
  intro: [
    {
      type: "p",
      text: `Every sample reads the URL from the environment variable ${URL_VAR}, sends an event_id so a retry can never post twice, retries only 429 and 5xx, and gives up on 4xx. That is the policy in Responses and errors.`,
    },
  ],
  sections: [
    { id: "node", heading: "Node.js", blocks: [{ type: "code", lang: "js", title: "flock.mjs", code: NODE }] },
    { id: "python", heading: "Python", blocks: [{ type: "code", lang: "python", title: "flock.py", code: PYTHON }] },
    { id: "go", heading: "Go", blocks: [{ type: "code", lang: "go", title: "flock.go", code: GO }] },
    { id: "php", heading: "PHP", blocks: [{ type: "code", lang: "php", title: "notify.php", code: PHP }] },
    { id: "shell", heading: "Shell and cron", blocks: [{ type: "code", lang: "bash", title: "notify.sh", code: SHELL }] },
    {
      id: "github-actions",
      heading: "GitHub Actions",
      blocks: [
        { type: "code", lang: "yaml", title: "deploy.yml", code: GITHUB_ACTIONS },
        { type: "p", text: "Using run id plus attempt as the event_id means a re-run posts again, but a curl retry inside one run does not." },
      ],
    },
    {
      id: "website",
      heading: "Website contact form (browser)",
      blocks: [
        { type: "callout", tone: "warn", title: "The URL is visible to every visitor.", text: "They can post to the flock too. Use a flock made just for this form, and replace its URL if it gets abused. To keep the URL private, post from your own server instead." },
        { type: "code", lang: "html", title: "contact.html", code: BROWSER },
      ],
    },
    {
      id: "no-code",
      heading: "Zapier, Make, n8n and other tools",
      blocks: [
        {
          type: "table",
          head: ["Tool", "Step to use", "Settings"],
          rows: [
            ["Zapier", "Webhooks by Zapier → POST", "URL: the flock URL. Payload type: JSON. Data: message = your text (and event_id = a unique field from the trigger)."],
            ["Make", "HTTP → Make a request", "Method POST, body type Raw, content type JSON, request content {\"message\":\"…\"}."],
            ["n8n", "HTTP Request node", "Method POST, Send Body on, Body Content Type JSON, field message."],
            ["Uptime monitors, alerting tools", "Custom or generic webhook", "POST, JSON body with a message field. If the tool only sends Slack format ({\"text\":…}), add a transform step that renames text to message."],
          ],
        },
      ],
    },
    {
      id: "test",
      heading: "Test without spamming the flock",
      blocks: [
        {
          type: "list",
          items: [
            "Make a second flock for testing and add only yourself.",
            "Send the same event_id twice: the second answers 200 with duplicate: true and nothing new appears.",
            "Mute the test flock if you do not want notifications while testing.",
          ],
        },
      ],
    },
  ],
};
