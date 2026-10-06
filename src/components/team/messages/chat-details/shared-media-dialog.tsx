"use client";

import { useEffect, useState } from "react";
import { FileText, ImageIcon } from "lucide-react";
import { api, type ChatMessageAttachment } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { openAttachment } from "@/lib/chat-e2ee/attachment-seal";
import { useChatStore } from "@/store/chat-store";
import { SharedFileRow, SharedMediaTile } from "./shared-media-item";

type MediaKind = "media" | "files";

export default function SharedMediaDialog({
  conversationId,
  open,
  onOpenChange,
}: {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const currentUserId = useChatStore((s) => s.currentUserId);
  const [kind, setKind] = useState<MediaKind>("media");
  const [result, setResult] = useState<{
    key: string;
    items: ChatMessageAttachment[];
  }>({ key: "", items: [] });
  const requestKey = open ? `${conversationId}:${kind}` : "";
  const items = result.key === requestKey ? result.items : [];
  const loading = open && result.key !== requestKey;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api
      .listChatConversationMedia(conversationId, { kind })
      // The listing is attachment rows alone, so an encrypted file's key is
      // opened here; its sealer is whoever uploaded it.
      .then((page) =>
        Promise.all(
          (page.items ?? []).map((item) =>
            openAttachment(conversationId, currentUserId, item),
          ),
        ),
      )
      .then((items) => {
        if (!cancelled) setResult({ key: requestKey, items });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, currentUserId, kind, open, requestKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Shared media</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={kind === "media" ? "default" : "secondary"}
            onClick={() => setKind("media")}
          >
            <ImageIcon className="mr-1 size-4" /> Media
          </Button>
          <Button
            size="sm"
            variant={kind === "files" ? "default" : "secondary"}
            onClick={() => setKind("files")}
          >
            <FileText className="mr-1 size-4" /> Files
          </Button>
        </div>
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nothing shared yet.
          </p>
        ) : kind === "media" ? (
          <div className="grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto">
            {items.map((item) => (
              <SharedMediaTile key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-1 overflow-y-auto">
            {items.map((item) => (
              <SharedFileRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
