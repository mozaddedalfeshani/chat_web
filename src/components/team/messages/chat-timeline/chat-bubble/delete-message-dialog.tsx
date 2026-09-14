"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type MessageDeleteScope = "everyone" | "me";

/**
 * WhatsApp's delete prompt. "Delete for me" is always offered — it only
 * touches this account. "Delete for everyone" only on the caller's own
 * message, because the server refuses anybody else's row.
 */
export function DeleteMessageDialog({
  open,
  onOpenChange,
  busy,
  canDeleteForEveryone,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  canDeleteForEveryone: boolean;
  onConfirm: (scope: MessageDeleteScope) => void | Promise<void>;
}) {
  const destructive =
    "bg-destructive text-destructive-foreground hover:bg-destructive/90";
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete message?</AlertDialogTitle>
          <AlertDialogDescription>
            {canDeleteForEveryone
              ? "Delete for me removes it only from your devices. Delete for everyone removes it for the whole chat."
              : "It will be removed from your devices only. Others in the chat will still see it."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            className={destructive}
            onClick={(e) => {
              e.preventDefault();
              void onConfirm("me");
            }}
          >
            Delete for me
          </AlertDialogAction>
          {canDeleteForEveryone ? (
            <AlertDialogAction
              disabled={busy}
              className={destructive}
              onClick={(e) => {
                e.preventDefault();
                void onConfirm("everyone");
              }}
            >
              Delete for everyone
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
