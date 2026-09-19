"use client";

import { useEffect } from "react";
import { Menu01Icon, Message01Icon } from "hugeicons-react";
import type { AppUser } from "@/lib/api";
import { logOutAndForgetHistory } from "@/lib/history/sign-out";
import { historyCopy } from "@/lib/history/copy";
import { historyEnabled } from "@/lib/history/flag";
import { useHistoryImportStore } from "@/store/history-import-store";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { selectTotalUnread, useChatStore } from "@/store/chat-store";
import { useUIStore } from "@/store/ui-store";
import RailButton from "./rail-button";

/** Chat-only rail: Chats, theme, account. No Board/Wall — this app is chat. */
export default function RailNav({ user }: { user: AppUser | null }) {
  const chatUnread = useChatStore(selectTotalUnread);
  const toggleRail = useUIStore((s) => s.toggleRail);
  const language = user?.app_language ?? "en";

  useEffect(() => {
    const blocked = () => toast.error("Close other AbabilX tabs to finish logging out.");
    window.addEventListener("ababilx:history-delete-blocked", blocked);
    return () => window.removeEventListener("ababilx:history-delete-blocked", blocked);
  }, []);

  async function handleLogout() {
    try {
      await logOutAndForgetHistory(user?.id);
      window.location.assign("/");
    } catch {
      toast.error("Close other AbabilX tabs, then try logging out again.");
    }
  }

  return (
    <div className="flex h-full flex-col items-center">
      <div className="flex w-full shrink-0 items-center justify-center pt-1">
        <Tooltip content="Hide navigation" side="right">
          <button
            type="button"
            aria-label="Hide navigation"
            onClick={toggleRail}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--sig-label)] transition-colors hover:bg-[var(--sig-fill)] active:bg-[var(--sig-fill-pressed)]"
          >
            <Menu01Icon size={20} />
          </button>
        </Tooltip>
      </div>

      <div className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-3">
        <RailButton
          label={t(language, "sidebar.messages")}
          active
          badge={chatUnread}
          onClick={() => {}}
        >
          <Message01Icon size={20} />
        </RailButton>
      </div>

      <div
        className="flex shrink-0 flex-col items-center gap-1 border-t py-3"
        style={{ borderColor: "var(--sig-border)" }}
      >
        <ThemeToggle className="h-10 w-10 text-[var(--sig-label-2)] hover:text-[var(--sig-label)] hover:bg-[var(--sig-fill)]" />
        {user ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={t(language, "sidebar.profile")}
                title={t(language, "sidebar.profile")}
                className="flex h-10 w-10 items-center justify-center rounded-[10px] transition-colors hover:bg-[var(--sig-fill)]"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage
                    src={user.avatar_url}
                    alt={user.name || user.email}
                  />
                  <AvatarFallback className="text-[10px]">
                    {(user.name || user.email || "?")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="end" className="w-52 p-1">
              <p className="truncate px-2 py-2 text-[13px] text-[var(--sig-label)]">
                {user.name || user.email}
              </p>
              {historyEnabled() ? (
                <button
                  type="button"
                  onClick={() => useHistoryImportStore.getState().setOpen(true)}
                  className="flex w-full items-center rounded-md px-2 py-2 text-left text-[13px] text-[var(--sig-label)] transition-colors hover:bg-[var(--sig-fill)]"
                >
                  {historyCopy(language, "settingsEntry")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="flex w-full flex-col items-start rounded-md px-2 py-2 text-left text-[13px] text-[var(--sig-danger)] transition-colors hover:bg-[var(--sig-fill)]"
              >
                {t(language, "settings.logoutAction")}
                <span className="mt-0.5 text-[11px] text-[var(--sig-label-2)]">
                  {historyCopy(language, "logoutNote")}
                </span>
              </button>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
    </div>
  );
}
