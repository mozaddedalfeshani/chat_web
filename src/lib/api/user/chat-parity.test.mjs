import { afterEach, describe, expect, test } from "bun:test";
import {
  listChatCallLog,
  listChatConversationMedia,
  listChatGroupsInCommon,
  pinChatConversation,
  reportChatConversation,
  sendChatMessage,
} from "./chat.ts";
import { createChatWebhookChannel } from "./chat-webhooks.ts";
import { getChatE2EEConversationKey } from "./chat-e2ee.ts";
import { joinGroupCall } from "./group-call.ts";
import { startVoiceCall } from "./voice-call.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function captureRequests() {
  const requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), method: init?.method ?? "GET" });
    return new Response(JSON.stringify({ success: true, data: {} }), {
      headers: { "Content-Type": "application/json" },
    });
  };
  return requests;
}

describe("web chat uses the canonical independent-chat contract", () => {
  test("message writes use /api/chat", async () => {
    const requests = captureRequests();
    await sendChatMessage("conversation-1", { body: "hello" });
    expect(requests).toEqual([
      {
        url: "/backend/api/chat/conversations/conversation-1/messages",
        method: "POST",
      },
    ]);
  });

  test("mobile-parity conversation actions reach their server routes", async () => {
    const requests = captureRequests();

    await pinChatConversation("conversation-1", true);
    await listChatConversationMedia("conversation-1", { kind: "files" });
    await reportChatConversation("conversation-1", { block: true });
    await listChatGroupsInCommon("user-2");
    await listChatCallLog();

    expect(requests).toEqual([
      {
        url: "/backend/api/chat/conversations/conversation-1/pin",
        method: "POST",
      },
      {
        url: "/backend/api/chat/conversations/conversation-1/media?kind=files&limit=30",
        method: "GET",
      },
      {
        url: "/backend/api/chat/conversations/conversation-1/report",
        method: "POST",
      },
      {
        url: "/backend/api/chat/users/user-2/groups-in-common",
        method: "GET",
      },
      { url: "/backend/api/chat/calls", method: "GET" },
    ]);
  });

  test("calls, webhooks and conversation keys use /api/chat", async () => {
    const requests = captureRequests();

    await startVoiceCall("conversation-1");
    await joinGroupCall("conversation-1");
    await createChatWebhookChannel({ name: "Deploy feed" });
    await getChatE2EEConversationKey("conversation-1");

    expect(requests.map(({ url, method }) => ({ url, method }))).toEqual([
      {
        url: "/backend/api/chat/conversations/conversation-1/calls",
        method: "POST",
      },
      {
        url: "/backend/api/chat/conversations/conversation-1/group-call/join",
        method: "POST",
      },
      { url: "/backend/api/chat/webhook-channels", method: "POST" },
      {
        url: "/backend/api/chat/conversations/conversation-1/e2ee-key",
        method: "GET",
      },
    ]);
  });
});
