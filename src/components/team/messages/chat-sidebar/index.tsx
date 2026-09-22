"use client";

import { useEffect, useState } from "react";
import {
  Edit02Icon,
  Menu01Icon,
  MoreHorizontalIcon,
  UserAdd01Icon,
  UserGroupIcon,
} from "hugeicons-react";
import ConversationList from "./conversation-list";
import type { TeamMember } from "@/lib/api/types/team";
import type { ChatConversation } from "@/lib/api";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useChatStore } from "@/store/chat-store";
import { useUIStore } from "@/store/ui-store";
import CreateWebhookFeedDialog from "./create-webhook-feed-dialog";
import ConnectionsDialog from "../chat-connections/connections-dialog";
import CreatePersonalGroupDialog from "../chat-connections/create-personal-group-dialog";
import CallHistoryDialog from "../chat-calls/call-history-dialog";
import { Phone } from "lucide-react";

function HeaderIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--sig-label)] transition-colors hover:bg-[var(--sig-fill)]"
    >
      {children}
    </button>
  );
}

export default function ChatSidebar({
  members,
  onSelect,
  onStartDM,
  language,
  className,
  onOpenProfile,
}: {
  members: TeamMember[];
  onSelect: (id: string, messageId?: string) => void;
  onStartDM: (userId: string) => void;
  language?: string | null;
  className?: string;
  onOpenProfile?: (userId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [personalGroupOpen, setPersonalGroupOpen] = useState(false);
  const [webhookFeedOpen, setWebhookFeedOpen] = useState(false);
  const [callHistoryOpen, setCallHistoryOpen] = useState(false);
  const upsertChannel = useChatStore((s) => s.upsertChannel);
  const railCollapsed = useUIStore((s) => s.railCollapsed);
  const toggleRail = useUIStore((s) => s.toggleRail);

  function handleGroupCreated(channel: ChatConversation) {
    upsertChannel(channel);
    onSelect(channel.id);
  }

  useEffect(() => {
    function openPeople() {
      setPeopleOpen(true);
    }
    window.addEventListener("chat:open-people", openPeople);
    window.addEventListener("chat:open-compose", openPeople);
    return () => {
      window.removeEventListener("chat:open-people", openPeople);
      window.removeEventListener("chat:open-compose", openPeople);
    };
  }, []);

  return (
    <aside
      className={cn("flex h-full w-full shrink-0 flex-col border-r lg:w-80", className)}
      style={{ background: "var(--sig-bg)", borderColor: "var(--sig-border)" }}
    >
      <div className="flex shrink-0 items-center gap-1 px-4 pb-1 pt-4">
        {railCollapsed ? (
          <HeaderIconButton label="Show navigation" onClick={toggleRail}>
            <Menu01Icon size={19} />
          </HeaderIconButton>
        ) : null}
        <h1 className="min-w-0 flex-1 truncate text-[24px] font-bold leading-tight text-[var(--sig-label)]">
          {t(language, "chat.chats")}
        </h1>
        <HeaderIconButton
          label="Add people — find someone and start a chat"
          onClick={() => setPeopleOpen(true)}
        >
          <UserAdd01Icon size={19} />
        </HeaderIconButton>
        <HeaderIconButton
          label={t(language, "chat.newMessage")}
          onClick={() => setPeopleOpen(true)}
        >
          <Edit02Icon size={19} />
        </HeaderIconButton>
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="More options"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--sig-label)] transition-colors hover:bg-[var(--sig-fill)]"
            >
              <MoreHorizontalIcon size={19} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 p-1">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setCallHistoryOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] text-[var(--sig-label)] transition-colors hover:bg-[var(--sig-fill)]"
            >
              <Phone size={16} />
              Calls
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setPersonalGroupOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] text-[var(--sig-label)] transition-colors hover:bg-[var(--sig-fill)]"
            >
              <UserGroupIcon size={16} />
              New personal group
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setWebhookFeedOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] text-[var(--sig-label)] transition-colors hover:bg-[var(--sig-fill)]"
            >
              <UserGroupIcon size={16} />
              New feed
            </button>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ConversationList
          members={members}
          onSelect={onSelect}
          onStartDM={onStartDM}
          onOpenProfile={onOpenProfile}
          language={language}
          onOpenPeople={() => setPeopleOpen(true)}
        />
      </div>

      <ConnectionsDialog
        open={peopleOpen}
        onOpenChange={setPeopleOpen}
        onMessage={onStartDM}
      />
      <CreatePersonalGroupDialog
        open={personalGroupOpen}
        onOpenChange={setPersonalGroupOpen}
        onCreated={handleGroupCreated}
      />
      <CreateWebhookFeedDialog
        open={webhookFeedOpen}
        onOpenChange={setWebhookFeedOpen}
        language={language}
        onCreated={handleGroupCreated}
      />
      <CallHistoryDialog
        open={callHistoryOpen}
        onOpenChange={setCallHistoryOpen}
        onOpenConversation={onSelect}
      />
    </aside>
  );
}
