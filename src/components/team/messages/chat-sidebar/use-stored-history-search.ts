"use client";

import { useEffect, useState } from "react";
import type { ChatConversation } from "@/lib/api";
import { decryptChatMessages } from "@/lib/chat-e2ee/crypto";
import { searchStoredHistory, type StoredSearchHit } from "@/lib/history/repo/search";
import { formatChatMessagePreview } from "../chat-preview-utils";
import { historyEnabled } from "@/lib/history/flag";

const DEBOUNCE_MS = 300;

/**
 * Keyword hits from the durable history — imported messages older than the
 * server's six months included. Merged with the in-memory index by the list:
 * that one answers instantly for what was recently on screen, this one fills
 * in the rest a moment later.
 */
export function useStoredHistorySearch(
  userId: string,
  conversations: ChatConversation[],
  query: string,
) {
  const [hits, setHits] = useState<Map<string, StoredSearchHit>>(new Map());
  const ids = conversations.map((c) => c.id).join(",");

  useEffect(() => {
    const q = query.trim();
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!userId || q.length < 2 || !historyEnabled()) {
        setHits(new Map());
        return;
      }
      void searchStoredHistory(userId, ids ? ids.split(",") : [], q, {
        isCancelled: () => cancelled,
        decrypt: (messages) => decryptChatMessages(messages, userId),
        toText: (body) =>
          formatChatMessagePreview({ body, textOnly: true }).replace(/\s+/g, " ").trim(),
      })
        .then((next) => {
          if (!cancelled) setHits(next);
        })
        .catch(() => {});
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [userId, ids, query]);

  return hits;
}
