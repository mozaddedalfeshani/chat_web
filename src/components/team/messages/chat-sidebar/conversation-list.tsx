"use client";

import { useEffect, useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { FilterHorizontalIcon, Search01Icon } from "hugeicons-react";
import type { TeamMember } from "@/lib/api/types/team";
import { localMessageSearchHit } from "@/lib/chat-local-index";
import ConversationListItem from "./conversation-list-item";
import ConversationSearchSection from "./conversation-search-section";
import AddPeopleCta from "./add-people-cta";
import StartConversationSection from "./start-conversation-section";
import { sortConversations } from "./conversation-sort";
import { useStoredHistorySearch } from "./use-stored-history-search";
import {
  splitConversationSearch,
  type ConversationSearchHit,
} from "./conversation-search";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { useChatStore } from "@/store/chat-store";

export default function ConversationList({
  members,
  onSelect,
  onStartDM,
  language,
  onOpenProfile,
  onOpenPeople,
}: {
  members: TeamMember[];
  onSelect: (id: string, messageId?: string) => void;
  onStartDM: (userId: string) => void;
  language?: string | null;
  onOpenProfile?: (userId: string) => void;
  onOpenPeople?: () => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function focusSearch() {
      searchRef.current?.focus();
      searchRef.current?.select();
    }
    window.addEventListener("chat:focus-search", focusSearch);
    return () => window.removeEventListener("chat:focus-search", focusSearch);
  }, []);

  const {
    dms,
    channels,
    activeConversationId,
    currentUserId,
    unreadOnly,
    dmSearchQuery,
    setUnreadOnly,
    setDmSearchQuery,
  } = useChatStore(
    useShallow((s) => ({
      dms: s.dms,
      channels: s.channels,
      activeConversationId: s.activeConversationId,
      currentUserId: s.currentUserId,
      unreadOnly: s.unreadOnly,
      dmSearchQuery: s.dmSearchQuery,
      setUnreadOnly: s.setUnreadOnly,
      setDmSearchQuery: s.setDmSearchQuery,
    })),
  );

  const searching = dmSearchQuery.trim().length > 0;
  const scoped = useMemo(
    () =>
      sortConversations([...channels, ...dms]).filter(
        (conv) => !unreadOnly || conv.unread_count > 0,
      ),
    [channels, dms, unreadOnly],
  );
  const storedHits = useStoredHistorySearch(currentUserId, scoped, dmSearchQuery);
  const { chats, messages } = useMemo(
    () =>
      splitConversationSearch(scoped, dmSearchQuery, (id, q) => {
        const stored = storedHits.get(id);
        return localMessageSearchHit(id, q) ?? (stored ? { snippet: stored.snippet, messageId: stored.messageId } : null);
      }),
    [scoped, dmSearchQuery, storedHits],
  );

  const empty = chats.length === 0 && messages.length === 0;
  const dmPeerIds = new Set(dms.map((d) => d.peer_user_id).filter(Boolean));

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 px-3 pb-2 pt-1">
        <div
          className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full px-3"
          style={{ background: "var(--sig-surface-3)" }}
        >
          <Search01Icon
            size={14}
            className="pointer-events-none shrink-0 text-[var(--sig-label-2)]"
          />
          <input
            ref={searchRef}
            value={dmSearchQuery}
            onChange={(e) => setDmSearchQuery(e.target.value)}
            placeholder={t(language, "chat.searchChats")}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--sig-label)] placeholder:text-[var(--sig-label-2)] focus:outline-none"
          />
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={unreadOnly}
          aria-label={t(language, "chat.unreadOnly")}
          title={t(language, "chat.unreadOnly")}
          onClick={() => setUnreadOnly(!unreadOnly)}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
            unreadOnly
              ? "bg-[var(--sig-fill-pressed)] text-[var(--sig-label)]"
              : "text-[var(--sig-label-2)] hover:bg-[var(--sig-fill)] hover:text-[var(--sig-label)]",
          )}
        >
          <FilterHorizontalIcon size={17} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {empty ? (
          <div className="px-3 py-6 text-center">
            <p className="text-[13px] text-[var(--sig-label-2)]">
              {searching
                ? t(language, "chat.searchEmpty")
                : unreadOnly
                  ? t(language, "chat.noUnread")
                  : t(language, "chat.noConversations")}
            </p>
            {onOpenPeople && !unreadOnly && !searching ? (
              <AddPeopleCta
                onClick={onOpenPeople}
                label="Find people to message"
                className="mt-3"
              />
            ) : null}
          </div>
        ) : searching ? (
          <>
            {chats.length > 0 ? (
              <>
                <ConversationSearchSection label={t(language, "chat.chats")} />
                <SearchHitList
                  rows={chats}
                  activeConversationId={activeConversationId}
                  currentUserId={currentUserId}
                  onSelect={onSelect}
                  onOpenProfile={onOpenProfile}
                />
              </>
            ) : null}
            {messages.length > 0 ? (
              <>
                <ConversationSearchSection
                  label={t(language, "chat.searchMessages")}
                />
                <SearchHitList
                  rows={messages}
                  activeConversationId={activeConversationId}
                  currentUserId={currentUserId}
                  onSelect={onSelect}
                  onOpenProfile={onOpenProfile}
                />
              </>
            ) : null}
          </>
        ) : (
          <SearchHitList
            rows={chats}
            activeConversationId={activeConversationId}
            currentUserId={currentUserId}
            onSelect={onSelect}
            onOpenProfile={onOpenProfile}
          />
        )}

        {!searching ? (
          <StartConversationSection
            members={members}
            currentUserId={currentUserId}
            existingPeerIds={dmPeerIds}
            onStartDM={onStartDM}
            language={language}
            onOpenPeople={onOpenPeople}
          />
        ) : null}
      </div>
    </div>
  );
}

function SearchHitList({
  rows,
  activeConversationId,
  currentUserId,
  onSelect,
  onOpenProfile,
}: {
  rows: ConversationSearchHit[];
  activeConversationId: string | null;
  currentUserId: string;
  onSelect: (id: string, messageId?: string) => void;
  onOpenProfile?: (userId: string) => void;
}) {
  return (
    <>
      {rows.map(({ conv, snippet, messageId }) => (
        <ConversationListItem
          key={messageId ? `${conv.id}:${messageId}` : conv.id}
          conv={conv}
          active={conv.id === activeConversationId}
          currentUserId={currentUserId}
          onSelect={onSelect}
          searchSnippet={snippet}
          searchMessageId={messageId}
          onOpenProfile={onOpenProfile}
        />
      ))}
    </>
  );
}
