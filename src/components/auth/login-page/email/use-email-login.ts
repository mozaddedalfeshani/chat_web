"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EmailAuthError,
  emailConfirmReset,
  emailRequestReset,
  emailSignIn,
  emailSignUp,
  emailVerifySignUp,
} from "@/lib/api/email-auth";
import { EMAIL_COPY } from "./email-copy";

export type EmailMode = "closed" | "signin" | "signup" | "forgot" | "code";

export type EmailForm = {
  name: string;
  email: string;
  password: string;
  code: string;
};

const EMPTY: EmailForm = { name: "", email: "", password: "", code: "" };
const looksLikeEmail = (v: string) =>
  /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim());
const passwordOk = (v: string) => [...v].length >= 8 && [...v].length <= 128;

/**
 * The whole email flow as one state machine: sign in, sign up, forgot, then
 * the code step that finishes a sign-up or a reset. `purpose` remembers which
 * of the two sent the code, so the code step knows what to confirm.
 */
export function useEmailLogin(onSignedIn: () => void) {
  const [mode, setMode] = useState<EmailMode>("closed");
  const [purpose, setPurpose] = useState<"signup" | "reset">("signup");
  const [form, setForm] = useState<EmailForm>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [masked, setMasked] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const update = useCallback(
    (patch: Partial<EmailForm>) => setForm((f) => ({ ...f, ...patch })),
    [],
  );

  const go = useCallback((next: EmailMode) => {
    setError("");
    setMode(next);
  }, []);

  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : EMAIL_COPY.failed);
      if (err instanceof EmailAuthError && err.retryAfter) {
        setResendIn(err.retryAfter);
      }
    } finally {
      setBusy(false);
    }
  };

  const fail = (message: string) => setError(message);

  const sendCode = (kind: "signup" | "reset") =>
    run(async () => {
      const sent =
        kind === "signup"
          ? await emailSignUp(
              form.name.trim(),
              form.email.trim(),
              form.password,
            )
          : await emailRequestReset(form.email.trim());
      setPurpose(kind);
      setMasked(sent.maskedEmail);
      setResendIn(sent.resendIn);
      update({ code: "", ...(kind === "reset" ? { password: "" } : {}) });
      setMode("code");
    });

  const submit = () => {
    const email = form.email.trim();
    if (mode !== "code" && !looksLikeEmail(email))
      return fail(EMAIL_COPY.invalidEmail);
    if (mode === "signin") {
      if (!form.password) return fail(EMAIL_COPY.passwordRule);
      return run(async () => {
        await emailSignIn(email, form.password);
        onSignedIn();
      });
    }
    if (mode === "signup") {
      if (!form.name.trim()) return fail(EMAIL_COPY.nameRequired);
      if (!passwordOk(form.password)) return fail(EMAIL_COPY.passwordRule);
      return sendCode("signup");
    }
    if (mode === "forgot") return sendCode("reset");
    if (!/^\d{6}$/.test(form.code)) return fail(EMAIL_COPY.codeLength);
    if (purpose === "reset" && !passwordOk(form.password)) {
      return fail(EMAIL_COPY.passwordRule);
    }
    return run(async () => {
      if (purpose === "reset") {
        await emailConfirmReset(email, form.code, form.password);
      } else {
        await emailVerifySignUp(email, form.code);
      }
      onSignedIn();
    });
  };

  const resend = () => sendCode(purpose);

  return {
    mode,
    purpose,
    form,
    busy,
    error,
    masked,
    resendIn,
    update,
    go,
    submit,
    resend,
  };
}
