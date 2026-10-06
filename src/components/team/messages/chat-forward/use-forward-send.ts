"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api, type ChatMessage, type WallPost } from "@/lib/api";
import { friendlyError } from "@/lib/api/error-messages";
import {
  buildForwardTargets,
  type ForwardConversation,
} from "@/lib/chat-e2ee/forward-targets";
import { t } from "@/lib/i18n";

type UseForwardSendInput = {
  message?: ChatMessage | null;
  wallPost?: WallPost | null;
  currentUserId?: string;
  language?: string | null;
  onDone: () => void;
};

/**
 * Sends a forward. Destinations are prepared on this device because DMs and
 * personal groups are end-to-end encrypted: the text has to be re-encrypted per
 * conversation, and an encrypted source is only readable here in the first
 * place.
 */
export function useForwardSend({
  message,
  wallPost,
  currentUserId,
  language,
  onDone,
}: UseForwardSendInput) {
  const [busy, setBusy] = useState(false);

  async function send(
    conversations: ForwardConversation[],
    userIds: string[],
    caption: string,
  ) {
    if ((!message && !wallPost) || conversations.length + userIds.length === 0) return;
    if (!currentUserId) {
      toast.error(t(language, "chat.forwardFailed"));
      return;
    }
    // A message whose text never decrypted would forward as an error string.
    if (message?.decryption_failed) {
      toast.error(t(language, "chat.forwardUndecryptable"));
      return;
    }

    setBusy(true);
    try {
      const targets = await buildForwardTargets({
        text: message?.body ?? wallPost?.body ?? "",
        caption,
        conversations,
        userIds,
        currentUserId,
        attachments: message?.attachments,
      });
      const res = message
        ? await api.forwardChatMessage({ message_id: message.id, targets })
        : await api.forwardWallPost({ post_id: wallPost!.id, targets });
      toast.success(
        t(language, "chat.forwardedToN").replace("{n}", String(res.forwarded_to)),
      );
      onDone();
    } catch (e) {
      toast.error(friendlyError(e, "Failed to forward message"));
    } finally {
      setBusy(false);
    }
  }

  return { busy, send };
}
