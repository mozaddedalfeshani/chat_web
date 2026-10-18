/** Code samples for the recipes page. Each one retries the way Responses says to. */
import { URL_VAR } from "./shared";

export const NODE = `// Node 18+ (built-in fetch). Retries 429 / 5xx / network errors, never 4xx.
export async function postToFlock(message, eventId) {
  const url = process.env.${URL_VAR};
  for (let attempt = 0; attempt < 5; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, event_id: eventId }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      await sleep(2 ** attempt * 1000); // network error or timeout
      continue;
    }
    if (res.ok) return res.json(); // 200 (duplicate) or 201
    if (res.status === 429) {
      await sleep(Number(res.headers.get("Retry-After") ?? 1) * 1000);
      continue;
    }
    if (res.status >= 500) {
      await sleep(2 ** attempt * 1000);
      continue;
    }
    const body = await res.text();
    throw new Error(\`Flock rejected the post: \${res.status} \${body}\`);
  }
  throw new Error("Flock unavailable after 5 tries");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));`;

export const PYTHON = `import os, time, requests

def post_to_flock(message: str, event_id: str | None = None) -> dict:
    url = os.environ["${URL_VAR}"]
    body = {"message": message}
    if event_id:
        body["event_id"] = event_id
    for attempt in range(5):
        try:
            res = requests.post(url, json=body, timeout=10)
        except requests.RequestException:
            time.sleep(2 ** attempt)
            continue
        if res.status_code in (200, 201):
            return res.json()
        if res.status_code == 429:
            time.sleep(int(res.headers.get("Retry-After", "1")))
            continue
        if res.status_code >= 500:
            time.sleep(2 ** attempt)
            continue
        raise RuntimeError(f"Flock rejected the post: {res.status_code} {res.text}")
    raise RuntimeError("Flock unavailable after 5 tries")

# With a file:
# requests.post(url, data={"payload_json": '{"message":"Report"}'},
#               files={"files[0]": ("report.pdf", open("report.pdf", "rb"), "application/pdf")})`;

export const GO = `package flock

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

func Post(message, eventID string) error {
	body, _ := json.Marshal(map[string]string{"message": message, "event_id": eventID})
	client := &http.Client{Timeout: 10 * time.Second}
	for attempt := 0; attempt < 5; attempt++ {
		res, err := client.Post(os.Getenv("${URL_VAR}"), "application/json", bytes.NewReader(body))
		if err != nil {
			time.Sleep(time.Duration(1<<attempt) * time.Second)
			continue
		}
		res.Body.Close()
		switch {
		case res.StatusCode == 200 || res.StatusCode == 201:
			return nil
		case res.StatusCode == 429 || res.StatusCode >= 500:
			time.Sleep(time.Duration(1<<attempt) * time.Second)
		default:
			return fmt.Errorf("flock rejected the post: %d", res.StatusCode)
		}
	}
	return fmt.Errorf("flock unavailable after 5 tries")
}`;

export const PHP = `<?php
$ch = curl_init(getenv('${URL_VAR}'));
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['message' => 'New sign-up: ' . $email]),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
]);
$body = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
if ($status !== 200 && $status !== 201) {
    error_log("Flock post failed: $status $body");
}`;

export const BROWSER = `<form id="contact">
  <input name="name" required placeholder="Name" />
  <input name="email" type="email" required placeholder="Email" />
  <textarea name="text" required placeholder="Message"></textarea>
  <button>Send</button>
</form>
<script>
  // Anyone who opens this page can read this URL and post to the flock.
  const FLOCK_URL = "https://<host>/hooks/chat/<flock-id>/<secret>";
  document.getElementById("contact").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const res = await fetch(FLOCK_URL, {
      method: "POST",
      // text/plain skips the CORS preflight; the server still reads JSON.
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        message: \`**New contact**\\nName: \${f.get("name")}\\nEmail: \${f.get("email")}\\n\\n\${f.get("text")}\`,
        event_id: crypto.randomUUID(),
      }),
    });
    alert(res.ok ? "Thanks, we got it." : "Could not send, please try again.");
  });
</script>`;

export const GITHUB_ACTIONS = `# .github/workflows/deploy.yml (last step of the job)
# Add the URL as a repository secret named ABABILX_WEBHOOK_URL.
      - name: Tell the flock
        if: always()
        env:
          ${URL_VAR}: \${{ secrets.ABABILX_WEBHOOK_URL }}
        run: |
          STATUS="\${{ job.status }}"
          jq -n --arg m "Deploy of \\\`\${GITHUB_SHA::7}\\\` on \${GITHUB_REF_NAME}: **$STATUS**" \\
                --arg id "gh-\${GITHUB_RUN_ID}-\${GITHUB_RUN_ATTEMPT}" \\
                '{message: $m, event_id: $id}' |
          curl -sS --retry 4 --retry-connrefused -X POST "$${URL_VAR}" \\
               -H 'Content-Type: application/json' -d @-`;

export const SHELL = `#!/bin/sh
# Cron-safe: retries 429 and 5xx, quiet on success.
# Example: 0 3 * * * /opt/backup.sh && /opt/notify.sh "Backup finished"
jq -n --arg m "$1" --arg id "cron-$(hostname)-$(date +%Y%m%d%H%M)" \\
   '{message: $m, event_id: $id}' |
curl -fsS --retry 4 --retry-connrefused --max-time 10 \\
     -X POST "$${URL_VAR}" -H 'Content-Type: application/json' -d @- >/dev/null`;
