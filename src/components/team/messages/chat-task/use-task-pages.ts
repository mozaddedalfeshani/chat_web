"use client";

import { useEffect, useState } from "react";
import type { ChatMessage } from "@/lib/api/types/chat";
import { listChatTasks } from "@/lib/api/user/chat-tasks";
import { decryptChatMessages } from "@/lib/chat-e2ee/crypto";

export type TaskFilter = "all" | "open" | "closed";

type Pages = { key: string; tasks: ChatMessage[]; cursor: string | null; failed: boolean };

async function readPage(
  conversationId: string,
  filter: TaskFilter,
  currentUserId: string,
  cursor?: string,
) {
  const page = await listChatTasks(conversationId, {
    state: filter === "all" ? undefined : filter,
    cursor,
  });
  return {
    tasks: await decryptChatMessages(page.tasks ?? [], currentUserId),
    cursor: page.next_cursor || null,
  };
}

/**
 * The task cards of one DM under one filter, read a page at a time: each is
 * a whole message, and a description may be hundreds of kilobytes.
 */
export function useTaskPages(
  conversationId: string,
  filter: TaskFilter,
  currentUserId: string,
  open: boolean,
) {
  const [result, setResult] = useState<Pages>({ key: "", tasks: [], cursor: null, failed: false });
  const [more, setMore] = useState<"idle" | "loading" | "failed">("idle");
  const key = open ? `${conversationId}|${filter}` : "";
  const current = result.key === key;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const key = `${conversationId}|${filter}`;
    readPage(conversationId, filter, currentUserId)
      .then((page) => {
        if (cancelled) return;
        setMore("idle");
        setResult({ key, ...page, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, tasks: [], cursor: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [open, conversationId, filter, currentUserId]);

  async function showMore() {
    const from = result;
    if (!current || !from.cursor || more === "loading") return;
    setMore("loading");
    try {
      const page = await readPage(conversationId, filter, currentUserId, from.cursor);
      // A filter chosen meanwhile has its own first page; this one is stale.
      setResult((held) =>
        held.key !== from.key || held.cursor !== from.cursor
          ? held
          : {
              ...held,
              cursor: page.cursor,
              tasks: [
                ...held.tasks,
                ...page.tasks.filter((task) => !held.tasks.some((known) => known.id === task.id)),
              ],
            },
      );
      setMore("idle");
    } catch {
      setMore("failed");
    }
  }

  function replace(next: ChatMessage) {
    setResult((held) => ({
      ...held,
      tasks: held.tasks.map((task) => (task.id === next.id ? next : task)),
    }));
  }

  return {
    loading: open && !current,
    failed: current && result.failed,
    tasks: current ? result.tasks : [],
    hasMore: current && result.cursor !== null,
    more,
    showMore,
    replace,
  };
}
