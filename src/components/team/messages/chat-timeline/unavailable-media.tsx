"use client";

import { ImageOff } from "lucide-react";
import { historyCopy } from "@/lib/history/copy";

/**
 * An imported attachment the phone did not have, whose network copy is gone
 * too. Said plainly and permanently — never a spinner for a file that is not
 * coming.
 */
export default function UnavailableMedia({
  className,
  sealed = false,
}: {
  className?: string;
  /** An encrypted file whose key this device was never given (server 0168). */
  sealed?: boolean;
}) {
  return (
    <span
      className={`flex h-full min-h-24 w-full flex-col items-center justify-center gap-1 bg-black/20 text-xs text-white/80 ${className ?? ""}`}
    >
      <ImageOff className="size-5" aria-hidden />
      {sealed ? "Can't be opened on this device" : historyCopy(null, "unavailableFile")}
    </span>
  );
}
