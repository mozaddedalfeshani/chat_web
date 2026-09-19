"use client";

import { useMemo } from "react";
import {
  Archive02Icon,
  Delete02Icon,
  Link01Icon,
  Logout01Icon,
} from "hugeicons-react";
import type { ChatConversation } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { t } from "@/lib/i18n";
import { useGroupMembers } from "./use-group-members";
import GroupMemberList from "./group-member-list";
import GroupAddPeople from "./group-add-people";
import GroupIdentitySection from "./group-identity-section";
import GroupPermissionsSection from "./group-permissions-section";
import ActionRow from "./action-row";
import WebhookSettingsSection from "./webhook-settings-section";
import WallpaperRow from "../wallpaper/wallpaper-row";

/**
 * Every group answers to its own `my_role` + permission switches since
 * migration `0145` — there is no more workspace-channel branch here. A
 * webhook feed is the one exception with its own settings section and no
 * archive action (it is a plain read-only conversation, never archived).
 */
export default function GroupDetailsDialog({
  open,
  onOpenChange,
  conv,
  canManage,
  canEditInfo,
  canAddMembers,
  canDelete,
  currentUserId,
  onRenamed,
  onCopyLink,
  onArchive,
  onLeave,
  onRequestDelete,
  language,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conv: ChatConversation;
  canManage: boolean;
  canEditInfo: boolean;
  canAddMembers: boolean;
  canDelete: boolean;
  currentUserId: string;
  onRenamed: (conv: ChatConversation) => void;
  onCopyLink: () => void;
  onArchive: () => void;
  onLeave: () => void;
  onRequestDelete: () => void;
  language?: string | null;
}) {
  const { members, reload } = useGroupMembers(conv.id, open);
  const isWebhook = conv.type === "webhook";
  const existingIds = useMemo(
    () => new Set(members.map((m) => m.user_id)),
    [members],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[85vh] flex-col p-0">
        <SheetHeader
          className="shrink-0 border-b px-5 pb-4 pt-6 text-left"
          style={{ borderColor: "var(--border)" }}
        >
          <SheetTitle className="text-lg font-semibold pr-8">
            {conv.name || t(language, "chat.groupDetails")}
          </SheetTitle>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <GroupIdentitySection conv={conv} canEdit={canEditInfo} onUpdated={onRenamed} />

          <div className="space-y-0.5">
            <WallpaperRow conversationId={conv.id} />
          </div>

          {canManage ? (
            <GroupPermissionsSection conv={conv} onUpdated={onRenamed} />
          ) : null}

          {isWebhook && canManage ? (
            <WebhookSettingsSection conversationId={conv.id} />
          ) : null}

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t(language, "chat.members")} · {members.length}
            </p>
            <GroupMemberList
              members={members}
              ownerId={conv.created_by}
              currentUserId={currentUserId}
              language={language}
              conversationId={conv.id}
              canManage={canManage}
              onChanged={reload}
            />
          </div>

          {canAddMembers ? (
            <GroupAddPeople
              channelId={conv.id}
              existingMemberIds={existingIds}
              onAdded={reload}
              language={language}
            />
          ) : null}

          <div className="space-y-0.5 border-t border-[var(--border)] pt-3">
            <ActionRow
              icon={<Link01Icon size={16} />}
              label={t(language, "chat.copyLink")}
              onClick={() => {
                onCopyLink();
              }}
            />
            {canManage && !isWebhook ? (
              <ActionRow
                icon={<Archive02Icon size={16} />}
                label={t(language, "chat.archiveGroup")}
                onClick={() => {
                  onOpenChange(false);
                  onArchive();
                }}
              />
            ) : null}
            <ActionRow
              icon={<Logout01Icon size={16} />}
              label={t(language, "chat.leaveGroup")}
              danger
              onClick={() => {
                onOpenChange(false);
                onLeave();
              }}
            />
            {canDelete ? (
              <ActionRow
                icon={<Delete02Icon size={16} />}
                label={t(language, "chat.deleteGroup")}
                danger
                onClick={() => {
                  onRequestDelete();
                }}
              />
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
