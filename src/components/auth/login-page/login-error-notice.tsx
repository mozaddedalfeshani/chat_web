"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LOGIN_COPY } from "./login-copy";

/** A failed OAuth hop lands back here as ?error=. Silent failure reads as a dead button. */
function Notice() {
  const error = useSearchParams().get("error");
  if (!error) return null;

  const message =
    error === "auth_unavailable"
      ? LOGIN_COPY.errAuthUnavailable
      : LOGIN_COPY.errAuthFailed;

  return (
    <p
      role="alert"
      className="rounded-lg bg-[#fdecea] px-3 py-2 text-center text-[13px] text-[#b3261e]"
    >
      {message}
    </p>
  );
}

export default function LoginErrorNotice() {
  return (
    <Suspense>
      <Notice />
    </Suspense>
  );
}
