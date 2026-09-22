"use client";

import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, type ChatConversation } from "@/lib/api";
import { friendlyError } from "@/lib/api/error-messages";
import { useChatStore } from "@/store/chat-store";
import { t } from "@/lib/i18n";
import {
  messageBasePath,
  messageConversationHref,
} from "@/lib/messages/routes";

/** Group/DM maintenance actions for the chat header, kept out of its JSX. */
export function useChatHeaderActions(
  activeConv: ChatConversation | null,
  language?: string | null,
) {
  const router = useRouter();
  const pathname = usePathname();
  const messagesBase = messageBasePath(pathname);
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId);
  const fetchSidebar = useChatStore((s) => s.fetchSidebar);
  const setConversationMuted = useChatStore((s) => s.setConversationMuted);

  function exitConversation() {
    setActiveConversationId(null);
    router.replace(messagesBase, { scroll: false });
    void fetchSidebar({ silent: true });
  }

  async function copyLink() {
    if (!activeConv) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${messageConversationHref(pathname, activeConv.id)}`,
      );
      toast.success(t(language, "chat.linkCopied"));
    } catch {
      // clipboard blocked — ignore
    }
  }

  async function archive() {
    if (!activeConv) return;
    try {
      await api.patchChatChannel(activeConv.id, { archive: true });
      toast.success(t(language, "chat.groupArchived"));
      exitConversation();
    } catch (e) {
      toast.error(friendlyError(e, "Failed to archive group"));
    }
  }

  async function leave() {
    if (!activeConv) return;
    try {
      await api.leaveChatChannel(activeConv.id);
      toast.success(t(language, "chat.leftGroup"));
      exitConversation();
    } catch (e) {
      toast.error(friendlyError(e, "Failed to leave group"));
    }
  }

  async function deleteGroup() {
    if (!activeConv) return;
    try {
      await api.deleteChatChannel(activeConv.id);
      toast.success(t(language, "chat.groupDeleted"));
      exitConversation();
    } catch (e) {
      toast.error(friendlyError(e, "Failed to delete group"));
    }
  }

  async function toggleMute() {
    if (!activeConv) return;
    const next = !activeConv.muted;
    setConversationMuted(activeConv.id, next); // optimistic
    try {
      await api.muteChatConversation(activeConv.id, next);
      toast.success(next ? "Notifications muted" : "Notifications unmuted");
    } catch (e) {
      setConversationMuted(activeConv.id, !next); // revert
      toast.error(friendlyError(e, "Failed to update notifications"));
    }
  }

  async function togglePin() {
    if (!activeConv) return;
    const next = !activeConv.pinned;
    try {
      await api.pinChatConversation(activeConv.id, next);
      await fetchSidebar({ silent: true });
      toast.success(next ? "Conversation pinned" : "Conversation unpinned");
    } catch (e) {
      toast.error(friendlyError(e, "Failed to update pin"));
    }
  }

  async function report(block: boolean) {
    if (!activeConv) return;
    try {
      const result = await api.reportChatConversation(activeConv.id, { block });
      if (block && !result.blocked) {
        toast.error("Conversation reported, but blocking failed");
        return;
      }
      toast.success(block ? "Conversation reported and blocked" : "Conversation reported");
      if (result.blocked) exitConversation();
    } catch (e) {
      toast.error(friendlyError(e, "Failed to report conversation"));
    }
  }

  return {
    copyLink,
    archive,
    leave,
    deleteGroup,
    toggleMute,
    togglePin,
    report,
  };
}
