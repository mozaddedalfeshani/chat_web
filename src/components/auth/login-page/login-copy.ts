/** Chat-web login — phone QR only. Brand copy is SEO-visible; layout stays WhatsApp-Web-like. */
export const LOGIN_COPY = {
  brand: "AbabilX",
  product: "AbabilX Chat",
  /** Primary H1 — brand gate for "AbabilX Chat" / "chat AbabilX". */
  title: "AbabilX Chat",
  lead: "Scan the code with your phone to sign in",
  /** Where the scanner lives in the Android app: the chat-list header. */
  qrFind: "Find the scanner on your phone",
  qrSteps: [
    "Open AbabilX on a phone that is already signed in",
    "At the top of Chats, tap the scanner",
    "Point it at this code",
  ],
  qrTitle: "Scan with your phone",
  qrHint: "Open AbabilX on a signed-in phone and scan this code.",
  qrExpired: "This code expired. Generate a new one.",
  qrDenied: "Sign-in was denied on the phone.",
  qrApproved: "Signed in. Opening chat…",
  qrCodeHint: "Your phone should show",
  qrExpiresIn: "Expires in",
  qrRefresh: "New code",
  errAuthFailed: "Sign-in did not complete. Try again.",
  errAuthUnavailable: "Sign-in is unavailable right now. Try again later.",
  navDocs: "Docs",
  getApp: "Get the Android app",
  e2ee: "Your messages are end-to-end encrypted",
  /** Crawlable product summary — real copy, not hidden keyword stuffing. */
  aboutTitle: "Secure messaging from AbabilX",
  aboutBody:
    "AbabilX Chat is a private messenger. Chats, calls and files are end-to-end encrypted, and each message is deleted from our servers once your devices have it. No email or phone number needed, no ads, no trackers, no AI. Sign in at chat.ababilx.com with your phone.",
} as const;
