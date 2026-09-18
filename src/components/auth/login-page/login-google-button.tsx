"use client";

import { useState } from "react";
import { loginWithGoogle } from "@/lib/api";
import GoogleMark from "./google-mark";
import { LOGIN_COPY } from "./login-copy";

/**
 * The alternative to scanning: sign in with Google on this browser alone, no
 * phone in the room. The navigation leaves this page, so the pressed state is
 * never cleared — that is deliberate, it stops a double submit.
 */
export default function LoginGoogleButton() {
  const [leaving, setLeaving] = useState(false);

  return (
    <button
      type="button"
      disabled={leaving}
      onClick={() => {
        setLeaving(true);
        loginWithGoogle();
      }}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-[#d1d7db] bg-white px-5 text-[15px] font-medium text-[#3b4a54] transition-colors hover:bg-[#f5f6f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25d366] disabled:opacity-60"
    >
      <GoogleMark />
      {leaving ? LOGIN_COPY.googleLeaving : LOGIN_COPY.googleButton}
    </button>
  );
}
