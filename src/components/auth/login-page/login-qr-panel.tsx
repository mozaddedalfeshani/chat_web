"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useQrLogin } from "./use-qr-login";
import { LOGIN_COPY } from "./login-copy";

export default function LoginQrPanel() {
  const onApproved = useCallback(() => {
    window.location.assign("/user/messages");
  }, []);

  const { status, imageUrl, error, secondsLeft, restart } = useQrLogin(
    true,
    onApproved,
  );

  const dead = status === "expired" || status === "denied" || status === "error";
  const message =
    status === "expired"
      ? LOGIN_COPY.qrExpired
      : status === "denied"
        ? LOGIN_COPY.qrDenied
        : status === "error"
          ? error
          : status === "approved"
            ? LOGIN_COPY.qrApproved
            : "";

  return (
    <div className="flex w-full flex-col items-center">
      <div className="flex h-[264px] w-[264px] items-center justify-center">
        {imageUrl && !dead ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URI QR
          <img
            src={imageUrl}
            alt={LOGIN_COPY.qrTitle}
            className="h-full w-full"
          />
        ) : (
          <span className="px-6 text-center text-sm text-[#667781]">
            {message || "…"}
          </span>
        )}
      </div>
      {status === "pending" && secondsLeft > 0 ? (
        <p className="mt-3 text-xs text-[#667781]">
          {LOGIN_COPY.qrExpiresIn} {Math.floor(secondsLeft / 60)}:
          {String(secondsLeft % 60).padStart(2, "0")}
        </p>
      ) : null}
      {dead ? (
        <Button
          size="sm"
          type="button"
          className="mt-3"
          onClick={() => void restart()}
        >
          {LOGIN_COPY.qrRefresh}
        </Button>
      ) : null}
    </div>
  );
}
