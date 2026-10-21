import type { ReactNode } from "react";
import {
  Edit02Icon,
  FilterHorizontalIcon,
  Link01Icon,
  MoreHorizontalIcon,
  Search01Icon,
  UserAdd01Icon,
} from "hugeicons-react";
import { LockKeyhole, Mic, MonitorUp, Phone, PhoneOff, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bubbleRadius } from "@/components/team/messages/chat-timeline/chat-bubble/bubble-shape";

const ROWS = [
  { name: "Ayesha", preview: "Perfect, thank you!", time: "2:14 PM", letter: "A" },
  { name: "Family", preview: "You: I will be there.", time: "1:02 PM", letter: "F" },
  { name: "Nadia", preview: "Book tickets for Eid", time: "Yesterday", letter: "N" },
  { name: "Orders", preview: "Order #1042 shipped", time: "Yesterday", letter: "" },
] as const;

/**
 * The signed-in web client, drawn at its real size (sidebar 320px, the same
 * row, bubble and header classes) and scaled into the 16:9 card.
 */
export function WebStage({ active, children }: { active: string; children: ReactNode }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl shadow-[0_18px_40px_rgba(11,20,26,0.14)] [container-type:size]">
      <div
        className="flex h-[540px] w-[960px] origin-top-left overflow-hidden"
        style={{ transform: "scale(calc(100cqw / 960px))", background: "var(--sig-bg)" }}
      >
        <Sidebar active={active} />
        <div className="flex min-w-0 flex-1 flex-col" style={{ background: "var(--sig-bg)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Sidebar({ active }: { active: string }) {
  return (
    <aside
      className="flex h-full w-80 shrink-0 flex-col border-r"
      style={{ background: "var(--sig-bg)", borderColor: "var(--sig-border)" }}
    >
      <div className="flex shrink-0 items-center gap-1 px-4 pb-1 pt-4">
        <h2 className="min-w-0 flex-1 truncate text-[24px] font-bold leading-tight text-[var(--sig-label)]">
          Chats
        </h2>
        <IconBtn><UserAdd01Icon size={19} /></IconBtn>
        <IconBtn><Edit02Icon size={19} /></IconBtn>
        <IconBtn><MoreHorizontalIcon size={19} /></IconBtn>
      </div>
      <div className="flex shrink-0 items-center gap-1 px-3 pb-2 pt-1">
        <div
          className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full px-3"
          style={{ background: "var(--sig-surface-3)" }}
        >
          <Search01Icon size={14} className="shrink-0 text-[var(--sig-label-2)]" />
          <span className="text-[13px] text-[var(--sig-label-2)]">Search</span>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--sig-label-2)]">
          <FilterHorizontalIcon size={17} />
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden px-2 pb-3">
        {ROWS.map((row) => (
          <div
            key={row.name}
            className={cn(
              "flex h-[72px] w-full items-center gap-3 overflow-hidden rounded-[10px] px-3.5 py-2 text-left",
              row.name === active ? "bg-[var(--sig-fill-pressed)]" : "",
            )}
          >
            {row.letter ? (
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                style={{ background: "var(--sig-surface-3)", color: "var(--sig-label)" }}
              >
                {row.letter}
              </span>
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--indigo)_15%,transparent)] text-[var(--indigo)]">
                <Link01Icon size={22} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--sig-label)]">{row.name}</span>
                <span className="shrink-0 text-[12px] text-[var(--sig-label-2)]">{row.time}</span>
              </span>
              <span className="mt-0.5 block truncate text-[14px] text-[var(--sig-label-2)]">{row.preview}</span>
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function IconBtn({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--sig-label)]">
      {children}
    </span>
  );
}

/** The real chat header: name capsule on the right, lock, and Talk. */
export function AppHeader({ title, encrypted = true }: { title: string; encrypted?: boolean }) {
  return (
    <header
      className="relative z-10 flex shrink-0 items-center gap-2 border-b px-4 py-3"
      style={{ background: "var(--sig-bg)", borderColor: "var(--sig-border)" }}
    >
      <div className="flex-1" />
      <div className="flex w-max max-w-full shrink-0 items-center rounded-full border border-[var(--border)] bg-[var(--surface2)]">
        <span className="flex items-center gap-1 py-1 pl-3 pr-2 text-sm font-semibold text-[var(--sig-label)]">
          {encrypted ? (
            <LockKeyhole aria-hidden className="size-3.5 shrink-0 text-emerald-600" />
          ) : null}
          <span className="truncate">{title}</span>
        </span>
        {encrypted ? (
          <>
            <span className="h-5 w-px bg-[var(--border)]" />
            <span className="inline-flex h-7 items-center gap-1.5 rounded-r-full px-2.5 text-xs text-[var(--sig-label)]">
              <Phone className="size-4" />
              Talk
            </span>
          </>
        ) : null}
      </div>
    </header>
  );
}

/** Same bubble as the timeline: one fill, 18px corners, 14px text. */
export function AppBubble({
  mine,
  text,
  author,
}: {
  mine: boolean;
  text: string;
  author?: string;
}) {
  return (
    <div className={cn("mt-1.5 flex items-end gap-2 px-3", mine ? "justify-end" : "justify-start")}>
      <div
        className="min-w-0 max-w-[min(50vw,32rem)] overflow-hidden px-3 py-2"
        style={{
          ...bubbleRadius({ outgoing: mine, groupedAbove: false, groupedBelow: false }),
          background: "var(--sig-bubble)",
          color: "var(--sig-label)",
        }}
      >
        {author ? (
          <p className="mb-0.5 truncate text-[13px] font-semibold leading-tight text-[var(--indigo)]">
            {author}
          </p>
        ) : null}
        <p className="text-[14px] leading-[1.35]">{text}</p>
      </div>
    </div>
  );
}

export function AppComposer() {
  return (
    <div className="shrink-0 bg-[var(--sig-bg)] px-3 pb-3 pt-1">
      <div
        className="flex h-10 items-center rounded-[18px] px-3 text-[14px] text-[var(--sig-label-2)]"
        style={{ background: "var(--sig-surface-3)" }}
      >
        Message
      </div>
    </div>
  );
}

/** The connected-call controls, same buttons as the call window. */
export function AppCallControls() {
  const size = "h-11 rounded-full px-3";
  const icon = "h-5 w-5";
  return (
    <div className="flex items-center justify-center gap-2">
      <Button type="button" variant="secondary" tabIndex={-1} className={size} aria-label="Mute">
        <Mic className={icon} />
        <span>Mute</span>
      </Button>
      <Button type="button" variant="secondary" tabIndex={-1} className={size} aria-label="Camera">
        <Video className={icon} />
        <span>Camera</span>
      </Button>
      <Button type="button" variant="secondary" tabIndex={-1} className={size} aria-label="Share screen">
        <MonitorUp className={icon} />
        <span>Share screen</span>
      </Button>
      <Button type="button" tabIndex={-1} className={`${size} bg-rose-600 text-white hover:bg-rose-500`} aria-label="Leave call">
        <PhoneOff className={icon} />
        <span>Leave</span>
      </Button>
    </div>
  );
}
