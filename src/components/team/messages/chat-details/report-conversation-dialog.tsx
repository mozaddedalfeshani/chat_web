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

export default function ReportConversationDialog({
  open,
  onOpenChange,
  canBlock,
  onReport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canBlock: boolean;
  onReport: (block: boolean) => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Report spam?</AlertDialogTitle>
          <AlertDialogDescription>
            {canBlock
              ? "The service will receive the report, but your encrypted messages cannot be read. You can also block this person to stop messages and calls."
              : "The service will receive the report, but your encrypted group messages cannot be read."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onReport(false)}>
            Report
          </AlertDialogAction>
          {canBlock ? (
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => onReport(true)}
            >
              Report and block
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
