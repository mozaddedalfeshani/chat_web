import { normalizeLanguage } from "@/lib/i18n";

/**
 * Every string the history import shows, in English and Bangla. Kept apart
 * from `lib/i18n.ts` so the feature's copy can be reviewed as one piece.
 * `{name}` placeholders are filled by `historyCopy(…, vars)`.
 */
const en = {
  logoutNote: "Also removes chat history saved in this browser.",
  checkingServer: "Checking your message history…",
  serverReady: "Recent history is ready.",
  serverEmpty: "No message history on the server yet.",
  serverRetry: "Some conversations did not load. Retry",
  importTitle: "Import history from your phone",
  importBody:
    "Messages older than six months, and their photos, videos and files, are kept on your phone. Copy them to this browser from the phone.",
  importStart: "Import from phone",
  importLater: "Not now",
  scanTitle: "Scan this code with AbabilX on your phone",
  scanHint: "On your phone: Chats → scan icon. Keep AbabilX open on the phone while it sends.",
  compareCode: "Check that your phone shows the same code",
  updateRequired: "If your phone says “Update AbabilX”, update the app on the phone, then scan a new code.",
  preparing: "Your phone is preparing your history…",
  estimate: "About {size} will be stored in this browser.",
  importingMessages: "Importing messages… {done} of {total}",
  messagesReady: "Messages are ready. Media is still arriving: {done} of {total} files.",
  pausedPhone: "Paused — your phone stopped sending. Open AbabilX on the phone to continue.",
  pausedOffline: "Paused — this browser is offline. It continues when you're back online.",
  pausedSpace: "Paused — this browser is out of storage space. Free some space, then resume. Nothing that arrived is lost.",
  expired: "This transfer expired after 24 hours. Scan a new code to continue; what already arrived is kept.",
  finished: "History imported.",
  unavailableFiles: "{count} files were not on your phone and can't be shown.",
  cancelled: "Import cancelled. Messages that already arrived are kept.",
  failed: "The import stopped: {reason}",
  retry: "Try again",
  resume: "Resume",
  cancel: "Cancel import",
  keepOpen: "Keep this tab open until it finishes.",
  otherTab: "An import is running in another tab of this browser.",
  storageWarning:
    "Imported history lives in this browser. Clearing its site data, or logging out, removes it — your phone keeps its own copy.",
  unavailableFile: "Not on your phone",
  settingsEntry: "Import history from phone",
} as const;

export type HistoryCopyKey = keyof typeof en;

const bn: Record<HistoryCopyKey, string> = {
  logoutNote: "এই ব্রাউজারে সংরক্ষিত চ্যাট হিস্ট্রিও মুছে যাবে।",
  checkingServer: "আপনার মেসেজ হিস্ট্রি দেখা হচ্ছে…",
  serverReady: "সাম্প্রতিক হিস্ট্রি প্রস্তুত।",
  serverEmpty: "সার্ভারে এখনো কোনো মেসেজ হিস্ট্রি নেই।",
  serverRetry: "কিছু কনভারসেশন লোড হয়নি। আবার চেষ্টা করুন",
  importTitle: "ফোন থেকে হিস্ট্রি আনুন",
  importBody:
    "ছয় মাসের পুরোনো মেসেজ এবং সেগুলোর ছবি, ভিডিও ও ফাইল আপনার ফোনে থাকে। ফোন থেকে সেগুলো এই ব্রাউজারে কপি করুন।",
  importStart: "ফোন থেকে আনুন",
  importLater: "এখন না",
  scanTitle: "ফোনের AbabilX দিয়ে এই কোডটি স্ক্যান করুন",
  scanHint: "ফোনে: চ্যাটস → স্ক্যান আইকন। পাঠানো শেষ না হওয়া পর্যন্ত ফোনে AbabilX খোলা রাখুন।",
  compareCode: "ফোনেও একই কোড দেখাচ্ছে কি না মিলিয়ে নিন",
  updateRequired: "ফোনে “Update AbabilX” দেখালে ফোনের অ্যাপটি আপডেট করে নতুন কোড স্ক্যান করুন।",
  preparing: "আপনার ফোন হিস্ট্রি প্রস্তুত করছে…",
  estimate: "এই ব্রাউজারে প্রায় {size} জায়গা লাগবে।",
  importingMessages: "মেসেজ আনা হচ্ছে… {total}-এর মধ্যে {done}",
  messagesReady: "মেসেজ প্রস্তুত। মিডিয়া এখনো আসছে: {total}-এর মধ্যে {done}টি ফাইল।",
  pausedPhone: "থেমে আছে — ফোন পাঠানো বন্ধ করেছে। চালিয়ে যেতে ফোনে AbabilX খুলুন।",
  pausedOffline: "থেমে আছে — এই ব্রাউজার অফলাইনে। অনলাইনে ফিরলে আবার চলবে।",
  pausedSpace: "থেমে আছে — এই ব্রাউজারে জায়গা নেই। কিছু জায়গা খালি করে আবার চালু করুন। যা এসেছে তা হারাবে না।",
  expired: "২৪ ঘণ্টা পার হয়ে ট্রান্সফারের মেয়াদ শেষ। চালিয়ে যেতে নতুন কোড স্ক্যান করুন; যা এসেছে তা থাকবে।",
  finished: "হিস্ট্রি আনা হয়েছে।",
  unavailableFiles: "{count}টি ফাইল ফোনে ছিল না, তাই দেখানো যাবে না।",
  cancelled: "আনা বাতিল হয়েছে। যে মেসেজগুলো এসেছে সেগুলো থাকবে।",
  failed: "আনা বন্ধ হয়ে গেছে: {reason}",
  retry: "আবার চেষ্টা করুন",
  resume: "আবার চালু করুন",
  cancel: "আনা বাতিল করুন",
  keepOpen: "শেষ না হওয়া পর্যন্ত এই ট্যাবটি খোলা রাখুন।",
  otherTab: "এই ব্রাউজারের অন্য একটি ট্যাবে আনা চলছে।",
  storageWarning:
    "আনা হিস্ট্রি এই ব্রাউজারে থাকে। সাইট ডেটা মুছলে বা লগ আউট করলে তা মুছে যায় — ফোনে নিজের কপি থাকে।",
  unavailableFile: "ফোনে নেই",
  settingsEntry: "ফোন থেকে হিস্ট্রি আনুন",
};

export function historyCopy(
  language: string | null | undefined,
  key: HistoryCopyKey,
  vars?: Record<string, string | number>,
) {
  const table = normalizeLanguage(language) === "bn" ? bn : en;
  let text: string = table[key] ?? en[key];
  for (const [name, value] of Object.entries(vars ?? {})) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}
