"use client";

import type { ReactNode } from "react";
import { Loading03Icon } from "hugeicons-react";
import ChatDateDivider from "../chat-date-divider";
import { CallEventsCollapse } from "./call-events-collapse";
import { ChatTimelineItemRow } from "./timeline-item-row";
import type { TimelineItem } from "./timeline-items";

type RowProps = Omit<
  Parameters<typeof ChatTimelineItemRow>[0],
  "message" | "groupedAbove" | "groupedBelow"
>;

export function TimelineMessageList({
  items,
  loading,
  emptyLabel,
  emptyNode,
  rowProps,
}: {
  items: TimelineItem[];
  loading: boolean;
  emptyLabel: string;
  emptyNode?: ReactNode;
  rowProps: RowProps;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loading03Icon className="h-6 w-6 animate-spin text-[var(--sig-label-2)]" />
      </div>
    );
  }

  if (items.length === 0) {
    if (emptyNode) return <>{emptyNode}</>;
    return (
      <p className="py-12 text-center text-sm text-[var(--sig-label-2)]">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul>
      {items.map((item) => {
        if (item.kind === "divider") {
          return (
            <li key={item.key} className="list-none">
              <ChatDateDivider label={item.label} />
            </li>
          );
        }
        if (item.kind === "call-events") {
          return (
            <li key={item.key} className="list-none">
              <CallEventsCollapse
                messages={item.messages}
                currentUserId={rowProps.currentUserId}
                highlightMessageId={rowProps.highlightMessageId}
              />
            </li>
          );
        }
        return (
          <ChatTimelineItemRow
            key={item.key}
            {...rowProps}
            message={item.message}
            groupedAbove={item.groupedAbove}
            groupedBelow={item.groupedBelow}
          />
        );
      })}
    </ul>
  );
}
