"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeAuthCode } from "@/lib/api";
import CallbackStatus from "@/components/auth/callback-status";

function GoogleCallbackInner() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = params.get("code");
    if (!code) {
      router.replace("/?error=auth_failed");
      return;
    }
    // The code is one-time; the BFF trades it for httpOnly session cookies, so
    // nothing about this sign-in is ever readable from JS.
    exchangeAuthCode(code).then((ok) => {
      router.replace(ok ? "/user/messages" : "/?error=auth_failed");
    });
  }, [params, router]);

  return null;
}

export default function GoogleCallback() {
  return (
    <CallbackStatus label="Signing you in with Google…">
      <Suspense>
        <GoogleCallbackInner />
      </Suspense>
    </CallbackStatus>
  );
}
