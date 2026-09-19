"use client";

import { useState } from "react";
import type { ChatConnection } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { chatInitials } from "../chat-utils";
import RemoveConnectionDialog from "./remove-connection-dialog";

/** Accepted personal connections, with disconnect and block. */
export default function ConnectionList({
  connections,
  onMessage,
  onDisconnect,
  onBlock,
}: {
  connections: ChatConnection[];
  onMessage: (userId: string) => void;
  onDisconnect: (userId: string) => void;
  onBlock: (userId: string) => void;
}) {
  const [pending, setPending] = useState<{
    userId: string;
    name: string;
  } | null>(null);

  if (connections.length === 0) {
    return (
      <p className="px-2 py-8 text-center text-xs text-muted-foreground">
        No connections yet. Find someone under “Find people”.
      </p>
    );
  }

  return (
    <div className="max-h-72 space-y-0.5 overflow-y-auto">
      {connections.map((connection) => (
        <div
          key={connection.id}
          className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[var(--surface2)]"
        >
          <Avatar className="h-8 w-8 rounded-md">
            <AvatarImage src={connection.user.avatar_url} alt="" />
            <AvatarFallback className="rounded-md text-[10px]">
              {chatInitials(connection.user.name)}
            </AvatarFallback>
          </Avatar>
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text)]">
            {connection.user.name}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => onMessage(connection.user.user_id)}
          >
            Message
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setPending({
                userId: connection.user.user_id,
                name: connection.user.name,
              })
            }
          >
            Remove
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onBlock(connection.user.user_id)}
          >
            Block
          </Button>
        </div>
      ))}
      <RemoveConnectionDialog
        name={pending?.name ?? ""}
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        onConfirm={() => {
          if (!pending) return;
          onDisconnect(pending.userId);
          setPending(null);
        }}
      />
    </div>
  );
}
