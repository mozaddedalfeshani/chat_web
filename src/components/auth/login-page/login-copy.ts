/** Chat-web login — QR only. Brand copy is SEO-visible; layout stays WhatsApp-Web-like. */
export const LOGIN_COPY = {
  brand: "AbabilX",
  product: "AbabilX Chat",
  /** Primary H1 — brand gate for "AbabilX Chat" / "chat AbabilX". */
  title: "AbabilX Chat",
  lead: "Scan to log in on the web",
  step1: "Scan the QR code with your phone's camera",
  step2: "Open AbabilX on the phone",
  step3: "Confirm to link this browser",
  qrTitle: "Scan with your phone",
  qrHint: "Open AbabilX on a signed-in phone and scan this code.",
  qrExpired: "This code expired. Generate a new one.",
  qrDenied: "Sign-in was denied on the phone.",
  qrApproved: "Signed in. Opening chat…",
  qrExpiresIn: "Expires in",
  qrRefresh: "New code",
  e2ee: "Your personal messages are end-to-end encrypted",
  /** Crawlable product summary — real copy, not hidden keyword stuffing. */
  aboutTitle: "Secure messaging from AbabilX",
  aboutBody:
    "AbabilX Chat is end-to-end encrypted messaging for personal DMs and workspace groups. Sign in at chat.ababilx.com with your phone, keep chats private, and call when you need to.",
} as const;
